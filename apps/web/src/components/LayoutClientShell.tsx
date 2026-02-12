"use client";

import { ToastProvider } from "@/components/ToastProvider";
import { SystemHealthBanner } from "@/components/SystemHealthBanner";
import { ConditionalFooter } from "@/components/ConditionalFooter";

export function LayoutClientShell() {
  return (
    <>
      <ToastProvider />
      <SystemHealthBanner />
      <ConditionalFooter />
    </>
  );
}
