import * as Print from "expo-print";

import {
  ComparisonPdfReportData,
  PdfExportOptions,
  PdfExportResult,
  resolvePdfExportOptions,
} from "@/types/pdfExport";
import { buildComparisonPdfHtml } from "@/utils/buildComparisonPdfHtml";

export class PdfExportError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "PdfExportError";
  }
}

export async function generateComparisonPdf(
  data: ComparisonPdfReportData,
  options?: Partial<PdfExportOptions> & { includeBase64?: boolean },
): Promise<PdfExportResult> {
  if (!data || typeof data !== "object") {
    throw new PdfExportError("Los datos de la comparación son obligatorios para generar el PDF.");
  }

  try {
    const resolvedOptions = resolvePdfExportOptions(options);
    const html = buildComparisonPdfHtml(data, resolvedOptions);

    const printResult = await Print.printToFileAsync({
      html,
      base64: options?.includeBase64 ?? false,
    });

    if (!printResult || !printResult.uri) {
      throw new PdfExportError("El motor de impresión no retornó una ruta de archivo válida.");
    }

    return {
      uri: printResult.uri,
      numberOfPages: printResult.numberOfPages ?? 1,
      base64: printResult.base64,
    };
  } catch (error) {
    if (error instanceof PdfExportError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "Error inesperado al generar el archivo PDF.";
    throw new PdfExportError(`Fallo al exportar reporte PDF: ${message}`, error);
  }
}

