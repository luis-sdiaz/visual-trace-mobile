import { describe, expect, it } from "vitest";

import { getAccountGreeting } from "@/utils/accountDisplay";

describe("getAccountGreeting", () => {
  it("uses the first normalized name when valid", () => {
    expect(getAccountGreeting({ full_name: "  Luis   Díaz " })).toBe(
      "Hola, Luis",
    );
  });

  it("uses a private fallback when a name is missing", () => {
    expect(getAccountGreeting({})).toBe("Hola de nuevo");
    expect(getAccountGreeting(null)).toBe("Hola de nuevo");
  });

  it("does not display email-like metadata as a name", () => {
    expect(getAccountGreeting({ full_name: "user@example.com" })).toBe(
      "Hola de nuevo",
    );
  });
});
