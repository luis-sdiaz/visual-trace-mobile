import AsyncStorage from "@react-native-async-storage/async-storage";

const COMPARISON_DRAFT_KEY = "@visualtrace/comparison-draft";

export type ComparisonDraft = {
  name: string;
  initialImageUri: string | null;
  finalImageUri: string | null;
};

export async function saveComparisonDraft(
  draft: ComparisonDraft,
): Promise<void> {
  const serializedDraft = JSON.stringify(draft);

  await AsyncStorage.setItem(COMPARISON_DRAFT_KEY, serializedDraft);
}

export async function loadComparisonDraft(): Promise<ComparisonDraft | null> {
  const storedDraft = await AsyncStorage.getItem(COMPARISON_DRAFT_KEY);

  if (!storedDraft) {
    return null;
  }

  try {
    return JSON.parse(storedDraft) as ComparisonDraft;
  } catch {
    await AsyncStorage.removeItem(COMPARISON_DRAFT_KEY);

    return null;
  }
}

export async function clearComparisonDraft(): Promise<void> {
  await AsyncStorage.removeItem(COMPARISON_DRAFT_KEY);
}
