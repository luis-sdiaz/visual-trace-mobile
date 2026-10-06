import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export function ComparisonPreview() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>COMPARACIÓN VISUAL</Text>
          <Text style={styles.title}>Antes y después</Text>
        </View>

        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>IA</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Registra dos momentos y revisa fácilmente qué cambió.
      </Text>

      <View style={styles.comparisonRow}>
        <View style={[styles.stateCard, styles.initialCard]}>
          <View style={[styles.stateBadge, styles.initialBadge]}>
            <Text style={styles.initialBadgeText}>Inicial</Text>
          </View>

          <View style={styles.previewArea}>
            <View style={styles.initialObject} />

            <View style={styles.initialMarker} />
          </View>

          <Text style={styles.stateTitle}>Antes</Text>

          <Text style={styles.stateDescription}>Estado registrado</Text>
        </View>

        <View style={styles.connector}>
          <Text style={styles.connectorArrow}>→</Text>
        </View>

        <View style={[styles.stateCard, styles.finalCard]}>
          <View style={[styles.stateBadge, styles.finalBadge]}>
            <Text style={styles.finalBadgeText}>Final</Text>
          </View>

          <View style={styles.previewArea}>
            <View style={styles.finalObject} />

            <View style={styles.changeIndicator}>
              <View style={styles.changeDot} />
            </View>
          </View>

          <Text style={styles.stateTitle}>Después</Text>

          <Text style={styles.stateDescription}>Estado comparado</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerIcon}>
          <Text style={styles.footerIconText}>✓</Text>
        </View>

        <View style={styles.footerContent}>
          <Text style={styles.footerTitle}>Comparación asistida por IA</Text>

          <Text style={styles.footerDescription}>
            VisualTrace identifica posibles diferencias para que puedas
            revisarlas.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderPrimary,
    borderRadius: Radius.xl,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },

  headerText: {
    flex: 1,
    marginRight: Spacing.md,
  },

  eyebrow: {
    color: Colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },

  title: {
    ...Typography.title,
    color: Colors.textPrimary,
  },

  aiBadge: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },

  aiBadgeText: {
    ...Typography.label,
    color: Colors.textInverse,
    fontWeight: "800",
  },

  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },

  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  stateCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },

  initialCard: {
    backgroundColor: Colors.initialSoft,
  },

  finalCard: {
    backgroundColor: Colors.finalSoft,
  },

  stateBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },

  initialBadge: {
    backgroundColor: Colors.primaryMedium,
  },

  finalBadge: {
    backgroundColor: "#DCFCE7",
  },

  initialBadgeText: {
    color: Colors.initial,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },

  finalBadgeText: {
    color: Colors.final,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },

  previewArea: {
    height: 94,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },

  initialObject: {
    width: "68%",
    height: 42,
    backgroundColor: Colors.primaryMedium,
    borderRadius: Radius.md,
  },

  initialMarker: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 10,
    height: 10,
    backgroundColor: Colors.initial,
    borderRadius: Radius.full,
  },

  finalObject: {
    width: "68%",
    height: 42,
    backgroundColor: "#BBF7D0",
    borderRadius: Radius.md,
  },

  changeIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.full,
  },

  changeDot: {
    width: 8,
    height: 8,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
  },

  connector: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },

  connectorArrow: {
    color: Colors.textInverse,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
  },

  stateTitle: {
    ...Typography.label,
    color: Colors.textPrimary,
    textAlign: "center",
  },

  stateDescription: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 2,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  footerIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.full,
    marginRight: Spacing.md,
  },

  footerIconText: {
    color: Colors.success,
    fontSize: 18,
    fontWeight: "800",
  },

  footerContent: {
    flex: 1,
  },

  footerTitle: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: 2,
  },

  footerDescription: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
