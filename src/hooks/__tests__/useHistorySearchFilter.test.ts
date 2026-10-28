import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  filterHistoryItems,
  HistoryFilterableItem,
  normalizeSearchString,
  useHistorySearchFilter,
  UseHistorySearchFilterResult,
} from "../useHistorySearchFilter";

interface TestItem extends HistoryFilterableItem {
  id: string;
  title: string;
  notes?: string;
  status: "draft" | "ready" | "analyzed";
  tags?: string[];
}

const mockComparisons: TestItem[] = [
  {
    id: "1",
    title: "Inspección Muro Norte",
    notes: "Fisura visible cerca del pilar",
    status: "analyzed",
    tags: ["estructural", "urgente"],
  },
  {
    id: "2",
    title: "Fachada Principal Edificio A",
    notes: "Pintura descascarada",
    status: "ready",
    tags: ["acabados"],
  },
  {
    id: "3",
    title: "Auditoría Cubierta y Techo",
    notes: "Filtración leve detectada",
    status: "draft",
    tags: ["humedad"],
  },
];

describe("useHistorySearchFilter custom hook & filterHistoryItems", () => {
  it("normalizes strings removing accents, whitespace and casing", () => {
    expect(normalizeSearchString("  Edifició Principal  ")).toBe("edificio principal");
    expect(normalizeSearchString("ÁÉÍÓÚñ")).toBe("aeioun");
    expect(normalizeSearchString(null)).toBe("");
  });

  it("filters items by matching query in title case- and accent-insensitively", () => {
    const results = filterHistoryItems(mockComparisons, "inspeccion");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("filters items by matching search query in notes or tags", () => {
    const byTag = filterHistoryItems(mockComparisons, "urgente");
    expect(byTag).toHaveLength(1);
    expect(byTag[0].title).toBe("Inspección Muro Norte");

    const byNotes = filterHistoryItems(mockComparisons, "filtracion");
    expect(byNotes).toHaveLength(1);
    expect(byNotes[0].id).toBe("3");
  });

  it("filters items strictly by status category", () => {
    const readyItems = filterHistoryItems(mockComparisons, undefined, "ready");
    expect(readyItems).toHaveLength(1);
    expect(readyItems[0].status).toBe("ready");
  });

  it("combines text search with status filter", () => {
    const emptyResult = filterHistoryItems(mockComparisons, "Fachada", "analyzed");
    expect(emptyResult).toHaveLength(0);

    const matchResult = filterHistoryItems(mockComparisons, "Muro", "analyzed");
    expect(matchResult).toHaveLength(1);
    expect(matchResult[0].id).toBe("1");
  });

  it("initializes hook state with provided initial options via renderToStaticMarkup", () => {
    let hookResult!: UseHistorySearchFilterResult<TestItem>;

    function TestComponent() {
      hookResult = useHistorySearchFilter<TestItem>({
        items: mockComparisons,
        initialQuery: "Fachada",
        initialStatus: "ready",
      });
      return null;
    }

    renderToStaticMarkup(React.createElement(TestComponent));

    expect(hookResult.searchQuery).toBe("Fachada");
    expect(hookResult.statusFilter).toBe("ready");
    expect(hookResult.filteredItems).toHaveLength(1);
    expect(hookResult.filteredCount).toBe(1);
    expect(hookResult.totalCount).toBe(3);
    expect(hookResult.hasActiveFilters).toBe(true);
  });

  it("handles empty initial query and inactive filter flags in hook", () => {
    let hookResult!: UseHistorySearchFilterResult<TestItem>;

    function TestComponent() {
      hookResult = useHistorySearchFilter<TestItem>({
        items: mockComparisons,
      });
      return null;
    }

    renderToStaticMarkup(React.createElement(TestComponent));

    expect(hookResult.searchQuery).toBe("");
    expect(hookResult.statusFilter).toBeNull();
    expect(hookResult.filteredItems).toHaveLength(3);
    expect(hookResult.hasActiveFilters).toBe(false);
  });
});

