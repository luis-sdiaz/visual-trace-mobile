import { beforeEach, describe, expect, it, vi } from "vitest";

const asyncStorageMock = vi.hoisted(() => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: asyncStorageMock,
}));

import {
  loadComparisonDraft,
  migrateLegacyComparisonDraft,
  saveComparisonDraft,
  type ComparisonDraft,
} from "@/storage/comparisonStorage";

const draft: ComparisonDraft = {
  comparisonId: "comparison-1",
  name: "Sala",
  initialImageUri: "file:///initial.jpg",
  finalImageUri: null,
};

describe("comparisonStorage", () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map();
    asyncStorageMock.getItem.mockImplementation(async (key: string) =>
      storage.get(key) ?? null,
    );
    asyncStorageMock.setItem.mockImplementation(
      async (key: string, value: string) => {
        storage.set(key, value);
      },
    );
    asyncStorageMock.removeItem.mockImplementation(async (key: string) => {
      storage.delete(key);
    });
  });

  it("isolates drafts by authenticated user ID", async () => {
    const otherDraft = { ...draft, name: "Cocina" };

    await saveComparisonDraft("user-1", draft);
    await saveComparisonDraft("user-2", otherDraft);

    await expect(loadComparisonDraft("user-1")).resolves.toEqual(draft);
    await expect(loadComparisonDraft("user-2")).resolves.toEqual(otherDraft);
    expect(storage.size).toBe(2);
  });

  it("rejects stored content whose owner does not match the key", async () => {
    storage.set(
      "@visualtrace/comparison-draft:user-1",
      JSON.stringify({ ...draft, userId: "user-2" }),
    );

    await expect(loadComparisonDraft("user-1")).resolves.toBeNull();
    expect(asyncStorageMock.removeItem).toHaveBeenCalledWith(
      "@visualtrace/comparison-draft:user-1",
    );
  });

  it("migrates a legacy draft only after ownership is confirmed", async () => {
    storage.set("@visualtrace/comparison-draft", JSON.stringify(draft));
    const canClaim = vi.fn().mockResolvedValue(true);

    await expect(
      migrateLegacyComparisonDraft("user-1", canClaim),
    ).resolves.toEqual(draft);
    expect(canClaim).toHaveBeenCalledWith("comparison-1");
    expect(storage.has("@visualtrace/comparison-draft")).toBe(false);
    await expect(loadComparisonDraft("user-1")).resolves.toEqual(draft);
  });

  it("does not expose an unowned legacy draft", async () => {
    storage.set("@visualtrace/comparison-draft", JSON.stringify(draft));

    await expect(
      migrateLegacyComparisonDraft("user-2", async () => false),
    ).resolves.toBeNull();
    expect(storage.has("@visualtrace/comparison-draft:user-2")).toBe(false);
  });

  it("keeps a legacy draft when ownership validation has a transient error", async () => {
    storage.set("@visualtrace/comparison-draft", JSON.stringify(draft));

    await expect(
      migrateLegacyComparisonDraft("user-1", async () => {
        throw new Error("network unavailable");
      }),
    ).rejects.toThrow("network unavailable");
    expect(storage.has("@visualtrace/comparison-draft")).toBe(true);
  });
});
