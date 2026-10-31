import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const localizationMock = vi.hoisted(() => ({
  getLocales: vi.fn(() => [{ languageCode: "es" }]),
}));

vi.mock("expo-localization", () => localizationMock);

vi.mock("react-native", async () => {
  const actual = await vi.importActual<typeof import("react-native")>("react-native");
  return {
    ...actual,
    Modal: ({
      visible,
      children,
      testID,
    }: {
      visible?: boolean;
      children?: React.ReactNode;
      testID?: string;
    }) =>
      visible
        ? React.createElement("div", { "data-testid": testID }, children)
        : null,
  };
});

import i18n from "@/i18n";
import {
  LanguageSelectorModal,
  requestLanguageChange,
} from "../LanguageSelectorModal";

describe("LanguageSelectorModal", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("es");
  });

  it("renders both language choices with the selected Spanish state", () => {
    const html = renderToStaticMarkup(
      React.createElement(LanguageSelectorModal, {
        visible: true,
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain("Idioma");
    expect(html).toContain("Elige el idioma de VisualTrace");
    expect(html).toContain("Español");
    expect(html).toContain("Inglés");
    expect(html).toContain('data-testid="language-option-es"');
    expect(html).toContain('data-testid="language-option-en"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-label="Cerrar selector de idioma"');
  });

  it("renders translated content and selects English after a language change", async () => {
    requestLanguageChange("en");
    await i18n.changeLanguage("en");

    const html = renderToStaticMarkup(
      React.createElement(LanguageSelectorModal, {
        visible: true,
        onClose: vi.fn(),
      }),
    );

    expect(html).toContain("Language");
    expect(html).toContain("Choose the VisualTrace language");
    expect(html).toContain("English");
    expect(html).toContain('data-testid="language-option-en"');
    expect(html).toContain('aria-checked="true"');
  });

  it("responds to a language selection event by calling changeLanguage", () => {
    const changeLanguage = vi
      .spyOn(i18n, "changeLanguage")
      .mockResolvedValue(i18n.t);

    requestLanguageChange("en");

    expect(changeLanguage).toHaveBeenCalledWith("en");
    changeLanguage.mockRestore();
  });

  it("does not render modal contents while hidden", () => {
    const html = renderToStaticMarkup(
      React.createElement(LanguageSelectorModal, {
        visible: false,
        onClose: vi.fn(),
      }),
    );

    expect(html).not.toContain('data-testid="language-selector-modal"');
  });
});
