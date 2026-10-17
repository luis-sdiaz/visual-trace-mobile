import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/analysisService", () => ({
  fetchCurrentAnalysisReport: vi.fn(),
  requestComparisonAnalysis: vi.fn(),
}));

import {
  getAnalysisAction,
  getAnalysisPresentation,
  performAnalysisAction,
  type AnalysisStatus,
} from "@/services/analysisWorkflow";
import type { AnalysisReportRecord } from "@/services/analysisService";

const params = {
  comparisonId: "comparison-1",
  initialImagePath: "initial.jpg",
  finalImagePath: "final.jpg",
};

describe("analysisWorkflow", () => {
  const actionCases = [
    ["ready", "analyze"],
    ["analysis_error", "analyze"],
    ["report_error", "retry_report"],
    ["reports_unavailable", "retry_report"],
    ["loading_report", null],
    ["analyzing", null],
    ["available", null],
    ["limited", null],
  ] satisfies [AnalysisStatus, "analyze" | "retry_report" | null][];

  it.each(actionCases)(
    "maps %s to the compatible action",
    (status, expected) => {
      expect(getAnalysisAction(status, true)).toBe(expected);
    },
  );

  it("does not offer an action without complete persisted image paths", () => {
    expect(getAnalysisAction("ready", false)).toBeNull();
    expect(getAnalysisAction("report_error", false)).toBeNull();
  });

  it.each(["report_error", "reports_unavailable"] satisfies AnalysisStatus[])(
    "keeps the photographs ready when the report state is %s",
    (status) => {
      expect(getAnalysisPresentation(status, true).statusTitle).toBe(
        "Fotografías listas",
      );
    },
  );

  it("retries only the report query without requesting a Gemini analysis", async () => {
    const fetchReport = vi.fn().mockResolvedValue(null);
    const requestAnalysis = vi.fn();

    await expect(
      performAnalysisAction("retry_report", params, { fetchReport, requestAnalysis }),
    ).resolves.toBeNull();

    expect(fetchReport).toHaveBeenCalledWith(params);
    expect(requestAnalysis).not.toHaveBeenCalled();
  });

  it("requests a new analysis only for the analyze action", async () => {
    const report = { id: "report-1" } as AnalysisReportRecord;
    const fetchReport = vi.fn();
    const requestAnalysis = vi.fn().mockResolvedValue(report);

    await expect(
      performAnalysisAction("analyze", params, { fetchReport, requestAnalysis }),
    ).resolves.toBe(report);

    expect(requestAnalysis).toHaveBeenCalledWith("comparison-1");
    expect(fetchReport).not.toHaveBeenCalled();
  });

  it("recovers through a later report query when the backend becomes available", async () => {
    const report = { id: "report-1" } as AnalysisReportRecord;
    const fetchReport = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce(report);
    const requestAnalysis = vi.fn();
    const dependencies = { fetchReport, requestAnalysis };

    await expect(
      performAnalysisAction("retry_report", params, dependencies),
    ).rejects.toThrow("Network request failed");
    await expect(
      performAnalysisAction("retry_report", params, dependencies),
    ).resolves.toBe(report);

    expect(requestAnalysis).not.toHaveBeenCalled();
  });
});
