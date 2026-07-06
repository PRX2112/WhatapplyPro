import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import type { AuthUser, Business } from "../lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  business: Business | null;
  token: string | null;
  geminiLive: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshBusiness: () => Promise<void>;
  markGuideAsSeen: () => Promise<void>;
}

interface RegisterData {
  businessName: string;
  businessType: string;
  name: string;
  email: string;
  password: string;
  businessUpiId?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [geminiLive, setGeminiLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyAuthData = (token: string, userData: any, businessData: any) => {
    localStorage.setItem("wa_token", token);
    setToken(token);
    setUser(userData);
    setBusiness(businessData);
  };

  const login = async (email: string, password: string) => {
    const data = await api.auth.login({ email, password });
    applyAuthData(data.token, data.user, data.business);
  };

  const register = async (formData: RegisterData) => {
    const data = await api.auth.register(formData);
    applyAuthData(data.token, data.user, data.business);
  };

  const logout = useCallback(() => {
    localStorage.removeItem("wa_token");
    setToken(null);
    setUser(null);
    setBusiness(null);
  }, []);

  const refreshBusiness = useCallback(async () => {
    try {
      const biz = await api.business.get();
      setBusiness(biz);
    } catch {}
  }, []);

  const markGuideAsSeen = useCallback(async () => {
    try {
      await api.auth.seenGuide();
      setUser((prev) => prev ? { ...prev, hasSeenGuide: true } : null);
    } catch (err) {
      console.error("Failed to mark guide as seen:", err);
    }
  }, []);

  // On mount: restore session from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("wa_token");
    if (!storedToken) {
      setLoading(false);
      return;
    }

    setToken(storedToken);
    api.auth
      .me()
      .then((data) => {
        setUser(data.user);
        setBusiness(data.business);
      })
      .catch(() => {
        localStorage.removeItem("wa_token");
        setToken(null);
      })
      .finally(() => setLoading(false));

    api.ai.status().then((s) => setGeminiLive(s.geminiLive)).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, business, token, geminiLive, loading, login, register, logout, refreshBusiness, markGuideAsSeen }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
