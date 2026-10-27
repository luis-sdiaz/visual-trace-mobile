import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StorageUsageBanner } from "./StorageUsageBanner";
import * as imageCacheService from "@/services/imageCacheService";

vi.mock("@/services/imageCacheService", () => ({
  formatBytes: (b: number) => `${(b / 1024).toFixed(1)} KB`,
  getImageCacheMetrics: vi.fn(),
  clearAllImageCache: vi.fn(),
}));

describe("StorageUsageBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders storage usage banner with title and metrics container", () => {
    vi.mocked(imageCacheService.getImageCacheMetrics).mockResolvedValueOnce({
      totalSizeBytes: 2048,
      fileCount: 2,
      oldestTimestamp: null,
      newestTimestamp: null,
    });

    const html = renderToStaticMarkup(<StorageUsageBanner />);

    expect(html).toContain("storage-usage-banner");
    expect(html).toContain("Almacenamiento temporal");
  });

  it("renders clear button when there are cached files", async () => {
    vi.mocked(imageCacheService.getImageCacheMetrics).mockResolvedValueOnce({
      totalSizeBytes: 5120,
      fileCount: 3,
      oldestTimestamp: null,
      newestTimestamp: null,
    });

    const html = renderToStaticMarkup(<StorageUsageBanner />);
    expect(html).toContain("storage-usage-banner");
  });

  it("respects showClearButton={false} prop", () => {
    vi.mocked(imageCacheService.getImageCacheMetrics).mockResolvedValueOnce({
      totalSizeBytes: 5120,
      fileCount: 3,
      oldestTimestamp: null,
      newestTimestamp: null,
    });

    const html = renderToStaticMarkup(
      <StorageUsageBanner showClearButton={false} />,
    );

    expect(html).not.toContain("clear-cache-button");
  });
});

