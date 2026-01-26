"use client";

import { createContext, useContext } from "react";

// Admin auth context
export interface AdminAuthContext {
  isAuthenticated: boolean;
  isLoading: boolean;
  adminKey: string | null;
  login: (key: string) => Promise<boolean>;
  logout: () => void;
  getHeaders: () => HeadersInit;
}

export const AdminAuthContext = createContext<AdminAuthContext | null>(null);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminLayout");
  }
  return context;
}
