import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  getToggledTheme,
  ThemeProvider,
  useTheme,
} from "@/context/ThemeContext";

function ThemeConsumer() {
  const { theme, isDark } = useTheme();
  return <span>{theme}:{String(isDark)}</span>;
}

describe("ThemeContext", () => {
  it("starts in light mode", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(html).toContain("light:false");
  });

  it("toggles between light and dark", () => {
    expect(getToggledTheme("light")).toBe("dark");
    expect(getToggledTheme("dark")).toBe("light");
  });
});
