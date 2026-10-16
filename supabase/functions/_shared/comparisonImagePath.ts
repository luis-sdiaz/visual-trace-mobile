export const COMPARISON_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
] as const;

type ComparisonImageStage = "initial" | "final";

type OwnedComparisonImagePathParams = {
  comparisonId: string;
  imagePath: string;
  imageStage: ComparisonImageStage;
  userId: string;
};

export function isOwnedComparisonImagePath({
  comparisonId,
  imagePath,
  imageStage,
  userId,
}: OwnedComparisonImagePathParams): boolean {
  if (imagePath.includes("\\") || imagePath.includes("..")) {
    return false;
  }

  const segments = imagePath.split("/");
  if (
    segments.length !== 3 ||
    segments[0] !== userId ||
    segments[1] !== comparisonId
  ) {
    return false;
  }

  const extensions = COMPARISON_IMAGE_EXTENSIONS.join("|");
  const fileNamePattern = new RegExp(
    `^${imageStage}(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?\\.(${extensions})$`,
    "i",
  );

  return fileNamePattern.test(segments[2]);
}
