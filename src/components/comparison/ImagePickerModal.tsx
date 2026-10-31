import React from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import "@/i18n";

export type ImagePickerModalSource = "camera" | "gallery";

export interface ImagePickerModalProps {
  visible: boolean;
  stageLabel?: string;
  onClose: () => void;
  onSelectSource: (source: ImagePickerModalSource) => void;
  testID?: string;
}

export function ImagePickerModal({
  visible,
  stageLabel = "inspección",
  onClose,
  onSelectSource,
  testID = "image-picker-modal",
}: ImagePickerModalProps) {
  const { t } = useTranslation();
  return (
    <Modal
      accessibilityLabel={t("media.chooseMethod", { stage: stageLabel })}
      accessibilityViewIsModal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("media.selectPhoto")}</Text>
            <Text style={styles.subtitle}>
              {t("media.chooseMethod", { stage: stageLabel })}
            </Text>
          </View>

          <View style={styles.buttonsContainer}>
            <Pressable
              accessibilityHint={t("media.cameraHint")}
              accessibilityLabel={t("media.cameraLabel")}
              accessibilityRole="button"
              onPress={() => {
                onSelectSource("camera");
                onClose();
              }}
              style={({ pressed }) => [
                styles.optionButton,
                styles.optionButtonPrimary,
                pressed && styles.buttonPressed,
              ]}
              testID="image-picker-camera-button"
            >
              <Text style={styles.optionIcon}>📷</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>{t("media.cameraTitle")}</Text>
                <Text style={styles.optionDescription}>
                  {t("media.cameraDescription")}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityHint={t("media.galleryHint")}
              accessibilityLabel={t("media.galleryLabel")}
              accessibilityRole="button"
              onPress={() => {
                onSelectSource("gallery");
                onClose();
              }}
              style={({ pressed }) => [
                styles.optionButton,
                styles.optionButtonSecondary,
                pressed && styles.buttonPressed,
              ]}
              testID="image-picker-gallery-button"
            >
              <Text style={styles.optionIcon}>🖼️</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>{t("media.galleryTitle")}</Text>
                <Text style={styles.optionDescription}>
                  {t("media.galleryDescription")}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityHint={t("media.cancel")}
              accessibilityLabel={t("media.cancelSelection")}
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              testID="image-picker-cancel-button"
            >
              <Text style={styles.cancelButtonText}>{t("media.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    marginBottom: Spacing.lg,
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
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  buttonsContainer: {
    gap: Spacing.md,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  optionButtonPrimary: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.borderPrimary,
  },
  optionButtonSecondary: {
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.border,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  optionIcon: {
    fontSize: 26,
    marginRight: Spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  optionDescription: {
    ...Typography.body,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
  },
  cancelButtonText: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.textMuted,
  },
});
