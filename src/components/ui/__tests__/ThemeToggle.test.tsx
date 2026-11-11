import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const themeState = vi.hoisted(() => ({
  isDark: false,
  toggleTheme: vi.fn(),
}));

vi.mock("@/context/ThemeContext", () => ({
  useTheme: () => themeState,
}));

vi.mock("lottie-react-native", () => ({
  default: ({ testID }: { testID?: string }) =>
    React.createElement("div", { "data-testid": testID }),
}));

import {
  ThemeToggle,
  getThemeToggleFrameRange,
  getThemeTogglePlayback,
} from "../ThemeToggle";

describe("ThemeToggle", () => {
  it("uses one forward run for dark and one reverse run for light", () => {
    expect(getThemeToggleFrameRange(true)).toEqual([0, 30]);
    expect(getThemeToggleFrameRange(false)).toEqual([30, 0]);
  });

  it("pins the selected frame when reduced motion is enabled", () => {
    expect(getThemeToggleFrameRange(true, true)).toEqual([30, 30]);
    expect(getThemeToggleFrameRange(false, true)).toEqual([0, 0]);
  });

  it("requests one playback only when the selected theme changes", () => {
    expect(getThemeTogglePlayback(false, true, false)).toEqual([30, 0]);
    expect(getThemeTogglePlayback(false, false, false)).toBeNull();
    expect(getThemeTogglePlayback(false, false, true)).toEqual([0, 0]);
  });

  it("keeps its accessible switch state synchronized with the active theme", () => {
    themeState.isDark = false;
    const lightMarkup = renderToStaticMarkup(<ThemeToggle />);
    expect(lightMarkup).toContain('aria-label="Activar modo oscuro"');

    themeState.isDark = true;
    const darkMarkup = renderToStaticMarkup(<ThemeToggle />);
    expect(darkMarkup).toContain('aria-label="Activar modo claro"');
  });
});
