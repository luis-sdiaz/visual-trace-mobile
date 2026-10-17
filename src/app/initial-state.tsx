import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
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
import {
  AnalyzedComparisonEditError,
  saveComparisonImage,
  shouldUploadComparisonImage,
} from "@/services/comparisonImageLifecycleService";
import {
  selectComparisonPhoto,
  type PhotoSelectionSource,
} from "@/utils/imageSelection";

export default function InitialStateScreen() {
  const {
    comparisonId,
    initialImageUri,
    initialImagePath,
    initialImageIsDirty,
    markInitialImageSaved,
    setInitialImageUri,
  } = useComparison();

  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadingRef = useRef(false);

  function acceptSelectedImage(uri: string) {
    if (!initialImagePath) {
      setInitialImageUri(uri);
      setErrorMessage(null);
      return;
    }

    Alert.alert(
      "Reemplazar fotografía inicial",
      "La fotografía guardada se conservará hasta que el reemplazo termine correctamente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reemplazar",
          onPress: () => {
            setInitialImageUri(uri);
            setErrorMessage(null);
          },
        },
      ],
    );
  }

  async function handleSelectPhoto(source: PhotoSelectionSource) {
    if (uploadingRef.current) {
      return;
    }

    try {
      const outcome = await selectComparisonPhoto(source, ImagePicker);
      if (outcome.status === "permission_denied") {
        Alert.alert(
          "Permiso necesario",
          source === "camera"
            ? "VisualTrace necesita acceso a la cámara para registrar el estado inicial."
            : "VisualTrace necesita acceso a tus fotos para seleccionar una imagen.",
        );
      } else if (outcome.status === "selected") {
        acceptSelectedImage(outcome.uri);
      }
    } catch {
      setErrorMessage(
        "No pudimos abrir el selector de fotografías. Inténtalo nuevamente.",
      );
    }
  }

  async function handleContinue() {
    if (!initialImageUri || uploadingRef.current) {
      return;
    }

    if (!comparisonId) {
      setErrorMessage(
        "No encontramos la comparación. Regresa al primer paso y guarda su nombre.",
      );

      return;
    }

    uploadingRef.current = true;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      if (!shouldUploadComparisonImage(initialImagePath, initialImageIsDirty)) {
        router.push("/final-state");
        return;
      }

      const imagePath = await saveComparisonImage({
        comparisonId,
        imageUri: initialImageUri,
        imageStage: "initial",
        previousImagePath: initialImagePath,
      });
      markInitialImageSaved(imagePath);

      router.push("/final-state");
    } catch (error) {
      console.error("Failed to save initial comparison image:", error);

      setErrorMessage(
        error instanceof AnalyzedComparisonEditError
          ? "Esta comparación ya fue analizada y sus fotografías no se pueden reemplazar."
          : "No pudimos guardar la fotografía. Revisa tu conexión e inténtalo nuevamente.",
      );
    } finally {
      uploadingRef.current = false;
      setIsUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Pressable
            accessibilityRole="button"
            disabled={isUploading}
            onPress={() => router.replace("/new-comparison")}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Volver</Text>
          </Pressable>

          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>PASO 2 DE 3</Text>

            <View style={styles.progressTrack}>
              <View style={styles.progressValue} />
            </View>
          </View>

          <Text style={styles.title}>Estado inicial</Text>

          <Text style={styles.description}>
            Registra una fotografía clara de cómo se encuentra actualmente el
            espacio u objeto.
          </Text>

          <View style={styles.photoCard}>
            {initialImageUri ? (
              <Image
                accessibilityLabel="Fotografía del estado inicial"
                source={{ uri: initialImageUri }}
                style={styles.image}
              />
            ) : (
              <View style={styles.placeholder}>
                <View style={styles.placeholderIcon}>
                  <Text style={styles.placeholderIconText}>＋</Text>
                </View>

                <Text style={styles.placeholderTitle}>
                  Agrega una fotografía
                </Text>

                <Text style={styles.placeholderDescription}>
                  Procura utilizar buena iluminación y mantener visible toda el
                  área que deseas comparar.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isUploading}
              onPress={() => void handleSelectPhoto("camera")}
              style={styles.primaryAction}
            >
              <Text style={styles.primaryActionText}>
                {initialImagePath ? "Tomar nueva foto" : "Tomar foto"}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isUploading}
              onPress={() => void handleSelectPhoto("library")}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryActionText}>
                {initialImagePath
                  ? "Elegir reemplazo de galería"
                  : "Elegir de galería"}
              </Text>
            </Pressable>
          </View>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Button
            label={isUploading ? "Guardando fotografía..." : "Continuar"}
            disabled={!initialImageUri || isUploading}
            onPress={handleContinue}
          />
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
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: Spacing.xxl,
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

  progressContainer: {
    marginBottom: Spacing.xl,
  },

  progressText: {
    ...Typography.label,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },

  progressTrack: {
    height: 6,
    overflow: "hidden",
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
  },

  progressValue: {
    width: "66%",
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },

  title: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },

  photoCard: {
    width: "100%",
    aspectRatio: 4 / 3,
    overflow: "hidden",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.borderStrong,
    borderRadius: Radius.xl,
  },

  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },

  placeholderIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },

  placeholderIconText: {
    color: Colors.primary,
    fontSize: 28,
    fontWeight: "500",
  },

  placeholderTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  placeholderDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  actions: {
    marginTop: Spacing.lg,
  },

  primaryAction: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },

  primaryActionText: {
    ...Typography.button,
    color: Colors.primary,
  },

  secondaryAction: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
  },

  secondaryActionText: {
    ...Typography.button,
    color: Colors.textPrimary,
  },

  errorText: {
    ...Typography.body,
    color: Colors.danger,
    marginTop: Spacing.md,
    textAlign: "center",
  },

  footer: {
    marginTop: Spacing.xxl,
  },
});
