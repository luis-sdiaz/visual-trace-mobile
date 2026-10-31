type ImagePickerSelectionResult =
  | { canceled: true }
  | { canceled: false; assets: { uri: string }[] };

export function getSelectedImageUri(
  result: ImagePickerSelectionResult,
): string | null {
  if (result.canceled) {
    return null;
  }

  return result.assets[0]?.uri ?? null;
}

export type PhotoSelectionSource = "camera" | "library";

export type PhotoSelectionOutcome =
  | { status: "permission_denied" }
  | { status: "canceled" }
  | { status: "selected"; uri: string };

export const DEFAULT_IMAGE_COMPRESSION_QUALITY = 0.7;
export const MIN_IMAGE_COMPRESSION_QUALITY = 0.3;
export const MAX_IMAGE_COMPRESSION_QUALITY = 0.95;

export type PhotoSelectionOptions = {
  quality?: number;
  allowsEditing?: boolean;
};

export type PhotoPickerPort = {
  requestCameraPermissionsAsync: () => Promise<{ granted: boolean }>;
  requestMediaLibraryPermissionsAsync: () => Promise<{ granted: boolean }>;
  launchCameraAsync: (options: {
    mediaTypes: ["images"];
    quality: number;
    allowsEditing?: boolean;
  }) => Promise<ImagePickerSelectionResult>;
  launchImageLibraryAsync: (options: {
    mediaTypes: ["images"];
    quality: number;
    allowsEditing?: boolean;
  }) => Promise<ImagePickerSelectionResult>;
};

/**
 * Valida y restringe el factor de compresión JPEG a un rango seguro (0.3 a 0.95),
 * asegurando una óptima relación entre nitidez visual para IA y peso en memoria/disco.
 */
export function sanitizeCompressionQuality(quality?: number | null): number {
  if (quality === undefined || quality === null || isNaN(quality)) {
    return DEFAULT_IMAGE_COMPRESSION_QUALITY;
  }
  return Math.min(
    MAX_IMAGE_COMPRESSION_QUALITY,
    Math.max(MIN_IMAGE_COMPRESSION_QUALITY, quality),
  );
}

export async function selectComparisonPhoto(
  source: PhotoSelectionSource,
  picker: PhotoPickerPort,
  options?: PhotoSelectionOptions,
): Promise<PhotoSelectionOutcome> {
  const permission =
    source === "camera"
      ? await picker.requestCameraPermissionsAsync()
      : await picker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) return { status: "permission_denied" };

  const quality = sanitizeCompressionQuality(options?.quality);
  const pickerOptions = {
    mediaTypes: ["images"] as ["images"],
    quality,
    ...(options?.allowsEditing !== undefined
      ? { allowsEditing: options.allowsEditing }
      : {}),
  };

  const result =
    source === "camera"
      ? await picker.launchCameraAsync(pickerOptions)
      : await picker.launchImageLibraryAsync(pickerOptions);
  const uri = getSelectedImageUri(result);

  return uri ? { status: "selected", uri } : { status: "canceled" };
}
