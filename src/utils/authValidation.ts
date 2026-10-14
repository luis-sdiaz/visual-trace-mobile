export type RegistrationField =
  | "fullName"
  | "email"
  | "password"
  | "confirmPassword";

export type RegistrationValues = Record<RegistrationField, string>;
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeFullName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateRegistrationForm(
  values: RegistrationValues,
): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const normalizedName = normalizeFullName(values.fullName);
  const normalizedEmail = normalizeEmail(values.email);

  if (normalizedName.length < 2) {
    errors.fullName = "Ingresa un nombre de al menos 2 caracteres.";
  } else if (normalizedName.length > 80) {
    errors.fullName = "El nombre no puede superar los 80 caracteres.";
  }

  if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) {
    errors.email = "Ingresa un correo electrónico válido.";
  }

  if (values.password.length < 8 || values.password.length > 72) {
    errors.password = "La contraseña debe tener entre 8 y 72 caracteres.";
  } else if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(values.password)) {
    errors.password = "Incluye al menos una letra en la contraseña.";
  } else if (!/\d/.test(values.password)) {
    errors.password = "Incluye al menos un número en la contraseña.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña.";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden.";
  }

  return errors;
}
