import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";

import { describe, expect, it, vi } from "vitest";

import type { GeminiAnalysisReport } from "@/contracts/geminiAnalysis";
import { createAnalyzeComparisonHandler } from "../../supabase/functions/analyze-comparison/handler";

vi.mock("expo-clipboard", () => ({
  setStringAsync: vi.fn().mockResolvedValue(true),
}));

const comparisonId = "123e4567-e89b-42d3-a456-426614174000";
const comparison = {
  id: comparisonId,
  user_id: "user-1",
  initial_image_path: `user-1/${comparisonId}/initial.jpg`,
  final_image_path: `user-1/${comparisonId}/final.jpg`,
};
const analysis: { model: string; report: GeminiAnalysisReport } = {
  model: "gemini-1.5-flash",
  report: {
    contractVersion: "1.0",
    hasVisibleChanges: true,
    summary: "Se observa un cambio visible.",
    differences: [{ category: "added", description: "Aparece un objeto." }],
    observations: ["El encuadre es similar."],
    uncertainties: ["La iluminación cambió."],
  },
};

function post() {
  return new Request("http://localhost/analyze-comparison", {
    method: "POST",
    headers: { Authorization: "Bearer valid", "Content-Type": "application/json" },
    body: JSON.stringify({ comparisonId }),
  });
}

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    authenticate: vi.fn().mockResolvedValue({ id: "user-1" }),
    findComparison: vi.fn().mockResolvedValue(comparison),
    loadImages: vi.fn().mockResolvedValue({ initial: {}, final: {} }),
    reserveUsage: vi.fn().mockResolvedValue({ action: "reserved", attemptId: "attempt-1" }),
    analyzeImages: vi.fn().mockResolvedValue(analysis),
    persistReport: vi.fn().mockResolvedValue({ id: "report-1", result: analysis.report }),
    completeUsage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("end-to-end AI analysis orchestration", () => {
  it("persists a valid result for the exact image versions before succeeding", async () => {
    const calls: string[] = [];
    const deps = dependencies({
      loadImages: vi.fn(async () => { calls.push("images"); return { initial: {}, final: {} }; }),
      reserveUsage: vi.fn(async () => { calls.push("reserve"); return { action: "reserved", attemptId: "attempt-1" }; }),
      analyzeImages: vi.fn(async () => { calls.push("gemini"); return analysis; }),
      persistReport: vi.fn(async ({ comparison: target }) => {
        calls.push("persist");
        expect(target.initial_image_path).toBe(comparison.initial_image_path);
        expect(target.final_image_path).toBe(comparison.final_image_path);
        return { id: "report-1", result: analysis.report };
      }),
      completeUsage: vi.fn(async () => { calls.push("complete"); }),
    });
    const response = await createAnalyzeComparisonHandler(deps)(post());
    expect(response.status).toBe(200);
    expect(calls).toEqual(["images", "reserve", "gemini", "persist", "complete"]);
  });

  it.each([
    ["invalid_image_type", 422],
    ["image_not_found", 404],
    ["image_too_large", 413],
  ])("rejects image preparation failure %s", async (code, status) => {
    const deps = dependencies({
      loadImages: vi.fn().mockRejectedValue(Object.assign(new Error("image"), { code })),
    });
    expect((await createAnalyzeComparisonHandler(deps)(post())).status).toBe(status);
    expect(deps.analyzeImages).not.toHaveBeenCalled();
  });

  it.each([
    ["model_unavailable", 500],
    ["provider_quota_exceeded", 429],
    ["gemini_timeout", 504],
    ["gemini_network_error", 500],
    ["invalid_gemini_request", 500],
    ["invalid_gemini_response", 500],
  ])("maps Gemini failure %s and conservatively consumes the attempt", async (code, status) => {
    const completeUsage = vi.fn().mockResolvedValue(undefined);
    const deps = dependencies({
      analyzeImages: vi.fn().mockRejectedValue(Object.assign(new Error("provider"), { code })),
      completeUsage,
    });
    expect((await createAnalyzeComparisonHandler(deps)(post())).status).toBe(status);
    expect(completeUsage).toHaveBeenCalledWith("attempt-1", "failed_uncertain");
    expect(deps.persistReport).not.toHaveBeenCalled();
  });

  it.each(["global_minute", "global_day", "user_day", "comparison_day"])(
    "enforces the persistent %s quota",
    async (scope) => {
      const deps = dependencies({
        reserveUsage: vi.fn().mockResolvedValue({ action: "limited", scope }),
      });
      const response = await createAnalyzeComparisonHandler(deps)(post());
      expect(response.status).toBe(429);
      expect(deps.analyzeImages).not.toHaveBeenCalled();
    },
  );

  it("deduplicates concurrent requests before Gemini", async () => {
    let reserved = false;
    let finishAnalysis!: () => void;
    const analyzeImages = vi.fn(() => new Promise<typeof analysis>((resolveAnalysis) => {
      finishAnalysis = () => resolveAnalysis(analysis);
    }));
    const deps = dependencies({
      reserveUsage: vi.fn(async () => {
        if (reserved) return { action: "in_progress", attemptId: "attempt-1" } as const;
        reserved = true;
        return { action: "reserved", attemptId: "attempt-1" } as const;
      }),
      analyzeImages,
    });
    const handler = createAnalyzeComparisonHandler(deps);
    const first = handler(post());
    await vi.waitFor(() => expect(analyzeImages).toHaveBeenCalledTimes(1));
    const second = await handler(post());
    expect(second.status).toBe(409);
    finishAnalysis();
    expect((await first).status).toBe(200);
    expect(analyzeImages).toHaveBeenCalledTimes(1);
  });

  it("rejects a report when image versions change during analysis", async () => {
    const completeUsage = vi.fn().mockResolvedValue(undefined);
    const deps = dependencies({
      persistReport: vi.fn().mockRejectedValue(new Error("comparison_images_changed")),
      completeUsage,
    });
    const response = await createAnalyzeComparisonHandler(deps)(post());
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "analysis_stale" });
    expect(completeUsage).toHaveBeenCalledWith("attempt-1", "failed_uncertain");
  });

  it("fails closed when usage reservation is unavailable", async () => {
    const deps = dependencies({
      reserveUsage: vi.fn().mockRejectedValue(new Error("database unavailable")),
    });
    const response = await createAnalyzeComparisonHandler(deps)(post());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      code: "usage_limits_unavailable",
    });
    expect(deps.analyzeImages).not.toHaveBeenCalled();
    expect(deps.persistReport).not.toHaveBeenCalled();
  });

  it("preserves the provider failure when attempt bookkeeping also fails", async () => {
    const deps = dependencies({
      analyzeImages: vi.fn().mockRejectedValue(
        Object.assign(new Error("provider"), { code: "gemini_timeout" }),
      ),
      completeUsage: vi.fn().mockRejectedValue(new Error("bookkeeping unavailable")),
    });
    const response = await createAnalyzeComparisonHandler(deps)(post());
    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toMatchObject({ code: "gemini_timeout" });
  });

  it("reuses a saved report without another Gemini request", async () => {
    const saved = { id: "report-existing", result: analysis.report };
    const deps = dependencies({
      reserveUsage: vi.fn().mockResolvedValue({ action: "cached", report: saved }),
    });
    const response = await createAnalyzeComparisonHandler(deps)(post());
    await expect(response.json()).resolves.toEqual(saved);
    expect(deps.analyzeImages).not.toHaveBeenCalled();
    expect(deps.persistReport).not.toHaveBeenCalled();
    expect(deps.completeUsage).not.toHaveBeenCalled();
  });
});

describe("AI database and mobile integration safeguards", () => {
  it("defines atomic reservations and transactional report status updates", () => {
    const usageSql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/202610140002_create_ai_usage_limits.sql"),
      "utf8",
    );
    const reportsSql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/202610140001_create_ai_analysis_reports.sql"),
      "utf8",
    );
    expect(usageSql).toContain("pg_advisory_xact_lock");
    expect(usageSql).toContain("unique (comparison_id, initial_image_path, final_image_path)");
    expect(reportsSql).toContain("persist_ai_analysis_report");
    expect(reportsSql).toMatch(/insert into public\.ai_analysis_reports[\s\S]*update public\.comparisons/);
    expect(reportsSql).toContain("to service_role");
  });

  it("defines retryable history with one active reservation and conservative expiration", () => {
    const retrySql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/202610140003_allow_safe_ai_analysis_retries.sql",
      ),
      "utf8",
    );
    expect(retrySql).toMatch(
      /create unique index[\s\S]*where status = 'reserved'/,
    );
    expect(retrySql).toMatch(
      /set status = 'failed_uncertain'[\s\S]*interval '5 minutes'/,
    );
    expect(retrySql).toMatch(
      /a\.status = 'reserved'[\s\S]*action', 'in_progress'/,
    );
    expect(retrySql).toContain("p_comparison_per_day");
  });

  it("renders every required structured report section and human-review warning", () => {
    const screen = readFileSync(resolve(process.cwd(), "src/app/comparison-result.tsx"), "utf8");
    for (const label of [
      "RESUMEN DE IA",
      "Diferencias detectadas",
      "Observaciones",
      "Limitaciones",
      "revisión humana",
    ]) {
      expect(screen).toContain(label);
    }
    expect(screen).toContain("AiAnalysisLoadingSkeleton");
    expect(screen).toContain("ai-analysis-modal");
    expect(screen).toContain("AiQuotaAlertBanner");
    expect(screen).toContain("AiOfflineResilienceBanner");
  });

  it(
    "provides copy-to-clipboard elements and formats report cleanly for user sharing",
    async () => {
    const screen = readFileSync(
      resolve(process.cwd(), "src/app/comparison-result.tsx"),
      "utf8",
    );
    expect(screen).toContain("copy-report-button");
    expect(screen).toContain("share-report-button");
    expect(screen).toContain("copied-feedback-badge");
    expect(screen).toContain("Copiar informe");
    expect(screen).toContain("Compartir informe");
    expect(screen).toContain("¡Copiado al portapapeles!");

    const { formatReportForClipboard, shareReportNative } = await import(
      "@/utils/reportExport"
    );
    const formatted = formatReportForClipboard(analysis.report, {
      comparisonName: "Comparativa Obra",
    });
    expect(formatted).toContain("INFORME DE ANÁLISIS COMPARATIVO — VISUALTRACE");
    expect(formatted).toContain("Comparación: Comparativa Obra");
    expect(formatted).toContain(analysis.report.summary);
    expect(formatted).toContain("Aparece un objeto.");

    const { Share } = await import("react-native");
    const shareSpy = vi.spyOn(Share, "share").mockResolvedValueOnce({
      action: Share.sharedAction,
      activityType: null,
    });

    const shareResult = await shareReportNative(analysis.report, {
      comparisonName: "Comparativa Obra",
    });
    expect(shareResult.success).toBe(true);
    expect(shareResult.action).toBe("sharedAction");
    expect(shareSpy).toHaveBeenCalledTimes(1);
    shareSpy.mockRestore();
  }, 15000);

  it("renders collapsible difference sections with toggle states for granular exploration", async () => {
    const screen = readFileSync(
      resolve(process.cwd(), "src/app/comparison-result.tsx"),
      "utf8",
    );
    expect(screen).toContain("AiDifferencesCollapsible");

    const { AiDifferencesCollapsible } = await import(
      "@/components/ui/AiDifferencesCollapsible"
    );
    // @ts-expect-error react-dom/server type declarations are not in devDependencies
    const { renderToStaticMarkup } = await import("react-dom/server");

    const collapsedHtml = renderToStaticMarkup(
      createElement(AiDifferencesCollapsible, {
        differences: analysis.report.differences,
        initialExpanded: false,
      }),
    );
    expect(collapsedHtml).toContain("Diferencias detectadas");
    expect(collapsedHtml).toContain("Elemento añadido");
    expect(collapsedHtml).toContain("Ver detalles");
    expect(collapsedHtml).not.toContain("Aparece un objeto.");

    const expandedHtml = renderToStaticMarkup(
      createElement(AiDifferencesCollapsible, {
        differences: analysis.report.differences,
        initialExpanded: true,
      }),
    );
    expect(expandedHtml).toContain("Ocultar detalles");
    expect(expandedHtml).toContain("Aparece un objeto.");
  });

  it("provides re-analysis confirmation dialog with quota warning before execution", async () => {
    const screen = readFileSync(
      resolve(process.cwd(), "src/app/comparison-result.tsx"),
      "utf8",
    );
    expect(screen).toContain("reanalyze-button");
    expect(screen).toContain("AiReanalyzeConfirmationModal");
    expect(screen).toContain("Re-analizar comparación");

    const modalFile = readFileSync(
      resolve(process.cwd(), "src/components/ui/AiReanalyzeConfirmationModal.tsx"),
      "utf8",
    );
    expect(modalFile).toContain("reanalyze-confirmation-modal");
    expect(modalFile).toContain("reanalyze-cancel-button");
    expect(modalFile).toContain("reanalyze-confirm-button");
    expect(modalFile).toContain("Consume 1 intento de cuota");
    expect(modalFile).toContain("Consumirá 1 intento de tu cuota diaria disponible");
    expect(modalFile).toContain("Confirmar re-análisis");
    expect(modalFile).toContain("Cancelar");

    const { AiReanalyzeConfirmationModal } = await import(
      "@/components/ui/AiReanalyzeConfirmationModal"
    );
    expect(typeof AiReanalyzeConfirmationModal).toBe("function");
  });

  it("provides contextual AI feedback card with useful/not-useful rating options and thank-you confirmation", async () => {
    const screen = readFileSync(
      resolve(process.cwd(), "src/app/comparison-result.tsx"),
      "utf8",
    );
    expect(screen).toContain("AiReportFeedbackCard");
    expect(screen).toContain("<AiReportFeedbackCard comparisonId={comparisonId ?? undefined} />");

    const feedbackFile = readFileSync(
      resolve(process.cwd(), "src/components/ui/AiReportFeedbackCard.tsx"),
      "utf8",
    );
    expect(feedbackFile).toContain("ai-report-feedback-card");
    expect(feedbackFile).toContain("feedback-useful-button");
    expect(feedbackFile).toContain("feedback-not-useful-button");
    expect(feedbackFile).toContain("feedback-thank-you-message");
    expect(feedbackFile).toContain("¿Te resultó útil este análisis?");
    expect(feedbackFile).toContain("¡Gracias por tu retroalimentación!");

    const {
      AiReportFeedbackCard,
      setSessionFeedback,
      getSessionFeedback,
      clearSessionFeedback,
    } = await import("@/components/ui/AiReportFeedbackCard");

    // @ts-expect-error react-dom/server type declarations are not in devDependencies
    const { renderToStaticMarkup } = await import("react-dom/server");

    clearSessionFeedback();

    // Initial state: shows prompt and buttons, but not thank-you message
    const initialHtml = renderToStaticMarkup(
      createElement(AiReportFeedbackCard, { comparisonId: "cmp-integration" }),
    );
    expect(initialHtml).toContain("¿Te resultó útil este análisis?");
    expect(initialHtml).toContain("feedback-useful-button");
    expect(initialHtml).toContain("feedback-not-useful-button");
    expect(initialHtml).not.toContain("feedback-thank-you-message");

    // State with selection: shows thank-you message and selected indicator
    const selectedHtml = renderToStaticMarkup(
      createElement(AiReportFeedbackCard, {
        comparisonId: "cmp-integration",
        initialFeedback: "useful",
      }),
    );
    expect(selectedHtml).toContain("¡Gracias por tu retroalimentación!");
    expect(selectedHtml).toContain("feedback-thank-you-message");

    // Verify session remembering
    setSessionFeedback("cmp-integration-session", "not_useful");
    expect(getSessionFeedback("cmp-integration-session")).toBe("not_useful");

    const sessionHtml = renderToStaticMarkup(
      createElement(AiReportFeedbackCard, {
        comparisonId: "cmp-integration-session",
      }),
    );
    expect(sessionHtml).toContain("¡Gracias por tu retroalimentación!");
    clearSessionFeedback();
  });

  it("renders executive AI analysis summary card with visual impact severity badge and indicators", async () => {
    const screen = readFileSync(
      resolve(process.cwd(), "src/app/comparison-result.tsx"),
      "utf8",
    );
    expect(screen).toContain("AiAnalysisSummaryCard");
    expect(screen).toContain("<AiAnalysisSummaryCard report={analysisReport} />");

    const summaryCardFile = readFileSync(
      resolve(process.cwd(), "src/components/ui/AiAnalysisSummaryCard.tsx"),
      "utf8",
    );
    expect(summaryCardFile).toContain("ai-analysis-summary-card");
    expect(summaryCardFile).toContain("severity-level-badge");
    expect(summaryCardFile).toContain("total-findings-indicator");
    expect(summaryCardFile).toContain("comparison-status-indicator");
    expect(summaryCardFile).toContain("affected-categories-indicator");
    expect(summaryCardFile).toContain("calculateVisualSeverity");

    const {
      AiAnalysisSummaryCard,
      calculateVisualSeverity,
    } = await import("@/components/ui/AiAnalysisSummaryCard");

    // @ts-expect-error react-dom/server type declarations are not in devDependencies
    const { renderToStaticMarkup } = await import("react-dom/server");

    // Verify calculation with integration analysis report (1 added difference)
    const severity = calculateVisualSeverity(
      analysis.report.differences,
      analysis.report.hasVisibleChanges,
    );
    expect(severity.level).toBe("minor");
    expect(severity.badgeText).toBe("Menor");
    expect(severity.statusLabel).toBe("Cambios leves");

    // Render with analysis report
    const html = renderToStaticMarkup(
      createElement(AiAnalysisSummaryCard, { report: analysis.report }),
    );
    expect(html).toContain("ai-analysis-summary-card");
    expect(html).toContain("EVALUACIÓN DE IMPACTO");
    expect(html).toContain("Menor");
    expect(html).toContain("total-findings-indicator");
    expect(html).toContain("comparison-status-indicator");
    expect(html).toContain("1");
    expect(html).toContain("Hallazgo");
    expect(html).toContain("Cambios leves");

    // Verify calculation with severe report (5 differences -> "Significativo")
    const severeDiffs = [
      { category: "added" as const, description: "1" },
      { category: "removed" as const, description: "2" },
      { category: "modified" as const, description: "3" },
      { category: "moved" as const, description: "4" },
      { category: "appearance" as const, description: "5" },
    ];
    const severeCalc = calculateVisualSeverity(severeDiffs, true);
    expect(severeCalc.level).toBe("significant");
    expect(severeCalc.badgeText).toBe("Significativo");

    const severeHtml = renderToStaticMarkup(
      createElement(AiAnalysisSummaryCard, {
        report: {
          ...analysis.report,
          differences: severeDiffs,
        },
      }),
    );
    expect(severeHtml).toContain("Significativo");
    expect(severeHtml).toContain("5");
    expect(severeHtml).toContain("Hallazgos");
    expect(severeHtml).toContain("Cambios relevantes");
  });

  it("provides offline network resilience banner with retry action and connectivity guidance", async () => {
    const screen = readFileSync(
      resolve(process.cwd(), "src/app/comparison-result.tsx"),
      "utf8",
    );
    expect(screen).toContain("AiOfflineResilienceBanner");
    expect(screen).toContain("<AiOfflineResilienceBanner");

    const bannerFile = readFileSync(
      resolve(process.cwd(), "src/components/ui/AiOfflineResilienceBanner.tsx"),
      "utf8",
    );
    expect(bannerFile).toContain("ai-offline-resilience-banner");
    expect(bannerFile).toContain("retry-network-action-button");
    expect(bannerFile).toContain("Sin conexión a internet para el análisis de IA");
    expect(bannerFile).toContain("Offline");

    const { AiOfflineResilienceBanner } = await import(
      "@/components/ui/AiOfflineResilienceBanner"
    );

    // @ts-expect-error react-dom/server type declarations are not in devDependencies
    const { renderToStaticMarkup } = await import("react-dom/server");

    let retryCalled = false;
    const bannerHtml = renderToStaticMarkup(
      createElement(AiOfflineResilienceBanner, {
        onRetry: () => {
          retryCalled = true;
        },
      }),
    );
    expect(bannerHtml).toContain("ai-offline-resilience-banner");
    expect(bannerHtml).toContain("Sin conexión a internet para el análisis de IA");
    expect(bannerHtml).toContain("Offline");
    expect(bannerHtml).toContain("retry-network-action-button");
    expect(bannerHtml).toContain("Reintentar");

    const element = createElement(AiOfflineResilienceBanner, {
      onRetry: () => {
        retryCalled = true;
      },
    });
    element.props.onRetry?.();
    expect(retryCalled).toBe(true);
  });

  it("provides AI analysis error fallback card with retry interaction and collapsible technical details", async () => {
    const screen = readFileSync(
      resolve(process.cwd(), "src/app/comparison-result.tsx"),
      "utf8",
    );
    expect(screen).toContain("AiAnalysisErrorFallbackCard");
    expect(screen).toContain("<AiAnalysisErrorFallbackCard");

    const fallbackFile = readFileSync(
      resolve(process.cwd(), "src/components/ui/AiAnalysisErrorFallbackCard.tsx"),
      "utf8",
    );
    expect(fallbackFile).toContain("ai-analysis-error-fallback-card");
    expect(fallbackFile).toContain("retry-analysis-button");
    expect(fallbackFile).toContain("toggle-error-details-button");
    expect(fallbackFile).toContain("error-technical-details");
    expect(fallbackFile).toContain("Ocurrió un inconveniente al procesar el análisis");

    const { AiAnalysisErrorFallbackCard } = await import(
      "@/components/ui/AiAnalysisErrorFallbackCard"
    );

    // @ts-expect-error react-dom/server type declarations are not in devDependencies
    const { renderToStaticMarkup } = await import("react-dom/server");

    let retryCalled = false;
    const testError = "Edge Function invocation failed: 500 model_unavailable";

    // 1. Initial render: shows title, retry button, toggle button, but details collapsed
    const collapsedHtml = renderToStaticMarkup(
      createElement(AiAnalysisErrorFallbackCard, {
        errorMessage: testError,
        onRetry: () => {
          retryCalled = true;
        },
      }),
    );
    expect(collapsedHtml).toContain("ai-analysis-error-fallback-card");
    expect(collapsedHtml).toContain("Ocurrió un inconveniente al procesar el análisis");
    expect(collapsedHtml).toContain("retry-analysis-button");
    expect(collapsedHtml).toContain("Reintentar análisis");
    expect(collapsedHtml).toContain("toggle-error-details-button");
    expect(collapsedHtml).toContain("Ver detalles técnicos ▾");
    expect(collapsedHtml).not.toContain("error-technical-details");

    // 2. Expanded render: shows technical panel and technical error message
    const expandedHtml = renderToStaticMarkup(
      createElement(AiAnalysisErrorFallbackCard, {
        errorMessage: testError,
        initialShowDetails: true,
        onRetry: () => {},
      }),
    );
    expect(expandedHtml).toContain("Ocultar detalles técnicos ▴");
    expect(expandedHtml).toContain("error-technical-details");
    expect(expandedHtml).toContain(testError);

    // 3. Verify retry callback invocation
    const element = createElement(AiAnalysisErrorFallbackCard, {
      onRetry: () => {
        retryCalled = true;
      },
    });
    element.props.onRetry?.();
    expect(retryCalled).toBe(true);
  });
});
