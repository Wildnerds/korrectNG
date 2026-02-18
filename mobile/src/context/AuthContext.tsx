import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch, getToken, setToken, removeToken } from '../lib/api';
import type { User } from '@korrectng/shared';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role: 'customer' | 'artisan';
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const storedToken = await getToken();
      if (storedToken) {
        setTokenState(storedToken);
        const res = await apiFetch<{ user: User }>('/auth/me', { token: storedToken });
        if (res.data?.user) {
          setUser(res.data.user);
        } else if (res.data) {
          // Handle case where user is returned directly
          setUser(res.data as unknown as User);
        }
      }
    } catch {
      await removeToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.data?.token) {
      await setToken(res.data.token);
      setTokenState(res.data.token);
      setUser(res.data.user);
    }
  };

  const register = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role: 'customer' | 'artisan';
  }) => {
    const res = await apiFetch<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.data?.token) {
      await setToken(res.data.token);
      setTokenState(res.data.token);
      setUser(res.data.user);
    }
  };

  const logout = async () => {
    try {
      const currentToken = await getToken();
      if (currentToken) {
        await apiFetch('/auth/logout', { method: 'POST', token: currentToken });
      }
    } catch {
      // Ignore logout errors
    }
    await removeToken();
    setTokenState(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const currentToken = await getToken();
    if (!currentToken) return;

    try {
      const res = await apiFetch<{ user: User }>('/auth/me', { token: currentToken });
      if (res.data?.user) {
        setUser(res.data.user);
      } else if (res.data) {
        setUser(res.data as unknown as User);
      }
    } catch {
      // Token might be invalid, logout
      await logout();
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    const currentToken = await getToken();
    if (!currentToken) throw new Error('Not authenticated');

    const res = await apiFetch<{ user: User }>('/auth/update-profile', {
      method: 'POST',
      token: currentToken,
      body: JSON.stringify(data),
    });

    if (res.data?.user) {
      setUser(res.data.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
