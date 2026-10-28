import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export interface ArchitectureInfoCardProps {
  testID?: string;
  initialExpanded?: boolean;
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export const ARCHITECTURE_PILLARS = [
  {
    title: "PostgreSQL 15 & RLS Multi-Tenant",
    description:
      "Políticas declarativas de Row Level Security (RLS) aislando comparaciones e informes estrictamente por auth.uid().",
    tag: "Base de Datos",
  },
  {
    title: "Supabase Storage Privado",
    description:
      "Bucket privado comparison-images con accesos firmados de corta duración y ciclo de vida seguro.",
    tag: "Almacenamiento",
  },
  {
    title: "Edge Function analyze-comparison",
    description:
      "Runtime Deno serverless con verificación transaccional de cuotas y descarga en memoria de fotografías.",
    tag: "Backend",
  },
  {
    title: "Google Gemini AI (Multimodal Vision)",
    description:
      "Inferencia sobre pares de imágenes con schema JSON forzado y validación estricta de contrato v1.0.",
    tag: "Motor IA",
  },
  {
    title: "Resiliencia & Circuit Breaker Móvil",
    description:
      "Detección proactiva de modo offline, rotación LRU de caché local y simulación académica para sustentación.",
    tag: "Resiliencia",
  },
] as const;

export function ArchitectureInfoCard({
  testID = "architecture-info-card",
  initialExpanded = false,
  expanded: controlledExpanded,
  onToggle,
}: ArchitectureInfoCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(initialExpanded);

  const isExpanded =
    controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  function handleToggle() {
    const next = !isExpanded;
    setInternalExpanded(next);
    onToggle?.(next);
  }

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={styles.pillBadge}>
            <Text style={styles.pillBadgeText}>ARQUITECTURA DE SISTEMA</Text>
          </View>
          <View style={styles.techBadge}>
            <Text style={styles.techBadgeText}>Supabase + Gemini</Text>
          </View>
        </View>

        <Text style={styles.title}>Arquitectura de Nube & Resiliencia</Text>
        <Text style={styles.subtitle}>
          VisualTrace implementa un flujo desacoplado con políticas RLS, microservicios Edge y control transaccional de cuotas.
        </Text>

        <Pressable
          accessibilityHint="Muestra u oculta los detalles de los 5 pilares de la arquitectura técnica"
          accessibilityLabel="Alternar detalles de arquitectura"
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          aria-expanded={isExpanded}
          onPress={handleToggle}
          style={({ pressed }) => [
            styles.toggleButton,
            pressed && styles.toggleButtonPressed,
          ]}
          testID="toggle-architecture-details"
        >
          <Text style={styles.toggleButtonText}>
            {isExpanded
              ? "Ocultar pilares técnicos ▴"
              : "Ver pilares técnicos de sustentación ▾"}
          </Text>
        </Pressable>
      </View>

      {isExpanded ? (
        <View style={styles.pillarsContainer} testID="architecture-pillars-list">
          {ARCHITECTURE_PILLARS.map((pillar, index) => (
            <View
              key={pillar.title}
              style={[
                styles.pillarItem,
                index === ARCHITECTURE_PILLARS.length - 1 && styles.pillarItemLast,
              ]}
              testID={`architecture-pillar-${index}`}
            >
              <View style={styles.pillarHeader}>
                <Text style={styles.pillarTag}>{pillar.tag}</Text>
                <Text style={styles.pillarTitle}>{pillar.title}</Text>
              </View>
              <Text style={styles.pillarDescription}>{pillar.description}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceBlue,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    padding: Spacing.lg,
    marginVertical: Spacing.md,
  },
  header: {
    marginBottom: Spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  pillBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  pillBadgeText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.primaryDark,
  },
  techBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  techBadgeText: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textSecondary,
  },
  title: {
    ...Typography.title,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  toggleButton: {
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
  },
  toggleButtonPressed: {
    opacity: 0.8,
  },
  toggleButtonText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.primary,
  },
  pillarsContainer: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderPrimary,
    paddingTop: Spacing.md,
  },
  pillarItem: {
    marginBottom: Spacing.md,
  },
  pillarItemLast: {
    marginBottom: 0,
  },
  pillarHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: 2,
  },
  pillarTag: {
    ...Typography.label,
    fontSize: 10,
    lineHeight: 12,
    backgroundColor: Colors.primaryMedium,
    color: Colors.primaryDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  pillarTitle: {
    ...Typography.label,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textPrimary,
  },
  pillarDescription: {
    ...Typography.body,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
});
