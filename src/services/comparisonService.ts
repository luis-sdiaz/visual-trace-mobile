import { supabase } from "@/lib/supabase";

import type { ImageStage } from "@/services/imageStorageService";

export type ComparisonStatus = "draft" | "ready" | "analyzed";

export type ComparisonRecord = {
  id: string;
  user_id: string;
  name: string;
  initial_image_path: string | null;
  final_image_path: string | null;
  status: ComparisonStatus;
  created_at: string;
  updated_at: string;
};

const IMAGE_PATH_COLUMNS: Record<
  ImageStage,
  "initial_image_path" | "final_image_path"
> = {
  initial: "initial_image_path",
  final: "final_image_path",
};

const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "png", "webp", "heic", "heif"];

export async function createComparisonDraft(
  name: string,
): Promise<ComparisonRecord> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Comparison name is required.");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User must be authenticated.");
  }

  const { data, error } = await supabase
    .from("comparisons")
    .insert({
      user_id: user.id,
      name: trimmedName,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ComparisonRecord;
}

export async function updateComparisonName(
  comparisonId: string,
  name: string,
): Promise<void> {
  const trimmedName = name.trim();

  if (!comparisonId || !trimmedName) {
    throw new Error("Comparison ID and name are required.");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User must be authenticated.");
  }

  const { data, error } = await supabase
    .from("comparisons")
    .update({
      name: trimmedName,
    })
    .eq("id", comparisonId)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Comparison could not be updated.");
  }
}

export async function updateComparisonImagePath(
  comparisonId: string,
  imageStage: ImageStage,
  imagePath: string,
): Promise<void> {
  if (!comparisonId || !imagePath) {
    throw new Error("Comparison ID and image path are required.");
  }

  if (imageStage !== "initial" && imageStage !== "final") {
    throw new Error("Invalid image stage.");
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
    !ALLOWED_IMAGE_EXTENSIONS.includes(extension)
  ) {
    throw new Error("Image path does not match this comparison.");
  }

  const column = IMAGE_PATH_COLUMNS[imageStage];

  const { data, error } = await supabase
    .from("comparisons")
    .update({
      [column]: imagePath,
    })
    .eq("id", comparisonId)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Comparison image could not be saved.");
  }
}
