import { Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import type {
  GeminiAnalysisReport,
  VisualDifferenceCategory,
} from "@/contracts/geminiAnalysis";

export const CATEGORY_LABELS: Record<VisualDifferenceCategory, string> = {
  added: "Elemento añadido",
  removed: "Elemento retirado",
  modified: "Modificación",
  moved: "Cambio de posición",
  appearance: "Cambio de apariencia",
  other: "Otro cambio visible",
};

export type FormatReportOptions = {
  comparisonName?: string | null;
};

export type ShareReportResult = {
  success: boolean;
  action?: "sharedAction" | "dismissedAction";
  activityType?: string | null;
  error?: string;
};

export function formatReportForClipboard(
  report: GeminiAnalysisReport,
  options?: FormatReportOptions,
): string {
  const lines: string[] = [];

  lines.push("📋 INFORME DE ANÁLISIS COMPARATIVO — VISUALTRACE");
  if (options?.comparisonName && options.comparisonName.trim().length > 0) {
    lines.push(`Comparación: ${options.comparisonName.trim()}`);
  }
  lines.push("");

  lines.push("📌 RESUMEN");
  lines.push(report.summary.trim());
  lines.push("");

  lines.push("🔍 DIFERENCIAS DETECTADAS");
  if (report.differences && report.differences.length > 0) {
    report.differences.forEach((diff, index) => {
      const label = CATEGORY_LABELS[diff.category] ?? diff.category;
      lines.push(`${index + 1}. [${label}] ${diff.description.trim()}`);
    });
  } else {
    lines.push("No se identificaron cambios visibles entre las imágenes.");
  }

  if (report.observations && report.observations.length > 0) {
    lines.push("");
    lines.push("💡 OBSERVACIONES");
    report.observations.forEach((obs) => {
      lines.push(`• ${obs.trim()}`);
    });
  }

  if (report.uncertainties && report.uncertainties.length > 0) {
    lines.push("");
    lines.push("⚠️ LIMITACIONES");
    report.uncertainties.forEach((unc) => {
      lines.push(`• ${unc.trim()}`);
    });
  }

  lines.push("");
  lines.push(
    "ℹ️ Este informe es una asistencia automatizada con IA. La verificación final corresponde al usuario.",
  );

  return lines.join("\n");
}

export async function copyReportToClipboard(
  report: GeminiAnalysisReport,
  options?: FormatReportOptions,
): Promise<boolean> {
  try {
    const text = formatReportForClipboard(report, options);
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareReportNative(
  report: GeminiAnalysisReport,
  options?: FormatReportOptions,
): Promise<ShareReportResult> {
  try {
    const text = formatReportForClipboard(report, options);
    const title = options?.comparisonName && options.comparisonName.trim().length > 0
      ? `VisualTrace — ${options.comparisonName.trim()}`
      : "VisualTrace — Informe de Análisis";

    const result = await Share.share(
      {
        message: text,
        title,
      },
      {
        dialogTitle: title,
        subject: title,
      },
    );

    if (result.action === Share.sharedAction) {
      return {
        success: true,
        action: "sharedAction",
        activityType: result.activityType ?? null,
      };
    } else if (result.action === Share.dismissedAction) {
      return {
        success: false,
        action: "dismissedAction",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al compartir",
    };
  }
}
