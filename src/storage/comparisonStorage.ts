import AsyncStorage from "@react-native-async-storage/async-storage";

const LEGACY_COMPARISON_DRAFT_KEY = "@visualtrace/comparison-draft";
const COMPARISON_DRAFT_KEY_PREFIX = "@visualtrace/comparison-draft:";

export type ComparisonDraft = {
  comparisonId: string | null;
  name: string;
  initialImageUri: string | null;
  finalImageUri: string | null;
  initialImagePath?: string | null;
  initialImageIsDirty?: boolean;
};

type StoredComparisonDraft = ComparisonDraft & {
  userId: string;
};

function getComparisonDraftKey(userId: string): string {
  if (!userId.trim()) {
    throw new Error("User ID is required to access a comparison draft.");
  }

  return `${COMPARISON_DRAFT_KEY_PREFIX}${userId}`;
}

function parseComparisonDraft(value: string): ComparisonDraft | null {
  try {
    const draft = JSON.parse(value) as Partial<ComparisonDraft>;
    const parsedDraft: ComparisonDraft = {
      comparisonId:
        typeof draft.comparisonId === "string" ? draft.comparisonId : null,
      name: typeof draft.name === "string" ? draft.name : "",
      initialImageUri:
        typeof draft.initialImageUri === "string"
          ? draft.initialImageUri
          : null,
      finalImageUri:
        typeof draft.finalImageUri === "string" ? draft.finalImageUri : null,
    };

    if (
      draft.initialImagePath === null ||
      typeof draft.initialImagePath === "string"
    ) {
      parsedDraft.initialImagePath = draft.initialImagePath;
    }

    if (typeof draft.initialImageIsDirty === "boolean") {
      parsedDraft.initialImageIsDirty = draft.initialImageIsDirty;
    }

    return parsedDraft;
  } catch {
    return null;
  }
}

export async function saveComparisonDraft(
  userId: string,
  draft: ComparisonDraft,
): Promise<void> {
  const storedDraft: StoredComparisonDraft = {
    ...draft,
    userId,
  };

  await AsyncStorage.setItem(
    getComparisonDraftKey(userId),
    JSON.stringify(storedDraft),
  );
}

export async function loadComparisonDraft(
  userId: string,
): Promise<ComparisonDraft | null> {
  const draftKey = getComparisonDraftKey(userId);
  const storedValue = await AsyncStorage.getItem(draftKey);

  if (!storedValue) {
    return null;
  }

  try {
    const storedDraft = JSON.parse(storedValue) as Partial<StoredComparisonDraft>;

    if (storedDraft.userId !== userId) {
      await AsyncStorage.removeItem(draftKey);
      return null;
    }
  } catch {
    await AsyncStorage.removeItem(draftKey);
    return null;
  }

  const draft = parseComparisonDraft(storedValue);

  if (!draft) {
    await AsyncStorage.removeItem(draftKey);
  }

  return draft;
}

export async function clearComparisonDraft(userId: string): Promise<void> {
  await AsyncStorage.removeItem(getComparisonDraftKey(userId));
}

export async function migrateLegacyComparisonDraft(
  userId: string,
  canClaimComparison: (comparisonId: string) => Promise<boolean>,
): Promise<ComparisonDraft | null> {
  const legacyValue = await AsyncStorage.getItem(LEGACY_COMPARISON_DRAFT_KEY);

  if (!legacyValue) {
    return null;
  }

  const legacyDraft = parseComparisonDraft(legacyValue);
  const canMigrate =
    legacyDraft?.comparisonId &&
    (await canClaimComparison(legacyDraft.comparisonId));

  await AsyncStorage.removeItem(LEGACY_COMPARISON_DRAFT_KEY);

  if (!legacyDraft || !canMigrate) {
    return null;
  }

  await saveComparisonDraft(userId, legacyDraft);

  return legacyDraft;
}
