import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("expo-router", () => ({
  router: {
    back: vi.fn(),
  },
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children, style }: { children: React.ReactNode; style?: unknown }) =>
    React.createElement("div", { style }, children),
}));

import {
  AB_TARGETS,
  AB_VARIANTS,
  TextRenderingDiagnostics,
} from "@/components/dev/TextRenderingDiagnostics";
import { ThemeProvider } from "@/context/ThemeContext";

describe("TextRenderingDiagnostics A/B Test Suite", () => {
  it("defines the exact 7 target strings for the Motorola Moto G04s audit", () => {
    const targetTexts = AB_TARGETS.map((t) => t.text);
    expect(targetTexts).toEqual([
      "VisualTrace",
      "Volver",
      "Salir",
      "01",
      "02",
      "En curso",
      "Más recientes",
    ]);
  });

  it("defines the exact 5 variants requested for empirical evaluation", () => {
    const variantIds = AB_VARIANTS.map((v) => v.id);
    expect(variantIds).toEqual([
      "v1_default",
      "v2_simple",
      "v3_simple_single",
      "v4_control_wide",
      "v5_current_flexible",
    ]);
  });

  it("renders all 7 targets across variants without crashing", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <TextRenderingDiagnostics />
      </ThemeProvider>,
    );

    for (const target of AB_TARGETS) {
      expect(html).toContain(target.text);
    }

    expect(html).toContain("Experimento A/B Renderizado de Textos");
    expect(html).toContain("V1_DEFAULT");
    expect(html).toContain("V2_SIMPLE");
    expect(html).toContain("V3_SIMPLE_SINGLE");
    expect(html).toContain("V4_CONTROL_WIDE");
    expect(html).toContain("V5_CURRENT_FLEXIBLE");
  });
});
