import { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SupabaseContext = createContext(null);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Strip trailing slash and any /rest/v1/ segment so the client points to the
// project root — `createClient` already appends `/rest/v1` for REST calls.
const cleanUrl = (url) => {
  if (!url) return "";
  return url
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "");
};

export function SupabaseProvider({ children }) {
  const client = useMemo(() => {
    const url = cleanUrl(SUPABASE_URL);
    if (!url || !SUPABASE_ANON_KEY) {
      // eslint-disable-next-line no-console
      console.warn(
        "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
          "Check your .env.local file."
      );
      return null;
    }
    return createClient(url, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }, []);

  // Dynamic, globally accessible candidate session
  const [session, setSession] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem("quiz_session");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (session) {
      window.sessionStorage.setItem("quiz_session", JSON.stringify(session));
    } else {
      window.sessionStorage.removeItem("quiz_session");
    }
  }, [session]);

  const updateSession = useCallback((patch) => {
    setSession((prev) => ({ ...(prev || {}), ...patch }));
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("quiz_session");
    }
  }, []);

  const value = useMemo(
    () => ({ client, session, setSession, updateSession, clearSession }),
    [client, session, updateSession, clearSession]
  );

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase must be used within a <SupabaseProvider>");
  }
  return ctx;
}
