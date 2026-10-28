import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { NetworkResilienceBanner } from "./NetworkResilienceBanner";

describe("NetworkResilienceBanner", () => {
  it("renders null when online and demo mode is inactive", () => {
    const html = renderToStaticMarkup(
      React.createElement(NetworkResilienceBanner, {
        isOnline: true,
        isDemoMode: false,
      }),
    );

    expect(html).toBe("");
  });

  it("renders offline warning and action buttons when network is unavailable", () => {
    const onSwitchMock = vi.fn();
    const onRetryMock = vi.fn();

    const html = renderToStaticMarkup(
      React.createElement(NetworkResilienceBanner, {
        isOnline: false,
        isDemoMode: false,
        onSwitchToDemo: onSwitchMock,
        onRetryConnection: onRetryMock,
      }),
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("SIN RED");
    expect(html).toContain("Conexión a internet inestable o caída");
    expect(html).toContain("Activar Modo Demo");
    expect(html).toContain("Reintentar conexión");
    expect(html).toContain('data-testid="switch-to-demo-button"');
    expect(html).toContain('data-testid="retry-connection-button"');
  });

  it("renders resilience active banner when demo mode is active", () => {
    const html = renderToStaticMarkup(
      React.createElement(NetworkResilienceBanner, {
        isOnline: true,
        isDemoMode: true,
      }),
    );

    expect(html).toContain("RESILIENCIA ACTIVA");
    expect(html).toContain("Modo Demostración Académica Activo");
    expect(html).toContain("Inferencia instantánea con Gemini");
    expect(html).not.toContain("data-testid=\"switch-to-demo-button\"");
  });

  it("omits switch button if onSwitchToDemo callback is not provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(NetworkResilienceBanner, {
        isOnline: false,
        isDemoMode: false,
      }),
    );

    expect(html).not.toContain('data-testid="switch-to-demo-button"');
  });
});

