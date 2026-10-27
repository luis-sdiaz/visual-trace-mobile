import { beforeEach, describe, expect, it, vi } from "vitest";
import * as FileSystem from "expo-file-system";

import {
  clearAllImageCache,
  ensureCacheDirectory,
  formatBytes,
  getImageCacheDirectory,
  getImageCacheMetrics,
  purgeOldImageCache,
} from "./imageCacheService";

vi.mock("expo-file-system", () => ({
  Paths: {
    cache: {
      uri: "file:///mock/cache/",
    },
  },
  cacheDirectory: "file:///mock/cache/",
  getInfoAsync: vi.fn(),
  readDirectoryAsync: vi.fn(),
  makeDirectoryAsync: vi.fn(),
  deleteAsync: vi.fn(),
}));

describe("imageCacheService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("formatBytes", () => {
    it("formats bytes into human readable units", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(-10)).toBe("0 B");
      expect(formatBytes(500)).toBe("500 B");
      expect(formatBytes(1024)).toBe("1.0 KB");
      expect(formatBytes(1024 * 1024 * 2.5)).toBe("2.5 MB");
      expect(formatBytes(1024 * 1024 * 1024 * 3.2)).toBe("3.2 GB");
    });
  });

  describe("getImageCacheDirectory", () => {
    it("returns formatted cache directory path", () => {
      const dir = getImageCacheDirectory();
      expect(dir).toBe("file:///mock/cache/vt-image-cache/");
    });
  });

  describe("ensureCacheDirectory", () => {
    it("creates directory if it does not exist", async () => {
      vi.mocked(FileSystem.getInfoAsync).mockResolvedValueOnce({
        exists: false,
        isDirectory: false,
        uri: "file:///mock/cache/vt-image-cache/",
      });
      vi.mocked(FileSystem.makeDirectoryAsync).mockResolvedValueOnce();

      const dir = await ensureCacheDirectory();
      expect(dir).toBe("file:///mock/cache/vt-image-cache/");
      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        "file:///mock/cache/vt-image-cache/",
        { intermediates: true },
      );
    });

    it("does not create directory if it already exists", async () => {
      vi.mocked(FileSystem.getInfoAsync).mockResolvedValueOnce({
        exists: true,
        isDirectory: true,
        uri: "file:///mock/cache/vt-image-cache/",
        size: 0,
        modificationTime: 0,
      });

      const dir = await ensureCacheDirectory();
      expect(dir).toBe("file:///mock/cache/vt-image-cache/");
      expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
    });
  });

  describe("getImageCacheMetrics", () => {
    it("returns zero metrics if directory does not exist", async () => {
      vi.mocked(FileSystem.getInfoAsync).mockResolvedValueOnce({
        exists: false,
        isDirectory: false,
        uri: "file:///mock/cache/vt-image-cache/",
      });

      const metrics = await getImageCacheMetrics();
      expect(metrics).toEqual({
        totalSizeBytes: 0,
        fileCount: 0,
        oldestTimestamp: null,
        newestTimestamp: null,
      });
    });

    it("aggregates file count and size correctly", async () => {
      vi.mocked(FileSystem.getInfoAsync).mockResolvedValueOnce({
        exists: true,
        isDirectory: true,
        uri: "file:///mock/cache/vt-image-cache/",
        size: 0,
        modificationTime: 0,
      });
      vi.mocked(FileSystem.readDirectoryAsync).mockResolvedValueOnce([
        "file1.jpg",
        "file2.png",
      ]);

      vi.mocked(FileSystem.getInfoAsync)
        .mockResolvedValueOnce({
          exists: true,
          isDirectory: false,
          uri: "file:///mock/cache/vt-image-cache/file1.jpg",
          size: 1000,
          modificationTime: 100000,
        })
        .mockResolvedValueOnce({
          exists: true,
          isDirectory: false,
          uri: "file:///mock/cache/vt-image-cache/file2.png",
          size: 2000,
          modificationTime: 200000,
        });

      const metrics = await getImageCacheMetrics();
      expect(metrics.fileCount).toBe(2);
      expect(metrics.totalSizeBytes).toBe(3000);
      expect(metrics.oldestTimestamp).toBe(100000 * 1000);
      expect(metrics.newestTimestamp).toBe(200000 * 1000);
    });
  });

  describe("purgeOldImageCache", () => {
    it("purges files older than maxAgeMs", async () => {
      const now = Date.now();
      const oneHourAgoSec = (now - 3600 * 1000) / 1000;
      const threeDaysAgoSec = (now - 3 * 24 * 3600 * 1000) / 1000;

      vi.mocked(FileSystem.getInfoAsync).mockResolvedValueOnce({
        exists: true,
        isDirectory: true,
        uri: "file:///mock/cache/vt-image-cache/",
        size: 0,
        modificationTime: 0,
      });
      vi.mocked(FileSystem.readDirectoryAsync).mockResolvedValueOnce([
        "old_file.jpg",
        "fresh_file.jpg",
      ]);

      vi.mocked(FileSystem.getInfoAsync)
        .mockResolvedValueOnce({
          exists: true,
          isDirectory: false,
          uri: "file:///mock/cache/vt-image-cache/old_file.jpg",
          size: 5000,
          modificationTime: threeDaysAgoSec,
        })
        .mockResolvedValueOnce({
          exists: true,
          isDirectory: false,
          uri: "file:///mock/cache/vt-image-cache/fresh_file.jpg",
          size: 3000,
          modificationTime: oneHourAgoSec,
        });

      vi.mocked(FileSystem.deleteAsync).mockResolvedValueOnce();

      const result = await purgeOldImageCache({
        maxAgeMs: 24 * 3600 * 1000, // 1 day
        maxSizeBytes: 50 * 1024 * 1024,
      });

      expect(result.deletedCount).toBe(1);
      expect(result.freedBytes).toBe(5000);
      expect(result.remainingCount).toBe(1);
      expect(result.remainingBytes).toBe(3000);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        "file:///mock/cache/vt-image-cache/old_file.jpg",
        { idempotent: true },
      );
    });

    it("purges excess files using LRU rotation when total size exceeds quota", async () => {
      const now = Date.now();
      const sec = now / 1000;

      vi.mocked(FileSystem.getInfoAsync).mockResolvedValueOnce({
        exists: true,
        isDirectory: true,
        uri: "file:///mock/cache/vt-image-cache/",
        size: 0,
        modificationTime: 0,
      });
      vi.mocked(FileSystem.readDirectoryAsync).mockResolvedValueOnce([
        "file1.jpg",
        "file2.jpg",
      ]);

      vi.mocked(FileSystem.getInfoAsync)
        .mockResolvedValueOnce({
          exists: true,
          isDirectory: false,
          uri: "file:///mock/cache/vt-image-cache/file1.jpg",
          size: 4000,
          modificationTime: sec - 100, // Older
        })
        .mockResolvedValueOnce({
          exists: true,
          isDirectory: false,
          uri: "file:///mock/cache/vt-image-cache/file2.jpg",
          size: 4000,
          modificationTime: sec - 10, // Newer
        });

      vi.mocked(FileSystem.deleteAsync).mockResolvedValueOnce();

      // Total is 8000 bytes, but maxSizeBytes is 5000 bytes.
      // It should delete the older file (file1.jpg, 4000 bytes), leaving 4000 bytes.
      const result = await purgeOldImageCache({
        maxAgeMs: 24 * 3600 * 1000,
        maxSizeBytes: 5000,
      });

      expect(result.deletedCount).toBe(1);
      expect(result.freedBytes).toBe(4000);
      expect(result.remainingCount).toBe(1);
      expect(result.remainingBytes).toBe(4000);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        "file:///mock/cache/vt-image-cache/file1.jpg",
        { idempotent: true },
      );
    });
  });

  describe("clearAllImageCache", () => {
    it("deletes all cached files in directory", async () => {
      vi.mocked(FileSystem.getInfoAsync).mockResolvedValueOnce({
        exists: true,
        isDirectory: true,
        uri: "file:///mock/cache/vt-image-cache/",
        size: 0,
        modificationTime: 0,
      });
      vi.mocked(FileSystem.readDirectoryAsync).mockResolvedValueOnce([
        "file1.jpg",
        "file2.png",
      ]);

      vi.mocked(FileSystem.getInfoAsync)
        .mockResolvedValueOnce({
          exists: true,
          isDirectory: false,
          uri: "file:///mock/cache/vt-image-cache/file1.jpg",
          size: 1500,
          modificationTime: 0,
        })
        .mockResolvedValueOnce({
          exists: true,
          isDirectory: false,
          uri: "file:///mock/cache/vt-image-cache/file2.png",
          size: 2500,
          modificationTime: 0,
        });

      vi.mocked(FileSystem.deleteAsync).mockResolvedValue();

      const result = await clearAllImageCache();
      expect(result.deletedCount).toBe(2);
      expect(result.freedBytes).toBe(4000);
      expect(result.remainingCount).toBe(0);
      expect(result.remainingBytes).toBe(0);
    });
  });
});

