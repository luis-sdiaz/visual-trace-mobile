import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
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

export default function FinalStateScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permiso necesario",
        "VisualTrace necesita acceso a la cámara para registrar el estado final.",
      );

      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permiso necesario",
        "VisualTrace necesita acceso a tus fotos para seleccionar una imagen.",
      );

      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
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
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Volver</Text>
          </Pressable>

          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>PASO 3 DE 3</Text>

            <View style={styles.progressTrack}>
              <View style={styles.progressValue} />
            </View>
          </View>

          <Text style={styles.title}>Estado final</Text>

          <Text style={styles.description}>
            Registra cómo se encuentra ahora el espacio u objeto. Esta
            fotografía se comparará con el estado inicial.
          </Text>

          <View style={styles.photoCard}>
            {imageUri ? (
              <Image
                accessibilityLabel="Fotografía del estado final"
                source={{ uri: imageUri }}
                style={styles.image}
              />
            ) : (
              <View style={styles.placeholder}>
                <View style={styles.placeholderIcon}>
                  <Text style={styles.placeholderIconText}>＋</Text>
                </View>

                <Text style={styles.placeholderTitle}>
                  Agrega la fotografía final
                </Text>

                <Text style={styles.placeholderDescription}>
                  Intenta conservar un ángulo y una iluminación similares a los
                  utilizados en la fotografía inicial.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={handleTakePhoto}
              style={styles.primaryAction}
            >
              <Text style={styles.primaryActionText}>Tomar foto</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handlePickImage}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryActionText}>Elegir de galería</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label="Comparar estados"
            disabled={!imageUri}
            onPress={() => console.log("Compare states pressed")}
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
    width: "100%",
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

  footer: {
    marginTop: Spacing.xxl,
  },
});
