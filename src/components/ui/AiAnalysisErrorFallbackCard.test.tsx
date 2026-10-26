import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AiAnalysisErrorFallbackCard,
  DEFAULT_ERROR_FALLBACK_TITLE,
  DEFAULT_ERROR_SUGGESTIONS,
} from "./AiAnalysisErrorFallbackCard";

describe("AiAnalysisErrorFallbackCard", () => {
  describe("default rendering", () => {
    it("renders default title, badge, suggestions, and retry button", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiAnalysisErrorFallbackCard, {
          onRetry: () => {},
        }),
      );

      expect(html).toContain("ai-analysis-error-fallback-card");
      expect(html).toContain(DEFAULT_ERROR_FALLBACK_TITLE);
      expect(html).toContain("Ocurrió un inconveniente al procesar el análisis");
      expect(html).toContain("Error de IA");
      expect(html).toContain("Sugerencias de solución:");
      for (const suggestion of DEFAULT_ERROR_SUGGESTIONS) {
        expect(html).toContain(suggestion);
      }
      expect(html).toContain("retry-analysis-button");
      expect(html).toContain("Reintentar análisis");
    });

    it("renders custom title and custom suggestions correctly", () => {
      const customTitle = "Error en el servidor de inferencia";
      const customSuggestions = [
        "Revisa la cuota de tu cuenta.",
        "Contacta al administrador del sistema.",
      ];

      const html = renderToStaticMarkup(
        React.createElement(AiAnalysisErrorFallbackCard, {
          title: customTitle,
          suggestions: customSuggestions,
          onRetry: () => {},
        }),
      );

      expect(html).toContain(customTitle);
      expect(html).toContain("Revisa la cuota de tu cuenta.");
      expect(html).toContain("Contacta al administrador del sistema.");
      expect(html).not.toContain(DEFAULT_ERROR_SUGGESTIONS[0]);
    });

    it("omits retry button when onRetry callback is not provided", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiAnalysisErrorFallbackCard),
      );

      expect(html).toContain("ai-analysis-error-fallback-card");
      expect(html).not.toContain("retry-analysis-button");
    });
  });

  describe("technical error details collapsible", () => {
    it("does not render details toggle button when errorMessage is not provided", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiAnalysisErrorFallbackCard, {
          onRetry: () => {},
        }),
      );

      expect(html).not.toContain("toggle-error-details-button");
      expect(html).not.toContain("error-technical-details");
    });

    it("renders collapsed details toggle button by default when errorMessage is present", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiAnalysisErrorFallbackCard, {
          errorMessage: "Internal server error 500: model_unavailable",
          onRetry: () => {},
        }),
      );

      expect(html).toContain("toggle-error-details-button");
      expect(html).toContain("Ver detalles técnicos ▾");
      expect(html).not.toContain("error-technical-details");
      expect(html).not.toContain("Internal server error 500: model_unavailable");
    });

    it("renders expanded technical details panel when initialShowDetails is true", () => {
      const technicalMsg = "Edge Function returned 502 Bad Gateway";
      const html = renderToStaticMarkup(
        React.createElement(AiAnalysisErrorFallbackCard, {
          errorMessage: technicalMsg,
          initialShowDetails: true,
          onRetry: () => {},
        }),
      );

      expect(html).toContain("toggle-error-details-button");
      expect(html).toContain("Ocultar detalles técnicos ▴");
      expect(html).toContain("error-technical-details");
      expect(html).toContain(technicalMsg);
      expect(html).toContain("Mensaje del sistema:");
    });
  });

  describe("states, accessibility, and callbacks", () => {
    it("renders progressbar indicator and hides button label when isRetrying is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiAnalysisErrorFallbackCard, {
          isRetrying: true,
          onRetry: () => {},
        }),
      );

      expect(html).toContain("retry-analysis-button");
      expect(html).toContain('role="progressbar"');
      expect(html).not.toContain(">Reintentar análisis<");
    });

    it("includes proper accessibility roles and labels for screen readers", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiAnalysisErrorFallbackCard, {
          errorMessage: "Some error",
          onRetry: () => {},
        }),
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-label="Reintentar análisis"');
      expect(html).toContain('aria-label="Ver detalles técnicos"');
    });

    it("triggers onRetry callback when button is invoked", () => {
      let retried = false;
      const element = React.createElement(AiAnalysisErrorFallbackCard, {
        onRetry: () => {
          retried = true;
        },
      });

      element.props.onRetry?.();
      expect(retried).toBe(true);
    });
  });
});

