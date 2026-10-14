import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { useComparison } from "@/context/ComparisonContext";
import {
  fetchRecentComparisons,
  type ComparisonRecord,
  type ComparisonStatus,
} from "@/services/comparisonService";

const STATUS_LABELS: Record<ComparisonStatus, string> = {
  draft: "En curso",
  ready: "Lista",
  analyzed: "Analizada",
};

function formatComparisonDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function HomeScreen() {
  const { user, isLoading, signOut } = useAuth();

  const {
    comparisonId,
    name,
    initialImageUri,
    finalImageUri,
    resetComparison,
  } = useComparison();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentComparisons, setRecentComparisons] = useState<
    ComparisonRecord[]
  >([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const fullName = user?.user_metadata?.full_name;

  const firstName =
    typeof fullName === "string" ? fullName.trim().split(/\s+/)[0] : "";

  const hasDraft =
    comparisonId !== null ||
    name.trim().length > 0 ||
    initialImageUri !== null ||
    finalImageUri !== null;

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      if (!user) {
        setRecentComparisons([]);
        setIsLoadingRecent(false);
        setRecentError(null);
        return () => {
          isActive = false;
        };
      }

      setIsLoadingRecent(true);
      setRecentError(null);

      void fetchRecentComparisons()
        .then((comparisons) => {
          if (isActive) {
            setRecentComparisons(comparisons);
          }
        })
        .catch(() => {
          if (isActive) {
            setRecentComparisons([]);
            setRecentError(
              "No pudimos cargar tus comparaciones. Inténtalo nuevamente.",
            );
          }
        })
        .finally(() => {
          if (isActive) {
            setIsLoadingRecent(false);
          }
        });

      return () => {
        isActive = false;
      };
    }, [reloadToken, user]),
  );

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

  function handleCreateComparison() {
    resetComparison();
    router.push("/new-comparison");
  }

  function handleResumeComparison() {
    if (!comparisonId) {
      router.push("/new-comparison");
      return;
    }

    if (!initialImageUri) {
      router.push("/initial-state");
      return;
    }

    if (!finalImageUri) {
      router.push("/final-state");
      return;
    }

    router.push("/comparison-result");
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

        {hasDraft ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continuar comparación"
            onPress={handleResumeComparison}
            style={({ pressed }) => [
              styles.draftCard,
              pressed && styles.draftCardPressed,
            ]}
          >
            <View style={styles.draftIcon}>
              <Ionicons name="time-outline" size={23} color={Colors.primary} />
            </View>

            <View style={styles.draftContent}>
              <Text style={styles.draftLabel}>COMPARACIÓN EN CURSO</Text>

              <Text style={styles.draftName} numberOfLines={1}>
                {name.trim() || "Comparación sin nombre"}
              </Text>

              <Text style={styles.draftAction}>Continuar comparación</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </Pressable>
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

          <Button label="Crear comparación" onPress={handleCreateComparison} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comparaciones recientes</Text>

          {isLoadingRecent ? (
            <View style={styles.recentFeedbackCard}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.recentFeedbackText}>
                Cargando comparaciones...
              </Text>
            </View>
          ) : recentError ? (
            <View style={styles.recentFeedbackCard}>
              <Ionicons
                name="cloud-offline-outline"
                size={28}
                color={Colors.danger}
              />
              <Text style={styles.recentErrorText}>{recentError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setReloadToken((value) => value + 1)}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : recentComparisons.length > 0 ? (
            <View style={styles.recentList}>
              {recentComparisons.map((comparison) => (
                <View key={comparison.id} style={styles.recentCard}>
                  <View style={styles.recentIcon}>
                    <Ionicons
                      name="images-outline"
                      size={22}
                      color={Colors.primary}
                    />
                  </View>

                  <View style={styles.recentContent}>
                    <Text style={styles.recentName} numberOfLines={1}>
                      {comparison.name}
                    </Text>
                    <Text style={styles.recentDate}>
                      {formatComparisonDate(comparison.created_at)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      comparison.status === "ready" && styles.readyBadge,
                      comparison.status === "analyzed" &&
                        styles.analyzedBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        comparison.status === "ready" && styles.readyText,
                        comparison.status === "analyzed" &&
                          styles.analyzedText,
                      ]}
                    >
                      {STATUS_LABELS[comparison.status]}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
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
                Tus registros aparecerán aquí después de crear tu primera
                comparación.
              </Text>
            </View>
          )}
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

  draftCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
  },

  draftCardPressed: {
    backgroundColor: Colors.primaryMedium,
  },

  draftIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginRight: Spacing.md,
  },

  draftContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },

  draftLabel: {
    color: Colors.primaryDark,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },

  draftName: {
    ...Typography.label,
    color: Colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
  },

  draftAction: {
    color: Colors.primary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: Spacing.sm,
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

  recentFeedbackCard: {
    alignItems: "center",
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
  },

  recentFeedbackText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },

  recentErrorText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.md,
  },

  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
  },

  retryButtonText: {
    ...Typography.label,
    color: Colors.primary,
  },

  recentList: {
    gap: Spacing.md,
  },

  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
  },

  recentIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.md,
  },

  recentContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },

  recentName: {
    ...Typography.label,
    color: Colors.textPrimary,
    fontSize: 15,
  },

  recentDate: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },

  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.warningSoft,
    borderRadius: Radius.full,
  },

  statusText: {
    color: Colors.warning,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },

  readyBadge: {
    backgroundColor: Colors.primarySoft,
  },

  readyText: {
    color: Colors.primary,
  },

  analyzedBadge: {
    backgroundColor: Colors.successSoft,
  },

  analyzedText: {
    color: Colors.success,
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
