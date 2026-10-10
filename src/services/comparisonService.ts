import { supabase } from "@/lib/supabase";

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
