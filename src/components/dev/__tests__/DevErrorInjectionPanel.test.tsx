import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  resetDemoConfig,
} from "@/config/demoConfig";
import { DevErrorInjectionPanel } from "../DevErrorInjectionPanel";

declare const globalThis: { __DEV__?: boolean };

describe("DevErrorInjectionPanel Component Isolation", () => {
  const originalDev = globalThis.__DEV__;

  beforeEach(() => {
    resetDemoConfig();
    globalThis.__DEV__ = true;
  });

  afterEach(() => {
    globalThis.__DEV__ = originalDev;
  });

  it("renders panel UI nodes when in development mode (__DEV__ = true)", () => {
    globalThis.__DEV__ = true;

    const htmlDev = renderToStaticMarkup(
      React.createElement(DevErrorInjectionPanel, {}),
    );

    expect(htmlDev).toContain("PANEL DEV / SUSTENTACIÓN");
    expect(htmlDev).toContain("Inyección de Estados y Fallos");
    expect(htmlDev).toContain('data-testid="dev-error-injection-panel"');
  });

  it("returns null and renders no DOM nodes when in production mode (__DEV__ = false)", () => {
    globalThis.__DEV__ = false;

    const htmlProd = renderToStaticMarkup(
      React.createElement(DevErrorInjectionPanel, {}),
    );

    expect(htmlProd).toBe("");
    expect(htmlProd).not.toContain("PANEL DEV");
    expect(htmlProd).not.toContain("data-testid=\"dev-error-injection-panel\"");
  });
});

