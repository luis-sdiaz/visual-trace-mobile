import "@/i18n";

import { useTranslation } from "react-i18next";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useEffect, useMemo, useState } from "react";

import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";

const RADAR_TARGETS = [
  { bottom: "29%" as const, right: "24%" as const },
  { bottom: "51%" as const, right: "12%" as const },
];

export function ComparisonVisualScanner() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [viewportWidth, setViewportWidth] = useState(0);
  const [sweepAnim] = useState(() => new Animated.Value(0));
  const [radarAnim] = useState(() => new Animated.Value(0));
  const [cursorAnim] = useState(() => new Animated.Value(0));
  const [statusAnim] = useState(() => new Animated.Value(0));
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    const sweepLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweepAnim, {
          toValue: 1,
          duration: 2600,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(sweepAnim, {
          toValue: 0,
          duration: 2600,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]),
    );
    const radarLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(radarAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(radarAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    const cursorLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(cursorAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const statusLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(statusAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(statusAnim, {
          toValue: 0.45,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.delay(900),
      ]),
    );

    sweepLoop.start();
    radarLoop.start();
    cursorLoop.start();
    statusLoop.start();

    return () => {
      sweepLoop.stop();
      radarLoop.stop();
      cursorLoop.stop();
      statusLoop.stop();
      sweepAnim.stopAnimation();
      radarAnim.stopAnimation();
      cursorAnim.stopAnimation();
      statusAnim.stopAnimation();
    };
  }, [cursorAnim, radarAnim, statusAnim, sweepAnim]);

  const onLayout = (event: LayoutChangeEvent) => {
    setViewportWidth(event.nativeEvent.layout.width);
  };
  const sweepTravel = Math.max(viewportWidth - Spacing.xl * 2, 0);
  const sweepX = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-sweepTravel / 2, sweepTravel / 2],
  });
  const cursorY = cursorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-5, 5],
  });
  const radarScale = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.6],
  });
  const radarOpacity = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 0],
  });
  const statusOpacity = statusAnim.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0.55, 0.8, 1],
  });

  return (
    <View style={styles.container} testID="comparison-visual-scanner">
      <View style={styles.viewport} onLayout={onLayout}>
        <View pointerEvents="none" style={styles.topReflection} />
        <View pointerEvents="none" style={styles.grid}>
          {[20, 40, 60, 80].map((position) => (
            <View
              key={`h-${position}`}
              style={[styles.horizontalGrid, { top: `${position}%` }]}
            />
          ))}
          {[20, 40, 60, 80].map((position) => (
            <View
              key={`v-${position}`}
              style={[styles.verticalGrid, { left: `${position}%` }]}
            />
          ))}
        </View>

        <View pointerEvents="none" style={styles.cornerTopLeft}>
          <Text style={styles.cornerText}>⌜</Text>
        </View>
        <View pointerEvents="none" style={styles.cornerTopRight}>
          <Text style={styles.cornerText}>⌝</Text>
        </View>
        <View pointerEvents="none" style={styles.cornerBottomLeft}>
          <Text style={styles.cornerText}>⌞</Text>
        </View>
        <View pointerEvents="none" style={styles.cornerBottomRight}>
          <Text style={styles.cornerText}>⌟</Text>
        </View>

        <Animated.View style={[styles.hudHeader, { opacity: statusOpacity }]}>
          <Text style={styles.telemetry}>[SYS: VT-AI v2.4]</Text>
          <View style={styles.onlineStatus}>
            <View style={styles.onlineDot} />
            <Text style={styles.telemetry}>ONLINE / SCANNING</Text>
          </View>
        </Animated.View>

        <View style={styles.stateColumn}>
          <View style={styles.beforeBadge}>
            <Text style={styles.beforeText}>{t("result.before").toUpperCase()}</Text>
          </View>
          <View style={styles.beforeMesh}>
            <View style={styles.meshLineOne} />
            <View style={styles.meshLineTwo} />
            <View style={styles.meshLineThree} />
          </View>
        </View>

        <View style={styles.stateColumn}>
          <View style={styles.afterBadge}>
            <Text style={styles.afterText}>{t("result.after").toUpperCase()}</Text>
          </View>
          <View style={styles.afterMesh}>
            <View style={styles.afterPlane} />
            <View style={styles.afterBar} />
          </View>
        </View>

        <Animated.View
          pointerEvents="none"
          style={[styles.sweep, { transform: [{ translateX: sweepX }] }]}
        >
          <View style={styles.sweepTrail} />
          <Animated.View
            style={[styles.crosshair, { transform: [{ translateY: cursorY }] }]}
          >
            <Text style={styles.crosshairText}>+</Text>
          </Animated.View>
        </Animated.View>

        {RADAR_TARGETS.map((target, index) => (
          <View key={`radar-${index}`} style={[styles.radarTarget, target]}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.radarRing,
                { opacity: radarOpacity, transform: [{ scale: radarScale }] },
              ]}
            />
            <View style={styles.radarCore} />
          </View>
        ))}

        <Animated.View style={[styles.telemetryBottom, { opacity: statusOpacity }]}>
          <Text style={styles.telemetry}>AI MATCH: 98.4%</Text>
          <Text style={styles.telemetry}>[LOC: 4.609, -74.081]</Text>
        </Animated.View>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useTheme>["colors"],
  isDark: boolean,
) {
  const oledSurface = isDark ? colors.background : colors.black;
  const frameColor = isDark ? colors.borderStrong : colors.textSecondary;

  return StyleSheet.create({
    container: {
      alignSelf: "center",
      maxWidth: 340,
      paddingHorizontal: Spacing.sm,
      width: "100%",
    },
    viewport: {
      alignItems: "center",
      backgroundColor: oledSurface,
      borderColor: frameColor,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      flexDirection: "row",
      height: 190,
      justifyContent: "space-around",
      overflow: "hidden",
      padding: Spacing.xl,
      position: "relative",
      shadowColor: colors.black,
      shadowOpacity: isDark ? 0 : 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    topReflection: {
      backgroundColor: colors.white,
      height: 1,
      left: Spacing.lg,
      opacity: 0.12,
      position: "absolute",
      right: Spacing.lg,
      top: Spacing.sm,
    },
    grid: {
      ...StyleSheet.absoluteFill,
      opacity: 0.28,
    },
    horizontalGrid: {
      borderStyle: "dashed",
      borderTopColor: colors.secondary,
      borderTopWidth: 1,
      left: 0,
      position: "absolute",
      right: 0,
    },
    verticalGrid: {
      borderLeftColor: colors.secondary,
      borderLeftWidth: 1,
      borderStyle: "dashed",
      bottom: 0,
      position: "absolute",
      top: 0,
    },
    cornerTopLeft: { left: Spacing.sm, position: "absolute", top: Spacing.sm },
    cornerTopRight: { position: "absolute", right: Spacing.sm, top: Spacing.sm },
    cornerBottomLeft: { bottom: Spacing.sm, left: Spacing.sm, position: "absolute" },
    cornerBottomRight: { bottom: Spacing.sm, position: "absolute", right: Spacing.sm },
    cornerText: {
      color: colors.secondary,
      fontSize: 24,
      fontWeight: "300",
      lineHeight: 24,
    },
    hudHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      left: Spacing.lg,
      position: "absolute",
      right: Spacing.lg,
      top: Spacing.md,
      zIndex: 4,
    },
    onlineStatus: { alignItems: "center", flexDirection: "row", gap: Spacing.xs },
    onlineDot: {
      backgroundColor: colors.final,
      borderRadius: Radius.full,
      height: 5,
      width: 5,
    },
    telemetry: {
      color: colors.white,
      fontFamily: "monospace",
      fontSize: 8,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    stateColumn: { alignItems: "center", flex: 1, marginTop: Spacing.lg, zIndex: 1 },
    beforeBadge: {
      backgroundColor: colors.initial,
      borderRadius: Radius.full,
      marginBottom: Spacing.md,
      opacity: 0.8,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
    },
    beforeText: { color: colors.white, ...Typography.label, fontSize: 10 },
    afterBadge: {
      backgroundColor: colors.final,
      borderRadius: Radius.full,
      marginBottom: Spacing.md,
      opacity: 0.85,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
    },
    afterText: { color: colors.white, ...Typography.label, fontSize: 10 },
    beforeMesh: {
      borderColor: colors.secondary,
      borderRadius: Radius.md,
      borderStyle: "dashed",
      borderWidth: 1,
      height: 72,
      opacity: 0.9,
      position: "relative",
      width: 76,
    },
    meshLineOne: {
      borderColor: colors.secondary,
      borderTopWidth: 1,
      left: 8,
      position: "absolute",
      right: 8,
      top: 22,
      transform: [{ rotate: "-16deg" }],
    },
    meshLineTwo: {
      borderColor: colors.secondary,
      borderLeftWidth: 1,
      bottom: 8,
      position: "absolute",
      right: 22,
      top: 8,
      transform: [{ rotate: "22deg" }],
    },
    meshLineThree: {
      borderColor: colors.secondary,
      borderTopWidth: 1,
      bottom: 18,
      left: 12,
      position: "absolute",
      right: 12,
    },
    afterMesh: {
      borderColor: colors.final,
      borderRadius: Radius.md,
      borderWidth: 2,
      height: 72,
      position: "relative",
      width: 76,
    },
    afterPlane: {
      backgroundColor: colors.final,
      borderRadius: Radius.sm,
      height: 10,
      left: 10,
      opacity: 0.65,
      position: "absolute",
      right: 10,
      top: 16,
    },
    afterBar: {
      backgroundColor: colors.final,
      borderRadius: Radius.full,
      bottom: 12,
      height: 6,
      left: 10,
      position: "absolute",
      right: 22,
    },
    sweep: {
      backgroundColor: colors.secondary,
      bottom: Spacing.xl,
      left: "50%",
      position: "absolute",
      top: Spacing.xl,
      width: 2,
      zIndex: 5,
    },
    sweepTrail: {
      backgroundColor: colors.secondary,
      bottom: 0,
      left: -10,
      opacity: 0.22,
      position: "absolute",
      top: 0,
      width: 22,
    },
    crosshair: {
      alignItems: "center",
      backgroundColor: colors.secondary,
      borderColor: colors.white,
      borderRadius: Radius.full,
      borderWidth: 1,
      height: 26,
      justifyContent: "center",
      left: -12,
      position: "absolute",
      top: "50%",
      width: 26,
    },
    crosshairText: { color: colors.black, fontSize: 19, lineHeight: 20 },
    radarTarget: { position: "absolute", zIndex: 4 },
    radarRing: {
      borderColor: colors.final,
      borderRadius: Radius.full,
      borderWidth: 1,
      height: 22,
      left: -8,
      position: "absolute",
      top: -8,
      width: 22,
    },
    radarCore: {
      backgroundColor: colors.final,
      borderColor: colors.white,
      borderRadius: Radius.full,
      borderWidth: 1,
      height: 6,
      width: 6,
    },
    telemetryBottom: {
      bottom: Spacing.md,
      flexDirection: "row",
      justifyContent: "space-between",
      left: Spacing.lg,
      position: "absolute",
      right: Spacing.lg,
      zIndex: 4,
    },
  });
}
