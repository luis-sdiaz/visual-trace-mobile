import { beforeEach, describe, expect, it, vi } from "vitest";

const recoveryMock = vi.hoisted(() => ({
  fetchComparisonById: vi.fn(),
  resolveComparisonImageUrl: vi.fn(),
}));

vi.mock("@/services/comparisonService", () => ({
  fetchComparisonById: recoveryMock.fetchComparisonById,
}));

vi.mock("@/services/imageStorageService", () => ({
  resolveComparisonImageUrl: recoveryMock.resolveComparisonImageUrl,
}));

import { recoverComparison } from "@/services/comparisonRecoveryService";
import type { ComparisonRecord } from "@/services/comparisonService";

function createComparison(
  overrides: Partial<ComparisonRecord> = {},
): ComparisonRecord {
  return {
    id: "comparison-1",
    user_id: "user-1",
    name: "Sala",
    initial_image_path: "user-1/comparison-1/initial.jpg",
    final_image_path: "user-1/comparison-1/final.jpg",
    status: "ready",
    created_at: "2026-10-13T12:00:00.000Z",
    updated_at: "2026-10-13T12:00:00.000Z",
    ...overrides,
  };
}

describe("recoverComparison", () => {
  beforeEach(() => {
    recoveryMock.resolveComparisonImageUrl.mockImplementation(
      async ({ imageStage }: { imageStage: string }) =>
        `https://signed.example/${imageStage}`,
    );
  });

  it("restores both private photographs for a completed comparison", async () => {
    const comparison = createComparison();
    recoveryMock.fetchComparisonById.mockResolvedValue(comparison);

    await expect(recoverComparison(comparison.id)).resolves.toEqual({
      comparison,
      initialImageUri: "https://signed.example/initial",
      finalImageUri: "https://signed.example/final",
    });
    expect(recoveryMock.resolveComparisonImageUrl).toHaveBeenCalledTimes(2);
  });

  it("preserves missing paths when recovering an incomplete comparison", async () => {
    const comparison = createComparison({
      final_image_path: null,
      status: "draft",
    });
    recoveryMock.fetchComparisonById.mockResolvedValue(comparison);

    await expect(recoverComparison(comparison.id)).resolves.toEqual({
      comparison,
      initialImageUri: "https://signed.example/initial",
      finalImageUri: null,
    });
    expect(recoveryMock.resolveComparisonImageUrl).toHaveBeenCalledTimes(1);
  });

  it("fails recovery when a private image cannot be restored", async () => {
    const comparison = createComparison();
    recoveryMock.fetchComparisonById.mockResolvedValue(comparison);
    recoveryMock.resolveComparisonImageUrl.mockRejectedValue(
      new Error("storage unavailable"),
    );

    await expect(recoverComparison(comparison.id)).rejects.toThrow(
      "storage unavailable",
    );
  });
});
