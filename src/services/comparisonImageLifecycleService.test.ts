import { beforeEach, describe, expect, it, vi } from "vitest";

const lifecycleMock = vi.hoisted(() => ({
  fetchComparisonById: vi.fn(),
  removeComparisonImage: vi.fn(),
  updateComparisonImagePath: vi.fn(),
  uploadComparisonImage: vi.fn(),
}));

vi.mock("@/services/comparisonService", () => ({
  fetchComparisonById: lifecycleMock.fetchComparisonById,
  updateComparisonImagePath: lifecycleMock.updateComparisonImagePath,
}));

vi.mock("@/services/imageStorageService", () => ({
  removeComparisonImage: lifecycleMock.removeComparisonImage,
  uploadComparisonImage: lifecycleMock.uploadComparisonImage,
}));

import { saveComparisonImage } from "@/services/comparisonImageLifecycleService";
import type { ComparisonRecord } from "@/services/comparisonService";

const previousPath = "user-1/comparison-1/initial.jpg";
const replacementPath = "user-1/comparison-1/initial-version.png";

function createComparison(imagePath: string | null): ComparisonRecord {
  return {
    id: "comparison-1",
    user_id: "user-1",
    name: "Sala",
    initial_image_path: imagePath,
    final_image_path: null,
    status: "draft",
    created_at: "2026-10-14T12:00:00.000Z",
    updated_at: "2026-10-14T12:00:00.000Z",
  };
}

describe("saveComparisonImage cleanup", () => {
  beforeEach(() => {
    lifecycleMock.fetchComparisonById.mockReset();
    lifecycleMock.removeComparisonImage.mockReset();
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
});
