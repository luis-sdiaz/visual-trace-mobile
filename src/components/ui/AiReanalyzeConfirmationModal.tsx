import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import "@/i18n";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { lightColors, type ColorPalette } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";

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
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = theme?.colors || lightColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      accessibilityLabel={t("reanalyze.modalLabel", "Confirmar re-análisis de IA")}
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
              <Text style={styles.title}>
                {t("reanalyze.title", "¿Re-analizar comparación?")}
              </Text>
              <View style={styles.quotaBadge}>
                <Text style={styles.quotaBadgeText}>
                  {t("reanalyze.badge", "Consume 1 intento de cuota")}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.description}>
            {t(
              "reanalyze.description",
              "Esta acción enviará nuevamente tus fotografías a Gemini Flash para generar un nuevo análisis comparativo.",
            )}
          </Text>

          <View style={styles.warningBox}>
            <Text style={styles.warningItem}>
              • {t("reanalyze.warningQuota", "Consumirá 1 intento de tu cuota diaria disponible de IA.")}
            </Text>
            <Text style={styles.warningItem}>
              • {t("reanalyze.warningInternet", "Requiere una conexión a internet activa y estable.")}
            </Text>
            <Text style={styles.warningItem}>
              • {t("reanalyze.warningSafePhotos", "Tus fotografías guardadas permanecen intactas y seguras.")}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityHint={t("reanalyze.cancelHint", "Cierra este diálogo sin realizar ninguna acción")}
              accessibilityLabel={t("reanalyze.cancel", "Cancelar")}
              accessibilityRole="button"
              onPress={onCancel}
              style={styles.cancelButton}
              testID="reanalyze-cancel-button"
            >
              <Text style={styles.cancelButtonText}>
                {t("reanalyze.cancel", "Cancelar")}
              </Text>
            </Pressable>

            <Pressable
              accessibilityHint={t("reanalyze.confirmHint", "Inicia la solicitud de re-análisis en la nube")}
              accessibilityLabel={t("reanalyze.confirm", "Confirmar re-análisis")}
              accessibilityRole="button"
              onPress={onConfirm}
              style={styles.confirmButton}
              testID="reanalyze-confirm-button"
            >
              <Text style={styles.confirmButtonText}>
                {t("reanalyze.confirm", "Confirmar re-análisis")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: Spacing.xl,
    },

    modalContent: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: colors.warningSoft,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.warning,
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
      color: colors.textPrimary,
      fontWeight: "700",
    },

    quotaBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.warningSoft,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.warning,
      marginTop: 2,
    },

    quotaBadgeText: {
      ...Typography.label,
      fontSize: 11,
      lineHeight: 14,
      color: colors.warning,
      fontWeight: "700",
    },

    description: {
      ...Typography.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      marginBottom: Spacing.md,
    },

    warningBox: {
      backgroundColor: colors.backgroundStrong,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.xl,
      gap: Spacing.xs,
      borderLeftWidth: 3,
      borderLeftColor: colors.warning,
    },

    warningItem: {
      ...Typography.body,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },

    actions: {
      flexDirection: "row",
      gap: Spacing.md,
    },

    cancelButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: colors.backgroundStrong,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      alignItems: "center",
      justifyContent: "center",
    },

    cancelButtonText: {
      ...Typography.button,
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: "600",
    },

    confirmButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    confirmButtonText: {
      ...Typography.button,
      fontSize: 14,
      color: colors.textInverse,
      fontWeight: "700",
    },
  });
}
