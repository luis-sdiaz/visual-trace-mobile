import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import {
  clearComparisonDraft,
  loadComparisonDraft,
  saveComparisonDraft,
} from "@/storage/comparisonStorage";

type ComparisonContextValue = {
  name: string;
  initialImageUri: string | null;
  finalImageUri: string | null;
  setName: (name: string) => void;
  setInitialImageUri: (uri: string | null) => void;
  setFinalImageUri: (uri: string | null) => void;
  resetComparison: () => void;
};

const ComparisonContext = createContext<ComparisonContextValue | undefined>(
  undefined,
);

export function ComparisonProvider({ children }: PropsWithChildren) {
  const [name, setName] = useState("");
  const [initialImageUri, setInitialImageUri] = useState<string | null>(null);
  const [finalImageUri, setFinalImageUri] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    async function restoreComparisonDraft() {
      const draft = await loadComparisonDraft();

      if (draft) {
        setName(draft.name);
        setInitialImageUri(draft.initialImageUri);
        setFinalImageUri(draft.finalImageUri);
      }

      setIsHydrated(true);
    }

    void restoreComparisonDraft();
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const hasDraft =
      name.trim().length > 0 ||
      initialImageUri !== null ||
      finalImageUri !== null;

    if (!hasDraft) {
      void clearComparisonDraft();
      return;
    }

    void saveComparisonDraft({
      name,
      initialImageUri,
      finalImageUri,
    });
  }, [name, initialImageUri, finalImageUri, isHydrated]);

  function resetComparison() {
    setName("");
    setInitialImageUri(null);
    setFinalImageUri(null);
  }

  return (
    <ComparisonContext.Provider
      value={{
        name,
        initialImageUri,
        finalImageUri,
        setName,
        setInitialImageUri,
        setFinalImageUri,
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
