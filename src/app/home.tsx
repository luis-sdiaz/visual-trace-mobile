import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
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
import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";

export default function HomeScreen() {
  const { user, isLoading, signOut } = useAuth();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fullName = user?.user_metadata?.full_name;

  const firstName =
    typeof fullName === "string" ? fullName.trim().split(/\s+/)[0] : "";

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user]);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      await signOut();
      router.replace("/");
    } catch {
      setErrorMessage("No pudimos cerrar tu sesión. Inténtalo nuevamente.");

      setIsSigningOut(false);
    }
  }

  if (isLoading || !user) {
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Text style={styles.brand}>VisualTrace</Text>

          <Pressable
            accessibilityRole="button"
            disabled={isSigningOut}
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.signOutButtonPressed,
            ]}
          >
            <Ionicons
              name="log-out-outline"
              size={17}
              color={Colors.textSecondary}
            />

            <Text style={styles.signOutText}>
              {isSigningOut ? "Saliendo..." : "Salir"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          {firstName ? (
            <Text style={styles.greeting}>Hola, {firstName}</Text>
          ) : null}

          <Text style={styles.title}>Tus comparaciones</Text>

          <Text style={styles.description}>
            Documenta y revisa cambios visuales de forma clara y organizada.
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <View style={styles.actionIcon}>
              <Ionicons
                name="images-outline"
                size={24}
                color={Colors.primary}
              />
            </View>

            <View style={styles.actionHeaderText}>
              <Text style={styles.actionTitle}>Nueva comparación</Text>

              <Text style={styles.actionDescription}>
                Registra un estado inicial y uno final para revisar qué cambió.
              </Text>
            </View>
          </View>

          <Button
            label="Crear comparación"
            onPress={() => router.push("/new-comparison")}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comparaciones recientes</Text>

          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="albums-outline"
                size={28}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>Aún no tienes comparaciones</Text>

            <Text style={styles.emptyDescription}>
              Tus registros aparecerán aquí después de completar tu primera
              comparación.
            </Text>
          </View>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xxxl,
  },

  brand: {
    color: Colors.primary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
  },

  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
  },

  signOutButtonPressed: {
    backgroundColor: Colors.surfaceSecondary,
  },

  signOutText: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },

  header: {
    marginBottom: Spacing.xxl,
  },

  greeting: {
    ...Typography.label,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },

  title: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  description: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
    maxWidth: 340,
  },

  errorCard: {
    padding: Spacing.md,
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },

  errorText: {
    ...Typography.label,
    color: Colors.danger,
  },

  actionCard: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    marginBottom: Spacing.xxxl,

    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.05,
    shadowRadius: 18,

    elevation: 2,
  },

  actionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },

  actionIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.lg,
    marginRight: Spacing.md,
  },

  actionHeaderText: {
    flex: 1,
  },

  actionTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },

  actionDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  section: {
    flex: 1,
  },

  sectionTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  emptyCard: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },

  emptyTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  emptyDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
});
