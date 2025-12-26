import "./globals.css";
import { AboutBox } from "@/components/AboutBox";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>FactHarbor POC1</div>
            <nav style={{ display: "flex", gap: 12 }}>
              <a href="/" style={{ textDecoration: "underline" }}>Analyze</a>
              <a href="/jobs" style={{ textDecoration: "underline" }}>Jobs</a>
            </nav>
          </header>

          <main style={{ marginTop: 16 }}>{children}</main>
        </div>

        <footer style={{ marginTop: 28, padding: "18px 16px 28px" }}>
          <AboutBox />
        </footer>
      </body>
    </html>
  );
}
