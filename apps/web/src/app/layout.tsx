import type { Metadata } from "next";
import "./globals.css";
import styles from "./layout.module.css";
import { LayoutClientShell } from "@/components/LayoutClientShell";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "FactHarbor",
  description: "Evidence-based claim analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <DisclaimerBanner />

        <div className={styles.wrapper}>
          <header className={styles.header}>
            <div className={styles.logo}>
              FactHarbor{" "}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  background: "#e5e7eb",
                  color: "#6b7280",
                  padding: "1px 6px",
                  borderRadius: 4,
                  verticalAlign: "middle",
                  letterSpacing: "0.03em",
                }}
              >
                Alpha
              </span>
              <div style={{ fontSize: 11, fontWeight: 400, color: "#6b7280", marginTop: 2 }}>
                AI-powered fact-checking — every verdict backed by evidence you can inspect.
              </div>
            </div>
            <nav className={styles.nav}>
              <a href="/analyze" className={styles.navLink}>Analyze</a>
              <a href="/jobs" className={styles.navLink}>Jobs</a>
              <a href="/source-reliability" className={styles.navLink}>Sources</a>
              <a href="/admin" className={styles.navLink}>Admin</a>
            </nav>
          </header>

          <main className={styles.main}>{children}</main>
        </div>

        <LayoutClientShell />
        <Footer />

      </body>
    </html>
  );
}
