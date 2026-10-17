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
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        code = (await context.clone().json() as { code?: string }).code;
      } catch {
        code = undefined;
      }
    }
    if (code === "usage_limit_reached") {
      throw new AnalysisServiceError(code, "Se alcanzó el límite de análisis disponible.");
    }
    if (code === "analysis_in_progress") {
      throw new AnalysisServiceError(code, "Este análisis ya se está procesando.");
    }
    throw new AnalysisServiceError("retryable", "No fue posible completar el análisis.");
  }

  return parseRecord(data);
}
