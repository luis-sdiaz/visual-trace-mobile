import { beforeEach, describe, expect, it, vi } from "vitest";

import en from "../locales/en.json";
import es from "../locales/es.json";

const localizationMock = vi.hoisted(() => ({
  getLocales: vi.fn(() => [{ languageCode: "es" }]),
}));

vi.mock("expo-localization", () => localizationMock);

import i18n, {
  defaultLanguage,
  FALLBACK_LANGUAGE,
  getDeviceLanguage,
} from "../index";

describe("i18n", () => {
  beforeEach(() => {
    localizationMock.getLocales.mockReturnValue([{ languageCode: "es" }]);
  });

  it("starts the i18n service with the configured resources", () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.language).toBe(defaultLanguage);
    expect(i18n.options.fallbackLng).toContain(FALLBACK_LANGUAGE);
    expect(i18n.hasResourceBundle("es", "common")).toBe(true);
    expect(i18n.hasResourceBundle("en", "common")).toBe(true);
  });

  it("detects English from the device locale", () => {
    localizationMock.getLocales.mockReturnValue([{ languageCode: "en-US" }]);

    expect(getDeviceLanguage()).toBe("en");
  });

  it("falls back to Spanish for unsupported or missing locales", () => {
    localizationMock.getLocales.mockReturnValue([{ languageCode: "fr" }]);
    expect(getDeviceLanguage()).toBe(FALLBACK_LANGUAGE);

    localizationMock.getLocales.mockReturnValue([]);
    expect(getDeviceLanguage()).toBe(FALLBACK_LANGUAGE);
  });

  it("provides passwordHelper in both Spanish and English", () => {
    expect(i18n.t("auth.passwordHelper", { lng: "es" })).toContain("8 y 72 caracteres");
    expect(i18n.t("auth.passwordHelper", { lng: "en" })).toContain("8 and 72 characters");
  });

  it("keeps the Spanish and English resource trees structurally aligned", () => {
    const getResourceShape = (value: unknown): unknown => {
      if (Array.isArray(value)) {
        return value.map(getResourceShape);
      }

      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value).map(([key, nestedValue]) => [key, getResourceShape(nestedValue)]),
        );
      }

      return typeof value;
    };

    expect(getResourceShape(es)).toEqual(getResourceShape(en));
  });

  it("preserves full labels for Android-sensitive actions in both languages", () => {
    const criticalTranslations = [
      ["auth.back", "Volver", "Back"],
      ["home.signOut", "Salir", "Sign out"],
      ["home.createComparison", "Crear comparación", "Create comparison"],
      ["homeFilters.all", "Todas", "All"],
      ["homeFilters.draft", "En curso", "In progress"],
      ["homeFilters.ready", "Listas", "Ready"],
      ["homeFilters.analyzed", "Analizadas", "Analyzed"],
      ["homeFilters.newest", "Más recientes", "Newest"],
      ["homeFilters.oldest", "Más antiguas", "Oldest"],
      ["homeFilters.loadMore", "Cargar más", "Load more"],
      ["flow.step1", "PASO 1 DE 3", "STEP 1 OF 3"],
      ["flow.step2", "PASO 2 DE 3", "STEP 2 OF 3"],
      ["flow.addPhoto", "Agrega una fotografía", "Add a photo"],
      ["flow.step3", "PASO 3 DE 3", "STEP 3 OF 3"],
      ["flow.continue", "Continuar", "Continue"],
      ["flow.chooseFromGallery", "Elegir de la galería", "Choose from gallery"],
      ["flow.compareStates", "Comparar estados", "Compare states"],
      ["result.shareAction", "Compartir", "Share"],
      ["result.exportAction", "Exportar", "Export"],
    ] as const;

    for (const [key, spanish, english] of criticalTranslations) {
      expect(i18n.t(key, { lng: "es" }), `${key} Spanish`).toBe(spanish);
      expect(i18n.t(key, { lng: "en" }), `${key} English`).toBe(english);
    }
  });
});
