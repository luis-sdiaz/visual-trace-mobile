import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { VisualDifference } from "@/contracts/geminiAnalysis";
import {
  AiDifferencesCollapsible,
  groupDifferencesByCategory,
} from "./AiDifferencesCollapsible";

describe("AiDifferencesCollapsible", () => {
  const sampleDifferences: VisualDifference[] = [
    {
      category: "added",
      description: "Se instaló una luminaria LED en el cielo raso.",
    },
    {
      category: "added",
      description: "Se colocó un cuadro decorativo en la pared norte.",
    },
    {
      category: "modified",
      description: "El tono de pintura cambió de gris oscuro a blanco perla.",
    },
  ];

  describe("groupDifferencesByCategory", () => {
    it("groups differences correctly by category preserving order", () => {
      const groups = groupDifferencesByCategory(sampleDifferences);

      expect(groups).toHaveLength(2);
      expect(groups[0].category).toBe("added");
      expect(groups[0].label).toBe("Elemento añadido");
      expect(groups[0].items).toHaveLength(2);
      expect(groups[0].items[0]).toBe("Se instaló una luminaria LED en el cielo raso.");
      expect(groups[0].items[1]).toBe("Se colocó un cuadro decorativo en la pared norte.");

      expect(groups[1].category).toBe("modified");
      expect(groups[1].label).toBe("Modificación");
      expect(groups[1].items).toHaveLength(1);
    });

    it("returns empty array when differences list is empty", () => {
      expect(groupDifferencesByCategory([])).toEqual([]);
    });
  });

  describe("rendering", () => {
    it("renders empty state message when differences array is empty", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiDifferencesCollapsible, { differences: [] }),
      );

      expect(html).toContain("Diferencias detectadas");
      expect(html).toContain("No se identificaron cambios visibles.");
      expect(html).not.toContain("Ver detalles");
    });

    it("renders collapsed headers by default without detailed descriptions", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiDifferencesCollapsible, {
          differences: sampleDifferences,
        }),
      );

      expect(html).toContain("Diferencias detectadas");
      expect(html).toContain("3 cambios");
      expect(html).toContain("Elemento añadido");
      expect(html).toContain("Modificación");
      expect(html).toContain("Ver detalles");
      expect(html).toContain("Ver todo");

      // Descriptions should not be visible when collapsed
      expect(html).not.toContain("Se instaló una luminaria LED en el cielo raso.");
      expect(html).not.toContain("El tono de pintura cambió de gris oscuro a blanco perla.");
    });

    it("renders detailed items when initialExpanded is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(AiDifferencesCollapsible, {
          differences: sampleDifferences,
          initialExpanded: true,
        }),
      );

      expect(html).toContain("Diferencias detectadas");
      expect(html).toContain("Ocultar detalles");
      expect(html).toContain("Ocultar todo");

      // Descriptions are visible when expanded
      expect(html).toContain("Se instaló una luminaria LED en el cielo raso.");
      expect(html).toContain("Se colocó un cuadro decorativo en la pared norte.");
      expect(html).toContain("El tono de pintura cambió de gris oscuro a blanco perla.");
    });
  });
});

