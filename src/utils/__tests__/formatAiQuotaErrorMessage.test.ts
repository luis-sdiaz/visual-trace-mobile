import { describe, expect, it } from "vitest";

import {
  formatAiQuotaErrorMessage,
  getFormattedAiQuotaDetails,
} from "../formatAiQuotaErrorMessage";

describe("formatAiQuotaErrorMessage utility", () => {
  it("formats minute limit codes with polite wait message", () => {
    const msg = formatAiQuotaErrorMessage("global_minute");
    expect(msg).toContain("Límite por minuto");
    expect(msg).toContain("un minuto");

    const details = getFormattedAiQuotaDetails("global_minute");
    expect(details.isTemporary).toBe(true);
    expect(details.title).toBe("Límite por Minuto");
  });

  it("formats daily user limit with renewal reassurance", () => {
    const msg = formatAiQuotaErrorMessage("user_day");
    expect(msg).toContain("cuota diaria");
    expect(msg).toContain("mañana");

    const details = getFormattedAiQuotaDetails("user_day");
    expect(details.isTemporary).toBe(false);
  });

  it("formats specific comparison limit accurately", () => {
    const msg = formatAiQuotaErrorMessage("comparison_day");
    expect(msg).toContain("límite diario de evaluaciones para esta comparación");
    expect(msg).toContain("imágenes se mantienen seguras");
  });

  it("formats system-wide daily global exhaustion", () => {
    const msg = formatAiQuotaErrorMessage("global_day");
    expect(msg).toContain("capacidad diaria global");
  });

  it("formats third-party provider saturation codes", () => {
    const msg = formatAiQuotaErrorMessage("provider_quota_exceeded");
    expect(msg).toContain("Google Gemini");
    expect(msg).toContain("temporalmente saturado");

    const details = getFormattedAiQuotaDetails("gemini_quota");
    expect(details.isTemporary).toBe(true);
  });

  it("provides sensible default when code is null, empty or unknown", () => {
    const nullMsg = formatAiQuotaErrorMessage(null);
    expect(nullMsg).toContain("Se ha alcanzado la cuota de análisis disponible");

    const emptyMsg = formatAiQuotaErrorMessage("");
    expect(emptyMsg).toContain("Se ha alcanzado la cuota de análisis disponible");

    const unknownMsg = formatAiQuotaErrorMessage("random_code_123");
    expect(unknownMsg).toContain("Se ha alcanzado la cuota de análisis disponible");
  });
});

