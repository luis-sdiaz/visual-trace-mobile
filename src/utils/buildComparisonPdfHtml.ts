import {
  ComparisonPdfReportData,
  PdfExportOptions,
  resolvePdfExportOptions,
} from "@/types/pdfExport";

export function escapeHtml(unsafeText?: string | null): string {
  if (!unsafeText) return "";
  return unsafeText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatSeverityLabel(severity?: string): { label: string; bg: string; color: string } {
  switch (severity?.toLowerCase()) {
    case "high":
      return { label: "Alta", bg: "#FEE2E2", color: "#991B1B" };
    case "medium":
      return { label: "Media", bg: "#FEF3C7", color: "#92400E" };
    case "low":
    default:
      return { label: "Baja / Informativa", bg: "#E0F2FE", color: "#075985" };
  }
}

export function buildComparisonPdfHtml(
  data: ComparisonPdfReportData,
  options?: Partial<PdfExportOptions>,
): string {
  const opts = resolvePdfExportOptions(options);
  const title = escapeHtml(opts.customTitle || data.title || "Reporte de Comparación Visual");
  const author = escapeHtml(opts.authorName || "VisualTrace User");
  const comparisonId = escapeHtml(data.metadata?.comparisonId || "N/A");
  const appVersion = escapeHtml(data.metadata?.appVersion || "1.0.0");
  const generatedAt = escapeHtml(
    data.metadata?.generatedAt || data.createdAt || new Date().toISOString(),
  );
  const notes = escapeHtml(opts.notes || data.notes || "");
  const aiSummary = escapeHtml(data.aiSummary || "");
  const confidencePercent =
    typeof data.confidenceScore === "number"
      ? Math.round(data.confidenceScore * 100)
      : null;

  const differences = data.differences ?? [];

  const imagesHtml = opts.includeImages
    ? `
      <section class="section">
        <h2 class="section-title">Registro Fotográfico de Comparación</h2>
        <div class="image-grid">
          <div class="image-card">
            <div class="image-badge badge-initial">ANTES (Estado Inicial)</div>
            ${
              data.initialImage?.uri
                ? `<img src="${escapeHtml(data.initialImage.uri)}" alt="Foto Inicial" class="report-image" />`
                : `<div class="image-placeholder">Sin imagen inicial registrada</div>`
            }
            ${
              data.initialImage?.capturedAt
                ? `<div class="image-caption">Captura: ${escapeHtml(data.initialImage.capturedAt)}</div>`
                : ""
            }
          </div>
          <div class="image-card">
            <div class="image-badge badge-final">DESPUÉS (Estado Actual)</div>
            ${
              data.finalImage?.uri
                ? `<img src="${escapeHtml(data.finalImage.uri)}" alt="Foto Final" class="report-image" />`
                : `<div class="image-placeholder">Sin imagen final registrada</div>`
            }
            ${
              data.finalImage?.capturedAt
                ? `<div class="image-caption">Captura: ${escapeHtml(data.finalImage.capturedAt)}</div>`
                : ""
            }
          </div>
        </div>
      </section>
    `
    : "";

  const aiReportHtml =
    opts.includeAiReport && (aiSummary || differences.length > 0)
      ? `
      <section class="section">
        <h2 class="section-title">Análisis de Discrepancias Asistido por IA</h2>
        
        ${
          confidencePercent !== null
            ? `
          <div class="confidence-box">
            <span class="confidence-label">Nivel de Confianza de Inferencia:</span>
            <span class="confidence-value">${confidencePercent}%</span>
          </div>
        `
            : ""
        }

        ${
          aiSummary
            ? `
          <div class="summary-box">
            <h3 class="box-title">Resumen Ejecutivo</h3>
            <p class="summary-text">${aiSummary}</p>
          </div>
        `
            : ""
        }

        ${
          differences.length > 0
            ? `
          <div class="differences-container">
            <h3 class="box-title">Diferencias y Hallazgos Detectados (${differences.length})</h3>
            <table class="differences-table">
              <thead>
                <tr>
                  <th style="width: 15%;">Tipo</th>
                  <th style="width: 18%;">Severidad</th>
                  <th style="width: 25%;">Ubicación</th>
                  <th>Descripción del Cambio</th>
                </tr>
              </thead>
              <tbody>
                ${differences
                  .map((diff) => {
                    const sev = formatSeverityLabel(diff.severity);
                    return `
                    <tr>
                      <td class="type-cell">${escapeHtml(diff.type)}</td>
                      <td>
                        <span class="severity-badge" style="background-color: ${sev.bg}; color: ${sev.color};">
                          ${sev.label}
                        </span>
                      </td>
                      <td>${escapeHtml(diff.location || "General")}</td>
                      <td>${escapeHtml(diff.description)}</td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        `
            : ""
        }
      </section>
    `
      : "";

  const metadataHtml = opts.includeMetadata
    ? `
      <section class="metadata-footer-info">
        <div class="metadata-grid">
          <div><strong>ID Comparación:</strong> ${comparisonId}</div>
          <div><strong>Autor / Operador:</strong> ${author}</div>
          <div><strong>Fecha de Generación:</strong> ${generatedAt}</div>
          <div><strong>Plataforma:</strong> VisualTrace Mobile v${appVersion}</div>
        </div>
      </section>
    `
    : "";

  const notesHtml = notes
    ? `
      <section class="section">
        <h2 class="section-title">Observaciones de Campo</h2>
        <div class="notes-box">
          <p class="notes-text">${notes}</p>
        </div>
      </section>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    @page {
      size: ${opts.pageSize} ${opts.orientation};
      margin: 15mm 15mm 15mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      background-color: #FFFFFF;
      margin: 0;
      padding: 0;
      line-height: 1.5;
      font-size: 13px;
    }
    header.report-header {
      border-bottom: 2px solid #2563EB;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand-title {
      color: #2563EB;
      font-size: 20px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .report-title {
      font-size: 17px;
      font-weight: 700;
      color: #1E293B;
      margin: 6px 0 0 0;
    }
    .header-meta {
      font-size: 11px;
      color: #64748B;
      text-align: right;
    }
    .section {
      margin-bottom: 22px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1E293B;
      border-left: 3px solid #2563EB;
      padding-left: 8px;
      margin: 0 0 12px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .image-grid {
      display: flex;
      gap: 16px;
      margin-bottom: 10px;
    }
    .image-card {
      flex: 1;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      overflow: hidden;
      background: #F8FAFC;
      display: flex;
      flex-direction: column;
    }
    .image-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 6px 10px;
      text-align: center;
      color: #FFFFFF;
    }
    .badge-initial {
      background-color: #475569;
    }
    .badge-final {
      background-color: #2563EB;
    }
    .report-image {
      width: 100%;
      height: 220px;
      object-fit: cover;
      display: block;
    }
    .image-placeholder {
      height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94A3B8;
      font-size: 12px;
      background: #F1F5F9;
      font-style: italic;
    }
    .image-caption {
      font-size: 10px;
      color: #64748B;
      padding: 6px 10px;
      background: #FFFFFF;
      border-top: 1px solid #E2E8F0;
    }
    .confidence-box {
      background-color: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      display: inline-block;
      font-size: 12px;
    }
    .confidence-label {
      color: #1E40AF;
      font-weight: 600;
    }
    .confidence-value {
      color: #1E3A8A;
      font-weight: 800;
      margin-left: 6px;
    }
    .summary-box {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .box-title {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      margin: 0 0 6px 0;
      text-transform: uppercase;
    }
    .summary-text {
      margin: 0;
      font-size: 12px;
      color: #1E293B;
      line-height: 1.6;
    }
    .differences-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 8px;
    }
    .differences-table th {
      background-color: #F1F5F9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border-bottom: 2px solid #CBD5E1;
      font-size: 11px;
    }
    .differences-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
      color: #334155;
    }
    .type-cell {
      font-weight: 600;
      text-transform: capitalize;
    }
    .severity-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
    }
    .notes-box {
      background-color: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 6px;
      padding: 10px 14px;
    }
    .notes-text {
      margin: 0;
      font-size: 12px;
      color: #92400E;
    }
    .metadata-footer-info {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px dashed #CBD5E1;
      font-size: 10px;
      color: #64748B;
    }
    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 16px;
    }
    footer.page-footer {
      margin-top: 20px;
      text-align: center;
      font-size: 10px;
      color: #94A3B8;
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <header class="report-header">
    <div>
      <h1 class="brand-title">VisualTrace</h1>
      <h2 class="report-title">${title}</h2>
    </div>
    <div class="header-meta">
      <div>Fecha: ${generatedAt}</div>
      <div>ID: ${comparisonId}</div>
    </div>
  </header>

  ${imagesHtml}
  ${aiReportHtml}
  ${notesHtml}
  ${metadataHtml}

  <footer class="page-footer">
    VisualTrace Mobile • Documento generado para fines de auditoría y comparación visual técnica.
  </footer>
</body>
</html>`;
}

