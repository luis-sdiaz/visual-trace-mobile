import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
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
import { useAuth } from "@/context/AuthContext";
import { useComparison } from "@/context/ComparisonContext";
import { recoverComparison } from "@/services/comparisonRecoveryService";
import { createSingleFlight } from "@/utils/singleFlight";

type PrivateImageStatus = "loading" | "available" | "error" | "retrying";

type PrivateComparisonImageProps = {
  accessibilityLabel: string;
  uri: string;
  onRetry: () => Promise<boolean>;
};

function PrivateComparisonImage({
  accessibilityLabel,
  uri,
  onRetry,
}: PrivateComparisonImageProps) {
  const [status, setStatus] = useState<PrivateImageStatus>("loading");

  async function handleRetry() {
    if (status === "retrying") {
      return;
    }

    setStatus("retrying");

    const refreshed = await onRetry();

    if (!refreshed) {
      setStatus("error");
    }
  }

  const isAvailable = status === "available";

  return (
    <View style={styles.imageFrame}>
      <Image
        accessibilityLabel={accessibilityLabel}
        onError={() => setStatus("error")}
        onLoad={() => setStatus("available")}
        onLoadStart={() => setStatus("loading")}
        source={{ uri }}
        style={[styles.image, !isAvailable && styles.hiddenImage]}
      />

      {!isAvailable ? (
        <View style={styles.imageFeedback}>
          {status === "error" ? (
            <>
              <Text style={styles.imageErrorTitle}>No pudimos cargarla</Text>
              <Text style={styles.imageErrorDescription}>
                El acceso privado puede haber caducado.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void handleRetry()}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>
                {status === "retrying"
                  ? "Recuperando fotografía..."
                  : "Cargando fotografía..."}
              </Text>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function ComparisonResultScreen() {
  const { user } = useAuth();
  const {
    comparisonId,
    name,
    initialImageUri,
    finalImageUri,
    restoreComparison,
  } = useComparison();
  const userId = user?.id;
  const refreshSequenceRef = useRef(0);
  const [refreshSingleFlight] = useState(() => createSingleFlight<boolean>());
  const isFocusedRef = useRef(false);
  const restoreComparisonRef = useRef(restoreComparison);

  useEffect(() => {
    restoreComparisonRef.current = restoreComparison;
  }, [restoreComparison]);

  const refreshPrivateImages = useCallback((): Promise<boolean> => {
    if (!comparisonId || !userId) {
      return Promise.resolve(false);
    }

    return refreshSingleFlight.run(async () => {
      const refreshSequence = ++refreshSequenceRef.current;
      const requestComparisonId = comparisonId;
      const requestUserId = userId;

      try {
        const recovery = await recoverComparison(requestComparisonId);

        if (
          refreshSequence !== refreshSequenceRef.current ||
          requestComparisonId !== comparisonId ||
          requestUserId !== userId ||
          !isFocusedRef.current
        ) {
          return false;
        }

        restoreComparisonRef.current({
          comparisonId: recovery.comparison.id,
          name: recovery.comparison.name,
          initialImageUri: recovery.initialImageUri,
          initialImagePath: recovery.comparison.initial_image_path,
          initialImageIsDirty: false,
          finalImageUri: recovery.finalImageUri,
          finalImagePath: recovery.comparison.final_image_path,
          finalImageIsDirty: false,
          initialImageIsTransient: recovery.initialImageUri !== null,
          finalImageIsTransient: recovery.finalImageUri !== null,
        });

        return true;
      } catch (error) {
        console.error("Failed to refresh private comparison images:", error);
        return false;
      }
    });
  }, [comparisonId, refreshSingleFlight, userId]);

  useEffect(() => {
    refreshSequenceRef.current += 1;
    refreshSingleFlight.clear();
  }, [comparisonId, refreshSingleFlight, userId]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      void refreshPrivateImages();

      return () => {
        isFocusedRef.current = false;
        refreshSequenceRef.current += 1;
        refreshSingleFlight.clear();
      };
    }, [refreshPrivateImages, refreshSingleFlight]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && isFocusedRef.current) {
        void refreshPrivateImages();
      }
    });

    return () => subscription.remove();
  }, [refreshPrivateImages]);

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

            <PrivateComparisonImage
              accessibilityLabel="Fotografía del estado inicial"
              key={initialImageUri}
              onRetry={refreshPrivateImages}
              uri={initialImageUri}
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

            <PrivateComparisonImage
              accessibilityLabel="Fotografía del estado final"
              key={finalImageUri}
              onRetry={refreshPrivateImages}
              uri={finalImageUri}
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
    height: "100%",
    resizeMode: "cover",
  },

  imageFrame: {
    width: "100%",
    aspectRatio: 4 / 3,
  },

  hiddenImage: {
    opacity: 0,
  },

  imageFeedback: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surfaceSecondary,
  },

  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },

  imageErrorTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    textAlign: "center",
  },

  imageErrorDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.xs,
  },

  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
  },

  retryButtonText: {
    ...Typography.label,
    color: Colors.primary,
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
