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

