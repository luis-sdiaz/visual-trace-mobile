import { describe, expect, it, vi } from "vitest";
import * as Clipboard from "expo-clipboard";
import type { GeminiAnalysisReport } from "@/contracts/geminiAnalysis";
import {
  copyReportToClipboard,
  formatReportForClipboard,
} from "./reportExport";

vi.mock("expo-clipboard", () => ({
  setStringAsync: vi.fn(),
}));

describe("reportExport", () => {
  const sampleReport: GeminiAnalysisReport = {
    contractVersion: "1.0",
    hasVisibleChanges: true,
    summary: "Se detectó que la pared principal fue pintada y se instaló una lámpara.",
    differences: [
      {
        category: "added",
        description: "Se instaló una nueva lámpara de pared en el lado derecho.",
      },
      {
        category: "modified",
        description: "El color del muro cambió de blanco a beige suave.",
      },
    ],
    observations: [
      "La iluminación general de la habitación ha mejorado notablemente.",
    ],
    uncertainties: [
      "La esquina izquierda está oculta por sombra en la segunda fotografía.",
    ],
  };

  describe("formatReportForClipboard", () => {
    it("formats a complete report with comparison name and all sections", () => {
      const formatted = formatReportForClipboard(sampleReport, {
        comparisonName: "Remodelación Sala Principal",
      });

      expect(formatted).toContain("INFORME DE ANÁLISIS COMPARATIVO — VISUALTRACE");
      expect(formatted).toContain("Comparación: Remodelación Sala Principal");
      expect(formatted).toContain("📌 RESUMEN");
      expect(formatted).toContain(sampleReport.summary);
      expect(formatted).toContain("🔍 DIFERENCIAS DETECTADAS");
      expect(formatted).toContain("1. [Elemento añadido] Se instaló una nueva lámpara de pared en el lado derecho.");
      expect(formatted).toContain("2. [Modificación] El color del muro cambió de blanco a beige suave.");
      expect(formatted).toContain("💡 OBSERVACIONES");
      expect(formatted).toContain("• La iluminación general de la habitación ha mejorado notablemente.");
      expect(formatted).toContain("⚠️ LIMITACIONES");
      expect(formatted).toContain("• La esquina izquierda está oculta por sombra en la segunda fotografía.");
      expect(formatted).toContain("La verificación final corresponde al usuario.");
    });

    it("formats a report without comparison name", () => {
      const formatted = formatReportForClipboard(sampleReport);

      expect(formatted).not.toContain("Comparación:");
      expect(formatted).toContain("📌 RESUMEN");
    });

    it("handles reports with no differences gracefully", () => {
      const emptyReport: GeminiAnalysisReport = {
        contractVersion: "1.0",
        hasVisibleChanges: false,
        summary: "No se aprecian diferencias significativas.",
        differences: [],
        observations: [],
        uncertainties: [],
      };

      const formatted = formatReportForClipboard(emptyReport);

      expect(formatted).toContain("No se identificaron cambios visibles entre las imágenes.");
      expect(formatted).not.toContain("💡 OBSERVACIONES");
      expect(formatted).not.toContain("⚠️ LIMITACIONES");
    });
  });

  describe("copyReportToClipboard", () => {
    it("calls Clipboard.setStringAsync with formatted text and returns true on success", async () => {
      const setStringAsyncMock = vi
        .mocked(Clipboard.setStringAsync)
        .mockResolvedValueOnce(true);

      const success = await copyReportToClipboard(sampleReport, {
        comparisonName: "Sala",
      });

      expect(success).toBe(true);
      expect(setStringAsyncMock).toHaveBeenCalledTimes(1);
      const passedArg = setStringAsyncMock.mock.calls[0][0];
      expect(passedArg).toContain("Comparación: Sala");
      expect(passedArg).toContain(sampleReport.summary);
    });

    it("returns false without throwing when Clipboard.setStringAsync fails", async () => {
      vi.mocked(Clipboard.setStringAsync).mockRejectedValueOnce(
        new Error("Clipboard permission denied"),
      );

      const success = await copyReportToClipboard(sampleReport);

      expect(success).toBe(false);
    });
  });
});

