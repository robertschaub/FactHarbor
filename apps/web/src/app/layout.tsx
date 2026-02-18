import "./globals.css";
import styles from "./layout.module.css";
import { LayoutClientShell } from "@/components/LayoutClientShell";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <div className={styles.wrapper}>
          <header className={styles.header}>
            <div className={styles.logo}>FactHarbor Alpha</div>
            <nav className={styles.nav}>
              <a href="/analyze" className={styles.navLink}>Analyze</a>
              <a href="/jobs" className={styles.navLink}>Jobs</a>
              <a href="/admin" className={styles.navLink}>Admin</a>
            </nav>
          </header>

          <main className={styles.main}>{children}</main>
        </div>

        <LayoutClientShell />

      </body>
    </html>
  );
}
