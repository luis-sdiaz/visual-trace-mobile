import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AiRetryCountdownTimer,
  formatSecondsToTime,
} from "../AiRetryCountdownTimer";

describe("AiRetryCountdownTimer Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats seconds accurately into mm:ss format", () => {
    expect(formatSecondsToTime(0)).toBe("00:00");
    expect(formatSecondsToTime(45)).toBe("00:45");
    expect(formatSecondsToTime(90)).toBe("01:30");
    expect(formatSecondsToTime(3600)).toBe("60:00");
  });

  it("renders with initial countdown and accessibility attributes", () => {
    const html = renderToStaticMarkup(
      React.createElement(AiRetryCountdownTimer, {
        retryAfterSeconds: 60,
      }),
    );

    expect(html).toContain('role="timer"');
    expect(html).toContain("01:00 (60s)");
    expect(html).toContain("Tiempo de espera para reintento");
    expect(html).toContain('data-testid="ai-retry-countdown-timer"');
  });

  it("renders completed state when retryAfterSeconds is 0", () => {
    const htmlReady = renderToStaticMarkup(
      React.createElement(AiRetryCountdownTimer, {
        retryAfterSeconds: 0,
      }),
    );

    expect(htmlReady).toContain("Listo para reintentar");
    expect(htmlReady).toContain("¡Tiempo de espera completado!");
  });
});

