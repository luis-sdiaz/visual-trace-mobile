const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [".expo/**", "coverage/**", "dist/**", "web-build/**"],
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "import/first": "off",
    },
  },
]);
