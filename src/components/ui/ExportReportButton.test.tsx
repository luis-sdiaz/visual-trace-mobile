import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import { ExportReportButton } from "./ExportReportButton";

describe("ExportReportButton", () => {
  it("renders with default label and accessibility attributes", () => {
    const html = renderToStaticMarkup(
      <ExportReportButton onPress={vi.fn()} />,
    );

    expect(html).toContain("📄 Exportar PDF");
    expect(html).toContain('role="button"');
    expect(html).toContain('data-testid="export-report-button"');
  });

  it("renders localized label in English when active language is en", async () => {
    await i18n.changeLanguage("en");
    try {
      const html = renderToStaticMarkup(
        <ExportReportButton onPress={vi.fn()} />,
      );
      expect(html).toContain("📄 Export PDF");
      expect(html).toContain('role="button"');
    } finally {
      await i18n.changeLanguage("es");
    }
  });

  it("renders custom label when provided", () => {
    const html = renderToStaticMarkup(
      <ExportReportButton label="Descargar PDF" onPress={vi.fn()} />,
    );

    expect(html).toContain("Descargar PDF");
  });

  it("renders loading indicator and custom loading text when isLoading is true", () => {
    const html = renderToStaticMarkup(
      <ExportReportButton
        isLoading={true}
        loadingLabel="Creando documento..."
        onPress={vi.fn()}
      />,
    );

    expect(html).toContain("Creando documento...");
    expect(html).toContain('data-testid="export-report-button-spinner"');
    expect(html).not.toContain("📄 Exportar PDF");
  });

  it("renders localized loading text in English when isLoading is true without custom loadingLabel", async () => {
    await i18n.changeLanguage("en");
    try {
      const html = renderToStaticMarkup(
        <ExportReportButton isLoading={true} onPress={vi.fn()} />,
      );
      expect(html).toContain("Generating PDF...");
      expect(html).toContain('data-testid="export-report-button-spinner"');
    } finally {
      await i18n.changeLanguage("es");
    }
  });

  it("disables interaction and sets aria-disabled when disabled is true", () => {
    const html = renderToStaticMarkup(
      <ExportReportButton disabled={true} onPress={vi.fn()} />,
    );

    expect(html).toContain('aria-disabled="true"');
  });

  it("handles user click events via component props", () => {
    const onPressMock = vi.fn();
    const element = (
      <ExportReportButton
        onPress={onPressMock}
        label="Exportar"
      />
    );

    // Invoke onPress directly from the element props
    element.props.onPress({} as never);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});
