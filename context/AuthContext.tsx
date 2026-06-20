'use client'

import { useState, useEffect, createContext, useContext } from 'react';
import { apiService, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  updateProfile: (username: string, email: string) => Promise<string | null>;
  loginWithGoogle: (accessToken: string) => Promise<string | null>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    apiService.setOnUnauthorized(() => setUser(null));
    return () => apiService.setOnUnauthorized(undefined);
  }, []);

  const checkAuth = async () => {
    try {
      const response = await apiService.getProfile();
      if (response.data) setUser(response.data.user);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<string | null> => {
    const response = await apiService.login(email, password);
    if (response.data) {
      setUser(response.data.user);
      return null;
    }
    return response.error || 'Login failed';
  };

  const register = async (email: string, username: string, password: string): Promise<string | null> => {
    const response = await apiService.register(email, username, password);
    if (response.data) {
      setUser(response.data.user);
      return null;
    }
    return response.error || 'Registration failed';
  };

  const logout = async () => {
    await apiService.logout();
    setUser(null);
  };

  const updateProfile = async (username: string, email: string): Promise<string | null> => {
    const response = await apiService.updateProfile(username, email);
    if (response.data) {
      setUser(response.data.user);
      return null;
    }
    return response.error || 'Update failed';
  };

  const loginWithGoogle = async (accessToken: string): Promise<string | null> => {
    const response = await apiService.googleAuth(accessToken);
    if (response.data) {
      setUser(response.data.user);
      return null;
    }
    return response.error || 'Google sign-in failed';
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    loginWithGoogle,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
