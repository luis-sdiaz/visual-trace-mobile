import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AiAnalysisLoadingSkeleton,
  DEFAULT_AI_LOADING_STAGES,
  type LoadingStage,
} from "../AiAnalysisLoadingSkeleton";

describe("AiAnalysisLoadingSkeleton Component", () => {
  it("renders with default stage 1 and accessibility attributes", () => {
    const html = renderToStaticMarkup(
      React.createElement(AiAnalysisLoadingSkeleton, {}),
    );

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('data-testid="ai-analysis-loading-skeleton"');
    expect(html).toContain("Preparando imágenes y sesión...");
    expect(html).toContain("Etapa 1 de 4");
    expect(html).toContain('data-testid="ai-loading-spinner"');
    expect(html).toContain('data-testid="ai-loading-skeleton-preview"');
  });

  it("renders with controlled stage index and updates step counter", () => {
    const html = renderToStaticMarkup(
      React.createElement(AiAnalysisLoadingSkeleton, { currentStageIndex: 2 }),
    );

    expect(html).toContain("Invocando Gemini AI...");
    expect(html).toContain("Etapa 3 de 4");
    expect(html).toContain('data-testid="ai-loading-stage-title"');
    expect(html).toContain('data-testid="ai-loading-stage-description"');
  });

  it("renders custom stages correctly", () => {
    const customStages: LoadingStage[] = [
      {
        title: "Sincronizando estado...",
        description: "Enviando bytes al almacenamiento seguro.",
      },
      {
        title: "Calculando diferencias...",
        description: "Comparando pixeles de ambas fotografías.",
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(AiAnalysisLoadingSkeleton, {
        stages: customStages,
        currentStageIndex: 1,
      }),
    );

    expect(html).toContain("Calculando diferencias...");
    expect(html).toContain("Etapa 2 de 2");
  });

  it("ensures all 4 default stages have title and description", () => {
    expect(DEFAULT_AI_LOADING_STAGES).toHaveLength(4);
    DEFAULT_AI_LOADING_STAGES.forEach((stage) => {
      expect(stage.title).toBeTruthy();
      expect(stage.description).toBeTruthy();
    });
  });
});

