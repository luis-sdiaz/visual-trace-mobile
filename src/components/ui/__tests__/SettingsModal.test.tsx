import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "es" }],
}));

vi.mock("react-native", async () => {
  const actual = await vi.importActual<typeof import("react-native")>("react-native");
  return {
    ...actual,
    Modal: ({
      visible,
      children,
    }: {
      visible?: boolean;
      children?: React.ReactNode;
    }) => (visible ? React.createElement("div", null, children) : null),
  };
});

vi.mock("@/components/ui/LanguageToggle", () => ({
  LanguageToggle: ({ testID }: { testID?: string }) =>
    React.createElement("button", { "data-testid": testID }, "ES"),
}));

vi.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

import {
  getNextTheme,
  SettingsModal,
} from "@/components/ui/SettingsModal";
import { ThemeProvider } from "@/context/ThemeContext";
import "@/i18n";

describe("SettingsModal", () => {
  it("toggles between light and dark themes", () => {
    expect(getNextTheme("light")).toBe("dark");
    expect(getNextTheme("dark")).toBe("light");
  });

  it("renders accessible settings controls when visible", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <SettingsModal visible onClose={vi.fn()} />
      </ThemeProvider>,
    );

    expect(html).toContain('data-testid="settings-modal"');
    expect(html).toContain("Idioma");
    expect(html).toContain("Modo oscuro");
    expect(html).toContain('data-testid="settings-language-toggle"');
    expect(html).toContain('data-testid="settings-theme-toggle"');
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-label="Modo oscuro"');
  });

  it("does not render when hidden", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <SettingsModal visible={false} onClose={vi.fn()} />
      </ThemeProvider>,
    );

    expect(html).toBe("");
  });
});
