# Moto G04s Android test build

Use the `preview-moto-g04s` EAS profile for the controlled Motorola test:

```sh
eas build --platform android --profile preview-moto-g04s
```

This profile inherits the existing `preview` APK settings and sets
`VISUALTRACE_ANDROID_BUILD_ARCH=arm64-v8a`. During Expo Prebuild, `app.config.js`
then enables `expo-build-properties` with `android.buildArchs: ["arm64-v8a"]`.
The generated `android/gradle.properties` must contain exactly:

```properties
reactNativeArchitectures=arm64-v8a
```

The other EAS profiles do not set the variable and retain Expo's default ABI
list. The architecture reduction avoids the React Native and native-module
configuration/compilation work for `armeabi-v7a`, `x86`, and `x86_64`. It does
not change Java/Kotlin compilation and it does not fix text layout.

## Android 14 text finding

The earlier backported React Native change `dcdb52bc80` called Android's
`TextView.setUseBoundsForWidth(false)`. That API was added in API 35, so it was
a no-op on the Moto G04s (Android 14/API 34). The Expo config no longer
includes the ReactAndroid source-build plugin or its `postinstall` patch. The
validated fix is the localized layout correction: affected text receives the
available width through `width: "100%"`, `alignSelf: "stretch"`, or flexible
row constraints as appropriate to its surrounding design.

Before another paid/remote build, use the existing development-only
`/text-diagnostics` route on the Moto G04s and record:

- which sample visibly clips and whether the clipping is horizontal or vertical;
- viewport size and `fontScale` from the diagnostic header;
- reported text/container dimensions and `onTextLayout` lines;
- whether the same string clips without a fixed-height or `numberOfLines` parent.

The production-safe fallback depends on that evidence:

- For vertical last-line clipping, remove fixed heights and derive `minHeight`
  from `onTextLayout` line count and the declared line height, leaving room for
  Android font metrics. This is the established React Native workaround when
  native measurement under-reports the rendered height.
- For horizontal clipping inside rows/buttons/chips, give the text a definite
  available width with `flexShrink: 1`, avoid fixed-width parents, and allow
  wrapping. Do not compensate with trailing spaces or device-specific pixel
  offsets.
- If only increased system font scale reproduces it, keep scalable text and
  make the affected container responsive instead of disabling font scaling.

Apply the narrowest fallback to the actual affected component after collecting
the diagnostic output. Do not generate an APK for this check: start Expo Go,
open `/text-diagnostics`, and use Fast Refresh after layout changes. The
existing `preview-moto-g04s` profile remains available for a future native
validation, but is not required for this layout-only correction.
