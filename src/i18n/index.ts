import { getLocales } from "expo-localization";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import type { SupportedLanguage } from "./types";

export const FALLBACK_LANGUAGE: SupportedLanguage = "es";

export function getDeviceLanguage(): SupportedLanguage {
  const languageCode = getLocales()?.[0]?.languageCode?.toLowerCase();

  return languageCode?.startsWith("en") ? "en" : FALLBACK_LANGUAGE;
}

export const defaultLanguage = getDeviceLanguage();

const i18n = i18next;

void i18n.use(initReactI18next).init({
  defaultNS: "common",
  fallbackLng: FALLBACK_LANGUAGE,
  lng: defaultLanguage,
  resources: {
    en,
    es,
  },
});

export default i18n;
