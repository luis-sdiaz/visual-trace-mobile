import React from "react";
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

export const DEFAULT_OFFLINE_BANNER_TITLE =
  "Sin conexión a internet para el análisis de IA";

export const DEFAULT_OFFLINE_BANNER_DESCRIPTION =
  "No se detecta conexión a internet. Verifica tu red Wi-Fi o datos móviles para continuar con el análisis de IA. Tus fotografías locales se mantienen seguras.";

export type AiOfflineResilienceBannerProps = {
  onRetry?: () => void;
  isRetrying?: boolean;
  title?: string;
  description?: string;
  testID?: string;
};

export function AiOfflineResilienceBanner({
  onRetry,
  isRetrying = false,
  title = DEFAULT_OFFLINE_BANNER_TITLE,
  description = DEFAULT_OFFLINE_BANNER_DESCRIPTION,
  testID = "ai-offline-resilience-banner",
}: AiOfflineResilienceBannerProps) {
  return (
    <View
      accessibilityLabel={title}
      accessibilityRole="alert"
      style={styles.card}
      testID={testID}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>⚡</Text>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Offline</Text>
          </View>
        </View>
      </View>

      <Text style={styles.description}>{description}</Text>

      {onRetry ? (
        <Pressable
          accessibilityHint="Vuelve a intentar invocar el análisis de IA una vez restablecida la conectividad"
          accessibilityLabel="Reintentar conexión"
          accessibilityRole="button"
          disabled={isRetrying}
          onPress={onRetry}
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          testID="retry-network-action-button"
        >
          {isRetrying ? (
            <ActivityIndicator color={Colors.textInverse} size="small" />
          ) : (
            <Text style={styles.retryButtonText}>Reintentar</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceBlue,
    borderColor: Colors.borderStrong,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },

  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },

  iconText: {
    color: Colors.secondary,
    fontWeight: "800",
    fontSize: 14,
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
    backgroundColor: Colors.secondarySoft,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },

  badgeText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.secondary,
    fontWeight: "700",
  },

  description: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
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
});

