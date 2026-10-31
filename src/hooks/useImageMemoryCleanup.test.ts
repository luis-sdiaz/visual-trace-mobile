import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as FileSystem from "expo-file-system/legacy";

import { useImageMemoryCleanup } from "./useImageMemoryCleanup";

vi.mock("expo-file-system/legacy", () => ({
  deleteAsync: vi.fn().mockResolvedValue(undefined),
}));

describe("useImageMemoryCleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters and initializes with valid non-empty URIs", () => {
    const hookResult: { current: ReturnType<typeof useImageMemoryCleanup> | null } = {
      current: null,
    };

    function TestComponent() {
      hookResult.current = useImageMemoryCleanup([
        "file:///image1.jpg",
        null,
        "",
        "   ",
        "file:///image2.png",
      ]);
      return null;
    }

    renderToStaticMarkup(React.createElement(TestComponent));

    expect(hookResult.current).not.toBeNull();
    expect(hookResult.current?.trackedUris).toEqual([
      "file:///image1.jpg",
      "file:///image2.png",
    ]);
  });

  it("allows registering and unregistering URIs dynamically", () => {
    const hookResult: { current: ReturnType<typeof useImageMemoryCleanup> | null } = {
      current: null,
    };

    function TestComponent() {
      hookResult.current = useImageMemoryCleanup([]);
      return null;
    }

    renderToStaticMarkup(React.createElement(TestComponent));

    hookResult.current?.registerUri("file:///dynamic.jpg");
    // Duplicate registration should be ignored
    hookResult.current?.registerUri("file:///dynamic.jpg");
    hookResult.current?.registerUri(null);

    expect(hookResult.current?.trackedUris).toContain("file:///dynamic.jpg");

    hookResult.current?.unregisterUri("file:///dynamic.jpg");
    expect(hookResult.current?.trackedUris).not.toContain("file:///dynamic.jpg");
  });

  it("cleans up tracked file system cache URIs when deleteTemporaryFiles is enabled", async () => {
    const hookResult: { current: ReturnType<typeof useImageMemoryCleanup> | null } = {
      current: null,
    };

    function TestComponent() {
      hookResult.current = useImageMemoryCleanup(
        ["file:///cache/preview1.jpg", "file:///cache/preview2.jpg"],
        { deleteTemporaryFiles: true },
      );
      return null;
    }

    renderToStaticMarkup(React.createElement(TestComponent));

    const cleaned = await hookResult.current?.cleanupNow();
    expect(cleaned).toBe(2);
    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(2);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "file:///cache/preview1.jpg",
      { idempotent: true },
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "file:///cache/preview2.jpg",
      { idempotent: true },
    );
    expect(hookResult.current?.trackedUris).toEqual([]);
  });

  it("revokes object URLs if in a browser environment", async () => {
    const revokeMock = vi.fn();
    const originalUrl = globalThis.URL;
    // @ts-expect-error Mocking window.URL.revokeObjectURL for test
    globalThis.URL = { revokeObjectURL: revokeMock };

    try {
      const hookResult: { current: ReturnType<typeof useImageMemoryCleanup> | null } = {
        current: null,
      };

      function TestComponent() {
        hookResult.current = useImageMemoryCleanup(["blob:http://localhost/uuid-123"]);
        return null;
      }

      renderToStaticMarkup(React.createElement(TestComponent));

      const cleaned = await hookResult.current?.cleanupNow();
      expect(cleaned).toBe(1);
      expect(revokeMock).toHaveBeenCalledWith("blob:http://localhost/uuid-123");
    } finally {
      globalThis.URL = originalUrl;
    }
  });
});
