import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export interface NetworkResilienceBannerProps {
  testID?: string;
  isOnline?: boolean;
  isDemoMode?: boolean;
  onSwitchToDemo?: () => void;
  onRetryConnection?: () => void;
}

export function NetworkResilienceBanner({
  testID = "network-resilience-banner",
  isOnline = true,
  isDemoMode = false,
  onSwitchToDemo,
  onRetryConnection,
}: NetworkResilienceBannerProps) {
  if (isOnline && !isDemoMode) {
    return null;
  }

  const isOfflineAlert = !isOnline && !isDemoMode;

  return (
    <View
      accessibilityLabel="Alerta de resiliencia de red"
      accessibilityRole="alert"
      style={[
        styles.banner,
        isOfflineAlert ? styles.bannerOffline : styles.bannerDemo,
      ]}
      testID={testID}
    >
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.badge,
              isOfflineAlert ? styles.badgeOffline : styles.badgeDemo,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isOfflineAlert ? styles.badgeTextOffline : styles.badgeTextDemo,
              ]}
            >
              {isOfflineAlert ? "SIN RED" : "RESILIENCIA ACTIVA"}
            </Text>
          </View>
          <Text style={styles.title}>
            {isOfflineAlert
              ? "Conexión a internet inestable o caída"
              : "Modo Demostración Académica Activo"}
          </Text>
        </View>

        <Text style={styles.description}>
          {isOfflineAlert
            ? "Para continuar la sustentación sin interrupciones ni latencias de red, activa el modo de simulación académica."
            : "Inferencia instantánea con Gemini y respuestas cacheadas para presentación ininterrumpida."}
        </Text>

        <View style={styles.actionsRow}>
          {isOfflineAlert && onSwitchToDemo ? (
            <Pressable
              accessibilityLabel="Activar Modo Demo"
              accessibilityRole="button"
              onPress={onSwitchToDemo}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionButtonPrimary,
                pressed && styles.pressed,
              ]}
              testID="switch-to-demo-button"
            >
              <Text style={styles.actionButtonPrimaryText}>
                🎓 Activar Modo Demo
              </Text>
            </Pressable>
          ) : null}

          {onRetryConnection ? (
            <Pressable
              accessibilityLabel="Reintentar conexión"
              accessibilityRole="button"
              onPress={onRetryConnection}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionButtonSecondary,
                pressed && styles.pressed,
              ]}
              testID="retry-connection-button"
            >
              <Text style={styles.actionButtonSecondaryText}>
                🔄 Reintentar conexión
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  bannerOffline: {
    backgroundColor: Colors.warningSoft,
    borderColor: Colors.warning,
  },
  bannerDemo: {
    backgroundColor: Colors.surfaceBlue,
    borderColor: Colors.borderPrimary,
  },
  contentContainer: {
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeOffline: {
    backgroundColor: Colors.warning,
  },
  badgeDemo: {
    backgroundColor: Colors.primary,
  },
  badgeText: {
    ...Typography.label,
    fontSize: 10,
    lineHeight: 12,
  },
  badgeTextOffline: {
    color: Colors.white,
  },
  badgeTextDemo: {
    color: Colors.white,
  },
  title: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textPrimary,
  },
  description: {
    ...Typography.body,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonPrimary: {
    backgroundColor: Colors.accent,
  },
  actionButtonPrimaryText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.white,
  },
  actionButtonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonSecondaryText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  pressed: {
    opacity: 0.8,
  },
});

