import LottieView from "lottie-react-native";
import { useCallback, useEffect, useRef } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";

const DAY_FRAME = 0;
const NIGHT_FRAME = 30;

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const animationRef = useRef<LottieView>(null);
  const isFirstRender = useRef(true);
  const isInitialized = useRef(false);
  const currentTheme = useRef(isDark);
  const nextThemeLabel = isDark ? "Activar modo claro" : "Activar modo oscuro";

  useEffect(() => {
    currentTheme.current = isDark;
  }, [isDark]);

  const setInitialFrame = useCallback(() => {
    if (isInitialized.current) {
      return;
    }

    const initialFrame = currentTheme.current ? NIGHT_FRAME : DAY_FRAME;
    animationRef.current?.play(initialFrame, initialFrame);
    animationRef.current?.pause();
    isInitialized.current = true;
  }, []);

  const stopAtThemeFrame = useCallback(() => {
    const targetFrame = currentTheme.current ? NIGHT_FRAME : DAY_FRAME;

    animationRef.current?.play(targetFrame, targetFrame);
    animationRef.current?.pause();
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setInitialFrame();
      return;
    }

    animationRef.current?.play(DAY_FRAME, NIGHT_FRAME);
  }, [isDark, setInitialFrame]);

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
          direction={isDark ? 1 : -1}
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
