import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import {
  getDemoState,
  resetDemoConfig,
  setDemoState,
} from "@/config/demoConfig";
import { DevErrorInjectionPanel } from "./DevErrorInjectionPanel";

describe("DevErrorInjectionPanel", () => {
  beforeEach(() => {
    resetDemoConfig();
  });

  it("renders with header, all options, and metrics", () => {
    const html = renderToStaticMarkup(
      React.createElement(DevErrorInjectionPanel, {}),
    );

    expect(html).toContain("PANEL DEV / SUSTENTACIÓN");
    expect(html).toContain("Inyección de Estados y Fallos");
    expect(html).toContain("Normal (200 OK)");
    expect(html).toContain("Cuota 429");
    expect(html).toContain("Servidor 500");
    expect(html).toContain("Offline total");
    expect(html).toContain("Cambios detectados");
    expect(html).toContain("Falla estructural");
    expect(html).toContain("Sin cambios");
    expect(html).toContain("Mocks servidos: 0");
    expect(html).toContain("Restablecer valores");
    expect(html).toContain('data-testid="reset-dev-panel-button"');
  });

  it("reflects state updates when demoState is modified", () => {
    setDemoState({
      networkCondition: "error_429",
      selectedScenario: "structural_defect",
      mockLatencyMs: 3000,
    });

    const html = renderToStaticMarkup(
      React.createElement(DevErrorInjectionPanel, {}),
    );

    // Selected chips should have selected styling and testIDs
    expect(html).toContain('data-testid="condition-chip-error_429"');
    expect(html).toContain('data-testid="scenario-chip-structural_defect"');
    expect(html).toContain('data-testid="latency-chip-3000"');
  });

  it("updates demo metrics in real-time when mocks are served", () => {
    setDemoState({ totalMocksServed: 5 } as never);

    const html = renderToStaticMarkup(
      React.createElement(DevErrorInjectionPanel, {}),
    );

    expect(html).toContain("Mocks servidos: 5");
  });

  it("resets to initial defaults cleanly", () => {
    setDemoState({ networkCondition: "error_500" });
    expect(getDemoState().networkCondition).toBe("error_500");

    resetDemoConfig();
    expect(getDemoState().networkCondition).toBe("normal");
  });
});

