import type { ImageStage } from "@/services/imageStorageService";

export const COMPARISON_IMAGE_EXTENSIONS = [
  "jpg",
  "png",
  "webp",
  "heic",
  "heif",
] as const;

type OwnedComparisonImagePathParams = {
  comparisonId: string;
  imagePath: string;
  imageStage: ImageStage;
  userId: string;
};

export function isOwnedComparisonImagePath({
  comparisonId,
  imagePath,
  imageStage,
  userId,
}: OwnedComparisonImagePathParams): boolean {
  const expectedDirectory = `${userId}/${comparisonId}/`;

  if (!imagePath.startsWith(expectedDirectory)) {
    return false;
  }

  const fileName = imagePath.slice(expectedDirectory.length);
  const escapedExtensions = COMPARISON_IMAGE_EXTENSIONS.join("|");
  const fileNamePattern = new RegExp(
    `^${imageStage}(?:-[a-z0-9-]+)?\\.(${escapedExtensions})$`,
    "i",
  );

  return fileNamePattern.test(fileName);
}
