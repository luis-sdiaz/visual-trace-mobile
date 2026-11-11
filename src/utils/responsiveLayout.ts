const COMPACT_TOP_BAR_CONTENT_WIDTH = 360;

export function getEffectiveContentWidth(width: number, fontScale: number): number {
  return width / Math.max(fontScale, 1);
}

export function shouldStackTopBar(width: number, fontScale: number): boolean {
  return getEffectiveContentWidth(width, fontScale) < COMPACT_TOP_BAR_CONTENT_WIDTH;
}
