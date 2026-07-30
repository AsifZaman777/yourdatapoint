"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { User } from "@/lib/types";
import { authApi } from "@/lib/api/auth";
import { TOKEN_KEY } from "@/lib/constants";

interface AuthContextType {
  token: string;
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin =
    user?.role === "admin" || user?.role === "superadmin";

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authApi.me();
      setUser(res.data);
    } catch {
      setToken("");
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  // Initialize from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY) || "";
    if (savedToken) {
      setToken(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // When token changes, persist and fetch profile
  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      const fetchProfile = async () => {
        try {
          const res = await authApi.me();
          setUser(res.data);
        } catch {
          setToken("");
          setUser(null);
          localStorage.removeItem(TOKEN_KEY);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProfile();
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setIsLoading(false);
    }
  }, [token]);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("currentTab");
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, user, isLoading, isAdmin, login, logout, refreshProfile, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
