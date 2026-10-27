import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ComparisonPreview } from "./ComparisonPreview";

describe("ComparisonPreview", () => {
  it("renders the static preview card with before and after indicators", () => {
    const html = renderToStaticMarkup(<ComparisonPreview />);

    expect(html).toContain("comparison-preview-card");
    expect(html).toContain("COMPARACIÓN VISUAL");
    expect(html).toContain("Antes y después");
    expect(html).toContain("Inicial");
    expect(html).toContain("Final");
    expect(html).toContain("Comparación asistida por IA");
  });

  it("is wrapped in React.memo for rendering performance", () => {
    expect((ComparisonPreview as unknown as { $$typeof: symbol }).$$typeof).toBe(
      Symbol.for("react.memo"),
    );
  });
});

