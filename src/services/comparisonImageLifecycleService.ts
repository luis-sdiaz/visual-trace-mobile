import {
  fetchComparisonById,
  updateComparisonImagePath,
} from "@/services/comparisonService";
import {
  removeComparisonImage,
  uploadComparisonImage,
  type ImageStage,
} from "@/services/imageStorageService";

type SaveComparisonImageParams = {
  comparisonId: string;
  imageStage: ImageStage;
  imageUri: string;
  previousImagePath: string | null;
};

const IMAGE_PATH_COLUMNS = {
  initial: "initial_image_path",
  final: "final_image_path",
} as const;

export class AnalyzedComparisonEditError extends Error {
  constructor() {
    super("Analyzed comparisons cannot be edited.");
    this.name = "AnalyzedComparisonEditError";
  }
}

export async function saveComparisonImage({
  comparisonId,
  imageStage,
  imageUri,
  previousImagePath,
}: SaveComparisonImageParams): Promise<string> {
  const comparison = await fetchComparisonById(comparisonId);
  const currentImagePath = comparison[IMAGE_PATH_COLUMNS[imageStage]];

  if (comparison.status === "analyzed") {
    throw new AnalyzedComparisonEditError();
  }

  if (currentImagePath !== previousImagePath) {
    throw new Error("Comparison image changed before it could be saved.");
  }

  const imagePath = await uploadComparisonImage({
    comparisonId,
    imageStage,
    imageUri,
    isReplacement: previousImagePath !== null,
  });
  const hasInitialImage =
    imageStage === "initial" ? true : comparison.initial_image_path !== null;
  const hasFinalImage =
    imageStage === "final" ? true : comparison.final_image_path !== null;
  const nextStatus = hasInitialImage && hasFinalImage ? "ready" : "draft";

  let imagePathWasSaved = false;

  try {
    await updateComparisonImagePath(
      comparisonId,
      imageStage,
      imagePath,
      previousImagePath,
      nextStatus,
    );
    imagePathWasSaved = true;
  } catch (saveError) {
    try {
      const latestComparison = await fetchComparisonById(comparisonId);
      imagePathWasSaved =
        latestComparison[IMAGE_PATH_COLUMNS[imageStage]] === imagePath;

      if (!imagePathWasSaved) {
        try {
          await removeComparisonImage({
            comparisonId,
            imagePath,
            imageStage,
          });
        } catch (cleanupError) {
          console.error(
            "Failed to remove an unreferenced comparison image:",
            cleanupError,
          );
        }
      }
    } catch {
      // The write result is unknown, so retaining the new object is safer.
    }

    if (!imagePathWasSaved) {
      throw saveError;
    }
  }

  if (previousImagePath && previousImagePath !== imagePath) {
    try {
      const latestComparison = await fetchComparisonById(comparisonId);
      const referencedImagePath =
        latestComparison[IMAGE_PATH_COLUMNS[imageStage]];

      if (referencedImagePath === imagePath) {
        await removeComparisonImage({
          comparisonId,
          imagePath: previousImagePath,
          imageStage,
        });
      }
    } catch (cleanupError) {
      console.error(
        "Failed to clean up a superseded comparison image:",
        cleanupError,
      );
    }
  }

  return imagePath;
}
