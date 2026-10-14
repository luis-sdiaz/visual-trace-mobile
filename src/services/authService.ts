import { supabase } from "@/lib/supabase";

export type AuthenticationOperation = "login" | "register" | "resend";

export type AuthenticationErrorFeedback = {
  message: string;
  shouldOfferConfirmationResend: boolean;
  shouldStartCooldown: boolean;
};

function getErrorProperty(error: unknown, property: "code" | "message"): string {
  if (typeof error !== "object" || error === null || !(property in error)) {
    return "";
  }

  const value = (error as Record<string, unknown>)[property];

  return typeof value === "string" ? value.toLowerCase() : "";
}

export function getAuthenticationErrorFeedback(
  error: unknown,
  operation: AuthenticationOperation,
): AuthenticationErrorFeedback {
  const code = getErrorProperty(error, "code");
  const message = getErrorProperty(error, "message");
  const details = `${code} ${message}`;

  if (
    details.includes("rate limit") ||
    details.includes("over_request_rate_limit") ||
    details.includes("too many requests") ||
    details.includes("security purposes")
  ) {
    return {
      message: "Espera un minuto antes de volver a intentarlo.",
      shouldOfferConfirmationResend: false,
      shouldStartCooldown: true,
    };
  }

  if (
    details.includes("network") ||
    details.includes("fetch") ||
    details.includes("offline")
  ) {
    return {
      message: "No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.",
      shouldOfferConfirmationResend: false,
      shouldStartCooldown: false,
    };
  }

  if (
    operation === "login" &&
    (details.includes("email_not_confirmed") ||
      details.includes("email not confirmed"))
  ) {
    return {
      message: "Debes confirmar tu correo electrónico antes de iniciar sesión.",
      shouldOfferConfirmationResend: true,
      shouldStartCooldown: false,
    };
  }

  if (
    operation === "login" &&
    (details.includes("invalid_credentials") ||
      details.includes("invalid login credentials"))
  ) {
    return {
      message: "El correo o la contraseña no son correctos.",
      shouldOfferConfirmationResend: false,
      shouldStartCooldown: false,
    };
  }

  if (
    operation === "register" &&
    (details.includes("email_address_invalid") ||
      details.includes("invalid email") ||
      details.includes("invalid format"))
  ) {
    return {
      message: "Ingresa un correo electrónico válido.",
      shouldOfferConfirmationResend: false,
      shouldStartCooldown: false,
    };
  }

  if (
    operation === "register" &&
    (details.includes("weak_password") || details.includes("password"))
  ) {
    return {
      message: "La contraseña no cumple con los requisitos de seguridad.",
      shouldOfferConfirmationResend: false,
      shouldStartCooldown: false,
    };
  }

  const fallbackMessages: Record<AuthenticationOperation, string> = {
    login: "No pudimos iniciar sesión en este momento. Inténtalo nuevamente.",
    register:
      "No pudimos crear la cuenta con estos datos. Revísalos o intenta iniciar sesión.",
    resend:
      "No pudimos solicitar otro correo en este momento. Inténtalo nuevamente.",
  };

  return {
    message: fallbackMessages[operation],
    shouldOfferConfirmationResend: false,
    shouldStartCooldown: false,
  };
}

export async function resendSignupConfirmation(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("A valid email is required.");
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: normalizedEmail,
  });

  if (error) {
    throw error;
  }
}
