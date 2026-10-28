import {
  GEMINI_ANALYSIS_CONTRACT_VERSION,
  type GeminiAnalysisReport,
} from "@/contracts/geminiAnalysis";
import {
  getDemoState,
  recordMockServed,
  type DemoMockScenario,
} from "@/config/demoConfig";
import type { AnalysisReportRecord } from "@/services/analysisService";

export const MOCK_REPORTS_BY_SCENARIO: Record<
  DemoMockScenario,
  GeminiAnalysisReport
> = {
  changes_detected: {
    contractVersion: GEMINI_ANALYSIS_CONTRACT_VERSION,
    hasVisibleChanges: true,
    summary:
      "Se identificaron alteraciones constructivas y de acabado significativas entre el estado inicial y el final.",
    differences: [
      {
        category: "added",
        description:
          "Instalación de nueva canaleta de drenaje pluvial metálica en el sector inferior.",
      },
      {
        category: "modified",
        description:
          "La fisura en el paramento vertical presenta una propagación visible hacia la base.",
      },
      {
        category: "appearance",
        description:
          "Presencia de eflorescencia y manchas de humedad en el sector central.",
      },
    ],
    observations: [
      "Ambas capturas mantienen una perspectiva y distancia concordante para inspección.",
      "Las condiciones de iluminación permiten contraste adecuado en las áreas evaluadas.",
    ],
    uncertainties: [
      "La profundidad exacta de la fisura requiere verificación manual in situ mediante fisurómetro.",
    ],
  },
  no_changes: {
    contractVersion: GEMINI_ANALYSIS_CONTRACT_VERSION,
    hasVisibleChanges: false,
    summary:
      "No se observan variaciones visuales apreciables entre ambas fotografías.",
    differences: [],
    observations: [
      "La alineación, colorimetría y elementos fijos se mantienen estables y sin deterioro visible.",
    ],
    uncertainties: [],
  },
  structural_defect: {
    contractVersion: GEMINI_ANALYSIS_CONTRACT_VERSION,
    hasVisibleChanges: true,
    summary:
      "ALERTA CRÍTICA: Se detecta desplazamiento estructural y fisuración diagonal en elemento portante.",
    differences: [
      {
        category: "modified",
        description:
          "Abertura diagonal a 45 grados con desprendimiento de revoque en viga principal.",
      },
      {
        category: "removed",
        description:
          "Pérdida de mortero de pega en la unión vertical de mampostería.",
      },
      {
        category: "moved",
        description:
          "Desalineación angular perceptible respecto a la vertical de plomada.",
      },
    ],
    observations: [
      "Patrón característico de esfuerzo por cortante o asentamiento diferencial.",
      "Se sugiere restringir cargas sobre el sector evaluado de forma preventiva.",
    ],
    uncertainties: [
      "Se requiere inspección de patología estructural con equipo de ultrasonido o esclerómetro.",
    ],
  },
  minor_cosmetic: {
    contractVersion: GEMINI_ANALYSIS_CONTRACT_VERSION,
    hasVisibleChanges: true,
    summary:
      "Se aprecian discrepancias cosméticas superficiales que no comprometen la estabilidad del elemento.",
    differences: [
      {
        category: "appearance",
        description:
          "Decoloración focalizada por exposición a radiación UV y lluvia.",
      },
      {
        category: "modified",
        description:
          "Rayadura superficial de 8 cm en la capa de acabado exterior.",
      },
    ],
    observations: [
      "La capa de soporte inferior permanece continua y sin desprendimientos.",
    ],
    uncertainties: [],
  },
};

export function generateMockAiAnalysisReport(params: {
  comparisonId: string;
  initialImagePath?: string;
  finalImagePath?: string;
  scenario?: DemoMockScenario;
}): AnalysisReportRecord {
  const scenario =
    params.scenario ?? getDemoState().selectedScenario ?? "changes_detected";
  const result = MOCK_REPORTS_BY_SCENARIO[scenario] ?? MOCK_REPORTS_BY_SCENARIO.changes_detected;

  return {
    id: `mock-report-${params.comparisonId}`,
    comparison_id: params.comparisonId,
    user_id: "demo-academic-user-000",
    model: "gemini-3.5-flash-academic-mock",
    contract_version: GEMINI_ANALYSIS_CONTRACT_VERSION,
    result: { ...result },
    initial_image_path:
      params.initialImagePath ?? `demo/${params.comparisonId}/initial.jpg`,
    final_image_path:
      params.finalImagePath ?? `demo/${params.comparisonId}/final.jpg`,
    created_at: new Date().toISOString(),
  };
}

export async function resolveMockReport(
  comparisonId: string,
  options: {
    initialImagePath?: string;
    finalImagePath?: string;
    scenario?: DemoMockScenario;
    latencyMs?: number;
  } = {},
): Promise<AnalysisReportRecord> {
  const demoState = getDemoState();
  const latency =
    options.latencyMs !== undefined ? options.latencyMs : demoState.mockLatencyMs;

  if (latency > 0) {
    await new Promise((resolve) => setTimeout(resolve, latency));
  }

  recordMockServed();

  return generateMockAiAnalysisReport({
    comparisonId,
    initialImagePath: options.initialImagePath,
    finalImagePath: options.finalImagePath,
    scenario: options.scenario ?? demoState.selectedScenario,
  });
}

