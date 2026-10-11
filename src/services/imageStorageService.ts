import { File } from "expo-file-system";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

const STORAGE_BUCKET = "comparison-images";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export type ImageStage = "initial" | "final";

type UploadComparisonImageParams = {
  comparisonId: string;
  imageUri: string;
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
