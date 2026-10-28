import * as Print from "expo-print";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ComparisonPdfReportData } from "@/types/pdfExport";

import { generateComparisonPdf, PdfExportError } from "../pdfExportService";

describe("pdfExportService", () => {
  const mockValidData: ComparisonPdfReportData = {
    title: "Auditoría de Fachada Edificio Central",
    createdAt: "2026-10-27T10:00:00Z",
    initialImage: { uri: "file:///images/init.jpg", label: "Inicial" },
    finalImage: { uri: "file:///images/final.jpg", label: "Final" },
    aiSummary: "Sin novedades estructurales de riesgo.",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates PDF successfully and returns valid file URI and page count", async () => {
    const printSpy = vi.spyOn(Print, "printToFileAsync").mockResolvedValueOnce({
      uri: "file:///data/user/0/cache/comparison_report.pdf",
      numberOfPages: 3,
      base64: undefined,
    });

    const result = await generateComparisonPdf(mockValidData, {
      pageSize: "A4",
      orientation: "portrait",
    });

    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(printSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        base64: false,
        html: expect.stringContaining("Auditoría de Fachada Edificio Central"),
      }),
    );

    expect(result.uri).toBe("file:///data/user/0/cache/comparison_report.pdf");
    expect(result.numberOfPages).toBe(3);
  });

  it("requests base64 representation when includeBase64 option is enabled", async () => {
    const printSpy = vi.spyOn(Print, "printToFileAsync").mockResolvedValueOnce({
      uri: "file:///cache/report_b64.pdf",
      numberOfPages: 1,
      base64: "JVBERi0xLjQK...",
    });

    const result = await generateComparisonPdf(mockValidData, {
      includeBase64: true,
    });

    expect(printSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        base64: true,
      }),
    );
    expect(result.base64).toBe("JVBERi0xLjQK...");
  });

  it("throws PdfExportError when input data is missing or invalid", async () => {
    // @ts-expect-error Testing invalid input at runtime
    await expect(generateComparisonPdf(null)).rejects.toThrow(PdfExportError);
    // @ts-expect-error Testing invalid input at runtime
    await expect(generateComparisonPdf(undefined)).rejects.toThrow(
      "Los datos de la comparación son obligatorios",
    );
  });

  it("wraps and throws PdfExportError when Print.printToFileAsync fails", async () => {
    vi.spyOn(Print, "printToFileAsync").mockRejectedValueOnce(
      new Error("Disk full or permission denied"),
    );

    await expect(generateComparisonPdf(mockValidData)).rejects.toThrow(
      /Fallo al exportar reporte PDF/,
    );
  });

  it("throws PdfExportError when the print engine returns empty result", async () => {
    // @ts-expect-error Simulating malformed engine response
    vi.spyOn(Print, "printToFileAsync").mockResolvedValueOnce({ uri: "" });

    await expect(generateComparisonPdf(mockValidData)).rejects.toThrow(
      "El motor de impresión no retornó una ruta de archivo válida.",
    );
  });
});
