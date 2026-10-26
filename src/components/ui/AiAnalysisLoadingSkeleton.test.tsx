import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AiAnalysisLoadingSkeleton,
  createAiLoadingScheduler,
  DEFAULT_AI_LOADING_STAGES,
  type LoadingStage,
} from "@/components/ui/AiAnalysisLoadingSkeleton";

describe("AiAnalysisLoadingSkeleton", () => {
  describe("initial rendering", () => {
    it("renders the initial default stage, counter and skeleton elements", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiAnalysisLoadingSkeleton),
      );

      // Initial stage 0 text
      expect(html).toContain("Preparando imágenes y sesión...");
      expect(html).toContain("Validando la integridad de las capturas del estado inicial y final.");

      // AI Badge & Step counter
      expect(html).toContain("ANÁLISIS DE IA");
      expect(html).toContain("Etapa 1 de 4");

      // Informative hint
      expect(html).toContain("El análisis visual detallado con Gemini Flash toma normalmente de 3 a 6 segundos.");
    });

    it("renders custom stages correctly", () => {
      const customStages: LoadingStage[] = [
        {
          title: "Paso Personalizado 1",
          description: "Descripción de prueba 1",
        },
        {
          title: "Paso Personalizado 2",
          description: "Descripción de prueba 2",
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(AiAnalysisLoadingSkeleton, { stages: customStages }),
      );

      expect(html).toContain("Paso Personalizado 1");
      expect(html).toContain("Descripción de prueba 1");
      expect(html).toContain("Etapa 1 de 2");
      expect(html).not.toContain("Paso Personalizado 2");
    });

    it("renders specific stage when currentStageIndex is controlled", () => {
      const htmlStage2 = renderToStaticMarkup(
        React.createElement(AiAnalysisLoadingSkeleton, { currentStageIndex: 2 }),
      );

      expect(htmlStage2).toContain("Invocando Gemini AI...");
      expect(htmlStage2).toContain("Detectando discrepancias físicas y anomalías visuales con IA.");
      expect(htmlStage2).toContain("Etapa 3 de 4");

      const htmlStage3 = renderToStaticMarkup(
        React.createElement(AiAnalysisLoadingSkeleton, { currentStageIndex: 3 }),
      );

      expect(htmlStage3).toContain("Estructurando reporte comparativo...");
      expect(htmlStage3).toContain("Etapa 4 de 4");
    });

    it("clamps out-of-bounds stage indices safely", () => {
      const htmlNegative = renderToStaticMarkup(
        React.createElement(AiAnalysisLoadingSkeleton, { currentStageIndex: -5 }),
      );
      expect(htmlNegative).toContain("Etapa 1 de 4");

      const htmlExcessive = renderToStaticMarkup(
        React.createElement(AiAnalysisLoadingSkeleton, { currentStageIndex: 99 }),
      );
      expect(htmlExcessive).toContain("Etapa 4 de 4");
      expect(htmlExcessive).toContain("Estructurando reporte comparativo...");
    });
  });

  describe("stage scheduler and fake timers", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("rotates through analysis stages using timers and halts at the last stage", () => {
      const onStageChange = vi.fn();
      const scheduler = createAiLoadingScheduler({
        stages: DEFAULT_AI_LOADING_STAGES,
        intervalMs: 1000,
        loop: false,
        onStageChange,
      });

      expect(scheduler.getCurrentIndex()).toBe(0);
      expect(scheduler.getCurrentStage().title).toBe("Preparando imágenes y sesión...");
      expect(scheduler.isRunning()).toBe(false);

      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);

      // Tick 1 -> Stage 1
      vi.advanceTimersByTime(1000);
      expect(scheduler.getCurrentIndex()).toBe(1);
      expect(scheduler.getCurrentStage().title).toBe("Conectando con Supabase...");
      expect(onStageChange).toHaveBeenLastCalledWith(1, DEFAULT_AI_LOADING_STAGES[1]);

      // Tick 2 -> Stage 2 ("Invocando Gemini...")
      vi.advanceTimersByTime(1000);
      expect(scheduler.getCurrentIndex()).toBe(2);
      expect(scheduler.getCurrentStage().title).toBe("Invocando Gemini AI...");
      expect(onStageChange).toHaveBeenLastCalledWith(2, DEFAULT_AI_LOADING_STAGES[2]);

      // Tick 3 -> Stage 3 (Final stage)
      vi.advanceTimersByTime(1000);
      expect(scheduler.getCurrentIndex()).toBe(3);
      expect(scheduler.getCurrentStage().title).toBe("Estructurando reporte comparativo...");
      expect(onStageChange).toHaveBeenLastCalledWith(3, DEFAULT_AI_LOADING_STAGES[3]);

      // Tick 4 -> Non-looping stays at final stage
      vi.advanceTimersByTime(1000);
      expect(scheduler.getCurrentIndex()).toBe(3);
      expect(scheduler.isRunning()).toBe(false);

      scheduler.stop();
    });

    it("loops back to initial stage when loop is enabled", () => {
      const customStages: LoadingStage[] = [
        { title: "Fase A", description: "Desc A" },
        { title: "Fase B", description: "Desc B" },
      ];

      const scheduler = createAiLoadingScheduler({
        stages: customStages,
        intervalMs: 500,
        loop: true,
      });

      scheduler.start();

      expect(scheduler.getCurrentIndex()).toBe(0);
      vi.advanceTimersByTime(500);
      expect(scheduler.getCurrentIndex()).toBe(1);
      vi.advanceTimersByTime(500);
      expect(scheduler.getCurrentIndex()).toBe(0); // Looped back
      vi.advanceTimersByTime(500);
      expect(scheduler.getCurrentIndex()).toBe(1);

      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });

    it("subscribers receive notifications and can unsubscribe", () => {
      const listener = vi.fn();
      const scheduler = createAiLoadingScheduler({
        intervalMs: 500,
      });

      const unsubscribe = scheduler.subscribe(listener);
      scheduler.start();

      vi.advanceTimersByTime(500);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(1, DEFAULT_AI_LOADING_STAGES[1]);

      unsubscribe();

      vi.advanceTimersByTime(500);
      // Listener should not be called again after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);

      scheduler.stop();
    });

    it("resets stage index and stops timer properly", () => {
      const onStageChange = vi.fn();
      const scheduler = createAiLoadingScheduler({
        intervalMs: 1000,
        onStageChange,
      });

      scheduler.start();
      vi.advanceTimersByTime(2000);
      expect(scheduler.getCurrentIndex()).toBe(2);

      scheduler.reset(0);
      expect(scheduler.getCurrentIndex()).toBe(0);
      expect(onStageChange).toHaveBeenLastCalledWith(0, DEFAULT_AI_LOADING_STAGES[0]);

      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });

    it("reflects simulated stage progression in component rendering", () => {
      const scheduler = createAiLoadingScheduler({
        intervalMs: 1000,
      });

      scheduler.start();

      let html = renderToStaticMarkup(
        React.createElement(AiAnalysisLoadingSkeleton, {
          currentStageIndex: scheduler.getCurrentIndex(),
        }),
      );
      expect(html).toContain("Preparando imágenes y sesión...");
      expect(html).toContain("Etapa 1 de 4");

      vi.advanceTimersByTime(2000);

      html = renderToStaticMarkup(
        React.createElement(AiAnalysisLoadingSkeleton, {
          currentStageIndex: scheduler.getCurrentIndex(),
        }),
      );
      expect(html).toContain("Invocando Gemini AI...");
      expect(html).toContain("Etapa 3 de 4");

      scheduler.stop();
    });
  });
});
