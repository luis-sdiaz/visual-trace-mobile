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

import { AiReanalyzeConfirmationModal } from "./AiReanalyzeConfirmationModal";

describe("AiReanalyzeConfirmationModal", () => {
  it("renders warning title, quota consumption badge, and warning points when visible", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    const html = renderToStaticMarkup(
      React.createElement(AiReanalyzeConfirmationModal, {
        visible: true,
        onCancel,
        onConfirm,
      }),
    );

    expect(html).toContain("¿Re-analizar comparación?");
    expect(html).toContain("Consume 1 intento de cuota");
    expect(html).toContain("Consumirá 1 intento de tu cuota diaria disponible de IA.");
    expect(html).toContain("Requiere una conexión a internet activa y estable.");
    expect(html).toContain("Tus fotografías guardadas permanecen intactas y seguras.");
    expect(html).toContain("Cancelar");
    expect(html).toContain("Confirmar re-análisis");
  });

  it("does not render modal contents when visible is false", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    const html = renderToStaticMarkup(
      React.createElement(AiReanalyzeConfirmationModal, {
        visible: false,
        onCancel,
        onConfirm,
      }),
    );

    expect(html).not.toContain("¿Re-analizar comparación?");
    expect(html).not.toContain("Confirmar re-análisis");
  });
});

