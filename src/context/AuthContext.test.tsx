import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, handleSessionCachePurge, useAuth } from "./AuthContext";
import * as imageCacheService from "@/services/imageCacheService";

vi.mock("@/services/imageCacheService", () => ({
  purgeOldImageCache: vi.fn().mockResolvedValue({
    deletedCount: 2,
    freedBytes: 1024,
    remainingBytes: 0,
    remainingCount: 0,
  }),
}));

vi.mock("@/services/authSessionService", () => ({
  observeAuthSession: vi.fn((_auth, callback) => {
    callback({ session: null, isLoading: false });
    return () => {};
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe("AuthContext with image cache purge integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handleSessionCachePurge triggers purgeOldImageCache safely", async () => {
    await handleSessionCachePurge();
    expect(imageCacheService.purgeOldImageCache).toHaveBeenCalledTimes(1);
  });

  it("handleSessionCachePurge handles errors gracefully without throwing", async () => {
    vi.mocked(imageCacheService.purgeOldImageCache).mockRejectedValueOnce(
      new Error("Disk error"),
    );

    await expect(handleSessionCachePurge()).resolves.toBeUndefined();
  });

  it("renders AuthProvider and provides default context values to children", () => {
    function Consumer() {
      const { isLoading } = useAuth();
      return <div>Loading: {String(isLoading)}</div>;
    }

    const html = renderToStaticMarkup(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(html).toContain("Loading: true");
  });

  it("throws when useAuth is consumed outside of AuthProvider", () => {
    function InvalidConsumer() {
      useAuth();
      return null;
    }

    expect(() => renderToStaticMarkup(<InvalidConsumer />)).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });
});

