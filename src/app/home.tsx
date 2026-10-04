import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>VisualTrace</Text>

          <Text style={styles.title}>Tus comparaciones</Text>

          <Text style={styles.description}>
            Documenta el estado inicial y final de tus espacios u objetos para
            identificar cambios visuales con ayuda de inteligencia artificial.
          </Text>
        </View>

        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>＋</Text>
            </View>

            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Nueva comparación</Text>

              <Text style={styles.actionDescription}>
                Registra un nuevo estado antes y después.
              </Text>
            </View>
          </View>

          <Button
            label="Crear comparación"
            onPress={() => router.push("/new-comparison")}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comparaciones recientes</Text>

          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>◎</Text>
            </View>

            <Text style={styles.emptyTitle}>Aún no tienes comparaciones</Text>

            <Text style={styles.emptyDescription}>
              Cuando realices tu primera comparación aparecerá aquí para que
              puedas consultarla nuevamente.
            </Text>
          </View>
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
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },

  header: {
    marginBottom: Spacing.xl,
  },

  brand: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.md,
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

  actionCard: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    marginBottom: Spacing.xxl,
  },

  actionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },

  iconContainer: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.lg,
    marginRight: Spacing.md,
  },

  icon: {
    color: Colors.primary,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "500",
  },

  actionText: {
    flex: 1,
  },

  actionTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },

  actionDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  section: {
    flex: 1,
  },

  sectionTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  emptyCard: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
  },

  emptyIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },

  emptyIconText: {
    color: Colors.textMuted,
    fontSize: 24,
    fontWeight: "600",
  },

  emptyTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  emptyDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
