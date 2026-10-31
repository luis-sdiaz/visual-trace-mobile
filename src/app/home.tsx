import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { SettingsModal } from "@/components/ui/SettingsModal";
import { type ColorPalette } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import { useComparison } from "@/context/ComparisonContext";
import { useTheme } from "@/context/ThemeContext";
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

function formatComparisonDate(value: string, locale: string, unavailable: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return unavailable;
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { user, isLoading, signOut } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusLabels: Record<ComparisonStatus, string> = {
    draft: t("homeFilters.draft"),
    ready: t("homeFilters.ready"),
    analyzed: t("homeFilters.analyzed"),
  };
  const statusFilters: { label: string; value: ComparisonStatus | null }[] = [
    { label: t("homeFilters.all"), value: null },
    { label: t("homeFilters.draft"), value: "draft" },
    { label: t("homeFilters.ready"), value: "ready" },
    { label: t("homeFilters.analyzed"), value: "analyzed" },
  ];
  const sortOptions: { label: string; value: ComparisonSortOrder }[] = [
    { label: t("homeFilters.newest"), value: "newest" },
    { label: t("homeFilters.oldest"), value: "oldest" },
  ];

  const {
    comparisonId,
    name,
    initialImageUri,
    finalImageUri,
    restoreComparison,
    resetComparison,
  } = useComparison();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentComparisons, setRecentComparisons] = useState<
    ComparisonRecord[]
  >([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
      refresh?: boolean;
    } = {}) => {
      if (historyRequestInFlightRef.current) return;
      const isActive = options.isActive ?? (() => true);
      if (!user) {
        if (isActive()) {
          setRecentComparisons([]);
          setIsLoadingRecent(false);
          setIsLoadingMore(false);
          setIsRefreshing(false);
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
      const refresh = options.refresh ?? false;
      if (append) setIsLoadingMore(true);
      else if (refresh) setIsRefreshing(true);
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
          if (!append && !refresh) setRecentComparisons([]);
          setRecentError(
            append
              ? t("homeFilters.loadMoreError")
              : refresh
                ? t("homeFilters.refreshError")
              : t("homeFilters.loadError"),
          );
        }
      } finally {
        if (sequence === historySequenceRef.current) {
          historyRequestInFlightRef.current = false;
          if (isActive() && requestUserId === currentUserIdRef.current) {
            if (append) setIsLoadingMore(false);
            else if (refresh) setIsRefreshing(false);
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
        setIsRefreshing(false);
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
      setErrorMessage(t("home.signOutError"));

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
    source?: "history",
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
      } else if (source === "history") {
        router.push({
          pathname: "/comparison-result",
          params: { source: "history" },
        });
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
            t("homeFilters.openError"),
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
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            accessibilityLabel={t("homeFilters.refresh")}
            colors={[colors.primary]}
            onRefresh={() =>
              void loadComparisonHistory({ refresh: true })
            }
            progressBackgroundColor={colors.surface}
            refreshing={isRefreshing}
            tintColor={colors.primary}
            title={t("homeFilters.refreshing")}
            titleColor={colors.textSecondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Text style={[styles.brand, { color: colors.primary }]}>VisualTrace</Text>

          <View style={styles.topBarActions}>
            <Pressable
              accessibilityLabel={t("settings.title")}
              accessibilityRole="button"
              onPress={() => setShowSettingsModal(true)}
              style={({ pressed }) => [
                styles.devSettingsButton,
                pressed && styles.devSettingsButtonPressed,
              ]}
              testID="open-settings-button"
            >
              <Ionicons
                name="settings-outline"
                size={17}
                color={colors.textSecondary}
              />
            </Pressable>

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
                color={colors.textSecondary}
              />

              <Text style={styles.signOutText}>
                {isSigningOut ? t("home.signingOut") : t("home.signOut")}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>{accountGreeting}</Text>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t("home.title")}
          </Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t("home.description")}
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
            accessibilityLabel={t("homeFilters.continue")}
            disabled={openingComparisonId !== null}
            onPress={handleResumeComparison}
            style={({ pressed }) => [
              styles.draftCard,
              pressed && styles.draftCardPressed,
            ]}
          >
            <View style={styles.draftIcon}>
              <Ionicons name="time-outline" size={23} color={colors.primary} />
            </View>

            <View style={styles.draftContent}>
              <Text style={styles.draftLabel}>{t("homeFilters.inProgress")}</Text>

              <Text style={styles.draftName} numberOfLines={1}>
                {name.trim() || t("homeFilters.unnamed")}
              </Text>

              <Text style={styles.draftAction}>
                {openingComparisonId === comparisonId
                  ? t("homeFilters.opening")
                  : t("homeFilters.continue")}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </Pressable>
        ) : null}

        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <View style={styles.actionIcon}>
              <Ionicons
                name="images-outline"
                size={24}
                color={colors.primary}
              />
            </View>

            <View style={styles.actionHeaderText}>
              <Text style={styles.actionTitle}>{t("home.newComparison")}</Text>

              <Text style={styles.actionDescription}>
                {t("home.newComparisonDescription")}
              </Text>
            </View>
          </View>

          <Button label={t("home.createComparison")} onPress={handleCreateComparison} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.history")}</Text>

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={colors.textMuted} />
            <TextInput
              accessibilityLabel={t("homeFilters.search")}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearchText}
              placeholder={t("homeFilters.search")}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={styles.searchInput}
              value={searchText}
            />
            {searchText ? (
              <Pressable
                accessibilityLabel={t("homeFilters.clearSearch")}
                accessibilityRole="button"
                onPress={() => {
                  setSearchText("");
                  setSearchTerm("");
                }}
                style={styles.clearSearchButton}
              >
                <Ionicons name="close-circle" size={21} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <View accessibilityRole="radiogroup" style={styles.filterRow}>
            {statusFilters.map((filter) => {
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
            <Text style={styles.controlLabel}>{t("homeFilters.sortBy")}</Text>
            <View accessibilityRole="radiogroup" style={styles.sortRow}>
              {sortOptions.map((option) => {
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
                color={colors.danger}
              />
              <Text style={styles.openErrorText}>{openError}</Text>
            </View>
          ) : null}

          {isLoadingRecent ? (
            <View style={styles.recentFeedbackCard}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.recentFeedbackText}>
                {t("homeFilters.loading")}
              </Text>
            </View>
          ) : recentError && recentComparisons.length === 0 ? (
            <View style={styles.recentFeedbackCard}>
              <Ionicons
                name="cloud-offline-outline"
                size={28}
                color={colors.danger}
              />
              <Text style={styles.recentErrorText}>{recentError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadComparisonHistory()}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>{t("homeFilters.retry")}</Text>
              </Pressable>
            </View>
          ) : recentComparisons.length > 0 ? (
            <View style={styles.recentList}>
              <FlatList
                data={recentComparisons}
                keyExtractor={(item) => item.id}
                initialNumToRender={6}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews={true}
                scrollEnabled={false}
                renderItem={({ item: comparison }) => (
                  <Pressable
                    key={comparison.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${t("homeFilters.comparison")}: ${comparison.name}`}
                    disabled={openingComparisonId !== null}
                    onPress={() => void handleOpenComparison(comparison.id, false, "history")}
                    style={({ pressed }) => [
                      styles.recentCard,
                      pressed && styles.recentCardPressed,
                    ]}
                  >
                    <View style={styles.recentIcon}>
                      <Ionicons
                        name="images-outline"
                        size={22}
                        color={colors.primary}
                      />
                    </View>

                    <View style={styles.recentContent}>
                      <Text style={styles.recentName} numberOfLines={1}>
                        {comparison.name}
                      </Text>
                      <Text style={styles.recentDate}>
                        {formatComparisonDate(
                          comparison.created_at,
                          i18n.language,
                          t("homeFilters.dateUnavailable"),
                        )}
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
                        {statusLabels[comparison.status]}
                      </Text>
                    </View>

                    {openingComparisonId === comparison.id ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.primary}
                        style={styles.openingIndicator}
                      />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textMuted}
                        style={styles.recentChevron}
                      />
                    )}
                  </Pressable>
                )}
              />
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
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Text style={styles.loadMoreText}>{t("homeFilters.loadMore")}</Text>
                  )}
                </Pressable>
              ) : (
                <Text style={styles.historyEndText}>
                  {t("homeFilters.historyEnd")}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="albums-outline"
                  size={28}
                  color={colors.primary}
                />
              </View>

              <Text style={styles.emptyTitle}>
                {searchTerm || statusFilter
                  ? t("homeFilters.noMatches")
                  : t("homeFilters.noComparisons")}
              </Text>

              <Text style={styles.emptyDescription}>
                {searchTerm || statusFilter
                  ? t("homeFilters.noMatchesHint")
                  : t("homeFilters.empty")}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SettingsModal
        onClose={() => setShowSettingsModal(false)}
        visible={showSettingsModal}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: Spacing.xl,
  },

  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },

  brand: {
    color: colors.primary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
  },

  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.full,
  },

  signOutButtonPressed: {
    backgroundColor: colors.surfaceSecondary,
  },

  signOutText: {
    ...Typography.label,
    color: colors.textSecondary,
    marginLeft: Spacing.xs,
  },

  devSettingsButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.full,
  },

  devSettingsButtonPressed: {
    backgroundColor: colors.surfaceSecondary,
  },

  header: {
    marginBottom: Spacing.xxl,
  },

  greeting: {
    ...Typography.label,
    color: colors.primary,
    marginBottom: Spacing.sm,
  },

  title: {
    ...Typography.heading,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  description: {
    ...Typography.bodyLarge,
    color: colors.textSecondary,
    maxWidth: 340,
  },

  errorCard: {
    padding: Spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },

  errorText: {
    ...Typography.label,
    color: colors.danger,
  },

  draftCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
  },

  draftCardPressed: {
    backgroundColor: colors.primaryMedium,
  },

  draftIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    marginRight: Spacing.md,
  },

  draftContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },

  draftLabel: {
    color: colors.primaryDark,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },

  draftName: {
    ...Typography.label,
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
  },

  draftAction: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: Spacing.sm,
  },

  actionCard: {
    padding: Spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.xl,
    marginBottom: Spacing.xxxl,

    shadowColor: colors.black,
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
    backgroundColor: colors.primarySoft,
    borderRadius: Radius.lg,
    marginRight: Spacing.md,
  },

  actionHeaderText: {
    flex: 1,
  },

  actionTitle: {
    ...Typography.title,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },

  actionDescription: {
    ...Typography.body,
    color: colors.textSecondary,
  },

  section: {
    flex: 1,
  },

  sectionTitle: {
    ...Typography.title,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },

  searchContainer: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.lg,
  },

  searchInput: {
    flex: 1,
    ...Typography.body,
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.full,
  },

  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  filterChipText: {
    ...Typography.label,
    color: colors.textSecondary,
  },

  filterChipTextSelected: {
    color: colors.textInverse,
  },

  sortSection: {
    marginBottom: Spacing.md,
  },

  controlLabel: {
    ...Typography.label,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },

  sortRow: {
    flexDirection: "row",
    padding: Spacing.xs,
    backgroundColor: colors.backgroundStrong,
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
    backgroundColor: colors.surface,
  },

  sortOptionText: {
    ...Typography.label,
    color: colors.textSecondary,
  },

  sortOptionTextSelected: {
    color: colors.primary,
  },

  openErrorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: Radius.md,
  },

  openErrorText: {
    flex: 1,
    ...Typography.label,
    color: colors.danger,
    marginLeft: Spacing.sm,
  },

  recentFeedbackCard: {
    alignItems: "center",
    padding: Spacing.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.xl,
  },

  recentFeedbackText: {
    ...Typography.body,
    color: colors.textSecondary,
    marginTop: Spacing.md,
  },

  recentErrorText: {
    ...Typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.md,
  },

  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: Radius.full,
  },

  retryButtonText: {
    ...Typography.label,
    color: colors.primary,
  },

  recentList: {
    gap: Spacing.md,
  },

  loadMoreButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderPrimary,
    borderRadius: Radius.lg,
    backgroundColor: colors.primarySoft,
  },

  loadMoreText: {
    ...Typography.label,
    color: colors.primary,
  },

  loadMoreError: {
    ...Typography.body,
    color: colors.danger,
    textAlign: "center",
  },

  historyEndText: {
    ...Typography.label,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: Spacing.sm,
  },

  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.lg,
  },

  recentCardPressed: {
    backgroundColor: colors.surfaceSecondary,
  },

  recentIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: Radius.md,
  },

  recentContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },

  recentName: {
    ...Typography.label,
    color: colors.textPrimary,
    fontSize: 15,
  },

  recentDate: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },

  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: colors.warningSoft,
    borderRadius: Radius.full,
  },

  statusText: {
    color: colors.warning,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },

  readyBadge: {
    backgroundColor: colors.primarySoft,
  },

  readyText: {
    color: colors.primary,
  },

  analyzedBadge: {
    backgroundColor: colors.successSoft,
  },

  analyzedText: {
    color: colors.success,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.xl,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },

  emptyTitle: {
    ...Typography.title,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  emptyDescription: {
    ...Typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
});

}