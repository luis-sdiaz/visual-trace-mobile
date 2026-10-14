import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { observeAuthSession } from "@/services/authSessionService";

function createSession(userId: string): Session {
  return { user: { id: userId } } as Session;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe("observeAuthSession", () => {
  it("restores the stored session and finishes initialization", async () => {
    const session = createSession("user-1");
    const onUpdate = vi.fn();
    const source = {
      getSession: vi.fn().mockResolvedValue({
        data: { session },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    };

    observeAuthSession(source, onUpdate);
    await vi.waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({ session, isLoading: false });
    });
  });

  it("ignores a stale restoration after a newer auth event", async () => {
    const oldSession = createSession("user-old");
    const newSession = createSession("user-new");
    const deferred = createDeferred<{
      data: { session: Session | null };
      error: null;
    }>();
    let listener:
      | ((event: AuthChangeEvent, session: Session | null) => void)
      | undefined;
    const onUpdate = vi.fn();
    const source = {
      getSession: vi.fn(() => deferred.promise),
      onAuthStateChange: vi.fn(
        (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
          listener = callback;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      ),
    };

    observeAuthSession(source, onUpdate);
    listener?.("SIGNED_IN", newSession);
    deferred.resolve({ data: { session: oldSession }, error: null });
    await deferred.promise;
    await Promise.resolve();

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({
      session: newSession,
      isLoading: false,
    });
  });

  it("publishes account changes in event order", () => {
    const firstSession = createSession("user-1");
    const secondSession = createSession("user-2");
    let listener:
      | ((event: AuthChangeEvent, session: Session | null) => void)
      | undefined;
    const onUpdate = vi.fn();
    const source = {
      getSession: vi.fn(
        () =>
          new Promise<{
            data: { session: Session | null };
            error: null;
          }>(() => undefined),
      ),
      onAuthStateChange: vi.fn(
        (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
          listener = callback;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        },
      ),
    };

    observeAuthSession(source, onUpdate);
    listener?.("SIGNED_IN", firstSession);
    listener?.("SIGNED_OUT", null);
    listener?.("SIGNED_IN", secondSession);

    expect(onUpdate.mock.calls.map(([update]) => update.session?.user.id ?? null))
      .toEqual(["user-1", null, "user-2"]);
  });

  it("finishes initialization when session restoration rejects", async () => {
    const onUpdate = vi.fn();
    const source = {
      getSession: vi.fn().mockRejectedValue(new Error("storage unavailable")),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    };

    observeAuthSession(source, onUpdate);
    await vi.waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({
        session: null,
        isLoading: false,
      });
    });
  });
});
