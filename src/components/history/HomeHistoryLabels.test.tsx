import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  HomeHistoryLabels,
  HomeLoadMoreLabel,
} from "./HomeHistoryLabels";
import { ThemeProvider } from "@/context/ThemeContext";

describe("Home history text integrity", () => {
  it.each([
    ["draft", "En curso"],
    ["ready", "Listas"],
    ["analyzed", "Analizadas"],
  ] as const)("renders the complete %s status badge", (status, statusLabel) => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <HomeHistoryLabels
          comparisonId={`comparison-${status}`}
          date="10 nov 2026"
          fontScale={1}
          name="Comparación con un nombre deliberadamente largo que debe adaptarse"
          status={status}
          statusLabel={statusLabel}
        />
      </ThemeProvider>,
    );

    expect(html).toContain(
      "Comparación con un nombre deliberadamente largo que debe adaptarse",
    );
    expect(html).toContain(statusLabel);
  });

  it("renders the complete load-more action", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <HomeLoadMoreLabel label="Cargar más" />
      </ThemeProvider>,
    );

    expect(html).toContain("Cargar más");
  });
});
