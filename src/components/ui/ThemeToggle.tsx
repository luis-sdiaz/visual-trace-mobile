import LottieView from "lottie-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "@/context/ThemeContext";

const DAY_FRAME = 0;
const NIGHT_FRAME = 30;

export function getThemeToggleFrameRange(
  isDark: boolean,
  reduceMotionEnabled = false,
): readonly [number, number] {
  const targetFrame = isDark ? NIGHT_FRAME : DAY_FRAME;

  if (reduceMotionEnabled) return [targetFrame, targetFrame];
  return isDark ? [DAY_FRAME, NIGHT_FRAME] : [NIGHT_FRAME, DAY_FRAME];
}

export function getThemeTogglePlayback(
  isDark: boolean,
  lastAnimatedTheme: boolean,
  reduceMotionEnabled: boolean,
): readonly [number, number] | null {
  if (isDark === lastAnimatedTheme && !reduceMotionEnabled) return null;
  return getThemeToggleFrameRange(isDark, reduceMotionEnabled);
}

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const animationRef = useRef<LottieView>(null);
  const isInitialized = useRef(false);
  const currentTheme = useRef(isDark);
  const lastAnimatedTheme = useRef(isDark);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const nextThemeLabel = isDark ? "Activar modo claro" : "Activar modo oscuro";

  useEffect(() => {
    currentTheme.current = isDark;
  }, [isDark]);

  useEffect(() => {
    let isMounted = true;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotionEnabled,
    );

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setReduceMotionEnabled(enabled);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const setInitialFrame = useCallback(() => {
    if (isInitialized.current) {
      return;
    }

    const [initialFrame] = getThemeToggleFrameRange(
      currentTheme.current,
      reduceMotionEnabled,
    );
    animationRef.current?.pause();
    animationRef.current?.play(initialFrame, initialFrame);
    isInitialized.current = true;
    lastAnimatedTheme.current = currentTheme.current;
  }, [reduceMotionEnabled]);

  const stopAtThemeFrame = useCallback((isCancelled: boolean) => {
    if (!isCancelled) animationRef.current?.pause();
  }, []);

  useEffect(() => {
    if (!isInitialized.current) return;
    const playback = getThemeTogglePlayback(
      isDark,
      lastAnimatedTheme.current,
      reduceMotionEnabled,
    );
    if (!playback) return;
    const [startFrame, endFrame] = playback;

    // Stop any in-flight run before starting exactly one transition toward
    // the current theme. Reverse the frame range when returning to light mode.
    animationRef.current?.pause();
    animationRef.current?.play(startFrame, endFrame);
    lastAnimatedTheme.current = isDark;
  }, [isDark, reduceMotionEnabled]);

  return (
    <TouchableOpacity
      accessibilityLabel={nextThemeLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      activeOpacity={0.8}
      onPress={toggleTheme}
      style={styles.container}
      testID="theme-toggle"
    >
      <View pointerEvents="none" style={styles.animationWrapper}>
        <LottieView
          autoPlay={false}
          loop={false}
          onAnimationFinish={stopAtThemeFrame}
          onAnimationLoaded={setInitialFrame}
          ref={animationRef}
          source={require("../../../assets/animations/theme-switch.json")}
          style={styles.lottie}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 32,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    overflow: "hidden",
  },
  animationWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  lottie: {
    width: "100%",
    height: "100%",
  },
});
