import * as Sharing from "expo-sharing";

export interface ShareReportOptions {
  dialogTitle?: string;
  mimeType?: string;
  UTI?: string;
}

export class ShareReportError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ShareReportError";
  }
}

export async function isShareAvailable(): Promise<boolean> {
  try {
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function sharePdfReport(
  fileUri: string,
  options?: ShareReportOptions,
): Promise<boolean> {
  if (!fileUri || typeof fileUri !== "string" || fileUri.trim().length === 0) {
    throw new ShareReportError("La ruta del archivo es obligatoria para compartir el reporte.");
  }

  const available = await isShareAvailable();
  if (!available) {
    return false;
  }

  try {
    await Sharing.shareAsync(fileUri, {
      dialogTitle: options?.dialogTitle ?? "Compartir Reporte VisualTrace",
      mimeType: options?.mimeType ?? "application/pdf",
      UTI: options?.UTI ?? "com.adobe.pdf",
    });
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error inesperado al invocar la hoja de compartir.";
    throw new ShareReportError(`No fue posible compartir el archivo: ${message}`, error);
  }
}

