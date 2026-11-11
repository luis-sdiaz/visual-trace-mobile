import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ComparisonProvider } from "@/context/ComparisonContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { getAuthRouteAccess } from "@/utils/authNavigation";
import "@/i18n";

// Keep the native splash visible only while the real session state is resolving.
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppNavigator() {
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hide();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const routeAccess = getAuthRouteAccess(Boolean(user));

  return (
    <ComparisonProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={routeAccess.canAccessGuestRoutes}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
        </Stack.Protected>

        <Stack.Protected guard={routeAccess.canAccessAuthenticatedRoutes}>
          <Stack.Screen name="home" />
          <Stack.Screen name="settings" />
          {__DEV__ ? <Stack.Screen name="text-diagnostics" /> : null}
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
  },
});
