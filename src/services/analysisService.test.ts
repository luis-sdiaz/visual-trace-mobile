import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), invoke: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    functions: { invoke: mocks.invoke },
    from: mocks.from,
  },
}));

import { GEMINI_ANALYSIS_CONTRACT_VERSION } from "@/contracts/geminiAnalysis";
import {
  AnalysisServiceError,
  fetchCurrentAnalysisReport,
  isAnalysisReportsUnavailableError,
  requestComparisonAnalysis,
} from "@/services/analysisService";

const record = {
  id: "report-1",
  comparison_id: "comparison-1",
  user_id: "user-1",
  model: "gemini-test",
  contract_version: "1.0",
  result: {
    contractVersion: GEMINI_ANALYSIS_CONTRACT_VERSION,
    hasVisibleChanges: false,
    summary: "No hay cambios visibles.",
    differences: [],
    observations: [],
    uncertainties: [],
  },
  initial_image_path: "initial.jpg",
  final_image_path: "final.jpg",
  created_at: "2026-10-14T12:00:00Z",
};

describe("analysisService", () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "session-token" } },
      error: null,
    });
  });

  it("invokes the Edge Function with the existing session", async () => {
    mocks.invoke.mockResolvedValue({ data: record, error: null });
    await expect(requestComparisonAnalysis("comparison-1")).resolves.toEqual(record);
    expect(mocks.invoke).toHaveBeenCalledWith("analyze-comparison", {
      body: { comparisonId: "comparison-1" },
      headers: { Authorization: "Bearer session-token" },
    });
  });

  it("requires an authenticated session", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(requestComparisonAnalysis("comparison-1")).rejects.toMatchObject({
      code: "unauthorized",
    } satisfies Partial<AnalysisServiceError>);
  });

  it("loads only a report matching the current image paths", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: record, error: null });
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mocks.from.mockReturnValue(query);
    await expect(fetchCurrentAnalysisReport({
      comparisonId: "comparison-1",
      initialImagePath: "initial.jpg",
      finalImagePath: "final.jpg",
    })).resolves.toEqual(record);
    expect(query.eq).toHaveBeenCalledWith("initial_image_path", "initial.jpg");
    expect(query.eq).toHaveBeenCalledWith("final_image_path", "final.jpg");
  });

  it("does not return an obsolete report for replaced photographs", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mocks.from.mockReturnValue(query);
    await expect(fetchCurrentAnalysisReport({
      comparisonId: "comparison-1",
      initialImagePath: "initial-replacement.jpg",
      finalImagePath: "final.jpg",
    })).resolves.toBeNull();
  });

  it("returns null when the report table is available without a saved report", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mocks.from.mockReturnValue(query);

    await expect(fetchCurrentAnalysisReport({
      comparisonId: "comparison-1",
      initialImagePath: "initial.jpg",
      finalImagePath: "final.jpg",
    })).resolves.toBeNull();
  });

  it("classifies PGRST205 as the reports service being unavailable", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST205", message: "table not found", status: 404 },
    });
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mocks.from.mockReturnValue(query);

    await expect(fetchCurrentAnalysisReport({
      comparisonId: "comparison-1",
      initialImagePath: "initial.jpg",
      finalImagePath: "final.jpg",
    })).rejects.toMatchObject({ code: "reports_unavailable" });
  });

  it("classifies 42P01 only when it identifies the reports relation", () => {
    expect(isAnalysisReportsUnavailableError({
      code: "42P01",
      message: 'relation "public.ai_analysis_reports" does not exist',
    })).toBe(true);
    expect(isAnalysisReportsUnavailableError({
      code: "42P01",
      message: 'relation "public.some_other_table" does not exist',
    })).toBe(false);
  });

  it("does not classify an unrelated 404 as a missing reports table", () => {
    expect(isAnalysisReportsUnavailableError({
      code: "PGRST125",
      message: "Invalid path",
      status: 404,
    })).toBe(false);
  });

  it("preserves network failures instead of hiding them", async () => {
    const networkError = new TypeError("Network request failed");
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: networkError });
    const query = { select: vi.fn(), eq: vi.fn(), maybeSingle };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mocks.from.mockReturnValue(query);

    await expect(fetchCurrentAnalysisReport({
      comparisonId: "comparison-1",
      initialImagePath: "initial.jpg",
      finalImagePath: "final.jpg",
    })).rejects.toBe(networkError);
  });

  it("maps the Edge Function quota response for the mobile state", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(JSON.stringify({ code: "usage_limit_reached" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
      },
    });
    await expect(requestComparisonAnalysis("comparison-1")).rejects.toMatchObject({
      code: "usage_limit_reached",
    });
  });

  it("preserves the quota scope from the Edge Function response", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(
          JSON.stringify({ code: "usage_limit_reached", scope: "global_minute" }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          },
        ),
      },
    });
    await expect(requestComparisonAnalysis("comparison-1")).rejects.toMatchObject({
      code: "usage_limit_reached",
      scope: "global_minute",
    });
  });

  it("maps provider quota exceeded to usage_limit_reached", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(JSON.stringify({ code: "provider_quota_exceeded" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
      },
    });
    await expect(requestComparisonAnalysis("comparison-1")).rejects.toMatchObject({
      code: "usage_limit_reached",
    });
  });

  it("maps service unavailable 503 to reports_unavailable", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(JSON.stringify({ code: "usage_limits_unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      },
    });
    await expect(requestComparisonAnalysis("comparison-1")).rejects.toMatchObject({
      code: "reports_unavailable",
    });
  });

  it("maps analysis in progress to analysis_in_progress", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(JSON.stringify({ code: "analysis_in_progress" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      },
    });
    await expect(requestComparisonAnalysis("comparison-1")).rejects.toMatchObject({
      code: "analysis_in_progress",
    });
  });

  it("rejects malformed reports", async () => {
    mocks.invoke.mockResolvedValue({ data: { ...record, result: {} }, error: null });
    await expect(requestComparisonAnalysis("comparison-1")).rejects.toMatchObject({
      code: "invalid_response",
    });
  });
});
