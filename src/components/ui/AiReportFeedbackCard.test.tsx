import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import {
  AiReportFeedbackCard,
  clearSessionFeedback,
  getSessionFeedback,
  setSessionFeedback,
} from "./AiReportFeedbackCard";

describe("AiReportFeedbackCard", () => {
  beforeEach(() => {
    clearSessionFeedback();
  });

  describe("session storage persistence", () => {
    it("stores and retrieves feedback by comparisonId", () => {
      expect(getSessionFeedback("cmp-100")).toBeNull();

      setSessionFeedback("cmp-100", "useful");
      expect(getSessionFeedback("cmp-100")).toBe("useful");

      setSessionFeedback("cmp-100", "not_useful");
      expect(getSessionFeedback("cmp-100")).toBe("not_useful");
    });

    it("clears session feedback cache cleanly", () => {
      setSessionFeedback("cmp-1", "useful");
      setSessionFeedback("cmp-2", "not_useful");

      clearSessionFeedback();

      expect(getSessionFeedback("cmp-1")).toBeNull();
      expect(getSessionFeedback("cmp-2")).toBeNull();
    });
  });

  describe("initial rendering", () => {
    it("renders the feedback prompt question and both action buttons by default", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiReportFeedbackCard, { comparisonId: "cmp-101" }),
      );

      // Question and description
      expect(html).toContain("¿Te resultó útil este análisis?");
      expect(html).toContain(
        "Tu retroalimentación nos ayuda a seguir mejorando la precisión del modelo.",
      );

      // Action buttons
      expect(html).toContain("Útil");
      expect(html).toContain("No útil");
      expect(html).toContain("feedback-useful-button");
      expect(html).toContain("feedback-not-useful-button");

      // Thank you message should not be visible before interaction
      expect(html).not.toContain("¡Gracias por tu retroalimentación!");
      expect(html).not.toContain("feedback-thank-you-message");
    });

    it("renders thank-you confirmation when initialFeedback is useful", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiReportFeedbackCard, {
          initialFeedback: "useful",
        }),
      );

      expect(html).toContain("¿Te resultó útil este análisis?");
      expect(html).toContain("feedback-useful-button");
      expect(html).toContain("feedback-not-useful-button");
      expect(html).toContain("¡Gracias por tu retroalimentación!");
      expect(html).toContain("feedback-thank-you-message");
    });

    it("renders thank-you confirmation when initialFeedback is not_useful", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiReportFeedbackCard, {
          initialFeedback: "not_useful",
        }),
      );

      expect(html).toContain("¿Te resultó útil este análisis?");
      expect(html).toContain("feedback-useful-button");
      expect(html).toContain("feedback-not-useful-button");
      expect(html).toContain("¡Gracias por tu retroalimentación!");
      expect(html).toContain("feedback-thank-you-message");
    });

    it("restores feedback from session cache if comparisonId was previously rated", () => {
      setSessionFeedback("cmp-cached", "useful");

      const html = renderToStaticMarkup(
        React.createElement(AiReportFeedbackCard, {
          comparisonId: "cmp-cached",
        }),
      );

      expect(html).toContain("¡Gracias por tu retroalimentación!");
      expect(html).toContain("feedback-thank-you-message");
    });
  });

  describe("callbacks and accessibility", () => {
    it("exports valid component function and types", () => {
      expect(typeof AiReportFeedbackCard).toBe("function");
    });

    it("renders accessibility labels and hints properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiReportFeedbackCard, {
          comparisonId: "cmp-a11y",
        }),
      );

      expect(html).toContain('aria-label="Útil"');
      expect(html).toContain('aria-label="No útil"');
      expect(html).toContain("ai-report-feedback-card");
    });
  });
});

