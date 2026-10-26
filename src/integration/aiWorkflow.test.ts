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
    expect(screen).toContain("ai-offline-banner");
    expect(screen).toContain("Reintentar conexión");
  });

  it("provides copy-to-clipboard elements and formats report cleanly for user sharing", async () => {
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
  });

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
});
