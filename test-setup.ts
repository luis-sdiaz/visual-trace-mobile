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

vi.mock("expo-localization", () => ({
  getLocales: vi.fn(() => [{ languageCode: "es" }]),
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

vi.mock("expo-print", () => ({
  printToFileAsync: vi.fn().mockResolvedValue({
    uri: "file:///mock/path/report.pdf",
    numberOfPages: 2,
    base64: undefined,
  }),
  printAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("expo-sharing", () => ({
  isAvailableAsync: vi.fn().mockResolvedValue(true),
  shareAsync: vi.fn().mockResolvedValue(undefined),
}));

