import { Moon, Sun } from "lucide-react-native";
import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const transition = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const nextThemeLabel = isDark ? "Activar modo claro" : "Activar modo oscuro";

  useEffect(() => {
    Animated.timing(transition, {
      duration: 220,
      toValue: isDark ? 1 : 0,
      useNativeDriver: false,
    }).start();
  }, [isDark, transition]);

  const trackColor = transition.interpolate({
    inputRange: [0, 1],
    outputRange: ["#38BDF8", "#0F172A"],
  });
  const thumbPosition = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 24],
  });

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
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, { transform: [{ translateX: thumbPosition }] }]}
        >
          {isDark ? (
            <Moon color="#E2E8F0" size={16} strokeWidth={2} />
          ) : (
            <Sun color="#FFFFFF" size={16} strokeWidth={2} />
          )}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "transparent",
    height: 30,
    justifyContent: "center",
    padding: 0,
    width: 52,
  },
  track: {
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    overflow: "hidden",
    width: 52,
  },
  thumb: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    width: 26,
  },
});
