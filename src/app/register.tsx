import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { supabase } from "@/lib/supabase";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEmailValid = email.trim().includes("@");
  const isPasswordValid = password.length >= 8;
  const doPasswordsMatch = password === confirmPassword;

  const isFormValid =
    fullName.trim().length >= 2 &&
    isEmailValid &&
    isPasswordValid &&
    doPasswordsMatch;

  async function handleRegister() {
    if (!isFormValid || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    setIsLoading(false);

    if (error) {
      const message = error.message.toLowerCase();

      if (
        message.includes("for security purposes") ||
        message.includes("rate limit")
      ) {
        setErrorMessage("Espera unos segundos antes de volver a intentarlo.");
      } else if (message.includes("already registered")) {
        setErrorMessage(
          "Ya existe una cuenta registrada con este correo electrónico.",
        );
      } else if (
        message.includes("invalid email") ||
        message.includes("invalid format")
      ) {
        setErrorMessage("Ingresa un correo electrónico válido.");
      } else if (message.includes("password")) {
        setErrorMessage(
          "La contraseña no cumple con los requisitos de seguridad.",
        );
      } else {
        setErrorMessage("No pudimos crear tu cuenta. Inténtalo nuevamente.");
      }

      return;
    }

    if (data.session) {
      router.replace("/home");
      return;
    }

    setSuccessMessage(
      "Cuenta creada correctamente. Revisa tu correo electrónico para confirmar tu cuenta.",
    );

    setPassword("");
    setConfirmPassword("");
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
                onChangeText={setFullName}
                placeholder="Ej. Luis Sebastián Díaz"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                autoComplete="name"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Correo electrónico</Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contraseña</Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                secureTextEntry
                style={styles.input}
              />

              <Text style={styles.helperText}>
                Utiliza al menos 8 caracteres.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirmar contraseña</Text>

              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite tu contraseña"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                secureTextEntry
                style={styles.input}
              />
            </View>

            {errorMessage ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successCard}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label={isLoading ? "Creando cuenta..." : "Crear cuenta"}
            disabled={!isFormValid || isLoading}
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
