"use client";

import { ToastProvider } from "@/components/ToastProvider";
import { ConditionalFooter } from "@/components/ConditionalFooter";

export function LayoutClientShell() {
  return (
    <>
      <ToastProvider />
      <ConditionalFooter />
    </>
  );
}
