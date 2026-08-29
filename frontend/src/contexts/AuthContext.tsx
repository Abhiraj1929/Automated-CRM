// ============================================================
// AuthContext - Global authentication state provider
// with session timeout and inactivity auto-logout
// ============================================================
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { User, loginUser, getCurrentUser, logoutUser } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  isSuperAdmin: boolean;
  sessionExpiresAt: number | null;
  showTimeoutWarning: boolean;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session config (in milliseconds)
const SESSION_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || "86400000", 10); // 24h default
const WARNING_BEFORE = 5 * 60 * 1000; // Show warning 5 min before expiry
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every 1 minute

function getLastActivity(): number {
  if (typeof window === "undefined") return Date.now();
  const stored = localStorage.getItem("crm_last_activity");
  return stored ? parseInt(stored, 10) : Date.now();
}

function setLastActivity() {
  if (typeof window !== "undefined") {
    localStorage.setItem("crm_last_activity", Date.now().toString());
  }
}

function getSessionExpiry(): number {
  return getLastActivity() + SESSION_TIMEOUT;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track user activity and update last activity timestamp
  useEffect(() => {
    if (!user) return;

    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
    const handleActivity = () => {
      setLastActivity();
      setSessionExpiresAt(getSessionExpiry());
      setShowTimeoutWarning(false);
    };

    activityEvents.forEach((event) => document.addEventListener(event, handleActivity, { passive: true }));

    // Set initial expiry
    setSessionExpiresAt(getSessionExpiry());

    return () => {
      activityEvents.forEach((event) => document.removeEventListener(event, handleActivity));
    };
  }, [user]);

  // Set up session timeout check
  useEffect(() => {
    if (!user) return;

    const checkSession = () => {
      const now = Date.now();
      const expiry = getSessionExpiry();
      const remaining = expiry - now;

      if (remaining <= 0) {
        // Session expired — auto logout
        handleAutoLogout("Session expired due to inactivity");
        return;
      }

      if (remaining <= WARNING_BEFORE && !showTimeoutWarning) {
        // Show warning 5 min before expiry
        setShowTimeoutWarning(true);
      }
    };

    // Check immediately
    checkSession();

    // Check periodically
    checkIntervalRef.current = setInterval(checkSession, ACTIVITY_CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [user, showTimeoutWarning]);

  const handleAutoLogout = useCallback(async (reason: string) => {
    setShowTimeoutWarning(false);
    await logoutUser();
    setUser(null);
    localStorage.removeItem("crm_last_activity");
    window.location.href = `/login?reason=timeout&message=${encodeURIComponent(reason)}`;
  }, []);

  const extendSession = useCallback(() => {
    setLastActivity();
    setSessionExpiresAt(getSessionExpiry());
    setShowTimeoutWarning(false);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const result = await getCurrentUser();
      if (result.success && result.data) {
        setUser(result.data);
        setLastActivity(); // Mark activity on successful auth check
        setSessionExpiresAt(getSessionExpiry());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginUser(email, password);
    if (result.success && result.data?.user) {
      setUser(result.data.user);
      setLastActivity(); // Mark activity on login
      setSessionExpiresAt(getSessionExpiry());
      setShowTimeoutWarning(false);
      return { success: true, user: result.data.user };
    }
    return { success: false, error: result.error };
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    localStorage.removeItem("crm_last_activity");
    window.location.href = "/";
  }, []);

  const refreshUser = useCallback(async () => {
    const result = await getCurrentUser();
    if (result.success && result.data) {
      setUser(result.data);
      setLastActivity();
      setSessionExpiresAt(getSessionExpiry());
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAdmin: user?.role === "admin",
    isManager: user?.role === "manager",
    isEmployee: user?.role === "employee",
    isSuperAdmin: user?.is_super_admin === true,
    sessionExpiresAt,
    showTimeoutWarning,
    extendSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
