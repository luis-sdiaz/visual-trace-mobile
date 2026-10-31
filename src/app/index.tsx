import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { HeroVisualAnimation } from "@/components/ui/HeroVisualAnimation";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/home");
    }
  }, [isLoading, user]);

  if (isLoading || user) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          height: "100%",
          paddingBottom: Math.max(insets.bottom, Spacing.xl - Spacing.xs),
          paddingHorizontal: Spacing.xl,
          paddingTop: Math.max(insets.top, Spacing.md),
        },
      ]}
      edges={["left", "right"]}
    >
      <View style={styles.header}>
        <Text style={[styles.brandTitle, { color: colors.primary }]}>VisualTrace</Text>
        <View style={styles.headerControls}>
          <LanguageToggle />
          <ThemeToggle />
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.introContent}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t("welcome.title")}</Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t("welcome.description")}
          </Text>
        </View>

        <View style={styles.previewSection}>
          <HeroVisualAnimation />
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label={t("welcome.login")}
          onPress={() => router.push("/login")}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/register")}
          style={({ pressed }) => [
            styles.secondaryButton,
            { backgroundColor: colors.surface, borderColor: colors.primary },
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>{t("welcome.register")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "space-between",
    overflow: "hidden",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },

  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },

  headerControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },

  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    width: "100%",
  },

  introContent: {
    maxWidth: 320,
    width: "100%",
    marginVertical: Spacing.xs,
  },

  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },

  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  previewSection: {
    maxWidth: 300,
    width: "100%",
    alignItems: "center",
    flexShrink: 1,
    justifyContent: "center",
  },

  actions: {
    width: "100%",
    gap: 10,
  },

  brandTitle: {
    color: Colors.primary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },

  secondaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
  },

  secondaryButtonPressed: {
    backgroundColor: Colors.primarySoft,
  },

  secondaryButtonText: {
    ...Typography.button,
    color: Colors.primary,
    textAlign: "center",
  },
});
