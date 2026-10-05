import { Stack } from "expo-router";

import { AuthProvider } from "@/context/AuthContext";
import { ComparisonProvider } from "@/context/ComparisonContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <ComparisonProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </ComparisonProvider>
    </AuthProvider>
  );
}
