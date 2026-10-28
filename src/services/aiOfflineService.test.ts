import { beforeEach, describe, expect, it } from "vitest";

import { generateMockAiAnalysisReport } from "@/services/aiMockService";
import type { AnalysisReportRecord } from "@/services/analysisService";
import {
  cacheOfflineAnalysisReport,
  clearOfflineAnalysisCache,
  getOfflineAnalysisReport,
  getOfflineCacheStats,
  hasOfflineReport,
  resolveOfflineFallback,
} from "./aiOfflineService";

describe("aiOfflineService", () => {
  beforeEach(async () => {
    await clearOfflineAnalysisCache();
  });

  it("stores and retrieves a valid analysis report offline", async () => {
    const report = generateMockAiAnalysisReport({
      comparisonId: "comp-offline-1",
      scenario: "changes_detected",
    });

    await cacheOfflineAnalysisReport(report);

    expect(await hasOfflineReport("comp-offline-1")).toBe(true);
    const retrieved = await getOfflineAnalysisReport("comp-offline-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(report.id);
    expect(retrieved?.result.summary).toBe(report.result.summary);
  });

  it("rejects invalid reports that do not comply with the contract", async () => {
    const invalidReport = {
      id: "inv-1",
      comparison_id: "comp-invalid",
      result: { invalid: true },
    } as unknown as AnalysisReportRecord;

    await expect(cacheOfflineAnalysisReport(invalidReport)).rejects.toThrow(
      /no cumple el contrato/,
    );
  });

  it("clears cache and reports accurate stats", async () => {
    expect((await getOfflineCacheStats()).cachedCount).toBe(0);

    const report = generateMockAiAnalysisReport({ comparisonId: "comp-stat" });
    await cacheOfflineAnalysisReport(report);

    const statsAfter = await getOfflineCacheStats();
    expect(statsAfter.cachedCount).toBe(1);
    expect(statsAfter.lastSavedAt).toBeTruthy();

    await clearOfflineAnalysisCache();
    const statsClean = await getOfflineCacheStats();
    expect(statsClean.cachedCount).toBe(0);
    expect(statsClean.lastSavedAt).toBeNull();
  });

  it("resolves fallback using existing cached report or generating fresh fallback", async () => {
    // 1. Fresh generation and auto-caching
    const fresh = await resolveOfflineFallback("comp-fresh");
    expect(fresh.comparison_id).toBe("comp-fresh");
    expect(await hasOfflineReport("comp-fresh")).toBe(true);

    // 2. Returns existing from cache
    const cached = await resolveOfflineFallback("comp-fresh");
    expect(cached.id).toBe(fresh.id);
  });

  it("returns null safely for empty comparisonId", async () => {
    expect(await getOfflineAnalysisReport("")).toBeNull();
    expect(await hasOfflineReport("")).toBe(false);
  });
});

