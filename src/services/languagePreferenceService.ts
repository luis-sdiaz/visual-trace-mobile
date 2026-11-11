import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SupportedLanguage } from "@/i18n/types";

export const LANGUAGE_STORAGE_KEY = "@visualtrace/language";

export function normalizeSupportedLanguage(locale?: string | null): SupportedLanguage {
  return locale?.toLowerCase().startsWith("en") ? "en" : "es";
}

export async function getStoredLanguage(): Promise<SupportedLanguage | null> {
  const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLanguage === "es" || storedLanguage === "en"
    ? storedLanguage
    : null;
}

export async function persistLanguage(language: SupportedLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}
