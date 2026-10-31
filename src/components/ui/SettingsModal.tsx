import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useTheme, type Theme } from "@/context/ThemeContext";

export interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function getNextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const { colors, theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  function handleThemeToggle() {
    setTheme(getNextTheme(theme));
  }

  return (
    <Modal
      accessibilityViewIsModal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View
          accessibilityRole="dialog"
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          testID="settings-modal"
        >
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t("settings.title")}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t("settings.subtitle")}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("settings.close")}
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: colors.surfaceSecondary },
                pressed && styles.pressed,
              ]}
              testID="settings-close-button"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View
            style={[
              styles.settingRow,
              { borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t("settings.language")}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t("settings.languageDescription")}
              </Text>
            </View>
            <LanguageToggle testID="settings-language-toggle" />
          </View>

          <Pressable
            accessibilityLabel={isDark ? t("settings.lightMode") : t("settings.darkMode")}
            accessibilityRole="switch"
            accessibilityState={{ checked: isDark }}
            aria-checked={isDark}
            onPress={handleThemeToggle}
            style={({ pressed }) => [
              styles.settingRow,
              { borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
              pressed && styles.pressed,
            ]}
            testID="settings-theme-toggle"
          >
            <View style={styles.settingCopy}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                {t("settings.darkMode")}
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {t("settings.darkModeDescription")}
              </Text>
            </View>
            <View
              style={[
                styles.switchTrack,
                { backgroundColor: isDark ? colors.primary : colors.borderStrong },
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  {
                    backgroundColor: colors.surface,
                    alignSelf: isDark ? "flex-end" : "flex-start",
                  },
                ]}
              />
            </View>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...Typography.title,
  },
  subtitle: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  closeButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: Radius.full,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 72,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  settingCopy: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingTitle: {
    ...Typography.label,
  },
  settingDescription: {
    ...Typography.body,
    marginTop: Spacing.xs,
    fontSize: 13,
    lineHeight: 18,
  },
  switchTrack: {
    justifyContent: "center",
    width: 46,
    height: 26,
    padding: 2,
    borderRadius: Radius.full,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
  },
  pressed: {
    opacity: 0.75,
  },
});
