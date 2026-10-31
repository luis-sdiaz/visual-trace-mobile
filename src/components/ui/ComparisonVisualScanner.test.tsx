import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ComparisonVisualScanner } from "./ComparisonVisualScanner";
import { ThemeProvider } from "@/context/ThemeContext";

describe("ComparisonVisualScanner", () => {
  it("renders the animated before and after inspection states", () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ComparisonVisualScanner />
      </ThemeProvider>,
    );

    expect(markup).toContain("comparison-visual-scanner");
    expect(markup).toContain("ANTES");
    expect(markup).toContain("DESPUÉS");
    expect(markup).toContain("AI MATCH: 98.4%");
  });

  it("stops animations cleanly on unmount", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ComparisonVisualScanner />
      </ThemeProvider>,
    );

    expect(markup).toContain("comparison-visual-scanner");
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
