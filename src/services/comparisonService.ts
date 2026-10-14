import { supabase } from "@/lib/supabase";

import { isOwnedComparisonImagePath } from "@/services/comparisonImagePath";
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

const DEFAULT_RECENT_COMPARISONS_LIMIT = 10;
const MAX_RECENT_COMPARISONS_LIMIT = 50;

export class ComparisonNotFoundError extends Error {
  constructor() {
    super("Comparison could not be found.");
    this.name = "ComparisonNotFoundError";
  }
}

export function isComparisonComplete(
  comparison: ComparisonRecord,
): boolean {
  return Boolean(
    comparison.initial_image_path && comparison.final_image_path,
  );
}

export async function fetchComparisonById(
  comparisonId: string,
): Promise<ComparisonRecord> {
  if (!comparisonId) {
    throw new Error("Comparison ID is required.");
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
    .select("*")
    .eq("id", comparisonId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new ComparisonNotFoundError();
  }

  return data as ComparisonRecord;
}

export async function fetchRecentComparisons(
  limit = DEFAULT_RECENT_COMPARISONS_LIMIT,
): Promise<ComparisonRecord[]> {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_RECENT_COMPARISONS_LIMIT
  ) {
    throw new Error("Recent comparisons limit must be between 1 and 50.");
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
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as ComparisonRecord[];
}

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

export async function isComparisonOwnedByUser(
  comparisonId: string,
  expectedUserId: string,
): Promise<boolean> {
  if (!comparisonId || !expectedUserId) {
    return false;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (user?.id !== expectedUserId) {
    throw new Error("Authenticated user changed while restoring the draft.");
  }

  const { data, error } = await supabase
    .from("comparisons")
    .select("id")
    .eq("id", comparisonId)
    .eq("user_id", expectedUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data !== null;
}

export async function updateComparisonImagePath(
  comparisonId: string,
  imageStage: ImageStage,
  imagePath: string,
  expectedCurrentPath?: string | null,
  nextStatus?: Exclude<ComparisonStatus, "analyzed">,
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

  const column = IMAGE_PATH_COLUMNS[imageStage];
  const updates: Partial<ComparisonRecord> = {
    [column]: imagePath,
  };

  if (nextStatus) {
    updates.status = nextStatus;
  }

  let query = supabase
    .from("comparisons")
    .update(updates)
    .eq("id", comparisonId)
    .eq("user_id", user.id);

  if (expectedCurrentPath === null) {
    query = query.is(column, null);
  } else if (expectedCurrentPath !== undefined) {
    query = query.eq(column, expectedCurrentPath);
  }

  const { data, error } = await query
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error("Comparison image could not be saved.");
  }
}

export async function markComparisonReady(
  comparisonId: string,
): Promise<ComparisonRecord> {
  if (!comparisonId) {
    throw new Error("Comparison ID is required.");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User must be authenticated.");
  }

  const { data: comparison, error: comparisonError } = await supabase
    .from("comparisons")
    .select("*")
    .eq("id", comparisonId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (comparisonError) {
    throw comparisonError;
  }

  if (!comparison) {
    throw new Error("Comparison could not be found.");
  }

  const record = comparison as ComparisonRecord;

  if (!record.initial_image_path || !record.final_image_path) {
    throw new Error("Both comparison images are required.");
  }

  if (record.status !== "draft") {
    return record;
  }

  const { data: updatedComparison, error: updateError } = await supabase
    .from("comparisons")
    .update({ status: "ready" satisfies ComparisonStatus })
    .eq("id", comparisonId)
    .eq("user_id", user.id)
    .eq("status", "draft")
    .not("initial_image_path", "is", null)
    .not("final_image_path", "is", null)
    .select("*")
    .maybeSingle();

  if (updateError) {
    throw updateError;
  }

  if (!updatedComparison) {
    throw new Error("Comparison could not be marked as ready.");
  }

  return updatedComparison as ComparisonRecord;
}
