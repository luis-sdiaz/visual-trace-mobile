import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  AiQuotaAlertBanner,
  getAiQuotaFeedback,
} from "../AiQuotaAlertBanner";

describe("AiQuotaAlertBanner Component", () => {
  it("renders with default quota feedback, title and dismiss button", () => {
    const html = renderToStaticMarkup(
      React.createElement(AiQuotaAlertBanner, {
        scope: "global_minute",
      }),
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Límite por minuto alcanzado");
    expect(html).toContain("Espera 1 min");
    expect(html).toContain('data-testid="ai-quota-dismiss-button"');
    expect(html).toContain("✓ Tus fotografías del estado inicial y final permanecen guardadas e intactas.");
  });

  it("renders retry button when onRetry callback is provided", () => {
    const htmlWithRetry = renderToStaticMarkup(
      React.createElement(AiQuotaAlertBanner, {
        scope: "global_minute",
        onRetry: vi.fn(),
      }),
    );

    expect(htmlWithRetry).toContain('data-testid="ai-quota-retry-button"');
    expect(htmlWithRetry).toContain("Reintentar análisis ahora");
  });

  it("handles dismiss state by not rendering when isDismissed is true", () => {
    const onDismissMock = vi.fn();
    const htmlDismissed = renderToStaticMarkup(
      React.createElement(AiQuotaAlertBanner, {
        scope: "user_day",
        isDismissed: true,
        onDismiss: onDismissMock,
      }),
    );

    expect(htmlDismissed).toBe("");
  });

  it("maps various quota scopes correctly using getAiQuotaFeedback", () => {
    const minute = getAiQuotaFeedback("global_minute");
    expect(minute.isMinuteLimit).toBe(true);

    const userDay = getAiQuotaFeedback("user_day");
    expect(userDay.isMinuteLimit).toBe(false);
    expect(userDay.title).toContain("Cuota diaria");

    const fallback = getAiQuotaFeedback("unknown_scope");
    expect(fallback.scope).toBe("usage_limit_reached");
  });
});
