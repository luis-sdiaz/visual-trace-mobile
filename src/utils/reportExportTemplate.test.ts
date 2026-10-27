import { describe, expect, it } from "vitest";

import { GEMINI_ANALYSIS_CONTRACT_VERSION } from "@/contracts/geminiAnalysis";
import type { ExportReportData } from "@/contracts/reportExport";
import {
  escapeHtml,
  formatReportDate,
  generateReportHtml,
  normalizeImageSource,
} from "./reportExportTemplate";

const mockReportData: ExportReportData = {
  metadata: {
    comparisonId: "comp-999",
    comparisonName: "Grieta en Columna A-3",
    createdAt: "2026-10-26T15:30:00.000Z",
  },
  images: {
    initialImageBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    finalImageUri: "https://example.com/final.jpg",
  },
  report: {
    contractVersion: GEMINI_ANALYSIS_CONTRACT_VERSION,
    hasVisibleChanges: true,
    summary: "Se detectó ensanchamiento de fisura longitudinal.",
    differences: [
      {
        category: "modified",
        description: "Fisura con mayor apertura en la base.",
      },
      {
        category: "added",
        description: "Desprendimiento superficial de pintura.",
      },
    ],
    observations: ["Luz natural uniforme en ambas capturas."],
    uncertainties: ["Leve variación de ángulo entre tomas."],
  },
};

describe("reportExportTemplate", () => {
  describe("escapeHtml", () => {
    it("escapes special HTML characters properly", () => {
      const dirty = `<script>alert("xss") & test 'quote'</script>`;
      const clean = escapeHtml(dirty);
      expect(clean).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;) &amp; test &#039;quote&#039;&lt;/script&gt;",
      );
    });

    it("handles null and undefined gracefully", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
      expect(escapeHtml("")).toBe("");
    });
  });

  describe("formatReportDate", () => {
    it("formats valid ISO date string to Spanish readable format", () => {
      const formatted = formatReportDate("2026-10-26T15:30:00.000Z");
      expect(formatted).toContain("2026");
      expect(formatted).toMatch(/octubre/i);
    });

    it("falls back gracefully for invalid date strings", () => {
      expect(formatReportDate("fecha-invalida")).toBe("fecha-invalida");
    });
  });

  describe("normalizeImageSource", () => {
    it("returns as-is for data URI, http, https and file schemes", () => {
      expect(normalizeImageSource("data:image/png;base64,ABC")).toBe(
        "data:image/png;base64,ABC",
      );
      expect(normalizeImageSource("https://cloud.com/img.jpg")).toBe(
        "https://cloud.com/img.jpg",
      );
      expect(normalizeImageSource("file:///path/to/img.png")).toBe(
        "file:///path/to/img.png",
      );
    });

    it("prepends data:image/jpeg;base64, to raw base64 string", () => {
      expect(normalizeImageSource("iVBORw0KGgoAAAANSUhEUgAA")).toBe(
        "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAA",
      );
    });

    it("returns null for empty, null or undefined input", () => {
      expect(normalizeImageSource(null)).toBeNull();
      expect(normalizeImageSource(undefined)).toBeNull();
      expect(normalizeImageSource("   ")).toBeNull();
    });
  });

  describe("generateReportHtml", () => {
    it("generates a complete HTML report with title, badges, summary and differences", () => {
      const html = generateReportHtml(mockReportData);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Grieta en Columna A-3");
      expect(html).toContain("VisualTrace Mobile");
      expect(html).toContain("Se detectó ensanchamiento de fisura longitudinal.");
      expect(html).toContain("Fisura con mayor apertura en la base.");
      expect(html).toContain("Desprendimiento superficial de pintura.");
      expect(html).toContain("Modificación");
      expect(html).toContain("Elemento añadido");
      expect(html).toContain("Luz natural uniforme en ambas capturas.");
      expect(html).toContain("Leve variación de ángulo entre tomas.");
      expect(html).toContain("Fotografías Comparativas");
      expect(html).toContain("data:image/jpeg;base64,/9j/4AAQSkZJRg==");
      expect(html).toContain("https://example.com/final.jpg");
      expect(html).toContain("Aviso:</strong> Este informe es una asistencia automatizada");
    });

    it("supports reports with no visible changes", () => {
      const noChangeData: ExportReportData = {
        ...mockReportData,
        report: {
          ...mockReportData.report,
          hasVisibleChanges: false,
          differences: [],
          summary: "Sin modificaciones visibles.",
        },
      };

      const html = generateReportHtml(noChangeData);
      expect(html).toContain("Sin cambios");
      expect(html).toContain("No se identificaron discrepancias");
    });

    it("respects options to omit images, observations, uncertainties or disclaimer", () => {
      const html = generateReportHtml(mockReportData, {
        includeImages: false,
        includeObservations: false,
        includeUncertainties: false,
        includeDisclaimer: false,
      });

      expect(html).not.toContain("📷 Fotografías Comparativas");
      expect(html).not.toContain("💡 Observaciones del Contexto Visual");
      expect(html).not.toContain("⚠️ Factores de Incertidumbre");
      expect(html).not.toContain("Aviso:</strong> Este informe es una asistencia");
    });

    it("safely sanitizes user provided text against XSS", () => {
      const xssData: ExportReportData = {
        metadata: {
          comparisonName: `<script>alert('xss')</script>`,
        },
        report: {
          contractVersion: GEMINI_ANALYSIS_CONTRACT_VERSION,
          hasVisibleChanges: true,
          summary: `<b>Injected</b> & "quoted"`,
          differences: [
            {
              category: "other",
              description: `<img src="x" onerror="alert(1)" />`,
            },
          ],
          observations: [`<iframe src="malicious"></iframe>`],
          uncertainties: [],
        },
      };

      const html = generateReportHtml(xssData);
      expect(html).not.toContain("<script>alert('xss')</script>");
      expect(html).toContain("&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;");
      expect(html).toContain("&lt;b&gt;Injected&lt;/b&gt; &amp; &quot;quoted&quot;");
      expect(html).toContain("&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot; /&gt;");
      expect(html).toContain("&lt;iframe src=&quot;malicious&quot;&gt;&lt;/iframe&gt;");
    });
  });
});
