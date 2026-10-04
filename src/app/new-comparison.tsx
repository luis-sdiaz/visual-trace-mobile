import { router } from "expo-router";
import { useState } from "react";
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

export default function NewComparisonScreen() {
  const [name, setName] = useState("");

  const isNameValid = name.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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
            <Text style={styles.progressText}>PASO 1 DE 3</Text>

            <View style={styles.progressTrack}>
              <View style={styles.progressValue} />
            </View>
          </View>

          <Text style={styles.title}>Nueva comparación</Text>

          <Text style={styles.description}>
            Identifica lo que vas a documentar para mantener organizados sus
            estados inicial y final.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Nombre</Text>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ej. Habitación principal"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
            />

            <Text style={styles.helperText}>
              Usa un nombre corto que te permita reconocer esta comparación
              fácilmente.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label="Continuar"
            disabled={!isNameValid}
            onPress={() => console.log("Continue comparison pressed")}
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
    width: "33%",
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
    marginBottom: Spacing.xxl,
  },

  form: {
    width: "100%",
  },

  label: {
    ...Typography.label,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  input: {
    minHeight: 52,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.lg,
    color: Colors.textPrimary,
    fontSize: 16,
  },

  helperText: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },

  footer: {
    marginTop: Spacing.xxl,
  },
});
