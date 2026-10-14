import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  remove: vi.fn(),
  upload: vi.fn(),
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

import {
  removeComparisonImage,
  resolveComparisonImageUrl,
  uploadComparisonImage,
} from "@/services/imageStorageService";

describe("resolveComparisonImageUrl", () => {
  beforeEach(() => {
    storageMock.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    storageMock.from.mockReturnValue({
      createSignedUrl: storageMock.createSignedUrl,
      remove: storageMock.remove,
      upload: storageMock.upload,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        headers: { get: () => "image/png" },
        ok: true,
      }),
    );
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

  it("creates a versioned non-overwriting path for a replacement", async () => {
    storageMock.upload.mockImplementation(
      async (path: string, _buffer: ArrayBuffer, options: unknown) => ({
        data: { path },
        error: null,
        options,
      }),
    );

    const imagePath = await uploadComparisonImage({
      comparisonId: "comparison-1",
      imageStage: "initial",
      imageUri: "file:///replacement.png",
      isReplacement: true,
    });

    expect(imagePath).toMatch(
      /^user-1\/comparison-1\/initial-[a-z0-9]+-[a-z0-9]+\.png$/,
    );
    expect(storageMock.upload).toHaveBeenCalledWith(
      imagePath,
      expect.any(ArrayBuffer),
      { contentType: "image/png", upsert: false },
    );
  });

  it("removes only an owned image within the requested comparison", async () => {
    storageMock.remove.mockResolvedValue({ data: [], error: null });

    await expect(
      removeComparisonImage({
        comparisonId: "comparison-1",
        imagePath: "user-1/comparison-1/final-old.webp",
        imageStage: "final",
      }),
    ).resolves.toBeUndefined();
    expect(storageMock.remove).toHaveBeenCalledWith([
      "user-1/comparison-1/final-old.webp",
    ]);
  });

  it("refuses to remove another user's image before accessing storage", async () => {
    storageMock.from.mockClear();

    await expect(
      removeComparisonImage({
        comparisonId: "comparison-1",
        imagePath: "user-2/comparison-1/final-old.webp",
        imageStage: "final",
      }),
    ).rejects.toThrow("Image path does not match this comparison.");
    expect(storageMock.from).not.toHaveBeenCalled();
  });
});
