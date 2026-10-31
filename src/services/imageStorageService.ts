import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";

import { COMPARISON_IMAGE_LIMITS } from "@/contracts/comparisonImages";
import { supabase } from "@/lib/supabase";
import { isOwnedComparisonImagePath } from "@/services/comparisonImagePath";

const STORAGE_BUCKET = "comparison-images";
const DEFAULT_SIGNED_URL_LIFETIME_SECONDS = 5 * 60;
const MIN_SIGNED_URL_LIFETIME_SECONDS = 60;
const MAX_SIGNED_URL_LIFETIME_SECONDS = 60 * 60;
const MAX_ANALYSIS_IMAGE_WIDTH = 1080;
const ANALYSIS_IMAGE_COMPRESSION_QUALITY = 0.7;

export type ImageStage = "initial" | "final";

export type ImageStorageErrorCode =
  | "file_too_large"
  | "unsupported_format"
  | "invalid_file"
  | "file_inaccessible"
  | "network_error"
  | "session_unavailable"
  | "storage_unavailable"
  | "storage_failure";

export class ImageStorageError extends Error {
  constructor(public readonly code: ImageStorageErrorCode, message: string) {
    super(message);
    this.name = "ImageStorageError";
  }
}

type UploadComparisonImageParams = {
  comparisonId: string;
  imageUri: string;
  imageStage: ImageStage;
  isReplacement?: boolean;
};

type ResolveComparisonImageUrlParams = {
  comparisonId: string;
  imagePath: string;
  imageStage: ImageStage;
  expiresIn?: number;
};

type RemoveComparisonImageParams = {
  comparisonId: string;
  imagePath: string;
  imageStage: ImageStage;
};

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

function getImageContentType(
  imageUri: string,
  detectedType?: string | null,
): string {
  const normalizedType = detectedType?.split(";")[0].trim().toLowerCase();

  if (normalizedType) {
    if (IMAGE_EXTENSIONS[normalizedType]) {
      return normalizedType;
    }
    throw new ImageStorageError("unsupported_format", "Unsupported image format.");
  }

  const normalizedUri = imageUri.toLowerCase().split(/[?#]/)[0];

  if (normalizedUri.endsWith(".jpg") || normalizedUri.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (normalizedUri.endsWith(".png")) {
    return "image/png";
  }

  if (normalizedUri.endsWith(".webp")) {
    return "image/webp";
  }

  if (normalizedUri.endsWith(".heic")) {
    return "image/heic";
  }

  if (normalizedUri.endsWith(".heif")) {
    return "image/heif";
  }

  throw new ImageStorageError("unsupported_format", "Unsupported image format.");
}

async function readImage(imageUri: string): Promise<{
  buffer: ArrayBuffer;
  contentType: string;
}> {
  if (Platform.OS === "web") {
    let response: Response;
    try {
      response = await fetch(imageUri);
    } catch (error) {
      throw new ImageStorageError(
        error instanceof TypeError ? "network_error" : "file_inaccessible",
        "Could not read image.",
      );
    }

    if (!response.ok) {
      throw new ImageStorageError("file_inaccessible", "Could not read image.");
    }

    const contentType = getImageContentType(
      imageUri,
      response.headers.get("content-type"),
    );

    return {
      buffer: await response.arrayBuffer(),
      contentType,
    };
  }

  const imageFile = new File(imageUri);

  if (!imageFile.exists) {
    throw new ImageStorageError("file_inaccessible", "Image file does not exist.");
  }

  const contentType = getImageContentType(imageUri, imageFile.type);

  try {
    return {
      buffer: await imageFile.arrayBuffer(),
      contentType,
    };
  } catch {
    throw new ImageStorageError("file_inaccessible", "Could not read image.");
  }
}

async function prepareImageForAnalysis(imageUri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: MAX_ANALYSIS_IMAGE_WIDTH } }],
      {
        compress: ANALYSIS_IMAGE_COMPRESSION_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );
    if (!result.uri) {
      throw new Error("Image manipulator returned an empty URI.");
    }
    return result.uri;
  } catch {
    throw new ImageStorageError(
      "invalid_file",
      "Could not prepare image for upload.",
    );
  }
}

function classifyStorageUploadError(error: unknown): ImageStorageError {
  if (error instanceof TypeError) {
    return new ImageStorageError("network_error", "Storage request failed.");
  }

  const statusValue =
    typeof error === "object" && error !== null
      ? (error as { status?: unknown; statusCode?: unknown }).statusCode ??
        (error as { status?: unknown }).status
      : undefined;
  const status = typeof statusValue === "string" ? Number(statusValue) : statusValue;

  return new ImageStorageError(
    typeof status === "number" && status >= 500
      ? "storage_unavailable"
      : "storage_failure",
    "Storage upload failed.",
  );
}

export async function uploadComparisonImage({
  comparisonId,
  imageUri,
  imageStage,
  isReplacement = false,
}: UploadComparisonImageParams): Promise<string> {
  if (!comparisonId || !imageUri) {
    throw new ImageStorageError("invalid_file", "Comparison ID and image are required.");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ImageStorageError("session_unavailable", "User must be authenticated.");
  }

  const preparedImageUri = await prepareImageForAnalysis(imageUri);
  const { buffer, contentType } = await readImage(preparedImageUri);
  const preparedExtension =
    preparedImageUri.toLowerCase().split(/[?#]/)[0].split(".").pop() ?? "";
  console.log("[imageStorageService] Imagen preparada para subida:", {
    comparisonId,
    imageStage,
    originalUriLength: imageUri.length,
    preparedUriLength: preparedImageUri.length,
    preparedExtension,
    contentType,
    payloadSizeBytes: buffer.byteLength,
  });
  if (buffer.byteLength === 0) {
    throw new ImageStorageError("invalid_file", "Image file is empty.");
  }

  if (contentType !== "image/jpeg") {
    throw new ImageStorageError(
      "unsupported_format",
      "Prepared image must use JPEG format.",
    );
  }

  if (buffer.byteLength > COMPARISON_IMAGE_LIMITS.maxBytesPerImage) {
    throw new ImageStorageError("file_too_large", "Image exceeds the maximum size.");
  }

  const extension = IMAGE_EXTENSIONS[contentType];

  const versionSuffix = isReplacement
    ? `-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    : "";
  const storagePath = `${user.id}/${comparisonId}/${imageStage}${versionSuffix}.${extension}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: !isReplacement,
    });

  if (error) {
    throw classifyStorageUploadError(error);
  }

  return data.path;
}

export async function resolveComparisonImageUrl({
  comparisonId,
  imagePath,
  imageStage,
  expiresIn = DEFAULT_SIGNED_URL_LIFETIME_SECONDS,
}: ResolveComparisonImageUrlParams): Promise<string> {
  if (!comparisonId || !imagePath) {
    throw new Error("Comparison ID and image path are required.");
  }

  if (imageStage !== "initial" && imageStage !== "final") {
    throw new Error("Invalid image stage.");
  }

  if (
    !Number.isInteger(expiresIn) ||
    expiresIn < MIN_SIGNED_URL_LIFETIME_SECONDS ||
    expiresIn > MAX_SIGNED_URL_LIFETIME_SECONDS
  ) {
    throw new Error("Signed URL lifetime must be between 60 and 3600 seconds.");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User must be authenticated.");
  }

  if (
    !isOwnedComparisonImagePath({
      comparisonId,
      imagePath,
      imageStage,
      userId: user.id,
    })
  ) {
    throw new Error("Image path does not match this comparison.");
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(imagePath, expiresIn);

  if (error) {
    throw error;
  }

  if (!data?.signedUrl) {
    throw new Error("Private comparison image could not be accessed.");
  }

  return data.signedUrl;
}

export async function removeComparisonImage({
  comparisonId,
  imagePath,
  imageStage,
}: RemoveComparisonImageParams): Promise<void> {
  if (!comparisonId || !imagePath) {
    throw new Error("Comparison ID and image path are required.");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User must be authenticated.");
  }

  if (
    !isOwnedComparisonImagePath({
      comparisonId,
      imagePath,
      imageStage,
      userId: user.id,
    })
  ) {
    throw new Error("Image path does not match this comparison.");
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([imagePath]);

  if (error) {
    throw error;
  }
}
