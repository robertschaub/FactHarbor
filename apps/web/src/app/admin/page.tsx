/**
 * Admin Page
 *
 * Main administration page with links to admin tools
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../../styles/common.module.css";
import type { PipelineVariant } from "@/lib/pipeline-variant";
import { readDefaultPipelineVariant, writeDefaultPipelineVariant } from "@/lib/pipeline-variant";

export default function AdminPage() {
  const [defaultPipeline, setDefaultPipeline] = useState<PipelineVariant>("orchestrated");

  // Load saved default pipeline on mount
  useEffect(() => {
    setDefaultPipeline(readDefaultPipelineVariant());
  }, []);

  const selectPipeline = (variant: PipelineVariant) => {
    setDefaultPipeline(variant);
    writeDefaultPipelineVariant(variant);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>FactHarbor Administration</h1>
      <p className={styles.subtitle}>
        Administrative tools and configuration testing
      </p>

      {/* Default pipeline selection (browser-local) */}
      <div style={{ marginBottom: 24, maxWidth: 800, width: "100%" }}>
        <h2 style={{ margin: "10px 0" }}>Default Analysis Pipeline</h2>
        <p style={{ marginTop: 0, color: "#666", fontSize: 14 }}>
          Click to set the default pipeline for new analyses in this browser. This will be pre-selected on{" "}
          <Link href="/analyze">Analyze</Link>.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <div
            onClick={() => selectPipeline("orchestrated")}
            role="button"
            tabIndex={0}
            style={{
              cursor: "pointer",
              border: defaultPipeline === "orchestrated" ? "2px solid #28a745" : "1px solid #ddd",
              borderRadius: 8,
              padding: 14,
              background: defaultPipeline === "orchestrated" ? "#f3fff6" : "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span>🎯</span>
              <strong>Orchestrated</strong>
              {defaultPipeline === "orchestrated" && (
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#28a745" }}>
                  Selected
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "#555" }}>
              Highest quality multi-stage pipeline. Best for complex claims and multi-scope analysis.
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666" }}>
              <span title="Quality">⭐⭐⭐⭐⭐</span>
              <span title="Speed">2-5 min</span>
              <span title="Cost">$0.50-$2</span>
            </div>
          </div>

          <div
            onClick={() => selectPipeline("monolithic_canonical")}
            role="button"
            tabIndex={0}
            style={{
              cursor: "pointer",
              border: defaultPipeline === "monolithic_canonical" ? "2px solid #ffc107" : "1px solid #ddd",
              borderRadius: 8,
              padding: 14,
              background: defaultPipeline === "monolithic_canonical" ? "#fffaf0" : "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span>🔬</span>
              <strong>Monolithic Canonical</strong>
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: defaultPipeline === "monolithic_canonical" ? "#ffc107" : "#666" }}>
                {defaultPipeline === "monolithic_canonical" ? "Selected" : "Beta"}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#555" }}>
              Faster single-context analysis with canonical output. Good balance of speed and quality.
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666" }}>
              <span title="Quality">⭐⭐⭐⭐</span>
              <span title="Speed">30-90s</span>
              <span title="Cost">$0.15-$0.60</span>
            </div>
          </div>

          <div
            onClick={() => selectPipeline("monolithic_dynamic")}
            role="button"
            tabIndex={0}
            style={{
              cursor: "pointer",
              border: defaultPipeline === "monolithic_dynamic" ? "2px solid #e65100" : "1px solid #ddd",
              borderRadius: 8,
              padding: 14,
              background: defaultPipeline === "monolithic_dynamic" ? "#fff4f0" : "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span>⚗️</span>
              <strong>Monolithic Dynamic</strong>
              <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: defaultPipeline === "monolithic_dynamic" ? "#e65100" : "#666" }}>
                {defaultPipeline === "monolithic_dynamic" ? "Selected" : "Experimental"}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#555" }}>
              Flexible output structure for quick estimates and exploration. Lowest cost option.
            </div>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666" }}>
              <span title="Quality">⭐⭐⭐</span>
              <span title="Speed">20-60s</span>
              <span title="Cost">$0.10-$0.40</span>
            </div>
          </div>
        </div>
      </div>

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
