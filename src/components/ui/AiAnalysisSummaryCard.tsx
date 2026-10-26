import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import type {
  GeminiAnalysisReport,
  VisualDifference,
} from "@/contracts/geminiAnalysis";
import type { AnalysisReportRecord } from "@/services/analysisService";

export type VisualSeverityLevel = "none" | "minor" | "moderate" | "significant";

export type VisualSeverityBadgeText =
  | "Sin cambios"
  | "Menor"
  | "Moderado"
  | "Significativo";

export type VisualSeverityInfo = {
  level: VisualSeverityLevel;
  badgeText: VisualSeverityBadgeText;
  title: string;
  description: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  statusLabel: string;
};

/**
 * Calcula la severidad e impacto visual derivado del total y categorías de las diferencias.
 */
export function calculateVisualSeverity(
  differences: VisualDifference[],
  hasVisibleChanges = true,
): VisualSeverityInfo {
  if (!hasVisibleChanges || !differences || differences.length === 0) {
    return {
      level: "none",
      badgeText: "Sin cambios",
      title: "Sin discrepancias detectadas",
      description:
        "Ambas fotografías representan el mismo estado visual sin alteraciones detectadas.",
      color: Colors.successDark,
      backgroundColor: Colors.successSoft,
      borderColor: Colors.success,
      statusLabel: "Sin alteraciones",
    };
  }

  // Peso por categoría según impacto físico o estructural
  let score = 0;
  for (const diff of differences) {
    switch (diff.category) {
      case "removed":
        score += 3;
        break;
      case "added":
      case "modified":
        score += 2;
        break;
      case "moved":
      case "appearance":
      case "other":
      default:
        score += 1;
        break;
    }
  }

  const count = differences.length;

  if (count <= 2 && score <= 3) {
    return {
      level: "minor",
      badgeText: "Menor",
      title: "Impacto visual menor",
      description:
        "Discrepancias puntuales o de baja escala que no alteran la estructura general.",
      color: Colors.primaryDark,
      backgroundColor: Colors.primarySoft,
      borderColor: Colors.borderPrimary,
      statusLabel: "Cambios leves",
    };
  }

  if (count <= 4 && score <= 7) {
    return {
      level: "moderate",
      badgeText: "Moderado",
      title: "Impacto visual moderado",
      description:
        "Modificaciones apreciables que alteran el estado o composición visual.",
      color: Colors.warning,
      backgroundColor: Colors.warningSoft,
      borderColor: Colors.warning,
      statusLabel: "Cambios moderados",
    };
  }

  return {
    level: "significant",
    badgeText: "Significativo",
    title: "Impacto visual significativo",
    description:
      "Múltiples diferencias estructurales o cambios de alta relevancia detectados.",
    color: Colors.danger,
    backgroundColor: Colors.dangerSoft,
    borderColor: Colors.danger,
    statusLabel: "Cambios relevantes",
  };
}

export type AiAnalysisSummaryCardProps = {
  report?: AnalysisReportRecord | GeminiAnalysisReport | null;
  testID?: string;
};

export function AiAnalysisSummaryCard({
  report,
  testID = "ai-analysis-summary-card",
}: AiAnalysisSummaryCardProps) {
  const geminiReport: GeminiAnalysisReport | null = useMemo(() => {
    if (!report) return null;
    if ("result" in report && report.result) {
      return report.result;
    }
    if ("hasVisibleChanges" in report) {
      return report as GeminiAnalysisReport;
    }
    return null;
  }, [report]);

  const severity = useMemo(() => {
    if (!geminiReport) return null;
    return calculateVisualSeverity(
      geminiReport.differences,
      geminiReport.hasVisibleChanges,
    );
  }, [geminiReport]);

  const uniqueCategoriesCount = useMemo(() => {
    if (!geminiReport?.differences) return 0;
    return new Set(geminiReport.differences.map((d) => d.category)).size;
  }, [geminiReport]);

  if (!geminiReport || !severity) {
    return null;
  }

  const totalDifferences = geminiReport.differences?.length ?? 0;

  return (
    <View
      accessibilityLabel={`Resumen de impacto visual: ${severity.badgeText}. ${totalDifferences} diferencias detectadas.`}
      accessibilityRole="summary"
      style={styles.card}
      testID={testID}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEyebrow}>EVALUACIÓN DE IMPACTO</Text>
          <Text style={styles.headerTitle}>{severity.title}</Text>
        </View>

        <View
          style={[
            styles.severityBadge,
            {
              backgroundColor: severity.backgroundColor,
              borderColor: severity.borderColor,
            },
          ]}
          testID="severity-level-badge"
        >
          <Text style={[styles.severityBadgeText, { color: severity.color }]}>
            {severity.badgeText}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{severity.description}</Text>

      <View style={styles.metricsRow}>
        <View style={styles.metricItem} testID="total-findings-indicator">
          <Text style={styles.metricValue}>{totalDifferences}</Text>
          <Text style={styles.metricLabel}>
            {totalDifferences === 1 ? "Hallazgo" : "Hallazgos"}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem} testID="comparison-status-indicator">
          <Text
            numberOfLines={1}
            style={[styles.metricValueText, { color: severity.color }]}
          >
            {severity.statusLabel}
          </Text>
          <Text style={styles.metricLabel}>Estado general</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem} testID="affected-categories-indicator">
          <Text style={styles.metricValue}>{uniqueCategoriesCount}</Text>
          <Text style={styles.metricLabel}>
            {uniqueCategoriesCount === 1 ? "Categoría" : "Categorías"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },

  headerLeft: {
    flex: 1,
  },

  headerEyebrow: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  headerTitle: {
    ...Typography.title,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textPrimary,
  },

  severityBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  severityBadgeText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },

  description: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },

  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },

  metricItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },

  metricValue: {
    ...Typography.title,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  metricValueText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  metricLabel: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

