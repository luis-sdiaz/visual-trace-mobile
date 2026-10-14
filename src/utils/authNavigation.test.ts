import { describe, expect, it } from "vitest";

import { getAuthRouteAccess } from "@/utils/authNavigation";

describe("getAuthRouteAccess", () => {
  it("keeps authenticated users out of guest routes", () => {
    expect(getAuthRouteAccess(true)).toEqual({
      canAccessAuthenticatedRoutes: true,
      canAccessGuestRoutes: false,
    });
  });

  it("keeps signed-out users out of authenticated routes", () => {
    expect(getAuthRouteAccess(false)).toEqual({
      canAccessAuthenticatedRoutes: false,
      canAccessGuestRoutes: true,
    });
  });
});
