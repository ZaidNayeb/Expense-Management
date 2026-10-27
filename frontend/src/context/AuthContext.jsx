import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onUnauthorized } from '../services/api.js';
import * as authService from '../services/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const userRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setUser(await authService.fetchCurrentUser());
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Any 401 from an authenticated request means the session is gone.
    onUnauthorized(() => {
      if (userRef.current) setSessionExpired(true);
      setUser(null);
    });
  }, [refresh]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const login = useCallback(async (email, password) => {
    const signedIn = await authService.login(email, password);
    setSessionExpired(false);
    setUser(signedIn);
    return signedIn;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // The session may already be gone; the user is signed out locally either way.
    }
    setSessionExpired(false);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, loadError, sessionExpired, login, logout, refresh }),
    [user, loading, loadError, sessionExpired, login, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

export const homePathFor = (user) => (user?.role === 'admin' ? '/admin' : '/dashboard');
