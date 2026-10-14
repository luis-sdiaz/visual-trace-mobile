import {
  fetchComparisonById,
  type ComparisonRecord,
} from "@/services/comparisonService";
import { resolveComparisonImageUrl } from "@/services/imageStorageService";

export type ComparisonRecovery = {
  comparison: ComparisonRecord;
  initialImageUri: string | null;
  finalImageUri: string | null;
};

export async function recoverComparison(
  comparisonId: string,
): Promise<ComparisonRecovery> {
  const comparison = await fetchComparisonById(comparisonId);

  const [initialImageUri, finalImageUri] = await Promise.all([
    comparison.initial_image_path
      ? resolveComparisonImageUrl({
          comparisonId: comparison.id,
          imagePath: comparison.initial_image_path,
          imageStage: "initial",
        })
      : null,
    comparison.final_image_path
      ? resolveComparisonImageUrl({
          comparisonId: comparison.id,
          imagePath: comparison.final_image_path,
          imageStage: "final",
        })
      : null,
  ]);

  return {
    comparison,
    initialImageUri,
    finalImageUri,
  };
}
