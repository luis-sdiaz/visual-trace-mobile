import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmailConfirmationResend } from "@/components/auth/EmailConfirmationResend";
import { Button } from "@/components/ui/Button";
import { type ColorPalette } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { getAuthenticationErrorFeedback } from "@/services/authService";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );

  const styles = useMemo(() => createStyles(colors), [colors]);

  const isEmailValid = email.trim().includes("@");
  const isPasswordValid = password.length > 0;

  const isFormValid = isEmailValid && isPasswordValid;

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace("/home");
    }
  }, [isAuthLoading, user]);

  function handleEmailChange(value: string) {
    setEmail(value);
    setErrorMessage(null);
    setConfirmationEmail(null);
  }

  async function handleLogin() {
    if (!isFormValid || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setConfirmationEmail(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        const feedback = getAuthenticationErrorFeedback(error, "login");

        setErrorMessage(feedback.message);
        setConfirmationEmail(
          feedback.shouldOfferConfirmationResend ? normalizedEmail : null,
        );
        return;
      }

      router.replace("/home");
    } catch (error) {
      setErrorMessage(getAuthenticationErrorFeedback(error, "login").message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isAuthLoading || user) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={[styles.backIcon, { color: colors.textPrimary }]}>←</Text>
            <Text style={[styles.backText, { color: colors.textSecondary }]}>{t("auth.back")}</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={[styles.brand, { color: colors.primary }]}>VisualTrace</Text>

            <Text style={[styles.title, { color: colors.textPrimary }]}>{t("auth.loginTitle")}</Text>

            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t("auth.loginDescription")}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t("auth.email")}</Text>

              <TextInput
                value={email}
                onChangeText={handleEmailChange}
                placeholder={t("auth.emailPlaceholder")}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border }]}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t("auth.password")}</Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t("auth.passwordPlaceholder")}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                secureTextEntry
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border }]}
              />
            </View>

            {errorMessage ? (
              <View style={styles.errorCard}>
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                  {errorMessage}
                </Text>

                {confirmationEmail ? (
                  <EmailConfirmationResend email={confirmationEmail} />
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label={isLoading ? t("auth.loggingIn") : t("auth.login")}
            disabled={!isFormValid || isLoading}
            onPress={handleLogin}
          />

          <Text style={[styles.registerText, { color: colors.textSecondary }]}>
            {t("auth.noAccount")}{" "}
            <Text
              accessibilityRole="link"
              onPress={() => router.push("/register")}
              style={[styles.registerLink, { color: colors.primary }]}
            >
              {t("auth.registerLink")}
            </Text>
          </Text>
        </View>
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

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },

    content: {
      flexGrow: 1,
      justifyContent: "space-between",
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.xl,
    },

    backButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      marginBottom: Spacing.xxl,
    },

    backIcon: {
      color: colors.textPrimary,
      fontSize: 22,
      marginRight: Spacing.sm,
    },

    backText: {
      ...Typography.label,
      color: colors.textPrimary,
    },

    header: {
      marginBottom: Spacing.xxl,
    },

    brand: {
      color: colors.primary,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: Spacing.md,
    },

    title: {
      ...Typography.heading,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },

    description: {
      ...Typography.body,
      color: colors.textSecondary,
    },

    form: {
      width: "100%",
    },

    field: {
      marginBottom: Spacing.lg,
    },

    label: {
      ...Typography.label,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },

    input: {
      minHeight: 52,
      paddingHorizontal: Spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.lg,
      color: colors.textPrimary,
      fontSize: 16,
    },

    errorCard: {
      padding: Spacing.md,
      backgroundColor: colors.dangerSoft,
      borderRadius: Radius.md,
    },

    errorText: {
      ...Typography.label,
      color: colors.danger,
    },

    footer: {
      marginTop: Spacing.xxl,
    },

    registerText: {
      ...Typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: Spacing.lg,
    },

    registerLink: {
      color: colors.primary,
      fontWeight: "700",
    },
  });
}
