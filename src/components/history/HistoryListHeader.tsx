import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { DateRangePreset } from "@/utils/filterComparisonsByDateRange";

export interface StatusFilterOptionItem {
  label: string;
  value: string | null;
}

export interface DateFilterOptionItem {
  label: string;
  value: DateRangePreset;
}

export const DEFAULT_STATUS_FILTERS: StatusFilterOptionItem[] = [
  { label: "Todas", value: null },
  { label: "En curso", value: "draft" },
  { label: "Listas", value: "ready" },
  { label: "Analizadas", value: "analyzed" },
];

export const DEFAULT_DATE_FILTERS: DateFilterOptionItem[] = [
  { label: "Todo el tiempo", value: "all" },
  { label: "Hoy", value: "today" },
  { label: "Esta semana", value: "week" },
  { label: "Este mes", value: "month" },
];

export interface HistoryListHeaderProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  selectedStatus?: string | null;
  onStatusChange?: (status: string | null) => void;
  selectedDateRange?: DateRangePreset;
  onDateRangeChange?: (range: DateRangePreset) => void;
  totalCount?: number;
  filteredCount?: number;
  onClearSearch?: () => void;
  placeholder?: string;
  testID?: string;
}

export function HistoryListHeader({
  searchQuery,
  onSearchChange,
  selectedStatus = null,
  onStatusChange,
  selectedDateRange = "all",
  onDateRangeChange,
  totalCount,
  filteredCount,
  onClearSearch,
  placeholder = "Buscar por título, etiquetas o notas...",
  testID = "history-list-header",
}: HistoryListHeaderProps) {
  const hasActiveQuery = searchQuery.trim().length > 0;

  const handleClear = () => {
    onSearchChange("");
    onClearSearch?.();
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Barra de búsqueda */}
      <View style={styles.searchBarContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          accessibilityHint="Filtra la lista de comparaciones por texto"
          accessibilityLabel="Buscar en comparaciones"
          accessibilityRole="search"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onSearchChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          style={styles.searchInput}
          testID="history-search-input"
          value={searchQuery}
        />
        {hasActiveQuery ? (
          <Pressable
            accessibilityHint="Borra el texto de búsqueda actual"
            accessibilityLabel="Limpiar búsqueda"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={handleClear}
            style={styles.clearButton}
            testID="history-clear-search-button"
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Chips de filtro por Estado */}
      {onStatusChange ? (
        <View style={styles.chipsRowContainer}>
          <ScrollView
            accessibilityLabel="Filtro de estado de comparaciones"
            accessibilityRole="tablist"
            contentContainerStyle={styles.chipsScrollContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {DEFAULT_STATUS_FILTERS.map((filter) => {
              const isSelected = selectedStatus === filter.value;
              return (
                <Pressable
                  accessibilityHint={`Filtrar comparaciones por estado ${filter.label}`}
                  accessibilityLabel={filter.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={`status-${filter.value ?? "all"}`}
                  onPress={() => onStatusChange(filter.value)}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                  ]}
                  testID={`status-filter-${filter.value ?? "all"}`}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Chips de filtro por Rango de Fecha */}
      {onDateRangeChange ? (
        <View style={styles.chipsRowContainer}>
          <ScrollView
            accessibilityLabel="Filtro temporal de comparaciones"
            accessibilityRole="tablist"
            contentContainerStyle={styles.chipsScrollContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {DEFAULT_DATE_FILTERS.map((filter) => {
              const isSelected = selectedDateRange === filter.value;
              return (
                <Pressable
                  accessibilityHint={`Filtrar comparaciones por rango ${filter.label}`}
                  accessibilityLabel={filter.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={`date-${filter.value}`}
                  onPress={() => onDateRangeChange(filter.value)}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelectedDate,
                  ]}
                  testID={`date-filter-${filter.value}`}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelectedDate,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Indicador de resultados */}
      {totalCount !== undefined ? (
        <View style={styles.countContainer}>
          <Text style={styles.countText} testID="history-count-text">
            {filteredCount !== undefined && filteredCount !== totalCount
              ? `Mostrando ${filteredCount} de ${totalCount} comparaciones`
              : `${totalCount} ${totalCount === 1 ? "comparación registrada" : "comparaciones registradas"}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 44,
    marginBottom: Spacing.sm,
  },

  searchIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },

  searchInput: {
    flex: 1,
    ...Typography.body,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },

  clearButton: {
    padding: Spacing.xs,
    justifyContent: "center",
    alignItems: "center",
  },

  clearButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "700",
  },

  chipsRowContainer: {
    marginVertical: 3,
  },

  chipsScrollContent: {
    flexDirection: "row",
    gap: Spacing.xs,
    paddingVertical: 2,
  },

  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  chipSelectedDate: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },

  chipText: {
    ...Typography.label,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },

  chipTextSelected: {
    color: Colors.white,
    fontWeight: "700",
  },

  chipTextSelectedDate: {
    color: Colors.accent,
    fontWeight: "700",
  },

  countContainer: {
    marginTop: Spacing.xs,
    paddingHorizontal: 2,
  },

  countText: {
    ...Typography.label,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    fontWeight: "400",
  },
});
