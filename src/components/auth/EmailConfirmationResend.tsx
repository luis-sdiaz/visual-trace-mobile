import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import {
  getAuthenticationErrorFeedback,
  resendSignupConfirmation,
} from "@/services/authService";

const RESEND_COOLDOWN_SECONDS = 60;

type EmailConfirmationResendProps = {
  email: string;
};

export function EmailConfirmationResend({
  email,
}: EmailConfirmationResendProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const isRequestingRef = useRef(false);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setCooldownSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  async function handleResend() {
    if (isRequestingRef.current || cooldownSeconds > 0) {
      return;
    }

    isRequestingRef.current = true;
    setIsRequesting(true);
    setFeedback(null);

    try {
      await resendSignupConfirmation(email);
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      setFeedback({
        type: "success",
        message:
          "Solicitud aceptada. Si el correo está pendiente de confirmación, recibirás un nuevo mensaje.",
      });
    } catch (error) {
      const errorFeedback = getAuthenticationErrorFeedback(error, "resend");

      if (errorFeedback.shouldStartCooldown) {
        setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      }

      setFeedback({
        type: "error",
        message: errorFeedback.message,
      });
    } finally {
      isRequestingRef.current = false;
      setIsRequesting(false);
    }
  }

  const isDisabled = isRequesting || cooldownSeconds > 0;
  const buttonLabel = isRequesting
    ? "Solicitando..."
    : cooldownSeconds > 0
      ? `Reintentar en ${cooldownSeconds} s`
      : "Reenviar correo de confirmación";

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={handleResend}
        style={({ pressed }) => [
          styles.button,
          pressed && !isDisabled && styles.buttonPressed,
          isDisabled && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </Pressable>

      {feedback ? (
        <Text
          accessibilityLiveRegion="polite"
          style={
            feedback.type === "success"
              ? styles.successText
              : styles.errorText
          }
        >
          {feedback.message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },

  button: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
  },

  buttonPressed: {
    backgroundColor: Colors.primarySoft,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    ...Typography.label,
    color: Colors.primary,
    textAlign: "center",
  },

  successText: {
    ...Typography.label,
    color: Colors.success,
    marginTop: Spacing.sm,
  },

  errorText: {
    ...Typography.label,
    color: Colors.danger,
    marginTop: Spacing.sm,
  },
});
