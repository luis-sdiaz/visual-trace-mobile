import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  getDemoState,
  setDemoState,
  subscribeDemoConfig,
} from "@/config/demoConfig";
import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export interface DemoModeToggleProps {
  testID?: string;
  compact?: boolean;
  value?: boolean;
  onToggle?: (enabled: boolean) => void;
}

export function toggleDemoMode(
  currentValue?: boolean,
  onToggle?: (enabled: boolean) => void,
): boolean {
  const current =
    currentValue !== undefined ? currentValue : getDemoState().enabled;
  const next = !current;
  setDemoState({ enabled: next });
  onToggle?.(next);
  return next;
}

export function DemoModeToggle({
  testID = "demo-mode-toggle",
  compact = false,
  value,
  onToggle,
}: DemoModeToggleProps) {
  const [internalEnabled, setInternalEnabled] = useState(
    () => getDemoState().enabled,
  );

  const enabled = value !== undefined ? value : internalEnabled;

  useEffect(() => {
    return subscribeDemoConfig((state) => {
      setInternalEnabled(state.enabled);
    });
  }, []);

  function handlePress() {
    toggleDemoMode(enabled, onToggle);
  }

  if (compact) {
    return (
      <Pressable
        accessibilityHint="Alterna entre las llamadas a la API en producción y las respuestas simuladas para sustentación"
        accessibilityLabel="Modo demostración académica"
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        aria-checked={enabled}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.compactContainer,
          enabled ? styles.compactActive : styles.compactInactive,
          pressed && styles.pressed,
        ]}
        testID={testID}
      >
        <Text style={[styles.compactBadge, enabled && styles.compactBadgeActive]}>
          {enabled ? "🎓 DEMO ACTIVO" : "⚡ API REAL"}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityHint="Activa o desactiva las respuestas simuladas y herramientas de resiliencia para sustentación"
      accessibilityLabel="Modo demostración académica"
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      aria-checked={enabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        enabled ? styles.containerActive : styles.containerInactive,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Modo Demostración Académica</Text>
          <View
            style={[
              styles.badge,
              enabled ? styles.badgeActive : styles.badgeInactive,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                enabled ? styles.badgeTextActive : styles.badgeTextInactive,
              ]}
            >
              {enabled ? "ACTIVO" : "INACTIVO"}
            </Text>
          </View>
        </View>
        <Text style={styles.description}>
          {enabled
            ? "Simula inferencia instantánea de Gemini y control de latencia para presentación."
            : "Conexión en vivo con Supabase Edge Functions y Gemini Flash API."}
        </Text>
      </View>

      <View
        style={[
          styles.switchTrack,
          enabled ? styles.switchTrackActive : styles.switchTrackInactive,
        ]}
      >
        <View
          style={[
            styles.switchThumb,
            enabled ? styles.switchThumbActive : styles.switchThumbInactive,
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  containerActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  containerInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginRight: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeActive: {
    backgroundColor: Colors.accent,
  },
  badgeInactive: {
    backgroundColor: Colors.backgroundStrong,
  },
  badgeText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
  },
  badgeTextActive: {
    color: Colors.textInverse,
  },
  badgeTextInactive: {
    color: Colors.textMuted,
  },
  description: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: Radius.full,
    padding: 2,
    justifyContent: "center",
  },
  switchTrackActive: {
    backgroundColor: Colors.accent,
  },
  switchTrackInactive: {
    backgroundColor: Colors.borderStrong,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
  switchThumbInactive: {
    alignSelf: "flex-start",
  },
  compactContainer: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  compactActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  compactInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  compactBadge: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textSecondary,
  },
  compactBadgeActive: {
    color: Colors.accent,
  },
});
