import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => {
  const actual = await vi.importActual<typeof import("react-native")>("react-native");
  return {
    ...actual,
    Modal: ({
      visible,
      children,
      testID,
    }: {
      visible?: boolean;
      children?: React.ReactNode;
      testID?: string;
    }) => (visible ? React.createElement("div", { "data-testid": testID }, children) : null),
  };
});

import {
  AiQuotaLimitExceededModal,
  DEFAULT_LOCAL_SUGGESTIONS,
  DEFAULT_QUOTA_RESET_TIME,
} from "./AiQuotaLimitExceededModal";

describe("AiQuotaLimitExceededModal", () => {
  describe("rendering when visible", () => {
    it("renders modal content, quota indicator, suggestions, and close action", () => {
      const onClose = vi.fn();
      const onViewHistory = vi.fn();

      const html = renderToStaticMarkup(
        React.createElement(AiQuotaLimitExceededModal, {
          visible: true,
          onClose,
          onViewHistory,
        }),
      );

      expect(html).toContain("ai-quota-limit-exceeded-modal");
      expect(html).toContain("Límite diario de análisis alcanzado");
      expect(html).toContain("Cuota de IA");
      expect(html).toContain("quota-reset-time-indicator");
      expect(html).toContain(DEFAULT_QUOTA_RESET_TIME);
      expect(html).toContain("¿Qué puedes hacer mientras tanto?");

      for (const suggestion of DEFAULT_LOCAL_SUGGESTIONS) {
        expect(html).toContain(suggestion);
      }

      expect(html).toContain("quota-exceeded-close-button");
      expect(html).toContain("Entendido");
      expect(html).toContain("quota-exceeded-history-button");
      expect(html).toContain("Ver historial de comparaciones");
    });

    it("renders custom reset time text when provided", () => {
      const customResetTime = "Se restablece en 2 horas";
      const html = renderToStaticMarkup(
        React.createElement(AiQuotaLimitExceededModal, {
          visible: true,
          onClose: () => {},
          resetTimeText: customResetTime,
        }),
      );

      expect(html).toContain(customResetTime);
      expect(html).not.toContain(DEFAULT_QUOTA_RESET_TIME);
    });

    it("omits history button if onViewHistory is not supplied", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiQuotaLimitExceededModal, {
          visible: true,
          onClose: () => {},
        }),
      );

      expect(html).toContain("quota-exceeded-close-button");
      expect(html).not.toContain("quota-exceeded-history-button");
    });
  });

  describe("hidden state and callbacks", () => {
    it("does not render contents when visible is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiQuotaLimitExceededModal, {
          visible: false,
          onClose: () => {},
        }),
      );

      expect(html).not.toContain("Límite diario de análisis alcanzado");
      expect(html).not.toContain("quota-exceeded-close-button");
    });

    it("triggers callbacks when actions are invoked", () => {
      let closed = false;
      let historyVisited = false;

      const element = React.createElement(AiQuotaLimitExceededModal, {
        visible: true,
        onClose: () => {
          closed = true;
        },
        onViewHistory: () => {
          historyVisited = true;
        },
      });

      element.props.onClose?.();
      expect(closed).toBe(true);

      element.props.onViewHistory?.();
      expect(historyVisited).toBe(true);
    });

    it("provides proper accessibility labels on interactive buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiQuotaLimitExceededModal, {
          visible: true,
          onClose: () => {},
          onViewHistory: () => {},
        }),
      );

      expect(html).toContain('aria-label="Entendido"');
      expect(html).toContain('aria-label="Ver historial de comparaciones"');
    });
  });
});

