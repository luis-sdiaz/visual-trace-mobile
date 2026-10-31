import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { type ColorPalette } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";
import type {
  VisualDifference,
  VisualDifferenceCategory,
} from "@/contracts/geminiAnalysis";
import { CATEGORY_LABELS } from "@/utils/reportExport";
import "@/i18n";
import { localizeAiReportText } from "@/utils/localizeAiReport";

export type DifferenceGroup = {
  category: VisualDifferenceCategory;
  label: string;
  items: string[];
};

export function groupDifferencesByCategory(
  differences: VisualDifference[],
): DifferenceGroup[] {
  const map = new Map<VisualDifferenceCategory, string[]>();
  for (const diff of differences) {
    const list = map.get(diff.category) ?? [];
    list.push(diff.description);
    map.set(diff.category, list);
  }
  return Array.from(map.entries()).map(([category, items]) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    items,
  }));
}

export type AiDifferencesCollapsibleProps = {
  differences: VisualDifference[];
  initialExpanded?: boolean;
};

export function AiDifferencesCollapsible({
  differences,
  initialExpanded = false,
}: AiDifferencesCollapsibleProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const knownTranslations = (i18n.getResource(
    i18n.language,
    "common",
    "aiReport.known",
  ) ?? {}) as Record<string, string>;
  const groups = useMemo(
    () => groupDifferencesByCategory(differences),
    [differences],
  );

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >(() => {
    if (!initialExpanded) return {};
    const init: Record<string, boolean> = {};
    for (const group of groups) {
      init[group.category] = true;
    }
    return init;
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const allExpanded =
    groups.length > 0 &&
    groups.every((g) => Boolean(expandedCategories[g.category]));

  const toggleAll = () => {
    const nextState = !allExpanded;
    const updated: Record<string, boolean> = {};
    for (const g of groups) {
      updated[g.category] = nextState;
    }
    setExpandedCategories(updated);
  };

  if (differences.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>{t("differences.title")}</Text>
        <Text style={styles.emptyText}>{t("differences.empty")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleWithCount}>
          <Text style={styles.sectionTitle}>{t("differences.title")}</Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>
              {differences.length} {differences.length === 1 ? t("differences.change") : t("differences.changes")}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel={
            allExpanded
              ? t("differences.hideAll")
              : t("differences.showAll")
          }
          accessibilityRole="button"
          onPress={toggleAll}
          style={styles.toggleAllButton}
          testID="toggle-all-differences-button"
        >
          <Text style={styles.toggleAllButtonText}>
            {allExpanded ? t("differences.hideAll") : t("differences.showAll")}
          </Text>
        </Pressable>
      </View>

      <View style={styles.cardsList}>
        {groups.map((group) => {
          const isExpanded = Boolean(expandedCategories[group.category]);
          const categoryLabel = {
            added: t("aiReport.categoryAdded"),
            removed: t("aiReport.categoryRemoved"),
            modified: t("aiReport.categoryModified"),
            moved: t("aiReport.categoryMoved"),
            appearance: t("aiReport.categoryAppearance"),
            other: t("aiReport.categoryOther"),
          }[group.category];
          return (
            <View
              key={group.category}
              style={[
                styles.card,
                isExpanded && styles.cardExpanded,
              ]}
              testID={`difference-category-card-${group.category}`}
            >
              <Pressable
                accessibilityHint={t("differences.toggleHint", { label: categoryLabel })}
                accessibilityLabel={`${isExpanded ? t("differences.hideDetails") : t("differences.showDetails")} ${categoryLabel}`}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                onPress={() => toggleCategory(group.category)}
                style={styles.cardHeader}
                testID={`difference-toggle-${group.category}`}
              >
                <View style={styles.headerLeft}>
                  <View style={styles.categoryCountBadge}>
                    <Text style={styles.categoryCountText}>
                      {group.items.length}
                    </Text>
                  </View>
                  <Text style={styles.categoryLabel}>{categoryLabel}</Text>
                </View>

                <View style={styles.toggleAction}>
                  <Text style={styles.toggleText}>
                    {isExpanded ? t("differences.hideDetails") : t("differences.showDetails")}
                  </Text>
                  <Text style={styles.toggleIcon}>{isExpanded ? "▴" : "▾"}</Text>
                </View>
              </Pressable>

              {isExpanded ? (
                <View
                  style={styles.cardBody}
                  testID={`difference-content-${group.category}`}
                >
                  {group.items.map((item, idx) => (
                    <View
                      key={`${group.category}-item-${idx}`}
                      style={styles.detailItem}
                    >
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.detailText}>
                        {localizeAiReportText(item, knownTranslations)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      marginTop: Spacing.xl,
      marginBottom: Spacing.sm,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: Spacing.sm,
    },

    titleWithCount: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },

    sectionTitle: {
      ...Typography.title,
      color: colors.textPrimary,
    },

    totalBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
    },

    totalBadgeText: {
      ...Typography.label,
      fontSize: 12,
      lineHeight: 16,
      color: colors.primary,
      fontWeight: "700",
    },

    toggleAllButton: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
    },

    toggleAllButtonText: {
      ...Typography.label,
      fontSize: 13,
      color: colors.primary,
      fontWeight: "600",
    },

    emptyText: {
      ...Typography.body,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
    },

    cardsList: {
      gap: Spacing.sm,
    },

    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.lg,
      overflow: "hidden",
    },

    cardExpanded: {
      borderColor: colors.borderPrimary,
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: colors.surface,
    },

    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      flex: 1,
      marginRight: Spacing.sm,
    },

    categoryCountBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: Radius.full,
      minWidth: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: Spacing.xs,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
    },

    categoryCountText: {
      ...Typography.label,
      fontSize: 11,
      lineHeight: 14,
      color: colors.primary,
      fontWeight: "700",
    },

    categoryLabel: {
      ...Typography.label,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
      fontWeight: "700",
      flexShrink: 1,
    },

    toggleAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
    },

    toggleText: {
      ...Typography.label,
      fontSize: 12,
      lineHeight: 16,
      color: colors.primary,
      fontWeight: "600",
    },

    toggleIcon: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "700",
    },

    cardBody: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      paddingTop: Spacing.xs,
      backgroundColor: colors.surfaceSecondary,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: Spacing.xs,
    },

    detailItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.surfaceBlue,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      gap: Spacing.xs,
    },

    bullet: {
      ...Typography.body,
      color: colors.primary,
      fontWeight: "700",
      lineHeight: 20,
    },

    detailText: {
      ...Typography.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
      flex: 1,
    },
  });
}
