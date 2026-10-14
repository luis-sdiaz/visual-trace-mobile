export function getAccountGreeting(userMetadata: unknown): string {
  if (typeof userMetadata !== "object" || userMetadata === null) {
    return "Hola de nuevo";
  }

  const fullName = (userMetadata as Record<string, unknown>).full_name;

  if (typeof fullName !== "string") {
    return "Hola de nuevo";
  }

  const normalizedName = fullName.trim().replace(/\s+/g, " ");

  if (
    normalizedName.length < 2 ||
    normalizedName.length > 80 ||
    normalizedName.includes("@") ||
    /[\r\n\t]/.test(normalizedName)
  ) {
    return "Hola de nuevo";
  }

  const firstName = normalizedName.split(" ")[0];

  return `Hola, ${firstName}`;
}
