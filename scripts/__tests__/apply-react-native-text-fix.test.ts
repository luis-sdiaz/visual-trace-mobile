import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  enablePrebuiltStableHermes,
  patchHermesBuildGradle,
  patchReactNativeBuildGradleForPrebuiltHermes,
  patchReactTextView,
  setReactNativeArchitectures,
} = require(
  "../apply-react-native-text-fix",
) as {
  patchHermesBuildGradle: (source: string) => string;
  patchReactNativeBuildGradleForPrebuiltHermes: (source: string) => string;
  patchReactTextView: (source: string) => string;
  enablePrebuiltStableHermes: (source: string) => string;
  setReactNativeArchitectures: (source: string, architectures: string) => string;
};

const fixture = `import android.view.ViewGroup;
import com.facebook.react.uimanager.style.Overflow;
import com.facebook.yoga.YogaMeasureMode;

class ReactTextView {
  private static final int DEFAULT_GRAVITY = Gravity.TOP | Gravity.START;

  public ReactTextView(Context context) {
    super(context);
    initView();
  }

  private void initView() {
    mSpanned = null;
    mPreparedLayout = null;
  }
}
`;

const hermesFixture = `val downloadHermes by
    tasks.registering(Download::class) {
      src(
          providers.provider {
            "https://github.com/facebook/hermes/tarball/\${hermesVersionProvider.get()}"
          },
      )
    }

val unzipHermes by
    tasks.registering(Copy::class) {
      from(tarTree(downloadHermesDest)) {
        eachFile {
          // We flatten the unzip as the tarball contains a \`facebook-hermes-<SHA>\`
          // folder at the top level.
          if (this.path.startsWith("facebook-hermes-")) {
            this.path = this.path.substringAfter("/")
          }
        }
      }
      into(hermesDir)
    }
`;

describe("ReactTextView Android text patch", () => {
  it("ports the upstream API 35+ fix and reapplies it during initialization", () => {
    const patched = patchReactTextView(fixture);

    expect(patched).toContain('TextView.class.getMethod("setUseBoundsForWidth", boolean.class)');
    expect(patched).toContain("SET_USE_BOUNDS_FOR_WIDTH.invoke(this, false)");
    expect(patched).toContain("matchLineBreakingToMeasurement();");
  });

  it("is idempotent", () => {
    const patched = patchReactTextView(fixture);
    expect(patchReactTextView(patched)).toBe(patched);
  });
});

describe("Hermes source extraction patch", () => {
  it("ports upstream f6a5042 without depending on the archive owner", () => {
    const patched = patchHermesBuildGradle(hermesFixture);

    expect(patched).toContain("https://github.com/meta/hermes/tarball/");
    expect(patched).toContain('eachFile { path = path.substringAfter("/") }');
    expect(patched).toContain("includeEmptyDirs = false");
    expect(patched).not.toContain("facebook-hermes-");
  });

  it("is idempotent", () => {
    const patched = patchHermesBuildGradle(hermesFixture);
    expect(patchHermesBuildGradle(patched)).toBe(patched);
  });

  it("rejects a partial patch instead of hiding an incompatible structure", () => {
    const partial = hermesFixture.replace(
      "https://github.com/facebook/hermes/tarball/",
      "https://github.com/meta/hermes/tarball/",
    );

    expect(() => patchHermesBuildGradle(partial)).toThrow("only partially patched");
  });
});

describe("prebuilt stable Hermes for ReactAndroid source builds", () => {
  const rootBuildFixture =
    'plugins { id("example") }\n\nbuildscript { dependencies { classpath("com.facebook.react:react-native-gradle-plugin") } }\n';

  it("backports the upstream project-to-stable-module substitution", () => {
    const patched = patchReactNativeBuildGradleForPrebuiltHermes(rootBuildFixture);

    expect(patched).toContain('rootProject.file("./sdks/hermes-engine/version.properties")');
    expect(patched).toContain("tasks.configureEach { enabled = false }");
    expect(patched).toContain(
      'substitute(project(":packages:react-native:ReactAndroid:hermes-engine"))',
    );
    expect(patched).toContain(
      'module("com.facebook.hermes:hermes-android:$selectedHermesVersion")',
    );
  });

  it("is idempotent and enables the stable property only once", () => {
    const patched = patchReactNativeBuildGradleForPrebuiltHermes(rootBuildFixture);
    expect(patchReactNativeBuildGradleForPrebuiltHermes(patched)).toBe(patched);

    const properties = enablePrebuiltStableHermes("android.useAndroidX=true\n");
    expect(enablePrebuiltStableHermes(properties)).toBe(properties);
    expect(properties.match(/react\.internal\.useHermesStable=true/g)).toHaveLength(1);
  });
});

describe("ReactAndroid source-build architectures", () => {
  it("sets and replaces the architecture property idempotently", () => {
    const initial = setReactNativeArchitectures(
      "android.useAndroidX=true\n",
      "arm64-v8a",
    );
    expect(initial).toContain("reactNativeArchitectures=arm64-v8a");
    expect(setReactNativeArchitectures(initial, "arm64-v8a")).toBe(initial);
    expect(setReactNativeArchitectures(initial, "x86_64")).toContain(
      "reactNativeArchitectures=x86_64",
    );
  });

  it("rejects duplicate architecture properties", () => {
    expect(() =>
      setReactNativeArchitectures(
        "reactNativeArchitectures=arm64-v8a\nreactNativeArchitectures=x86_64\n",
        "arm64-v8a",
      ),
    ).toThrow("duplicate reactNativeArchitectures");
  });
});
