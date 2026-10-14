import { File } from "expo-file-system";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

const STORAGE_BUCKET = "comparison-images";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const DEFAULT_SIGNED_URL_LIFETIME_SECONDS = 5 * 60;
const MIN_SIGNED_URL_LIFETIME_SECONDS = 60;
const MAX_SIGNED_URL_LIFETIME_SECONDS = 60 * 60;

export type ImageStage = "initial" | "final";

type UploadComparisonImageParams = {
  comparisonId: string;
  imageUri: string;
  imageStage: ImageStage;
};

type ResolveComparisonImageUrlParams = {
  comparisonId: string;
  imagePath: string;
  imageStage: ImageStage;
  expiresIn?: number;
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

  if (normalizedType && IMAGE_EXTENSIONS[normalizedType]) {
    return normalizedType;
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

  throw new Error("Unsupported image format.");
}

async function readImage(imageUri: string): Promise<{
  buffer: ArrayBuffer;
  contentType: string;
}> {
  if (Platform.OS === "web") {
    const response = await fetch(imageUri);

    if (!response.ok) {
      throw new Error("Could not read image.");
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
    throw new Error("Image file does not exist.");
  }

  const contentType = getImageContentType(imageUri, imageFile.type);

  return {
    buffer: await imageFile.arrayBuffer(),
    contentType,
  };
}

export async function uploadComparisonImage({
  comparisonId,
  imageUri,
  imageStage,
}: UploadComparisonImageParams): Promise<string> {
  if (!comparisonId || !imageUri) {
    throw new Error("Comparison ID and image are required.");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User must be authenticated.");
  }

  const { buffer, contentType } = await readImage(imageUri);

  if (buffer.byteLength === 0) {
    throw new Error("Image file is empty.");
  }

  if (buffer.byteLength > MAX_IMAGE_SIZE) {
    throw new Error("Image exceeds the maximum size.");
  }

  const extension = IMAGE_EXTENSIONS[contentType];

  const storagePath = `${user.id}/${comparisonId}/${imageStage}.${extension}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw error;
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

  const expectedPrefix = `${user.id}/${comparisonId}/${imageStage}.`;
  const extension = imagePath.slice(expectedPrefix.length).toLowerCase();

  if (
    !imagePath.startsWith(expectedPrefix) ||
    !Object.values(IMAGE_EXTENSIONS).includes(extension)
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
