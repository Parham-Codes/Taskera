import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('connecting'); // 'connecting' | 'waking' | 'timeout' | 'offline' | 'error' | 'ready'
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Restore authenticated session on app initialization with Cold-Start awareness
  const checkAuth = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setServerStatus('offline');
      setLoading(true);
      return;
    }

    setLoading(true);
    setServerStatus('connecting');
    setElapsedSeconds(0);

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed >= 4) {
        setServerStatus((prev) => (prev === 'connecting' ? 'waking' : prev));
      }
    }, 1000);

    try {
      const res = await api.get('/auth/me');
      clearInterval(timer);
      if (res.data?.success && res.data?.data?.user) {
        setUser(res.data.data.user);
      } else {
        setUser(null);
      }
      setServerStatus('ready');
      setLoading(false);
    } catch (err) {
      clearInterval(timer);

      // 1. Normal unauthenticated user (401) - Server is awake and healthy
      if (err.response?.status === 401) {
        setUser(null);
        setServerStatus('ready');
        setLoading(false);
        return;
      }

      // 2. Offline check
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setServerStatus('offline');
        setLoading(true);
        return;
      }

      // 3. Render Cold Start timeout / 502 Bad Gateway / 504 Gateway Timeout / Network Error
      const isColdStartTimeout =
        err.code === 'ECONNABORTED' ||
        err.response?.status === 502 ||
        err.response?.status === 504 ||
        (!err.response && (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')));

      if (isColdStartTimeout) {
        setServerStatus('timeout');
        setLoading(true);
        return;
      }

      // 4. Other server error (e.g. 500)
      setServerStatus('error');
      setLoading(true);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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

  const retryAuth = useCallback(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        serverStatus,
        elapsedSeconds,
        retryAuth,
        login,
        register,
        logout,
        setUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
