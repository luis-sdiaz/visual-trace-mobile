export const lightColors = {
  // Brand
  primary: "#2563EB",
  primaryDark: "#1E40AF",
  primaryPressed: "#1D4ED8",
  primarySoft: "#EFF6FF",
  primaryMedium: "#DBEAFE",

  secondary: "#0EA5E9",
  secondarySoft: "#E0F2FE",

  accent: "#F59E0B",
  accentSoft: "#FEF3C7",

  // Backgrounds
  background: "#F8FAFC",
  backgroundStrong: "#F1F5F9",
  surface: "#FFFFFF",
  surfaceSecondary: "#F8FAFC",
  surfaceBlue: "#F4F8FF",

  // Text
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",

  // Borders
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  borderPrimary: "#BFDBFE",

  // Success
  success: "#16A34A",
  successDark: "#15803D",
  successSoft: "#F0FDF4",

  // Warning
  warning: "#D97706",
  warningSoft: "#FFFBEB",

  // Danger
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",

  // Visual comparison
  initial: "#2563EB",
  initialSoft: "#EFF6FF",

  final: "#16A34A",
  finalSoft: "#F0FDF4",

  // Overlay
  overlay: "rgba(15, 23, 42, 0.48)",

  // Base
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const darkColors = {
  primary: "#60A5FA",
  primaryDark: "#93C5FD",
  primaryPressed: "#3B82F6",
  primarySoft: "#172554",
  primaryMedium: "#1E3A8A",
  secondary: "#38BDF8",
  secondarySoft: "#0C4A6E",
  accent: "#FBBF24",
  accentSoft: "#451A03",
  background: "#0F172A",
  backgroundStrong: "#1E293B",
  surface: "#1E293B",
  surfaceSecondary: "#172033",
  surfaceBlue: "#172554",
  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  textInverse: "#0F172A",
  border: "#334155",
  borderStrong: "#475569",
  borderPrimary: "#1E40AF",
  success: "#4ADE80",
  successDark: "#86EFAC",
  successSoft: "#052E16",
  warning: "#FBBF24",
  warningSoft: "#451A03",
  danger: "#F87171",
  dangerSoft: "#450A0A",
  initial: "#60A5FA",
  initialSoft: "#172554",
  final: "#4ADE80",
  finalSoft: "#052E16",
  overlay: "rgba(2, 6, 23, 0.72)",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export type ColorPalette = {
  [Key in keyof typeof lightColors]: string;
};

export const Colors = lightColors;
