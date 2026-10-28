import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_DEMO_OPTIONS,
  getDemoState,
  isDemoModeActive,
  recordMockServed,
  resetDemoConfig,
  setDemoState,
  subscribeDemoConfig,
} from "./demoConfig";

describe("demoConfig", () => {
  beforeEach(() => {
    resetDemoConfig();
  });

  it("initializes with default options disabled", () => {
    const state = getDemoState();
    expect(state.enabled).toBe(false);
    expect(state.mockLatencyMs).toBe(DEFAULT_DEMO_OPTIONS.mockLatencyMs);
    expect(state.networkCondition).toBe("normal");
    expect(state.injectMockAiAnalysis).toBe(true);
    expect(state.selectedScenario).toBe("changes_detected");
    expect(state.totalMocksServed).toBe(0);
    expect(state.lastMockUsedAt).toBeNull();
    expect(isDemoModeActive()).toBe(false);
  });

  it("updates demo state and reflects activation", () => {
    setDemoState({
      enabled: true,
      networkCondition: "error_429",
      mockLatencyMs: 1200,
    });

    expect(isDemoModeActive()).toBe(true);
    const updated = getDemoState();
    expect(updated.enabled).toBe(true);
    expect(updated.networkCondition).toBe("error_429");
    expect(updated.mockLatencyMs).toBe(1200);
  });

  it("resets to default configuration cleanly", () => {
    setDemoState({ enabled: true, networkCondition: "offline" });
    recordMockServed();

    expect(getDemoState().totalMocksServed).toBe(1);
    expect(getDemoState().enabled).toBe(true);

    resetDemoConfig();
    const clean = getDemoState();
    expect(clean.enabled).toBe(false);
    expect(clean.networkCondition).toBe("normal");
    expect(clean.totalMocksServed).toBe(0);
    expect(clean.lastMockUsedAt).toBeNull();
  });

  it("notifies subscribers when state changes and handles unsubscription", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeDemoConfig(listener);

    setDemoState({ enabled: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );

    recordMockServed();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ totalMocksServed: 1 }),
    );

    unsubscribe();
    setDemoState({ mockLatencyMs: 200 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("increments mock counter and timestamps execution in recordMockServed", () => {
    expect(getDemoState().totalMocksServed).toBe(0);
    recordMockServed();
    const state1 = getDemoState();
    expect(state1.totalMocksServed).toBe(1);
    expect(state1.lastMockUsedAt).toBeTruthy();

    recordMockServed();
    const state2 = getDemoState();
    expect(state2.totalMocksServed).toBe(2);
  });
});

