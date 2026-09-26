import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAccessToken, clearAccessToken, refreshSession, setUnauthorizedHandler } from '../api/client';
import { can } from '../utils/permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // the cookie may already be gone; signing out locally is what matters
    }
    clearAccessToken();
    setUser(null);
    setPermissions(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // On page load there is no access token in memory; the refresh cookie (if any) restores the session.
  useEffect(() => {
    let cancelled = false;
    refreshSession()
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setPermissions(data.permissions);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(identifier, password) {
    const data = await api.post('/auth/login', { identifier, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    setPermissions(data.permissions);
    return data.user;
  }

  const value = {
    user,
    permissions,
    loading,
    login,
    logout,
    can: (module, action) => can(permissions, module, action),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
