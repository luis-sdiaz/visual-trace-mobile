import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", async () => {
  const actual = await vi.importActual<typeof import("react-native")>("react-native");
  return {
    ...actual,
    Modal: ({
      visible,
      children,
      testID,
    }: {
      visible?: boolean;
      children?: React.ReactNode;
      testID?: string;
    }) => (visible ? React.createElement("div", { "data-testid": testID }, children) : null),
  };
});

import { GEMINI_ANALYSIS_CONTRACT_VERSION } from "@/contracts/geminiAnalysis";
import type { ExportReportData } from "@/contracts/reportExport";
import { ReportPreviewModal } from "./ReportPreviewModal";

const mockReportData: ExportReportData = {
  metadata: {
    comparisonId: "comp-123",
    comparisonName: "Grieta en Fachada Principal",
    createdAt: "2026-10-26T14:00:00Z",
  },
  images: {
    initialImageUri: "file:///initial.jpg",
    finalImageUri: "file:///final.jpg",
  },
  report: {
    contractVersion: GEMINI_ANALYSIS_CONTRACT_VERSION,
    hasVisibleChanges: true,
    summary: "Se observó cambio en la estructura de la grieta.",
    differences: [
      {
        category: "modified",
        description: "Aumento de longitud de 5 cm.",
      },
    ],
    observations: [],
    uncertainties: [],
  },
};

describe("ReportPreviewModal", () => {
  it("returns null when reportData is null", () => {
    const html = renderToStaticMarkup(
      <ReportPreviewModal
        isGenerating={false}
        onClose={vi.fn()}
        onSharePdf={vi.fn()}
        reportData={null}
        visible={true}
      />,
    );

    expect(html).toBe("");
  });

  it("does not render when visible is false", () => {
    const html = renderToStaticMarkup(
      <ReportPreviewModal
        isGenerating={false}
        onClose={vi.fn()}
        onSharePdf={vi.fn()}
        reportData={mockReportData}
        visible={false}
      />,
    );

    expect(html).not.toContain("report-preview-modal");
  });

  it("renders preview with comparison title, severity, summary, and action buttons", () => {
    const html = renderToStaticMarkup(
      <ReportPreviewModal
        isGenerating={false}
        onClose={vi.fn()}
        onSharePdf={vi.fn()}
        reportData={mockReportData}
        visible={true}
      />,
    );

    expect(html).toContain("report-preview-modal");
    expect(html).toContain("Vista previa del informe");
    expect(html).toContain("Grieta en Fachada Principal");
    expect(html).toContain("preview-severity-badge");
    expect(html).toContain("Se observó cambio en la estructura de la grieta.");
    expect(html).toContain("1 hallazgo identificado");
    expect(html).toContain("preview-images-container");
    expect(html).toContain("Estado Inicial");
    expect(html).toContain("Estado Final");
    expect(html).toContain("preview-close-button");
    expect(html).toContain("preview-cancel-button");
    expect(html).toContain("preview-share-pdf-button");
    expect(html).toContain("↗ Compartir PDF");
  });

  it("renders loading state with spinner and text when isGenerating is true", () => {
    const html = renderToStaticMarkup(
      <ReportPreviewModal
        isGenerating={true}
        onClose={vi.fn()}
        onSharePdf={vi.fn()}
        reportData={mockReportData}
        visible={true}
      />,
    );

    expect(html).toContain("Generando...");
    expect(html).not.toContain("↗ Compartir PDF");
  });

  it("invokes callbacks when buttons are triggered", () => {
    let closed = false;
    let shared = false;

    const element = (
      <ReportPreviewModal
        isGenerating={false}
        onClose={() => {
          closed = true;
        }}
        onSharePdf={() => {
          shared = true;
        }}
        reportData={mockReportData}
        visible={true}
      />
    );

    element.props.onClose();
    expect(closed).toBe(true);

    element.props.onSharePdf();
    expect(shared).toBe(true);
  });
});

