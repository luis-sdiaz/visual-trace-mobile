import {
  isGeminiAnalysisReport,
  type GeminiAnalysisReport,
} from "./geminiAnalysis";

export type ExportFormat = "pdf" | "html";

export type PageSize = "A4" | "Letter";

export type ExportReportImages = {
  initialImageUri?: string | null;
  finalImageUri?: string | null;
  initialImageBase64?: string | null;
  finalImageBase64?: string | null;
};

export type ExportReportMetadata = {
  comparisonId?: string | null;
  comparisonName?: string | null;
  createdAt?: string | null;
  initialCapturedAt?: string | null;
  finalCapturedAt?: string | null;
  appVersion?: string | null;
  authorName?: string | null;
};

export type ExportReportData = {
  report: GeminiAnalysisReport;
  metadata?: ExportReportMetadata;
  images?: ExportReportImages;
};

export type ExportReportOptions = {
  format?: ExportFormat;
  filename?: string;
  includeImages?: boolean;
  includeObservations?: boolean;
  includeUncertainties?: boolean;
  includeDisclaimer?: boolean;
  pageSize?: PageSize;
};

export type ExportReportResult = {
  success: boolean;
  uri?: string;
  filePath?: string;
  numberOfPages?: number;
  error?: string;
  cancelled?: boolean;
};

export const DEFAULT_EXPORT_OPTIONS: Required<ExportReportOptions> = {
  format: "pdf",
  filename: "VisualTrace-Reporte",
  includeImages: true,
  includeObservations: true,
  includeUncertainties: true,
  includeDisclaimer: true,
  pageSize: "A4",
};

export function sanitizeFilename(name?: string | null, fallback = "VisualTrace-Reporte"): string {
  if (!name || typeof name !== "string") {
    return fallback;
  }
  const clean = name
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, "_")
    .slice(0, 60);

  return clean.length > 0 ? clean : fallback;
}

export function isExportReportData(value: unknown): value is ExportReportData {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (!isGeminiAnalysisReport(record.report)) {
    return false;
  }

  if (record.metadata !== undefined && (typeof record.metadata !== "object" || record.metadata === null)) {
    return false;
  }

  if (record.images !== undefined && (typeof record.images !== "object" || record.images === null)) {
    return false;
  }

  return true;
}

export function validateExportOptions(options?: unknown): Required<ExportReportOptions> {
  if (typeof options !== "object" || options === null) {
    return { ...DEFAULT_EXPORT_OPTIONS };
  }

  const record = options as Record<string, unknown>;

  const format: ExportFormat =
    record.format === "html" || record.format === "pdf" ? record.format : DEFAULT_EXPORT_OPTIONS.format;

  const pageSize: PageSize =
    record.pageSize === "Letter" || record.pageSize === "A4" ? record.pageSize : DEFAULT_EXPORT_OPTIONS.pageSize;

  const filename =
    typeof record.filename === "string" && record.filename.trim().length > 0
      ? sanitizeFilename(record.filename.trim())
      : DEFAULT_EXPORT_OPTIONS.filename;

  return {
    format,
    filename,
    pageSize,
    includeImages: typeof record.includeImages === "boolean" ? record.includeImages : DEFAULT_EXPORT_OPTIONS.includeImages,
    includeObservations:
      typeof record.includeObservations === "boolean"
        ? record.includeObservations
        : DEFAULT_EXPORT_OPTIONS.includeObservations,
    includeUncertainties:
      typeof record.includeUncertainties === "boolean"
        ? record.includeUncertainties
        : DEFAULT_EXPORT_OPTIONS.includeUncertainties,
    includeDisclaimer:
      typeof record.includeDisclaimer === "boolean"
        ? record.includeDisclaimer
        : DEFAULT_EXPORT_OPTIONS.includeDisclaimer,
  };
}

