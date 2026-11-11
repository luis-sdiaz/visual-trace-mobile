const fs = require("node:fs");
const path = require("node:path");
const { withSettingsGradle } = require("expo/config-plugins");

const {
  DEFAULT_REACT_NATIVE_ARCHITECTURES,
  HERMES_PATCH_MARKER,
  PREBUILT_HERMES_PATCH_MARKER,
  TEXT_PATCH_MARKER,
  setReactNativeArchitectures,
} = require("../scripts/apply-react-native-text-fix");

const SOURCE_BUILD_MARKER = "VisualTrace: compile patched React Native Android source";
const SOURCE_BUILD_BLOCK = `

// ${SOURCE_BUILD_MARKER}
includeBuild('../node_modules/react-native') {
    dependencySubstitution {
        substitute(module("com.facebook.react:react-android")).using(project(":packages:react-native:ReactAndroid"))
        substitute(module("com.facebook.react:react-native")).using(project(":packages:react-native:ReactAndroid"))
    }
}
`;

function addReactNativeSourceBuild(settingsGradle) {
  if (settingsGradle.includes(SOURCE_BUILD_MARKER)) {
    return settingsGradle;
  }
  return `${settingsGradle.trimEnd()}${SOURCE_BUILD_BLOCK}`;
}

function syncReactNativeSourceBuildArchitectures(projectRoot) {
  const gradlePropertiesPath = path.join(projectRoot, "node_modules", "react-native", "gradle.properties");
  const gradleProperties = fs.readFileSync(gradlePropertiesPath, "utf8");
  const architectures =
    process.env.VISUALTRACE_ANDROID_BUILD_ARCH ?? DEFAULT_REACT_NATIVE_ARCHITECTURES;
  const updatedGradleProperties = setReactNativeArchitectures(
    gradleProperties,
    architectures,
  );

  if (updatedGradleProperties !== gradleProperties) {
    fs.writeFileSync(gradlePropertiesPath, updatedGradleProperties, "utf8");
  }
}

function assertPatchedReactNativeSources(projectRoot) {
  const sourcePath = path.join(
    projectRoot,
    "node_modules",
    "react-native",
    "ReactAndroid",
    "src",
    "main",
    "java",
    "com",
    "facebook",
    "react",
    "views",
    "text",
    "ReactTextView.java",
  );
  const source = fs.readFileSync(sourcePath, "utf8");
  if (!source.includes(TEXT_PATCH_MARKER)) {
    throw new Error(
      "ReactTextView is not patched. Run npm install so the postinstall Android text fix is applied before prebuild.",
    );
  }

  const hermesBuildGradlePath = path.join(
    projectRoot,
    "node_modules",
    "react-native",
    "ReactAndroid",
    "hermes-engine",
    "build.gradle.kts",
  );
  const hermesBuildGradle = fs.readFileSync(hermesBuildGradlePath, "utf8");
  if (
    !hermesBuildGradle.includes(HERMES_PATCH_MARKER) ||
    !hermesBuildGradle.includes("https://github.com/meta/hermes/tarball/") ||
    !hermesBuildGradle.includes("includeEmptyDirs = false")
  ) {
    throw new Error(
      "Hermes extraction is not patched with f6a5042 (#59589). Run npm install before prebuild.",
    );
  }

  const reactNativeBuildGradle = fs.readFileSync(
    path.join(projectRoot, "node_modules", "react-native", "build.gradle.kts"),
    "utf8",
  );
  const reactNativeGradleProperties = fs.readFileSync(
    path.join(projectRoot, "node_modules", "react-native", "gradle.properties"),
    "utf8",
  );
  if (
    !reactNativeBuildGradle.includes(PREBUILT_HERMES_PATCH_MARKER) ||
    !reactNativeGradleProperties
      .split(/\r?\n/)
      .includes("react.internal.useHermesStable=true")
  ) {
    throw new Error(
      "Prebuilt stable Hermes is not enabled for the ReactAndroid source build. Run npm install before prebuild.",
    );
  }

  const expectedArchitectures =
    process.env.VISUALTRACE_ANDROID_BUILD_ARCH ?? DEFAULT_REACT_NATIVE_ARCHITECTURES;
  if (
    !reactNativeGradleProperties
      .split(/\r?\n/)
      .includes(`reactNativeArchitectures=${expectedArchitectures}`)
  ) {
    throw new Error(
      `ReactAndroid source-build architectures are not synchronized to ${expectedArchitectures}.`,
    );
  }
}

function withReactNativeAndroidTextFix(config) {
  return withSettingsGradle(config, (configWithSettings) => {
    syncReactNativeSourceBuildArchitectures(configWithSettings.modRequest.projectRoot);
    assertPatchedReactNativeSources(configWithSettings.modRequest.projectRoot);
    configWithSettings.modResults.contents = addReactNativeSourceBuild(
      configWithSettings.modResults.contents,
    );
    return configWithSettings;
  });
}

module.exports = withReactNativeAndroidTextFix;
module.exports.addReactNativeSourceBuild = addReactNativeSourceBuild;
module.exports.assertPatchedReactNativeSources = assertPatchedReactNativeSources;
module.exports.syncReactNativeSourceBuildArchitectures =
  syncReactNativeSourceBuildArchitectures;
