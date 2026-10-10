import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useComparison } from "@/context/ComparisonContext";
import {
  createComparisonDraft,
  updateComparisonName,
} from "@/services/comparisonService";

export default function NewComparisonScreen() {
  const { comparisonId, name, setComparisonId, setName } = useComparison();

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const savingRef = useRef(false);

  const isNameValid = name.trim().length > 0;

  function handleNameChange(value: string) {
    setName(value);
    setErrorMessage(null);
  }

  async function handleContinue() {
    if (!isNameValid || savingRef.current) {
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (comparisonId) {
        await updateComparisonName(comparisonId, name);
      } else {
        const comparison = await createComparisonDraft(name);

        setComparisonId(comparison.id);
      }

      router.push("/initial-state");
    } catch {
      setErrorMessage(
        "No pudimos guardar la comparación. Revisa tu conexión e inténtalo nuevamente.",
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() => router.replace("/home")}
          style={({ pressed }) => [
            styles.backButton,
            pressed && !isSaving && styles.backButtonPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />

          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>PASO 1 DE 3</Text>

            <Text style={styles.progressLabel}>Información básica</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={styles.progressValue} />
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Nueva comparación</Text>

          <Text style={styles.description}>
            Asigna un nombre para identificar fácilmente este registro.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Nombre de la comparación</Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="document-text-outline"
              size={20}
              color={Colors.textMuted}
              style={styles.inputIcon}
            />

            <TextInput
              value={name}
              onChangeText={handleNameChange}
              editable={!isSaving}
              placeholder="Ej. Portátil"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="sentences"
              autoCorrect
              maxLength={50}
              returnKeyType="done"
              style={styles.input}
            />
          </View>

          <View style={styles.helperRow}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={Colors.textMuted}
            />

            <Text style={styles.helperText}>
              Usa un nombre breve y claro para reconocerla fácilmente.
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color={Colors.danger}
            />

            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Button
            label={isSaving ? "Guardando..." : "Continuar"}
            disabled={!isNameValid || isSaving}
            onPress={handleContinue}
          />
        </View>

        <View style={styles.guideCard}>
          <View style={styles.guideTop}>
            <Text style={styles.guideEyebrow}>ANTES DE EMPEZAR</Text>

            <Ionicons
              name="sparkles-outline"
              size={18}
              color={Colors.primary}
            />
          </View>

          <Text style={styles.guideTitle}>
            Mejora la calidad de la comparación
          </Text>

          <Text style={styles.guideDescription}>
            Dos detalles simples ayudan a obtener resultados visuales más
            consistentes.
          </Text>

          <View style={styles.guideContent}>
            <View style={styles.guideItem}>
              <View style={styles.guideNumber}>
                <Text style={styles.guideNumberText}>01</Text>
              </View>

              <View style={styles.guideItemContent}>
                <Text style={styles.guideItemTitle}>
                  Mantén el mismo encuadre
                </Text>

                <Text style={styles.guideItemDescription}>
                  Conserva una distancia y un ángulo similares en ambas
                  fotografías.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.guideItem}>
              <View style={styles.guideNumber}>
                <Text style={styles.guideNumberText}>02</Text>
              </View>

              <View style={styles.guideItemContent}>
                <Text style={styles.guideItemTitle}>
                  Busca una iluminación estable
                </Text>

                <Text style={styles.guideItemDescription}>
                  Evita cambios bruscos de luz entre el estado inicial y final.
                </Text>
              </View>
            </View>
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: Spacing.sm,
    marginLeft: -Spacing.sm,
    marginBottom: Spacing.xl,
    borderRadius: Radius.md,
  },

  backButtonPressed: {
    backgroundColor: Colors.surfaceSecondary,
  },

  backText: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },

  progressSection: {
    marginBottom: Spacing.xl,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },

  progressText: {
    color: Colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  progressLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },

  progressTrack: {
    height: 4,
    overflow: "hidden",
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
  },

  progressValue: {
    width: "33.33%",
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },

  header: {
    marginBottom: Spacing.xl,
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

  formCard: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
  },

  label: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.lg,
  },

  inputIcon: {
    marginRight: Spacing.md,
  },

  input: {
    flex: 1,
    minHeight: 54,
    color: Colors.textPrimary,
    fontSize: 16,
  },

  helperRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: Spacing.md,
  },

  helperText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: Spacing.xs,
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
  },

  errorText: {
    flex: 1,
    ...Typography.label,
    color: Colors.danger,
    marginLeft: Spacing.sm,
  },

  footer: {
    marginTop: Spacing.lg,
  },

  guideCard: {
    marginTop: Spacing.xxl,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
  },

  guideTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },

  guideEyebrow: {
    color: Colors.primary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  guideTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    fontSize: 18,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },

  guideDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: Spacing.xl,
  },

  guideContent: {
    width: "100%",
  },

  guideItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  guideNumber: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.md,
    marginRight: Spacing.md,
  },

  guideNumberText: {
    color: Colors.primary,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
  },

  guideItemContent: {
    flex: 1,
    paddingTop: 1,
  },

  guideItemTitle: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },

  guideItemDescription: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
    marginLeft: 48,
  },
});
