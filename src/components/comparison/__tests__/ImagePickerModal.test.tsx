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

import { ImagePickerModal } from "../ImagePickerModal";

describe("ImagePickerModal Accessibility and Interaction", () => {
  it("renders with accessible buttons, hints, and labels", () => {
    const html = renderToStaticMarkup(
      React.createElement(ImagePickerModal, {
        visible: true,
        stageLabel: "estado inicial",
        onClose: vi.fn(),
        onSelectSource: vi.fn(),
      }),
    );

    expect(html).toContain('data-testid="image-picker-modal"');
    expect(html).toContain("Tomar con la cámara");
    expect(html).toContain("Elegir de la galería");
    expect(html).toContain("Cancelar");

    // Accessibility attributes verification
    expect(html).toContain('aria-label="Tomar fotografía con la cámara"');
    expect(html).toContain('aria-label="Seleccionar fotografía de la galería"');
    expect(html).toContain('aria-label="Cancelar selección de imagen"');
    expect(html).toContain('data-testid="image-picker-camera-button"');
    expect(html).toContain('data-testid="image-picker-gallery-button"');
    expect(html).toContain('data-testid="image-picker-cancel-button"');
  });

  it("does not render when visible is false", () => {
    const htmlHidden = renderToStaticMarkup(
      React.createElement(ImagePickerModal, {
        visible: false,
        onClose: vi.fn(),
        onSelectSource: vi.fn(),
      }),
    );

    expect(htmlHidden).toBe("");
  });
});

