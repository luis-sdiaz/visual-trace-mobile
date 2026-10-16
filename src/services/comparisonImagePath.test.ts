import { describe, expect, it } from "vitest";

import { isOwnedComparisonImagePath } from "@/services/comparisonImagePath";

describe("isOwnedComparisonImagePath", () => {
  it("accepts original and versioned images for the requested stage", () => {
    expect(
      isOwnedComparisonImagePath({
        comparisonId: "comparison-1",
        imagePath: "user-1/comparison-1/initial.jpg",
        imageStage: "initial",
        userId: "user-1",
      }),
    ).toBe(true);
    expect(
      isOwnedComparisonImagePath({
        comparisonId: "comparison-1",
        imagePath: "user-1/comparison-1/initial-version-2.png",
        imageStage: "initial",
        userId: "user-1",
      }),
    ).toBe(true);
  });

  it("rejects another user, comparison, stage, directory, or format", () => {
    const invalidPaths = [
      "user-2/comparison-1/initial.jpg",
      "user-1/comparison-2/initial.jpg",
      "user-1/comparison-1/final.jpg",
      "user-1/comparison-1/archive/initial.jpg",
      "user-1/comparison-1/initial-old/archive.jpg",
      "user-1/comparison-1/initial--old.jpg",
      "user-1/comparison-1/../initial.jpg",
      "user-1\\comparison-1\\initial.jpg",
      "user-1/comparison-1/initial.gif",
    ];

    for (const imagePath of invalidPaths) {
      expect(
        isOwnedComparisonImagePath({
          comparisonId: "comparison-1",
          imagePath,
          imageStage: "initial",
          userId: "user-1",
        }),
      ).toBe(false);
    }
  });
});
