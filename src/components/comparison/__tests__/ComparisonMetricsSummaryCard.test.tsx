import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  impactAsync: vi.fn(() => Promise.resolve()),
}));

import * as Haptics from "expo-haptics";
import {
  ComparisonMetricsSummaryCard,
  getSimilarityAccent,
  triggerMetricFeedback,
} from "../ComparisonMetricsSummaryCard";

describe("ComparisonMetricsSummaryCard", () => {
  const defaultProps = {
    similarityScore: 87,
    totalDifferences: 3,
    confidenceScore: 0.94,
    processingTimeMs: 1250,
  };

  it("renders the four primary analysis metrics", () => {
    const html = renderToStaticMarkup(
      React.createElement(ComparisonMetricsSummaryCard, defaultProps),
    );

    expect(html).toContain("Resumen de métricas");
    expect(html).toContain("87%");
    expect(html).toContain("3");
    expect(html).toContain("94%");
    expect(html).toContain("1.3 s");
    expect(html).toContain('data-testid="comparison-metrics-summary-card-similarity"');
    expect(html).toContain('aria-label="Similitud: 87%"');
  });

  it("selects green, yellow, and red accents by similarity score", () => {
    expect(getSimilarityAccent(90).label).toBe("Alta similitud");
    expect(getSimilarityAccent(90).color).toBe("#15803D");
    expect(getSimilarityAccent(65).label).toBe("Similitud moderada");
    expect(getSimilarityAccent(65).color).toBe("#D97706");
    expect(getSimilarityAccent(30).label).toBe("Baja similitud");
    expect(getSimilarityAccent(30).color).toBe("#DC2626");
  });

  it("triggers light haptic feedback when a metric is pressed", async () => {
    await triggerMetricFeedback();

    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light,
    );
  });

  it("exposes accessible controls for every expandable metric", () => {
    const html = renderToStaticMarkup(
      React.createElement(ComparisonMetricsSummaryCard, defaultProps),
    );

    expect(html.match(/aria-label="/g) ?? []).toHaveLength(5);
    expect(html.match(/role="button"/g) ?? []).toHaveLength(4);
    expect(html).toContain('aria-label="Diferencias: 3"');
    expect(html).toContain('aria-label="Procesamiento: 1.3 s"');
  });
});
