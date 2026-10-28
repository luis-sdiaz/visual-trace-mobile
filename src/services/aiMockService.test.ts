import { beforeEach, describe, expect, it, vi } from "vitest";

import { isGeminiAnalysisReport } from "@/contracts/geminiAnalysis";
import {
  getDemoState,
  resetDemoConfig,
  setDemoState,
  type DemoMockScenario,
} from "@/config/demoConfig";
import {
  generateMockAiAnalysisReport,
  MOCK_REPORTS_BY_SCENARIO,
  resolveMockReport,
} from "./aiMockService";

describe("aiMockService", () => {
  beforeEach(() => {
    resetDemoConfig();
    vi.useRealTimers();
  });

  it("ensures all scenario reports comply strictly with the Gemini contract", () => {
    const scenarios: DemoMockScenario[] = [
      "changes_detected",
      "no_changes",
      "structural_defect",
      "minor_cosmetic",
    ];

    scenarios.forEach((scenario) => {
      const report = MOCK_REPORTS_BY_SCENARIO[scenario];
      expect(isGeminiAnalysisReport(report)).toBe(true);
      expect(report.contractVersion).toBe("1.0");
      expect(typeof report.hasVisibleChanges).toBe("boolean");
      expect(typeof report.summary).toBe("string");
      expect(Array.isArray(report.differences)).toBe(true);
      expect(Array.isArray(report.observations)).toBe(true);
      expect(Array.isArray(report.uncertainties)).toBe(true);
    });
  });

  it("generates a full AnalysisReportRecord for a comparison", () => {
    const record = generateMockAiAnalysisReport({
      comparisonId: "comp-123",
      scenario: "no_changes",
    });

    expect(record.id).toBe("mock-report-comp-123");
    expect(record.comparison_id).toBe("comp-123");
    expect(record.model).toContain("gemini");
    expect(record.result.hasVisibleChanges).toBe(false);
    expect(record.result.differences).toHaveLength(0);
    expect(isGeminiAnalysisReport(record.result)).toBe(true);
  });

  it("resolves mock report with simulation latency and updates demo metrics", async () => {
    setDemoState({ mockLatencyMs: 20 });
    expect(getDemoState().totalMocksServed).toBe(0);

    const report = await resolveMockReport("comp-test", {
      scenario: "structural_defect",
    });

    expect(report.comparison_id).toBe("comp-test");
    expect(report.result.hasVisibleChanges).toBe(true);
    expect(report.result.differences.length).toBeGreaterThan(0);
    expect(getDemoState().totalMocksServed).toBe(1);
    expect(getDemoState().lastMockUsedAt).not.toBeNull();
  });

  it("uses selectedScenario from demoState if not specified in params", () => {
    setDemoState({ selectedScenario: "minor_cosmetic" });
    const record = generateMockAiAnalysisReport({ comparisonId: "comp-auto" });
    expect(record.result.summary).toContain("cosméticas");
  });
});

