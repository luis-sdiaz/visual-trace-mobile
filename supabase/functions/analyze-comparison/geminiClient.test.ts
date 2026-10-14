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

  it.each([
    [429, "provider_quota_exceeded"],
    [404, "model_unavailable"],
  ])("maps provider status %i", async (status, code) => {
    const client = createGeminiClient({
      apiKey: "test-key",
      fetcher: vi.fn().mockResolvedValue(response(status, {})),
    });
    await expect(client.analyze(initial, final)).rejects.toMatchObject({ code });
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
