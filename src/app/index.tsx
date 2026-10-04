import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { ComparisonPreview } from "@/components/ui/ComparisonPreview";
import { Colors } from "@/constants/colors";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introContent}>
          <Text style={styles.brand}>VisualTrace</Text>

          <Text style={styles.title}>Detecta lo que cambió</Text>

          <Text style={styles.description}>
            Compara el estado inicial y final de tus espacios y objetos con
            ayuda de inteligencia artificial.
          </Text>
        </View>
        <ComparisonPreview />

        <View style={styles.buttonContainer}>
          <Button
            label="Comenzar"
            onPress={() => console.log("Start button pressed")}
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

  scrollView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xl,
  },

  introContent: {
    flexShrink: 1,
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

  buttonContainer: {
    marginTop: Spacing.xl,
  },
});
