import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("lucide-react-native", () => ({
  Check: () => React.createElement("span", null, "check"),
  ChevronDown: () => React.createElement("span", null, "chevron"),
  Globe: () => React.createElement("span", null, "globe"),
}));

import { ThemeProvider } from "@/context/ThemeContext";
import i18n from "@/i18n";
import { LanguageToggle, normalizeLanguage } from "../LanguageToggle";

describe("LanguageToggle", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("es");
  });

  it("normalizes supported and regional locales", () => {
    expect(normalizeLanguage("es-MX")).toBe("es");
    expect(normalizeLanguage("en-US")).toBe("en");
    expect(normalizeLanguage()).toBe("es");
  });

  it("renders the active language flag and code", () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <LanguageToggle />
      </ThemeProvider>,
    );

    expect(markup).toContain("globe");
    expect(markup).toContain(">ES<");
    expect(markup).toContain('data-testid="language-toggle"');
  });
});
