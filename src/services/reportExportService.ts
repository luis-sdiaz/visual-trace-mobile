import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import type {
  ExportReportData,
  ExportReportOptions,
  ExportReportResult,
} from "@/contracts/reportExport";
import {
  isExportReportData,
  sanitizeFilename,
  validateExportOptions,
} from "@/contracts/reportExport";
import { generateReportHtml } from "@/utils/reportExportTemplate";

export class ReportExportError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_DATA"
      | "PRINT_FAILED"
      | "SHARING_UNAVAILABLE"
      | "SHARING_FAILED"
      | "PERMISSION_DENIED"
      | "UNKNOWN",
  ) {
    super(message);
    this.name = "ReportExportError";
  }
}

/**
 * Convierte de forma resiliente una URI de imagen local a una cadena Base64 Data URI.
 * Si la imagen ya es Base64 o HTTP(S), la devuelve tal cual.
 * Ante cualquier fallo de lectura en disco o formato, retorna null sin interrumpir la exportación.
 */
export async function resolveImageToBase64(
  uri?: string | null,
): Promise<string | null> {
  if (!uri || typeof uri !== "string") return null;

  const trimmed = uri.trim();
  if (trimmed.length === 0) return null;

  // Si ya tiene esquema base64
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  // Si es una URL remota http/https, el navegador/WebView de impresión puede cargarla directamente
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Si es un archivo local en el dispositivo (file:// o ruta absoluta)
  try {
    const base64Data = await FileSystem.readAsStringAsync(trimmed, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64Data || base64Data.length === 0) {
      return null;
    }

    const mime = trimmed.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${base64Data}`;
  } catch {
    // Si no se puede leer el archivo en disco (ej. permisos o archivo temporal eliminado),
    // no interrumpimos la generación del informe.
    return null;
  }
}

/**
 * Prepara los datos del informe convirtiendo las imágenes locales a Base64
 * para asegurar un renderizado fiel en el motor de renderizado de Expo Print.
 */
export async function prepareReportExportData(
  data: ExportReportData,
): Promise<ExportReportData> {
  if (!data.images) {
    return data;
  }

  const initialBase64 =
    data.images.initialImageBase64 ||
    (await resolveImageToBase64(data.images.initialImageUri));

  const finalBase64 =
    data.images.finalImageBase64 ||
    (await resolveImageToBase64(data.images.finalImageUri));

  return {
    ...data,
    images: {
      ...data.images,
      initialImageBase64: initialBase64,
      finalImageBase64: finalBase64,
    },
  };
}

/**
 * Genera un archivo PDF a partir de los datos del informe de análisis.
 */
export async function generatePdfReport(
  data: ExportReportData,
  options?: ExportReportOptions,
): Promise<ExportReportResult> {
  try {
    if (!isExportReportData(data)) {
      throw new ReportExportError(
        "Los datos proporcionados para el informe no cumplen con el contrato requerido.",
        "INVALID_DATA",
      );
    }

    const opts = validateExportOptions(options);

    // Preparar imágenes si están habilitadas
    const preparedData = opts.includeImages
      ? await prepareReportExportData(data)
      : data;

    const html = generateReportHtml(preparedData, opts);

    const printResult = await Print.printToFileAsync({
      html,
    });

    if (!printResult || !printResult.uri) {
      throw new ReportExportError(
        "No se pudo generar el archivo PDF del informe.",
        "PRINT_FAILED",
      );
    }

    return {
      success: true,
      uri: printResult.uri,
      filePath: printResult.uri,
      numberOfPages: printResult.numberOfPages,
    };
  } catch (error) {
    if (error instanceof ReportExportError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al generar el archivo PDF.",
    };
  }
}

/**
 * Genera el archivo PDF y abre la hoja de compartir nativa del sistema operativo (iOS/Android/Web).
 */
export async function sharePdfReport(
  data: ExportReportData,
  options?: ExportReportOptions,
): Promise<ExportReportResult> {
  try {
    const pdfResult = await generatePdfReport(data, options);

    if (!pdfResult.success || !pdfResult.uri) {
      return pdfResult;
    }

    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
      // En plataformas o entornos donde Sharing no está disponible (ej. web sin Web Share API),
      // retornamos el archivo PDF generado exitosamente para acceso directo.
      return {
        success: true,
        uri: pdfResult.uri,
        filePath: pdfResult.filePath,
        numberOfPages: pdfResult.numberOfPages,
        error: undefined,
      };
    }

    const title = options?.filename
      ? sanitizeFilename(options.filename)
      : sanitizeFilename(data.metadata?.comparisonName, "VisualTrace-Reporte");

    await Sharing.shareAsync(pdfResult.uri, {
      mimeType: "application/pdf",
      dialogTitle: `${title}.pdf`,
      UTI: "com.adobe.pdf",
    });

    return {
      success: true,
      uri: pdfResult.uri,
      filePath: pdfResult.filePath,
      numberOfPages: pdfResult.numberOfPages,
    };
  } catch (error) {
    // Si el usuario descarta o cancela la hoja de compartir nativa
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (
      errorMsg.toLowerCase().includes("cancel") ||
      errorMsg.toLowerCase().includes("dismiss")
    ) {
      return {
        success: false,
        cancelled: true,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al compartir el informe en PDF.",
    };
  }
}

/**
 * Valida los permisos de almacenamiento y disponibilidad del módulo en la plataforma.
 */
export async function checkStorageAndSharingCapabilities(): Promise<{
  canShare: boolean;
  platform: string;
}> {
  try {
    const canShare = await Sharing.isAvailableAsync();
    return {
      canShare,
      platform: Platform.OS,
    };
  } catch {
    return {
      canShare: false,
      platform: Platform.OS,
    };
  }
}

