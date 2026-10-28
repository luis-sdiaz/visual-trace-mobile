export interface FormattedQuotaMessage {
  code: string;
  title: string;
  message: string;
  isTemporary: boolean;
}

export function formatAiQuotaErrorMessage(
  codeOrScope?: string | null,
): string {
  const normalized = (codeOrScope ?? "").toLowerCase().trim();

  if (normalized === "global_minute" || normalized.includes("minute")) {
    return "Límite por minuto alcanzado. Por favor espera aproximadamente un minuto antes de solicitar un nuevo análisis.";
  }

  if (normalized === "comparison_day" || normalized.includes("comparison")) {
    return "Has alcanzado el límite diario de evaluaciones para esta comparación específica. Tus imágenes se mantienen seguras.";
  }

  if (normalized === "user_day" || normalized.includes("user")) {
    return "Has completado tu cuota diaria gratuita de análisis. Tu límite se restablecerá automáticamente mañana.";
  }

  if (normalized === "global_day" || normalized.includes("global")) {
    return "La capacidad diaria global del servicio de IA ha alcanzado su tope. Las cuotas del sistema se renovarán en las próximas horas.";
  }

  if (
    normalized === "provider_quota_exceeded" ||
    normalized.includes("provider") ||
    normalized.includes("gemini")
  ) {
    return "El proveedor de inteligencia artificial (Google Gemini) está temporalmente saturado. Por favor, aguarda unos instantes.";
  }

  return "Se ha alcanzado la cuota de análisis disponible para este período. Podrás reintentar cuando el ciclo se reinicie.";
}

export function getFormattedAiQuotaDetails(
  codeOrScope?: string | null,
): FormattedQuotaMessage {
  const normalized = (codeOrScope ?? "").toLowerCase().trim();
  const message = formatAiQuotaErrorMessage(codeOrScope);

  if (normalized === "global_minute" || normalized.includes("minute")) {
    return {
      code: "global_minute",
      title: "Límite por Minuto",
      message,
      isTemporary: true,
    };
  }

  if (
    normalized === "provider_quota_exceeded" ||
    normalized.includes("provider") ||
    normalized.includes("gemini")
  ) {
    return {
      code: "provider_quota_exceeded",
      title: "IA Temporalmente Saturada",
      message,
      isTemporary: true,
    };
  }

  if (normalized === "comparison_day" || normalized.includes("comparison")) {
    return {
      code: "comparison_day",
      title: "Límite Diario de Comparación",
      message,
      isTemporary: false,
    };
  }

  if (normalized === "user_day" || normalized.includes("user")) {
    return {
      code: "user_day",
      title: "Cuota Diaria de Usuario",
      message,
      isTemporary: false,
    };
  }

  if (normalized === "global_day" || normalized.includes("global")) {
    return {
      code: "global_day",
      title: "Capacidad Global Agotada",
      message,
      isTemporary: false,
    };
  }

  return {
    code: "usage_limit_reached",
    title: "Límite de Cuota Alcanzado",
    message,
    isTemporary: false,
  };
}

