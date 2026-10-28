import { describe, expect, it } from "vitest";

import { ComparisonPdfReportData } from "@/types/pdfExport";

import {
  buildComparisonPdfHtml,
  escapeHtml,
  formatSeverityLabel,
} from "../buildComparisonPdfHtml";

describe("buildComparisonPdfHtml pure template builder", () => {
  it("escapes unsafe HTML characters to prevent XSS injection in PDF rendering", () => {
    const raw = `<script>alert("hack & run")</script> 'test'`;
    const escaped = escapeHtml(raw);

    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("&lt;script&gt;");
    expect(escaped).toContain("&quot;hack &amp; run&quot;");
    expect(escaped).toContain("&#039;test&#039;");
  });

  it("handles null or empty strings gracefully in escapeHtml", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml("")).toBe("");
  });

  it("returns proper color tokens and labels for all severity levels", () => {
    expect(formatSeverityLabel("high").label).toBe("Alta");
    expect(formatSeverityLabel("high").bg).toBe("#FEE2E2");

    expect(formatSeverityLabel("medium").label).toBe("Media");
    expect(formatSeverityLabel("medium").bg).toBe("#FEF3C7");

    expect(formatSeverityLabel("low").label).toBe("Baja / Informativa");
    expect(formatSeverityLabel(undefined).label).toBe("Baja / Informativa");
  });

  it("renders a comprehensive HTML document with images, AI summary, and table of differences", () => {
    const data: ComparisonPdfReportData = {
      title: "Inspección de Muro Perimetral",
      createdAt: "2026-10-27T14:00:00Z",
      initialImage: {
        uri: "https://example.com/before.jpg",
        label: "Estado Inicial",
        capturedAt: "2026-10-20T10:00:00Z",
      },
      finalImage: {
        uri: "https://example.com/after.jpg",
        label: "Estado Actual",
        capturedAt: "2026-10-27T10:00:00Z",
      },
      aiSummary: "Fisura vertical detectada en la sección norte.",
      confidenceScore: 0.95,
      differences: [
        {
          type: "added",
          description: "Nueva grieta de 15cm de longitud.",
          location: "Sector Norte - Muro 2",
          severity: "high",
        },
      ],
      metadata: {
        comparisonId: "comp-9988",
        appVersion: "1.2.0",
        appName: "VisualTrace",
        totalDifferencesCount: 1,
        generatedAt: "2026-10-27T14:05:00Z",
      },
      notes: "Se recomienda sellado inmediato con resina epóxica.",
    };

    const html = buildComparisonPdfHtml(data, {
      pageSize: "A4",
      orientation: "portrait",
      authorName: "Auditor Técnico",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>Inspección de Muro Perimetral</title>");
    expect(html).toContain("size: A4 portrait;");
    expect(html).toContain("Auditor Técnico");
    expect(html).toContain("comp-9988");
    expect(html).toContain("https://example.com/before.jpg");
    expect(html).toContain("https://example.com/after.jpg");
    expect(html).toContain("95%");
    expect(html).toContain("Fisura vertical detectada en la sección norte.");
    expect(html).toContain("Nueva grieta de 15cm de longitud.");
    expect(html).toContain("Sector Norte - Muro 2");
    expect(html).toContain("Alta");
    expect(html).toContain("Se recomienda sellado inmediato con resina epóxica.");
  });

  it("conditionally omits images when includeImages is set to false", () => {
    const data: ComparisonPdfReportData = {
      title: "Comparación sin imágenes",
      createdAt: "2026-10-27T14:00:00Z",
      initialImage: { uri: "https://example.com/1.jpg", label: "1" },
      finalImage: { uri: "https://example.com/2.jpg", label: "2" },
      aiSummary: "Resumen sin fotos en el reporte",
    };

    const html = buildComparisonPdfHtml(data, { includeImages: false });

    expect(html).not.toContain("Registro Fotográfico de Comparación");
    expect(html).not.toContain("https://example.com/1.jpg");
    expect(html).toContain("Resumen sin fotos en el reporte");
  });

  it("conditionally omits AI analysis section when includeAiReport is false", () => {
    const data: ComparisonPdfReportData = {
      title: "Solo fotos",
      createdAt: "2026-10-27T14:00:00Z",
      aiSummary: "Resumen de IA no debe aparecer",
      differences: [{ type: "modified", description: "Diferencia excluida" }],
    };

    const html = buildComparisonPdfHtml(data, { includeAiReport: false });

    expect(html).not.toContain("Análisis de Discrepancias Asistido por IA");
    expect(html).not.toContain("Resumen de IA no debe aparecer");
    expect(html).not.toContain("Diferencia excluida");
  });

  it("renders placeholders when image URIs are missing", () => {
    const data: ComparisonPdfReportData = {
      title: "Prueba sin URIs",
      createdAt: "2026-10-27T14:00:00Z",
      initialImage: null,
      finalImage: null,
    };

    const html = buildComparisonPdfHtml(data, { includeImages: true });

    expect(html).toContain("Sin imagen inicial registrada");
    expect(html).toContain("Sin imagen final registrada");
  });
});

