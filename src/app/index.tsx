import { router } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { ComparisonPreview } from "@/components/ui/ComparisonPreview";
import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";

export default function WelcomeScreen() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/home");
    }
  }, [isLoading, user]);

  if (isLoading || user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introContent}>
          <Text style={styles.brand}>VisualTrace</Text>

          <Text style={styles.title}>Detecta lo que cambió</Text>

          <Text style={styles.description}>
            Compara el estado inicial y final de tus espacios y objetos con
            ayuda de inteligencia artificial.
          </Text>
        </View>

        <ComparisonPreview />

        <View style={styles.actions}>
          <Button
            label="Iniciar sesión"
            onPress={() => router.push("/login")}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/register")}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
          </Pressable>
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

  scrollView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xl,
  },

  introContent: {
    flexShrink: 1,
  },

  brand: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.lg,
  },

  title: {
    ...Typography.display,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },

  description: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
  },

  actions: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
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
