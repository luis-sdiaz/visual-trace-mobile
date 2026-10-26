import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

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
  testID?: string;
};

export function AiQuotaLimitExceededModal({
  visible,
  onClose,
  onViewHistory,
  resetTimeText = DEFAULT_QUOTA_RESET_TIME,
  testID = "ai-quota-limit-exceeded-modal",
}: AiQuotaLimitExceededModalProps) {
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

          <Text style={styles.description}>
            Has completado las solicitudes de inferencia con IA disponibles para
            el día de hoy. Tus fotografías y datos locales no se ven afectados.
          </Text>

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
              style={styles.closeButton}
              testID="quota-exceeded-close-button"
            >
              <Text style={styles.closeButtonText}>Entendido</Text>
            </Pressable>

            {onViewHistory ? (
              <Pressable
                accessibilityHint="Regresa a la pantalla principal para explorar tus comparaciones guardadas"
                accessibilityLabel="Ver historial de comparaciones"
                accessibilityRole="button"
                onPress={onViewHistory}
                style={styles.historyButton}
                testID="quota-exceeded-history-button"
              >
                <Text style={styles.historyButtonText}>
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
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    elevation: 8,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.warningSoft,
    borderWidth: 1,
    borderColor: Colors.warning,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },

  iconText: {
    fontSize: 20,
  },

  titleContainer: {
    flex: 1,
    gap: Spacing.xs,
  },

  title: {
    ...Typography.title,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textPrimary,
  },

  quotaBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.warningSoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.warning,
  },

  quotaBadgeText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.warning,
    fontWeight: "700",
  },

  description: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },

  resetIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceBlue,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },

  resetIcon: {
    fontSize: 18,
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
    marginBottom: Spacing.xs,
  },

  suggestionsList: {
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },

  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: Spacing.xs,
  },

  suggestionBullet: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },

  suggestionText: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    flex: 1,
  },

  actionsContainer: {
    gap: Spacing.sm,
  },

  closeButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    ...Typography.button,
    fontSize: 15,
    color: Colors.textInverse,
    fontWeight: "700",
  },

  historyButton: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },

  historyButtonText: {
    ...Typography.button,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
});

