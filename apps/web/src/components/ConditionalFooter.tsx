"use client";

import { usePathname } from "next/navigation";
import { AboutBox } from "@/components/AboutBox";
import styles from "../app/layout.module.css";

export function ConditionalFooter() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (!isAdmin) {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <AboutBox />
    </footer>
  );
}
