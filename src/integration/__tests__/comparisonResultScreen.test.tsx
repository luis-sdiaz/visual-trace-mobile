import React, { type ReactElement, type ReactNode } from "react";
import { StyleSheet, type StyleProp, type TextStyle } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hookState = vi.hoisted(() => ({
  analysisInitial: "ready",
  cursor: 0,
  values: [] as unknown[],
}));
const routerMock = vi.hoisted(() => ({
  back: vi.fn(),
  dismissTo: vi.fn(),
  replace: vi.fn(),
}));
const comparisonMock = vi.hoisted(() => ({
  comparisonId: "comparison-1" as string | null,
  name: "Sala principal",
  initialImageUri: "https://example.com/initial.jpg" as string | null,
  initialImagePath: "user/comparison/initial.jpg" as string | null,
  finalImageUri: "https://example.com/final.jpg" as string | null,
  finalImagePath: "user/comparison/final.jpg" as string | null,
  restoreComparison: vi.fn(),
  setName: vi.fn((name: string) => {
    comparisonMock.name = name;
  }),
}));
const performAnalysisActionMock = vi.hoisted(() => vi.fn());
const updateComparisonNameMock = vi.hoisted(() => vi.fn());
const shareReportNativeMock = vi.hoisted(() => vi.fn());
const sharePdfReportMock = vi.hoisted(() => vi.fn());

vi.mock("react", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    useCallback: (callback: unknown) => callback,
    useEffect: () => undefined,
    useMemo: (factory: () => unknown) => factory(),
    useRef: (initialValue: unknown) => ({ current: initialValue }),
    useState: (initialValue: unknown) => {
      const index = hookState.cursor++;
      if (hookState.values.length <= index) {
        const resolvedInitial =
          typeof initialValue === "function" ? initialValue() : initialValue;
        hookState.values[index] =
          resolvedInitial === "loading_report"
            ? hookState.analysisInitial
            : resolvedInitial;
      }

      const setValue = (
        nextValue: unknown | ((previous: unknown) => unknown),
      ) => {
        const previous = hookState.values[index];
        hookState.values[index] =
          typeof nextValue === "function"
            ? nextValue(previous)
            : nextValue;
      };

      return [hookState.values[index], setValue] as const;
    },
  };
});
vi.mock("expo-router", () => ({
  router: routerMock,
  Stack: { Screen: "stack-screen" },
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => ({}),
}));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "safe-area-view",
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: {
      getResource: () => ({}),
      language: "es",
    },
    t: (key: string) =>
      ({
        "analysis.analyzeChanges": "Analizar cambios",
        "analysis.analyzing": "Analizando cambios",
        "analysis.analyzingDescription": "Procesando las fotografías.",
        "analysis.photosReady": "Fotografías listas",
        "analysis.photosReadyDescription":
          "Los dos estados están preparados para el análisis visual.",
        "result.after": "Después",
        "result.analysisInProgress": "Análisis de IA en curso",
        "result.back": "Volver",
        "result.before": "Antes",
        "result.cancel": "Cancelar",
        "result.description": "Revisa las fotografías antes de analizarlas.",
        "result.disclaimer": "La revisión final corresponde al usuario.",
        "result.edit": "Editar",
        "result.editName": "Editar nombre",
        "result.eyebrow": "COMPARACIÓN",
        "result.final": "Final",
        "result.finalPhoto": "Fotografía final",
        "result.incomplete": "Comparación incompleta",
        "result.incompleteDescription": "Necesitamos ambas fotografías.",
        "result.initial": "Inicial",
        "result.initialPhoto": "Fotografía inicial",
        "result.newName": "Nuevo nombre",
        "result.save": "Guardar",
        "result.shareAction": "Compartir",
        "result.exportAction": "Exportar",
        "result.shareHint": "Compartir el informe",
        "result.humanReview": "Verifica los hallazgos mediante revisión humana.",
        "analysis.summaryTitle": "Resumen de la comparación",
      })[key] ?? key,
  }),
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));
vi.mock("@/context/ComparisonContext", () => ({
  useComparison: () => comparisonMock,
}));
vi.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    colors: new Proxy(
      {},
      { get: (_target, property) => `color-${String(property)}` },
    ),
  }),
}));

vi.mock("@/components/ui/Button", () => ({ Button: "app-button" }));
vi.mock("@/components/ui/AiAnalysisLoadingSkeleton", () => ({
  AiAnalysisLoadingSkeleton: "ai-analysis-loading-skeleton",
}));
vi.mock("@/components/ui/AiAnalysisSummaryCard", () => ({
  AiAnalysisSummaryCard: "ai-analysis-summary-card",
}));
vi.mock("@/components/ui/AiOfflineResilienceBanner", () => ({
  AiOfflineResilienceBanner: "ai-offline-resilience-banner",
}));
vi.mock("@/components/ui/AiAnalysisErrorFallbackCard", () => ({
  AiAnalysisErrorFallbackCard: "ai-analysis-error-fallback-card",
}));
vi.mock("@/components/ui/AiDifferencesCollapsible", () => ({
  AiDifferencesCollapsible: "ai-differences-collapsible",
}));
vi.mock("@/components/ui/AiQuotaAlertBanner", () => ({
  AiQuotaAlertBanner: "ai-quota-alert-banner",
}));
vi.mock("@/components/ui/AiQuotaLimitExceededModal", () => ({
  AiQuotaLimitExceededModal: "ai-quota-limit-exceeded-modal",
}));
vi.mock("@/components/ui/AiReanalyzeConfirmationModal", () => ({
  AiReanalyzeConfirmationModal: "ai-reanalyze-confirmation-modal",
}));
vi.mock("@/components/ui/AiReportFeedbackCard", () => ({
  AiReportFeedbackCard: "ai-report-feedback-card",
}));
vi.mock("@/components/ui/ExportReportButton", () => ({
  ExportReportButton: "export-report-button",
}));
vi.mock("@/components/ui/PhotoPreviewModal", () => ({
  PhotoPreviewModal: "photo-preview-modal",
}));
vi.mock("@/components/ui/ReportPreviewModal", () => ({
  ReportPreviewModal: "report-preview-modal",
}));
vi.mock("@/services/analysisService", () => ({
  AnalysisServiceError: class AnalysisServiceError extends Error {},
}));
vi.mock("@/services/analysisWorkflow", () => ({
  getAnalysisPresentation: (status: string, hasRequiredData: boolean) => ({
    action: hasRequiredData && status === "ready" ? "analyze" : null,
    actionLabel:
      hasRequiredData && status === "ready"
        ? "analysis.analyzeChanges"
        : null,
    statusDescription:
      status === "analyzing"
        ? "analysis.analyzingDescription"
        : "analysis.photosReadyDescription",
    statusTitle:
      status === "analyzing"
        ? "analysis.analyzing"
        : "analysis.photosReady",
  }),
  isNetworkError: () => false,
  performAnalysisAction: performAnalysisActionMock,
}));
vi.mock("@/services/comparisonRecoveryService", () => ({
  recoverComparison: vi.fn(),
}));
vi.mock("@/services/comparisonService", () => ({
  MAX_COMPARISON_NAME_LENGTH: 80,
  updateComparisonName: updateComparisonNameMock,
}));
vi.mock("@/services/reportExportService", () => ({
  sharePdfReport: sharePdfReportMock,
}));
vi.mock("@/utils/reportExport", () => ({
  shareReportNative: shareReportNativeMock,
}));
vi.mock("@/utils/singleFlight", () => ({
  createSingleFlight: () => ({
    clear: vi.fn(),
    run: (operation: () => unknown) => operation(),
  }),
}));
vi.mock("@/utils/localizeAiReport", () => ({
  localizeAiReportList: (value: unknown) => value,
  localizeAiReportText: (value: unknown) => value,
}));

import ComparisonResultScreen from "@/app/comparison-result";

const analysisReportMock = {
  id: "report-1",
  comparison_id: "comparison-1",
  created_at: "2026-11-10T12:00:00.000Z",
  result: {
    hasVisibleChanges: false,
    summary: "Sin cambios relevantes.",
    differences: [],
    observations: [],
    uncertainties: [],
  },
};

type ElementProps = Record<string, unknown> & { children?: ReactNode };

function renderScreenTree() {
  hookState.cursor = 0;
  return ComparisonResultScreen();
}

function renderReportTree() {
  renderScreenTree();
  hookState.values[6] = analysisReportMock;
  return renderScreenTree();
}

function findElement(
  node: ReactNode,
  predicate: (element: ReactElement<ElementProps>) => boolean,
): ReactElement<ElementProps> {
  if (React.isValidElement<ElementProps>(node)) {
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props.children)) {
      try {
        return findElement(child, predicate);
      } catch {
        // Continue with the next sibling.
      }
    }
  }
  throw new Error("Element not found");
}

function findByTestId(tree: ReactNode, testID: string) {
  return findElement(tree, (element) => element.props.testID === testID);
}

function findByLabel(tree: ReactNode, label: string) {
  return findElement(
    tree,
    (element) => element.props.accessibilityLabel === label,
  );
}

function findButton(tree: ReactNode, label: string) {
  return findElement(tree, (element) => element.props.label === label);
}

function findTextElement(tree: ReactNode, text: string) {
  return findElement(
    tree,
    (element) =>
      React.Children.count(element.props.children) === 1 &&
      React.Children.toArray(element.props.children)[0] === text,
  );
}

function callElementProp(
  element: ReactElement<ElementProps>,
  propName: string,
  ...args: unknown[]
) {
  const callback = element.props[propName];
  expect(callback).toBeTypeOf("function");
  return (callback as (...callbackArgs: unknown[]) => unknown)(...args);
}

function collectText(node: ReactNode): string[] {
  if (typeof node === "string") return [node];
  if (!React.isValidElement<ElementProps>(node)) return [];
  return React.Children.toArray(node.props.children).flatMap(collectText);
}

describe("ComparisonResultScreen review flow", () => {
  beforeEach(() => {
    hookState.analysisInitial = "ready";
    hookState.cursor = 0;
    hookState.values = [];
    comparisonMock.comparisonId = "comparison-1";
    comparisonMock.name = "Sala principal";
    comparisonMock.initialImageUri = "https://example.com/initial.jpg";
    comparisonMock.initialImagePath = "user/comparison/initial.jpg";
    comparisonMock.finalImageUri = "https://example.com/final.jpg";
    comparisonMock.finalImagePath = "user/comparison/final.jpg";
    comparisonMock.restoreComparison.mockReset();
    comparisonMock.setName.mockClear();
    routerMock.back.mockReset();
    routerMock.dismissTo.mockReset();
    routerMock.replace.mockReset();
    performAnalysisActionMock.mockReset();
    updateComparisonNameMock.mockReset();
    updateComparisonNameMock.mockResolvedValue(undefined);
    shareReportNativeMock.mockReset();
    shareReportNativeMock.mockResolvedValue({
      action: "sharedAction",
      success: true,
    });
    sharePdfReportMock.mockReset();
    sharePdfReportMock.mockResolvedValue({
      cancelled: false,
      success: true,
    });
  });

  it("renders every review label completely with local minimum widths", () => {
    const tree = renderScreenTree();
    expect(collectText(tree)).toEqual(
      expect.arrayContaining([
        "Volver",
        "COMPARACIÓN",
        "Editar",
        "Inicial",
        "Antes",
        "Final",
        "Después",
        "Fotografías listas",
      ]),
    );
    expect(findButton(tree, "Analizar cambios").props.disabled).toBe(false);

    const expectedWidths = new Map([
      ["Volver", 52],
      ["Editar", 48],
      ["Inicial", 56],
      ["Antes", 52],
      ["Final", 44],
      ["Después", 64],
    ]);
    for (const [label, minWidth] of expectedWidths) {
      const style = StyleSheet.flatten(
        findTextElement(tree, label).props.style as StyleProp<TextStyle>,
      );
      expect(style?.minWidth).toBe(minWidth);
    }
  });

  it("navigates back without changing the comparison data", () => {
    callElementProp(
      findByTestId(renderScreenTree(), "comparison-back-button"),
      "onPress",
    );
    expect(routerMock.back).toHaveBeenCalledTimes(1);
    expect(comparisonMock.setName).not.toHaveBeenCalled();
    expect(comparisonMock.restoreComparison).not.toHaveBeenCalled();
  });

  it("cancels name editing without persisting the draft", () => {
    let tree = renderScreenTree();
    callElementProp(
      findByTestId(tree, "comparison-edit-name-button"),
      "onPress",
    );
    tree = renderScreenTree();
    expect(collectText(tree)).toContain("Cancelar");
    expect(collectText(tree)).toContain("Guardar");
    callElementProp(findByLabel(tree, "Nuevo nombre"), "onChangeText", "Otro");
    callElementProp(
      findByTestId(tree, "comparison-rename-cancel-button"),
      "onPress",
    );

    expect(collectText(renderScreenTree())).toContain("Sala principal");
    expect(updateComparisonNameMock).not.toHaveBeenCalled();
    expect(comparisonMock.setName).not.toHaveBeenCalled();
  });

  it("saves a valid edited name and updates the visible title", async () => {
    let tree = renderScreenTree();
    callElementProp(
      findByTestId(tree, "comparison-edit-name-button"),
      "onPress",
    );
    tree = renderScreenTree();
    callElementProp(
      findByLabel(tree, "Nuevo nombre"),
      "onChangeText",
      "  Sala renovada  ",
    );
    tree = renderScreenTree();
    callElementProp(
      findByTestId(tree, "comparison-rename-save-button"),
      "onPress",
    );

    await vi.waitFor(() => {
      expect(updateComparisonNameMock).toHaveBeenCalledWith(
        "comparison-1",
        "Sala renovada",
      );
    });
    expect(comparisonMock.setName).toHaveBeenCalledWith("Sala renovada");
    expect(collectText(renderScreenTree())).toContain("Sala renovada");
  });

  it("keeps initial and final image URIs associated with their previews", () => {
    let tree = renderScreenTree();
    const initialImage = findByLabel(tree, "Fotografía inicial");
    const finalImage = findByLabel(tree, "Fotografía final");
    expect(initialImage.props.uri).toBe("https://example.com/initial.jpg");
    expect(finalImage.props.uri).toBe("https://example.com/final.jpg");

    callElementProp(initialImage, "onOpen");
    tree = renderScreenTree();
    const initialPreview = findElement(
      tree,
      (element) =>
        element.props.visible === true &&
        element.props.uri === "https://example.com/initial.jpg",
    );
    expect(initialPreview.props.label).toBe("Estado inicial");

    callElementProp(initialPreview, "onClose");
    tree = renderScreenTree();
    callElementProp(findByLabel(tree, "Fotografía final"), "onOpen");
    tree = renderScreenTree();
    expect(
      findElement(
        tree,
        (element) =>
          element.props.visible === true &&
          element.props.uri === "https://example.com/final.jpg",
      ).props.label,
    ).toBe("Estado final");
  });

  it("does not show a ready review or analysis action when a stored path is missing", () => {
    comparisonMock.finalImagePath = null;
    const tree = renderScreenTree();

    expect(collectText(tree)).toContain("Comparación incompleta");
    expect(() => findButton(tree, "Analizar cambios")).toThrow(
      "Element not found",
    );
  });

  it("prevents duplicate analysis requests and exposes the loading state", async () => {
    let resolveAnalysis: (value: null) => void = () => undefined;
    performAnalysisActionMock.mockReturnValue(
      new Promise<null>((resolve) => {
        resolveAnalysis = resolve;
      }),
    );
    const action = findButton(renderScreenTree(), "Analizar cambios");

    callElementProp(action, "onPress");
    callElementProp(action, "onPress");

    await vi.waitFor(() => {
      expect(performAnalysisActionMock).toHaveBeenCalledTimes(1);
    });
    const loadingTree = renderScreenTree();
    expect(
      findByLabel(loadingTree, "Análisis de IA en curso").props.visible,
    ).toBe(true);
    expect(collectText(loadingTree)).toContain("Analizando cambios");

    resolveAnalysis(null);
  });

  it("keeps the existing error presentation when analysis fails", async () => {
    performAnalysisActionMock.mockRejectedValue(new Error("Fallo controlado"));
    callElementProp(
      findButton(renderScreenTree(), "Analizar cambios"),
      "onPress",
    );

    await vi.waitFor(() => {
      expect(
        findElement(
          renderScreenTree(),
          (element) => element.props.errorMessage === "Fallo controlado",
        ),
      ).toBeTruthy();
    });
  });

  it("renders only balanced Share and Export actions above the report", () => {
    const tree = renderReportTree();
    expect(() => findByTestId(tree, "copy-report-button")).toThrow(
      "Element not found",
    );
    expect(() => findByTestId(tree, "copied-feedback-badge")).toThrow(
      "Element not found",
    );

    const share = findByTestId(tree, "share-report-button");
    const exportButton = findByTestId(tree, "export-pdf-report-button");
    const actionOrder = React.Children.toArray(
      findByTestId(tree, "report-header-actions").props.children,
    ).map((child) =>
      React.isValidElement<ElementProps>(child) ? child.props.testID : null,
    );
    expect(actionOrder).toEqual([
      "share-report-button",
      "export-pdf-report-button",
    ]);
    expect(collectText(share)).toContain("Compartir");
    expect(exportButton.props.label).toBe("📄 Exportar");

    const shareStyle = StyleSheet.flatten(
      share.props.style as StyleProp<TextStyle>,
    );
    const exportStyle = StyleSheet.flatten(
      exportButton.props.style as StyleProp<TextStyle>,
    );
    expect(shareStyle).toMatchObject({ flex: 1, minHeight: 44, minWidth: 0 });
    expect(exportStyle).toMatchObject({ flex: 1, minHeight: 44, minWidth: 0 });
  });

  it("keeps Share and Export connected to their original callbacks", async () => {
    let tree = renderReportTree();
    callElementProp(findByTestId(tree, "share-report-button"), "onPress");
    await vi.waitFor(() => {
      expect(shareReportNativeMock).toHaveBeenCalledWith(
        analysisReportMock.result,
        { comparisonName: "Sala principal" },
      );
    });

    callElementProp(
      findByTestId(tree, "export-pdf-report-button"),
      "onPress",
    );
    tree = renderReportTree();
    const preview = findElement(
      tree,
      (element) =>
        element.props.visible === true && element.props.reportData !== null,
    );
    callElementProp(preview, "onSharePdf");

    await vi.waitFor(() => {
      expect(sharePdfReportMock).toHaveBeenCalledWith(
        expect.objectContaining({ report: analysisReportMock.result }),
        { filename: "Sala principal" },
      );
    });
  });

  it("preserves the report summary, differences and human-review sections", () => {
    const tree = renderReportTree();
    expect(
      findElement(
        tree,
        (element) => String(element.type) === "ai-analysis-summary-card",
      ).props.report,
    ).toBe(analysisReportMock);
    expect(
      findElement(
        tree,
        (element) => String(element.type) === "ai-differences-collapsible",
      ).props.differences,
    ).toEqual([]);
    expect(collectText(tree)).toEqual(
      expect.arrayContaining([
        "Resumen de la comparación",
        "Sin cambios relevantes.",
        "Verifica los hallazgos mediante revisión humana.",
      ]),
    );
  });
});
