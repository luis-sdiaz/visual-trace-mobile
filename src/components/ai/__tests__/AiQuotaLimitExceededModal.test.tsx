import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => {
  const actual = await vi.importActual<typeof import("react-native")>("react-native");
  return {
    ...actual,
    Modal: ({
      visible,
      children,
      testID,
    }: {
      visible?: boolean;
      children?: React.ReactNode;
      testID?: string;
    }) => (visible ? React.createElement("div", { "data-testid": testID }, children) : null),
  };
});

import { AiQuotaLimitExceededModal } from "../AiQuotaLimitExceededModal";

describe("AiQuotaLimitExceededModal Component", () => {
  it("renders dynamic quota error description according to scope", () => {
    const htmlMinute = renderToStaticMarkup(
      React.createElement(AiQuotaLimitExceededModal, {
        visible: true,
        scope: "global_minute",
        onClose: vi.fn(),
      }),
    );

    expect(htmlMinute).toContain("Límite por minuto alcanzado");
    expect(htmlMinute).toContain("un minuto");

    const htmlUser = renderToStaticMarkup(
      React.createElement(AiQuotaLimitExceededModal, {
        visible: true,
        scope: "user_day",
        onClose: vi.fn(),
      }),
    );

    expect(htmlUser).toContain("cuota diaria gratuita");
  });

  it("embeds retry countdown timer conditionally when retryAfterSeconds is present", () => {
    const htmlWithTimer = renderToStaticMarkup(
      React.createElement(AiQuotaLimitExceededModal, {
        visible: true,
        retryAfterSeconds: 45,
        onClose: vi.fn(),
      }),
    );

    expect(htmlWithTimer).toContain('data-testid="modal-retry-countdown-timer"');
    expect(htmlWithTimer).toContain("00:45 (45s)");

    const htmlWithoutTimer = renderToStaticMarkup(
      React.createElement(AiQuotaLimitExceededModal, {
        visible: true,
        onClose: vi.fn(),
      }),
    );

    expect(htmlWithoutTimer).not.toContain('data-testid="modal-retry-countdown-timer"');
  });
});
