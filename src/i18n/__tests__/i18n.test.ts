import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
