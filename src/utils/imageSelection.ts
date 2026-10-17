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

type PhotoPickerPort = {
  requestCameraPermissionsAsync: () => Promise<{ granted: boolean }>;
  requestMediaLibraryPermissionsAsync: () => Promise<{ granted: boolean }>;
  launchCameraAsync: (options: {
    mediaTypes: ["images"];
    quality: number;
  }) => Promise<ImagePickerSelectionResult>;
  launchImageLibraryAsync: (options: {
    mediaTypes: ["images"];
    quality: number;
  }) => Promise<ImagePickerSelectionResult>;
};

const PICKER_OPTIONS: { mediaTypes: ["images"]; quality: number } = {
  mediaTypes: ["images"],
  quality: 0.8,
};

export async function selectComparisonPhoto(
  source: PhotoSelectionSource,
  picker: PhotoPickerPort,
): Promise<PhotoSelectionOutcome> {
  const permission =
    source === "camera"
      ? await picker.requestCameraPermissionsAsync()
      : await picker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) return { status: "permission_denied" };

  const result =
    source === "camera"
      ? await picker.launchCameraAsync(PICKER_OPTIONS)
      : await picker.launchImageLibraryAsync(PICKER_OPTIONS);
  const uri = getSelectedImageUri(result);

  return uri ? { status: "selected", uri } : { status: "canceled" };
}
