import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ARCHITECTURE_PILLARS,
  ArchitectureInfoCard,
} from "./ArchitectureInfoCard";

describe("ArchitectureInfoCard", () => {
  it("renders with default collapsed state and essential badges", () => {
    const html = renderToStaticMarkup(
      React.createElement(ArchitectureInfoCard, {}),
    );

    expect(html).toContain("ARQUITECTURA DE SISTEMA");
    expect(html).toContain("Supabase + Gemini");
    expect(html).toContain("Arquitectura de Nube");
    expect(html).toContain("Resiliencia");
    expect(html).toContain("Ver pilares técnicos de sustentación ▾");
    expect(html).toContain('data-testid="architecture-info-card"');
    expect(html).toContain('data-testid="toggle-architecture-details"');
    expect(html).not.toContain("architecture-pillars-list");
  });

  it("renders all architecture pillars when initialExpanded is true", () => {
    const html = renderToStaticMarkup(
      React.createElement(ArchitectureInfoCard, { initialExpanded: true }),
    );

    expect(html).toContain("Ocultar pilares técnicos ▴");
    expect(html).toContain('data-testid="architecture-pillars-list"');
    expect(html).toContain('aria-expanded="true"');

    ARCHITECTURE_PILLARS.forEach((pillar) => {
      // Tags should be present
      expect(html).toContain(pillar.tag);
    });

    expect(html).toContain("Supabase Storage Privado");
    expect(html).toContain("Edge Function analyze-comparison");
    expect(html).toContain("Google Gemini AI");
  });

  it("supports controlled expanded prop", () => {
    const htmlExpanded = renderToStaticMarkup(
      React.createElement(ArchitectureInfoCard, { expanded: true }),
    );
    expect(htmlExpanded).toContain('data-testid="architecture-pillars-list"');

    const htmlCollapsed = renderToStaticMarkup(
      React.createElement(ArchitectureInfoCard, { expanded: false }),
    );
    expect(htmlCollapsed).not.toContain('data-testid="architecture-pillars-list"');
  });

  it("contains all 5 pillars with expected technical descriptions", () => {
    expect(ARCHITECTURE_PILLARS).toHaveLength(5);
    const tags = ARCHITECTURE_PILLARS.map((p) => p.tag);
    expect(tags).toContain("Base de Datos");
    expect(tags).toContain("Almacenamiento");
    expect(tags).toContain("Backend");
    expect(tags).toContain("Motor IA");
    expect(tags).toContain("Resiliencia");
  });
});

