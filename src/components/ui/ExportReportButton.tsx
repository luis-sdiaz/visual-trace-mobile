import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export type ExportReportButtonProps = {
  onPress: (event: GestureResponderEvent) => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
  testID?: string;
  variant?: "primary" | "secondary" | "outline";
  style?: StyleProp<ViewStyle>;
};

export function ExportReportButton({
  onPress,
  isLoading = false,
  disabled = false,
  label = "📄 Exportar PDF",
  loadingLabel = "Generando PDF...",
  testID = "export-report-button",
  variant = "outline",
  style,
}: ExportReportButtonProps) {
  const isActionDisabled = disabled || isLoading;

  return (
    <Pressable
      accessibilityHint="Genera y exporta el informe completo de análisis en formato PDF profesional"
      accessibilityLabel={isLoading ? loadingLabel : label}
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
            color={variant === "primary" ? Colors.white : Colors.primary}
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
            {loadingLabel}
          </Text>
        </>
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "primary"
              ? styles.buttonTextPrimary
              : styles.buttonTextOutline,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.primarySoft,
  },
  buttonOutline: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
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
  },
  buttonTextPrimary: {
    color: Colors.white,
  },
  buttonTextOutline: {
    color: Colors.textPrimary,
  },
});

