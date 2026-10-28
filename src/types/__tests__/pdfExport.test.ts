import { describe, expect, it } from "vitest";

import {
  ComparisonPdfReportData,
  DEFAULT_PDF_EXPORT_OPTIONS,
  isPdfExportResult,
  resolvePdfExportOptions,
} from "../pdfExport";

describe("pdfExport type definitions and helpers", () => {
  it("provides immutable default export options with standard document parameters", () => {
    expect(DEFAULT_PDF_EXPORT_OPTIONS.pageSize).toBe("A4");
    expect(DEFAULT_PDF_EXPORT_OPTIONS.orientation).toBe("portrait");
    expect(DEFAULT_PDF_EXPORT_OPTIONS.includeImages).toBe(true);
    expect(DEFAULT_PDF_EXPORT_OPTIONS.includeAiReport).toBe(true);
    expect(DEFAULT_PDF_EXPORT_OPTIONS.includeMetadata).toBe(true);
  });

  it("resolves default options when called with undefined or empty input", () => {
    const resolvedEmpty = resolvePdfExportOptions({});
    expect(resolvedEmpty.pageSize).toBe("A4");
    expect(resolvedEmpty.orientation).toBe("portrait");
    expect(resolvedEmpty.includeImages).toBe(true);
    expect(resolvedEmpty.includeAiReport).toBe(true);
    expect(resolvedEmpty.includeMetadata).toBe(true);

    const resolvedUndefined = resolvePdfExportOptions(undefined);
    expect(resolvedUndefined).toEqual(resolvedEmpty);
  });

  it("correctly overrides specific options while preserving defaults for others", () => {
    const custom = resolvePdfExportOptions({
      pageSize: "Letter",
      orientation: "landscape",
      includeImages: false,
      customTitle: "Auditoría de Fachada",
      authorName: "Ing. Luis Díaz",
    });

    expect(custom.pageSize).toBe("Letter");
    expect(custom.orientation).toBe("landscape");
    expect(custom.includeImages).toBe(false);
    expect(custom.includeAiReport).toBe(true);
    expect(custom.includeMetadata).toBe(true);
    expect(custom.customTitle).toBe("Auditoría de Fachada");
    expect(custom.authorName).toBe("Ing. Luis Díaz");
  });

  it("validates valid and invalid PdfExportResult objects with type guard", () => {
    expect(isPdfExportResult(null)).toBe(false);
    expect(isPdfExportResult(undefined)).toBe(false);
    expect(isPdfExportResult("string")).toBe(false);
    expect(isPdfExportResult({})).toBe(false);
    expect(isPdfExportResult({ uri: "" })).toBe(false);
    expect(isPdfExportResult({ uri: "file:///doc.pdf", numberOfPages: 0 })).toBe(false);

    expect(
      isPdfExportResult({
        uri: "file:///documents/comparison_report.pdf",
        numberOfPages: 2,
        base64: "JVBERi0x...",
        fileSize: 104857,
      }),
    ).toBe(true);
  });

  it("supports typed structures for full comparison report payloads", () => {
    const samplePayload: ComparisonPdfReportData = {
      title: "Control de Fisura en Columna C-4",
      createdAt: "2026-10-27T10:00:00Z",
      initialImage: {
        uri: "https://example.com/initial.jpg",
        label: "Estado Inicial (Antes)",
        capturedAt: "2026-10-20T09:30:00Z",
      },
      finalImage: {
        uri: "https://example.com/final.jpg",
        label: "Estado Actual (Después)",
        capturedAt: "2026-10-27T09:30:00Z",
      },
      aiSummary: "Se observa ensanchamiento de 2mm en la fisura existente.",
      confidenceScore: 0.94,
      differences: [
        {
          type: "modified",
          description: "Incremento en apertura de fisura de 1.2mm a 3.2mm.",
          location: "Zona media de la columna",
          severity: "high",
        },
      ],
      metadata: {
        comparisonId: "comp-1234",
        generatedAt: "2026-10-27T10:05:00Z",
        appVersion: "1.0.0",
        appName: "VisualTrace",
        totalDifferencesCount: 1,
      },
    };

    expect(samplePayload.title).toBe("Control de Fisura en Columna C-4");
    expect(samplePayload.differences?.length).toBe(1);
    expect(samplePayload.metadata?.comparisonId).toBe("comp-1234");
  });
});

