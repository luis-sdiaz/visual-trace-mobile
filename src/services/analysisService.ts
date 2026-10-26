import {
  parseGeminiAnalysisReport,
  type GeminiAnalysisReport,
} from "@/contracts/geminiAnalysis";
import { supabase } from "@/lib/supabase";

export type AnalysisReportRecord = {
  id: string;
  comparison_id: string;
  user_id: string;
  model: string;
  contract_version: string;
  result: GeminiAnalysisReport;
  initial_image_path: string;
  final_image_path: string;
  created_at: string;
};

export type AnalysisErrorCode =
  | "unauthorized"
  | "usage_limit_reached"
  | "analysis_in_progress"
  | "reports_unavailable"
  | "retryable"
  | "invalid_response";

export class AnalysisServiceError extends Error {
  constructor(public readonly code: AnalysisErrorCode, message: string) {
    super(message);
    this.name = "AnalysisServiceError";
  }
}

type PostgrestError = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
};

const REPORTS_RELATION_PATTERN =
  /(?:^|["'\s])(?:public\.)?ai_analysis_reports(?:["'\s]|$)/;

export function isAnalysisReportsUnavailableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const postgrestError = error as PostgrestError;
  if (postgrestError.code === "PGRST205") return true;
  if (postgrestError.code !== "42P01") return false;

  const context = [postgrestError.message, postgrestError.details]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  return REPORTS_RELATION_PATTERN.test(context);
}

function parseRecord(value: unknown): AnalysisReportRecord {
  const record = Array.isArray(value) ? value[0] : value;
  if (typeof record !== "object" || record === null) {
    throw new AnalysisServiceError("invalid_response", "El informe recibido no es válido.");
  }
  const raw = record as Record<string, unknown>;
  const requiredStrings = [
    "id",
    "comparison_id",
    "user_id",
    "model",
    "contract_version",
    "initial_image_path",
    "final_image_path",
    "created_at",
  ];
  if (requiredStrings.some((key) => typeof raw[key] !== "string")) {
    throw new AnalysisServiceError("invalid_response", "El informe recibido está incompleto.");
  }
  try {
    return {
      ...(raw as Omit<AnalysisReportRecord, "result">),
      result: parseGeminiAnalysisReport(raw.result),
    };
  } catch {
    throw new AnalysisServiceError("invalid_response", "El informe recibido no es válido.");
  }
}

export async function fetchCurrentAnalysisReport(params: {
  comparisonId: string;
  initialImagePath: string;
  finalImagePath: string;
}): Promise<AnalysisReportRecord | null> {
  const { data, error } = await supabase
    .from("ai_analysis_reports")
    .select("*")
    .eq("comparison_id", params.comparisonId)
    .eq("initial_image_path", params.initialImagePath)
    .eq("final_image_path", params.finalImagePath)
    .maybeSingle();
  if (error) {
    if (isAnalysisReportsUnavailableError(error)) {
      throw new AnalysisServiceError(
        "reports_unavailable",
        "El servicio de informes todavía no está disponible.",
      );
    }
    throw error;
  }
  return data ? parseRecord(data) : null;
}

export async function requestComparisonAnalysis(
  comparisonId: string,
): Promise<AnalysisReportRecord> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) {
    throw new AnalysisServiceError("unauthorized", "Tu sesión ya no está disponible.");
  }

  const { data, error } = await supabase.functions.invoke("analyze-comparison", {
    body: { comparisonId },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {
    let code: string | undefined;
    let status: number | undefined;
    let serverMessage: string | undefined;
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      status = context.status;
      try {
        const bodyText = await context.clone().text();
        console.error("[analysisService] Error devuelto por Edge Function:", {
          status,
          bodyText,
        });
        const body = JSON.parse(bodyText);
        code = body?.code;
        serverMessage = body?.error || body?.message;
      } catch {
        code = undefined;
      }
    } else if (typeof context === "object" && context !== null) {
      const obj = context as Record<string, unknown>;
      code = typeof obj.code === "string" ? obj.code : undefined;
      status = typeof obj.status === "number" ? obj.status : undefined;
      serverMessage =
        typeof obj.error === "string"
          ? obj.error
          : typeof obj.message === "string"
            ? obj.message
            : undefined;
      console.error("[analysisService] Error devuelto por Edge Function:", {
        status,
        code,
        obj,
      });
    }

    if (
      code === "usage_limit_reached" ||
      code === "provider_quota_exceeded" ||
      status === 429
    ) {
      throw new AnalysisServiceError(
        "usage_limit_reached",
        "Se alcanzó el límite de análisis disponible.",
      );
    }
    if (code === "analysis_in_progress" || status === 409) {
      throw new AnalysisServiceError(
        "analysis_in_progress",
        "Este análisis ya se está procesando.",
      );
    }
    if (code === "unauthorized" || status === 401) {
      throw new AnalysisServiceError(
        "unauthorized",
        "Tu sesión ya no está disponible.",
      );
    }
    if (code === "usage_limits_unavailable" || status === 503) {
      throw new AnalysisServiceError(
        "reports_unavailable",
        "El servicio de análisis no está disponible en este momento.",
      );
    }
    if (code === "gemini_not_configured") {
      throw new AnalysisServiceError(
        "reports_unavailable",
        serverMessage ||
          "La clave GEMINI_API_KEY no es válida o no está configurada en Supabase Secrets.",
      );
    }
    throw new AnalysisServiceError("retryable", "No fue posible completar el análisis.");
  }

  return parseRecord(data);
}
