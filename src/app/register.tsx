import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  normalizeEmail,
  normalizeFullName,
  validateRegistrationForm,
  type RegistrationField,
} from "@/utils/authValidation";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<RegistrationField, boolean>>
  >({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const submissionRef = useRef(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const validationErrors = validateRegistrationForm({
    fullName,
    email,
    password,
    confirmPassword,
  });
  const isFormValid = Object.keys(validationErrors).length === 0;

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace("/home");
    }
  }, [isAuthLoading, user]);

  function clearRequestFeedback() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setConfirmationEmail(null);
  }

  function markFieldTouched(field: RegistrationField) {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  }

  function shouldShowFieldError(field: RegistrationField) {
    return Boolean(
      validationErrors[field] && (hasSubmitted || touchedFields[field]),
    );
  }

  async function handleRegister() {
    if (submissionRef.current) {
      return;
    }

    setHasSubmitted(true);

    if (!isFormValid) {
      return;
    }

    submissionRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setConfirmationEmail(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: {
          data: {
            full_name: normalizeFullName(fullName),
          },
        },
      });

      if (error) {
        setErrorMessage(
          getAuthenticationErrorFeedback(error, "register").message,
        );
        return;
      }

      if (data.session) {
        router.replace("/home");
        return;
      }

      setSuccessMessage(
        t("auth.accountCreated"),
      );
      setConfirmationEmail(normalizeEmail(email));

      setPassword("");
      setConfirmPassword("");
      setHasSubmitted(false);
      setTouchedFields({});
    } catch (error) {
      setErrorMessage(
        getAuthenticationErrorFeedback(error, "register").message,
      );
    } finally {
      submissionRef.current = false;
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

            <Text style={[styles.title, { color: colors.textPrimary }]}>{t("auth.registerTitle")}</Text>

            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t("auth.registerDescription")}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t("auth.fullName")}</Text>

              <TextInput
                value={fullName}
                onChangeText={(value) => {
                  setFullName(value);
                  clearRequestFeedback();
                }}
                onBlur={() => markFieldTouched("fullName")}
                placeholder={t("auth.fullNamePlaceholder")}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoComplete="name"
                editable={!isLoading}
                maxLength={80}
                accessibilityLabel={t("auth.fullName")}
                style={[
                  styles.input,
                  { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border },
                  shouldShowFieldError("fullName") && styles.inputError,
                ]}
              />

              {shouldShowFieldError("fullName") ? (
                <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
                  {validationErrors.fullName}
                </Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t("auth.email")}</Text>

              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  clearRequestFeedback();
                }}
                onBlur={() => markFieldTouched("email")}
                placeholder={t("auth.emailPlaceholder")}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                editable={!isLoading}
                maxLength={254}
                accessibilityLabel={t("auth.email")}
                style={[
                  styles.input,
                  { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border },
                  shouldShowFieldError("email") && styles.inputError,
                ]}
              />

              {shouldShowFieldError("email") ? (
                <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
                  {validationErrors.email}
                </Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t("auth.password")}</Text>

              <TextInput
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  clearRequestFeedback();
                }}
                onBlur={() => markFieldTouched("password")}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                secureTextEntry
                editable={!isLoading}
                maxLength={72}
                accessibilityLabel={t("auth.password")}
                style={[
                  styles.input,
                  { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border },
                  shouldShowFieldError("password") && styles.inputError,
                ]}
              />

              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                Utiliza entre 8 y 72 caracteres, con al menos una letra y un
                número.
              </Text>

              {shouldShowFieldError("password") ? (
                <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
                  {validationErrors.password}
                </Text>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t("auth.confirmPassword")}</Text>

              <TextInput
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  clearRequestFeedback();
                }}
                onBlur={() => markFieldTouched("confirmPassword")}
                placeholder={t("auth.confirmPasswordPlaceholder")}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                secureTextEntry
                editable={!isLoading}
                maxLength={72}
                accessibilityLabel={t("auth.confirmPassword")}
                style={[
                  styles.input,
                  { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border },
                  shouldShowFieldError("confirmPassword") && styles.inputError,
                ]}
              />

              {shouldShowFieldError("confirmPassword") ? (
                <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
                  {validationErrors.confirmPassword}
                </Text>
              ) : null}
            </View>

            {errorMessage ? (
              <View style={styles.errorCard}>
                <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successCard}>
                <Text style={styles.successText}>{successMessage}</Text>

                {confirmationEmail ? (
                  <EmailConfirmationResend email={confirmationEmail} />
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label={isLoading ? "Creando cuenta..." : "Crear cuenta"}
            disabled={isLoading}
            onPress={handleRegister}
          />

          <Text style={[styles.loginText, { color: colors.textSecondary }]}>
            ¿Ya tienes una cuenta?{" "}
            <Text
              accessibilityRole="link"
              onPress={() => router.push("/login")}
              style={[styles.loginLink, { color: colors.primary }]}
            >
              Inicia sesión
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
      borderColor: colors.borderStrong,
      borderRadius: Radius.lg,
      color: colors.textPrimary,
      fontSize: 16,
    },

    inputError: {
      borderColor: colors.danger,
    },

    fieldError: {
      ...Typography.label,
      color: colors.danger,
      marginTop: Spacing.xs,
    },

    helperText: {
      ...Typography.label,
      color: colors.textSecondary,
      marginTop: Spacing.sm,
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

    successCard: {
      padding: Spacing.md,
      backgroundColor: colors.successSoft,
      borderRadius: Radius.md,
    },

    successText: {
      ...Typography.label,
      color: colors.success,
    },

    footer: {
      marginTop: Spacing.xxl,
    },

    loginText: {
      ...Typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: Spacing.lg,
    },

    loginLink: {
      color: colors.primary,
      fontWeight: "700",
    },
  });
}
