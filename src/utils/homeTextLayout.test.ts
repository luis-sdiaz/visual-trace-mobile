import { describe, expect, it } from "vitest";

import {
  getHomeFilterTextMinWidth,
  getHomeSignOutTextMinWidth,
  getHomeStatusTextMinWidth,
} from "./homeTextLayout";

describe("Home Android text width reservations", () => {
  it("reserves complete labels for the top bar and status filters", () => {
    expect(getHomeSignOutTextMinWidth(1)).toBe(88);
    expect(getHomeFilterTextMinWidth(null, 1)).toBe(48);
    expect(getHomeFilterTextMinWidth("draft", 1)).toBe(84);
    expect(getHomeFilterTextMinWidth("ready", 1)).toBe(48);
    expect(getHomeFilterTextMinWidth("analyzed", 1)).toBe(76);
  });

  it("reserves complete status labels without compressing history names", () => {
    expect(getHomeStatusTextMinWidth("draft", 1)).toBe(60);
    expect(getHomeStatusTextMinWidth("ready", 1)).toBe(36);
    expect(getHomeStatusTextMinWidth("analyzed", 1)).toBe(60);
  });

  it("grows reservations with the system font scale", () => {
    expect(getHomeSignOutTextMinWidth(1.3)).toBe(115);
    expect(getHomeFilterTextMinWidth("draft", 1.3)).toBe(110);
    expect(getHomeStatusTextMinWidth("analyzed", 1.3)).toBe(78);
  });
});
