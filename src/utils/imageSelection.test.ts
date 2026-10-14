import { describe, expect, it } from "vitest";

import { getSelectedImageUri } from "@/utils/imageSelection";

describe("getSelectedImageUri", () => {
  it("returns no image when selection is canceled", () => {
    expect(getSelectedImageUri({ canceled: true })).toBeNull();
  });

  it("returns the local URI only after a completed selection", () => {
    expect(
      getSelectedImageUri({
        canceled: false,
        assets: [{ uri: "file:///replacement.jpg" }],
      }),
    ).toBe("file:///replacement.jpg");
  });
});
