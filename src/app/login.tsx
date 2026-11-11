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
import { LayoutText } from "@/components/ui/LayoutText";
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
            <LayoutText
              layout="flexible"
              numberOfLines={1}
              textBreakStrategy="simple"
              style={[styles.backText, { color: colors.textSecondary }]}
            >
              {t("auth.back")}
            </LayoutText>
          </Pressable>

          <View style={styles.header}>
            <LayoutText
              layout="fullWidth"
              textBreakStrategy="simple"
              style={[styles.brand, { color: colors.primary }]}
            >
              VisualTrace
            </LayoutText>

            <LayoutText
              layout="fullWidth"
              textBreakStrategy="simple"
              style={[styles.title, { color: colors.textPrimary }]}
            >
              {t("auth.loginTitle")}
            </LayoutText>

            <LayoutText
              layout="fullWidth"
              textBreakStrategy="simple"
              style={[styles.description, { color: colors.textSecondary }]}
            >
              {t("auth.loginDescription")}
            </LayoutText>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <LayoutText
                layout="fullWidth"
                textBreakStrategy="simple"
                style={[styles.label, { color: colors.textPrimary }]}
              >
                {t("auth.email")}
              </LayoutText>

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
              <LayoutText
                layout="fullWidth"
                textBreakStrategy="simple"
                style={[styles.label, { color: colors.textPrimary }]}
              >
                {t("auth.password")}
              </LayoutText>

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
                <Text
                  accessibilityLiveRegion="polite"
                  textBreakStrategy="simple"
                  style={styles.errorText}
                >
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

          <LayoutText
            layout="fullWidth"
            textBreakStrategy="simple"
            style={[styles.registerText, { color: colors.textSecondary }]}
          >
            {t("auth.noAccount")}{" "}
            <Text
              accessibilityRole="link"
              onPress={() => router.push("/register")}
              style={[styles.registerLink, { color: colors.primary }]}
            >
              {t("auth.registerLink")}
            </Text>
          </LayoutText>
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
      alignSelf: "stretch",
      minHeight: 44,
      paddingVertical: Spacing.xs,
      paddingRight: Spacing.md,
      marginBottom: Spacing.xxl,
    },

    backIcon: {
      color: colors.textPrimary,
      fontSize: 22,
      marginRight: Spacing.sm,
      flexShrink: 0,
    },

    backText: {
      ...Typography.label,
      color: colors.textPrimary,
      flex: 1,
      minWidth: 0,
    },

    header: {
      marginBottom: Spacing.xxl,
    },

    brand: {
      color: colors.primary,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "700",
      marginBottom: Spacing.md,
      width: "100%",
    },

    title: {
      ...Typography.heading,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
      width: "100%",
    },

    description: {
      ...Typography.body,
      color: colors.textSecondary,
      width: "100%",
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
      width: "100%",
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
