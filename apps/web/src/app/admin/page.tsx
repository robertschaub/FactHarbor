/**
 * Admin Page
 *
 * Main administration page with links to admin tools
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../../styles/common.module.css";
import type { PipelineVariant } from "@/lib/pipeline-variant";
import { readDefaultPipelineVariant, writeDefaultPipelineVariant } from "@/lib/pipeline-variant";
import toast from "react-hot-toast";
import { useAdminAuth } from "./admin-auth-context";

type ProviderHealth = {
  state: string;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  lastFailureMessage: string | null;
  lastSuccessTime: number | null;
};

type HealthState = {
  providers: Record<string, ProviderHealth>;
  systemPaused: boolean;
  pausedAt: number | null;
  pauseReason: string | null;
};

export default function AdminPage() {
  const [defaultPipeline, setDefaultPipeline] = useState<PipelineVariant>("claimboundary");
  const [exporting, setExporting] = useState(false);
  const [jobIdInput, setJobIdInput] = useState("");
  const [health, setHealth] = useState<HealthState | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthAction, setHealthAction] = useState<"resume" | "pause" | null>(null);
  const { adminKey } = useAdminAuth();
  const router = useRouter();

  // Load saved default pipeline on mount
  useEffect(() => {
    setDefaultPipeline(readDefaultPipelineVariant());
  }, []);

  // Poll system health
  useEffect(() => {
    let mounted = true;
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/fh/system-health", { cache: "no-store" });
        if (res.ok && mounted) {
          setHealth(await res.json());
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setHealthLoading(false);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 10_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const handleHealthAction = async (action: "resume" | "pause") => {
    setHealthAction(action);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminKey) {
        headers["x-admin-key"] = adminKey;
      }
      const res = await fetch("/api/fh/system-health", {
        method: "POST",
        headers,
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setHealth(data.healthState ?? null);
        toast.success(`System ${action === "resume" ? "resumed" : "paused"} successfully`);
      } else {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        if (res.status === 401) {
          toast.error("Unauthorized: set Admin Key before pause/resume.");
          return;
        }
        toast.error(`Failed to ${action}: ${data.error}`);
      }
    } catch (err) {
      toast.error(`Failed to ${action}: ${err instanceof Error ? err.message : "Network error"}`);
    } finally {
      setHealthAction(null);
    }
  };

  const selectPipeline = (variant: PipelineVariant) => {
    setDefaultPipeline(variant);
    writeDefaultPipelineVariant(variant);
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/admin/config/export-all");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Export failed");
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      a.download = `factharbor-config-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Configuration backup downloaded successfully");
    } catch (error) {
      toast.error(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setExporting(false);
    }
  };

  const handleJobConfigOpen = () => {
    const trimmed = jobIdInput.trim();
    if (!trimmed) {
      toast.error("Enter a job ID to view its config snapshot");
      return;
    }
    const target = `/admin/quality/job/${encodeURIComponent(trimmed)}`;
    try {
      router.push(target);
    } catch (err) {
      console.warn("[Admin] Router push failed, falling back to location:", err);
      window.location.assign(target);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>FactHarbor Administration</h1>
      <p className={styles.subtitle}>
        Administrative tools and configuration testing
      </p>

      {/* System Health Section */}
      <div style={{ marginBottom: 24, maxWidth: 800, width: "100%" }}>
        <h2 style={{ margin: "10px 0" }}>System Health</h2>
        {healthLoading ? (
          <p style={{ color: "#666", fontSize: 14 }}>Loading health state...</p>
        ) : health ? (
          <div style={{
            border: health.systemPaused ? "2px solid #dc3545" : "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            background: health.systemPaused ? "#fff5f5" : "#f8f9fa",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>{health.systemPaused ? "🔴" : "🟢"}</span>
              <strong style={{ fontSize: 16, color: health.systemPaused ? "#dc3545" : "#28a745" }}>
                {health.systemPaused ? "System PAUSED" : "System Healthy"}
              </strong>
            </div>

            {health.systemPaused && health.pauseReason && (
              <div style={{
                padding: "8px 12px",
                background: "#f8d7da",
                borderRadius: 6,
                fontSize: 13,
                color: "#721c24",
                marginBottom: 12,
              }}>
                <strong>Reason:</strong> {health.pauseReason}
                {health.pausedAt && (
                  <span style={{ marginLeft: 12, opacity: 0.7 }}>
                    (since {new Date(health.pausedAt).toLocaleString()})
                  </span>
                )}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              {Object.entries(health.providers).map(([name, p]) => (
                <div key={name} style={{
                  padding: "10px 12px",
                  border: `1px solid ${p.state === "closed" ? "#d4edda" : "#f5c6cb"}`,
                  borderRadius: 6,
                  background: p.state === "closed" ? "#f3fff6" : "#fff5f5",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, textTransform: "uppercase" }}>{name}</strong>
                    <span style={{
                      fontSize: 11,
                      padding: "1px 6px",
                      borderRadius: 3,
                      fontWeight: 600,
                      background: p.state === "closed" ? "#d4edda" : p.state === "open" ? "#f8d7da" : "#fff3cd",
                      color: p.state === "closed" ? "#28a745" : p.state === "open" ? "#dc3545" : "#856404",
                    }}>
                      {p.state.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    Failures: {p.consecutiveFailures}
                    {p.lastFailureMessage && (
                      <div style={{ marginTop: 4, fontSize: 11, color: "#999", wordBreak: "break-all" }}>
                        Last: {p.lastFailureMessage.substring(0, 100)}
                        {p.lastFailureMessage.length > 100 ? "..." : ""}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {health.systemPaused ? (
                <button
                  type="button"
                  onClick={() => handleHealthAction("resume")}
                  disabled={healthAction !== null}
                  className={styles.btnPrimary}
                  style={{ background: "#28a745", cursor: healthAction ? "wait" : "pointer" }}
                >
                  {healthAction === "resume" ? "Resuming..." : "Resume Processing"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleHealthAction("pause")}
                  disabled={healthAction !== null}
                  className={styles.btnPrimary}
                  style={{ background: "#dc3545", cursor: healthAction ? "wait" : "pointer" }}
                >
                  {healthAction === "pause" ? "Pausing..." : "Pause Processing"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p style={{ color: "#999", fontSize: 14 }}>Unable to load system health</p>
        )}
      </div>


      {/* Access Control Section */}
      <div style={{ marginBottom: 32, maxWidth: "600px" }}>
        <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600, color: "#374151" }}>
          Access Control & Invites
        </h2>
        <div style={{ display: "grid", gap: "16px" }}>
          <Link href="/admin/invites" className={styles.btnPrimary} style={{ background: "#f59e0b" }}>
            🎫 Invite Code Management
          </Link>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "-8px" }}>
            Create, manage, and monitor alpha-preview invite codes and usage quotas.
          </p>
        </div>
      </div>

      {/* FactHarbor Quality Section */}
      <div style={{ marginBottom: 32, maxWidth: "600px" }}>
        <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600, color: "#374151" }}>
          FactHarbor Quality Administration
        </h2>
        <div style={{ display: "grid", gap: "16px" }}>
          <Link href="/admin/config" className={styles.btnPrimary} style={{ background: "#10b981" }}>
            ⚙️ Unified Configuration Management
          </Link>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "-8px" }}>
            <strong>Recommended:</strong> Manage pipeline, search, calculation, and prompt configurations with version history
          </p>

          <Link href="/admin/test-config" className={styles.btnPrimary}>
            🔧 Configuration Test Dashboard
          </Link>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "-8px" }}>
            Test and validate API keys and service configurations
          </p>

          <Link href="/admin/quality-health" className={styles.btnPrimary} style={{ background: "#8b5cf6" }}>
            Analysis Monitoring
          </Link>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "-8px" }}>
            Unified dashboard: quality gates, quality health (F4/F5/F6), failure modes, performance &amp; cost
          </p>

          <button
            onClick={handleExportAll}
            disabled={exporting}
            className={styles.btnPrimary}
            style={{ background: "#6366f1", cursor: exporting ? "wait" : "pointer" }}
          >
            {exporting ? "⏳ Exporting..." : "📥 Export All Configurations"}
          </button>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "-8px" }}>
            Download complete backup of all active configurations (disaster recovery)
          </p>
        </div>
      </div>

      {/* Source Reliability Section */}
      <div style={{ marginBottom: 32, maxWidth: "600px" }}>
        <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600, color: "#374151" }}>
          Source Reliability (SR) Administration
        </h2>
        <div style={{ display: "grid", gap: "16px" }}>
          <Link href="/admin/source-reliability" className={styles.btnPrimary}>
            📊 Source Reliability Cache
          </Link>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "-8px" }}>
            View and manage cached source reliability scores
          </p>
        </div>
      </div>

      {/* Job Audit Section */}
      <div style={{ marginBottom: 32, maxWidth: "600px" }}>
        <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600, color: "#374151" }}>
          Job Audit & Debugging
        </h2>
        <div style={{ display: "grid", gap: "12px" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJobConfigOpen();
            }}
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <input
              type="text"
              value={jobIdInput}
              onChange={(e) => setJobIdInput(e.target.value)}
              placeholder="Job Config Viewer"
              aria-label="Job Config Viewer"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #ddd",
                fontSize: 14,
              }}
            />
            <button
              type="submit"
              className={styles.btnSecondary}
              style={{ padding: "10px 12px" }}
            >
              🔍 Open
            </button>
          </form>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "-8px" }}>
            View complete config snapshot for any job: <code>/admin/quality/job/[jobId]</code>
            <br />
            <span style={{ fontSize: 12, color: "#999" }}>Enter a job ID above or navigate directly via URL</span>
          </p>
        </div>
      </div>
    </div>
  );
}
