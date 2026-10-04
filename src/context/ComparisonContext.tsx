import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";

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
