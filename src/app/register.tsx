import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getAuthenticationErrorFeedback } from "@/services/authService";
import {
  normalizeEmail,
  normalizeFullName,
  validateRegistrationForm,
  type RegistrationField,
} from "@/utils/authValidation";

export default function RegisterScreen() {
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
        "Cuenta creada. Confirma tu correo electrónico antes de iniciar sesión.",
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
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Volver</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.brand}>VisualTrace</Text>

            <Text style={styles.title}>Crea tu cuenta</Text>

            <Text style={styles.description}>
              Guarda tus comparaciones y accede a ellas desde tu cuenta.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Nombre completo</Text>

              <TextInput
                value={fullName}
                onChangeText={(value) => {
                  setFullName(value);
                  clearRequestFeedback();
                }}
                onBlur={() => markFieldTouched("fullName")}
                placeholder="Ej. Luis Sebastián Díaz"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                autoComplete="name"
                editable={!isLoading}
                maxLength={80}
                accessibilityLabel="Nombre completo"
                style={[
                  styles.input,
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
              <Text style={styles.label}>Correo electrónico</Text>

              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  clearRequestFeedback();
                }}
                onBlur={() => markFieldTouched("email")}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                editable={!isLoading}
                maxLength={254}
                accessibilityLabel="Correo electrónico"
                style={[
                  styles.input,
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
              <Text style={styles.label}>Contraseña</Text>

              <TextInput
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  clearRequestFeedback();
                }}
                onBlur={() => markFieldTouched("password")}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                secureTextEntry
                editable={!isLoading}
                maxLength={72}
                accessibilityLabel="Contraseña"
                style={[
                  styles.input,
                  shouldShowFieldError("password") && styles.inputError,
                ]}
              />

              <Text style={styles.helperText}>
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
              <Text style={styles.label}>Confirmar contraseña</Text>

              <TextInput
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  clearRequestFeedback();
                }}
                onBlur={() => markFieldTouched("confirmPassword")}
                placeholder="Repite tu contraseña"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                secureTextEntry
                editable={!isLoading}
                maxLength={72}
                accessibilityLabel="Confirmar contraseña"
                style={[
                  styles.input,
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

          <Text style={styles.loginText}>
            ¿Ya tienes una cuenta?{" "}
            <Text
              accessibilityRole="link"
              onPress={() => router.push("/login")}
              style={styles.loginLink}
            >
              Inicia sesión
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
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
    color: Colors.textPrimary,
    fontSize: 22,
    marginRight: Spacing.sm,
  },

  backText: {
    ...Typography.label,
    color: Colors.textPrimary,
  },

  header: {
    marginBottom: Spacing.xxl,
  },

  brand: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },

  title: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  description: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  form: {
    width: "100%",
  },

  field: {
    marginBottom: Spacing.lg,
  },

  label: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  input: {
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.lg,
    color: Colors.textPrimary,
    fontSize: 16,
  },

  inputError: {
    borderColor: Colors.danger,
  },

  fieldError: {
    ...Typography.label,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },

  helperText: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },

  errorCard: {
    padding: Spacing.md,
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radius.md,
  },

  errorText: {
    ...Typography.label,
    color: Colors.danger,
  },

  successCard: {
    padding: Spacing.md,
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.md,
  },

  successText: {
    ...Typography.label,
    color: Colors.success,
  },

  footer: {
    marginTop: Spacing.xxl,
  },

  loginText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.lg,
  },

  loginLink: {
    color: Colors.primary,
    fontWeight: "700",
  },
});
