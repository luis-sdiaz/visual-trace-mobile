import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { addReactNativeSourceBuild } = require("../withReactNativeAndroidTextFix") as {
  addReactNativeSourceBuild: (settingsGradle: string) => string;
};

describe("React Native Android source-build config", () => {
  it("builds patched ReactAndroid from source while Hermes remains a prebuilt dependency", () => {
    const result = addReactNativeSourceBuild("include ':app'\n");

    expect(result).toContain("includeBuild('../node_modules/react-native')");
    expect(result).toContain('substitute(module("com.facebook.react:react-android"))');
    expect(result).not.toContain('substitute(module("com.facebook.react:hermes-android"))');
    expect(result).not.toContain('project(":packages:react-native:ReactAndroid:hermes-engine")');
  });

  it("does not append the source build twice", () => {
    const once = addReactNativeSourceBuild("include ':app'\n");
    expect(addReactNativeSourceBuild(once)).toBe(once);
  });
});
