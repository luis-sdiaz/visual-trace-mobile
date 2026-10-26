import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export const DEFAULT_ERROR_FALLBACK_TITLE =
  "Ocurrió un inconveniente al procesar el análisis";

export const DEFAULT_ERROR_SUGGESTIONS: string[] = [
  "Espera unos segundos y reintenta la solicitud.",
  "Comprueba que las fotografías inicial y final estén cargadas correctamente.",
  "Verifica la disponibilidad del servicio con Google Gemini en la nube.",
];

export type AiAnalysisErrorFallbackCardProps = {
  errorMessage?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  title?: string;
  suggestions?: string[];
  initialShowDetails?: boolean;
  testID?: string;
};

export function AiAnalysisErrorFallbackCard({
  errorMessage,
  onRetry,
  isRetrying = false,
  title = DEFAULT_ERROR_FALLBACK_TITLE,
  suggestions = DEFAULT_ERROR_SUGGESTIONS,
  initialShowDetails = false,
  testID = "ai-analysis-error-fallback-card",
}: AiAnalysisErrorFallbackCardProps) {
  const [showDetails, setShowDetails] = useState(initialShowDetails);

  const toggleDetails = () => {
    setShowDetails((prev) => !prev);
  };

  return (
    <View
      accessibilityLabel={title}
      accessibilityRole="alert"
      style={styles.card}
      testID={testID}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>⚠️</Text>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Error de IA</Text>
          </View>
        </View>
      </View>

      <Text style={styles.suggestionsHeader}>Sugerencias de solución:</Text>
      <View style={styles.suggestionsList}>
        {suggestions.map((suggestion, index) => (
          <View key={`suggestion-${index}`} style={styles.suggestionRow}>
            <Text style={styles.suggestionBullet}>•</Text>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        ))}
      </View>

      {onRetry ? (
        <Pressable
          accessibilityHint="Vuelve a solicitar el procesamiento de inferencia visual con IA"
          accessibilityLabel="Reintentar análisis"
          accessibilityRole="button"
          disabled={isRetrying}
          onPress={onRetry}
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          testID="retry-analysis-button"
        >
          {isRetrying ? (
            <ActivityIndicator color={Colors.textInverse} size="small" />
          ) : (
            <Text style={styles.retryButtonText}>Reintentar análisis</Text>
          )}
        </Pressable>
      ) : null}

      {errorMessage ? (
        <View style={styles.detailsContainer}>
          <Pressable
            accessibilityHint="Muestra u oculta la descripción técnica del error devuelto"
            accessibilityLabel={
              showDetails ? "Ocultar detalles técnicos" : "Ver detalles técnicos"
            }
            accessibilityRole="button"
            accessibilityState={{ expanded: showDetails }}
            onPress={toggleDetails}
            style={styles.toggleButton}
            testID="toggle-error-details-button"
          >
            <Text style={styles.toggleButtonText}>
              {showDetails
                ? "Ocultar detalles técnicos ▴"
                : "Ver detalles técnicos ▾"}
            </Text>
          </Pressable>

          {showDetails ? (
            <View
              style={styles.technicalPanel}
              testID="error-technical-details"
            >
              <Text style={styles.technicalLabel}>Mensaje del sistema:</Text>
              <Text selectable style={styles.technicalText}>
                {errorMessage}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dangerSoft,
    borderColor: Colors.danger,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },

  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },

  iconText: {
    fontSize: 16,
  },

  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },

  title: {
    ...Typography.title,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
    flex: 1,
  },

  badge: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.danger,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },

  badgeText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.danger,
    fontWeight: "700",
  },

  suggestionsHeader: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textPrimary,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },

  suggestionsList: {
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },

  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: Spacing.xs,
  },

  suggestionBullet: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },

  suggestionText: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    flex: 1,
  },

  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  retryButtonDisabled: {
    opacity: 0.6,
  },

  retryButtonText: {
    ...Typography.button,
    fontSize: 14,
    color: Colors.textInverse,
  },

  detailsContainer: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },

  toggleButton: {
    alignSelf: "flex-start",
    paddingVertical: Spacing.xs,
  },

  toggleButtonText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.primaryDark,
    fontWeight: "600",
  },

  technicalPanel: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },

  technicalLabel: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },

  technicalText: {
    ...Typography.body,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textPrimary,
    fontFamily: "monospace",
  },
});

