import { describe, expect, it, vi } from "vitest";

import { createAnalyzeComparisonHandler } from "./handler";

const comparisonId = "123e4567-e89b-42d3-a456-426614174000";
const user = { id: "user-1" };
const completeComparison = {
  id: comparisonId,
  user_id: user.id,
  initial_image_path: "user-1/comparison/initial.jpg",
  final_image_path: "user-1/comparison/final.jpg",
};

const loadImages = vi.fn().mockResolvedValue({});
const analyzeImages = vi.fn().mockResolvedValue({ report: {} });

function request(body: unknown, authorization = "Bearer valid") {
  return new Request("http://localhost/analyze-comparison", {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("analyze-comparison authorization", () => {
  it("rejects unsupported methods", async () => {
    const handler = createAnalyzeComparisonHandler({
      authenticate: vi.fn(),
      findComparison: vi.fn(),
      loadImages,
      analyzeImages,
    });
    expect((await handler(new Request("http://localhost"))).status).toBe(405);
  });

  it("rejects missing or invalid authentication", async () => {
    const handler = createAnalyzeComparisonHandler({
      authenticate: vi.fn().mockResolvedValue(null),
      findComparison: vi.fn(),
      loadImages,
      analyzeImages,
    });
    expect((await handler(request({ comparisonId }, ""))).status).toBe(401);
    expect((await handler(request({ comparisonId }))).status).toBe(401);
  });

  it("validates comparisonId before querying", async () => {
    const findComparison = vi.fn();
    const handler = createAnalyzeComparisonHandler({
      authenticate: vi.fn().mockResolvedValue(user),
      findComparison,
      loadImages,
      analyzeImages,
    });
    expect((await handler(request({ comparisonId: "not-a-uuid" }))).status).toBe(400);
    expect(findComparison).not.toHaveBeenCalled();
  });

  it("does not expose another user's comparison", async () => {
    const handler = createAnalyzeComparisonHandler({
      authenticate: vi.fn().mockResolvedValue(user),
      findComparison: vi.fn().mockResolvedValue(null),
      loadImages,
      analyzeImages,
    });
    expect((await handler(request({ comparisonId }))).status).toBe(404);
  });

  it("rejects an incomplete owned comparison", async () => {
    const handler = createAnalyzeComparisonHandler({
      authenticate: vi.fn().mockResolvedValue(user),
      findComparison: vi.fn().mockResolvedValue({
        ...completeComparison,
        final_image_path: null,
      }),
      loadImages,
      analyzeImages,
    });
    expect((await handler(request({ comparisonId }))).status).toBe(409);
  });

  it("accepts only the authenticated user's complete comparison", async () => {
    const findComparison = vi.fn().mockResolvedValue(completeComparison);
    const handler = createAnalyzeComparisonHandler({
      authenticate: vi.fn().mockResolvedValue(user),
      findComparison,
      loadImages,
      analyzeImages,
    });
    const response = await handler(request({ comparisonId, userId: "attacker" }));
    expect(response.status).toBe(200);
    expect(findComparison).toHaveBeenCalledWith(
      comparisonId,
      user.id,
      "Bearer valid",
    );
  });
});
