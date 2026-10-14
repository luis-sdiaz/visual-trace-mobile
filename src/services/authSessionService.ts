import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

type AuthSessionSource = {
  getSession: () => Promise<{
    data: { session: Session | null };
    error: unknown;
  }>;
  onAuthStateChange: (
    callback: (event: AuthChangeEvent, session: Session | null) => void,
  ) => {
    data: {
      subscription: {
        unsubscribe: () => void;
      };
    };
  };
};

type AuthSessionUpdate = {
  session: Session | null;
  isLoading: false;
};

export function observeAuthSession(
  source: AuthSessionSource,
  onUpdate: (update: AuthSessionUpdate) => void,
): () => void {
  let isActive = true;
  let sessionRevision = 0;

  const {
    data: { subscription },
  } = source.onAuthStateChange((_event, nextSession) => {
    if (!isActive) {
      return;
    }

    sessionRevision += 1;
    onUpdate({ session: nextSession, isLoading: false });
  });

  const requestRevision = sessionRevision;

  void source
    .getSession()
    .then(({ data, error }) => {
      if (!isActive || requestRevision !== sessionRevision) {
        return;
      }

      onUpdate({
        session: error ? null : data.session,
        isLoading: false,
      });
    })
    .catch(() => {
      if (isActive && requestRevision === sessionRevision) {
        onUpdate({ session: null, isLoading: false });
      }
    });

  return () => {
    isActive = false;
    subscription.unsubscribe();
  };
}
