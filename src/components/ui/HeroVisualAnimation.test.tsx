import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "@/context/ThemeContext";
import { HeroVisualAnimation } from "./HeroVisualAnimation";

describe("HeroVisualAnimation", () => {
  it("mounts inside the theme provider with its test identifier", () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <HeroVisualAnimation />
      </ThemeProvider>,
    );

    const getByTestId = (testID: string) => {
      const marker = `data-testid="${testID}"`;
      return markup.includes(marker) ? marker : null;
    };

    expect(getByTestId("hero-visual-animation")).toBeTruthy();
  });
});
