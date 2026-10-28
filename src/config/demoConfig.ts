export type DemoNetworkCondition =
  | "normal"
  | "slow"
  | "offline"
  | "error_429"
  | "error_500";

export type DemoMockScenario =
  | "changes_detected"
  | "no_changes"
  | "structural_defect"
  | "minor_cosmetic";

export interface DemoModeOptions {
  enabled: boolean;
  mockLatencyMs: number;
  networkCondition: DemoNetworkCondition;
  injectMockAiAnalysis: boolean;
  showArchitectureDetails: boolean;
  simulateOfflineFallback: boolean;
  selectedScenario: DemoMockScenario;
}

export interface AcademicDemoState extends DemoModeOptions {
  lastMockUsedAt: string | null;
  totalMocksServed: number;
}

export const DEFAULT_DEMO_OPTIONS: Readonly<DemoModeOptions> = {
  enabled: false,
  mockLatencyMs: 600,
  networkCondition: "normal",
  injectMockAiAnalysis: true,
  showArchitectureDetails: true,
  simulateOfflineFallback: true,
  selectedScenario: "changes_detected",
};

let currentState: AcademicDemoState = {
  ...DEFAULT_DEMO_OPTIONS,
  lastMockUsedAt: null,
  totalMocksServed: 0,
};

type DemoStateListener = (state: AcademicDemoState) => void;
const listeners = new Set<DemoStateListener>();

function notifyListeners(): void {
  const snapshot = getDemoState();
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // Evitar que excepciones en suscriptores rompan el bucle de notificación
    }
  });
}

export function getDemoState(): AcademicDemoState {
  return { ...currentState };
}

export function isDemoModeActive(): boolean {
  return currentState.enabled;
}

export function setDemoState(
  updates: Partial<DemoModeOptions>,
): AcademicDemoState {
  currentState = {
    ...currentState,
    ...updates,
  };
  notifyListeners();
  return getDemoState();
}

export function recordMockServed(): void {
  currentState = {
    ...currentState,
    totalMocksServed: currentState.totalMocksServed + 1,
    lastMockUsedAt: new Date().toISOString(),
  };
  notifyListeners();
}

export function resetDemoConfig(): void {
  currentState = {
    ...DEFAULT_DEMO_OPTIONS,
    lastMockUsedAt: null,
    totalMocksServed: 0,
  };
  notifyListeners();
}

export function subscribeDemoConfig(
  listener: DemoStateListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

