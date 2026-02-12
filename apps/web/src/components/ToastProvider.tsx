"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        success: {
          duration: 3000,
          style: {
            background: "#10b981",
            color: "#fff",
          },
        },
        error: {
          duration: 6000,
          style: {
            background: "#ef4444",
            color: "#fff",
          },
        },
      }}
    />
  );
}

