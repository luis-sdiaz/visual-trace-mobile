import { useCallback, useMemo, useState } from "react";

export interface HistoryFilterableItem {
  id: string;
  title?: string | null;
  name?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  status?: string | null;
  tags?: string[] | null;
}

export type StatusFilterOption = string | null;

export interface UseHistorySearchFilterOptions<T extends HistoryFilterableItem> {
  items: T[];
  initialQuery?: string;
  initialStatus?: StatusFilterOption;
}

export interface UseHistorySearchFilterResult<T extends HistoryFilterableItem> {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: StatusFilterOption;
  setStatusFilter: (status: StatusFilterOption) => void;
  filteredItems: T[];
  totalCount: number;
  filteredCount: number;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function normalizeSearchString(text?: string | null): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function filterHistoryItems<T extends HistoryFilterableItem>(
  items: T[],
  query?: string,
  status?: StatusFilterOption,
): T[] {
  const normalizedQuery = normalizeSearchString(query);

  return items.filter((item) => {
    // 1. Filtro por status
    if (status && item.status !== status) {
      return false;
    }

    // 2. Filtro por texto si query no está vacía
    if (normalizedQuery.length > 0) {
      const itemTitle = normalizeSearchString(item.title || item.name || "");
      const itemNotes = normalizeSearchString(item.notes || "");
      const tagsMatch =
        Array.isArray(item.tags) &&
        item.tags.some((tag) => normalizeSearchString(tag).includes(normalizedQuery));

      const matchesQuery =
        itemTitle.includes(normalizedQuery) ||
        itemNotes.includes(normalizedQuery) ||
        tagsMatch;

      if (!matchesQuery) {
        return false;
      }
    }

    return true;
  });
}

export function useHistorySearchFilter<T extends HistoryFilterableItem>({
  items,
  initialQuery = "",
  initialStatus = null,
}: UseHistorySearchFilterOptions<T>): UseHistorySearchFilterResult<T> {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>(initialStatus);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter(null);
  }, []);

  const filteredItems = useMemo(
    () => filterHistoryItems(items, searchQuery, statusFilter),
    [items, searchQuery, statusFilter],
  );

  const hasActiveFilters = searchQuery.trim().length > 0 || statusFilter !== null;

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredItems,
    totalCount: items.length,
    filteredCount: filteredItems.length,
    clearFilters,
    hasActiveFilters,
  };
}

