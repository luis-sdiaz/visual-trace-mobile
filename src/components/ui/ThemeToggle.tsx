import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { colors, isDark, toggleTheme } = useTheme();
  const nextThemeLabel = isDark ? "Activar modo claro" : "Activar modo oscuro";

  return (
    <Pressable
      accessibilityLabel={nextThemeLabel}
      accessibilityRole="button"
      accessibilityState={{ checked: isDark }}
      onPress={toggleTheme}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && { backgroundColor: colors.primarySoft },
      ]}
      testID="theme-toggle"
    >
      <Ionicons
        color={colors.textPrimary}
        name={isDark ? "sunny-outline" : "moon-outline"}
        size={20}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
    width: 40,
  },
});
