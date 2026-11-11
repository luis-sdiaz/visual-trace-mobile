import "@/i18n";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { lightColors, type ColorPalette } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";

export type ExportReportButtonProps = {
  onPress: (event: GestureResponderEvent) => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  variant?: "primary" | "secondary" | "outline";
  style?: StyleProp<ViewStyle>;
};

export function ExportReportButton({
  onPress,
  isLoading = false,
  disabled = false,
  label,
  loadingLabel,
  accessibilityHint,
  testID = "export-report-button",
  variant = "outline",
  style,
}: ExportReportButtonProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = theme?.colors || lightColors;
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const isActionDisabled = disabled || isLoading;

  const displayLabel = label ?? `📄 ${t("result.exportPdf", "Exportar PDF")}`;
  const displayLoadingLabel =
    loadingLabel ?? t("result.generatingPdf", "Generando PDF...");
  const displayHint =
    accessibilityHint ??
    t(
      "result.exportPdfHint",
      "Genera y exporta el informe completo de análisis en formato PDF profesional",
    );

  return (
    <Pressable
      accessibilityHint={displayHint}
      accessibilityLabel={isLoading ? displayLoadingLabel : displayLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isActionDisabled, busy: isLoading }}
      disabled={isActionDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonBase,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "outline" && styles.buttonOutline,
        isActionDisabled && styles.buttonDisabled,
        pressed && !isActionDisabled && styles.buttonPressed,
        style,
      ]}
      testID={testID}
    >
      {isLoading ? (
        <>
          <ActivityIndicator
            accessibilityElementsHidden
            color={variant === "primary" ? colors.white : colors.primary}
            importantForAccessibility="no"
            size="small"
            style={styles.spinner}
            testID={`${testID}-spinner`}
          />
          <Text
            style={[
              styles.buttonText,
              variant === "primary"
                ? styles.buttonTextPrimary
                : styles.buttonTextOutline,
            ]}
          >
            {displayLoadingLabel}
          </Text>
        </>
      ) : (
        <Text
          style={[
            styles.buttonText,
            styles.buttonTextFullWidth,
            variant === "primary"
              ? styles.buttonTextPrimary
              : styles.buttonTextOutline,
          ]}
        >
          {displayLabel}
        </Text>
      )}
    </Pressable>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    buttonBase: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      minHeight: 32,
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
    },
    buttonSecondary: {
      backgroundColor: colors.primarySoft,
    },
    buttonOutline: {
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonPressed: {
      opacity: 0.8,
    },
    spinner: {
      marginRight: Spacing.xs,
    },
    buttonText: {
      ...Typography.label,
      fontSize: 12,
      lineHeight: 16,
      minWidth: 0,
      textAlign: "center",
      flexShrink: 1,
    },
    buttonTextFullWidth: {
      width: "100%",
    },
    buttonTextPrimary: {
      color: colors.white,
    },
    buttonTextOutline: {
      color: colors.textPrimary,
    },
  });
}
