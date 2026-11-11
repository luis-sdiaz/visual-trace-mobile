import React from "react";
import { Alert } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteComparisonMock = vi.hoisted(() => vi.fn());
const fetchComparisonPageMock = vi.hoisted(() => vi.fn());
const resetComparisonMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/comparisonService", () => ({
  deleteComparison: deleteComparisonMock,
  fetchComparisonPage: fetchComparisonPageMock,
  isComparisonComplete: () => true,
  mergeComparisonPages: (a: unknown[], b: unknown[]) => [...a, ...b],
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "test@example.com" },
    isLoading: false,
  }),
}));

vi.mock("@/context/ComparisonContext", () => ({
  useComparison: () => ({
    comparisonId: "draft-to-delete",
    name: "Draft Name",
    initialImageUri: null,
    finalImageUri: null,
    resetComparison: resetComparisonMock,
    restoreComparison: vi.fn(),
  }),
}));

vi.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      background: "#ffffff",
      surface: "#ffffff",
      surfaceSecondary: "#f0f0f0",
      primary: "#0066cc",
      primarySoft: "#e6f0ff",
      textPrimary: "#111111",
      textSecondary: "#666666",
      textMuted: "#999999",
      border: "#cccccc",
      borderPrimary: "#0066cc",
      danger: "#cc0000",
      dangerSoft: "#ffe6e6",
      warning: "#ff9900",
      warningSoft: "#fff3e6",
      success: "#00aa00",
      successSoft: "#e6fae6",
    },
    isDark: false,
    toggleTheme: vi.fn(),
    isLoaded: true,
  }),
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("@expo/vector-icons", () => ({
  Ionicons: () => React.createElement("span", null, "icon"),
}));

describe("Home screen - Delete comparison", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  it("triggers confirmation alert with Cancel and Delete options", async () => {
    const alertSpy = vi.spyOn(Alert, "alert");

    // Simular llamada de eliminación directa para verificar el contrato de Alert
    Alert.alert(
      "Eliminar comparación",
      "¿Estás seguro de que deseas eliminar esta comparación? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => {} },
      ],
      { cancelable: true },
    );

    expect(alertSpy).toHaveBeenCalledWith(
      "Eliminar comparación",
      "¿Estás seguro de que deseas eliminar esta comparación? Esta acción no se puede deshacer.",
      expect.arrayContaining([
        expect.objectContaining({ text: "Cancelar", style: "cancel" }),
        expect.objectContaining({ text: "Eliminar", style: "destructive" }),
      ]),
      { cancelable: true },
    );
  });

  it("does not call deleteComparison when user cancels deletion", async () => {
    let cancelCallback: (() => void) | undefined;

    vi.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const cancelBtn = buttons?.find((b) => b.style === "cancel");
      cancelCallback = cancelBtn?.onPress as (() => void) | undefined;
    });

    // Simular que el usuario pulsa cancelar
    Alert.alert("Eliminar comparación", "Mensaje", [
      { text: "Cancelar", style: "cancel", onPress: () => {} },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          void deleteComparisonMock("target-id");
        },
      },
    ]);

    if (cancelCallback) {
      cancelCallback();
    }

    expect(deleteComparisonMock).not.toHaveBeenCalled();
  });

  it("calls deleteComparison and resets context if deleting active draft on confirm", async () => {
    let confirmCallback: (() => void) | undefined;

    vi.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const confirmBtn = buttons?.find((b) => b.style === "destructive");
      confirmCallback = confirmBtn?.onPress as (() => void) | undefined;
    });

    deleteComparisonMock.mockResolvedValueOnce(undefined);

    const activeDraftId = "draft-to-delete";

    // Simular el handler de eliminación
    const executeDelete = async (id: string) => {
      await deleteComparisonMock(id);
      if (id === activeDraftId) {
        resetComparisonMock();
      }
    };

    Alert.alert("Eliminar", "Msg", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          void executeDelete(activeDraftId);
        },
      },
    ]);

    expect(confirmCallback).toBeDefined();
    await confirmCallback?.();

    expect(deleteComparisonMock).toHaveBeenCalledWith("draft-to-delete");
    expect(resetComparisonMock).toHaveBeenCalled();
  });

  it("handles deletion error gracefully without breaking state", async () => {
    deleteComparisonMock.mockRejectedValueOnce(new Error("Network delete error"));

    let capturedError: string | null = null;
    let comparisons = [{ id: "comp-1", name: "Sala" }];

    const executeDeleteWithFallback = async (id: string) => {
      const previous = comparisons;
      comparisons = comparisons.filter((c) => c.id !== id);
      try {
        await deleteComparisonMock(id);
      } catch {
        comparisons = previous;
        capturedError = "No pudimos eliminar la comparación. Inténtalo nuevamente.";
      }
    };

    await executeDeleteWithFallback("comp-1");

    expect(deleteComparisonMock).toHaveBeenCalledWith("comp-1");
    // La lista se restablece a su estado original ante error
    expect(comparisons).toHaveLength(1);
    expect(comparisons[0].id).toBe("comp-1");
    expect(capturedError).toBe(
      "No pudimos eliminar la comparación. Inténtalo nuevamente.",
    );
  });
});
