import {
  AuthenticationRequiredError,
  fetchComparisonById,
  updateComparisonImagePath,
} from "@/services/comparisonService";
import {
  ImageStorageError,
  removeComparisonImage,
  resolveComparisonImageUrl,
  uploadComparisonImage,
  type ImageStage,
} from "@/services/imageStorageService";

type SaveComparisonImageParams = {
  comparisonId: string;
  imageStage: ImageStage;
  imageUri: string;
  previousImagePath: string | null;
};

type RestoreSavedComparisonImageParams = {
  comparisonId: string;
  imageStage: ImageStage;
  expectedImagePath: string;
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

export class ConcurrentComparisonImageEditError extends Error {
  constructor() {
    super("Comparison image changed before it could be saved.");
    this.name = "ConcurrentComparisonImageEditError";
  }
}

export function getComparisonImageSaveErrorMessage(
  error: unknown,
  imageStage: ImageStage,
): string {
  if (error instanceof AnalyzedComparisonEditError) {
    return "Esta comparación ya fue analizada y sus fotografías no se pueden reemplazar.";
  }
  if (error instanceof ConcurrentComparisonImageEditError) {
    return "La fotografía guardada cambió en otro proceso. Vuelve a abrir la comparación antes de reemplazarla.";
  }
  if (error instanceof AuthenticationRequiredError) {
    return "Tu sesión ya no está disponible. Inicia sesión nuevamente para guardar la fotografía.";
  }
  if (error instanceof ImageStorageError) {
    const messages: Record<ImageStorageError["code"], string> = {
      file_too_large: "La fotografía supera el límite de 6 MiB. Elige una imagen más pequeña.",
      unsupported_format: "El formato de la fotografía no es compatible. Usa JPEG, PNG, WebP, HEIC o HEIF.",
      invalid_file: "El archivo seleccionado no contiene una fotografía válida.",
      file_inaccessible: "No pudimos acceder al archivo seleccionado. Elige la fotografía nuevamente.",
      network_error: "No hay conexión suficiente para guardar la fotografía. Comprueba tu red e inténtalo nuevamente.",
      session_unavailable: "Tu sesión ya no está disponible. Inicia sesión nuevamente para guardar la fotografía.",
      storage_unavailable: "El almacenamiento no está disponible temporalmente. Inténtalo nuevamente en unos minutos.",
      storage_failure: "El almacenamiento no pudo guardar la fotografía. Inténtalo nuevamente.",
    };
    return messages[error.code];
  }

  return `No pudimos guardar la fotografía ${imageStage === "final" ? "final" : "inicial"}. Inténtalo nuevamente.`;
}

export function shouldUploadComparisonImage(
  imagePath: string | null,
  imageIsDirty: boolean,
): boolean {
  return imageIsDirty || imagePath === null;
}

export async function restoreSavedComparisonImage({
  comparisonId,
  imageStage,
  expectedImagePath,
}: RestoreSavedComparisonImageParams): Promise<{ path: string; uri: string }> {
  const comparison = await fetchComparisonById(comparisonId);
  const currentImagePath = comparison[IMAGE_PATH_COLUMNS[imageStage]];
  if (!currentImagePath || currentImagePath !== expectedImagePath) {
    throw new ConcurrentComparisonImageEditError();
  }

  const uri = await resolveComparisonImageUrl({
    comparisonId,
    imagePath: currentImagePath,
    imageStage,
  });
  return { path: currentImagePath, uri };
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
    throw new ConcurrentComparisonImageEditError();
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
