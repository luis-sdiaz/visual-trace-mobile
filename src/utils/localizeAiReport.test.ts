import { describe, expect, it } from "vitest";

import { localizeAiReportList, localizeAiReportText } from "./localizeAiReport";

describe("localizeAiReport", () => {
  it("translates known persisted report text without changing unknown text", () => {
    const known = { "Texto antiguo": "Translated text" };

    expect(localizeAiReportText("Texto antiguo", known)).toBe("Translated text");
    expect(localizeAiReportText("Generated observation", known)).toBe("Generated observation");
  });

  it("localizes every known item in a report list", () => {
    expect(
      localizeAiReportList(["Uno", "Dos"], { Uno: "One", Dos: "Two" }),
    ).toEqual(["One", "Two"]);
  });
});
