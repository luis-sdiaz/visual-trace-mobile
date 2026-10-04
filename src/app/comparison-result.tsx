import { router } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useComparison } from "@/context/ComparisonContext";

export default function ComparisonResultScreen() {
  const { name, initialImageUri, finalImageUri } = useComparison();

  const hasComparisonData =
    name.trim().length > 0 && initialImageUri && finalImageUri;

  if (!hasComparisonData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.missingContent}>
          <View style={styles.missingIcon}>
            <Text style={styles.missingIconText}>!</Text>
          </View>

          <Text style={styles.missingTitle}>Comparación incompleta</Text>

          <Text style={styles.missingDescription}>
            Necesitas completar el nombre, el estado inicial y el estado final
            antes de visualizar la comparación.
          </Text>

          <Button
            label="Volver al inicio"
            onPress={() => router.replace("/home")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/final-state")}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>COMPARACIÓN</Text>

          <Text style={styles.title}>{name}</Text>

          <Text style={styles.description}>
            Revisa ambas fotografías antes de iniciar el análisis visual.
          </Text>
        </View>

        <View style={styles.comparisonSection}>
          <View style={styles.imageCard}>
            <View style={styles.imageHeader}>
              <View style={styles.initialBadge}>
                <Text style={styles.initialBadgeText}>Inicial</Text>
              </View>

              <Text style={styles.imageLabel}>Antes</Text>
            </View>

            <Image
              accessibilityLabel="Fotografía del estado inicial"
              source={{ uri: initialImageUri }}
              style={styles.image}
            />
          </View>

          <View style={styles.connector}>
            <View style={styles.connectorLine} />
            <View style={styles.connectorIcon}>
              <Text style={styles.connectorIconText}>↓</Text>
            </View>
            <View style={styles.connectorLine} />
          </View>

          <View style={styles.imageCard}>
            <View style={styles.imageHeader}>
              <View style={styles.finalBadge}>
                <Text style={styles.finalBadgeText}>Final</Text>
              </View>

              <Text style={styles.imageLabel}>Después</Text>
            </View>

            <Image
              accessibilityLabel="Fotografía del estado final"
              source={{ uri: finalImageUri }}
              style={styles.image}
            />
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Text style={styles.statusIconText}>✓</Text>
          </View>

          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Fotografías listas</Text>

            <Text style={styles.statusDescription}>
              Los dos estados están preparados para ser enviados al análisis
              visual.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label="Analizar cambios"
            onPress={() => console.log("Analyze comparison pressed")}
          />

          <Text style={styles.disclaimer}>
            VisualTrace identificará posibles diferencias visibles. La revisión
            final siempre corresponde al usuario.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: Spacing.xl,
  },

  backIcon: {
    color: Colors.textPrimary,
    fontSize: 22,
    marginRight: Spacing.sm,
  },

  backText: {
    ...Typography.label,
    color: Colors.textPrimary,
  },

  header: {
    marginBottom: Spacing.xl,
  },

  eyebrow: {
    ...Typography.label,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },

  title: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  description: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  comparisonSection: {
    marginBottom: Spacing.xl,
  },

  imageCard: {
    overflow: "hidden",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
  },

  imageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },

  initialBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
  },

  initialBadgeText: {
    ...Typography.label,
    color: Colors.primary,
  },

  finalBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.full,
  },

  finalBadgeText: {
    ...Typography.label,
    color: Colors.success,
  },

  imageLabel: {
    ...Typography.label,
    color: Colors.textSecondary,
  },

  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    resizeMode: "cover",
  },

  connector: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },

  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },

  connectorIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
  },

  connectorIconText: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: "700",
  },

  statusCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    backgroundColor: Colors.successSoft,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
  },

  statusIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    marginRight: Spacing.md,
  },

  statusIconText: {
    color: Colors.success,
    fontSize: 18,
    fontWeight: "700",
  },

  statusTextContainer: {
    flex: 1,
  },

  statusTitle: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },

  statusDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  footer: {
    marginTop: Spacing.sm,
  },

  disclaimer: {
    ...Typography.label,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.md,
  },

  missingContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },

  missingIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    backgroundColor: Colors.warningSoft,
    borderRadius: Radius.full,
    marginBottom: Spacing.lg,
  },

  missingIconText: {
    color: Colors.warning,
    fontSize: 24,
    fontWeight: "700",
  },

  missingTitle: {
    ...Typography.heading,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  missingDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
});
