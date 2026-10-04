import { Stack } from "expo-router";

import { ComparisonProvider } from "@/context/ComparisonContext";

export default function RootLayout() {
  return (
    <ComparisonProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </ComparisonProvider>
  );
}
