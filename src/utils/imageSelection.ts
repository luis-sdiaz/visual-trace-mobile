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
