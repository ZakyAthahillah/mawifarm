"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getApiBase, getJsonHeaders, readJsonResponse } from "@/components/api";

type AuthUser = {
  id: number;
  name: string;
  username: string;
  role: string;
  owner_id?: number | null;
  must_change_password?: boolean;
  owner_options?: Array<{ id: number; name: string }>;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  login: (payload: { token: string; user: AuthUser }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch(`${getApiBase()}/me`, {
          credentials: "include",
          headers: getJsonHeaders(),
        });

        if (response.ok) {
          const data = (await readJsonResponse<{ status?: boolean; data?: AuthUser }>(response)) ?? {};
          if (data.status && data.data) {
            setUser(data.data);
          }
        }
      } catch {
        setUser(null);
      } finally {
        setReady(true);
      }
    };

    void loadSession();
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      ready,
      login: ({ token: nextToken, user: nextUser }) => {
        setToken(nextToken);
        setUser(nextUser);
      },
      logout: () => {
        setToken(null);
        setUser(null);
      },
    }),
    [ready, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside Providers");
  }

  return ctx;
}
