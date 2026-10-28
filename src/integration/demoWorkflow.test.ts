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
import { performAnalysisAction } from "@/services/analysisWorkflow";
import type { AnalysisReportRecord } from "@/services/analysisService";

describe("demoWorkflow integration", () => {
  const params = {
    comparisonId: "comp-demo-integration",
    initialImagePath: "images/initial.jpg",
    finalImagePath: "images/final.jpg",
  };

  beforeEach(() => {
    resetDemoConfig();
  });

  it("serves mock report in isolation without calling real Supabase Edge Function", async () => {
    const mockRealRequest = vi.fn();
    const mockRealFetch = vi.fn();

    setDemoState({
      enabled: true,
      mockLatencyMs: 10,
      selectedScenario: "changes_detected",
    });

    const report = await performAnalysisAction("analyze", params, {
      requestAnalysis: mockRealRequest,
      fetchReport: mockRealFetch,
    });

    expect(report).not.toBeNull();
    expect(report?.comparison_id).toBe("comp-demo-integration");
    expect(report?.result.hasVisibleChanges).toBe(true);
    expect(report?.result.differences.length).toBeGreaterThan(0);

    // CRITICAL: Ensure production backend functions were NOT invoked
    expect(mockRealRequest).not.toHaveBeenCalled();
    expect(mockRealFetch).not.toHaveBeenCalled();

    // Verify metrics tracking
    expect(getDemoState().totalMocksServed).toBe(1);
    expect(getDemoState().lastMockUsedAt).not.toBeNull();
  });

  it("switches scenarios dynamically during academic demonstration", async () => {
    setDemoState({
      enabled: true,
      mockLatencyMs: 0,
      selectedScenario: "no_changes",
    });

    const noChangesReport = await performAnalysisAction("analyze", params, {
      requestAnalysis: vi.fn(),
      fetchReport: vi.fn(),
    });

    expect(noChangesReport?.result.hasVisibleChanges).toBe(false);
    expect(noChangesReport?.result.differences).toHaveLength(0);

    // Switch scenario to structural defect on the fly
    setDemoState({ selectedScenario: "structural_defect" });

    const structuralReport = await performAnalysisAction("analyze", params, {
      requestAnalysis: vi.fn(),
      fetchReport: vi.fn(),
    });

    expect(structuralReport?.result.hasVisibleChanges).toBe(true);
    expect(structuralReport?.result.summary).toContain("CRÍTICA");
    expect(getDemoState().totalMocksServed).toBe(2);
  });

  it("restores production routing when demo mode is toggled off", async () => {
    const productionReport = {
      id: "prod-report-1",
      comparison_id: "comp-demo-integration",
    } as AnalysisReportRecord;

    const mockRealRequest = vi.fn().mockResolvedValue(productionReport);
    const mockRealFetch = vi.fn();

    // Step 1: Demo active
    setDemoState({ enabled: true, mockLatencyMs: 0 });
    const demoReport = await performAnalysisAction("analyze", params, {
      requestAnalysis: mockRealRequest,
      fetchReport: mockRealFetch,
    });
    expect(demoReport?.id).toContain("mock-report");
    expect(mockRealRequest).not.toHaveBeenCalled();

    // Step 2: Toggle demo mode off
    setDemoState({ enabled: false });
    const realReport = await performAnalysisAction("analyze", params, {
      requestAnalysis: mockRealRequest,
      fetchReport: mockRealFetch,
      checkOnline: () => true,
    });

    expect(realReport?.id).toBe("prod-report-1");
    expect(mockRealRequest).toHaveBeenCalledTimes(1);
    expect(mockRealRequest).toHaveBeenCalledWith("comp-demo-integration");
  });

  it("simulates configurable network latency faithfully", async () => {
    setDemoState({ enabled: true, mockLatencyMs: 60 });

    const startTime = Date.now();
    await performAnalysisAction("analyze", params, {
      requestAnalysis: vi.fn(),
      fetchReport: vi.fn(),
    });
    const elapsedTime = Date.now() - startTime;

    // Allow small clock margin
    expect(elapsedTime).toBeGreaterThanOrEqual(50);
  });
});
