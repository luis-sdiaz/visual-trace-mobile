import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  AiQuotaAlertBanner,
  getAiQuotaFeedback,
} from "@/components/ui/AiQuotaAlertBanner";

describe("getAiQuotaFeedback", () => {
  it("maps global_minute correctly", () => {
    const feedback = getAiQuotaFeedback("global_minute");
    expect(feedback.scope).toBe("global_minute");
    expect(feedback.title).toBe("Límite por minuto alcanzado");
    expect(feedback.badge).toBe("Espera 1 min");
    expect(feedback.isMinuteLimit).toBe(true);
    expect(feedback.description).toContain("1 minuto");
  });

  it("maps global_day correctly", () => {
    const feedback = getAiQuotaFeedback("global_day");
    expect(feedback.scope).toBe("global_day");
    expect(feedback.title).toBe("Capacidad diaria del sistema agotada");
    expect(feedback.badge).toBe("Límite global diario");
    expect(feedback.isMinuteLimit).toBe(false);
  });

  it("maps user_day correctly", () => {
    const feedback = getAiQuotaFeedback("user_day");
    expect(feedback.scope).toBe("user_day");
    expect(feedback.title).toBe("Cuota diaria de usuario completada");
    expect(feedback.badge).toBe("Límite diario alcanzado");
    expect(feedback.isMinuteLimit).toBe(false);
  });

  it("maps comparison_day correctly", () => {
    const feedback = getAiQuotaFeedback("comparison_day");
    expect(feedback.scope).toBe("comparison_day");
    expect(feedback.title).toBe("Límite diario en esta comparación");
    expect(feedback.badge).toBe("Límite en esta comparación");
    expect(feedback.isMinuteLimit).toBe(false);
  });

  it("maps provider_quota_exceeded correctly", () => {
    const feedback = getAiQuotaFeedback("provider_quota_exceeded");
    expect(feedback.scope).toBe("provider_quota_exceeded");
    expect(feedback.title).toBe("Servicio de IA temporalmente saturado");
    expect(feedback.badge).toBe("Gemini ocupado");
    expect(feedback.isMinuteLimit).toBe(true);
  });

  it("falls back safely for generic or undefined scope", () => {
    const feedbackEmpty = getAiQuotaFeedback();
    expect(feedbackEmpty.scope).toBe("usage_limit_reached");
    expect(feedbackEmpty.badge).toBe("Cuota de IA");

    const feedbackGeneric = getAiQuotaFeedback("usage_limit_reached");
    expect(feedbackGeneric.scope).toBe("usage_limit_reached");
  });
});

describe("AiQuotaAlertBanner", () => {
  it("renders the friendly alert banner with title, badge and assurance note", () => {
    const html = renderToStaticMarkup(
      React.createElement(AiQuotaAlertBanner, { scope: "user_day" }),
    );

    expect(html).toContain("Cuota diaria de usuario completada");
    expect(html).toContain("Límite diario alcanzado");
    expect(html).toContain("Tus fotografías del estado inicial y final permanecen guardadas e intactas.");
    expect(html).not.toContain("Reintentar");
  });

  it("renders retry button when onRetry is provided for minute-level limits", () => {
    const onRetry = vi.fn();
    const html = renderToStaticMarkup(
      React.createElement(AiQuotaAlertBanner, {
        scope: "global_minute",
        onRetry,
      }),
    );

    expect(html).toContain("Límite por minuto alcanzado");
    expect(html).toContain("Espera 1 min");
    expect(html).toContain("Reintentar análisis ahora");
  });

  it("renders custom message when provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(AiQuotaAlertBanner, {
        scope: "global_day",
        message: "Mensaje personalizado de cuota de prueba.",
      }),
    );

    expect(html).toContain("Capacidad diaria del sistema agotada");
    expect(html).toContain("Mensaje personalizado de cuota de prueba.");
  });
});

