import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storageMock,
}));

import {
  getStoredLanguage,
  LANGUAGE_STORAGE_KEY,
  normalizeSupportedLanguage,
  persistLanguage,
} from "./languagePreferenceService";
import {
  getStoredTheme,
  persistTheme,
  THEME_STORAGE_KEY,
} from "./themePreferenceService";

describe("preference persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.getItem.mockResolvedValue(null);
    storageMock.setItem.mockResolvedValue(undefined);
  });

  it("normalizes supported language variants", () => {
    expect(normalizeSupportedLanguage("en-US")).toBe("en");
    expect(normalizeSupportedLanguage("es-CO")).toBe("es");
    expect(normalizeSupportedLanguage(null)).toBe("es");
  });

  it("stores and restores the language preference", async () => {
    await persistLanguage("en");
    expect(storageMock.setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, "en");

    storageMock.getItem.mockResolvedValue("en");
    await expect(getStoredLanguage()).resolves.toBe("en");

    storageMock.getItem.mockResolvedValue("fr");
    await expect(getStoredLanguage()).resolves.toBeNull();
  });

  it("stores and restores the theme preference", async () => {
    await persistTheme("dark");
    expect(storageMock.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "dark");

    storageMock.getItem.mockResolvedValue("dark");
    await expect(getStoredTheme()).resolves.toBe("dark");

    storageMock.getItem.mockResolvedValue("sepia");
    await expect(getStoredTheme()).resolves.toBeNull();
  });
});
