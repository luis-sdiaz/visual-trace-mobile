export type PdfPageSize = "A4" | "Letter";
export type PdfOrientation = "portrait" | "landscape";
export type DifferenceSeverity = "low" | "medium" | "high";

export interface PdfExportOptions {
  pageSize?: PdfPageSize;
  orientation?: PdfOrientation;
  includeImages?: boolean;
  includeAiReport?: boolean;
  includeMetadata?: boolean;
  customTitle?: string;
  authorName?: string;
  notes?: string;
}

export interface PdfExportMetadata {
  comparisonId: string;
  generatedAt: string;
  appVersion: string;
  appName: string;
  totalDifferencesCount: number;
  userEmail?: string;
}

export interface PdfExportResult {
  uri: string;
  numberOfPages: number;
  base64?: string;
  fileSize?: number;
}

export interface ComparisonPdfImageItem {
  uri: string;
  label: string;
  capturedAt?: string;
}

export interface ComparisonPdfDifferenceItem {
  type: string;
  description: string;
  location?: string;
  severity?: DifferenceSeverity;
}

export interface ComparisonPdfReportData {
  title: string;
  createdAt: string;
  initialImage?: ComparisonPdfImageItem | null;
  finalImage?: ComparisonPdfImageItem | null;
  aiSummary?: string;
  confidenceScore?: number;
  differences?: ComparisonPdfDifferenceItem[];
  metadata?: Partial<PdfExportMetadata>;
  notes?: string;
}

export const DEFAULT_PDF_EXPORT_OPTIONS: Readonly<Required<Pick<PdfExportOptions, "pageSize" | "orientation" | "includeImages" | "includeAiReport" | "includeMetadata">>> = Object.freeze({
  pageSize: "A4",
  orientation: "portrait",
  includeImages: true,
  includeAiReport: true,
  includeMetadata: true,
});

export function resolvePdfExportOptions(
  options?: Partial<PdfExportOptions>,
): Required<Pick<PdfExportOptions, "pageSize" | "orientation" | "includeImages" | "includeAiReport" | "includeMetadata">> &
  Omit<PdfExportOptions, "pageSize" | "orientation" | "includeImages" | "includeAiReport" | "includeMetadata"> {
  return {
    ...DEFAULT_PDF_EXPORT_OPTIONS,
    ...options,
    pageSize: options?.pageSize ?? DEFAULT_PDF_EXPORT_OPTIONS.pageSize,
    orientation: options?.orientation ?? DEFAULT_PDF_EXPORT_OPTIONS.orientation,
    includeImages: options?.includeImages ?? DEFAULT_PDF_EXPORT_OPTIONS.includeImages,
    includeAiReport: options?.includeAiReport ?? DEFAULT_PDF_EXPORT_OPTIONS.includeAiReport,
    includeMetadata: options?.includeMetadata ?? DEFAULT_PDF_EXPORT_OPTIONS.includeMetadata,
  };
}

export function isPdfExportResult(value: unknown): value is PdfExportResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.uri === "string" &&
    candidate.uri.length > 0 &&
    typeof candidate.numberOfPages === "number" &&
    candidate.numberOfPages > 0
  );
}

