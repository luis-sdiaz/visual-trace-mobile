import { Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";

import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import i18n from "@/i18n";
import type { SupportedLanguage } from "@/i18n/types";
import { useTheme } from "@/context/ThemeContext";

export interface LanguageToggleProps {
  testID?: string;
}

export function LanguageToggle({
  testID = "language-toggle",
}: LanguageToggleProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const currentLanguage: SupportedLanguage = (
    i18n.resolvedLanguage ?? i18n.language
  ).startsWith("en")
    ? "en"
    : "es";
  const nextLanguage: SupportedLanguage = currentLanguage === "es" ? "en" : "es";

  function toggleLanguage() {
    void i18n.changeLanguage(nextLanguage).catch((error: unknown) => {
      console.error("[LanguageToggle] No se pudo cambiar el idioma:", error);
    });
  }

  return (
    <Pressable
      accessibilityLabel={t("language.toggle", {
        defaultValue: "Cambiar idioma",
      })}
      accessibilityRole="button"
      onPress={toggleLanguage}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { backgroundColor: colors.primarySoft },
      ]}
      testID={testID}
    >
      <Text style={styles.flag}>{currentLanguage === "es" ? "🇪🇸" : "🇬🇧"}</Text>
      <Text style={[styles.code, { color: colors.textPrimary }]}>{currentLanguage.toUpperCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 58,
    height: 40,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.28)",
    borderRadius: Radius.full,
    backgroundColor: "rgba(30, 41, 59, 0.72)",
  },
  flag: {
    fontSize: 18,
  },
  code: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.72,
    backgroundColor: "rgba(16, 185, 129, 0.18)",
  },
});
