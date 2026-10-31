import { Pressable, StyleSheet, Text } from "react-native";

import { type ColorPalette } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function Button({ label, onPress, disabled = false }: ButtonProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        buttonStyles(colors).container,
        pressed && !disabled && buttonStyles(colors).pressed,
        disabled && buttonStyles(colors).disabled,
      ]}
    >
      <Text style={buttonStyles(colors).label}>{label}</Text>
    </Pressable>
  );
}

function buttonStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
    },

    pressed: {
      backgroundColor: colors.primaryPressed,
    },

    disabled: {
      opacity: 0.5,
    },

    label: {
      ...Typography.button,
      color: colors.textInverse,
      textAlign: "center",
    },
  });
}
