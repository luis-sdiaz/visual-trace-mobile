import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export function ComparisonPreview() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.preview}>
          <View style={styles.panel}>
            <View style={styles.scene}>
              <View style={styles.object} />
            </View>

            <Text style={styles.label}>Antes</Text>
          </View>

          <View style={styles.separator}>
            <Text style={styles.arrow}>→</Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.scene}>
              <View style={styles.object} />
              <View style={styles.changeMarker} />
            </View>

            <Text style={styles.label}>Después</Text>
          </View>
        </View>

        <View style={styles.status}>
          <View style={styles.statusDot} />

          <Text style={styles.statusText}>
            Comparación visual asistida por IA
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
  },

  preview: {
    flexDirection: "row",
    alignItems: "center",
  },

  panel: {
    flex: 1,
  },

  scene: {
    aspectRatio: 1,
    justifyContent: "flex-end",
    padding: Spacing.md,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
  },

  object: {
    width: "72%",
    height: "48%",
    alignSelf: "center",
    backgroundColor: Colors.borderStrong,
    borderRadius: Radius.md,
  },

  changeMarker: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    width: 18,
    height: 18,
    backgroundColor: Colors.warning,
    borderWidth: 4,
    borderColor: Colors.warningSoft,
    borderRadius: Radius.full,
  },

  separator: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  arrow: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: "700",
  },

  label: {
    ...Typography.label,
    marginTop: Spacing.sm,
    color: Colors.textPrimary,
    textAlign: "center",
  },

  status: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
  },

  statusDot: {
    width: 8,
    height: 8,
    marginRight: Spacing.sm,
    backgroundColor: Colors.success,
    borderRadius: Radius.full,
  },

  statusText: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
});
