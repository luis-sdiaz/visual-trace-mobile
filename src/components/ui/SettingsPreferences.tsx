import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";
import i18n, { changeAppLanguage } from "@/i18n";
import type { SupportedLanguage } from "@/i18n/types";
import { normalizeSupportedLanguage } from "@/services/languagePreferenceService";

export function SettingsPreferences() {
  const { t } = useTranslation();
  const { colors, theme, setTheme } = useTheme();
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    normalizeSupportedLanguage(i18n.resolvedLanguage || i18n.language),
  );

  useEffect(() => {
    const handleLanguageChanged = (locale: string) => {
      setCurrentLanguage(normalizeSupportedLanguage(locale));
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => i18n.off("languageChanged", handleLanguageChanged);
  }, []);

  const selectLanguage = useCallback(async (language: SupportedLanguage) => {
    await changeAppLanguage(language);
    setCurrentLanguage(language);
  }, []);

  return (
    <View style={styles.sections} testID="settings-preferences">
      <View
        style={[
          styles.section,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="language-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.sectionCopy}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t("settings.language")}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t("settings.languageDescription")}
            </Text>
          </View>
        </View>

        <View accessibilityRole="radiogroup" style={styles.options}>
          <PreferenceOption
            label={t("language.spanish")}
            onPress={() => void selectLanguage("es")}
            selected={currentLanguage === "es"}
            testID="settings-language-es"
          />
          <PreferenceOption
            label={t("language.english")}
            onPress={() => void selectLanguage("en")}
            selected={currentLanguage === "en"}
            testID="settings-language-en"
          />
        </View>
      </View>

      <View
        style={[
          styles.section,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="contrast-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.sectionCopy}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t("settings.appearance")}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t("settings.darkModeDescription")}
            </Text>
          </View>
        </View>

        <View accessibilityRole="radiogroup" style={styles.options}>
          <PreferenceOption
            icon="sunny-outline"
            label={t("settings.lightTheme")}
            onPress={() => setTheme("light")}
            selected={theme === "light"}
            testID="settings-theme-light"
          />
          <PreferenceOption
            icon="moon-outline"
            label={t("settings.darkTheme")}
            onPress={() => setTheme("dark")}
            selected={theme === "dark"}
            testID="settings-theme-dark"
          />
        </View>
      </View>
    </View>
  );
}

interface PreferenceOptionProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  selected: boolean;
  testID: string;
}

function PreferenceOption({
  icon,
  label,
  onPress,
  selected,
  testID,
}: PreferenceOptionProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surfaceSecondary,
          borderColor: selected ? colors.primary : colors.border,
        },
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <View style={styles.optionLabel}>
        {icon ? <Ionicons name={icon} size={18} color={colors.textPrimary} /> : null}
        <Text style={[styles.optionText, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      <View
        style={[
          styles.radio,
          { borderColor: selected ? colors.primary : colors.borderStrong },
        ]}
      >
        {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: Spacing.lg,
  },
  section: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.lg,
    marginRight: Spacing.md,
  },
  sectionCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    ...Typography.title,
  },
  description: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  optionLabel: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  optionText: {
    ...Typography.label,
    minWidth: 0,
    flexShrink: 1,
  },
  radio: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: Radius.full,
    marginLeft: Spacing.md,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
  pressed: {
    opacity: 0.72,
  },
});
