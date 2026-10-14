import { describe, expect, it } from "vitest";

import {
  normalizeEmail,
  normalizeFullName,
  validateRegistrationForm,
} from "@/utils/authValidation";

const validForm = {
  fullName: "Luis Díaz",
  email: "luis@example.com",
  password: "visual123",
  confirmPassword: "visual123",
};

describe("authValidation", () => {
  it("accepts and normalizes a valid registration", () => {
    expect(validateRegistrationForm(validForm)).toEqual({});
    expect(normalizeFullName("  Luis   Díaz ")).toBe("Luis Díaz");
    expect(normalizeEmail(" USER@Example.COM ")).toBe("user@example.com");
  });

  it("rejects short or excessively long names", () => {
    expect(
      validateRegistrationForm({ ...validForm, fullName: "A" }).fullName,
    ).toBeDefined();
    expect(
      validateRegistrationForm({ ...validForm, fullName: "A".repeat(81) })
        .fullName,
    ).toBeDefined();
  });

  it("rejects malformed email addresses", () => {
    expect(
      validateRegistrationForm({ ...validForm, email: "invalid@" }).email,
    ).toBe("Ingresa un correo electrónico válido.");
  });

  it("requires a bounded password containing a letter and number", () => {
    expect(
      validateRegistrationForm({ ...validForm, password: "short1" }).password,
    ).toBeDefined();
    expect(
      validateRegistrationForm({
        ...validForm,
        password: "abcdefgh",
        confirmPassword: "abcdefgh",
      }).password,
    ).toContain("número");
    expect(
      validateRegistrationForm({
        ...validForm,
        password: "12345678",
        confirmPassword: "12345678",
      }).password,
    ).toContain("letra");
  });

  it("requires matching password confirmation", () => {
    expect(
      validateRegistrationForm({
        ...validForm,
        confirmPassword: "different1",
      }).confirmPassword,
    ).toBe("Las contraseñas no coinciden.");
  });
});
