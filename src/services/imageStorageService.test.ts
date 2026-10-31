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

const imageManipulatorMock = vi.hoisted(() => ({
  manipulateAsync: vi.fn().mockResolvedValue({ uri: "file:///prepared.jpg" }),
}));

vi.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  manipulateAsync: imageManipulatorMock.manipulateAsync,
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
  ImageStorageError,
  removeComparisonImage,
  resolveComparisonImageUrl,
  uploadComparisonImage,
} from "@/services/imageStorageService";
import { COMPARISON_IMAGE_LIMITS } from "@/contracts/comparisonImages";

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
        headers: { get: () => "image/jpeg" },
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
      /^user-1\/comparison-1\/initial-[a-z0-9]+-[a-z0-9]+\.jpg$/,
    );
    expect(storageMock.upload).toHaveBeenCalledWith(
      imagePath,
      expect.any(ArrayBuffer),
      { contentType: "image/jpeg", upsert: false },
    );
    expect(imageManipulatorMock.manipulateAsync).toHaveBeenCalledWith(
      "file:///replacement.png",
      [{ resize: { width: 1080 } }],
      { compress: 0.7, format: "jpeg" },
    );
  });

  it("accepts the exact image limit and rejects one additional byte", async () => {
    storageMock.upload.mockImplementation(
      async (path: string) => ({ data: { path }, error: null }),
    );
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(new ArrayBuffer(COMPARISON_IMAGE_LIMITS.maxBytesPerImage), {
        headers: { "Content-Type": "image/jpeg" },
      }),
    );

    await expect(
      uploadComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri: "file:///maximum.jpg",
      }),
    ).resolves.toBe("user-1/comparison-1/initial.jpg");

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(new ArrayBuffer(COMPARISON_IMAGE_LIMITS.maxBytesPerImage + 1), {
        headers: { "Content-Type": "image/jpeg" },
      }),
    );

    await expect(
      uploadComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri: "file:///too-large.jpg",
      }),
    ).rejects.toThrow("Image exceeds the maximum size.");
  });

  it("returns stable codes for unsupported, empty, and inaccessible files", async () => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1]), {
          headers: { "Content-Type": "application/pdf" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(new ArrayBuffer(0), {
          headers: { "Content-Type": "image/png" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    const upload = (imageUri: string) =>
      uploadComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri,
      });

    await expect(upload("file:///document.bin")).rejects.toMatchObject({
      code: "unsupported_format",
    } satisfies Partial<ImageStorageError>);
    await expect(upload("file:///empty.png")).rejects.toMatchObject({
      code: "invalid_file",
    } satisfies Partial<ImageStorageError>);
    await expect(upload("file:///missing.png")).rejects.toMatchObject({
      code: "file_inaccessible",
    } satisfies Partial<ImageStorageError>);
  });

  it("distinguishes network and temporary storage failures", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(
      uploadComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri: "file:///network.png",
      }),
    ).rejects.toMatchObject({ code: "network_error" });

    storageMock.upload.mockResolvedValueOnce({
      data: null,
      error: { statusCode: "503" },
    });
    await expect(
      uploadComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri: "file:///temporary.png",
      }),
    ).rejects.toMatchObject({ code: "storage_unavailable" });
  });

  it("identifies an unavailable session before reading the image", async () => {
    storageMock.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("expired"),
    });

    await expect(
      uploadComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri: "file:///photo.png",
      }),
    ).rejects.toMatchObject({ code: "session_unavailable" });
    expect(fetch).not.toHaveBeenCalled();
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
