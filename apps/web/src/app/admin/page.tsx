/**
 * Admin Page
 *
 * Main administration page with links to admin tools
 */

"use client";

import Link from "next/link";
import styles from "../../styles/common.module.css";

export default function AdminPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>FactHarbor Administration</h1>
      <p className={styles.subtitle}>
        Administrative tools and configuration testing
      </p>

      <div style={{ display: "grid", gap: "16px", maxWidth: "600px" }}>
        <Link href="/admin/test-config" className={styles.btnPrimary}>
          🔧 Configuration Test Dashboard
        </Link>
        <p style={{ fontSize: "14px", color: "#666" }}>
          Test and validate API keys and service configurations
        </p>
      </div>
    </div>
  );
}
