import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("expo-file-system", () => ({
  File: class {},
}));

vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: storageMock.getUser,
    },
    storage: {
      from: storageMock.from,
    },
  },
}));

import { resolveComparisonImageUrl } from "@/services/imageStorageService";

describe("resolveComparisonImageUrl", () => {
  beforeEach(() => {
    storageMock.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    storageMock.from.mockReturnValue({
      createSignedUrl: storageMock.createSignedUrl,
    });
  });

  it("creates a short-lived URL in the private comparison bucket", async () => {
    storageMock.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://signed.example/image" },
      error: null,
    });

    await expect(
      resolveComparisonImageUrl({
        comparisonId: "comparison-1",
        imagePath: "user-1/comparison-1/initial.jpg",
        imageStage: "initial",
      }),
    ).resolves.toBe("https://signed.example/image");

    expect(storageMock.from).toHaveBeenCalledWith("comparison-images");
    expect(storageMock.createSignedUrl).toHaveBeenCalledWith(
      "user-1/comparison-1/initial.jpg",
      300,
    );
  });

  it("rejects paths belonging to another user before accessing storage", async () => {
    await expect(
      resolveComparisonImageUrl({
        comparisonId: "comparison-1",
        imagePath: "user-2/comparison-1/initial.jpg",
        imageStage: "initial",
      }),
    ).rejects.toThrow("Image path does not match this comparison.");

    expect(storageMock.from).not.toHaveBeenCalled();
  });

  it("propagates missing-file and permission errors from storage", async () => {
    const storageError = new Error("Object not found");
    storageMock.createSignedUrl.mockResolvedValue({
      data: null,
      error: storageError,
    });

    await expect(
      resolveComparisonImageUrl({
        comparisonId: "comparison-1",
        imagePath: "user-1/comparison-1/final.jpg",
        imageStage: "final",
      }),
    ).rejects.toBe(storageError);
  });
});
