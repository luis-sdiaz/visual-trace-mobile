import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";

type DiagnosticRecord = {
  content?: string;
  containerWidth?: number;
  height?: number;
  lines?: { height: number; text: string; width: number }[];
  width?: number;
};

export type AbVariantId =
  | "v1_default"
  | "v2_simple"
  | "v3_simple_single"
  | "v4_control_wide"
  | "v5_current_flexible";

export type AbStringTarget = {
  id: string;
  label: string;
  origin: string;
  text: string;
  typography: TextStyle;
};

export const AB_TARGETS: AbStringTarget[] = [
  {
    id: "visualTrace",
    label: "VisualTrace",
    origin: "Brand Header (Welcome / Settings)",
    text: "VisualTrace",
    typography: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
  },
  {
    id: "volver",
    label: "Volver",
    origin: "Botón de retroceso (Initial / Final State)",
    text: "Volver",
    typography: { ...Typography.label },
  },
  {
    id: "salir",
    label: "Salir",
    origin: "Botón Cerrar Sesión (Home top bar)",
    text: "Salir",
    typography: { ...Typography.label },
  },
  {
    id: "num01",
    label: "01",
    origin: "Paso guía 1 (New Comparison 36×36)",
    text: "01",
    typography: { fontSize: 11, lineHeight: 14, fontWeight: "800" },
  },
  {
    id: "num02",
    label: "02",
    origin: "Paso guía 2 (New Comparison 36×36)",
    text: "02",
    typography: { fontSize: 11, lineHeight: 14, fontWeight: "800" },
  },
  {
    id: "enCurso",
    label: "En curso",
    origin: "Chip de filtro / Borrador (Home)",
    text: "En curso",
    typography: { ...Typography.label },
  },
  {
    id: "masRecientes",
    label: "Más recientes",
    origin: "Opción de ordenación (Home)",
    text: "Más recientes",
    typography: { ...Typography.label },
  },
];

export const AB_VARIANTS: {
  badgeColor: string;
  description: string;
  id: AbVariantId;
  title: string;
}[] = [
  {
    id: "v1_default",
    title: "1. Original: textBreakStrategy por defecto",
    description: "Ancho natural, sin textBreakStrategy (Android aplica highQuality por defecto).",
    badgeColor: "#64748B",
  },
  {
    id: "v2_simple",
    title: '2. textBreakStrategy="simple"',
    description: "Ancho natural, sin numberOfLines, rompe solo en límites estándar de palabra.",
    badgeColor: "#2563EB",
  },
  {
    id: "v3_simple_single",
    title: '3. textBreakStrategy="simple" + numberOfLines={1}',
    description: "Ancho natural con restricción atómica explícita de línea única.",
    badgeColor: "#059669",
  },
  {
    id: "v4_control_wide",
    title: "4. Control de referencia: Ancho suficiente",
    description: "Ancho explícito garantizado sin constricción horizontal.",
    badgeColor: "#7C3AED",
  },
  {
    id: "v5_current_flexible",
    title: "5. Restricciones flexibles actuales (Regresiones)",
    description: "Emula las condiciones donde se reportaron recortes o divisiones en 2 líneas.",
    badgeColor: "#D97706",
  },
];

export function TextRenderingDiagnostics() {
  const { colors } = useTheme();
  const { fontScale, height, width } = useWindowDimensions();
  const [records, setRecords] = useState<Record<string, DiagnosticRecord>>({});
  const [activeTab, setActiveTab] = useState<"ab" | "probes">("ab");
  const [selectedVariantFilter, setSelectedVariantFilter] = useState<AbVariantId | "all">("all");
  const [selectedStringFilter, setSelectedStringFilter] = useState<string>("all");

  const styles = createStyles(colors);

  const updateRecord = useCallback(
    (id: string, content: string | undefined, update: Partial<DiagnosticRecord>) => {
      setRecords((current) => {
        const next = {
          ...current,
          [id]: {
            ...current[id],
            ...(content === undefined ? {} : { content }),
            ...update,
          },
        };
        console.info("[TextDiagnostics]", id, next[id]);
        return next;
      });
    },
    [],
  );

  const textHandlers = useCallback(
    (id: string, content: string): Pick<TextProps, "onLayout" | "onTextLayout"> => ({
      onLayout: (event) =>
        updateRecord(id, content, {
          height: event.nativeEvent.layout.height,
          width: event.nativeEvent.layout.width,
        }),
      onTextLayout: (event) =>
        updateRecord(id, content, {
          lines: event.nativeEvent.lines.map((line) => ({
            height: line.height,
            text: line.text,
            width: line.width,
          })),
        }),
    }),
    [updateRecord],
  );

  const filteredTargets = useMemo(() => {
    if (selectedStringFilter === "all") {
      return AB_TARGETS;
    }
    return AB_TARGETS.filter((t) => t.id === selectedStringFilter);
  }, [selectedStringFilter]);

  const filteredVariants = useMemo(() => {
    if (selectedVariantFilter === "all") {
      return AB_VARIANTS;
    }
    return AB_VARIANTS.filter((v) => v.id === selectedVariantFilter);
  }, [selectedVariantFilter]);

  const abSummaryStats = useMemo(() => {
    let measuredCount = 0;
    let multilineCount = 0;
    let singleLineCount = 0;

    for (const target of AB_TARGETS) {
      for (const variant of AB_VARIANTS) {
        const key = `ab.${target.id}.${variant.id}`;
        const rec = records[key];
        if (rec && rec.lines && rec.lines.length > 0) {
          measuredCount++;
          if (rec.lines.length > 1) {
            multilineCount++;
          } else {
            singleLineCount++;
          }
        }
      }
    }
    return { measuredCount, multilineCount, singleLineCount, totalTests: 35 };
  }, [records]);

  const renderAbNode = (target: AbStringTarget, variantId: AbVariantId, recordId: string) => {
    const textColor = colors.textPrimary;
    const baseStyle: TextStyle = { ...target.typography, color: textColor };

    switch (variantId) {
      case "v1_default":
        return (
          <View style={styles.intrinsicWrapper}>
            <Text
              style={baseStyle}
              {...textHandlers(recordId, target.text)}
            >
              {target.text}
            </Text>
          </View>
        );

      case "v2_simple":
        return (
          <View style={styles.intrinsicWrapper}>
            <Text
              style={baseStyle}
              textBreakStrategy="simple"
              {...textHandlers(recordId, target.text)}
            >
              {target.text}
            </Text>
          </View>
        );

      case "v3_simple_single":
        return (
          <View style={styles.intrinsicWrapper}>
            <Text
              numberOfLines={1}
              style={baseStyle}
              textBreakStrategy="simple"
              {...textHandlers(recordId, target.text)}
            >
              {target.text}
            </Text>
          </View>
        );

      case "v4_control_wide":
        return (
          <View style={styles.wideControlWrapper}>
            <Text
              style={baseStyle}
              textBreakStrategy="simple"
              {...textHandlers(recordId, target.text)}
            >
              {target.text}
            </Text>
          </View>
        );

      case "v5_current_flexible":
        if (target.id === "volver") {
          return (
            <View style={styles.regressionRowStretch}>
              <Text style={styles.backIcon}>←</Text>
              <Text
                style={[
                  baseStyle,
                  { alignSelf: "stretch", minWidth: 0, flexShrink: 1 },
                ]}
                {...textHandlers(recordId, target.text)}
              >
                {target.text}
              </Text>
            </View>
          );
        }

        if (target.id === "masRecientes") {
          return (
            <View style={styles.regressionSortOption}>
              <Text
                style={[
                  baseStyle,
                  { width: "100%", minWidth: 0, flexShrink: 1, textAlign: "center" },
                ]}
                {...textHandlers(recordId, target.text)}
              >
                {target.text}
              </Text>
            </View>
          );
        }

        if (target.id === "num01" || target.id === "num02") {
          return (
            <View style={styles.regressionGuideBox}>
              <Text
                style={[
                  baseStyle,
                  { color: colors.primary, minWidth: 0, flexShrink: 1 },
                ]}
                {...textHandlers(recordId, target.text)}
              >
                {target.text}
              </Text>
            </View>
          );
        }

        if (target.id === "salir") {
          return (
            <View style={styles.regressionSignOutButton}>
              <Text style={styles.signOutIcon}>⇥</Text>
              <Text
                style={[
                  baseStyle,
                  { marginLeft: Spacing.xs, flex: 1, minWidth: 0, flexShrink: 1 },
                ]}
                {...textHandlers(recordId, target.text)}
              >
                {target.text}
              </Text>
            </View>
          );
        }

        if (target.id === "enCurso") {
          return (
            <View style={styles.regressionFilterChip}>
              <Text
                style={[
                  baseStyle,
                  { width: "100%", minWidth: 0, flexShrink: 1, textAlign: "center" },
                ]}
                {...textHandlers(recordId, target.text)}
              >
                {target.text}
              </Text>
            </View>
          );
        }

        // visualTrace
        return (
          <View style={styles.regressionBrandRow}>
            <Text
              style={[
                baseStyle,
                { color: colors.primary, flex: 1, minWidth: 0, flexShrink: 1 },
              ]}
              {...textHandlers(recordId, target.text)}
            >
              {target.text}
            </Text>
            <View style={styles.mockHeaderControls}>
              <Text style={styles.mockControlText}>[Toggle]</Text>
            </View>
          </View>
        );
    }
  };

  const renderAbVariantCard = (target: AbStringTarget, variant: (typeof AB_VARIANTS)[number]) => {
    const recordId = `ab.${target.id}.${variant.id}`;
    const rec = records[recordId];
    const lines = rec?.lines ?? [];
    const isMeasured = rec && rec.lines !== undefined && rec.width !== undefined;
    const isMultiline = lines.length > 1;
    const isComplete = lines.length === 1 && lines[0]?.text === target.text;
    const textWidth = rec?.width;
    const textHeight = rec?.height;
    const containerWidth = rec?.containerWidth;
    const lineWidth = lines[0]?.width;
    const delta =
      textWidth !== undefined && lineWidth !== undefined ? textWidth - lineWidth : undefined;

    return (
      <View key={recordId} style={styles.abVariantCard}>
        <View style={styles.variantHeader}>
          <View style={[styles.variantBadge, { backgroundColor: variant.badgeColor }]}>
            <Text style={styles.variantBadgeText}>{variant.id.toUpperCase()}</Text>
          </View>
          <Text style={styles.variantTitle}>{variant.title}</Text>
        </View>
        <Text style={styles.variantDescription}>{variant.description}</Text>

        <View
          onLayout={(event) =>
            updateRecord(recordId, undefined, {
              containerWidth: event.nativeEvent.layout.width,
            })
          }
          style={styles.abPreviewCanvas}
        >
          {renderAbNode(target, variant.id, recordId)}
        </View>

        <View style={styles.telemetryCard}>
          <View style={styles.telemetryHeader}>
            <Text style={styles.telemetryLabel}>Identificador: {recordId}</Text>
            {isMeasured ? (
              isMultiline ? (
                <View style={styles.statusBadgeWarning}>
                  <Text style={styles.statusBadgeWarningText}>⚠️ Salto a {lines.length} líneas</Text>
                </View>
              ) : isComplete ? (
                <View style={styles.statusBadgeSuccess}>
                  <Text style={styles.statusBadgeSuccessText}>✓ 1 línea íntegra</Text>
                </View>
              ) : (
                <View style={styles.statusBadgeNeutral}>
                  <Text style={styles.statusBadgeNeutralText}>Truncado ({lines[0]?.text.length}/{target.text.length} car)</Text>
                </View>
              )
            ) : (
              <Text style={styles.telemetryPending}>Esperando onLayout / onTextLayout…</Text>
            )}
          </View>

          {isMeasured ? (
            <View style={styles.metricsGrid}>
              <Text selectable style={styles.telemetryMetric}>
                {`View: ${textWidth ?? "?"}×${textHeight ?? "?"} px · Contenedor: ${containerWidth ?? "?"} px`}
              </Text>
              <Text selectable style={styles.telemetryMetric}>
                {`Líneas: [ ${lines.map((l, i) => `L${i + 1}: "${l.text}" (${l.width.toFixed(1)}px)`).join(" + ")} ]`}
              </Text>
              {delta !== undefined ? (
                <Text selectable style={styles.telemetryMetric}>
                  {`Subpíxel Δ (View - L1): ${delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} px`}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityLabel="Volver"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </Pressable>

        <Text style={styles.title}>Experimento A/B Renderizado de Textos</Text>
        <Text style={styles.environment}>
          {`platform=${Platform.OS} viewport=${width}×${height} fontScale=${fontScale} densidad=1.75(est)`}
        </Text>

        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab("ab")}
            style={[styles.tabButton, activeTab === "ab" && styles.tabButtonActive]}
          >
            <Text style={[styles.tabButtonText, activeTab === "ab" && styles.tabButtonTextActive]}>
              A/B Moto G04s (7×5)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("probes")}
            style={[styles.tabButton, activeTab === "probes" && styles.tabButtonActive]}
          >
            <Text style={[styles.tabButtonText, activeTab === "probes" && styles.tabButtonTextActive]}>
              Sondas Anteriores
            </Text>
          </Pressable>
        </View>

        {activeTab === "ab" ? (
          <View style={styles.abContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Monitor del Experimento A/B</Text>
              <Text style={styles.summarySubtitle}>
                Comparación simultánea de 7 cadenas clave en 5 variantes de renderizado (35 pruebas en total).
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{abSummaryStats.measuredCount}/{abSummaryStats.totalTests}</Text>
                  <Text style={styles.statLabel}>Medidas</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: colors.success }]}>
                    {abSummaryStats.singleLineCount}
                  </Text>
                  <Text style={styles.statLabel}>1 Línea</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: colors.warning }]}>
                    {abSummaryStats.multilineCount}
                  </Text>
                  <Text style={styles.statLabel}>Multilínea (Salto)</Text>
                </View>
              </View>
            </View>

            <Text style={styles.filterGroupLabel}>Filtrar por Cadena:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <Pressable
                onPress={() => setSelectedStringFilter("all")}
                style={[styles.filterPill, selectedStringFilter === "all" && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, selectedStringFilter === "all" && styles.filterPillTextActive]}>
                  Todas (7)
                </Text>
              </Pressable>
              {AB_TARGETS.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setSelectedStringFilter(t.id)}
                  style={[styles.filterPill, selectedStringFilter === t.id && styles.filterPillActive]}
                >
                  <Text style={[styles.filterPillText, selectedStringFilter === t.id && styles.filterPillTextActive]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.filterGroupLabel}>Filtrar por Variante:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <Pressable
                onPress={() => setSelectedVariantFilter("all")}
                style={[styles.filterPill, selectedVariantFilter === "all" && styles.filterPillActive]}
              >
                <Text style={[styles.filterPillText, selectedVariantFilter === "all" && styles.filterPillTextActive]}>
                  Todas (5)
                </Text>
              </Pressable>
              {AB_VARIANTS.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => setSelectedVariantFilter(v.id)}
                  style={[styles.filterPill, selectedVariantFilter === v.id && styles.filterPillActive]}
                >
                  <Text style={[styles.filterPillText, selectedVariantFilter === v.id && styles.filterPillTextActive]}>
                    {v.id.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {filteredTargets.map((target) => (
              <View key={target.id} style={styles.targetSection}>
                <View style={styles.targetSectionHeader}>
                  <Text style={styles.targetSectionTitle}>
                    Cadena: &quot;{target.text}&quot;
                  </Text>
                  <Text style={styles.targetSectionSubtitle}>
                    Origen: {target.origin} · Font: {target.typography.fontSize}px / W{target.typography.fontWeight} / LH{target.typography.lineHeight}
                  </Text>
                </View>

                {filteredVariants.map((variant) => renderAbVariantCard(target, variant))}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.probesContainer}>
            <Text style={styles.sectionTitle}>Sondas Históricas de Diagnóstico</Text>
            <Text style={styles.instructions}>
              Sondas de referencia para comparación rápida de pesos tipográficos y monospace.
            </Text>

            <View style={styles.sample}>
              <Text style={styles.sampleLabel}>1. Ancho intrínseco automático de &quot;VisualTrace&quot;</Text>
              <View style={styles.measurementFrame}>
                <Text
                  style={styles.brandProbe}
                  {...textHandlers("legacy.intrinsicVisualTrace", "VisualTrace")}
                >
                  VisualTrace
                </Text>
              </View>
              <Text selectable style={styles.measurement}>
                {records["legacy.intrinsicVisualTrace"]
                  ? `text=${records["legacy.intrinsicVisualTrace"].width ?? "?"}×${records["legacy.intrinsicVisualTrace"].height ?? "?"} lines=${JSON.stringify(records["legacy.intrinsicVisualTrace"].lines ?? [])}`
                  : "Esperando medición…"}
              </Text>
            </View>

            <View style={styles.sample}>
              <Text style={styles.sampleLabel}>2. Fila con icono y texto flexible de &quot;01&quot;</Text>
              <View style={styles.rowProbe}>
                <Text style={styles.rowIcon}>●</Text>
                <Text
                  style={styles.flexibleProbe}
                  {...textHandlers("legacy.flexibleNumber", "01")}
                >
                  01
                </Text>
              </View>
              <Text selectable style={styles.measurement}>
                {records["legacy.flexibleNumber"]
                  ? `text=${records["legacy.flexibleNumber"].width ?? "?"}×${records["legacy.flexibleNumber"].height ?? "?"} lines=${JSON.stringify(records["legacy.flexibleNumber"].lines ?? [])}`
                  : "Esperando medición…"}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    content: { padding: Spacing.lg, gap: Spacing.md },
    backButton: {
      minHeight: 44,
      alignSelf: "flex-start",
      justifyContent: "center",
    },
    backButtonText: { ...Typography.label, color: colors.primary },
    title: { ...Typography.title, color: colors.textPrimary },
    environment: { ...Typography.label, color: colors.textSecondary },
    instructions: { ...Typography.body, color: colors.textPrimary },

    tabBar: {
      flexDirection: "row",
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      padding: 4,
      gap: 4,
      marginTop: Spacing.xs,
    },
    tabButton: {
      flex: 1,
      minHeight: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Radius.sm,
    },
    tabButtonActive: {
      backgroundColor: colors.surface,
    },
    tabButtonText: {
      ...Typography.label,
      color: colors.textSecondary,
    },
    tabButtonTextActive: {
      color: colors.primary,
      fontWeight: "700",
    },

    abContainer: {
      gap: Spacing.lg,
    },
    summaryCard: {
      padding: Spacing.md,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: Spacing.sm,
    },
    summaryTitle: {
      ...Typography.title,
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    summarySubtitle: {
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    statsRow: {
      flexDirection: "row",
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    statBox: {
      flex: 1,
      padding: Spacing.sm,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      alignItems: "center",
    },
    statNumber: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 10,
      lineHeight: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },

    filterGroupLabel: {
      ...Typography.label,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
    },
    filterScroll: {
      flexDirection: "row",
    },
    filterPill: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: Spacing.xs,
      minHeight: 32,
      justifyContent: "center",
      alignItems: "center",
    },
    filterPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterPillText: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    filterPillTextActive: {
      color: colors.textInverse,
    },

    targetSection: {
      gap: Spacing.md,
      paddingBottom: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    targetSectionHeader: {
      backgroundColor: colors.surfaceSecondary,
      padding: Spacing.sm,
      borderRadius: Radius.md,
      gap: 2,
    },
    targetSectionTitle: {
      ...Typography.title,
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    targetSectionSubtitle: {
      fontSize: 11,
      lineHeight: 15,
      color: colors.textSecondary,
    },

    abVariantCard: {
      padding: Spacing.md,
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
    },
    variantHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    variantBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: Radius.sm,
    },
    variantBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#FFFFFF",
    },
    variantTitle: {
      ...Typography.label,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
      flex: 1,
    },
    variantDescription: {
      fontSize: 11,
      lineHeight: 15,
      color: colors.textSecondary,
    },

    abPreviewCanvas: {
      padding: Spacing.sm,
      borderRadius: Radius.sm,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      alignSelf: "stretch",
      alignItems: "flex-start",
      justifyContent: "center",
      minHeight: 48,
    },

    intrinsicWrapper: {
      alignSelf: "flex-start",
    },
    wideControlWrapper: {
      width: 240,
      alignSelf: "flex-start",
    },

    regressionRowStretch: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 44,
      width: "100%",
    },
    backIcon: {
      fontSize: 18,
      color: colors.textPrimary,
      marginRight: Spacing.xs,
    },

    regressionSortOption: {
      width: 140,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
    },

    regressionGuideBox: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
      borderRadius: Radius.md,
    },

    regressionSignOutButton: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 44,
      minWidth: 96,
      paddingHorizontal: Spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.full,
    },
    signOutIcon: {
      fontSize: 14,
      color: colors.textSecondary,
    },

    regressionFilterChip: {
      minHeight: 40,
      paddingHorizontal: Spacing.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.full,
    },

    regressionBrandRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    mockHeaderControls: {
      paddingHorizontal: Spacing.xs,
      paddingVertical: 2,
      backgroundColor: colors.surface,
      borderRadius: Radius.sm,
    },
    mockControlText: {
      fontSize: 10,
      color: colors.textMuted,
    },

    telemetryCard: {
      backgroundColor: colors.surfaceSecondary,
      padding: Spacing.sm,
      borderRadius: Radius.sm,
      gap: 4,
    },
    telemetryHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 4,
    },
    telemetryLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    telemetryPending: {
      fontSize: 10,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    telemetryMetric: {
      fontSize: 10,
      lineHeight: 14,
      color: colors.textMuted,
      fontFamily: Platform.OS === "android" ? "monospace" : "Menlo",
    },
    metricsGrid: {
      gap: 2,
      marginTop: 2,
    },

    statusBadgeSuccess: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.full,
      backgroundColor: colors.successSoft,
    },
    statusBadgeSuccessText: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.success,
    },
    statusBadgeWarning: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.full,
      backgroundColor: colors.dangerSoft,
    },
    statusBadgeWarningText: {
      fontSize: 9,
      fontWeight: "700",
      color: colors.danger,
    },
    statusBadgeNeutral: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusBadgeNeutralText: {
      fontSize: 9,
      fontWeight: "600",
      color: colors.textSecondary,
    },

    probesContainer: {
      gap: Spacing.md,
    },
    sectionTitle: {
      ...Typography.title,
      color: colors.textPrimary,
      marginTop: Spacing.md,
    },
    sample: {
      padding: Spacing.md,
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
    },
    sampleLabel: { ...Typography.label, color: colors.primary },
    measurement: { fontSize: 10, lineHeight: 14, color: colors.textMuted },
    measurementFrame: { alignSelf: "stretch" },
    brandProbe: {
      ...Typography.title,
      fontWeight: "800",
      color: colors.textPrimary,
      alignSelf: "flex-start",
    },
    rowProbe: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    rowIcon: { color: colors.primary },
    flexibleProbe: {
      ...Typography.button,
      color: colors.textPrimary,
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
  });
}
