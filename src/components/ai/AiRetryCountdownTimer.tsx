import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export interface AiRetryCountdownTimerProps {
  retryAfterSeconds: number;
  onTimerComplete?: () => void;
  testID?: string;
}

export function formatSecondsToTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function AiRetryCountdownTimer({
  retryAfterSeconds,
  onTimerComplete,
  testID = "ai-retry-countdown-timer",
}: AiRetryCountdownTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.max(0, retryAfterSeconds),
  );
  const [prevRetryAfterSeconds, setPrevRetryAfterSeconds] = useState(retryAfterSeconds);

  if (retryAfterSeconds !== prevRetryAfterSeconds) {
    setPrevRetryAfterSeconds(retryAfterSeconds);
    setSecondsRemaining(Math.max(0, retryAfterSeconds));
  }

  useEffect(() => {
    if (secondsRemaining <= 0) {
      onTimerComplete?.();
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((current) => {
        const next = current - 1;
        if (next <= 0) {
          clearInterval(interval);
          onTimerComplete?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimerComplete, secondsRemaining]);

  const isCompleted = secondsRemaining === 0;

  return (
    <View
      accessibilityLabel={
        isCompleted
          ? "Tiempo de espera finalizado, reintento disponible"
          : `Tiempo de espera para reintento: ${secondsRemaining} segundos`
      }
      accessibilityLiveRegion="polite"
      accessibilityRole="timer"
      style={styles.container}
      testID={testID}
    >
      <View style={styles.clockIconContainer}>
        <Text style={styles.clockIcon}>⏱️</Text>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.label}>
          {isCompleted ? "¡Tiempo de espera completado!" : "Tiempo de espera para reintento:"}
        </Text>
        <Text
          style={[styles.timerValue, isCompleted && styles.timerValueReady]}
          testID="countdown-time-value"
        >
          {isCompleted
            ? "Listo para reintentar"
            : `${formatSecondsToTime(secondsRemaining)} (${secondsRemaining}s)`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  clockIconContainer: {
    marginRight: Spacing.sm,
  },
  clockIcon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...Typography.label,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.accent,
    marginBottom: 2,
  },
  timerValue: {
    ...Typography.label,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  timerValueReady: {
    color: Colors.successDark,
  },
});
