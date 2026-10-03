import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>VisualTrace</Text>

        <Text style={styles.title}>Detecta lo que cambió</Text>

        <Text style={styles.description}>
          Compara el estado inicial y final de tus espacios y objetos con ayuda
          de inteligencia artificial.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },

  brand: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.lg,
  },

  title: {
    ...Typography.display,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },

  description: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
  },
});
