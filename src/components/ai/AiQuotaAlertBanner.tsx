import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export type QuotaScope =
  | "global_minute"
  | "global_day"
  | "user_day"
  | "comparison_day"
  | "provider_quota_exceeded"
  | "usage_limit_reached";

export type QuotaFeedback = {
  scope: QuotaScope | string;
  title: string;
  description: string;
  badge: string;
  isMinuteLimit: boolean;
  actionHint: string;
};

export function getAiQuotaFeedback(scopeOrCode?: string): QuotaFeedback {
  const normalized = (scopeOrCode ?? "").toLowerCase().trim();

  if (normalized === "global_minute" || normalized.includes("minute")) {
    return {
      scope: "global_minute",
      title: "Límite por minuto alcanzado",
      description:
        "Se han procesado varias solicitudes en los últimos instantes. Para evitar sobrecargas en la IA, por favor espera aproximadamente 1 minuto antes de reintentar.",
      badge: "Espera 1 min",
      isMinuteLimit: true,
      actionHint: "Podrás reintentar el análisis en unos instantes.",
    };
  }

  if (normalized === "comparison_day" || normalized.includes("comparison")) {
    return {
      scope: "comparison_day",
      title: "Límite diario en esta comparación",
      description:
        "Has alcanzado el número máximo de reanálisis permitidos por día para este par fotográfico específico. Tus fotos y cambios están protegidos.",
      badge: "Límite en esta comparación",
      isMinuteLimit: false,
      actionHint: "Podrás solicitar un nuevo análisis para esta comparación mañana.",
    };
  }

  if (normalized === "user_day" || normalized.includes("user")) {
    return {
      scope: "user_day",
      title: "Cuota diaria de usuario completada",
      description:
        "Has alcanzado tu límite diario de análisis gratuitos con IA. Para garantizar disponibilidad para todos los usuarios, tu cuota se reiniciará mañana.",
      badge: "Límite diario alcanzado",
      isMinuteLimit: false,
      actionHint: "Tu cuota gratuita se restablecerá automáticamente mañana.",
    };
  }

  if (normalized === "global_day" || normalized.includes("global")) {
    return {
      scope: "global_day",
      title: "Capacidad diaria del sistema agotada",
      description:
        "El límite diario global de análisis de la aplicación ha llegado a su tope. Las cuotas del sistema se reiniciarán en las próximas 24 horas.",
      badge: "Límite global diario",
      isMinuteLimit: false,
      actionHint: "El servicio global de análisis se renovará a medianoche.",
    };
  }

  if (
    normalized === "provider_quota_exceeded" ||
    normalized.includes("provider") ||
    normalized.includes("gemini")
  ) {
    return {
      scope: "provider_quota_exceeded",
      title: "Servicio de IA temporalmente saturado",
      description:
        "El proveedor de inteligencia artificial (Google Gemini) se encuentra sin capacidad momentánea. Aguarda unos minutos e intenta de nuevo.",
      badge: "Gemini ocupado",
      isMinuteLimit: true,
      actionHint: "Inténtalo nuevamente en un momento.",
    };
  }

  return {
    scope: "usage_limit_reached",
    title: "Límite de análisis alcanzado",
    description:
      "Se ha alcanzado la cuota de análisis disponible para este período. Tus fotografías se mantienen seguras y podrás reintentar cuando la cuota se renueve.",
    badge: "Cuota de IA",
    isMinuteLimit: false,
    actionHint: "Inténtalo más tarde.",
  };
}

export type AiQuotaAlertBannerProps = {
  scope?: string;
  message?: string;
  isDismissed?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  testID?: string;
};

export function AiQuotaAlertBanner({
  scope,
  message,
  isDismissed: controlledDismissed,
  onRetry,
  onDismiss,
  testID = "ai-quota-alert-banner",
}: AiQuotaAlertBannerProps) {
  const [internalDismissed, setInternalDismissed] = useState(false);

  const dismissed =
    controlledDismissed !== undefined ? controlledDismissed : internalDismissed;

  if (dismissed) {
    return null;
  }

  const feedback = getAiQuotaFeedback(scope);
  const displayDescription =
    message &&
    message.trim().length > 0 &&
    !message.includes("Se alcanzó el límite gratuito")
      ? message
      : feedback.description;

  function handleDismiss() {
    setInternalDismissed(true);
    onDismiss?.();
  }

  return (
    <View
      accessibilityLabel={`Aviso de límite de cuota: ${feedback.title}`}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={styles.card}
      testID={testID}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>!</Text>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title} testID="ai-quota-title">
              {feedback.title}
            </Text>
            <View style={styles.badgePill} testID="ai-quota-badge">
              <Text style={styles.badgeText}>{feedback.badge}</Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityHint="Descarta temporalmente la alerta de cuota de la pantalla"
          accessibilityLabel="Cerrar aviso de cuota"
          accessibilityRole="button"
          onPress={handleDismiss}
          style={({ pressed }) => [
            styles.dismissButton,
            pressed && styles.dismissButtonPressed,
          ]}
          testID="ai-quota-dismiss-button"
        >
          <Text style={styles.dismissButtonText}>✕</Text>
        </Pressable>
      </View>

      <Text style={styles.description} testID="ai-quota-description">
        {displayDescription}
      </Text>

      <View style={styles.assuranceBox}>
        <Text style={styles.assuranceText}>
          ✓ Tus fotografías del estado inicial y final permanecen guardadas e intactas.
        </Text>
      </View>

      {onRetry ? (
        <Pressable
          accessibilityLabel="Reintentar análisis de IA"
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retryButton}
          testID="ai-quota-retry-button"
        >
          <Text style={styles.retryButtonText}>
            {feedback.isMinuteLimit ? "Reintentar análisis ahora" : "Reintentar"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.warningSoft,
    borderColor: Colors.warning,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: Spacing.sm,
  },

  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(217, 119, 6, 0.12)",
  },

  dismissButtonPressed: {
    opacity: 0.7,
  },

  dismissButtonText: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.warning,
    fontWeight: "700",
  },

  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.warning,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
    marginTop: 2,
  },

  iconText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  titleContainer: {
    flex: 1,
  },

  title: {
    ...Typography.title,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginBottom: 4,
  },

  badgePill: {
    alignSelf: "flex-start",
    backgroundColor: "#FDE68A",
    borderColor: Colors.warning,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },

  badgeText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: "#78350F",
    fontWeight: "600",
  },

  description: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  assuranceBox: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderColor: Colors.warning,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },

  assuranceText: {
    ...Typography.body,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },

  retryButton: {
    backgroundColor: Colors.warning,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  retryButtonText: {
    ...Typography.button,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.white,
  },
});
