import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { isComparisonOwnedByUser } from "@/services/comparisonService";
import type { ImageStage } from "@/services/imageStorageService";
import {
  clearComparisonDraft,
  loadComparisonDraft,
  migrateLegacyComparisonDraft,
  saveComparisonDraft,
  type ComparisonDraft,
} from "@/storage/comparisonStorage";

type RestoredComparison = ComparisonDraft & {
  initialImageIsTransient?: boolean;
  finalImageIsTransient?: boolean;
};

type ComparisonContextValue = {
  comparisonId: string | null;
  name: string;
  initialImageUri: string | null;
  initialImagePath: string | null;
  initialImageIsDirty: boolean;
  finalImageUri: string | null;
  finalImagePath: string | null;
  finalImageIsDirty: boolean;
  setComparisonId: (id: string | null) => void;
  setName: (name: string) => void;
  setInitialImageUri: (uri: string | null) => void;
  markInitialImageSaved: (path: string) => void;
  setFinalImageUri: (uri: string | null) => void;
  markFinalImageSaved: (path: string) => void;
  restoreSavedImage: (stage: ImageStage, uri: string, path: string) => void;
  restoreComparison: (draft: RestoredComparison) => void;
  resetComparison: () => void;
};

const ComparisonContext = createContext<ComparisonContextValue | undefined>(
  undefined,
);

export function ComparisonProvider({ children }: PropsWithChildren) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [initialImageUri, setInitialImageUri] = useState<string | null>(null);
  const [initialImagePath, setInitialImagePath] = useState<string | null>(null);
  const [initialImageIsDirty, setInitialImageIsDirty] = useState(false);
  const [finalImageUri, setFinalImageUri] = useState<string | null>(null);
  const [finalImagePath, setFinalImagePath] = useState<string | null>(null);
  const [finalImageIsDirty, setFinalImageIsDirty] = useState(false);
  const [isInitialImageTransient, setIsInitialImageTransient] = useState(false);
  const [isFinalImageTransient, setIsFinalImageTransient] = useState(false);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  const hydrationSequenceRef = useRef(0);
  const persistenceQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    const userId = user?.id ?? null;
    const hydrationSequence = ++hydrationSequenceRef.current;

    async function restoreComparisonDraft() {
      await Promise.resolve();

      if (hydrationSequence !== hydrationSequenceRef.current) {
        return;
      }

      setComparisonId(null);
      setName("");
      setInitialImageUri(null);
      setInitialImagePath(null);
      setInitialImageIsDirty(false);
      setFinalImageUri(null);
      setFinalImagePath(null);
      setFinalImageIsDirty(false);
      setIsInitialImageTransient(false);
      setIsFinalImageTransient(false);
      setHydratedUserId(null);

      if (isAuthLoading || !userId) {
        return;
      }

      let draft = null;

      try {
        draft = await loadComparisonDraft(userId);

        if (!draft) {
          draft = await migrateLegacyComparisonDraft(
            userId,
            (legacyId) =>
              isComparisonOwnedByUser(legacyId, userId),
          );
        }
      } catch {
        draft = null;
      }

      if (
        hydrationSequence !== hydrationSequenceRef.current ||
        userId !== user?.id
      ) {
        return;
      }

      if (draft) {
        setComparisonId(draft.comparisonId);
        setName(draft.name);
        setInitialImageUri(draft.initialImageUri);
        setInitialImagePath(draft.initialImagePath ?? null);
        setInitialImageIsDirty(
          draft.initialImageIsDirty ??
            Boolean(draft.initialImageUri && !draft.initialImagePath),
        );
        setFinalImageUri(draft.finalImageUri);
        setFinalImagePath(draft.finalImagePath ?? null);
        setFinalImageIsDirty(
          draft.finalImageIsDirty ??
            Boolean(draft.finalImageUri && !draft.finalImagePath),
        );
        setIsInitialImageTransient(false);
        setIsFinalImageTransient(false);
      }

      setHydratedUserId(userId);
    }

    void restoreComparisonDraft();
  }, [isAuthLoading, user?.id]);

  useEffect(() => {
    const userId = user?.id;

    if (!userId || hydratedUserId !== userId) {
      return;
    }

    const hasDraft =
      comparisonId !== null ||
      name.trim().length > 0 ||
      initialImageUri !== null ||
      finalImageUri !== null;

    persistenceQueueRef.current = persistenceQueueRef.current
      .catch(() => undefined)
      .then(() =>
        hasDraft
          ? saveComparisonDraft(userId, {
              comparisonId,
              name,
              initialImageUri: isInitialImageTransient ? null : initialImageUri,
              initialImagePath,
              initialImageIsDirty,
              finalImageUri: isFinalImageTransient ? null : finalImageUri,
              finalImagePath,
              finalImageIsDirty,
            })
          : clearComparisonDraft(userId),
      );
  }, [
    comparisonId,
    name,
    initialImageUri,
    initialImagePath,
    initialImageIsDirty,
    finalImageUri,
    finalImagePath,
    finalImageIsDirty,
    isInitialImageTransient,
    isFinalImageTransient,
    hydratedUserId,
    user?.id,
  ]);

  function handleSetInitialImageUri(uri: string | null) {
    setIsInitialImageTransient(false);
    setInitialImageUri(uri);
    setInitialImageIsDirty(uri !== null);
  }

  function markInitialImageSaved(path: string) {
    setInitialImagePath(path);
    setInitialImageIsDirty(false);
  }

  function handleSetFinalImageUri(uri: string | null) {
    setIsFinalImageTransient(false);
    setFinalImageUri(uri);
    setFinalImageIsDirty(uri !== null);
  }

  function markFinalImageSaved(path: string) {
    setFinalImagePath(path);
    setFinalImageIsDirty(false);
  }

  function restoreSavedImage(stage: ImageStage, uri: string, path: string) {
    if (stage === "initial") {
      setInitialImageUri(uri);
      setInitialImagePath(path);
      setInitialImageIsDirty(false);
      setIsInitialImageTransient(true);
    } else {
      setFinalImageUri(uri);
      setFinalImagePath(path);
      setFinalImageIsDirty(false);
      setIsFinalImageTransient(true);
    }
  }

  function restoreComparison(draft: RestoredComparison) {
    setComparisonId(draft.comparisonId);
    setName(draft.name);
    setInitialImageUri(draft.initialImageUri);
    setInitialImagePath(draft.initialImagePath ?? null);
    setInitialImageIsDirty(draft.initialImageIsDirty ?? false);
    setFinalImageUri(draft.finalImageUri);
    setFinalImagePath(draft.finalImagePath ?? null);
    setFinalImageIsDirty(draft.finalImageIsDirty ?? false);
    setIsInitialImageTransient(draft.initialImageIsTransient ?? false);
    setIsFinalImageTransient(draft.finalImageIsTransient ?? false);
  }

  function resetComparison() {
    setComparisonId(null);
    setName("");
    setInitialImageUri(null);
    setInitialImagePath(null);
    setInitialImageIsDirty(false);
    setFinalImageUri(null);
    setFinalImagePath(null);
    setFinalImageIsDirty(false);
    setIsInitialImageTransient(false);
    setIsFinalImageTransient(false);
  }

  return (
    <ComparisonContext.Provider
      value={{
        comparisonId,
        name,
        initialImageUri,
        initialImagePath,
        initialImageIsDirty,
        finalImageUri,
        finalImagePath,
        finalImageIsDirty,
        setComparisonId,
        setName,
        setInitialImageUri: handleSetInitialImageUri,
        markInitialImageSaved,
        setFinalImageUri: handleSetFinalImageUri,
        markFinalImageSaved,
        restoreSavedImage,
        restoreComparison,
        resetComparison,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);

  if (!context) {
    throw new Error("useComparison must be used within a ComparisonProvider");
  }

  return context;
}
