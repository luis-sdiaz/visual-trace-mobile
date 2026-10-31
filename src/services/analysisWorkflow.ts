import {
  AnalysisServiceError,
  type AnalysisReportRecord,
  fetchCurrentAnalysisReport,
  requestComparisonAnalysis,
} from "@/services/analysisService";
import type { SupportedLanguage } from "@/i18n/types";

export type AnalysisStatus =
  | "loading_report"
  | "ready"
  | "reports_unavailable"
  | "report_error"
  | "analyzing"
  | "available"
  | "analysis_error"
  | "limited"
  | "network_offline";

export type AnalysisAction = "retry_report" | "analyze";

export class NetworkOfflineError extends Error {
  constructor(message = "No hay conexión a internet disponible.") {
    super(message);
    this.name = "NetworkOfflineError";
  }
}

export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof NetworkOfflineError) return true;
  if (error instanceof TypeError) return true;
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "string"
        ? error.toLowerCase()
        : "";
  return (
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("failed to fetch") ||
    message.includes("conexión") ||
    message.includes("internet") ||
    message.includes("econnrefused") ||
    message.includes("network request failed")
  );
}

export type NetworkChecker = () => boolean | Promise<boolean>;

export const defaultNetworkChecker: NetworkChecker = () => {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
};

export function getAnalysisAction(
  status: AnalysisStatus,
  hasRequiredData: boolean,
): AnalysisAction | null {
  if (!hasRequiredData) return null;
  if (status === "report_error" || status === "reports_unavailable") {
    return "retry_report";
  }
  if (
    status === "ready" ||
    status === "analysis_error" ||
    status === "network_offline"
  ) {
    return "analyze";
  }
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
          ? "analysis.retryAnalysis"
          : status === "network_offline"
            ? "analysis.retryConnection"
            : "analysis.analyzeChanges"
        : action === "retry_report"
          ? status === "reports_unavailable"
            ? "analysis.checkAvailability"
            : "analysis.retryReport"
          : null,
    statusTitle:
      status === "analyzing"
        ? "analysis.analyzing"
        : status === "available"
          ? "analysis.reportAvailable"
          : status === "limited"
            ? "analysis.limitReached"
            : status === "network_offline"
              ? "analysis.offline"
              : "analysis.photosReady",
    statusDescription:
      status === "analyzing"
        ? "analysis.analyzingDescription"
        : status === "available"
          ? "analysis.reportAvailableDescription"
          : status === "limited"
            ? "analysis.limitReachedDescription"
            : status === "network_offline"
              ? "analysis.offlineDescription"
              : "analysis.photosReadyDescription",
  };
}

type AnalysisActionParams = {
  comparisonId: string;
  initialImagePath: string;
  finalImagePath: string;
  language?: SupportedLanguage;
};

type AnalysisActionDependencies = {
  fetchReport: typeof fetchCurrentAnalysisReport;
  requestAnalysis: typeof requestComparisonAnalysis;
  checkOnline?: NetworkChecker;
};

const defaultDependencies: AnalysisActionDependencies = {
  fetchReport: fetchCurrentAnalysisReport,
  requestAnalysis: requestComparisonAnalysis,
};

export async function performAnalysisAction(
  action: AnalysisAction,
  params: AnalysisActionParams,
  dependencies: AnalysisActionDependencies = defaultDependencies,
): Promise<AnalysisReportRecord | null> {
  const isOnline = dependencies.checkOnline
    ? await dependencies.checkOnline()
    : defaultNetworkChecker();

  if (!isOnline) {
    throw new NetworkOfflineError(
      "Sin conexión a internet. Comprueba tu red antes de iniciar el análisis.",
    );
  }

  if (action === "retry_report") {
    return dependencies.fetchReport(params);
  }
  return dependencies.requestAnalysis(params.comparisonId, params.language ?? "es");
}
