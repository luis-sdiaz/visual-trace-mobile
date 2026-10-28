import { describe, expect, it } from "vitest";

import {
  DatedComparisonItem,
  filterComparisonsByDateRange,
  isSameDay,
  isWithinCurrentMonth,
  isWithinCurrentWeek,
  parseItemDate,
} from "../filterComparisonsByDateRange";

describe("filterComparisonsByDateRange utility", () => {
  // Fecha de referencia fija: 2026-10-27 a las 14:00:00 (Martes)
  const refDate = new Date(2026, 9, 27, 14, 0, 0);

  const mockItems: DatedComparisonItem[] = [
    {
      id: "today-morning",
      created_at: new Date(2026, 9, 27, 8, 30, 0).toISOString(),
    },
    {
      id: "today-midnight-start",
      created_at: new Date(2026, 9, 27, 0, 0, 1).toISOString(),
    },
    {
      id: "yesterday",
      created_at: new Date(2026, 9, 26, 18, 0, 0).toISOString(),
    },
    {
      id: "four-days-ago",
      created_at: new Date(2026, 9, 23, 11, 0, 0).toISOString(),
    },
    {
      id: "eight-days-ago",
      created_at: new Date(2026, 9, 19, 10, 0, 0).toISOString(),
    },
    {
      id: "previous-month",
      created_at: new Date(2026, 8, 30, 15, 0, 0).toISOString(),
    },
    {
      id: "invalid-date",
      created_at: "not-a-valid-date-string",
    },
    {
      id: "null-date",
      created_at: null,
    },
  ];

  it("parses item dates safely and returns null for invalid formats", () => {
    expect(parseItemDate(mockItems[0])).toBeInstanceOf(Date);
    expect(parseItemDate(mockItems[6])).toBeNull();
    expect(parseItemDate(mockItems[7])).toBeNull();
  });

  it("correctly identifies same day items regardless of time component", () => {
    const d1 = new Date(2026, 9, 27, 0, 1, 0);
    const d2 = new Date(2026, 9, 27, 23, 59, 0);
    const d3 = new Date(2026, 9, 26, 23, 59, 0);

    expect(isSameDay(d1, refDate)).toBe(true);
    expect(isSameDay(d2, refDate)).toBe(true);
    expect(isSameDay(d3, refDate)).toBe(false);
  });

  it("checks week boundaries correctly", () => {
    const insideWeek = new Date(2026, 9, 22, 12, 0, 0);
    const outsideWeek = new Date(2026, 9, 15, 12, 0, 0);

    expect(isWithinCurrentWeek(insideWeek, refDate)).toBe(true);
    expect(isWithinCurrentWeek(outsideWeek, refDate)).toBe(false);
  });

  it("checks current month boundaries correctly", () => {
    const insideMonth = new Date(2026, 9, 1, 10, 0, 0);
    const outsideMonth = new Date(2026, 8, 30, 23, 59, 59);

    expect(isWithinCurrentMonth(insideMonth, refDate)).toBe(true);
    expect(isWithinCurrentMonth(outsideMonth, refDate)).toBe(false);
  });

  it("returns all items when preset is 'all'", () => {
    const result = filterComparisonsByDateRange(mockItems, "all", refDate);
    expect(result).toHaveLength(mockItems.length);
  });

  it("filters items belonging strictly to 'today'", () => {
    const result = filterComparisonsByDateRange(mockItems, "today", refDate);
    const ids = result.map((item) => item.id);

    expect(ids).toEqual(["today-morning", "today-midnight-start"]);
  });

  it("filters items within current week window (last 7 days)", () => {
    const result = filterComparisonsByDateRange(mockItems, "week", refDate);
    const ids = result.map((item) => item.id);

    expect(ids).toContain("today-morning");
    expect(ids).toContain("yesterday");
    expect(ids).toContain("four-days-ago");
    expect(ids).not.toContain("eight-days-ago");
    expect(ids).not.toContain("previous-month");
    expect(ids).not.toContain("invalid-date");
  });

  it("filters items belonging to current month", () => {
    const result = filterComparisonsByDateRange(mockItems, "month", refDate);
    const ids = result.map((item) => item.id);

    expect(ids).toContain("today-morning");
    expect(ids).toContain("yesterday");
    expect(ids).toContain("four-days-ago");
    expect(ids).toContain("eight-days-ago");
    expect(ids).not.toContain("previous-month");
    expect(ids).not.toContain("invalid-date");
  });
});

