import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AiRetryCountdownTimer } from "@/components/ai/AiRetryCountdownTimer";
import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { formatAiQuotaErrorMessage } from "@/utils/formatAiQuotaErrorMessage";

export const DEFAULT_QUOTA_RESET_TIME =
  "Se restablece a la medianoche (00:00 UTC)";

export const DEFAULT_LOCAL_SUGGESTIONS: string[] = [
  "Puedes continuar capturando y organizando nuevas fotos de Antes y Después.",
  "La visualización manual y comparación lado a lado sigue 100% activa.",
  "Tus fotos y comparaciones anteriores permanecen seguras en tu dispositivo.",
];

export type AiQuotaLimitExceededModalProps = {
  visible: boolean;
  onClose: () => void;
  onViewHistory?: () => void;
  resetTimeText?: string;
  scope?: string;
  retryAfterSeconds?: number;
  onTimerComplete?: () => void;
  testID?: string;
};

export function AiQuotaLimitExceededModal({
  visible,
  onClose,
  onViewHistory,
  resetTimeText = DEFAULT_QUOTA_RESET_TIME,
  scope,
  retryAfterSeconds,
  onTimerComplete,
  testID = "ai-quota-limit-exceeded-modal",
}: AiQuotaLimitExceededModalProps) {
  useEffect(() => {
    if (visible) {
      try {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
      } catch {
        // Fallback tolerante para entornos web o sin soporte háptico
      }
    }
  }, [visible]);

  const dynamicDescription = formatAiQuotaErrorMessage(scope);

  return (
    <Modal
      accessibilityLabel="Límite diario de análisis alcanzado"
      accessibilityViewIsModal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>⏳</Text>
            </View>

            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                Límite diario de análisis alcanzado
              </Text>
              <View style={styles.quotaBadge}>
                <Text style={styles.quotaBadgeText}>Cuota de IA</Text>
              </View>
            </View>
          </View>

          <Text style={styles.description} testID="quota-exceeded-description">
            {dynamicDescription}
          </Text>

          {retryAfterSeconds !== undefined && retryAfterSeconds > 0 ? (
            <AiRetryCountdownTimer
              onTimerComplete={onTimerComplete}
              retryAfterSeconds={retryAfterSeconds}
              testID="modal-retry-countdown-timer"
            />
          ) : null}

          <View
            style={styles.resetIndicator}
            testID="quota-reset-time-indicator"
          >
            <Text style={styles.resetIcon}>🕒</Text>
            <View style={styles.resetTextContainer}>
              <Text style={styles.resetLabel}>Reinicio estimado de cuota:</Text>
              <Text style={styles.resetValue}>{resetTimeText}</Text>
            </View>
          </View>

          <Text style={styles.suggestionsHeader}>
            ¿Qué puedes hacer mientras tanto?
          </Text>

          <View style={styles.suggestionsList}>
            {DEFAULT_LOCAL_SUGGESTIONS.map((suggestion, index) => (
              <View key={`suggestion-${index}`} style={styles.suggestionRow}>
                <Text style={styles.suggestionBullet}>•</Text>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionsContainer}>
            <Pressable
              accessibilityHint="Cierra este aviso y vuelve a la pantalla de comparación"
              accessibilityLabel="Entendido"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.primaryButton}
              testID="quota-exceeded-close-button"
            >
              <Text style={styles.primaryButtonText}>Entendido</Text>
            </Pressable>

            {onViewHistory ? (
              <Pressable
                accessibilityHint="Navega a la pantalla de inicio con tus comparaciones previas"
                accessibilityLabel="Ver historial de comparaciones"
                accessibilityRole="button"
                onPress={onViewHistory}
                style={styles.secondaryButton}
                testID="quota-exceeded-history-button"
              >
                <Text style={styles.secondaryButtonText}>
                  Ver historial de comparaciones
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },

  modalContent: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.warningSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },

  iconText: {
    fontSize: 22,
  },

  titleContainer: {
    flex: 1,
  },

  title: {
    ...Typography.title,
    fontSize: 17,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginBottom: 4,
  },

  quotaBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FDE68A",
    borderColor: Colors.warning,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },

  quotaBadgeText: {
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
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  resetIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceBlue,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },

  resetIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },

  resetTextContainer: {
    flex: 1,
  },

  resetLabel: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },

  resetValue: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.primaryDark,
    fontWeight: "700",
  },

  suggestionsHeader: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textPrimary,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },

  suggestionsList: {
    marginBottom: Spacing.xl,
  },

  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },

  suggestionBullet: {
    color: Colors.primary,
    fontSize: 14,
    lineHeight: 18,
    marginRight: Spacing.xs,
  },

  suggestionText: {
    ...Typography.body,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    flex: 1,
  },

  actionsContainer: {
    gap: Spacing.sm,
  },

  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    ...Typography.button,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.white,
  },

  secondaryButton: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    ...Typography.button,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
});
