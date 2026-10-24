import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session on app initialization
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data?.success && res.data?.data?.user) {
          setUser(res.data.data.user);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Synchronize browser detected IANA time zone with backend user profile
  useEffect(() => {
    if (!user) return;
    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTimezone && user.timezone !== browserTimezone) {
        api
          .patch('/auth/timezone', { timezone: browserTimezone })
          .then((res) => {
            if (res.data?.success && res.data?.data?.user) {
              setUser(res.data.data.user);
            }
          })
          .catch(() => {});
      }
    } catch {}
  }, [user]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.success && res.data?.data?.user) {
      setUser(res.data.data.user);
    }
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    if (res.data?.success && res.data?.data?.user) {
      setUser(res.data.data.user);
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      const resolved = typeof updates === 'function' ? updates(prev) : updates;
      return {
        ...prev,
        ...resolved,
      };
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
