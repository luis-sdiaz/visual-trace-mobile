import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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

import {
  ImagePickerModal,
  type ImagePickerModalSource,
} from "@/components/comparison/ImagePickerModal";
import { getDevTextMeasurementProps } from "@/components/dev/devTextMeasurement";
import { Button } from "@/components/ui/Button";
import { LayoutText } from "@/components/ui/LayoutText";
import { PhotoPreviewModal } from "@/components/ui/PhotoPreviewModal";
import { type ColorPalette } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useComparison } from "@/context/ComparisonContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getComparisonImageSaveErrorMessage,
  restoreSavedComparisonImage,
  saveComparisonImage,
  shouldUploadComparisonImage,
} from "@/services/comparisonImageLifecycleService";
import { markComparisonReady } from "@/services/comparisonService";
import {
  selectComparisonPhoto,
  type PhotoSelectionSource,
} from "@/utils/imageSelection";

export default function FinalStateScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    comparisonId,
    initialImageUri,
    finalImageUri,
    finalImagePath,
    finalImageIsDirty,
    markFinalImageSaved,
    restoreSavedImage,
    setFinalImageUri,
  } = useComparison();

  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const uploadingRef = useRef(false);
  const discardingRef = useRef(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  function acceptSelectedImage(uri: string) {
    if (!finalImagePath) {
      setFinalImageUri(uri);
      setErrorMessage(null);
      return;
    }

    Alert.alert(t("flow.replaceFinalTitle"), t("flow.replaceDescription"), [
      { text: t("flow.cancel"), style: "cancel" },
      {
        text: t("flow.replace"),
        onPress: () => {
          setFinalImageUri(uri);
          setErrorMessage(null);
        },
      },
    ]);
  }

  async function handleSelectPhoto(source: PhotoSelectionSource) {
    if (uploadingRef.current || discardingRef.current) {
      return;
    }

    try {
      const outcome = await selectComparisonPhoto(source, ImagePicker);
      if (outcome.status === "permission_denied") {
        Alert.alert(
          t("flow.permissionRequired"),
          source === "camera"
            ? t("flow.cameraPermissionFinal")
            : t("flow.galleryPermission"),
        );
      } else if (outcome.status === "selected") {
        acceptSelectedImage(outcome.uri);
      }
    } catch {
      setErrorMessage(t("flow.pickerError"));
    }
  }

  function handlePickerSource(source: ImagePickerModalSource) {
    void handleSelectPhoto(source === "gallery" ? "library" : "camera");
  }

  async function handleContinue() {
    if (
      !initialImageUri ||
      !finalImageUri ||
      uploadingRef.current ||
      discardingRef.current
    ) {
      return;
    }

    if (!comparisonId) {
      setErrorMessage(t("flow.comparisonNotFound"));

      return;
    }

    uploadingRef.current = true;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      if (!shouldUploadComparisonImage(finalImagePath, finalImageIsDirty)) {
        await markComparisonReady(comparisonId);
        router.push("/comparison-result");
        return;
      }

      const imagePath = await saveComparisonImage({
        comparisonId,
        imageUri: finalImageUri,
        imageStage: "final",
        previousImagePath: finalImagePath,
      });
      markFinalImageSaved(imagePath);
      await markComparisonReady(comparisonId);

      router.push("/comparison-result");
    } catch (error) {
      console.error("Failed to save final comparison image:", error);

      setErrorMessage(getComparisonImageSaveErrorMessage(error, "final"));
    } finally {
      uploadingRef.current = false;
      setIsUploading(false);
    }
  }

  async function handleDiscardReplacement() {
    if (
      !comparisonId ||
      !finalImagePath ||
      uploadingRef.current ||
      discardingRef.current
    )
      return;
    discardingRef.current = true;
    setIsDiscarding(true);
    setErrorMessage(null);
    try {
      const savedImage = await restoreSavedComparisonImage({
        comparisonId,
        imageStage: "final",
        expectedImagePath: finalImagePath,
      });
      restoreSavedImage("final", savedImage.uri, savedImage.path);
    } catch (error) {
      setErrorMessage(getComparisonImageSaveErrorMessage(error, "final"));
    } finally {
      discardingRef.current = false;
      setIsDiscarding(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Pressable
            accessibilityRole="button"
            disabled={isUploading || isDiscarding}
            onPress={() => router.replace("/initial-state")}
            style={styles.backButton}
            testID="final-back-button"
          >
            <Text style={[styles.backIcon, { color: colors.textPrimary }]}>
              ←
            </Text>
            <Text
              style={[styles.backText, { color: colors.textSecondary }]}
              {...getDevTextMeasurementProps("final.back", t("flow.back"))}
            >
              {t("flow.back")}
            </Text>
          </Pressable>

          <View style={styles.progressContainer}>
            <LayoutText
              layout="atomic"
              style={[styles.progressText, { color: colors.primary }]}
            >
              {t("flow.step3")}
            </LayoutText>

            <View style={styles.progressTrack}>
              <View style={styles.progressValue} />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t("flow.finalTitle")}
          </Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t("flow.finalDescription")}
          </Text>

          <View
            style={[
              styles.photoCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderStrong,
              },
            ]}
          >
            {finalImageUri ? (
              <Pressable
                accessibilityLabel={t("flow.expandFinalPhoto")}
                accessibilityRole="button"
                onPress={() => setIsPreviewVisible(true)}
                style={styles.image}
              >
                <Image
                  accessibilityLabel={t("flow.finalPhotoLabel")}
                  source={{ uri: finalImageUri }}
                  style={styles.image}
                />
              </Pressable>
            ) : (
              <Pressable
                accessibilityLabel={t("flow.addFinalPhoto")}
                accessibilityRole="button"
                disabled={isUploading || isDiscarding}
                onPress={() => setIsPickerVisible(true)}
                style={({ pressed }) => [
                  styles.placeholder,
                  pressed && styles.placeholderPressed,
                ]}
                testID="final-photo-picker-trigger"
              >
                <View pointerEvents="none" style={styles.placeholderIcon}>
                  <Text style={styles.placeholderIconText}>＋</Text>
                </View>

                <Text
                  style={[
                    styles.placeholderTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  {t("flow.addFinalPhoto")}
                </Text>

                <Text
                  style={[
                    styles.placeholderDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("flow.choosePhotoDescription")}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isUploading || isDiscarding}
              onPress={() => void handleSelectPhoto("camera")}
              style={styles.primaryAction}
            >
              <Text style={styles.primaryActionText}>
                {finalImagePath ? t("flow.takeNewPhoto") : t("flow.takePhoto")}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isUploading || isDiscarding}
              onPress={() => void handleSelectPhoto("library")}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryActionText}>
                {finalImagePath
                  ? t("flow.chooseReplacement")
                  : t("flow.chooseFromGallery")}
              </Text>
            </Pressable>
          </View>

          {finalImagePath && finalImageIsDirty ? (
            <Pressable
              accessibilityRole="button"
              disabled={isUploading || isDiscarding}
              onPress={() => void handleDiscardReplacement()}
              style={styles.discardAction}
            >
              <Text style={styles.discardActionText}>
                {isDiscarding
                  ? t("flow.restoringPhoto")
                  : t("flow.discardReplacement")}
              </Text>
            </Pressable>
          ) : null}

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Button
            label={
              isUploading ? t("flow.savingPhoto") : t("flow.compareStates")
            }
            disabled={
              !initialImageUri ||
              !finalImageUri ||
              isUploading ||
              isDiscarding
            }
            onPress={handleContinue}
          />
        </View>
      </ScrollView>
      <ImagePickerModal
        onClose={() => setIsPickerVisible(false)}
        onSelectSource={handlePickerSource}
        stageLabel={t("flow.finalTitle").toLocaleLowerCase()}
        testID="final-image-picker-modal"
        visible={isPickerVisible}
      />
      <PhotoPreviewModal
        label={t("flow.finalTitle")}
        onClose={() => setIsPreviewVisible(false)}
        uri={finalImageUri}
        visible={isPreviewVisible}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      minHeight: 44,
      paddingVertical: Spacing.xs,
      paddingRight: Spacing.md,
      marginBottom: Spacing.xxl,
    },

    backIcon: {
      color: colors.textPrimary,
      fontSize: 22,
      marginRight: Spacing.sm,
      flexShrink: 0,
    },

    backText: {
      ...Typography.label,
      color: colors.textPrimary,
      minWidth: 52,
      flexShrink: 0,
    },

    progressContainer: {
      marginBottom: Spacing.xl,
    },

    progressText: {
      ...Typography.label,
      color: colors.primary,
      marginBottom: Spacing.sm,
      flexShrink: 0,
    },

    progressTrack: {
      height: 6,
      overflow: "hidden",
      backgroundColor: colors.border,
      borderRadius: Radius.full,
    },

    progressValue: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: Radius.full,
    },

    title: {
      ...Typography.heading,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },

    description: {
      ...Typography.body,
      color: colors.textSecondary,
      marginBottom: Spacing.xl,
    },

    photoCard: {
      width: "100%",
      aspectRatio: 4 / 3,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.borderStrong,
      borderRadius: Radius.xl,
    },

    placeholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: Spacing.xl,
    },

    placeholderPressed: {
      opacity: 0.8,
    },

    placeholderIcon: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
      borderRadius: Radius.full,
      marginBottom: Spacing.md,
    },

    placeholderIconText: {
      color: colors.primary,
      fontSize: 28,
      fontWeight: "500",
    },

    placeholderTitle: {
      ...Typography.title,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: Spacing.sm,
    },

    placeholderDescription: {
      ...Typography.body,
      color: colors.textSecondary,
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
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      backgroundColor: colors.primarySoft,
      borderRadius: Radius.lg,
      marginBottom: Spacing.md,
    },

    primaryActionText: {
      ...Typography.button,
      color: colors.primary,
      textAlign: "center",
      width: "100%",
      minWidth: 0,
      flexShrink: 1,
    },

    secondaryAction: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.lg,
    },

    secondaryActionText: {
      ...Typography.button,
      color: colors.textPrimary,
      textAlign: "center",
      width: "100%",
      minWidth: 0,
      flexShrink: 1,
    },

    discardAction: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginTop: Spacing.sm,
    },

    discardActionText: {
      ...Typography.label,
      color: colors.danger,
    },

    errorText: {
      ...Typography.body,
      color: colors.danger,
      marginTop: Spacing.md,
      textAlign: "center",
    },

    footer: {
      marginTop: Spacing.xxl,
    },
  });
}
