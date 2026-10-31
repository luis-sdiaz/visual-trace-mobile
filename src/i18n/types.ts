export type SupportedLanguage = "es" | "en";

export interface TranslationNamespace {
  [key: string]: string | TranslationNamespace;
}

export interface TranslationResources {
  common: TranslationNamespace;
}

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: TranslationResources;
  }
}
