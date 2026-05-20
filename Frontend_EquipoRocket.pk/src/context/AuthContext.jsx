// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../services/api';

const AuthContext = createContext(null);

const SESSION_KEY = 'pk_session';

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate session on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('pk_token');
        if (token) {
          // try to fetch current user from backend
          const res = await getCurrentUser();
          if (res && res.data && mounted) {
            const u = res.data.user;
            localStorage.setItem(SESSION_KEY, JSON.stringify(u));
            setUser(u);
            return;
          }
        }
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored && mounted) setUser(JSON.parse(stored));
      } catch (e) {
        console.warn('No session rehydrated:', e.message);
        localStorage.removeItem(SESSION_KEY);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /**
   * Persist user in localStorage and state.
   * Called after a successful login or register.
   * NOTE: replace the mock logic here once the auth microservice is ready.
   */
  const login = (payload) => {
    // payload may be: user object, or { token, user }, or API response object
    let token = null;
    let userObj = null;
    if (!payload) return;
    if (payload.token && payload.user) {
      token = payload.token;
      userObj = payload.user;
    } else if (payload.data && payload.data.token && payload.data.user) {
      token = payload.data.token;
      userObj = payload.data.user;
    } else if (payload.user) {
      userObj = payload.user;
    } else if (payload.id || payload.username) {
      userObj = payload;
    }

    if (token) localStorage.setItem('pk_token', token);
    if (!userObj) return;

    const session = {
      id:         userObj.id       ?? 0,
      username:   userObj.username,
      email:      userObj.email,
      region_id:  userObj.region_id  ?? null,
      country_id: userObj.country_id ?? null,
      is_admin:   userObj.is_admin   ?? false,
      is_active:  userObj.is_active  ?? true,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('pk_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
