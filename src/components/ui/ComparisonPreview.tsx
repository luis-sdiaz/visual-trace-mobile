import React, { memo, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { type ColorPalette } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";

export type ComparisonPreviewProps = {
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export const ComparisonPreview = memo(function ComparisonPreview({
  style,
  testID = "comparison-preview-card",
}: ComparisonPreviewProps = {}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, style]} testID={testID}>
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
});

ComparisonPreview.displayName = "ComparisonPreview";

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      padding: Spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
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
      color: colors.primary,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700",
      letterSpacing: 0.6,
      marginBottom: Spacing.xs,
    },

    title: {
      ...Typography.title,
      color: colors.textPrimary,
    },

    aiBadge: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
    },

    aiBadgeText: {
      ...Typography.label,
      color: colors.textInverse,
      fontWeight: "800",
    },

    description: {
      ...Typography.body,
      color: colors.textSecondary,
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
      backgroundColor: colors.initialSoft,
    },

    finalCard: {
      backgroundColor: colors.finalSoft,
    },

    stateBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      marginBottom: Spacing.sm,
    },

    initialBadge: {
      backgroundColor: colors.primaryMedium,
    },

    finalBadge: {
      backgroundColor: colors.successSoft,
    },

    initialBadgeText: {
      color: colors.initial,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700",
    },

    finalBadgeText: {
      color: colors.final,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700",
    },

    previewArea: {
      height: 94,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      marginBottom: Spacing.md,
      overflow: "hidden",
    },

    initialObject: {
      width: "68%",
      height: 42,
      backgroundColor: colors.primaryMedium,
      borderRadius: Radius.md,
    },

    initialMarker: {
      position: "absolute",
      top: 14,
      left: 14,
      width: 10,
      height: 10,
      backgroundColor: colors.initial,
      borderRadius: Radius.full,
    },

    finalObject: {
      width: "68%",
      height: 42,
      backgroundColor: colors.successSoft,
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
      backgroundColor: colors.accentSoft,
      borderRadius: Radius.full,
    },

    changeDot: {
      width: 8,
      height: 8,
      backgroundColor: colors.accent,
      borderRadius: Radius.full,
    },

    connector: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: Spacing.xs,
      backgroundColor: colors.primary,
      borderRadius: Radius.full,
    },

    connectorArrow: {
      color: colors.textInverse,
      fontSize: 20,
      lineHeight: 24,
      fontWeight: "700",
    },

    stateTitle: {
      ...Typography.label,
      color: colors.textPrimary,
      textAlign: "center",
    },

    stateDescription: {
      color: colors.textSecondary,
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
      borderTopColor: colors.border,
    },

    footerIcon: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.successSoft,
      borderRadius: Radius.full,
      marginRight: Spacing.md,
    },

    footerIconText: {
      color: colors.success,
      fontSize: 18,
      fontWeight: "800",
    },

    footerContent: {
      flex: 1,
    },

    footerTitle: {
      ...Typography.label,
      color: colors.textPrimary,
      marginBottom: 2,
    },

    footerDescription: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
  });
}
