import { beforeEach, describe, expect, it, vi } from "vitest";

const routerMock = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("expo-router", () => ({
  router: routerMock,
}));

import { goBackFromSettings, openSettings } from "./settingsNavigation";

describe("settings navigation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens the dedicated protected settings route", () => {
    openSettings();
    expect(routerMock.push).toHaveBeenCalledOnce();
    expect(routerMock.push).toHaveBeenCalledWith("/settings");
  });

  it("returns to the existing home entry without replacing its state", () => {
    goBackFromSettings();
    expect(routerMock.back).toHaveBeenCalledOnce();
  });
});
