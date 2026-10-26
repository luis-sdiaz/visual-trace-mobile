import { describe, expect, it, vi } from "vitest";

import { GEMINI_ANALYSIS_CONTRACT_VERSION } from "../../../src/contracts/geminiAnalysis";
import { createGeminiClient } from "./geminiClient";

const report = {
  contractVersion: GEMINI_ANALYSIS_CONTRACT_VERSION,
  hasVisibleChanges: false,
  summary: "No se observan cambios visibles.",
  differences: [],
  observations: [],
  uncertainties: [],
};
const image = (value: number, path: string) => ({
  bytes: new Uint8Array([value]),
  mimeType: "image/jpeg" as const,
  path,
});
const initial = image(1, "initial.jpg");
const final = image(2, "final.jpg");

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Gemini client", () => {
  it("sends initial and final images in order and validates structured output", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(200, {
      candidates: [{ content: { parts: [{ text: JSON.stringify(report) }] } }],
    }));
    const result = await createGeminiClient({ apiKey: "test-key", fetcher }).analyze(initial, final);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.contents[0].parts[1].inlineData.data).toBe("AQ==");
    expect(body.contents[0].parts[2].inlineData.data).toBe("Ag==");
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(result.report).toEqual(report);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("sanitizes model name by removing duplicate models/ prefix", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(200, {
      candidates: [{ content: { parts: [{ text: JSON.stringify(report) }] } }],
    }));
    const client = createGeminiClient({
      apiKey: "test-key",
      model: "models/gemini-3.5-flash",
      fetcher,
    });
    const result = await client.analyze(initial, final);
    const calledUrl = fetcher.mock.calls[0][0];
    expect(calledUrl).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
    );
    expect(result.model).toBe("gemini-3.5-flash");
  });

  it.each([
    [429, {}, "provider_quota_exceeded"],
    [404, {}, "model_unavailable"],
    [401, {}, "gemini_not_configured"],
    [403, {}, "gemini_not_configured"],
    [408, {}, "gemini_timeout"],
    [500, {}, "gemini_network_error"],
    [400, { error: { status: "INVALID_ARGUMENT" } }, "invalid_gemini_request"],
    [400, { error: { status: "NOT_FOUND" } }, "model_unavailable"],
    [400, { error: { status: "RESOURCE_EXHAUSTED" } }, "provider_quota_exceeded"],
  ])("maps provider status %i", async (status, body, code) => {
    const client = createGeminiClient({
      apiKey: "test-key",
      fetcher: vi.fn().mockResolvedValue(response(status, body)),
    });
    await expect(client.analyze(initial, final)).rejects.toMatchObject({ code });
  });

  it("extracts and propagates the exact error message from Google", async () => {
    const client = createGeminiClient({
      apiKey: "test-key",
      fetcher: vi.fn().mockResolvedValue(response(400, {
        error: {
          status: "INVALID_ARGUMENT",
          message: "Detailed Google provider message for debugging",
        },
      })),
    });

    await expect(client.analyze(initial, final)).rejects.toMatchObject({
      code: "invalid_gemini_request",
      message: "Detailed Google provider message for debugging",
    });
  });

  it("maps API_KEY_INVALID to gemini_not_configured", async () => {
    const client = createGeminiClient({
      apiKey: "invalid-key",
      fetcher: vi.fn().mockResolvedValue(response(400, {
        error: {
          code: 400,
          message: "API key not valid. Please pass a valid API key.",
          status: "INVALID_ARGUMENT",
          details: [{ reason: "API_KEY_INVALID" }],
        },
      })),
    });

    await expect(client.analyze(initial, final)).rejects.toMatchObject({
      code: "gemini_not_configured",
    });
  });

  it("rejects invalid or incomplete JSON", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(200, {
      candidates: [{ content: { parts: [{ text: "not-json" }] } }],
    }));
    await expect(
      createGeminiClient({ apiKey: "test-key", fetcher }).analyze(initial, final),
    ).rejects.toMatchObject({ code: "invalid_gemini_response" });
  });

  it("maps network failures without retrying", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(
      createGeminiClient({ apiKey: "test-key", fetcher }).analyze(initial, final),
    ).rejects.toMatchObject({ code: "gemini_network_error" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("aborts requests after the configured timeout", async () => {
    const fetcher = vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })) as unknown as typeof fetch;
    await expect(
      createGeminiClient({ apiKey: "test-key", fetcher, timeoutMs: 1 }).analyze(initial, final),
    ).rejects.toMatchObject({ code: "gemini_timeout" });
  });
});
