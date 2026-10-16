import {
  GEMINI_ANALYSIS_RESPONSE_SCHEMA,
  parseGeminiAnalysisReport,
  type GeminiAnalysisReport,
} from "../_shared/geminiAnalysis.ts";

import type { PreparedComparisonImage } from "./imageLoader.ts";

export const GEMINI_ANALYSIS_PROMPT =
  "Compara estas dos fotografías. La primera corresponde al estado inicial y la segunda al estado final. Describe únicamente las diferencias que puedes observar. No inventes medidas, materiales, causas ni información que no pueda verificarse visualmente. Si no hay cambios apreciables, indícalo. Considera limitaciones por iluminación, perspectiva o encuadre. Responde en español utilizando exclusivamente la estructura solicitada.";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_TOKENS = 1_200;

export type GeminiAnalysisResult = {
  model: string;
  report: GeminiAnalysisReport;
};

export class GeminiRequestError extends Error {
  constructor(
    public readonly code:
      | "gemini_not_configured"
      | "model_unavailable"
      | "provider_quota_exceeded"
      | "gemini_timeout"
      | "gemini_network_error"
      | "invalid_gemini_request"
      | "invalid_gemini_response",
    message: string,
  ) {
    super(message);
    this.name = "GeminiRequestError";
  }
}

type GeminiClientOptions = {
  apiKey: string;
  model?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function getResponseText(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("candidates" in value)) return null;
  const candidates = (value as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const content = candidates[0]?.content;
  const parts = content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts.find((part: unknown) =>
    typeof part === "object" && part !== null && typeof (part as { text?: unknown }).text === "string"
  )?.text;
  return typeof text === "string" ? text : null;
}

async function getProviderErrorStatus(response: Response): Promise<string | null> {
  try {
    const payload = await response.clone().json();
    if (typeof payload !== "object" || payload === null || !("error" in payload)) {
      return null;
    }
    const error = (payload as { error?: unknown }).error;
    if (typeof error !== "object" || error === null || !("status" in error)) {
      return null;
    }
    const status = (error as { status?: unknown }).status;
    return typeof status === "string" ? status : null;
  } catch {
    return null;
  }
}

async function throwProviderError(response: Response): Promise<never> {
  const providerStatus = await getProviderErrorStatus(response);

  if (response.status === 429 || providerStatus === "RESOURCE_EXHAUSTED") {
    throw new GeminiRequestError("provider_quota_exceeded", "Gemini no tiene cuota disponible.");
  }
  if (response.status === 404 || providerStatus === "NOT_FOUND") {
    throw new GeminiRequestError("model_unavailable", "El modelo de Gemini no está disponible.");
  }
  if (
    response.status === 401 ||
    response.status === 403 ||
    providerStatus === "UNAUTHENTICATED" ||
    providerStatus === "PERMISSION_DENIED"
  ) {
    throw new GeminiRequestError("gemini_not_configured", "Gemini no está configurado.");
  }
  if (
    response.status === 408 ||
    response.status === 504 ||
    providerStatus === "DEADLINE_EXCEEDED"
  ) {
    throw new GeminiRequestError("gemini_timeout", "Gemini excedió el tiempo de espera.");
  }
  if (response.status === 400 || providerStatus === "INVALID_ARGUMENT") {
    throw new GeminiRequestError("invalid_gemini_request", "Gemini rechazó la solicitud de análisis.");
  }

  throw new GeminiRequestError("gemini_network_error", "Gemini devolvió un error.");
}

export function createGeminiClient({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  fetcher = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: GeminiClientOptions) {
  if (!apiKey.trim() || !model.trim()) {
    throw new GeminiRequestError("gemini_not_configured", "Gemini no está configurado.");
  }

  return {
    async analyze(
      initial: PreparedComparisonImage,
      final: PreparedComparisonImage,
    ): Promise<GeminiAnalysisResult> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;

      try {
        response = await fetcher(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{
                role: "user",
                parts: [
                  { text: GEMINI_ANALYSIS_PROMPT },
                  { inlineData: { mimeType: initial.mimeType, data: encodeBase64(initial.bytes) } },
                  { inlineData: { mimeType: final.mimeType, data: encodeBase64(final.bytes) } },
                ],
              }],
              generationConfig: {
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                responseMimeType: "application/json",
                responseSchema: GEMINI_ANALYSIS_RESPONSE_SCHEMA,
                temperature: 0.1,
              },
            }),
          },
        );
      } catch (error) {
        if (controller.signal.aborted) {
          throw new GeminiRequestError("gemini_timeout", "Gemini excedió el tiempo de espera.");
        }
        throw new GeminiRequestError("gemini_network_error", "No fue posible conectar con Gemini.");
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        await throwProviderError(response);
      }

      let payload: unknown;
      try {
        payload = await response.json();
        const text = getResponseText(payload);
        if (!text) throw new Error("Missing response text");
        return { model, report: parseGeminiAnalysisReport(JSON.parse(text)) };
      } catch {
        throw new GeminiRequestError(
          "invalid_gemini_response",
          "Gemini devolvió una respuesta incompleta o inválida.",
        );
      }
    },
  };
}
