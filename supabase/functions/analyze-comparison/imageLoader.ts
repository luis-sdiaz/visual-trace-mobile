import { COMPARISON_IMAGE_LIMITS } from "../_shared/comparisonImages.ts";

import type { AuthorizedComparison } from "./handler.ts";

export const MAX_AI_IMAGE_BYTES = COMPARISON_IMAGE_LIMITS.maxBytesPerImage;
export const MAX_AI_IMAGE_PAIR_BYTES = COMPARISON_IMAGE_LIMITS.maxBytesPerPair;

export type PreparedComparisonImage = {
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif";
  path: string;
};

export class ComparisonImageError extends Error {
  constructor(
    public readonly code:
      | "invalid_image_path"
      | "image_not_found"
      | "invalid_image_type"
      | "image_too_large",
    message: string,
  ) {
    super(message);
    this.name = "ComparisonImageError";
  }
}

type DownloadedImage = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  type?: string;
  size?: number;
};

type DownloadImage = (path: string) => Promise<DownloadedImage | null>;

const MIME_BY_EXTENSION: Record<string, PreparedComparisonImage["mimeType"]> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

function hasPrefix(bytes: Uint8Array, expected: number[]): boolean {
  return expected.every((value, index) => bytes[index] === value);
}

function detectMimeType(bytes: Uint8Array): PreparedComparisonImage["mimeType"] | null {
  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
    const brand = String.fromCharCode(...bytes.slice(8, 12)).toLowerCase();
    if (brand.startsWith("hei") || brand === "mif1" || brand === "msf1") {
      return brand === "heic" || brand === "heix" ? "image/heic" : "image/heif";
    }
  }
  return null;
}

function validateStoredPath(
  path: string,
  userId: string,
  comparisonId: string,
  stage: "initial" | "final",
): PreparedComparisonImage["mimeType"] {
  const escapedPrefix = `${userId}/${comparisonId}/${stage}`;
  const match = path.match(/\.([a-z0-9]+)$/i);
  const extension = match?.[1].toLowerCase();
  const mimeType = extension ? MIME_BY_EXTENSION[extension] : undefined;
  const hasExpectedName =
    path === `${escapedPrefix}.${extension}` ||
    path.startsWith(`${escapedPrefix}-`);

  if (!mimeType || !hasExpectedName || path.includes("..") || path.includes("\\")) {
    throw new ComparisonImageError(
      "invalid_image_path",
      `La ruta de la fotografía ${stage} no es válida.`,
    );
  }

  return mimeType;
}

async function loadOne(
  path: string,
  expectedMimeType: PreparedComparisonImage["mimeType"],
  download: DownloadImage,
): Promise<PreparedComparisonImage> {
  let file: DownloadedImage | null;

  try {
    file = await download(path);
  } catch {
    throw new ComparisonImageError("image_not_found", "No fue posible leer una fotografía privada.");
  }

  if (!file) {
    throw new ComparisonImageError("image_not_found", "No se encontró una fotografía privada.");
  }

  if (typeof file.size === "number" && file.size > MAX_AI_IMAGE_BYTES) {
    throw new ComparisonImageError("image_too_large", "Una fotografía supera el tamaño permitido.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes.length === 0) {
    throw new ComparisonImageError("invalid_image_type", "Una fotografía está vacía.");
  }
  if (bytes.length > MAX_AI_IMAGE_BYTES) {
    throw new ComparisonImageError("image_too_large", "Una fotografía supera el tamaño permitido.");
  }

  const detectedMimeType = detectMimeType(bytes);
  const headerMimeType = file.type?.split(";")[0].trim().toLowerCase();

  if (
    !detectedMimeType ||
    detectedMimeType !== expectedMimeType ||
    (headerMimeType && headerMimeType !== expectedMimeType)
  ) {
    throw new ComparisonImageError(
      "invalid_image_type",
      "El contenido de una fotografía no coincide con un formato admitido.",
    );
  }

  return { bytes, mimeType: detectedMimeType, path };
}

export async function loadAuthorizedComparisonImages(
  comparison: AuthorizedComparison,
  download: DownloadImage,
): Promise<{ initial: PreparedComparisonImage; final: PreparedComparisonImage }> {
  if (!comparison.initial_image_path || !comparison.final_image_path) {
    throw new ComparisonImageError("image_not_found", "Faltan fotografías en la comparación.");
  }

  const initialMime = validateStoredPath(
    comparison.initial_image_path,
    comparison.user_id,
    comparison.id,
    "initial",
  );
  const finalMime = validateStoredPath(
    comparison.final_image_path,
    comparison.user_id,
    comparison.id,
    "final",
  );
  const [initial, final] = await Promise.all([
    loadOne(comparison.initial_image_path, initialMime, download),
    loadOne(comparison.final_image_path, finalMime, download),
  ]);

  if (initial.bytes.length + final.bytes.length > MAX_AI_IMAGE_PAIR_BYTES) {
    throw new ComparisonImageError("image_too_large", "Las fotografías superan el tamaño total permitido.");
  }

  return { initial, final };
}
