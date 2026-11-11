const fs = require("node:fs");
const path = require("node:path");

const SUPPORTED_REACT_NATIVE_VERSION = "0.88.1";
const TEXT_PATCH_MARKER = "matchLineBreakingToMeasurement";
const HERMES_PATCH_MARKER = 'eachFile { path = path.substringAfter("/") }';
const PREBUILT_HERMES_PATCH_MARKER =
  "VisualTrace: use RN-matched prebuilt stable Hermes for ReactAndroid source builds";
const DEFAULT_REACT_NATIVE_ARCHITECTURES =
  "armeabi-v7a,arm64-v8a,x86,x86_64";

function replaceOnce(source, search, replacement, label) {
  const firstIndex = source.indexOf(search);
  if (firstIndex === -1) {
    throw new Error(`Cannot apply React Native Android fixes: missing ${label} anchor.`);
  }
  if (source.indexOf(search, firstIndex + search.length) !== -1) {
    throw new Error(`Cannot apply React Native Android fixes: ambiguous ${label} anchor.`);
  }
  return source.replace(search, replacement);
}

function patchReactTextView(source) {
  if (source.includes(TEXT_PATCH_MARKER)) {
    return source;
  }

  let patched = source;
  patched = replaceOnce(
    patched,
    "import android.view.ViewGroup;\n",
    "import android.view.ViewGroup;\nimport android.widget.TextView;\n",
    "TextView import",
  );
  patched = replaceOnce(
    patched,
    "import com.facebook.react.uimanager.style.Overflow;\n",
    "import com.facebook.react.uimanager.style.Overflow;\nimport com.facebook.react.util.AndroidVersion;\n",
    "AndroidVersion import",
  );
  patched = replaceOnce(
    patched,
    "import com.facebook.yoga.YogaMeasureMode;\n",
    "import com.facebook.yoga.YogaMeasureMode;\nimport java.lang.reflect.Method;\n",
    "Method import",
  );
  patched = replaceOnce(
    patched,
    "  private static final int DEFAULT_GRAVITY = Gravity.TOP | Gravity.START;\n",
    `  private static final int DEFAULT_GRAVITY = Gravity.TOP | Gravity.START;

  // TextView.setUseBoundsForWidth (API 35+). Looked up reflectively because some targets
  // compile against an SDK older than 35 (see AndroidVersion).
  private static final @Nullable Method SET_USE_BOUNDS_FOR_WIDTH = resolveSetUseBoundsForWidth();
`,
    "default gravity",
  );
  patched = replaceOnce(
    patched,
    `  public ReactTextView(Context context) {
    super(context);
    initView();
  }

`,
    `  @SuppressWarnings("this-escape")
  public ReactTextView(Context context) {
    super(context);
    initView();
  }

  private static @Nullable Method resolveSetUseBoundsForWidth() {
    if (Build.VERSION.SDK_INT < AndroidVersion.VERSION_CODE_VANILLA_ICE_CREAM) {
      return null;
    }
    try {
      return TextView.class.getMethod("setUseBoundsForWidth", boolean.class);
    } catch (NoSuchMethodException e) {
      return null;
    }
  }

  /** Keeps drawing and TextLayoutManager measurement on the same advance-based line breaking. */
  private void matchLineBreakingToMeasurement() {
    if (SET_USE_BOUNDS_FOR_WIDTH == null) {
      return;
    }
    try {
      SET_USE_BOUNDS_FOR_WIDTH.invoke(this, false);
    } catch (ReflectiveOperationException e) {
      FLog.w(ReactConstants.TAG, "Could not disable useBoundsForWidth on ReactTextView", e);
    }
  }

`,
    "ReactTextView constructor",
  );
  patched = replaceOnce(
    patched,
    `    mSpanned = null;
    mPreparedLayout = null;
  }
`,
    `    mSpanned = null;
    mPreparedLayout = null;
    matchLineBreakingToMeasurement();
  }
`,
    "ReactTextView initialization",
  );

  return patched;
}

function patchHermesBuildGradle(source) {
  const hasCanonicalUrl = source.includes("https://github.com/meta/hermes/tarball/");
  const hasRepositoryAgnosticExtraction = source.includes(HERMES_PATCH_MARKER);
  const excludesEmptyDirectories = source.includes("includeEmptyDirs = false");

  if (hasCanonicalUrl && hasRepositoryAgnosticExtraction && excludesEmptyDirectories) {
    return source;
  }

  if (hasCanonicalUrl || hasRepositoryAgnosticExtraction || excludesEmptyDirectories) {
    throw new Error(
      "Cannot apply Hermes extraction fix f6a5042: the Gradle file is only partially patched. Reinstall react-native 0.88.1 and retry.",
    );
  }

  let patched = replaceOnce(
    source,
    "https://github.com/facebook/hermes/tarball/",
    "https://github.com/meta/hermes/tarball/",
    "Hermes download URL",
  );
  patched = replaceOnce(
    patched,
    `        eachFile {
          // We flatten the unzip as the tarball contains a \`facebook-hermes-<SHA>\`
          // folder at the top level.
          if (this.path.startsWith("facebook-hermes-")) {
            this.path = this.path.substringAfter("/")
          }
        }
`,
    `        eachFile { path = path.substringAfter("/") }
        includeEmptyDirs = false
`,
    "Hermes archive extraction",
  );

  return patched;
}

function patchReactNativeBuildGradleForPrebuiltHermes(source) {
  if (source.includes(PREBUILT_HERMES_PATCH_MARKER)) {
    return source;
  }

  const anchor = 'buildscript { dependencies { classpath("com.facebook.react:react-native-gradle-plugin") } }\n';
  const block = `

// ${PREBUILT_HERMES_PATCH_MARKER}
if (project.findProperty("react.internal.useHermesStable")?.toString()?.toBoolean() == true) {
  val hermesVersions = java.util.Properties()
  val hermesVersionPropertiesFile = rootProject.file("./sdks/hermes-engine/version.properties")
  hermesVersionPropertiesFile.inputStream().use { hermesVersions.load(it) }
  val selectedHermesVersion = hermesVersions["HERMES_VERSION_NAME"] as String

  project(":packages:react-native:ReactAndroid:hermes-engine") {
    tasks.configureEach { enabled = false }
  }

  allprojects {
    configurations.all {
      resolutionStrategy.dependencySubstitution {
        substitute(project(":packages:react-native:ReactAndroid:hermes-engine"))
            .using(module("com.facebook.hermes:hermes-android:$selectedHermesVersion"))
            .because("VisualTrace uses the stable Hermes artifact matched to React Native 0.88.1")
      }
    }
  }
}
`;

  return replaceOnce(source, anchor, `${anchor}${block}`, "React Native root build script");
}

function enablePrebuiltStableHermes(source) {
  const property = "react.internal.useHermesStable=true";
  if (source.split(/\r?\n/).includes(property)) {
    return source;
  }
  return `${source.trimEnd()}\n${property}\n`;
}

function setReactNativeArchitectures(source, architectures) {
  const property = `reactNativeArchitectures=${architectures}`;
  const propertyPattern = /^reactNativeArchitectures=.*$/gm;
  const matches = source.match(propertyPattern) ?? [];

  if (matches.length > 1) {
    throw new Error(
      "Cannot configure React Native source-build architectures: duplicate reactNativeArchitectures properties.",
    );
  }
  if (matches.length === 1) {
    return source.replace(propertyPattern, property);
  }
  return `${source.trimEnd()}\n${property}\n`;
}

function applyReactNativeTextFix(projectRoot = path.resolve(__dirname, "..")) {
  const packagePath = path.join(projectRoot, "node_modules", "react-native", "package.json");
  const reactNativePackage = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  if (reactNativePackage.version !== SUPPORTED_REACT_NATIVE_VERSION) {
    throw new Error(
      `React Native Android fixes expect react-native ${SUPPORTED_REACT_NATIVE_VERSION}, found ${reactNativePackage.version}. Review upstream fixes dcdb52bc80 and f6a5042 before upgrading.`,
    );
  }

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
  const patched = patchReactTextView(source);

  if (patched !== source) {
    fs.writeFileSync(sourcePath, patched, "utf8");
    process.stdout.write("Applied React Native Android text fix dcdb52bc80.\n");
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
  const patchedHermesBuildGradle = patchHermesBuildGradle(hermesBuildGradle);

  if (patchedHermesBuildGradle !== hermesBuildGradle) {
    fs.writeFileSync(hermesBuildGradlePath, patchedHermesBuildGradle, "utf8");
    process.stdout.write("Applied React Native Hermes extraction fix f6a5042 (#59589).\n");
  }

  const reactNativeBuildGradlePath = path.join(
    projectRoot,
    "node_modules",
    "react-native",
    "build.gradle.kts",
  );
  const reactNativeBuildGradle = fs.readFileSync(reactNativeBuildGradlePath, "utf8");
  const patchedReactNativeBuildGradle =
    patchReactNativeBuildGradleForPrebuiltHermes(reactNativeBuildGradle);
  if (patchedReactNativeBuildGradle !== reactNativeBuildGradle) {
    fs.writeFileSync(reactNativeBuildGradlePath, patchedReactNativeBuildGradle, "utf8");
    process.stdout.write("Enabled RN-matched prebuilt Hermes for ReactAndroid source builds.\n");
  }

  const reactNativeGradlePropertiesPath = path.join(
    projectRoot,
    "node_modules",
    "react-native",
    "gradle.properties",
  );
  const reactNativeGradleProperties = fs.readFileSync(reactNativeGradlePropertiesPath, "utf8");
  const requestedArchitectures =
    process.env.VISUALTRACE_ANDROID_BUILD_ARCH ?? DEFAULT_REACT_NATIVE_ARCHITECTURES;
  const patchedReactNativeGradleProperties = setReactNativeArchitectures(
    enablePrebuiltStableHermes(reactNativeGradleProperties),
    requestedArchitectures,
  );
  if (patchedReactNativeGradleProperties !== reactNativeGradleProperties) {
    fs.writeFileSync(
      reactNativeGradlePropertiesPath,
      patchedReactNativeGradleProperties,
      "utf8",
    );
  }
}

if (require.main === module) {
  applyReactNativeTextFix();
}

module.exports = {
  HERMES_PATCH_MARKER,
  PREBUILT_HERMES_PATCH_MARKER,
  DEFAULT_REACT_NATIVE_ARCHITECTURES,
  SUPPORTED_REACT_NATIVE_VERSION,
  TEXT_PATCH_MARKER,
  applyReactNativeTextFix,
  enablePrebuiltStableHermes,
  patchHermesBuildGradle,
  patchReactNativeBuildGradleForPrebuiltHermes,
  patchReactTextView,
  setReactNativeArchitectures,
};
