import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AiOfflineResilienceBanner,
  DEFAULT_OFFLINE_BANNER_DESCRIPTION,
  DEFAULT_OFFLINE_BANNER_TITLE,
} from "./AiOfflineResilienceBanner";

describe("AiOfflineResilienceBanner", () => {
  describe("rendering and default content", () => {
    it("renders default title, description, badge and retry action button", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiOfflineResilienceBanner, {
          onRetry: () => {},
        }),
      );

      expect(html).toContain("ai-offline-resilience-banner");
      expect(html).toContain(DEFAULT_OFFLINE_BANNER_TITLE);
      expect(html).toContain("Sin conexión a internet para el análisis de IA");
      expect(html).toContain("Offline");
      expect(html).toContain(DEFAULT_OFFLINE_BANNER_DESCRIPTION);
      expect(html).toContain("retry-network-action-button");
      expect(html).toContain("Reintentar");
    });

    it("renders custom title and description when provided", () => {
      const customTitle = "Conexión interrumpida durante el análisis";
      const customDesc = "Por favor comprueba tu red móvil antes de reintentar.";

      const html = renderToStaticMarkup(
        React.createElement(AiOfflineResilienceBanner, {
          title: customTitle,
          description: customDesc,
          onRetry: () => {},
        }),
      );

      expect(html).toContain(customTitle);
      expect(html).toContain(customDesc);
      expect(html).not.toContain(DEFAULT_OFFLINE_BANNER_TITLE);
    });

    it("omits retry button if onRetry callback is not provided", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiOfflineResilienceBanner),
      );

      expect(html).toContain("ai-offline-resilience-banner");
      expect(html).toContain(DEFAULT_OFFLINE_BANNER_TITLE);
      expect(html).not.toContain("retry-network-action-button");
      expect(html).not.toContain("Reintentar");
    });
  });

  describe("states and accessibility", () => {
    it("renders loading indicator and hides retry text when isRetrying is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiOfflineResilienceBanner, {
          isRetrying: true,
          onRetry: () => {},
        }),
      );

      expect(html).toContain("retry-network-action-button");
      expect(html).toContain('role="progressbar"');
      expect(html).not.toContain(">Reintentar<");
    });

    it("includes proper accessibility roles and labels for screen readers", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiOfflineResilienceBanner, {
          onRetry: () => {},
        }),
      );

      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-label="Reintentar conexión"');
    });

    it("supports custom testID when passed as prop", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiOfflineResilienceBanner, {
          testID: "custom-offline-banner",
        }),
      );

      expect(html).toContain("custom-offline-banner");
      expect(html).not.toContain("ai-offline-resilience-banner");
    });
  });
});
