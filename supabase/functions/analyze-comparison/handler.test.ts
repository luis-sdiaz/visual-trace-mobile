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
const analysis = { model: "gemini-test", report: { contractVersion: "1.0" } };
const analyzeImages = vi.fn().mockResolvedValue(analysis);
const persistReport = vi.fn().mockResolvedValue({ id: "report-1", ...analysis });
const reserveUsage = vi.fn().mockResolvedValue({ action: "reserved", attemptId: "attempt-1" });
const completeUsage = vi.fn().mockResolvedValue(undefined);

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
      persistReport,
      reserveUsage,
      completeUsage,
    });
    expect((await handler(new Request("http://localhost"))).status).toBe(405);
  });

  it("rejects missing or invalid authentication", async () => {
    const handler = createAnalyzeComparisonHandler({
      authenticate: vi.fn().mockResolvedValue(null),
      findComparison: vi.fn(),
      loadImages,
      analyzeImages,
      persistReport,
      reserveUsage,
      completeUsage,
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
      persistReport,
      reserveUsage,
      completeUsage,
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
      persistReport,
      reserveUsage,
      completeUsage,
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
      persistReport,
      reserveUsage,
      completeUsage,
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
      persistReport,
      reserveUsage,
      completeUsage,
    });
    const response = await handler(request({ comparisonId, userId: "attacker" }));
    expect(response.status).toBe(200);
    expect(findComparison).toHaveBeenCalledWith(
      comparisonId,
      user.id,
      "Bearer valid",
    );
    expect(persistReport).toHaveBeenCalledWith({
      comparison: completeComparison,
      analysis,
    });
  });

  it("does not report success when transactional persistence fails", async () => {
    const handler = createAnalyzeComparisonHandler({
      authenticate: vi.fn().mockResolvedValue(user),
      findComparison: vi.fn().mockResolvedValue(completeComparison),
      loadImages,
      analyzeImages,
      persistReport: vi.fn().mockRejectedValue(new Error("database unavailable")),
      reserveUsage,
      completeUsage,
    });
    const response = await handler(request({ comparisonId }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      code: "analysis_persistence_failed",
    });
  });

  it("returns a durable report when only attempt completion bookkeeping fails", async () => {
    const savedReport = { id: "report-1", result: analysis.report };
    const handler = createAnalyzeComparisonHandler({
      authenticate: vi.fn().mockResolvedValue(user),
      findComparison: vi.fn().mockResolvedValue(completeComparison),
      loadImages,
      analyzeImages,
      persistReport: vi.fn().mockResolvedValue(savedReport),
      reserveUsage,
      completeUsage: vi.fn().mockRejectedValue(new Error("bookkeeping unavailable")),
    });
    const response = await handler(request({ comparisonId }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(savedReport);
  });

  it("returns a cached report without calling Gemini", async () => {
    const cached = { id: "existing-report", result: analysis.report };
    const localAnalyze = vi.fn();
    const handler = createAnalyzeComparisonHandler({
      authenticate: vi.fn().mockResolvedValue(user),
      findComparison: vi.fn().mockResolvedValue(completeComparison),
      loadImages,
      analyzeImages: localAnalyze,
      persistReport,
      reserveUsage: vi.fn().mockResolvedValue({ action: "cached", report: cached }),
      completeUsage,
    });
    const response = await handler(request({ comparisonId }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(cached);
    expect(localAnalyze).not.toHaveBeenCalled();
  });

  it("returns a clear response when a persistent limit is reached", async () => {
    const handler = createAnalyzeComparisonHandler({
      authenticate: vi.fn().mockResolvedValue(user),
      findComparison: vi.fn().mockResolvedValue(completeComparison),
      loadImages,
      analyzeImages,
      persistReport,
      reserveUsage: vi.fn().mockResolvedValue({ action: "limited", scope: "user_day" }),
      completeUsage,
    });
    const response = await handler(request({ comparisonId }));
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      code: "usage_limit_reached",
      scope: "user_day",
    });
  });
});
