import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "./api";
import type { Me } from "./types";

type AuthStatus = "loading" | "signedOut" | "signedIn";

type AuthContextValue = {
  status: AuthStatus;
  me: Me | null;
  /** Refresh the cached `me` from the API. */
  refresh: () => Promise<void>;
  /** Called after a successful code verification (token already stored). */
  completeSignIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [me, setMe] = useState<Me | null>(null);

  const loadMe = useCallback(async () => {
    const data = await api.me();
    setMe(data);
    setStatus("signedIn");
  }, []);

  // Bootstrap: if we have a stored token, validate it by loading the member.
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getToken();
      if (!token) {
        if (active) setStatus("signedOut");
        return;
      }
      try {
        const data = await api.me();
        if (active) {
          setMe(data);
          setStatus("signedIn");
        }
      } catch {
        // Token invalid/expired — clear it and fall back to signed-out.
        await setToken(null);
        if (active) setStatus("signedOut");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const completeSignIn = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  const refresh = useCallback(async () => {
    try {
      await loadMe();
    } catch {
      /* keep last-known state on a transient refresh failure */
    }
  }, [loadMe]);

  const signOut = useCallback(async () => {
    await api.signOut();
    setMe(null);
    setStatus("signedOut");
  }, []);

  const value = useMemo(
    () => ({ status, me, refresh, completeSignIn, signOut }),
    [status, me, refresh, completeSignIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
