"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import styles from "./admin.module.css";

// Admin auth context
interface AdminAuthContext {
  isAuthenticated: boolean;
  isLoading: boolean;
  adminKey: string | null;
  login: (key: string) => Promise<boolean>;
  logout: () => void;
  getHeaders: () => HeadersInit;
}

const AdminAuthContext = createContext<AdminAuthContext | null>(null);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminLayout");
  }
  return context;
}

// Get admin key from sessionStorage
function getStoredAdminKey(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("fh_admin_key");
  }
  return null;
}

function setStoredAdminKey(key: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("fh_admin_key", key);
  }
}

function clearStoredAdminKey(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("fh_admin_key");
  }
}

// Verify admin key against API
async function verifyAdminKey(key: string): Promise<boolean> {
  try {
    const response = await fetch("/api/admin/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": key,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check stored key on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedKey = getStoredAdminKey();
      if (storedKey) {
        const valid = await verifyAdminKey(storedKey);
        if (valid) {
          setAdminKey(storedKey);
          setIsAuthenticated(true);
        } else {
          clearStoredAdminKey();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = useCallback(async (key: string): Promise<boolean> => {
    const valid = await verifyAdminKey(key);
    if (valid) {
      setStoredAdminKey(key);
      setAdminKey(key);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    clearStoredAdminKey();
    setAdminKey(null);
    setIsAuthenticated(false);
  }, []);

  const getHeaders = useCallback((): HeadersInit => {
    const headers: HeadersInit = {};
    if (adminKey) {
      headers["x-admin-key"] = adminKey;
    }
    return headers;
  }, [adminKey]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const success = await login(keyInput.trim());
      if (!success) {
        setLoginError("Invalid admin key");
      }
    } catch {
      setLoginError("Failed to verify key");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <div className={styles.loading}>Checking authentication...</div>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <h1 className={styles.loginTitle}>Admin Login</h1>
          <p className={styles.loginSubtitle}>
            Enter your admin key to access administration tools
          </p>

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter FH_ADMIN_KEY"
              className={styles.loginInput}
              autoFocus
              disabled={isLoggingIn}
            />
            <button
              type="submit"
              className={styles.loginButton}
              disabled={isLoggingIn || !keyInput.trim()}
            >
              {isLoggingIn ? "Verifying..." : "Login"}
            </button>
          </form>

          {loginError && (
            <div className={styles.loginError}>{loginError}</div>
          )}

          <p className={styles.loginHint}>
            The admin key is set via the <code>FH_ADMIN_KEY</code> environment variable.
          </p>
        </div>
      </div>
    );
  }

  // Render children with auth context
  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, isLoading, adminKey, login, logout, getHeaders }}>
      <div className={styles.adminWrapper}>
        <div className={styles.adminHeader}>
          <span className={styles.adminBadge}>Admin</span>
          <button onClick={logout} className={styles.logoutButton}>
            Logout
          </button>
        </div>
        {children}
      </div>
    </AdminAuthContext.Provider>
  );
}
