import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";

export type LoadingStage = {
  title: string;
  description: string;
};

export const DEFAULT_AI_LOADING_STAGES: readonly LoadingStage[] = [
  {
    title: "Preparando imágenes y sesión...",
    description: "Validando la integridad de las capturas del estado inicial y final.",
  },
  {
    title: "Conectando con Supabase...",
    description: "Verificando cuota de análisis y sincronización segura en la nube.",
  },
  {
    title: "Invocando Gemini AI...",
    description: "Detectando discrepancias físicas y anomalías visuales con IA.",
  },
  {
    title: "Estructurando reporte comparativo...",
    description: "Consolidando diferencias, observaciones y limitaciones del análisis.",
  },
] as const;

export interface AiLoadingSchedulerOptions {
  stages?: readonly LoadingStage[];
  intervalMs?: number;
  initialIndex?: number;
  loop?: boolean;
  onStageChange?: (index: number, stage: LoadingStage) => void;
}

export function createAiLoadingScheduler({
  stages = DEFAULT_AI_LOADING_STAGES,
  intervalMs = 2500,
  initialIndex = 0,
  loop = false,
  onStageChange,
}: AiLoadingSchedulerOptions = {}) {
  let currentIndex = Math.min(Math.max(initialIndex, 0), Math.max(stages.length - 1, 0));
  let timerId: ReturnType<typeof setInterval> | null = null;
  const subscribers = new Set<(index: number, stage: LoadingStage) => void>();

  function notify() {
    const currentStage = stages[currentIndex] ?? stages[0];
    onStageChange?.(currentIndex, currentStage);
    subscribers.forEach((sub) => sub(currentIndex, currentStage));
  }

  return {
    getCurrentIndex: () => currentIndex,
    getCurrentStage: () => stages[currentIndex] ?? stages[0],
    getStages: () => stages,
    start: () => {
      if (timerId !== null || stages.length <= 1) return;
      timerId = setInterval(() => {
        if (currentIndex < stages.length - 1) {
          currentIndex += 1;
          notify();
        } else if (loop) {
          currentIndex = 0;
          notify();
        } else {
          if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
          }
        }
      }, intervalMs);
    },
    stop: () => {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    },
    isRunning: () => timerId !== null,
    subscribe: (fn: (index: number, stage: LoadingStage) => void) => {
      subscribers.add(fn);
      return () => {
        subscribers.delete(fn);
      };
    },
    reset: (newIndex = 0) => {
      currentIndex = Math.min(Math.max(newIndex, 0), Math.max(stages.length - 1, 0));
      notify();
    },
  };
}

export type AiLoadingScheduler = ReturnType<typeof createAiLoadingScheduler>;

export type UseAiLoadingStagesOptions = {
  stages?: readonly LoadingStage[];
  intervalMs?: number;
  initialIndex?: number;
  currentStageIndex?: number;
  loop?: boolean;
  onStageChange?: (index: number, stage: LoadingStage) => void;
};

export function useAiLoadingStages({
  stages = DEFAULT_AI_LOADING_STAGES,
  intervalMs = 2500,
  initialIndex = 0,
  currentStageIndex,
  loop = false,
  onStageChange,
}: UseAiLoadingStagesOptions = {}) {
  const isControlled = currentStageIndex !== undefined;
  const [internalIndex, setInternalIndex] = useState(initialIndex);

  const effectiveIndex = Math.min(
    Math.max(isControlled ? currentStageIndex : internalIndex, 0),
    Math.max(stages.length - 1, 0),
  );

  const onStageChangeRef = useRef(onStageChange);
  useEffect(() => {
    onStageChangeRef.current = onStageChange;
  });

  useEffect(() => {
    if (isControlled || stages.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setInternalIndex((prev) => {
        const next = prev < stages.length - 1 ? prev + 1 : loop ? 0 : prev;
        if (next !== prev) {
          onStageChangeRef.current?.(next, stages[next] ?? stages[0]);
        }
        return next;
      });
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [intervalMs, isControlled, loop, stages]);

  const currentStage = stages[effectiveIndex] ?? stages[0];

  return {
    stageIndex: effectiveIndex,
    currentStage,
    totalStages: stages.length,
    isFirstStage: effectiveIndex === 0,
    isLastStage: effectiveIndex === stages.length - 1,
  };
}

export type AiAnalysisLoadingSkeletonProps = {
  stages?: readonly LoadingStage[];
  intervalMs?: number;
  initialStageIndex?: number;
  currentStageIndex?: number;
  loop?: boolean;
  onStageChange?: (index: number, stage: LoadingStage) => void;
  testID?: string;
};

export function AiAnalysisLoadingSkeleton({
  stages = DEFAULT_AI_LOADING_STAGES,
  intervalMs = 2500,
  initialStageIndex = 0,
  currentStageIndex,
  loop = false,
  onStageChange,
  testID = "ai-analysis-loading-skeleton",
}: AiAnalysisLoadingSkeletonProps) {
  const { stageIndex, currentStage, totalStages } = useAiLoadingStages({
    stages,
    intervalMs,
    initialIndex: initialStageIndex,
    currentStageIndex,
    loop,
    onStageChange,
  });

  const [pulseAnim] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulseAnim]);

  return (
    <View
      accessibilityLabel={`Análisis de IA en curso: ${currentStage.title}`}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={styles.card}
      testID={testID}
    >
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ANÁLISIS DE IA</Text>
        </View>
        <Text style={styles.stepCounter} testID="ai-loading-step-counter">
          Etapa {stageIndex + 1} de {totalStages}
        </Text>
      </View>

      <View style={styles.statusArea}>
        <View style={styles.spinnerContainer}>
          <ActivityIndicator color={Colors.primary} size="large" testID="ai-loading-spinner" />
        </View>

        <Text style={styles.stageTitle} testID="ai-loading-stage-title">
          {currentStage.title}
        </Text>

        <Text style={styles.stageDescription} testID="ai-loading-stage-description">
          {currentStage.description}
        </Text>
      </View>

      <View
        accessibilityLabel={`Progreso de etapas: etapa ${stageIndex + 1} de ${totalStages}`}
        style={styles.progressRow}
        testID="ai-loading-progress-row"
      >
        {stages.map((_, index) => {
          const isActive = index === stageIndex;
          const isCompleted = index < stageIndex;

          return (
            <View
              key={`stage-pill-${index}`}
              style={[
                styles.pill,
                isActive && styles.pillActive,
                isCompleted && styles.pillCompleted,
              ]}
              testID={`ai-loading-pill-${index}`}
            />
          );
        })}
      </View>

      <Animated.View
        style={[styles.skeletonContainer, { opacity: pulseAnim }]}
        testID="ai-loading-skeleton-preview"
      >
        <View style={styles.skeletonHeaderPlaceholder} />
        <View style={styles.skeletonLineLong} />
        <View style={styles.skeletonLineMedium} />

        <View style={styles.skeletonDifferenceBox}>
          <View style={styles.skeletonBadgePlaceholder} />
          <View style={styles.skeletonLineShort} />
        </View>
      </Animated.View>

      <Text style={styles.helperNotice}>
        El análisis visual detallado con Gemini Flash toma normalmente de 3 a 6 segundos.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.borderPrimary,
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginVertical: Spacing.md,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },

  badge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },

  badgeText: {
    ...Typography.label,
    color: Colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },

  stepCounter: {
    ...Typography.label,
    color: Colors.textSecondary,
    fontSize: 13,
  },

  statusArea: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },

  spinnerContainer: {
    marginBottom: Spacing.md,
  },

  stageTitle: {
    ...Typography.title,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },

  stageDescription: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: Spacing.md,
  },

  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },

  pill: {
    height: 6,
    flex: 1,
    maxWidth: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
  },

  pillActive: {
    backgroundColor: Colors.primary,
    height: 6,
  },

  pillCompleted: {
    backgroundColor: Colors.success,
  },

  skeletonContainer: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  skeletonHeaderPlaceholder: {
    height: 16,
    width: "40%",
    backgroundColor: Colors.borderStrong,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },

  skeletonLineLong: {
    height: 12,
    width: "90%",
    backgroundColor: Colors.border,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },

  skeletonLineMedium: {
    height: 12,
    width: "70%",
    backgroundColor: Colors.border,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },

  skeletonDifferenceBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  skeletonBadgePlaceholder: {
    height: 14,
    width: 60,
    backgroundColor: Colors.primaryMedium,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
  },

  skeletonLineShort: {
    height: 10,
    width: "80%",
    backgroundColor: Colors.border,
    borderRadius: Radius.sm,
  },

  helperNotice: {
    ...Typography.body,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
});
