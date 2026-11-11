import { describe, expect, it } from "vitest";

import { getEffectiveContentWidth, shouldStackTopBar } from "./responsiveLayout";

describe("responsive Android layouts", () => {
  it.each([
    { width: 320, fontScale: 1, stacked: true },
    { width: 360, fontScale: 1, stacked: false },
    { width: 412, fontScale: 1, stacked: false },
    { width: 412, fontScale: 1.3, stacked: true },
    { width: 600, fontScale: 2, stacked: true },
    { width: 720, fontScale: 2, stacked: false },
  ])(
    "adapts width $width at font scale $fontScale",
    ({ width, fontScale, stacked }) => {
      expect(shouldStackTopBar(width, fontScale)).toBe(stacked);
    },
  );

  it("does not enlarge effective width when font scale is below one", () => {
    expect(getEffectiveContentWidth(320, 0.85)).toBe(320);
  });
});
