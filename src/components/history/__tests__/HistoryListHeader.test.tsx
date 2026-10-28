import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { HistoryListHeader } from "../HistoryListHeader";

describe("HistoryListHeader UI component", () => {
  it("renders search bar with provided value and placeholder", () => {
    const html = renderToStaticMarkup(
      <HistoryListHeader
        onSearchChange={vi.fn()}
        placeholder="Buscar auditorías..."
        searchQuery="Grieta"
      />,
    );

    expect(html).toContain("history-list-header");
    expect(html).toContain("history-search-input");
    expect(html).toContain("Buscar auditorías...");
    expect(html).toContain("history-clear-search-button");
  });

  it("omits clear search button when query is empty", () => {
    const html = renderToStaticMarkup(
      <HistoryListHeader
        onSearchChange={vi.fn()}
        searchQuery=""
      />,
    );

    expect(html).not.toContain("history-clear-search-button");
  });

  it("renders status chips and applies selected style to active status", () => {
    const onStatusChange = vi.fn();

    const html = renderToStaticMarkup(
      <HistoryListHeader
        onSearchChange={vi.fn()}
        onStatusChange={onStatusChange}
        searchQuery=""
        selectedStatus="analyzed"
      />,
    );

    expect(html).toContain("status-filter-all");
    expect(html).toContain("status-filter-draft");
    expect(html).toContain("status-filter-ready");
    expect(html).toContain("status-filter-analyzed");
    expect(html).toContain("Analizadas");
  });

  it("renders date range filter chips when onDateRangeChange is passed", () => {
    const onDateRangeChange = vi.fn();

    const html = renderToStaticMarkup(
      <HistoryListHeader
        onDateRangeChange={onDateRangeChange}
        onSearchChange={vi.fn()}
        searchQuery=""
        selectedDateRange="week"
      />,
    );

    expect(html).toContain("date-filter-all");
    expect(html).toContain("date-filter-today");
    expect(html).toContain("date-filter-week");
    expect(html).toContain("date-filter-month");
    expect(html).toContain("Esta semana");
  });

  it("renders comparison counters correctly for filtered and total states", () => {
    const totalHtml = renderToStaticMarkup(
      <HistoryListHeader
        filteredCount={8}
        onSearchChange={vi.fn()}
        searchQuery=""
        totalCount={8}
      />,
    );

    expect(totalHtml).toContain("8 comparaciones registradas");

    const filteredHtml = renderToStaticMarkup(
      <HistoryListHeader
        filteredCount={3}
        onSearchChange={vi.fn()}
        searchQuery="muro"
        totalCount={10}
      />,
    );

    expect(filteredHtml).toContain("Mostrando 3 de 10 comparaciones");
  });
});

