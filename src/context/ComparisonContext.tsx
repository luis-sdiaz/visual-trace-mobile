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
  finalImageUri: string | null;
  setComparisonId: (id: string | null) => void;
  setName: (name: string) => void;
  setInitialImageUri: (uri: string | null) => void;
  setFinalImageUri: (uri: string | null) => void;
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
  const [finalImageUri, setFinalImageUri] = useState<string | null>(null);
  const [isInitialImageTransient, setIsInitialImageTransient] = useState(false);
  const [isFinalImageTransient, setIsFinalImageTransient] = useState(false);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  const hydrationSequenceRef = useRef(0);
  const persistenceQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    const userId = user?.id ?? null;
    const hydrationSequence = ++hydrationSequenceRef.current;

    setComparisonId(null);
    setName("");
    setInitialImageUri(null);
    setFinalImageUri(null);
    setIsInitialImageTransient(false);
    setIsFinalImageTransient(false);
    setHydratedUserId(null);

    if (isAuthLoading || !userId) {
      return;
    }

    const authenticatedUserId = userId;

    async function restoreComparisonDraft() {
      let draft = null;

      try {
        draft = await loadComparisonDraft(authenticatedUserId);

        if (!draft) {
          draft = await migrateLegacyComparisonDraft(
            authenticatedUserId,
            (legacyId) =>
              isComparisonOwnedByUser(legacyId, authenticatedUserId),
          );
        }
      } catch {
        draft = null;
      }

      if (
        hydrationSequence !== hydrationSequenceRef.current ||
        authenticatedUserId !== user?.id
      ) {
        return;
      }

      if (draft) {
        setComparisonId(draft.comparisonId);
        setName(draft.name);
        setInitialImageUri(draft.initialImageUri);
        setFinalImageUri(draft.finalImageUri);
        setIsInitialImageTransient(false);
        setIsFinalImageTransient(false);
      }

      setHydratedUserId(authenticatedUserId);
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
              finalImageUri: isFinalImageTransient ? null : finalImageUri,
            })
          : clearComparisonDraft(userId),
      );
  }, [
    comparisonId,
    name,
    initialImageUri,
    finalImageUri,
    isInitialImageTransient,
    isFinalImageTransient,
    hydratedUserId,
    user?.id,
  ]);

  function handleSetInitialImageUri(uri: string | null) {
    setIsInitialImageTransient(false);
    setInitialImageUri(uri);
  }

  function handleSetFinalImageUri(uri: string | null) {
    setIsFinalImageTransient(false);
    setFinalImageUri(uri);
  }

  function restoreComparison(draft: RestoredComparison) {
    setComparisonId(draft.comparisonId);
    setName(draft.name);
    setInitialImageUri(draft.initialImageUri);
    setFinalImageUri(draft.finalImageUri);
    setIsInitialImageTransient(draft.initialImageIsTransient ?? false);
    setIsFinalImageTransient(draft.finalImageIsTransient ?? false);
  }

  function resetComparison() {
    setComparisonId(null);
    setName("");
    setInitialImageUri(null);
    setFinalImageUri(null);
    setIsInitialImageTransient(false);
    setIsFinalImageTransient(false);
  }

  return (
    <ComparisonContext.Provider
      value={{
        comparisonId,
        name,
        initialImageUri,
        finalImageUri,
        setComparisonId,
        setName,
        setInitialImageUri: handleSetInitialImageUri,
        setFinalImageUri: handleSetFinalImageUri,
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
