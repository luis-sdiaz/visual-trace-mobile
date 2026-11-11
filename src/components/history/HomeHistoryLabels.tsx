import { StyleSheet, Text, View } from "react-native";

import { getDevTextMeasurementProps } from "@/components/dev/devTextMeasurement";
import { type ColorPalette } from "@/constants/colors";
import { Radius } from "@/constants/radius";
import { Spacing } from "@/constants/spacing";
import { Typography } from "@/constants/typography";
import { useTheme } from "@/context/ThemeContext";
import { type ComparisonStatus } from "@/services/comparisonService";
import { getHomeStatusTextMinWidth } from "@/utils/homeTextLayout";

type HomeHistoryLabelsProps = {
  comparisonId: string;
  date: string;
  fontScale: number;
  name: string;
  status: ComparisonStatus;
  statusLabel: string;
};

export function HomeHistoryLabels({
  comparisonId,
  date,
  fontScale,
  name,
  status,
  statusLabel,
}: HomeHistoryLabelsProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <>
      <View style={styles.content}>
        <Text
          style={styles.name}
          {...getDevTextMeasurementProps(`home.recentName.${comparisonId}`, name)}
          testID={`home-comparison-name-${comparisonId}`}
        >
          {name}
        </Text>
        <Text style={styles.date}>{date}</Text>
      </View>

      <View
        style={[
          styles.statusBadge,
          status === "ready" && styles.readyBadge,
          status === "analyzed" && styles.analyzedBadge,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            { minWidth: getHomeStatusTextMinWidth(status, fontScale) },
            status === "ready" && styles.readyText,
            status === "analyzed" && styles.analyzedText,
          ]}
          {...getDevTextMeasurementProps(`home.status.${comparisonId}`, statusLabel)}
          testID={`home-status-label-${comparisonId}`}
        >
          {statusLabel}
        </Text>
      </View>
    </>
  );
}

export function HomeLoadMoreLabel({ label }: { label: string }) {
  const { colors } = useTheme();

  return (
    <Text
      style={[styles.loadMoreText, { color: colors.primary }]}
      {...getDevTextMeasurementProps("home.loadMore", label)}
      testID="home-load-more-label"
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  loadMoreText: {
    ...Typography.label,
    alignSelf: "stretch",
    textAlign: "center",
  },
});

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      flex: 1,
      minWidth: 0,
      marginRight: Spacing.sm,
    },
    name: {
      ...Typography.label,
      color: colors.textPrimary,
      fontSize: 15,
      alignSelf: "stretch",
      flexShrink: 1,
    },
    date: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginTop: Spacing.xs,
    },
    statusBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      backgroundColor: colors.warningSoft,
      borderRadius: Radius.full,
      flexShrink: 0,
    },
    statusText: {
      color: colors.warning,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
      flexShrink: 0,
      textAlign: "center",
    },
    readyBadge: {
      backgroundColor: colors.primarySoft,
    },
    readyText: {
      color: colors.primary,
    },
    analyzedBadge: {
      backgroundColor: colors.successSoft,
    },
    analyzedText: {
      color: colors.success,
    },
  });
}
