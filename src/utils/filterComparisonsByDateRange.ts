export type DateRangePreset = "all" | "today" | "week" | "month";

export interface DatedComparisonItem {
  id: string;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export function parseItemDate(item: DatedComparisonItem): Date | null {
  const dateStr = item.created_at || item.updated_at;
  if (!dateStr || typeof dateStr !== "string") {
    return null;
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function isSameDay(target: Date, reference: Date): boolean {
  return (
    target.getFullYear() === reference.getFullYear() &&
    target.getMonth() === reference.getMonth() &&
    target.getDate() === reference.getDate()
  );
}

export function isWithinCurrentWeek(target: Date, reference: Date): boolean {
  // Inicio del día hace 7 días como ventana móvil semanal o semana en curso
  const startOfDayRef = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 23, 59, 59, 999);
  const weekStart = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - 6, 0, 0, 0, 0);

  const targetTime = target.getTime();
  return targetTime >= weekStart.getTime() && targetTime <= startOfDayRef.getTime();
}

export function isWithinCurrentMonth(target: Date, reference: Date): boolean {
  return (
    target.getFullYear() === reference.getFullYear() &&
    target.getMonth() === reference.getMonth()
  );
}

export function filterComparisonsByDateRange<T extends DatedComparisonItem>(
  items: T[],
  range: DateRangePreset,
  referenceDate: Date = new Date(),
): T[] {
  if (range === "all") {
    return items;
  }

  return items.filter((item) => {
    const itemDate = parseItemDate(item);
    if (!itemDate) {
      return false;
    }

    switch (range) {
      case "today":
        return isSameDay(itemDate, referenceDate);
      case "week":
        return isWithinCurrentWeek(itemDate, referenceDate);
      case "month":
        return isWithinCurrentMonth(itemDate, referenceDate);
      default:
        return true;
    }
  });
}

