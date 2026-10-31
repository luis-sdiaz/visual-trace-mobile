import * as FileSystem from "expo-file-system/legacy";
import { Paths } from "expo-file-system";

export const CACHE_DIRECTORY_NAME = "vt-image-cache";

// 24 horas por defecto para archivos temporales de vista previa y exportación
export const DEFAULT_MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

// 50 MB de cuota máxima de caché local antes de disparar rotación LRU
export const DEFAULT_MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024;

export type CacheMetrics = {
  totalSizeBytes: number;
  fileCount: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
};

export type PurgeOptions = {
  maxAgeMs?: number;
  maxSizeBytes?: number;
};

export type PurgeResult = {
  deletedCount: number;
  freedBytes: number;
  remainingBytes: number;
  remainingCount: number;
};

type FileCacheEntry = {
  uri: string;
  name: string;
  size: number;
  modificationTime: number;
};

export function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function getImageCacheDirectory(): string | null {
  const cachePath =
    Paths.cache?.uri ??
    (FileSystem as unknown as { cacheDirectory?: string }).cacheDirectory ??
    null;

  if (!cachePath) {
    return null;
  }
  const base = cachePath.endsWith("/") ? cachePath : `${cachePath}/`;
  return `${base}${CACHE_DIRECTORY_NAME}/`;
}

export async function ensureCacheDirectory(): Promise<string | null> {
  const dir = getImageCacheDirectory();
  if (!dir) return null;

  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
  } catch {
    return null;
  }
}

export async function getImageCacheMetrics(): Promise<CacheMetrics> {
  const dir = getImageCacheDirectory();
  if (!dir) {
    return {
      totalSizeBytes: 0,
      fileCount: 0,
      oldestTimestamp: null,
      newestTimestamp: null,
    };
  }

  try {
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      return {
        totalSizeBytes: 0,
        fileCount: 0,
        oldestTimestamp: null,
        newestTimestamp: null,
      };
    }

    const files = await FileSystem.readDirectoryAsync(dir);
    let totalSizeBytes = 0;
    let fileCount = 0;
    let oldestTimestamp: number | null = null;
    let newestTimestamp: number | null = null;

    for (const file of files) {
      const fileUri = `${dir}${file}`;
      try {
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists && !fileInfo.isDirectory) {
          fileCount++;
          const size = fileInfo.size ?? 0;
          totalSizeBytes += size;

          const modTime = fileInfo.modificationTime
            ? fileInfo.modificationTime * 1000
            : Date.now();

          if (oldestTimestamp === null || modTime < oldestTimestamp) {
            oldestTimestamp = modTime;
          }
          if (newestTimestamp === null || modTime > newestTimestamp) {
            newestTimestamp = modTime;
          }
        }
      } catch {
        // Ignorar archivo individual si se produjo un error al consultar su estado
      }
    }

    return {
      totalSizeBytes,
      fileCount,
      oldestTimestamp,
      newestTimestamp,
    };
  } catch {
    return {
      totalSizeBytes: 0,
      fileCount: 0,
      oldestTimestamp: null,
      newestTimestamp: null,
    };
  }
}

export async function purgeOldImageCache(
  options?: PurgeOptions,
): Promise<PurgeResult> {
  const dir = getImageCacheDirectory();
  if (!dir) {
    return {
      deletedCount: 0,
      freedBytes: 0,
      remainingBytes: 0,
      remainingCount: 0,
    };
  }

  const maxAgeMs = options?.maxAgeMs ?? DEFAULT_MAX_CACHE_AGE_MS;
  const maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_MAX_CACHE_SIZE_BYTES;

  try {
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      return {
        deletedCount: 0,
        freedBytes: 0,
        remainingBytes: 0,
        remainingCount: 0,
      };
    }

    const files = await FileSystem.readDirectoryAsync(dir);
    const entries: FileCacheEntry[] = [];

    for (const file of files) {
      const fileUri = `${dir}${file}`;
      try {
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists && !fileInfo.isDirectory) {
          entries.push({
            uri: fileUri,
            name: file,
            size: fileInfo.size ?? 0,
            modificationTime: fileInfo.modificationTime
              ? fileInfo.modificationTime * 1000
              : Date.now(),
          });
        }
      } catch {
        // Continuar
      }
    }

    // Ordenar de más antiguo a más reciente
    entries.sort((a, b) => a.modificationTime - b.modificationTime);

    const now = Date.now();
    let deletedCount = 0;
    let freedBytes = 0;
    const remainingEntries: FileCacheEntry[] = [];

    // Paso 1: Eliminar archivos que superen la edad máxima permitida
    for (const entry of entries) {
      const age = now - entry.modificationTime;
      if (age > maxAgeMs) {
        try {
          await FileSystem.deleteAsync(entry.uri, { idempotent: true });
          deletedCount++;
          freedBytes += entry.size;
        } catch {
          remainingEntries.push(entry);
        }
      } else {
        remainingEntries.push(entry);
      }
    }

    // Paso 2: Rotación LRU si el tamaño total restante excede la cuota permitida
    let currentTotalSize = remainingEntries.reduce((sum, e) => sum + e.size, 0);

    const finalEntries: FileCacheEntry[] = [];
    for (const entry of remainingEntries) {
      if (currentTotalSize > maxSizeBytes) {
        try {
          await FileSystem.deleteAsync(entry.uri, { idempotent: true });
          deletedCount++;
          freedBytes += entry.size;
          currentTotalSize -= entry.size;
        } catch {
          finalEntries.push(entry);
        }
      } else {
        finalEntries.push(entry);
      }
    }

    return {
      deletedCount,
      freedBytes,
      remainingBytes: Math.max(0, currentTotalSize),
      remainingCount: finalEntries.length,
    };
  } catch {
    return {
      deletedCount: 0,
      freedBytes: 0,
      remainingBytes: 0,
      remainingCount: 0,
    };
  }
}

export async function clearAllImageCache(): Promise<PurgeResult> {
  const dir = getImageCacheDirectory();
  if (!dir) {
    return {
      deletedCount: 0,
      freedBytes: 0,
      remainingBytes: 0,
      remainingCount: 0,
    };
  }

  try {
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      return {
        deletedCount: 0,
        freedBytes: 0,
        remainingBytes: 0,
        remainingCount: 0,
      };
    }

    const files = await FileSystem.readDirectoryAsync(dir);
    let deletedCount = 0;
    let freedBytes = 0;

    for (const file of files) {
      const fileUri = `${dir}${file}`;
      try {
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        const size = fileInfo.exists ? (fileInfo.size ?? 0) : 0;
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        deletedCount++;
        freedBytes += size;
      } catch {
        // Continuar limpiando el resto
      }
    }

    return {
      deletedCount,
      freedBytes,
      remainingBytes: 0,
      remainingCount: 0,
    };
  } catch {
    return {
      deletedCount: 0,
      freedBytes: 0,
      remainingBytes: 0,
      remainingCount: 0,
    };
  }
}
