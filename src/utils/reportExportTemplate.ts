import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import type {
  ExportReportData,
  ExportReportOptions,
} from "@/contracts/reportExport";
import { validateExportOptions } from "@/contracts/reportExport";
import { calculateVisualSeverity } from "@/components/ui/AiAnalysisSummaryCard";
import { CATEGORY_LABELS } from "./reportExport";

/**
 * Escapa caracteres especiales para evitar vulnerabilidades XSS en la plantilla HTML.
 */
export function escapeHtml(str?: string | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Formatea una fecha ISO o string a formato legible en español.
 */
export function formatReportDate(dateString?: string | null): string {
  if (!dateString) {
    return new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

/**
 * Normaliza una URI de imagen asegurando que las cadenas base64 incluyan el prefijo data URI.
 */
export function normalizeImageSource(src?: string | null): string | null {
  if (!src || typeof src !== "string") return null;
  const trimmed = src.trim();
  if (trimmed.length === 0) return null;

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("file://")
  ) {
    return trimmed;
  }

  // Si es un base64 sin prefijo
  return `data:image/jpeg;base64,${trimmed}`;
}

/**
 * Genera el documento HTML completo del informe comparativo aplicando los Design Tokens
 * y optimizado para exportación e impresión a PDF.
 */
export function generateReportHtml(
  data: ExportReportData,
  options?: ExportReportOptions,
): string {
  const opts = validateExportOptions(options);
  const { report, metadata, images } = data;

  const title = metadata?.comparisonName?.trim() || "Informe de Análisis Comparativo";
  const dateFormatted = formatReportDate(metadata?.createdAt);
  const severity = calculateVisualSeverity(report.differences, report.hasVisibleChanges);

  const initialImgSrc = normalizeImageSource(images?.initialImageBase64 || images?.initialImageUri);
  const finalImgSrc = normalizeImageSource(images?.finalImageBase64 || images?.finalImageUri);
  const shouldRenderImages = opts.includeImages && (initialImgSrc || finalImgSrc);

  const hasObservations = opts.includeObservations && report.observations && report.observations.length > 0;
  const hasUncertainties = opts.includeUncertainties && report.uncertainties && report.uncertainties.length > 0;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} - VisualTrace</title>
  <style>
    @page {
      size: ${opts.pageSize};
      margin: 16mm 14mm 16mm 14mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: ${Colors.surface};
      color: ${Colors.textPrimary};
      font-size: 14px;
      line-height: 1.5;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    /* Encabezado */
    .header {
      border-bottom: 2px solid ${Colors.border};
      padding-bottom: ${Spacing.lg}px;
      margin-bottom: ${Spacing.xl}px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: ${Spacing.sm}px;
    }

    .header-logo-badge {
      background-color: ${Colors.primary};
      color: ${Colors.white};
      font-weight: 800;
      font-size: 16px;
      padding: 4px 10px;
      border-radius: ${Radius.sm}px;
      letter-spacing: 0.5px;
    }

    .header-title-area {
      margin-top: ${Spacing.sm}px;
    }

    .report-title {
      font-size: 24px;
      font-weight: 700;
      color: ${Colors.textPrimary};
      line-height: 1.25;
    }

    .report-meta {
      font-size: 12px;
      color: ${Colors.textSecondary};
      margin-top: ${Spacing.xs}px;
    }

    .header-badge-container {
      text-align: right;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: ${Radius.full}px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-severity {
      background-color: ${severity.backgroundColor};
      color: ${severity.color};
      border: 1px solid ${severity.borderColor};
    }

    /* Estilos de imagenes */
    .images-section {
      margin-bottom: ${Spacing.xl}px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: ${Colors.textPrimary};
      margin-bottom: ${Spacing.md}px;
      display: flex;
      align-items: center;
      gap: ${Spacing.sm}px;
    }

    .images-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: ${Spacing.lg}px;
    }

    .image-card {
      background-color: ${Colors.surfaceSecondary};
      border: 1px solid ${Colors.border};
      border-radius: ${Radius.md}px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .image-card-header {
      padding: ${Spacing.sm}px ${Spacing.md}px;
      font-size: 12px;
      font-weight: 600;
      background-color: ${Colors.surface};
      border-bottom: 1px solid ${Colors.border};
      display: flex;
      justify-content: space-between;
    }

    .image-tag-initial {
      color: ${Colors.initial};
    }

    .image-tag-final {
      color: ${Colors.final};
    }

    .image-frame {
      width: 100%;
      height: 240px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: ${Colors.backgroundStrong};
      overflow: hidden;
    }

    .image-frame img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .image-empty {
      font-size: 12px;
      color: ${Colors.textMuted};
      font-style: italic;
    }

    /* Resumen Ejecutivo */
    .summary-card {
      background-color: ${Colors.primarySoft};
      border: 1px solid ${Colors.borderPrimary};
      border-radius: ${Radius.md}px;
      padding: ${Spacing.lg}px;
      margin-bottom: ${Spacing.xl}px;
      page-break-inside: avoid;
    }

    .summary-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: ${Spacing.sm}px;
    }

    .summary-card-title {
      font-size: 15px;
      font-weight: 700;
      color: ${Colors.primaryDark};
    }

    .summary-text {
      font-size: 14px;
      color: ${Colors.textPrimary};
      line-height: 1.6;
    }

    /* Lista de Diferencias */
    .differences-section {
      margin-bottom: ${Spacing.xl}px;
    }

    .differences-list {
      display: flex;
      flex-direction: column;
      gap: ${Spacing.md}px;
    }

    .difference-item {
      background-color: ${Colors.surface};
      border: 1px solid ${Colors.border};
      border-left: 4px solid ${Colors.primary};
      border-radius: ${Radius.sm}px;
      padding: ${Spacing.md}px ${Spacing.lg}px;
      page-break-inside: avoid;
    }

    .diff-header {
      display: flex;
      align-items: center;
      gap: ${Spacing.sm}px;
      margin-bottom: ${Spacing.xs}px;
    }

    .diff-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: ${Radius.sm}px;
      background-color: ${Colors.backgroundStrong};
      color: ${Colors.textSecondary};
      border: 1px solid ${Colors.border};
    }

    .diff-description {
      font-size: 13px;
      color: ${Colors.textPrimary};
    }

    .no-diff-card {
      background-color: ${Colors.successSoft};
      border: 1px solid ${Colors.success};
      border-radius: ${Radius.md}px;
      padding: ${Spacing.lg}px;
      color: ${Colors.successDark};
      font-weight: 600;
      font-size: 14px;
    }

    /* Observaciones y Limitaciones */
    .extra-section {
      background-color: ${Colors.surfaceSecondary};
      border: 1px solid ${Colors.border};
      border-radius: ${Radius.md}px;
      padding: ${Spacing.lg}px;
      margin-bottom: ${Spacing.lg}px;
      page-break-inside: avoid;
    }

    .extra-section-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: ${Spacing.sm}px;
      color: ${Colors.textPrimary};
    }

    .extra-list {
      list-style-type: none;
      padding-left: 0;
    }

    .extra-list li {
      font-size: 13px;
      color: ${Colors.textSecondary};
      margin-bottom: ${Spacing.xs}px;
      padding-left: ${Spacing.md}px;
      position: relative;
    }

    .extra-list li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: ${Colors.primary};
      font-weight: bold;
    }

    /* Aviso legal y pie de página */
    .disclaimer {
      border-top: 1px solid ${Colors.border};
      padding-top: ${Spacing.md}px;
      margin-top: ${Spacing.xl}px;
      font-size: 11px;
      color: ${Colors.textMuted};
      text-align: center;
      line-height: 1.5;
      page-break-inside: avoid;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Encabezado del Informe -->
    <header class="header">
      <div>
        <div class="header-brand">
          <span class="header-logo-badge">VT</span>
          <strong>VisualTrace Mobile</strong>
        </div>
        <div class="header-title-area">
          <h1 class="report-title">${escapeHtml(title)}</h1>
          <p class="report-meta">Generado el ${escapeHtml(dateFormatted)} • Versión 1.0</p>
        </div>
      </div>
      <div class="header-badge-container">
        <span class="badge badge-severity">${escapeHtml(severity.badgeText)}</span>
        <div class="report-meta" style="margin-top: 4px;">${escapeHtml(severity.statusLabel)}</div>
      </div>
    </header>

    ${
      shouldRenderImages
        ? `<!-- Fotografías Comparativas -->
    <section class="images-section">
      <h2 class="section-title">📷 Fotografías Comparativas</h2>
      <div class="images-grid">
        <div class="image-card">
          <div class="image-card-header">
            <span class="image-tag-initial">● Estado Inicial</span>
            <span>Antes</span>
          </div>
          <div class="image-frame">
            ${
              initialImgSrc
                ? `<img src="${initialImgSrc}" alt="Fotografía estado inicial" />`
                : `<span class="image-empty">Sin imagen inicial</span>`
            }
          </div>
        </div>
        <div class="image-card">
          <div class="image-card-header">
            <span class="image-tag-final">● Estado Final</span>
            <span>Después</span>
          </div>
          <div class="image-frame">
            ${
              finalImgSrc
                ? `<img src="${finalImgSrc}" alt="Fotografía estado final" />`
                : `<span class="image-empty">Sin imagen final</span>`
            }
          </div>
        </div>
      </div>
    </section>`
        : ""
    }

    <!-- Resumen Ejecutivo -->
    <section class="summary-card">
      <div class="summary-card-header">
        <h2 class="summary-card-title">📌 Resumen Ejecutivo</h2>
        <span style="font-size: 12px; font-weight: 600; color: ${Colors.primaryDark};">
          ${report.differences.length} ${report.differences.length === 1 ? "hallazgo" : "hallazgos"}
        </span>
      </div>
      <p class="summary-text">${escapeHtml(report.summary)}</p>
    </section>

    <!-- Desglose de Diferencias -->
    <section class="differences-section">
      <h2 class="section-title">🔍 Desglose de Diferencias Detectadas</h2>
      ${
        report.differences && report.differences.length > 0
          ? `<div class="differences-list">
        ${report.differences
          .map((diff, idx) => {
            const label = CATEGORY_LABELS[diff.category] ?? diff.category;
            return `<div class="difference-item">
              <div class="diff-header">
                <span class="diff-badge">#${idx + 1} • ${escapeHtml(label)}</span>
              </div>
              <div class="diff-description">${escapeHtml(diff.description)}</div>
            </div>`;
          })
          .join("\n")}
      </div>`
          : `<div class="no-diff-card">
        ✓ No se identificaron discrepancias o modificaciones visibles entre ambas tomas.
      </div>`
      }
    </section>

    ${
      hasObservations
        ? `<!-- Observaciones -->
    <section class="extra-section">
      <h3 class="extra-section-title">💡 Observaciones del Contexto Visual</h3>
      <ul class="extra-list">
        ${report.observations.map((obs) => `<li>${escapeHtml(obs)}</li>`).join("\n")}
      </ul>
    </section>`
        : ""
    }

    ${
      hasUncertainties
        ? `<!-- Limitaciones / Factores de Incertidumbre -->
    <section class="extra-section" style="border-left: 4px solid ${Colors.warning};">
      <h3 class="extra-section-title" style="color: ${Colors.warning};">⚠️ Factores de Incertidumbre o Limitaciones</h3>
      <ul class="extra-list">
        ${report.uncertainties.map((unc) => `<li>${escapeHtml(unc)}</li>`).join("\n")}
      </ul>
    </section>`
        : ""
    }

    ${
      opts.includeDisclaimer
        ? `<!-- Aviso de Responsabilidad -->
    <footer class="disclaimer">
      <p>
        <strong>Aviso:</strong> Este informe es una asistencia automatizada generada mediante inteligencia artificial por VisualTrace Mobile.
        La revisión final, validación en sitio e interpretación técnica corresponden exclusivamente al usuario responsable.
      </p>
    </footer>`
        : ""
    }
  </div>
</body>
</html>`;
}
