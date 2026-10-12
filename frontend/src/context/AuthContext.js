'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialiseSession = async () => {
      const storedUser = api.getCurrentUser();

      // Yield once before updating React state so hydration and the first render stay stable.
      await Promise.resolve();
      if (cancelled) return;

      if (!storedUser) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.getMe();
        const freshUser = response?.user || response;
        if (cancelled) return;
        if (!freshUser || !freshUser.id) {
          throw new Error('Session did not return a valid user');
        }
        setUser(freshUser);
        api.setCurrentUser(freshUser);
      } catch {
        if (!cancelled) {
          api.logout();
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initialiseSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.login(email, password);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, fullName, phone) => {
    setLoading(true);
    try {
      const data = await api.register(email, password, fullName, phone);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
