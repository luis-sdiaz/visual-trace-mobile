import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "@/context/ThemeContext";

const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

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
  const { isDark, toggleTheme, isLoaded } = useTheme();
  const [progressAnim] = useState(() => new Animated.Value(isDark ? 1 : 0));
  const isInitialSync = useRef(true);
  const lastAnimatedTheme = useRef(isDark);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const nextThemeLabel = isDark ? "Activar modo claro" : "Activar modo oscuro";

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

  // Sincronización precisa y libre de rebotes:
  // 1. Durante la carga inicial / restauración de preferencias: fija la posición inmediatamente sin animar.
  // 2. Ante pulsaciones del usuario: anima suavemente hacia el estado final (250 ms) o invierte fluidamente sin saltar.
  useEffect(() => {
    const targetValue = isDark ? 1 : 0;

    if (isInitialSync.current) {
      progressAnim.setValue(targetValue);
      lastAnimatedTheme.current = isDark;
      if (isLoaded) {
        isInitialSync.current = false;
      }
      return;
    }

    if (isDark === lastAnimatedTheme.current && !reduceMotionEnabled) {
      return;
    }

    lastAnimatedTheme.current = isDark;

    if (reduceMotionEnabled) {
      progressAnim.setValue(targetValue);
    } else {
      Animated.timing(progressAnim, {
        toValue: targetValue,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [isDark, isLoaded, progressAnim, reduceMotionEnabled]);

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
        <AnimatedLottieView
          autoPlay={false}
          loop={false}
          progress={progressAnim}
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
