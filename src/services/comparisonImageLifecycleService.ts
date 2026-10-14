import {
  fetchComparisonById,
  updateComparisonImagePath,
} from "@/services/comparisonService";
import {
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

export async function saveComparisonImage({
  comparisonId,
  imageStage,
  imageUri,
  previousImagePath,
}: SaveComparisonImageParams): Promise<string> {
  const comparison = await fetchComparisonById(comparisonId);
  const currentImagePath = comparison[IMAGE_PATH_COLUMNS[imageStage]];

  if (currentImagePath !== previousImagePath) {
    throw new Error("Comparison image changed before it could be saved.");
  }

  const imagePath = await uploadComparisonImage({
    comparisonId,
    imageStage,
    imageUri,
    isReplacement: previousImagePath !== null,
  });

  await updateComparisonImagePath(
    comparisonId,
    imageStage,
    imagePath,
    previousImagePath,
  );

  return imagePath;
}
