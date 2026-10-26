import { describe, expect, it } from "vitest";

import { MAX_FREE_TIER_LIMITS, readUsageLimits } from "./usageLimits";

describe("AI usage limit configuration", () => {
  it("accepts conservative configured limits", () => {
    const values: Record<string, string> = {
      AI_GLOBAL_PER_MINUTE: "2",
      AI_GLOBAL_PER_DAY: "8",
      AI_USER_PER_DAY: "4",
      AI_COMPARISON_PER_DAY: "2",
    };
    expect(readUsageLimits((name) => values[name])).toEqual({
      globalPerMinute: 2,
      globalPerDay: 8,
      userPerDay: 4,
      comparisonPerDay: 2,
    });
  });

  it("uses safe default fallback limits when environment variables are not set or empty", () => {
    expect(readUsageLimits(() => undefined)).toEqual(MAX_FREE_TIER_LIMITS);
    expect(readUsageLimits(() => null)).toEqual(MAX_FREE_TIER_LIMITS);
    expect(readUsageLimits(() => "")).toEqual(MAX_FREE_TIER_LIMITS);
    expect(readUsageLimits(() => "   ")).toEqual(MAX_FREE_TIER_LIMITS);
  });

  it.each(["0", "4", "-1", "2.5", "not-a-number", "hex-hash-abc123"])(
    "falls back to safe default for invalid or unsafe minute limit %s",
    (value) => {
      expect(
        readUsageLimits((name) =>
          name === "AI_GLOBAL_PER_MINUTE" ? value : undefined,
        ).globalPerMinute,
      ).toBe(MAX_FREE_TIER_LIMITS.globalPerMinute);
    },
  );
});
