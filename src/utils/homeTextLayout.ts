export type HomeComparisonStatus = "draft" | "ready" | "analyzed";
export type HomeStatusFilter = HomeComparisonStatus | null;

const FILTER_TEXT_MIN_WIDTH: Record<HomeComparisonStatus | "all", number> = {
  all: 48,
  draft: 84,
  ready: 48,
  analyzed: 76,
};

const BADGE_TEXT_MIN_WIDTH: Record<HomeComparisonStatus, number> = {
  draft: 60,
  ready: 36,
  analyzed: 60,
};

function scaleForFont(baseWidth: number, fontScale: number): number {
  return Math.ceil(baseWidth * Math.max(fontScale, 1));
}

export function getHomeFilterTextMinWidth(
  status: HomeStatusFilter,
  fontScale: number,
): number {
  return scaleForFont(FILTER_TEXT_MIN_WIDTH[status ?? "all"], fontScale);
}

export function getHomeStatusTextMinWidth(
  status: HomeComparisonStatus,
  fontScale: number,
): number {
  return scaleForFont(BADGE_TEXT_MIN_WIDTH[status], fontScale);
}

export function getHomeSignOutTextMinWidth(fontScale: number): number {
  return scaleForFont(88, fontScale);
}
