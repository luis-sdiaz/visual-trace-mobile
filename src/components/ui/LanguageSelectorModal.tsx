import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { darkColors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import i18n from "@/i18n";
import type { SupportedLanguage } from "@/i18n/types";

export interface LanguageSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

const LANGUAGE_OPTIONS: Array<{
  code: SupportedLanguage;
  flag: string;
  translationKey: "spanish" | "english";
  codeTranslationKey: "spanishCode" | "englishCode";
}> = [
  {
    code: "es",
    flag: "🇪🇸",
    translationKey: "spanish",
    codeTranslationKey: "spanishCode",
  },
  {
    code: "en",
    flag: "🇬🇧",
    translationKey: "english",
    codeTranslationKey: "englishCode",
  },
];

export function requestLanguageChange(language: SupportedLanguage) {
  void i18n.changeLanguage(language).catch((error: unknown) => {
    console.error("[LanguageSelectorModal] No se pudo cambiar el idioma:", error);
  });
}

export function LanguageSelectorModal({
  visible,
  onClose,
}: LanguageSelectorModalProps) {
  const { t } = useTranslation();
  const selectedLanguage = (i18n.resolvedLanguage ?? i18n.language).startsWith(
    "en",
  )
    ? "en"
    : "es";

  function selectLanguage(language: SupportedLanguage) {
    if (language === selectedLanguage) {
      return;
    }

    requestLanguageChange(language);
  }

  return (
    <Modal
      accessibilityViewIsModal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          accessibilityRole="dialog"
          style={styles.card}
          testID="language-selector-modal"
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {t("language.title", { defaultValue: "Idioma" })}
              </Text>
              <Text style={styles.description}>
                {t("language.description", {
                  defaultValue: "Elige el idioma de VisualTrace",
                })}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("language.close", {
                defaultValue: "Cerrar selector de idioma",
              })}
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              testID="language-selector-close"
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.options}>
            {LANGUAGE_OPTIONS.map((option) => {
              const isSelected = selectedLanguage === option.code;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  aria-checked={isSelected}
                  key={option.code}
                  onPress={() => selectLanguage(option.code)}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected && styles.optionSelected,
                    pressed && styles.pressed,
                  ]}
                  testID={`language-option-${option.code}`}
                >
                  <Text style={styles.flag}>{option.flag}</Text>
                  <View style={styles.optionText}>
                    <Text style={styles.languageName}>
                      {t(`language.${option.translationKey}`, {
                        defaultValue:
                          option.code === "es" ? "Español" : "Inglés",
                      })}
                    </Text>
                    <Text style={styles.languageCode}>
                      {t(`language.${option.codeTranslationKey}`, {
                        defaultValue: option.code.toUpperCase(),
                      })}
                    </Text>
                  </View>
                  <View style={[styles.indicator, isSelected && styles.indicatorSelected]}>
                    {isSelected ? <View style={styles.indicatorDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    backgroundColor: "rgba(2, 6, 23, 0.78)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.24)",
    borderRadius: Radius.xl,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.title,
    color: darkColors.textPrimary,
  },
  description: {
    ...Typography.body,
    marginTop: Spacing.xs,
    color: darkColors.textSecondary,
  },
  closeButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: "rgba(148, 163, 184, 0.12)",
  },
  closeText: {
    color: darkColors.textSecondary,
    fontSize: 24,
    lineHeight: 28,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    borderRadius: Radius.lg,
    backgroundColor: "rgba(30, 41, 59, 0.72)",
  },
  optionSelected: {
    borderColor: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.14)",
  },
  flag: {
    fontSize: 28,
  },
  optionText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  languageName: {
    ...Typography.label,
    color: darkColors.textPrimary,
  },
  languageCode: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    color: darkColors.textSecondary,
  },
  indicator: {
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.48)",
    borderRadius: Radius.full,
  },
  indicatorSelected: {
    borderColor: "#10B981",
  },
  indicatorDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    backgroundColor: "#10B981",
  },
  pressed: {
    opacity: 0.78,
  },
});
