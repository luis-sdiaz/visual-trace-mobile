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

export type AiReanalyzeConfirmationModalProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AiReanalyzeConfirmationModal({
  visible,
  onCancel,
  onConfirm,
}: AiReanalyzeConfirmationModalProps) {
  return (
    <Modal
      accessibilityLabel="Confirmar re-análisis de IA"
      accessibilityViewIsModal
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      testID="reanalyze-confirmation-modal"
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.warningIconContainer}>
              <Text style={styles.warningIconText}>⚠️</Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>¿Re-analizar comparación?</Text>
              <View style={styles.quotaBadge}>
                <Text style={styles.quotaBadgeText}>Consume 1 intento de cuota</Text>
              </View>
            </View>
          </View>

          <Text style={styles.description}>
            Esta acción enviará nuevamente tus fotografías a Gemini Flash para generar un nuevo análisis comparativo.
          </Text>

          <View style={styles.warningBox}>
            <Text style={styles.warningItem}>
              • Consumirá 1 intento de tu cuota diaria disponible de IA.
            </Text>
            <Text style={styles.warningItem}>
              • Requiere una conexión a internet activa y estable.
            </Text>
            <Text style={styles.warningItem}>
              • Tus fotografías guardadas permanecen intactas y seguras.
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityHint="Cierra este diálogo sin realizar ninguna acción"
              accessibilityLabel="Cancelar"
              accessibilityRole="button"
              onPress={onCancel}
              style={styles.cancelButton}
              testID="reanalyze-cancel-button"
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              accessibilityHint="Inicia la solicitud de re-análisis en la nube"
              accessibilityLabel="Confirmar re-análisis"
              accessibilityRole="button"
              onPress={onConfirm}
              style={styles.confirmButton}
              testID="reanalyze-confirm-button"
            >
              <Text style={styles.confirmButtonText}>Confirmar re-análisis</Text>
            </Pressable>
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
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 8,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },

  warningIconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.warningSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.warning,
  },

  warningIconText: {
    fontSize: 22,
  },

  headerTextContainer: {
    flex: 1,
    gap: 2,
  },

  title: {
    ...Typography.title,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textPrimary,
    fontWeight: "700",
  },

  quotaBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.warningSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginTop: 2,
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
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },

  warningBox: {
    backgroundColor: Colors.backgroundStrong,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },

  warningItem: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textPrimary,
  },

  actions: {
    flexDirection: "row",
    gap: Spacing.md,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundStrong,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    ...Typography.button,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "600",
  },

  confirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmButtonText: {
    ...Typography.button,
    fontSize: 14,
    color: Colors.textInverse,
    fontWeight: "700",
  },
});
