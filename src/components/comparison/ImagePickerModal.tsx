import React from "react";
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
  return (
    <Modal
      accessibilityLabel={`Selector de origen de imagen para ${stageLabel}`}
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
            <Text style={styles.title}>Seleccionar fotografía</Text>
            <Text style={styles.subtitle}>
              Elige el método para registrar el {stageLabel}.
            </Text>
          </View>

          <View style={styles.buttonsContainer}>
            <Pressable
              accessibilityHint="Abre la cámara del dispositivo para capturar una nueva foto de inspección"
              accessibilityLabel="Tomar fotografía con la cámara"
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
                <Text style={styles.optionTitle}>Tomar con la cámara</Text>
                <Text style={styles.optionDescription}>
                  Captura una foto directamente en el sitio
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityHint="Abre la galería del dispositivo para elegir una imagen previamente tomada"
              accessibilityLabel="Seleccionar fotografía de la galería"
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
                <Text style={styles.optionTitle}>Elegir de la galería</Text>
                <Text style={styles.optionDescription}>
                  Selecciona una imagen guardada en tu carrete
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityHint="Cierra este diálogo modal sin realizar cambios"
              accessibilityLabel="Cancelar selección de imagen"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              testID="image-picker-cancel-button"
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
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

