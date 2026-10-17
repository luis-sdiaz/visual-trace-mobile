import { beforeEach, describe, expect, it, vi } from "vitest";

const lifecycleMock = vi.hoisted(() => ({
  fetchComparisonById: vi.fn(),
  removeComparisonImage: vi.fn(),
  resolveComparisonImageUrl: vi.fn(),
  updateComparisonImagePath: vi.fn(),
  uploadComparisonImage: vi.fn(),
}));

vi.mock("@/services/comparisonService", () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {
    constructor() {
      super("User must be authenticated.");
      this.name = "AuthenticationRequiredError";
    }
  },
  fetchComparisonById: lifecycleMock.fetchComparisonById,
  updateComparisonImagePath: lifecycleMock.updateComparisonImagePath,
}));

vi.mock("@/services/imageStorageService", () => ({
  ImageStorageError: class ImageStorageError extends Error {
    constructor(public readonly code: string, message: string) {
      super(message);
      this.name = "ImageStorageError";
    }
  },
  removeComparisonImage: lifecycleMock.removeComparisonImage,
  resolveComparisonImageUrl: lifecycleMock.resolveComparisonImageUrl,
  uploadComparisonImage: lifecycleMock.uploadComparisonImage,
}));

import {
  AnalyzedComparisonEditError,
  ConcurrentComparisonImageEditError,
  getComparisonImageSaveErrorMessage,
  restoreSavedComparisonImage,
  saveComparisonImage,
  shouldUploadComparisonImage,
} from "@/services/comparisonImageLifecycleService";
import type { ComparisonRecord } from "@/services/comparisonService";
import { AuthenticationRequiredError } from "@/services/comparisonService";
import { ImageStorageError } from "@/services/imageStorageService";

const previousPath = "user-1/comparison-1/initial.jpg";
const replacementPath = "user-1/comparison-1/initial-version.png";

function createComparison(
  imagePath: string | null,
  overrides: Partial<ComparisonRecord> = {},
): ComparisonRecord {
  return {
    id: "comparison-1",
    user_id: "user-1",
    name: "Sala",
    initial_image_path: imagePath,
    final_image_path: null,
    status: "draft",
    created_at: "2026-10-14T12:00:00.000Z",
    updated_at: "2026-10-14T12:00:00.000Z",
    ...overrides,
  };
}

describe("saveComparisonImage cleanup", () => {
  beforeEach(() => {
    lifecycleMock.fetchComparisonById.mockReset();
    lifecycleMock.removeComparisonImage.mockReset();
    lifecycleMock.resolveComparisonImageUrl.mockReset();
    lifecycleMock.updateComparisonImagePath.mockReset();
    lifecycleMock.uploadComparisonImage.mockReset();
    lifecycleMock.uploadComparisonImage.mockResolvedValue(replacementPath);
    lifecycleMock.removeComparisonImage.mockResolvedValue(undefined);
  });

  it("deletes the old object only after the new path is confirmed", async () => {
    lifecycleMock.fetchComparisonById
      .mockResolvedValueOnce(createComparison(previousPath))
      .mockResolvedValueOnce(createComparison(replacementPath));

    await expect(
      saveComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri: "file:///replacement.png",
        previousImagePath: previousPath,
      }),
    ).resolves.toBe(replacementPath);

    expect(lifecycleMock.removeComparisonImage).toHaveBeenCalledWith({
      comparisonId: "comparison-1",
      imagePath: previousPath,
      imageStage: "initial",
    });
    expect(lifecycleMock.updateComparisonImagePath).toHaveBeenCalledWith(
      "comparison-1",
      "initial",
      replacementPath,
      previousPath,
      "draft",
    );
  });

  it("atomically keeps a completed replacement ready", async () => {
    lifecycleMock.fetchComparisonById
      .mockResolvedValueOnce(
        createComparison(previousPath, {
          final_image_path: "user-1/comparison-1/final.jpg",
          status: "ready",
        }),
      )
      .mockResolvedValueOnce(createComparison(replacementPath));

    await saveComparisonImage({
      comparisonId: "comparison-1",
      imageStage: "initial",
      imageUri: "file:///replacement.png",
      previousImagePath: previousPath,
    });

    expect(lifecycleMock.updateComparisonImagePath).toHaveBeenCalledWith(
      "comparison-1",
      "initial",
      replacementPath,
      previousPath,
      "ready",
    );
  });

  it("blocks analyzed comparisons before uploading a replacement", async () => {
    lifecycleMock.fetchComparisonById.mockResolvedValueOnce(
      createComparison(previousPath, {
        final_image_path: "user-1/comparison-1/final.jpg",
        status: "analyzed",
      }),
    );

    await expect(
      saveComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri: "file:///replacement.png",
        previousImagePath: previousPath,
      }),
    ).rejects.toBeInstanceOf(AnalyzedComparisonEditError);

    expect(lifecycleMock.uploadComparisonImage).not.toHaveBeenCalled();
    expect(lifecycleMock.updateComparisonImagePath).not.toHaveBeenCalled();
  });

  it("reports a concurrent replacement before uploading", async () => {
    lifecycleMock.fetchComparisonById.mockResolvedValueOnce(
      createComparison("user-1/comparison-1/another-initial.jpg"),
    );

    await expect(
      saveComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri: "file:///replacement.png",
        previousImagePath: previousPath,
      }),
    ).rejects.toBeInstanceOf(ConcurrentComparisonImageEditError);
    expect(lifecycleMock.uploadComparisonImage).not.toHaveBeenCalled();
  });

  it("does not write anything when the upload itself fails", async () => {
    const uploadError = new Error("upload unavailable");
    lifecycleMock.fetchComparisonById.mockResolvedValueOnce(
      createComparison(previousPath),
    );
    lifecycleMock.uploadComparisonImage.mockRejectedValue(uploadError);

    await expect(
      saveComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri: "file:///replacement.png",
        previousImagePath: previousPath,
      }),
    ).rejects.toBe(uploadError);

    expect(lifecycleMock.updateComparisonImagePath).not.toHaveBeenCalled();
    expect(lifecycleMock.removeComparisonImage).not.toHaveBeenCalled();
  });

  it("removes an unreferenced upload when the database update fails", async () => {
    const databaseError = new Error("database unavailable");
    lifecycleMock.fetchComparisonById
      .mockResolvedValueOnce(createComparison(previousPath))
      .mockResolvedValueOnce(createComparison(previousPath));
    lifecycleMock.updateComparisonImagePath.mockRejectedValue(databaseError);

    await expect(
      saveComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri: "file:///replacement.png",
        previousImagePath: previousPath,
      }),
    ).rejects.toBe(databaseError);

    expect(lifecycleMock.removeComparisonImage).toHaveBeenCalledWith({
      comparisonId: "comparison-1",
      imagePath: replacementPath,
      imageStage: "initial",
    });
  });

  it("keeps the upload when the database result cannot be reconciled", async () => {
    const databaseError = new Error("database timeout");
    lifecycleMock.fetchComparisonById
      .mockResolvedValueOnce(createComparison(previousPath))
      .mockRejectedValueOnce(new Error("read unavailable"));
    lifecycleMock.updateComparisonImagePath.mockRejectedValue(databaseError);

    await expect(
      saveComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri: "file:///replacement.png",
        previousImagePath: previousPath,
      }),
    ).rejects.toBe(databaseError);

    expect(lifecycleMock.removeComparisonImage).not.toHaveBeenCalled();
  });

  it("never deletes an old object that is still referenced", async () => {
    lifecycleMock.fetchComparisonById
      .mockResolvedValueOnce(createComparison(previousPath))
      .mockResolvedValueOnce(createComparison(previousPath));

    await expect(
      saveComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri: "file:///replacement.png",
        previousImagePath: previousPath,
      }),
    ).resolves.toBe(replacementPath);

    expect(lifecycleMock.removeComparisonImage).not.toHaveBeenCalled();
  });

  it("keeps a successful replacement when old-object cleanup fails", async () => {
    lifecycleMock.fetchComparisonById
      .mockResolvedValueOnce(createComparison(previousPath))
      .mockResolvedValueOnce(createComparison(replacementPath));
    lifecycleMock.removeComparisonImage.mockRejectedValue(
      new Error("storage cleanup unavailable"),
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      saveComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        imageUri: "file:///replacement.png",
        previousImagePath: previousPath,
      }),
    ).resolves.toBe(replacementPath);

    expect(consoleError).toHaveBeenCalledWith(
      "Failed to clean up a superseded comparison image:",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});

describe("restoreSavedComparisonImage", () => {
  beforeEach(() => {
    lifecycleMock.fetchComparisonById.mockReset();
    lifecycleMock.resolveComparisonImageUrl.mockReset();
    lifecycleMock.removeComparisonImage.mockReset();
    lifecycleMock.updateComparisonImagePath.mockReset();
    lifecycleMock.uploadComparisonImage.mockReset();
  });

  it("recovers the persisted image without storage or database writes", async () => {
    lifecycleMock.fetchComparisonById.mockResolvedValue(
      createComparison(previousPath, { status: "analyzed" }),
    );
    lifecycleMock.resolveComparisonImageUrl.mockResolvedValue(
      "https://signed.example/initial",
    );

    await expect(
      restoreSavedComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        expectedImagePath: previousPath,
      }),
    ).resolves.toEqual({
      path: previousPath,
      uri: "https://signed.example/initial",
    });

    expect(lifecycleMock.resolveComparisonImageUrl).toHaveBeenCalledWith({
      comparisonId: "comparison-1",
      imagePath: previousPath,
      imageStage: "initial",
    });
    expect(lifecycleMock.uploadComparisonImage).not.toHaveBeenCalled();
    expect(lifecycleMock.updateComparisonImagePath).not.toHaveBeenCalled();
    expect(lifecycleMock.removeComparisonImage).not.toHaveBeenCalled();
  });

  it("rejects recovery when the persisted path changed concurrently", async () => {
    lifecycleMock.fetchComparisonById.mockResolvedValue(
      createComparison("user-1/comparison-1/initial-new.jpg"),
    );

    await expect(
      restoreSavedComparisonImage({
        comparisonId: "comparison-1",
        imageStage: "initial",
        expectedImagePath: previousPath,
      }),
    ).rejects.toBeInstanceOf(ConcurrentComparisonImageEditError);
    expect(lifecycleMock.resolveComparisonImageUrl).not.toHaveBeenCalled();
  });
});

describe("shouldUploadComparisonImage", () => {
  it("skips an unchanged stored image", () => {
    expect(shouldUploadComparisonImage(previousPath, false)).toBe(false);
  });

  it("uploads new and deliberately replaced images", () => {
    expect(shouldUploadComparisonImage(null, true)).toBe(true);
    expect(shouldUploadComparisonImage(previousPath, true)).toBe(true);
  });
});

describe("getComparisonImageSaveErrorMessage", () => {
  it.each([
    ["file_too_large", "supera el límite de 6 MiB"],
    ["unsupported_format", "formato de la fotografía no es compatible"],
    ["invalid_file", "no contiene una fotografía válida"],
    ["file_inaccessible", "No pudimos acceder al archivo"],
    ["network_error", "Comprueba tu red"],
    ["storage_unavailable", "no está disponible temporalmente"],
    ["storage_failure", "no pudo guardar la fotografía"],
  ])("maps %s to actionable copy", (code, expectedText) => {
    expect(
      getComparisonImageSaveErrorMessage(
        new ImageStorageError(code as never, "internal"),
        "initial",
      ),
    ).toContain(expectedText);
  });

  it("distinguishes session and replacement conflicts", () => {
    expect(
      getComparisonImageSaveErrorMessage(new AuthenticationRequiredError(), "initial"),
    ).toContain("sesión");
    expect(
      getComparisonImageSaveErrorMessage(
        new ConcurrentComparisonImageEditError(),
        "initial",
      ),
    ).toContain("cambió en otro proceso");
  });

  it("does not describe an unknown error as a network failure", () => {
    const message = getComparisonImageSaveErrorMessage(new Error("unknown"), "final");
    expect(message).toContain("fotografía final");
    expect(message).not.toContain("conexión");
    expect(message).not.toContain("red");
  });
});
