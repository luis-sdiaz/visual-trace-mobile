import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __DEV__: "true",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "react-native": "react-native-web",
    },
  },
  test: {
    clearMocks: true,
    environment: "node",
    setupFiles: ["./test-setup.ts"],
  },
});
