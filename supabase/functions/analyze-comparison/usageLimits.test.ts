import { describe, expect, it } from "vitest";

import { readUsageLimits } from "./usageLimits";

describe("AI usage limit configuration", () => {
  it("accepts conservative configured limits", () => {
    const values: Record<string, string> = {
      AI_GLOBAL_PER_MINUTE: "3",
      AI_GLOBAL_PER_DAY: "10",
      AI_USER_PER_DAY: "6",
      AI_COMPARISON_PER_DAY: "3",
    };
    expect(readUsageLimits((name) => values[name])).toEqual({
      globalPerMinute: 3,
      globalPerDay: 10,
      userPerDay: 6,
      comparisonPerDay: 3,
    });
  });

  it.each([undefined, "0", "4", "not-a-number"])(
    "fails closed for unsafe minute limit %s",
    (value) => {
      expect(() =>
        readUsageLimits((name) =>
          name === "AI_GLOBAL_PER_MINUTE" ? value : "1",
        ),
      ).toThrow("unavailable or unsafe");
    },
  );
});
