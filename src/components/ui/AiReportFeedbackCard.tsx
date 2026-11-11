import "@/i18n";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LayoutText } from "@/components/ui/LayoutText";
import { lightColors, type ColorPalette } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";

export type FeedbackRating = "useful" | "not_useful";

export type AiReportFeedbackCardProps = {
  comparisonId?: string;
  initialFeedback?: FeedbackRating | null;
  onFeedbackSelected?: (rating: FeedbackRating) => void;
};

// Almacén en memoria por sesión indexado por ID de comparación
const sessionFeedbackStore = new Map<string, FeedbackRating>();

export function getSessionFeedback(
  comparisonId: string,
): FeedbackRating | null {
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
  const { t } = useTranslation();
  const theme = useTheme();
  const colors = theme?.colors || lightColors;
  const styles = useMemo(() => createStyles(colors), [colors]);

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
        <LayoutText layout="fullWidth" style={styles.title}>
          {t("feedback.title", "¿Te resultó útil este análisis?")}
        </LayoutText>
        <LayoutText layout="fullWidth" style={styles.subtitle}>
          {t(
            "feedback.subtitle",
            "Tu retroalimentación nos ayuda a seguir mejorando la precisión del modelo.",
          )}
        </LayoutText>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityHint={t(
            "feedback.usefulHint",
            "Indica que el análisis comparativo fue útil y preciso",
          )}
          accessibilityLabel={t("feedback.useful", "Útil")}
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
          <LayoutText
            layout="flexible"
            style={[
              styles.buttonText,
              isUsefulSelected && styles.buttonTextActiveUseful,
            ]}
          >
            {t("feedback.useful", "Útil")}
          </LayoutText>
        </Pressable>

        <Pressable
          accessibilityHint={t(
            "feedback.notUsefulHint",
            "Indica que el análisis comparativo necesita mejoras",
          )}
          accessibilityLabel={t("feedback.notUseful", "No útil")}
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
          <LayoutText
            layout="flexible"
            style={[
              styles.buttonText,
              isNotUsefulSelected && styles.buttonTextActiveNotUseful,
            ]}
          >
            {t("feedback.notUseful", "No útil")}
          </LayoutText>
        </Pressable>
      </View>

      {feedback ? (
        <View
          accessibilityLiveRegion="polite"
          style={styles.thankYouBadge}
          testID="feedback-thank-you-message"
        >
          <Text style={styles.thankYouIcon}>🎉</Text>
          <Text textBreakStrategy="simple" style={styles.thankYouText}>
            {t("feedback.thankYou", "¡Gracias por tu retroalimentación!")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      marginTop: Spacing.xl,
      padding: Spacing.lg,
      backgroundColor: colors.surfaceBlue,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
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
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: Spacing.xs,
    },

    subtitle: {
      ...Typography.body,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      textAlign: "center",
    },

    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.md,
    },

    feedbackButton: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      gap: Spacing.xs,
    },

    feedbackButtonActiveUseful: {
      backgroundColor: colors.successSoft,
      borderColor: colors.success,
    },

    feedbackButtonActiveNotUseful: {
      backgroundColor: colors.surfaceSecondary,
      borderColor: colors.borderStrong,
    },

    buttonIcon: {
      fontSize: 16,
    },

    buttonText: {
      ...Typography.label,
      fontSize: 14,
      color: colors.textPrimary,
      textAlign: "center",
    },

    buttonTextActiveUseful: {
      color: colors.successDark,
      fontWeight: "700",
    },

    buttonTextActiveNotUseful: {
      color: colors.textPrimary,
      fontWeight: "700",
    },

    thankYouBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: Spacing.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      backgroundColor: colors.successSoft,
      borderRadius: Radius.md,
      gap: Spacing.xs,
      borderWidth: 1,
      borderColor: colors.success,
      width: "100%",
    },

    thankYouIcon: {
      fontSize: 14,
      lineHeight: 18,
      color: colors.successDark,
      flexShrink: 0,
    },

    thankYouText: {
      ...Typography.label,
      fontSize: 13,
      lineHeight: 18,
      color: colors.successDark,
      fontWeight: "600",
      flex: 1,
      minWidth: 0,
      flexWrap: "wrap",
      textAlign: "center",
    },
  });
}
