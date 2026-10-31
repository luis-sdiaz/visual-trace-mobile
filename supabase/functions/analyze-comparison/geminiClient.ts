import { Buffer } from "node:buffer";
import {
  GEMINI_ANALYSIS_RESPONSE_SCHEMA,
  parseGeminiAnalysisReport,
  type GeminiAnalysisReport,
} from "../_shared/geminiAnalysis.ts";

import type { PreparedComparisonImage } from "./imageLoader.ts";

export const GEMINI_ANALYSIS_PROMPT =
  "Compara estas dos fotografías. La primera corresponde al estado inicial y la segunda al estado final. Describe únicamente las diferencias que puedes observar. No inventes medidas, materiales, causas ni información que no pueda verificarse visualmente. Si no hay cambios apreciables, indícalo. Considera limitaciones por iluminación, perspectiva o encuadre. Responde en español utilizando exclusivamente la estructura solicitada.";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
export const DEFAULT_TIMEOUT_MS = 55_000;
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
  apiKey?: string;
  model?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

function encodeBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
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

async function throwProviderError(response: Response): Promise<never> {
  let rawText = "";
  let payload: Record<string, unknown> | null = null;
  try {
    rawText = await response.text();
    payload = JSON.parse(rawText);
  } catch {
    // Si no es JSON, se conserva el texto sin procesar
  }

  console.error(`[analyze-comparison] Gemini API HTTP ${response.status} error:`, rawText);

  const errorObj =
    typeof payload === "object" && payload !== null && "error" in payload
      ? (payload.error as Record<string, unknown>)
      : null;
  const providerStatus =
    typeof errorObj?.status === "string" ? errorObj.status : null;
  const providerMessage =
    typeof errorObj?.message === "string" && errorObj.message.trim().length > 0
      ? errorObj.message.trim()
      : null;

  const isApiKeyInvalid =
    rawText.includes("API_KEY_INVALID") ||
    rawText.includes("API key not valid") ||
    rawText.includes("not registered callers");

  if (
    response.status === 401 ||
    response.status === 403 ||
    isApiKeyInvalid ||
    providerStatus === "UNAUTHENTICATED" ||
    providerStatus === "PERMISSION_DENIED"
  ) {
    throw new GeminiRequestError(
      "gemini_not_configured",
      providerMessage || "La clave GEMINI_API_KEY no es válida o no está configurada.",
    );
  }
  if (response.status === 429 || providerStatus === "RESOURCE_EXHAUSTED") {
    throw new GeminiRequestError(
      "provider_quota_exceeded",
      providerMessage || "Gemini no tiene cuota disponible.",
    );
  }
  if (response.status === 404 || providerStatus === "NOT_FOUND") {
    throw new GeminiRequestError(
      "model_unavailable",
      providerMessage || "El modelo de Gemini no está disponible.",
    );
  }
  if (
    response.status === 408 ||
    response.status === 504 ||
    providerStatus === "DEADLINE_EXCEEDED"
  ) {
    throw new GeminiRequestError(
      "gemini_timeout",
      providerMessage || "Gemini excedió el tiempo de espera.",
    );
  }
  if (response.status === 400 || providerStatus === "INVALID_ARGUMENT") {
    throw new GeminiRequestError(
      "invalid_gemini_request",
      providerMessage || "Gemini rechazó la solicitud de análisis.",
    );
  }

  throw new GeminiRequestError(
    "gemini_network_error",
    providerMessage || rawText || "Gemini devolvió un error.",
  );
}

export function createGeminiClient({
  apiKey,
  model,
  fetcher = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: GeminiClientOptions = {}) {
  const envKey =
    typeof Deno !== "undefined"
      ? Deno.env.get("GEMINI_API_KEY")
      : typeof process !== "undefined"
      ? process.env.GEMINI_API_KEY
      : undefined;

  const envModel =
    typeof Deno !== "undefined"
      ? Deno.env.get("GEMINI_MODEL")
      : typeof process !== "undefined"
      ? process.env.GEMINI_MODEL
      : undefined;

  const rawApiKey = (apiKey ?? envKey)?.trim();
  const rawModel = (model ?? envModel)?.trim() || DEFAULT_GEMINI_MODEL;
  const resolvedApiKey = rawApiKey;
  const modelName = rawModel.replace(/^models\//, "");

  if (!resolvedApiKey || !modelName) {
    throw new GeminiRequestError(
      "gemini_not_configured",
      "Gemini no está configurado.",
    );
  }

  return {
    async analyze(
      initial: PreparedComparisonImage,
      final: PreparedComparisonImage,
    ): Promise<GeminiAnalysisResult> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const initialMimeType = initial.mimeType;
      const finalMimeType = final.mimeType;
      const initialBase64 = encodeBase64(initial.bytes);
      const finalBase64 = encodeBase64(final.bytes);

      const payload = JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: GEMINI_ANALYSIS_PROMPT },
            { inlineData: { mimeType: initialMimeType, data: initialBase64 } },
            { inlineData: { mimeType: finalMimeType, data: finalBase64 } },
          ],
        }],
        generationConfig: {
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: "application/json",
          responseSchema: GEMINI_ANALYSIS_RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      });

      let response: Response;

      try {
        response = await fetcher(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": resolvedApiKey,
            },
            signal: controller.signal,
            body: payload,
          },
        );
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError"))
        ) {
          console.error("[analyze-comparison] Gemini API timeout:", error);
          throw new GeminiRequestError("gemini_timeout", "Gemini excedió el tiempo de espera.");
        }
        console.error("[analyze-comparison] Error de conexión con Gemini:", error);
        throw new GeminiRequestError("gemini_network_error", "No fue posible conectar con Gemini.");
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        await throwProviderError(response);
      }

      let responsePayload: unknown;
      try {
        responsePayload = await response.json();
        const text = getResponseText(responsePayload);
        if (!text) throw new Error("Missing response text");
        return { model: modelName, report: parseGeminiAnalysisReport(JSON.parse(text)) };
      } catch {
        throw new GeminiRequestError(
          "invalid_gemini_response",
          "Gemini devolvió una respuesta incompleta o inválida.",
        );
      }
    },
  };
}
