import { useCallback, useEffect, useRef, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";

export type MemoryCleanupOptions = {
  autoCleanOnUnmount?: boolean;
  deleteTemporaryFiles?: boolean;
};

/**
 * Hook para monitorear y liberar recursos de memoria asociados a imágenes y vistas previas.
 * - Revoca Object URLs (blob:).
 * - Elimina de forma idempotente archivos temporales en caché al desmontar o purgar.
 * - Mantiene el control de referencias para evitar fugas de memoria en sesiones prolongadas.
 */
export function useImageMemoryCleanup(
  initialUris: (string | null | undefined)[] = [],
  options?: MemoryCleanupOptions,
) {
  const autoCleanOnUnmount = options?.autoCleanOnUnmount ?? true;
  const deleteTemporaryFiles = options?.deleteTemporaryFiles ?? false;

  const validInitials = initialUris.filter((uri): uri is string =>
    Boolean(uri && uri.trim().length > 0),
  );

  const [, setRevision] = useState(0);
  const trackedUrisRef = useRef<Set<string>>(new Set(validInitials));
  const isMountedRef = useRef(true);

  const registerUri = useCallback(
    (uri: string | null | undefined) => {
      if (!uri || typeof uri !== "string" || uri.trim().length === 0) return;
      const cleanUri = uri.trim();
      if (trackedUrisRef.current.has(cleanUri)) return;

      trackedUrisRef.current.add(cleanUri);
      if (isMountedRef.current) {
        setRevision((r) => r + 1);
      }
    },
    [setRevision],
  );

  const unregisterUri = useCallback(
    (uri: string) => {
      if (!trackedUrisRef.current.has(uri)) return;
      trackedUrisRef.current.delete(uri);
      if (isMountedRef.current) {
        setRevision((r) => r + 1);
      }
    },
    [setRevision],
  );

  const cleanupNow = useCallback(async (): Promise<number> => {
    let cleanedCount = 0;
    const urisToClean = Array.from(trackedUrisRef.current);

    // Detección universal de la API URL
    const urlApi =
      typeof window !== "undefined" && window.URL
        ? window.URL
        : typeof globalThis !== "undefined" && globalThis.URL
          ? globalThis.URL
          : null;

    for (const uri of urisToClean) {
      try {
        // 1. Si es un Object URL de blob (web/híbrido)
        if (
          urlApi &&
          typeof urlApi.revokeObjectURL === "function" &&
          uri.startsWith("blob:")
        ) {
          urlApi.revokeObjectURL(uri);
          cleanedCount++;
        }
        // 2. Si es un archivo temporal en caché que se solicitó borrar
        else if (
          deleteTemporaryFiles &&
          (uri.includes("cache") || uri.includes("vt-image-cache") || uri.startsWith("file://"))
        ) {
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
            cleanedCount++;
          } catch {
            // Continuar con los demás
          }
        } else {
          cleanedCount++;
        }
      } catch {
        // Continuar
      }
    }

    trackedUrisRef.current.clear();
    if (isMountedRef.current) {
      setRevision((r) => r + 1);
    }

    return cleanedCount;
  }, [deleteTemporaryFiles, setRevision]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (autoCleanOnUnmount) {
        void cleanupNow();
      }
    };
  }, [autoCleanOnUnmount, cleanupNow]);

  return {
    get trackedUris() {
      return Array.from(trackedUrisRef.current);
    },
    registerUri,
    unregisterUri,
    cleanupNow,
  };
}
