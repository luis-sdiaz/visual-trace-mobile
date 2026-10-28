import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  getDemoState,
  resetDemoConfig,
  setDemoState,
  subscribeDemoConfig,
  type DemoMockScenario,
  type DemoNetworkCondition,
} from "@/config/demoConfig";
import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export interface DevErrorInjectionPanelProps {
  testID?: string;
  onConditionChange?: (condition: DemoNetworkCondition) => void;
  onScenarioChange?: (scenario: DemoMockScenario) => void;
  onLatencyChange?: (latencyMs: number) => void;
}

const NETWORK_CONDITIONS: { label: string; value: DemoNetworkCondition }[] = [
  { label: "Normal (200 OK)", value: "normal" },
  { label: "Red lenta (1.5s)", value: "slow" },
  { label: "Cuota 429", value: "error_429" },
  { label: "Servidor 500", value: "error_500" },
  { label: "Offline total", value: "offline" },
];

const LATENCY_OPTIONS: { label: string; value: number }[] = [
  { label: "0 ms", value: 0 },
  { label: "500 ms", value: 500 },
  { label: "1500 ms", value: 1500 },
  { label: "3000 ms", value: 3000 },
];

const SCENARIO_OPTIONS: { label: string; value: DemoMockScenario }[] = [
  { label: "Cambios detectados", value: "changes_detected" },
  { label: "Sin cambios", value: "no_changes" },
  { label: "Falla estructural", value: "structural_defect" },
  { label: "Cosmético leve", value: "minor_cosmetic" },
];

export function DevErrorInjectionPanel({
  testID = "dev-error-injection-panel",
  onConditionChange,
  onScenarioChange,
  onLatencyChange,
}: DevErrorInjectionPanelProps) {
  const [demoState, setDemoStateInternal] = useState(() => getDemoState());

  useEffect(() => {
    return subscribeDemoConfig((state) => {
      setDemoStateInternal(state);
    });
  }, []);

  function handleSelectCondition(condition: DemoNetworkCondition) {
    setDemoState({ networkCondition: condition });
    onConditionChange?.(condition);
  }

  function handleSelectScenario(scenario: DemoMockScenario) {
    setDemoState({ selectedScenario: scenario });
    onScenarioChange?.(scenario);
  }

  function handleSelectLatency(latencyMs: number) {
    setDemoState({ mockLatencyMs: latencyMs });
    onLatencyChange?.(latencyMs);
  }

  function handleReset() {
    resetDemoConfig();
  }

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.badge}>PANEL DEV / SUSTENTACIÓN</Text>
          <Text style={styles.title}>Inyección de Estados y Fallos</Text>
        </View>
        <Text style={styles.subtitle}>
          Herramienta de control para simular escenarios de prueba frente al jurado.
        </Text>
      </View>

      {/* Sección 1: Condición de Red */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Condición de Red / Respuesta API</Text>
        <View accessibilityRole="radiogroup" style={styles.chipRow}>
          {NETWORK_CONDITIONS.map((item) => {
            const isSelected = demoState.networkCondition === item.value;
            return (
              <Pressable
                accessibilityLabel={item.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                key={item.value}
                onPress={() => handleSelectCondition(item.value)}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                  item.value.startsWith("error") && isSelected && styles.chipDanger,
                ]}
                testID={`condition-chip-${item.value}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Sección 2: Escenario de Inferencia IA */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Escenario de Inferencia Gemini</Text>
        <View accessibilityRole="radiogroup" style={styles.chipRow}>
          {SCENARIO_OPTIONS.map((item) => {
            const isSelected = demoState.selectedScenario === item.value;
            return (
              <Pressable
                accessibilityLabel={item.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                key={item.value}
                onPress={() => handleSelectScenario(item.value)}
                style={[styles.chip, isSelected && styles.chipSelected]}
                testID={`scenario-chip-${item.value}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Sección 3: Latencia Simulada */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Latencia de Simulación (ms)</Text>
        <View accessibilityRole="radiogroup" style={styles.chipRow}>
          {LATENCY_OPTIONS.map((item) => {
            const isSelected = demoState.mockLatencyMs === item.value;
            return (
              <Pressable
                accessibilityLabel={item.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                key={item.value}
                onPress={() => handleSelectLatency(item.value)}
                style={[styles.chip, isSelected && styles.chipSelected]}
                testID={`latency-chip-${item.value}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Métricas y Reset */}
      <View style={styles.footerRow}>
        <View style={styles.metricsContainer}>
          <Text style={styles.metricsText}>
            Mocks servidos: {demoState.totalMocksServed}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Restablecer simulación"
          accessibilityRole="button"
          onPress={handleReset}
          style={styles.resetButton}
          testID="reset-dev-panel-button"
        >
          <Text style={styles.resetButtonText}>Restablecer valores</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginVertical: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: 2,
  },
  badge: {
    ...Typography.label,
    fontSize: 10,
    lineHeight: 12,
    backgroundColor: Colors.accentSoft,
    color: Colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  title: {
    ...Typography.title,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  chipDanger: {
    backgroundColor: Colors.dangerSoft,
    borderColor: Colors.danger,
  },
  chipText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.primaryDark,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  metricsContainer: {
    flex: 1,
  },
  metricsText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textMuted,
  },
  resetButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSecondary,
  },
  resetButtonText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.danger,
  },
});
