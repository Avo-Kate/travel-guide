import { useCallback, useEffect, useState } from "react";
import { fetchMe, login as loginApi, register as registerApi } from "../utils/auth.js";

const TOKEN_KEY = "wandr.token";

// Manages the signed-in user. The JWT lives in localStorage so sessions survive
// reloads; on mount we validate it against /auth/me and drop it if it's stale.
// Auth is optional (guest mode) — a null `user` just means "not signed in".
export function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setReady(true);
      return;
    }
    fetchMe(stored)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setReady(true));
  }, []);

  const authenticate = useCallback(async (apiCall, email, password) => {
    const { token: t, user: u } = await apiCall(email.trim().toLowerCase(), password);
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(
    (email, password) => authenticate(loginApi, email, password),
    [authenticate]
  );

  const register = useCallback(
    (email, password) => authenticate(registerApi, email, password),
    [authenticate]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return { user, token, ready, login, register, logout };
}
