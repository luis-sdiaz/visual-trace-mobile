import { describe, expect, it } from "vitest";

import { getLayoutTextStyle } from "./LayoutText";

describe("LayoutText", () => {
  it("keeps the intrinsic layout opt-in and unchanged", () => {
    expect(getLayoutTextStyle("intrinsic")).toBeUndefined();
  });

  it.each([
    ["fullWidth", { width: "100%", minWidth: 0, flexShrink: 1 }],
    ["flexible", { flex: 1, minWidth: 0, flexShrink: 1 }],
    ["stretch", { alignSelf: "stretch", minWidth: 0, flexShrink: 1 }],
  ] as const)("provides the %s layout contract", (variant, expected) => {
    expect(getLayoutTextStyle(variant)).toMatchObject(expected);
  });

  it("does not impose truncation or sizing on atomic text", () => {
    expect(getLayoutTextStyle("atomic")).toBeUndefined();
  });
});
