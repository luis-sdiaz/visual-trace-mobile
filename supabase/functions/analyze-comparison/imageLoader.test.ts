import { describe, expect, it, vi } from "vitest";

import {
  ComparisonImageError,
  MAX_AI_IMAGE_BYTES,
  MAX_AI_IMAGE_PAIR_BYTES,
  loadAuthorizedComparisonImages,
} from "./imageLoader";

const comparison = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  user_id: "user-1",
  initial_image_path: "user-1/123e4567-e89b-42d3-a456-426614174000/initial.jpg",
  final_image_path: "user-1/123e4567-e89b-42d3-a456-426614174000/final.png",
};

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function file(bytes: Uint8Array, type: string) {
  return {
    type,
    size: bytes.length,
    arrayBuffer: async () => bytes.slice().buffer as ArrayBuffer,
  };
}

function imageBytes(prefix: Uint8Array, size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set(prefix);
  return bytes;
}

describe("authorized comparison image loading", () => {
  it("loads exactly the two stored paths and verifies their contents", async () => {
    const download = vi.fn(async (path: string) =>
      path.endsWith(".jpg") ? file(jpeg, "image/jpeg") : file(png, "image/png"),
    );
    const result = await loadAuthorizedComparisonImages(comparison, download);
    expect(download.mock.calls.map(([path]) => path)).toEqual([
      comparison.initial_image_path,
      comparison.final_image_path,
    ]);
    expect(result.initial.mimeType).toBe("image/jpeg");
    expect(result.final.mimeType).toBe("image/png");
  });

  it("accepts legitimate versioned paths without allowing extra segments", async () => {
    const versioned = {
      ...comparison,
      initial_image_path:
        "user-1/123e4567-e89b-42d3-a456-426614174000/initial-version-2.jpeg",
      final_image_path:
        "user-1/123e4567-e89b-42d3-a456-426614174000/final-mnb12-abc34.webp",
    };
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]);
    const download = vi.fn(async (path: string) =>
      path.endsWith(".jpeg")
        ? file(jpeg, "image/jpeg")
        : file(webp, "image/webp"),
    );

    await expect(
      loadAuthorizedComparisonImages(versioned, download),
    ).resolves.toBeDefined();
  });

  it("rejects paths outside the owner and comparison hierarchy", async () => {
    const invalidPaths = [
      "attacker/123e4567-e89b-42d3-a456-426614174000/initial.jpg",
      "user-1/another-comparison/initial.jpg",
      "user-1/123e4567-e89b-42d3-a456-426614174000/final.jpg",
      "user-1/123e4567-e89b-42d3-a456-426614174000/archive/initial.jpg",
      "user-1/123e4567-e89b-42d3-a456-426614174000/initial-old/archive.jpg",
      "user-1/123e4567-e89b-42d3-a456-426614174000/../initial.jpg",
      "user-1\\123e4567-e89b-42d3-a456-426614174000\\initial.jpg",
      "user-1/123e4567-e89b-42d3-a456-426614174000/initial--old.jpg",
    ];

    for (const initial_image_path of invalidPaths) {
      await expect(
        loadAuthorizedComparisonImages(
          { ...comparison, initial_image_path },
          vi.fn(),
        ),
      ).rejects.toMatchObject({ code: "invalid_image_path" });
    }
  });

  it("rejects missing, oversized, and disguised files", async () => {
    await expect(
      loadAuthorizedComparisonImages(comparison, async () => null),
    ).rejects.toBeInstanceOf(ComparisonImageError);
    await expect(
      loadAuthorizedComparisonImages(comparison, async () => ({
        size: MAX_AI_IMAGE_BYTES + 1,
        type: "image/jpeg",
        arrayBuffer: async () => jpeg.slice().buffer as ArrayBuffer,
      })),
    ).rejects.toMatchObject({ code: "image_too_large" });
    await expect(
      loadAuthorizedComparisonImages(comparison, async (path) =>
        path.endsWith(".jpg") ? file(png, "image/jpeg") : file(png, "image/png"),
      ),
    ).rejects.toMatchObject({ code: "invalid_image_type" });
  });

  it("enforces the exact per-image and pair limits", async () => {
    expect(MAX_AI_IMAGE_BYTES).toBe(6 * 1024 * 1024);
    expect(MAX_AI_IMAGE_PAIR_BYTES).toBe(12 * 1024 * 1024);

    const maximumJpeg = imageBytes(jpeg, MAX_AI_IMAGE_BYTES);
    const maximumPng = imageBytes(png, MAX_AI_IMAGE_BYTES);

    await expect(
      loadAuthorizedComparisonImages(comparison, async (path) =>
        path.endsWith(".jpg")
          ? file(maximumJpeg, "image/jpeg")
          : file(maximumPng, "image/png"),
      ),
    ).resolves.toMatchObject({
      initial: { mimeType: "image/jpeg" },
      final: { mimeType: "image/png" },
    });

    expect(maximumJpeg.length + maximumPng.length).toBe(MAX_AI_IMAGE_PAIR_BYTES);
  });
});
