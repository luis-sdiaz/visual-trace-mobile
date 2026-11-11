import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LayoutText } from "@/components/ui/LayoutText";
import { SettingsPreferences } from "@/components/ui/SettingsPreferences";
import { type ColorPalette } from "@/constants/colors";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";
import { goBackFromSettings } from "@/utils/settingsNavigation";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityLabel={t("settings.back")}
          accessibilityRole="button"
          onPress={goBackFromSettings}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          testID="settings-back-button"
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          <LayoutText layout="flexible" textBreakStrategy="simple" style={styles.backText}>
            {t("settings.back")}
          </LayoutText>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>VisualTrace</Text>
          <Text style={styles.title}>{t("settings.title")}</Text>
          <Text style={styles.subtitle}>{t("settings.subtitle")}</Text>
        </View>

        <SettingsPreferences />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.xxxl,
    },
    backButton: {
      minHeight: 44,
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: Spacing.xs,
      paddingRight: Spacing.md,
      marginBottom: Spacing.xl,
    },
    backText: {
      ...Typography.label,
      color: colors.textPrimary,
      marginLeft: Spacing.sm,
      flex: 1,
      minWidth: 0,
    },
    header: {
      marginBottom: Spacing.xxl,
    },
    eyebrow: {
      ...Typography.label,
      color: colors.primary,
      marginBottom: Spacing.sm,
    },
    title: {
      ...Typography.heading,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    subtitle: {
      ...Typography.body,
      color: colors.textSecondary,
      maxWidth: 420,
    },
    pressed: {
      opacity: 0.72,
    },
  });
}
