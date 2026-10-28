import { isGeminiAnalysisReport } from "@/contracts/geminiAnalysis";
import type { AnalysisReportRecord } from "@/services/analysisService";
import { generateMockAiAnalysisReport } from "@/services/aiMockService";

interface OfflineCacheStats {
  cachedCount: number;
  lastSavedAt: string | null;
}

const offlineReportCache = new Map<string, AnalysisReportRecord>();
let lastSavedTimestamp: string | null = null;

export async function cacheOfflineAnalysisReport(
  report: AnalysisReportRecord,
): Promise<void> {
  if (!report || !report.comparison_id) {
    throw new Error("Reporte de análisis inválido para almacenamiento offline.");
  }

  if (!isGeminiAnalysisReport(report.result)) {
    throw new Error("El resultado del reporte no cumple el contrato Gemini.");
  }

  offlineReportCache.set(report.comparison_id, { ...report });
  lastSavedTimestamp = new Date().toISOString();
}

export async function getOfflineAnalysisReport(
  comparisonId: string,
): Promise<AnalysisReportRecord | null> {
  if (!comparisonId) return null;
  const found = offlineReportCache.get(comparisonId);
  return found ? { ...found } : null;
}

export async function hasOfflineReport(comparisonId: string): Promise<boolean> {
  if (!comparisonId) return false;
  return offlineReportCache.has(comparisonId);
}

export async function clearOfflineAnalysisCache(): Promise<void> {
  offlineReportCache.clear();
  lastSavedTimestamp = null;
}

export async function getOfflineCacheStats(): Promise<OfflineCacheStats> {
  return {
    cachedCount: offlineReportCache.size,
    lastSavedAt: lastSavedTimestamp,
  };
}

export async function resolveOfflineFallback(
  comparisonId: string,
  options?: {
    initialImagePath?: string;
    finalImagePath?: string;
  },
): Promise<AnalysisReportRecord> {
  const existing = await getOfflineAnalysisReport(comparisonId);
  if (existing) {
    return existing;
  }

  const fallback = generateMockAiAnalysisReport({
    comparisonId,
    initialImagePath: options?.initialImagePath,
    finalImagePath: options?.finalImagePath,
    scenario: "changes_detected",
  });

  await cacheOfflineAnalysisReport(fallback);
  return fallback;
}

