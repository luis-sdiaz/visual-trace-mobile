import type { AnalysisReportRecord } from "@/services/analysisService";
import {
  fetchCurrentAnalysisReport,
  requestComparisonAnalysis,
} from "@/services/analysisService";

export type AnalysisStatus =
  | "loading_report"
  | "ready"
  | "reports_unavailable"
  | "report_error"
  | "analyzing"
  | "available"
  | "analysis_error"
  | "limited";

export type AnalysisAction = "retry_report" | "analyze";

export function getAnalysisAction(
  status: AnalysisStatus,
  hasRequiredData: boolean,
): AnalysisAction | null {
  if (!hasRequiredData) return null;
  if (status === "report_error" || status === "reports_unavailable") {
    return "retry_report";
  }
  if (status === "ready" || status === "analysis_error") return "analyze";
  return null;
}

export function getAnalysisPresentation(
  status: AnalysisStatus,
  hasRequiredData: boolean,
) {
  const action = getAnalysisAction(status, hasRequiredData);
  return {
    action,
    actionLabel:
      action === "analyze"
        ? status === "analysis_error"
          ? "Reintentar análisis"
          : "Analizar cambios"
        : action === "retry_report"
          ? status === "reports_unavailable"
            ? "Comprobar disponibilidad"
            : "Volver a consultar informe"
          : null,
    statusTitle:
      status === "analyzing"
        ? "Analizando imágenes"
        : status === "available"
          ? "Informe disponible"
          : status === "limited"
            ? "Límite alcanzado"
            : "Fotografías listas",
    statusDescription:
      status === "analyzing"
        ? "Gemini está comparando únicamente los cambios visibles."
        : status === "available"
          ? "El informe corresponde a estas versiones de las fotografías."
          : status === "limited"
            ? "Se ha alcanzado la cuota de análisis disponible para este período."
            : "Los dos estados están preparados para el análisis visual.",
  };
}

type AnalysisActionParams = {
  comparisonId: string;
  initialImagePath: string;
  finalImagePath: string;
};

type AnalysisActionDependencies = {
  fetchReport: typeof fetchCurrentAnalysisReport;
  requestAnalysis: typeof requestComparisonAnalysis;
};

const defaultDependencies: AnalysisActionDependencies = {
  fetchReport: fetchCurrentAnalysisReport,
  requestAnalysis: requestComparisonAnalysis,
};

export function performAnalysisAction(
  action: AnalysisAction,
  params: AnalysisActionParams,
  dependencies: AnalysisActionDependencies = defaultDependencies,
): Promise<AnalysisReportRecord | null> {
  if (action === "retry_report") {
    return dependencies.fetchReport(params);
  }
  return dependencies.requestAnalysis(params.comparisonId);
}
