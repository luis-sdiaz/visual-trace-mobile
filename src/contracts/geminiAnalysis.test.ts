import { describe, expect, it } from "vitest";

import {
  GEMINI_ANALYSIS_CONTRACT_VERSION,
  GEMINI_ANALYSIS_LIMITS,
  isGeminiAnalysisReport,
  parseGeminiAnalysisReport,
} from "./geminiAnalysis";

const validReport = {
  contractVersion: GEMINI_ANALYSIS_CONTRACT_VERSION,
  hasVisibleChanges: true,
  summary: "Se observa una modificación visible.",
  differences: [
    { category: "modified", description: "La superficie cambió de color." },
  ],
  observations: ["El encuadre es similar."],
  uncertainties: ["La iluminación es más intensa en la imagen final."],
};

describe("Gemini analysis contract", () => {
  it("accepts a complete structured report", () => {
    expect(isGeminiAnalysisReport(validReport)).toBe(true);
    expect(parseGeminiAnalysisReport(validReport)).toEqual(validReport);
  });

  it("accepts a report with no visible changes", () => {
    expect(
      isGeminiAnalysisReport({
        ...validReport,
        hasVisibleChanges: false,
        summary: "No se observan cambios visibles.",
        differences: [],
        observations: [],
        uncertainties: [],
      }),
    ).toBe(true);
  });

  it("rejects differences when the report says there are no changes", () => {
    expect(
      isGeminiAnalysisReport({ ...validReport, hasVisibleChanges: false }),
    ).toBe(false);
  });

  it("rejects unknown categories and additional properties", () => {
    expect(
      isGeminiAnalysisReport({
        ...validReport,
        differences: [{ category: "damage", description: "Cambio." }],
      }),
    ).toBe(false);
    expect(isGeminiAnalysisReport({ ...validReport, provider: "gemini" })).toBe(
      false,
    );
  });

  it("enforces collection and text limits", () => {
    expect(
      isGeminiAnalysisReport({
        ...validReport,
        observations: Array.from(
          { length: GEMINI_ANALYSIS_LIMITS.maxObservations + 1 },
          () => "Observación",
        ),
      }),
    ).toBe(false);
    expect(
      isGeminiAnalysisReport({
        ...validReport,
        summary: "a".repeat(GEMINI_ANALYSIS_LIMITS.summaryMaxLength + 1),
      }),
    ).toBe(false);
  });

  it("throws when parsing invalid input", () => {
    expect(() => parseGeminiAnalysisReport(null)).toThrow(
      "Invalid Gemini analysis report.",
    );
  });
});
