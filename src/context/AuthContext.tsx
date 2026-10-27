import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import { supabase } from "@/lib/supabase";
import { observeAuthSession } from "@/services/authSessionService";
import { purgeOldImageCache } from "@/services/imageCacheService";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export async function handleSessionCachePurge(): Promise<void> {
  try {
    await purgeOldImageCache();
  } catch {
    // Continuar sin interrumpir el flujo de autenticación
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Purga proactiva en segundo plano de imágenes temporales caducadas
    void handleSessionCachePurge();

    return observeAuthSession(supabase.auth, (update) => {
      setSession(update.session);
      setIsLoading(update.isLoading);
    });
  }, []);

  const user = session?.user ?? null;

  async function signOut() {
    void handleSessionCachePurge();

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
