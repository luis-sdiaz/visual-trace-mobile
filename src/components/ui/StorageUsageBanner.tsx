import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import {
  clearAllImageCache,
  formatBytes,
  getImageCacheMetrics,
  type CacheMetrics,
  type PurgeResult,
} from "@/services/imageCacheService";

export type StorageUsageBannerProps = {
  onPurgeComplete?: (result: PurgeResult) => void;
  testID?: string;
  showClearButton?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function StorageUsageBanner({
  onPurgeComplete,
  testID = "storage-usage-banner",
  showClearButton = true,
  style,
}: StorageUsageBannerProps) {
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [clearedMessage, setClearedMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getImageCacheMetrics().then((data) => {
      if (active) {
        setMetrics(data);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleClearCache = async () => {
    if (isClearing) return;
    setIsClearing(true);
    try {
      const result = await clearAllImageCache();
      setMetrics({
        totalSizeBytes: 0,
        fileCount: 0,
        oldestTimestamp: null,
        newestTimestamp: null,
      });
      setClearedMessage(`Espacio liberado: ${formatBytes(result.freedBytes)}`);
      onPurgeComplete?.(result);

      setTimeout(() => {
        setClearedMessage(null);
      }, 3000);
    } finally {
      setIsClearing(false);
    }
  };

  const totalSizeFormatted = formatBytes(metrics?.totalSizeBytes ?? 0);
  const fileCount = metrics?.fileCount ?? 0;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.contentRow}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>💾</Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Almacenamiento temporal</Text>
          {isLoading ? (
            <Text style={styles.description}>Calculando espacio...</Text>
          ) : clearedMessage ? (
            <Text style={styles.successMessage}>{clearedMessage}</Text>
          ) : (
            <Text style={styles.description}>
              {totalSizeFormatted} en caché ({fileCount}{" "}
              {fileCount === 1 ? "archivo" : "archivos"})
            </Text>
          )}
        </View>

        {showClearButton && fileCount > 0 && !clearedMessage ? (
          <Pressable
            accessibilityHint="Elimina las copias temporales de imágenes para recuperar espacio en el dispositivo"
            accessibilityLabel="Liberar espacio en caché"
            accessibilityRole="button"
            disabled={isClearing || isLoading}
            onPress={() => void handleClearCache()}
            style={({ pressed }) => [
              styles.clearButton,
              (isClearing || isLoading) && styles.disabledButton,
              pressed && styles.clearButtonPressed,
            ]}
            testID="clear-cache-button"
          >
            {isClearing ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={styles.clearButtonText}>Liberar</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  icon: {
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.label,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  description: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  successMessage: {
    fontSize: 12,
    color: Colors.successDark,
    fontWeight: "600",
    marginTop: 2,
  },
  clearButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: Radius.full,
    minHeight: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonPressed: {
    opacity: 0.8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  clearButtonText: {
    ...Typography.label,
    fontSize: 12,
    color: Colors.primary,
  },
});

