import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getDemoState,
  resetDemoConfig,
  setDemoState,
} from "@/config/demoConfig";
import { DemoModeToggle, toggleDemoMode } from "./DemoModeToggle";

describe("DemoModeToggle", () => {
  beforeEach(() => {
    resetDemoConfig();
  });

  it("renders with default inactive state and accessibility role", () => {
    const html = renderToStaticMarkup(
      React.createElement(DemoModeToggle, {}),
    );

    expect(html).toContain("Modo Demostración Académica");
    expect(html).toContain("INACTIVO");
    expect(html).toContain('role="switch"');
    expect(html).toContain('data-testid="demo-mode-toggle"');
    expect(html).toContain("Conexión en vivo con Supabase Edge Functions");
  });

  it("renders active state when demo mode is already enabled", () => {
    setDemoState({ enabled: true });
    const html = renderToStaticMarkup(
      React.createElement(DemoModeToggle, {}),
    );

    expect(html).toContain("ACTIVO");
    expect(html).toContain("Simula inferencia instantánea de Gemini");
    expect(html).toContain('aria-checked="true"');
  });

  it("renders controlled value prop when passed explicitly", () => {
    const htmlActive = renderToStaticMarkup(
      React.createElement(DemoModeToggle, { value: true }),
    );
    expect(htmlActive).toContain("ACTIVO");
    expect(htmlActive).toContain('aria-checked="true"');

    const htmlInactive = renderToStaticMarkup(
      React.createElement(DemoModeToggle, { value: false }),
    );
    expect(htmlInactive).toContain("INACTIVO");
  });

  it("renders compact mode correctly in both states", () => {
    const inactiveHtml = renderToStaticMarkup(
      React.createElement(DemoModeToggle, { compact: true }),
    );
    expect(inactiveHtml).toContain("⚡ API REAL");

    setDemoState({ enabled: true });
    const activeHtml = renderToStaticMarkup(
      React.createElement(DemoModeToggle, { compact: true }),
    );
    expect(activeHtml).toContain("🎓 DEMO ACTIVO");
  });

  it("handles toggleDemoMode helper to switch states and invoke callback", () => {
    const onToggleMock = vi.fn();

    expect(getDemoState().enabled).toBe(false);

    const result1 = toggleDemoMode(false, onToggleMock);
    expect(result1).toBe(true);
    expect(getDemoState().enabled).toBe(true);
    expect(onToggleMock).toHaveBeenCalledWith(true);

    const result2 = toggleDemoMode(true, onToggleMock);
    expect(result2).toBe(false);
    expect(getDemoState().enabled).toBe(false);
    expect(onToggleMock).toHaveBeenCalledWith(false);
  });
});

