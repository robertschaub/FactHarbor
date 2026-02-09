import "./globals.css";
import styles from "./layout.module.css";
import { ConditionalFooter } from "@/components/ConditionalFooter";
import { SystemHealthBanner } from "@/components/SystemHealthBanner";
import { Toaster } from "react-hot-toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            success: {
              duration: 3000,
              style: {
                background: '#10b981',
                color: '#fff',
              },
            },
            error: {
              duration: 6000,
              style: {
                background: '#ef4444',
                color: '#fff',
              },
            },
          }}
        />
        <SystemHealthBanner />
        <div className={styles.wrapper}>
          <header className={styles.header}>
            <div className={styles.logo}>FactHarbor POC1</div>
            <nav className={styles.nav}>
              <a href="/analyze" className={styles.navLink}>Analyze</a>
              <a href="/jobs" className={styles.navLink}>Jobs</a>
              <a href="/admin" className={styles.navLink}>Admin</a>
            </nav>
          </header>

          <main className={styles.main}>{children}</main>
        </div>

        <ConditionalFooter />
      </body>
    </html>
  );
}
