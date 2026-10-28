import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    functions: { invoke: vi.fn() },
    from: vi.fn(),
  },
}));

import {
  getDemoState,
  resetDemoConfig,
  setDemoState,
} from "@/config/demoConfig";
import { calculateVisualSeverity } from "@/components/ui/AiAnalysisSummaryCard";
import {
  cacheOfflineAnalysisReport,
  getOfflineAnalysisReport,
  resolveOfflineFallback,
} from "@/services/aiOfflineService";
import {
  NetworkOfflineError,
  performAnalysisAction,
} from "@/services/analysisWorkflow";
import { AnalysisServiceError } from "@/services/analysisService";

describe("Sustentation Scenarios E2E Suite", () => {
  const comparisonParams = {
    comparisonId: "comp-thesis-presentation-2026",
    initialImagePath: "inspections/initial-state.jpg",
    finalImagePath: "inspections/final-state.jpg",
  };

  beforeEach(() => {
    resetDemoConfig();
  });

  it("Scenario 1: executes live academic demo successfully with structured Gemini analysis", async () => {
    setDemoState({
      enabled: true,
      mockLatencyMs: 0,
      selectedScenario: "changes_detected",
    });

    const report = await performAnalysisAction("analyze", comparisonParams, {
      requestAnalysis: vi.fn(),
      fetchReport: vi.fn(),
    });

    expect(report).not.toBeNull();
    expect(report?.result.hasVisibleChanges).toBe(true);
    expect(report?.result.differences.length).toBeGreaterThan(0);

    // Validate visual severity calculation for the presentation card
    if (report) {
      const severity = calculateVisualSeverity(
        report.result.differences,
        report.result.hasVisibleChanges,
      );
      expect(severity.level).not.toBe("none");
      expect(report.result.differences).toHaveLength(3);
    }

    expect(getDemoState().totalMocksServed).toBe(1);
  });

  it("Scenario 2: showcases graceful quota limit handling (HTTP 429) to the jury", async () => {
    setDemoState({
      enabled: true,
      networkCondition: "error_429",
      mockLatencyMs: 0,
    });

    try {
      await performAnalysisAction("analyze", comparisonParams, {
        requestAnalysis: vi.fn(),
        fetchReport: vi.fn(),
      });
      expect.unreachable("Should have thrown simulated 429 quota error");
    } catch (error) {
      expect(error).toBeInstanceOf(AnalysisServiceError);
      const serviceError = error as AnalysisServiceError;
      expect(serviceError.code).toBe("usage_limit_reached");
      expect(serviceError.scope).toBe("global_minute");
      expect(serviceError.message).toContain("cuota simulado");
    }
  });

  it("Scenario 3: handles unexpected connectivity drop with offline cache fallback", async () => {
    // 1. Prepare and pre-cache a report before disconnection
    setDemoState({ enabled: true, mockLatencyMs: 0 });
    const originalReport = await performAnalysisAction("analyze", comparisonParams, {
      requestAnalysis: vi.fn(),
      fetchReport: vi.fn(),
    });
    expect(originalReport).not.toBeNull();
    if (originalReport) {
      await cacheOfflineAnalysisReport(originalReport);
    }

    // 2. Simulate total internet outage during defense
    setDemoState({ networkCondition: "offline" });
    await expect(
      performAnalysisAction("analyze", comparisonParams, {
        requestAnalysis: vi.fn(),
        fetchReport: vi.fn(),
      }),
    ).rejects.toThrow(NetworkOfflineError);

    // 3. System activates fallback and recovers report without internet
    const recovered = await getOfflineAnalysisReport(comparisonParams.comparisonId);
    expect(recovered).not.toBeNull();
    expect(recovered?.id).toBe(originalReport?.id);

    // 4. Fallback generation works even without pre-cached report
    const fallbackFresh = await resolveOfflineFallback("comp-brand-new");
    expect(fallbackFresh.comparison_id).toBe("comp-brand-new");
  });

  it("Scenario 4: demonstrates recovery and resilience from simulated HTTP 500 server error", async () => {
    // 1. Force server error
    setDemoState({
      enabled: true,
      networkCondition: "error_500",
      mockLatencyMs: 0,
    });

    await expect(
      performAnalysisAction("analyze", comparisonParams, {
        requestAnalysis: vi.fn(),
        fetchReport: vi.fn(),
      }),
    ).rejects.toThrow(/servidor 500 simulado/);

    // 2. Professor / evaluator restores normal condition
    setDemoState({ networkCondition: "normal" });

    // 3. Analysis executes cleanly and recovers
    const recovered = await performAnalysisAction("analyze", comparisonParams, {
      requestAnalysis: vi.fn(),
      fetchReport: vi.fn(),
    });
    expect(recovered).not.toBeNull();
    expect(recovered?.result.hasVisibleChanges).toBe(true);
  });

  it("Scenario 5: verifies UI contract safeguards for demo controls and architecture card", () => {
    const homeCode = readFileSync(
      resolve(process.cwd(), "src/app/home.tsx"),
      "utf8",
    );
    expect(homeCode).toContain("open-dev-settings-button");
    expect(homeCode).toContain("dev-settings-modal");
    expect(homeCode).toContain("modal-demo-toggle");
    expect(homeCode).toContain("modal-dev-error-injection-panel");
    expect(homeCode).toContain("home-demo-toggle");
    expect(homeCode).toContain("home-demo-active-banner");

    const resultScreenCode = readFileSync(
      resolve(process.cwd(), "src/app/comparison-result.tsx"),
      "utf8",
    );
    expect(resultScreenCode).toContain("result-architecture-info-card");
    expect(resultScreenCode).toContain("demo-mode-badge");
  });
});
