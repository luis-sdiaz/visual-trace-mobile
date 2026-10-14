import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
  resend: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      resend: authMock.resend,
    },
  },
}));

import {
  getAuthenticationErrorFeedback,
  resendSignupConfirmation,
} from "@/services/authService";

describe("authService", () => {
  beforeEach(() => {
    authMock.resend.mockResolvedValue({ error: null });
  });

  it("normalizes the email used for a signup confirmation request", async () => {
    await resendSignupConfirmation("  USER@Example.COM ");

    expect(authMock.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "user@example.com",
    });
  });

  it("propagates resend failures", async () => {
    const error = new Error("network unavailable");
    authMock.resend.mockResolvedValue({ error });

    await expect(resendSignupConfirmation("user@example.com")).rejects.toBe(
      error,
    );
  });

  it("offers confirmation resend only for an unconfirmed login", () => {
    const feedback = getAuthenticationErrorFeedback(
      { code: "email_not_confirmed" },
      "login",
    );

    expect(feedback.shouldOfferConfirmationResend).toBe(true);
    expect(feedback.message).toContain("confirmar");
  });

  it("uses non-enumerating feedback for invalid credentials", () => {
    const feedback = getAuthenticationErrorFeedback(
      { code: "invalid_credentials" },
      "login",
    );

    expect(feedback.message).toBe("El correo o la contraseña no son correctos.");
    expect(feedback.shouldOfferConfirmationResend).toBe(false);
  });

  it("distinguishes network and rate-limit failures", () => {
    const networkFeedback = getAuthenticationErrorFeedback(
      new Error("Network request failed"),
      "login",
    );
    const rateFeedback = getAuthenticationErrorFeedback(
      { code: "over_request_rate_limit" },
      "resend",
    );

    expect(networkFeedback.message).toContain("conexión");
    expect(rateFeedback.shouldStartCooldown).toBe(true);
  });

  it("does not reveal that a registration email already exists", () => {
    const feedback = getAuthenticationErrorFeedback(
      { code: "user_already_exists" },
      "register",
    );

    expect(feedback.message.toLowerCase()).not.toContain("ya existe");
    expect(feedback.message.toLowerCase()).not.toContain("registrada");
  });
});
