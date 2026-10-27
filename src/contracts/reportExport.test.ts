import { describe, expect, it } from "vitest";

import { GEMINI_ANALYSIS_CONTRACT_VERSION } from "./geminiAnalysis";
import {
  DEFAULT_EXPORT_OPTIONS,
  isExportReportData,
  sanitizeFilename,
  validateExportOptions,
} from "./reportExport";

const validGeminiReport = {
  contractVersion: GEMINI_ANALYSIS_CONTRACT_VERSION,
  hasVisibleChanges: true,
  summary: "Diferencia identificada en la fachada.",
  differences: [
    { category: "modified" as const, description: "Grieta reparada." },
  ],
  observations: ["Buena iluminación en ambas tomas."],
  uncertainties: [],
};

describe("Report Export Contracts", () => {
  describe("sanitizeFilename", () => {
    it("returns default fallback when name is null or undefined", () => {
      expect(sanitizeFilename(null)).toBe("VisualTrace-Reporte");
      expect(sanitizeFilename(undefined)).toBe("VisualTrace-Reporte");
      expect(sanitizeFilename("   ")).toBe("VisualTrace-Reporte");
    });

    it("replaces invalid filesystem characters and spaces", () => {
      const sanitized = sanitizeFilename("Reporte: Fachada / Edificio *1*");
      expect(sanitized).toBe("Reporte-_Fachada_-_Edificio_-1-");
      expect(sanitized).not.toContain(":");
      expect(sanitized).not.toContain("/");
      expect(sanitized).not.toContain("*");
    });

    it("truncates names longer than 60 characters", () => {
      const longName = "A".repeat(100);
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBe(60);
    });
  });

  describe("validateExportOptions", () => {
    it("returns default options when no argument is passed", () => {
      const options = validateExportOptions();
      expect(options).toEqual(DEFAULT_EXPORT_OPTIONS);
      expect(options.format).toBe("pdf");
      expect(options.pageSize).toBe("A4");
      expect(options.includeImages).toBe(true);
    });

    it("accepts custom format and page size", () => {
      const options = validateExportOptions({
        format: "html",
        pageSize: "Letter",
        includeImages: false,
        filename: "Mi Inspeccion",
      });
      expect(options.format).toBe("html");
      expect(options.pageSize).toBe("Letter");
      expect(options.includeImages).toBe(false);
      expect(options.filename).toBe("Mi_Inspeccion");
    });

    it("falls back to default if format or pageSize are invalid", () => {
      const options = validateExportOptions({
        format: "invalid-format",
        pageSize: "A3",
      });
      expect(options.format).toBe("pdf");
      expect(options.pageSize).toBe("A4");
    });
  });

  describe("isExportReportData", () => {
    it("validates a complete ExportReportData object", () => {
      const data = {
        report: validGeminiReport,
        metadata: {
          comparisonId: "comp-123",
          comparisonName: "Pared Este",
          createdAt: "2026-10-26T18:00:00Z",
        },
        images: {
          initialImageUri: "file://initial.jpg",
          finalImageUri: "file://final.jpg",
        },
      };
      expect(isExportReportData(data)).toBe(true);
    });

    it("validates when metadata and images are omitted", () => {
      const data = {
        report: validGeminiReport,
      };
      expect(isExportReportData(data)).toBe(true);
    });

    it("rejects non-object or null input", () => {
      expect(isExportReportData(null)).toBe(false);
      expect(isExportReportData("string")).toBe(false);
      expect(isExportReportData(123)).toBe(false);
    });

    it("rejects when report is invalid", () => {
      const data = {
        report: { invalid: true },
      };
      expect(isExportReportData(data)).toBe(false);
    });

    it("rejects when metadata or images are invalid types", () => {
      expect(
        isExportReportData({
          report: validGeminiReport,
          metadata: "invalid-metadata",
        }),
      ).toBe(false);

      expect(
        isExportReportData({
          report: validGeminiReport,
          images: 12345,
        }),
      ).toBe(false);
    });
  });
});
