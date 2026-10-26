import React, { useState } from "react";
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

export type FeedbackRating = "useful" | "not_useful";

export type AiReportFeedbackCardProps = {
  comparisonId?: string;
  initialFeedback?: FeedbackRating | null;
  onFeedbackSelected?: (rating: FeedbackRating) => void;
};

// Almacén en memoria por sesión indexado por ID de comparación
const sessionFeedbackStore = new Map<string, FeedbackRating>();

export function getSessionFeedback(comparisonId: string): FeedbackRating | null {
  return sessionFeedbackStore.get(comparisonId) ?? null;
}

export function setSessionFeedback(
  comparisonId: string,
  rating: FeedbackRating,
): void {
  sessionFeedbackStore.set(comparisonId, rating);
}

export function clearSessionFeedback(): void {
  sessionFeedbackStore.clear();
}

export function AiReportFeedbackCard({
  comparisonId,
  initialFeedback = null,
  onFeedbackSelected,
}: AiReportFeedbackCardProps) {
  const [feedback, setFeedback] = useState<FeedbackRating | null>(() => {
    if (initialFeedback) return initialFeedback;
    if (comparisonId) {
      return getSessionFeedback(comparisonId);
    }
    return null;
  });

  const handleSelect = (rating: FeedbackRating) => {
    setFeedback(rating);
    if (comparisonId) {
      setSessionFeedback(comparisonId, rating);
    }
    onFeedbackSelected?.(rating);
  };

  const isUsefulSelected = feedback === "useful";
  const isNotUsefulSelected = feedback === "not_useful";

  return (
    <View style={styles.card} testID="ai-report-feedback-card">
      <View style={styles.header}>
        <Text style={styles.title}>¿Te resultó útil este análisis?</Text>
        <Text style={styles.subtitle}>
          Tu retroalimentación nos ayuda a seguir mejorando la precisión del modelo.
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityHint="Indica que el análisis comparativo fue útil y preciso"
          accessibilityLabel="Útil"
          accessibilityRole="button"
          accessibilityState={{ selected: isUsefulSelected }}
          onPress={() => handleSelect("useful")}
          style={[
            styles.feedbackButton,
            isUsefulSelected && styles.feedbackButtonActiveUseful,
          ]}
          testID="feedback-useful-button"
        >
          <Text style={styles.buttonIcon}>👍</Text>
          <Text
            style={[
              styles.buttonText,
              isUsefulSelected && styles.buttonTextActiveUseful,
            ]}
          >
            Útil
          </Text>
        </Pressable>

        <Pressable
          accessibilityHint="Indica que el análisis comparativo necesita mejoras"
          accessibilityLabel="No útil"
          accessibilityRole="button"
          accessibilityState={{ selected: isNotUsefulSelected }}
          onPress={() => handleSelect("not_useful")}
          style={[
            styles.feedbackButton,
            isNotUsefulSelected && styles.feedbackButtonActiveNotUseful,
          ]}
          testID="feedback-not-useful-button"
        >
          <Text style={styles.buttonIcon}>👎</Text>
          <Text
            style={[
              styles.buttonText,
              isNotUsefulSelected && styles.buttonTextActiveNotUseful,
            ]}
          >
            No útil
          </Text>
        </Pressable>
      </View>

      {feedback ? (
        <View
          accessibilityLiveRegion="polite"
          style={styles.thankYouBadge}
          testID="feedback-thank-you-message"
        >
          <Text style={styles.thankYouIcon}>🎉</Text>
          <Text style={styles.thankYouText}>
            ¡Gracias por tu retroalimentación!
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.surfaceBlue,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
  },

  header: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },

  title: {
    ...Typography.label,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },

  subtitle: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },

  feedbackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },

  feedbackButtonActiveUseful: {
    backgroundColor: Colors.successSoft,
    borderColor: Colors.success,
  },

  feedbackButtonActiveNotUseful: {
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.borderStrong,
  },

  buttonIcon: {
    fontSize: 16,
  },

  buttonText: {
    ...Typography.label,
    fontSize: 14,
    color: Colors.textPrimary,
  },

  buttonTextActiveUseful: {
    color: Colors.successDark,
    fontWeight: "700",
  },

  buttonTextActiveNotUseful: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },

  thankYouBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.success,
  },

  thankYouIcon: {
    fontSize: 14,
    color: Colors.successDark,
  },

  thankYouText: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.successDark,
    fontWeight: "600",
  },
});

