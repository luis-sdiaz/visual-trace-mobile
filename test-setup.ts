import { vi } from "vitest";

const g = globalThis as unknown as {
  expo?: {
    EventEmitter: unknown;
    modules: unknown;
  };
};

if (typeof g.expo === "undefined") {
  g.expo = {
    EventEmitter: class EventEmitter {},
    modules: {},
  };
}

vi.mock("expo-clipboard", () => ({
  setStringAsync: vi.fn().mockResolvedValue(true),
  getStringAsync: vi.fn().mockResolvedValue(""),
  hasStringAsync: vi.fn().mockResolvedValue(true),
}));

vi.mock("expo-haptics", () => ({
  notificationAsync: vi.fn().mockResolvedValue(undefined),
  impactAsync: vi.fn().mockResolvedValue(undefined),
  selectionAsync: vi.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
}));

