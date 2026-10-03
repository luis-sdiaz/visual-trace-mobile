import { Colors } from "@/constants/colors";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    paddingHorizontal: 24,
  },

  brand: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },

  title: {
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 42,
    marginBottom: 16,
    color: Colors.textPrimary,
  },

  description: {
    fontSize: 17,
    lineHeight: 26,
    color: Colors.textSecondary,
  },
});
