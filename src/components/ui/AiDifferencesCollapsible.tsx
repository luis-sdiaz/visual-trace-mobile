import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import type {
  VisualDifference,
  VisualDifferenceCategory,
} from "@/contracts/geminiAnalysis";
import { CATEGORY_LABELS } from "@/utils/reportExport";

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
        <Text style={styles.sectionTitle}>Diferencias detectadas</Text>
        <Text style={styles.emptyText}>No se identificaron cambios visibles.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleWithCount}>
          <Text style={styles.sectionTitle}>Diferencias detectadas</Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>
              {differences.length} {differences.length === 1 ? "cambio" : "cambios"}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel={
            allExpanded
              ? "Ocultar todos los detalles de diferencias"
              : "Ver todos los detalles de diferencias"
          }
          accessibilityRole="button"
          onPress={toggleAll}
          style={styles.toggleAllButton}
          testID="toggle-all-differences-button"
        >
          <Text style={styles.toggleAllButtonText}>
            {allExpanded ? "Ocultar todo" : "Ver todo"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.cardsList}>
        {groups.map((group) => {
          const isExpanded = Boolean(expandedCategories[group.category]);
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
                accessibilityHint={`Alterna la visualización de los detalles para ${group.label}`}
                accessibilityLabel={`${isExpanded ? "Ocultar detalles" : "Ver detalles"} de ${group.label}`}
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
                  <Text style={styles.categoryLabel}>{group.label}</Text>
                </View>

                <View style={styles.toggleAction}>
                  <Text style={styles.toggleText}>
                    {isExpanded ? "Ocultar detalles" : "Ver detalles"}
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
                      <Text style={styles.detailText}>{item}</Text>
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

const styles = StyleSheet.create({
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
    color: Colors.textPrimary,
  },

  totalBadge: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
  },

  totalBadgeText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.primaryDark,
    fontWeight: "700",
  },

  toggleAllButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },

  toggleAllButtonText: {
    ...Typography.label,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
  },

  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  cardsList: {
    gap: Spacing.sm,
  },

  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    overflow: "hidden",
  },

  cardExpanded: {
    borderColor: Colors.borderPrimary,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },

  categoryCountBadge: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
  },

  categoryCountText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.primaryDark,
    fontWeight: "700",
  },

  categoryLabel: {
    ...Typography.label,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textPrimary,
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
    color: Colors.primary,
    fontWeight: "600",
  },

  toggleIcon: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "700",
  },

  cardBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
    backgroundColor: Colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.xs,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.surfaceBlue,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },

  bullet: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: "700",
    lineHeight: 20,
  },

  detailText: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
    flex: 1,
  },
});

