import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let sessionRevision = 0;

    async function loadSession() {
      const requestRevision = sessionRevision;

      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isMounted || requestRevision !== sessionRevision) {
          return;
        }

        setSession(error ? null : data.session);
        setIsLoading(false);
      } catch {
        if (isMounted && requestRevision === sessionRevision) {
          setSession(null);
          setIsLoading(false);
        }
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      sessionRevision += 1;
      setSession(nextSession);
      setIsLoading(false);
    });

    void loadSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;

  async function signOut() {
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
