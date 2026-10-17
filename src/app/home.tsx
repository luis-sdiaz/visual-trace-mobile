import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import { useComparison } from "@/context/ComparisonContext";
import {
  fetchComparisonPage,
  isComparisonComplete,
  mergeComparisonPages,
  type ComparisonPageCursor,
  type ComparisonRecord,
  type ComparisonSortOrder,
  type ComparisonStatus,
} from "@/services/comparisonService";
import { recoverComparison } from "@/services/comparisonRecoveryService";
import { getAccountGreeting } from "@/utils/accountDisplay";

const STATUS_LABELS: Record<ComparisonStatus, string> = {
  draft: "En curso",
  ready: "Lista",
  analyzed: "Analizada",
};

const STATUS_FILTERS: { label: string; value: ComparisonStatus | null }[] = [
  { label: "Todas", value: null },
  { label: "En curso", value: "draft" },
  { label: "Listas", value: "ready" },
  { label: "Analizadas", value: "analyzed" },
];

const SORT_OPTIONS: { label: string; value: ComparisonSortOrder }[] = [
  { label: "Más recientes", value: "newest" },
  { label: "Más antiguas", value: "oldest" },
];

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
    restoreComparison,
    resetComparison,
  } = useComparison();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentComparisons, setRecentComparisons] = useState<
    ComparisonRecord[]
  >([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreComparisons, setHasMoreComparisons] = useState(false);
  const [nextComparisonCursor, setNextComparisonCursor] =
    useState<ComparisonPageCursor | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ComparisonStatus | null>(null);
  const [sortOrder, setSortOrder] = useState<ComparisonSortOrder>("newest");
  const [openingComparison, setOpeningComparison] = useState<{
    id: string;
    userId: string;
  } | null>(null);
  const [openErrorState, setOpenErrorState] = useState<{
    message: string;
    userId: string;
  } | null>(null);
  const openSequenceRef = useRef(0);
  const historySequenceRef = useRef(0);
  const historyRequestInFlightRef = useRef(false);
  const currentUserIdRef = useRef(user?.id);

  const openingComparisonId =
    openingComparison && openingComparison.userId === user?.id
      ? openingComparison.id
      : null;
  const openError =
    openErrorState && openErrorState.userId === user?.id
      ? openErrorState.message
      : null;

  const accountGreeting = getAccountGreeting(user?.user_metadata);

  const hasDraftData =
    comparisonId !== null ||
    name.trim().length > 0 ||
    initialImageUri !== null ||
    finalImageUri !== null;

  const currentServerComparison = recentComparisons.find(
    (comparison) => comparison.id === comparisonId,
  );

  const hasDraft =
    hasDraftData &&
    !isLoadingRecent &&
    (recentError !== null ||
      !currentServerComparison ||
      !isComparisonComplete(currentServerComparison));

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
  }, [isLoading, user]);

  useLayoutEffect(() => {
    currentUserIdRef.current = user?.id;
    openSequenceRef.current += 1;
  }, [user?.id]);

  useEffect(() => {
    const timeout = setTimeout(() => setSearchTerm(searchText.trim()), 350);
    return () => clearTimeout(timeout);
  }, [searchText]);

  const loadComparisonHistory = useCallback(
    async (options: {
      append?: boolean;
      cursor?: ComparisonPageCursor | null;
      isActive?: () => boolean;
    } = {}) => {
      if (historyRequestInFlightRef.current) return;
      const isActive = options.isActive ?? (() => true);
      if (!user) {
        if (isActive()) {
          setRecentComparisons([]);
          setIsLoadingRecent(false);
          setIsLoadingMore(false);
          setHasMoreComparisons(false);
          setNextComparisonCursor(null);
          setRecentError(null);
        }
        return;
      }

      historyRequestInFlightRef.current = true;
      const sequence = ++historySequenceRef.current;
      const requestUserId = user.id;
      const append = options.append ?? false;
      if (append) setIsLoadingMore(true);
      else setIsLoadingRecent(true);
      setRecentError(null);

      try {
        const page = await fetchComparisonPage({
          cursor: options.cursor,
          search: searchTerm,
          sort: sortOrder,
          status: statusFilter,
        });

        if (
          isActive() &&
          sequence === historySequenceRef.current &&
          requestUserId === currentUserIdRef.current
        ) {
          setRecentComparisons((current) =>
            append
              ? mergeComparisonPages(current, page.comparisons)
              : page.comparisons,
          );
          setHasMoreComparisons(page.hasMore);
          setNextComparisonCursor(page.nextCursor);
        }
      } catch {
        if (
          isActive() &&
          sequence === historySequenceRef.current &&
          requestUserId === currentUserIdRef.current
        ) {
          if (!append) setRecentComparisons([]);
          setRecentError(
            append
              ? "No pudimos cargar más comparaciones. Inténtalo nuevamente."
              : "No pudimos cargar tus comparaciones. Inténtalo nuevamente.",
          );
        }
      } finally {
        if (sequence === historySequenceRef.current) {
          historyRequestInFlightRef.current = false;
          if (isActive() && requestUserId === currentUserIdRef.current) {
            if (append) setIsLoadingMore(false);
            else setIsLoadingRecent(false);
          }
        }
      }
    },
    [searchTerm, sortOrder, statusFilter, user],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void loadComparisonHistory({ isActive: () => isActive });

      return () => {
        isActive = false;
        historySequenceRef.current += 1;
        historyRequestInFlightRef.current = false;
      };
    }, [loadComparisonHistory]),
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

  async function handleOpenComparison(
    id: string,
    preserveLocalImages = false,
  ) {
    if (openingComparisonId) {
      return;
    }

    const openSequence = ++openSequenceRef.current;
    const requestUserId = user?.id;

    if (!requestUserId) {
      return;
    }

    setOpeningComparison({ id, userId: requestUserId });
    setOpenErrorState(null);

    try {
      const {
        comparison,
        initialImageUri: storedInitialImage,
        finalImageUri: storedFinalImage,
      } = await recoverComparison(id);

      if (
        openSequence !== openSequenceRef.current ||
        requestUserId !== currentUserIdRef.current
      ) {
        return;
      }

      const resolvedInitialImage =
        storedInitialImage ??
        (preserveLocalImages && comparisonId === id ? initialImageUri : null);
      const resolvedFinalImage =
        storedFinalImage ??
        (preserveLocalImages && comparisonId === id ? finalImageUri : null);

      restoreComparison({
        comparisonId: comparison.id,
        name: comparison.name,
        initialImageUri: resolvedInitialImage,
        initialImagePath: comparison.initial_image_path,
        initialImageIsDirty: false,
        finalImageUri: resolvedFinalImage,
        finalImagePath: comparison.final_image_path,
        finalImageIsDirty: false,
        initialImageIsTransient: storedInitialImage !== null,
        finalImageIsTransient: storedFinalImage !== null,
      });

      if (!comparison.initial_image_path) {
        router.push("/initial-state");
      } else if (!comparison.final_image_path) {
        router.push("/final-state");
      } else {
        router.push("/comparison-result");
      }
    } catch {
      if (
        openSequence === openSequenceRef.current &&
        requestUserId === currentUserIdRef.current
      ) {
        setOpenErrorState({
          userId: requestUserId,
          message:
            "No pudimos abrir esta comparación. Verifica tu conexión y que sus fotografías sigan disponibles.",
        });
      }
    } finally {
      if (
        openSequence === openSequenceRef.current &&
        requestUserId === currentUserIdRef.current
      ) {
        setOpeningComparison(null);
      }
    }
  }

  function handleResumeComparison() {
    if (!comparisonId) {
      router.push("/new-comparison");
      return;
    }

    void handleOpenComparison(comparisonId, true);
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
          <Text style={styles.greeting}>{accountGreeting}</Text>

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
            disabled={openingComparisonId !== null}
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

              <Text style={styles.draftAction}>
                {openingComparisonId === comparisonId
                  ? "Abriendo..."
                  : "Continuar comparación"}
              </Text>
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
          <Text style={styles.sectionTitle}>Historial de comparaciones</Text>

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
            <TextInput
              accessibilityLabel="Buscar comparaciones por nombre"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearchText}
              placeholder="Buscar por nombre"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="search"
              style={styles.searchInput}
              value={searchText}
            />
            {searchText ? (
              <Pressable
                accessibilityLabel="Limpiar búsqueda"
                accessibilityRole="button"
                onPress={() => {
                  setSearchText("");
                  setSearchTerm("");
                }}
                style={styles.clearSearchButton}
              >
                <Ionicons name="close-circle" size={21} color={Colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <View accessibilityRole="radiogroup" style={styles.filterRow}>
            {STATUS_FILTERS.map((filter) => {
              const selected = statusFilter === filter.value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={filter.label}
                  onPress={() => setStatusFilter(filter.value)}
                  style={[styles.filterChip, selected && styles.filterChipSelected]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selected && styles.filterChipTextSelected,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sortSection}>
            <Text style={styles.controlLabel}>Ordenar por</Text>
            <View accessibilityRole="radiogroup" style={styles.sortRow}>
              {SORT_OPTIONS.map((option) => {
                const selected = sortOrder === option.value;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={option.value}
                    onPress={() => setSortOrder(option.value)}
                    style={[styles.sortOption, selected && styles.sortOptionSelected]}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        selected && styles.sortOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {openError ? (
            <View style={styles.openErrorCard}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={Colors.danger}
              />
              <Text style={styles.openErrorText}>{openError}</Text>
            </View>
          ) : null}

          {isLoadingRecent ? (
            <View style={styles.recentFeedbackCard}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.recentFeedbackText}>
                Cargando comparaciones...
              </Text>
            </View>
          ) : recentError && recentComparisons.length === 0 ? (
            <View style={styles.recentFeedbackCard}>
              <Ionicons
                name="cloud-offline-outline"
                size={28}
                color={Colors.danger}
              />
              <Text style={styles.recentErrorText}>{recentError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadComparisonHistory()}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : recentComparisons.length > 0 ? (
            <View style={styles.recentList}>
              {recentComparisons.map((comparison) => (
                <Pressable
                  key={comparison.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${comparison.name}`}
                  disabled={openingComparisonId !== null}
                  onPress={() => void handleOpenComparison(comparison.id)}
                  style={({ pressed }) => [
                    styles.recentCard,
                    pressed && styles.recentCardPressed,
                  ]}
                >
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

                  {openingComparisonId === comparison.id ? (
                    <ActivityIndicator
                      size="small"
                      color={Colors.primary}
                      style={styles.openingIndicator}
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={Colors.textMuted}
                      style={styles.recentChevron}
                    />
                  )}
                </Pressable>
              ))}
              {recentError ? (
                <Text style={styles.loadMoreError}>{recentError}</Text>
              ) : null}
              {hasMoreComparisons && nextComparisonCursor ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={isLoadingMore}
                  onPress={() =>
                    void loadComparisonHistory({
                      append: true,
                      cursor: nextComparisonCursor,
                    })
                  }
                  style={styles.loadMoreButton}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator color={Colors.primary} />
                  ) : (
                    <Text style={styles.loadMoreText}>Cargar más</Text>
                  )}
                </Pressable>
              ) : (
                <Text style={styles.historyEndText}>
                  No hay más comparaciones para mostrar.
                </Text>
              )}
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

              <Text style={styles.emptyTitle}>
                {searchTerm || statusFilter
                  ? "No encontramos coincidencias"
                  : "Aún no tienes comparaciones"}
              </Text>

              <Text style={styles.emptyDescription}>
                {searchTerm || statusFilter
                  ? "Prueba con otros criterios o selecciona Todas."
                  : "Tus registros aparecerán aquí después de crear tu primera comparación."}
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

  searchContainer: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
  },

  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },

  clearSearchButton: {
    minWidth: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },

  filterChip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
  },

  filterChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  filterChipText: {
    ...Typography.label,
    color: Colors.textSecondary,
  },

  filterChipTextSelected: {
    color: Colors.textInverse,
  },

  sortSection: {
    marginBottom: Spacing.md,
  },

  controlLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },

  sortRow: {
    flexDirection: "row",
    padding: Spacing.xs,
    backgroundColor: Colors.backgroundStrong,
    borderRadius: Radius.lg,
  },

  sortOption: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
  },

  sortOptionSelected: {
    backgroundColor: Colors.surface,
  },

  sortOptionText: {
    ...Typography.label,
    color: Colors.textSecondary,
  },

  sortOptionTextSelected: {
    color: Colors.primary,
  },

  openErrorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radius.md,
  },

  openErrorText: {
    flex: 1,
    ...Typography.label,
    color: Colors.danger,
    marginLeft: Spacing.sm,
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

  loadMoreButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
  },

  loadMoreText: {
    ...Typography.label,
    color: Colors.primary,
  },

  loadMoreError: {
    ...Typography.body,
    color: Colors.danger,
    textAlign: "center",
  },

  historyEndText: {
    ...Typography.label,
    color: Colors.textMuted,
    textAlign: "center",
    paddingVertical: Spacing.sm,
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

  recentCardPressed: {
    backgroundColor: Colors.surfaceSecondary,
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

  openingIndicator: {
    marginLeft: Spacing.sm,
  },

  recentChevron: {
    marginLeft: Spacing.sm,
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
