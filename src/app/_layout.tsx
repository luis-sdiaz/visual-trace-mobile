import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ComparisonProvider } from "@/context/ComparisonContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ComparisonProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Protected guard={!user}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack.Protected>

        <Stack.Protected guard={Boolean(user)}>
          <Stack.Screen name="home" />
          <Stack.Screen name="new-comparison" />
          <Stack.Screen name="initial-state" />
          <Stack.Screen name="final-state" />
          <Stack.Screen name="comparison-result" />
        </Stack.Protected>
      </Stack>
    </ComparisonProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});
