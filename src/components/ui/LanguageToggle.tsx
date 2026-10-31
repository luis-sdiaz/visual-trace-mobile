import { Check, ChevronDown, Globe } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/context/ThemeContext";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import i18n from "@/i18n";
import type { SupportedLanguage } from "@/i18n/types";

export interface LanguageToggleProps {
  testID?: string;
}

export function normalizeLanguage(locale?: string): SupportedLanguage {
  return (locale || "es").startsWith("en") ? "en" : "es";
}

export function LanguageToggle({
  testID = "language-toggle",
}: LanguageToggleProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    normalizeLanguage(i18n.resolvedLanguage || i18n.language),
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleLanguageChanged = (locale: string) => {
      setCurrentLanguage(normalizeLanguage(locale));
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  async function handleLanguageSelect(language: SupportedLanguage) {
    try {
      await i18n.changeLanguage(language);
    } catch (error: unknown) {
      console.error("[LanguageToggle] No se pudo cambiar el idioma:", error);
    } finally {
      setIsOpen(false);
    }
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.75}
        accessibilityLabel={t("language.toggle", {
          defaultValue: "Cambiar idioma",
        })}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen((open) => !open)}
        style={[
          styles.container,
          {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.05)",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.14)"
              : "rgba(0, 0, 0, 0.1)",
          },
        ]}
        testID={testID}
      >
        <Globe
          color={isDark ? "#E2E8F0" : "#1E293B"}
          size={13}
          strokeWidth={1.8}
        />
        <Text
          style={[
            styles.code,
            { color: isDark ? "#FFFFFF" : "#0F172A" },
          ]}
        >
          {currentLanguage.toUpperCase()}
        </Text>
        <ChevronDown
          color={isDark ? "#94A3B8" : "#64748B"}
          size={11}
          strokeWidth={2.2}
          style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
        />
      </TouchableOpacity>

      <Modal
        transparent
        visible={isOpen}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            accessibilityLabel={t("language.close", {
              defaultValue: "Cerrar selector de idioma",
            })}
            onPress={() => setIsOpen(false)}
            style={StyleSheet.absoluteFill}
            testID={`${testID}-backdrop`}
          />
          <View
            style={[
              styles.menu,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            testID={`${testID}-menu`}
          >
            <LanguageOption
              language="es"
              currentLanguage={currentLanguage}
              label="Español"
              flag="🇪🇸"
              onPress={handleLanguageSelect}
              textColor={colors.textPrimary}
            />
            <LanguageOption
              language="en"
              currentLanguage={currentLanguage}
              label="English"
              flag="🇺🇸"
              onPress={handleLanguageSelect}
              textColor={colors.textPrimary}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

type LanguageOptionProps = {
  language: SupportedLanguage;
  currentLanguage: SupportedLanguage;
  label: string;
  flag: string;
  onPress: (language: SupportedLanguage) => void;
  textColor: string;
};

function LanguageOption({
  language,
  currentLanguage,
  label,
  flag,
  onPress,
  textColor,
}: LanguageOptionProps) {
  const isSelected = language === currentLanguage;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      onPress={() => void onPress(language)}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
      testID={`language-option-${language}`}
    >
      <Text style={styles.optionFlag}>{flag}</Text>
      <Text style={[styles.optionLabel, { color: textColor }]}>{label}</Text>
      {isSelected && <Check color={textColor} size={16} strokeWidth={2.5} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 62,
    height: 29,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
    borderWidth: 1,
    overflow: "hidden",
  },
  code: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  modalContainer: {
    flex: 1,
    alignItems: "flex-end",
    paddingTop: 50,
    paddingRight: Spacing.xl,
  },
  menu: {
    minWidth: 140,
    padding: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  option: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 40,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    gap: Spacing.sm,
  },
  optionPressed: {
    opacity: 0.72,
  },
  optionFlag: {
    fontSize: 16,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});
