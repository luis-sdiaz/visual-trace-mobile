import { supabase } from "@/lib/supabase";

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
