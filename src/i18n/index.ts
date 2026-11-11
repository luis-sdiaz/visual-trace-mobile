import { getLocales } from "expo-localization";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { Platform } from "react-native";

import en from "./locales/en.json";
import es from "./locales/es.json";
import type { SupportedLanguage } from "./types";
import {
  getStoredLanguage,
  persistLanguage,
} from "@/services/languagePreferenceService";

export const FALLBACK_LANGUAGE: SupportedLanguage = "es";

export function getDeviceLanguage(): SupportedLanguage {
  const languageCode = getLocales()?.[0]?.languageCode?.toLowerCase();

  return languageCode?.startsWith("en") ? "en" : FALLBACK_LANGUAGE;
}

export const defaultLanguage = getDeviceLanguage();

const i18n = i18next;

const i18nInitialization = i18n.use(initReactI18next).init({
  defaultNS: "common",
  fallbackLng: FALLBACK_LANGUAGE,
  lng: defaultLanguage,
  resources: {
    en,
    es,
  },
});

export async function changeAppLanguage(language: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(language);

  try {
    await persistLanguage(language);
  } catch (error) {
    console.error("[i18n] No se pudo guardar el idioma:", error);
  }
}

export async function restoreLanguagePreference(): Promise<SupportedLanguage> {
  try {
    const storedLanguage = await getStoredLanguage();
    if (storedLanguage) {
      await i18n.changeLanguage(storedLanguage);
      return storedLanguage;
    }
  } catch (error) {
    console.error("[i18n] No se pudo restaurar el idioma:", error);
  }

  return defaultLanguage;
}

if (Platform.OS !== "web" || typeof window !== "undefined") {
  void i18nInitialization.then(() => restoreLanguagePreference());
}

export default i18n;
