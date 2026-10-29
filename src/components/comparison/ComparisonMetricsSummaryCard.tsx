import React, { useState } from "react";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export type ComparisonMetricKey =
  | "similarity"
  | "differences"
  | "confidence"
  | "processingTime";

export type SimilarityAccent = {
  color: string;
  backgroundColor: string;
  borderColor: string;
  label: string;
};

export function getSimilarityAccent(score: number): SimilarityAccent {
  if (score >= 80) {
    return {
      color: Colors.successDark,
      backgroundColor: Colors.successSoft,
      borderColor: Colors.success,
      label: "Alta similitud",
    };
  }

  if (score >= 50) {
    return {
      color: Colors.warning,
      backgroundColor: Colors.warningSoft,
      borderColor: Colors.warning,
      label: "Similitud moderada",
    };
  }

  return {
    color: Colors.danger,
    backgroundColor: Colors.dangerSoft,
    borderColor: Colors.danger,
    label: "Baja similitud",
  };
}

export function triggerMetricFeedback(): Promise<void> {
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export type ComparisonMetricsSummaryCardProps = {
  similarityScore: number;
  totalDifferences: number;
  confidenceScore: number;
  processingTimeMs: number;
  onMetricPress?: (metric: ComparisonMetricKey) => void;
  testID?: string;
};

type MetricDefinition = {
  key: ComparisonMetricKey;
  label: string;
  value: string;
  detail: string;
};

function formatProcessingTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.max(0, Math.round(milliseconds))} ms`;
  }

  return `${(milliseconds / 1000).toFixed(1)} s`;
}

function formatConfidence(score: number): string {
  const percentage = score <= 1 ? score * 100 : score;
  return `${Math.round(Math.max(0, Math.min(100, percentage)))}%`;
}

export function ComparisonMetricsSummaryCard({
  similarityScore,
  totalDifferences,
  confidenceScore,
  processingTimeMs,
  onMetricPress,
  testID = "comparison-metrics-summary-card",
}: ComparisonMetricsSummaryCardProps) {
  const [expandedMetric, setExpandedMetric] =
    useState<ComparisonMetricKey | null>(null);
  const normalizedSimilarity = Math.max(0, Math.min(100, similarityScore));
  const similarityAccent = getSimilarityAccent(normalizedSimilarity);
  const metrics: MetricDefinition[] = [
    {
      key: "similarity",
      label: "Similitud",
      value: `${Math.round(normalizedSimilarity)}%`,
      detail: similarityAccent.label,
    },
    {
      key: "differences",
      label: "Diferencias",
      value: `${Math.max(0, Math.round(totalDifferences))}`,
      detail:
        totalDifferences === 1
          ? "Se detectó un cambio visual"
          : "Cambios visuales detectados",
    },
    {
      key: "confidence",
      label: "Confianza",
      value: formatConfidence(confidenceScore),
      detail: "Seguridad estimada de la inferencia de IA",
    },
    {
      key: "processingTime",
      label: "Procesamiento",
      value: formatProcessingTime(processingTimeMs),
      detail: "Tiempo total del análisis visual",
    },
  ];

  const handleMetricPress = (metric: ComparisonMetricKey) => {
    void triggerMetricFeedback();
    setExpandedMetric((current) => (current === metric ? null : metric));
    onMetricPress?.(metric);
  };

  return (
    <View
      accessibilityLabel={`Resumen de métricas: similitud ${Math.round(normalizedSimilarity)} por ciento, ${Math.max(0, Math.round(totalDifferences))} diferencias, confianza ${formatConfidence(confidenceScore)}`}
      accessibilityRole="summary"
      style={styles.card}
      testID={testID}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ANÁLISIS DE IA</Text>
          <Text style={styles.title}>Resumen de métricas</Text>
        </View>
        <View
          style={[
            styles.similarityBadge,
            {
              backgroundColor: similarityAccent.backgroundColor,
              borderColor: similarityAccent.borderColor,
            },
          ]}
        >
          <Text style={[styles.similarityBadgeText, { color: similarityAccent.color }]}>
            {similarityAccent.label}
          </Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        {metrics.map((metric) => {
          const isSimilarity = metric.key === "similarity";
          const isExpanded = expandedMetric === metric.key;
          return (
            <Pressable
              accessibilityHint={`Muestra más información sobre ${metric.label.toLowerCase()}`}
              accessibilityLabel={`${metric.label}: ${metric.value}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              key={metric.key}
              onPress={() => handleMetricPress(metric.key)}
              style={({ pressed }) => [
                styles.metric,
                isSimilarity && {
                  backgroundColor: similarityAccent.backgroundColor,
                  borderColor: similarityAccent.borderColor,
                },
                pressed && styles.metricPressed,
              ]}
              testID={`${testID}-${metric.key}`}
            >
              <Text
                style={[
                  styles.metricValue,
                  isSimilarity && { color: similarityAccent.color },
                ]}
              >
                {metric.value}
              </Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              {isExpanded ? (
                <Text style={styles.metricDetail}>{metric.detail}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    borderWidth: 1,
    elevation: 3,
    marginVertical: Spacing.md,
    padding: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    ...Typography.label,
    color: Colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  similarityBadge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  similarityBadgeText: {
    ...Typography.label,
    fontSize: 11,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  metric: {
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 88,
    padding: Spacing.md,
  },
  metricPressed: {
    opacity: 0.72,
  },
  metricValue: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
  },
  metricLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metricDetail: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: Spacing.xs,
  },
});
