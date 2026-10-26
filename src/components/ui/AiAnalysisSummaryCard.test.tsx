import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type {
  GeminiAnalysisReport,
  VisualDifference,
} from "@/contracts/geminiAnalysis";
import type { AnalysisReportRecord } from "@/services/analysisService";
import {
  AiAnalysisSummaryCard,
  calculateVisualSeverity,
} from "./AiAnalysisSummaryCard";

describe("AiAnalysisSummaryCard", () => {
  describe("calculateVisualSeverity", () => {
    it("returns 'Sin cambios' when there are no differences or hasVisibleChanges is false", () => {
      const severityEmpty = calculateVisualSeverity([]);
      expect(severityEmpty.level).toBe("none");
      expect(severityEmpty.badgeText).toBe("Sin cambios");
      expect(severityEmpty.statusLabel).toBe("Sin alteraciones");

      const severityNotVisible = calculateVisualSeverity(
        [{ category: "other", description: "Insignificante" }],
        false,
      );
      expect(severityNotVisible.level).toBe("none");
      expect(severityNotVisible.badgeText).toBe("Sin cambios");
    });

    it("returns 'Menor' for 1 or 2 low-impact differences", () => {
      const singleAppearance: VisualDifference[] = [
        { category: "appearance", description: "Tono ligeramente más cálido" },
      ];
      const severitySingle = calculateVisualSeverity(singleAppearance);
      expect(severitySingle.level).toBe("minor");
      expect(severitySingle.badgeText).toBe("Menor");
      expect(severitySingle.statusLabel).toBe("Cambios leves");

      const twoMinor: VisualDifference[] = [
        { category: "appearance", description: "Brillo" },
        { category: "moved", description: "Movimiento de silla" },
      ];
      const severityTwo = calculateVisualSeverity(twoMinor);
      expect(severityTwo.level).toBe("minor");
      expect(severityTwo.badgeText).toBe("Menor");
    });

    it("returns 'Moderado' for 3 to 4 standard differences or moderate score", () => {
      const moderateDiffs: VisualDifference[] = [
        { category: "added", description: "Nuevo cuadro en la pared" },
        { category: "added", description: "Lámpara de pie" },
        { category: "modified", description: "Pintura de pared" },
      ];
      const severity = calculateVisualSeverity(moderateDiffs);
      expect(severity.level).toBe("moderate");
      expect(severity.badgeText).toBe("Moderado");
      expect(severity.statusLabel).toBe("Cambios moderados");
    });

    it("returns 'Significativo' for 5+ differences or high structural changes", () => {
      const fiveDiffs: VisualDifference[] = [
        { category: "added", description: "Diferencia 1" },
        { category: "added", description: "Diferencia 2" },
        { category: "modified", description: "Diferencia 3" },
        { category: "moved", description: "Diferencia 4" },
        { category: "appearance", description: "Diferencia 5" },
      ];
      const severityFive = calculateVisualSeverity(fiveDiffs);
      expect(severityFive.level).toBe("significant");
      expect(severityFive.badgeText).toBe("Significativo");
      expect(severityFive.statusLabel).toBe("Cambios relevantes");

      // Alto impacto por remociones y adiciones (score >= 8 con 3 items)
      const highImpact: VisualDifference[] = [
        { category: "removed", description: "Muro demolido" },
        { category: "removed", description: "Puerta retirada" },
        { category: "added", description: "Viga instalada" },
      ];
      const severityHigh = calculateVisualSeverity(highImpact);
      expect(severityHigh.level).toBe("significant");
      expect(severityHigh.badgeText).toBe("Significativo");
    });
  });

  describe("rendering", () => {
    it("renders null safely when report is null or undefined", () => {
      const htmlNull = renderToStaticMarkup(
        React.createElement(AiAnalysisSummaryCard, { report: null }),
      );
      expect(htmlNull).toBe("");

      const htmlUndefined = renderToStaticMarkup(
        React.createElement(AiAnalysisSummaryCard, { report: undefined }),
      );
      expect(htmlUndefined).toBe("");
    });

    it("renders summary card when passed GeminiAnalysisReport directly", () => {
      const report: GeminiAnalysisReport = {
        contractVersion: "1.0",
        hasVisibleChanges: true,
        summary: "Cambio observado en el espacio.",
        differences: [
          { category: "added", description: "Nuevo cuadro colgado." },
        ],
        observations: ["Buena iluminación."],
        uncertainties: [],
      };

      const html = renderToStaticMarkup(
        React.createElement(AiAnalysisSummaryCard, { report }),
      );

      expect(html).toContain("ai-analysis-summary-card");
      expect(html).toContain("EVALUACIÓN DE IMPACTO");
      expect(html).toContain("Menor");
      expect(html).toContain("total-findings-indicator");
      expect(html).toContain("comparison-status-indicator");
      expect(html).toContain("affected-categories-indicator");
      expect(html).toContain("1");
      expect(html).toContain("Hallazgo");
      expect(html).toContain("Cambios leves");
    });

    it("renders summary card when passed AnalysisReportRecord record wrapper", () => {
      const record: AnalysisReportRecord = {
        id: "rep-1",
        comparison_id: "cmp-1",
        user_id: "usr-1",
        model: "gemini-1.5-flash",
        contract_version: "1.0",
        initial_image_path: "usr-1/cmp-1/initial.jpg",
        final_image_path: "usr-1/cmp-1/final.jpg",
        created_at: new Date().toISOString(),
        result: {
          contractVersion: "1.0",
          hasVisibleChanges: true,
          summary: "Tres modificaciones visibles encontradas.",
          differences: [
            { category: "added", description: "Elemento A" },
            { category: "added", description: "Elemento B" },
            { category: "modified", description: "Elemento C" },
          ],
          observations: [],
          uncertainties: [],
        },
      };

      const html = renderToStaticMarkup(
        React.createElement(AiAnalysisSummaryCard, { report: record }),
      );

      expect(html).toContain("ai-analysis-summary-card");
      expect(html).toContain("Moderado");
      expect(html).toContain("3");
      expect(html).toContain("Hallazgos");
      expect(html).toContain("Cambios moderados");
      expect(html).toContain("2"); // 2 unique categories: added, modified
      expect(html).toContain("Categorías");
    });

    it("renders 'Sin cambios' badge when there are 0 findings", () => {
      const noChangesReport: GeminiAnalysisReport = {
        contractVersion: "1.0",
        hasVisibleChanges: false,
        summary: "Sin cambios visibles entre ambas fotos.",
        differences: [],
        observations: [],
        uncertainties: [],
      };

      const html = renderToStaticMarkup(
        React.createElement(AiAnalysisSummaryCard, {
          report: noChangesReport,
        }),
      );

      expect(html).toContain("Sin cambios");
      expect(html).toContain("Sin alteraciones");
      expect(html).toContain("0");
    });
  });
});

