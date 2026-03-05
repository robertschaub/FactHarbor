/**
 * Jobs List Page v2.4.4
 *
 * Lists all analysis jobs with status, progress, and links to results
 *
 * @version 2.4.4
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isFalseBand, getConfidenceTierLabel, formatVerdictText } from "@/lib/analyzer/truth-scale";
import styles from "./page.module.css";

type JobSummary = {
  jobId: string;
  status: string;
  progress: number;
  createdUtc: string;
  updatedUtc: string;
  inputType: string;
  inputPreview: string | null;
  pipelineVariant?: string;
  verdictLabel?: string;
  truthPercentage?: number;
  confidence?: number;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type JobsResponse = {
  jobs: JobSummary[];
  pagination?: PaginationInfo;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const DEFAULT_POLL_INTERVAL_MS = 10_000;
const RATE_LIMIT_BACKOFF_MS = 60_000;

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pollIntervalMs, setPollIntervalMs] = useState(DEFAULT_POLL_INTERVAL_MS);
  const [isVisible, setIsVisible] = useState(true);

  // Debounce search input — reset to page 1 after 400ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pause polling while tab is hidden to reduce read-rate pressure.
  useEffect(() => {
    const onVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: pageSize.toString()
        });
        if (debouncedQuery) params.set("q", debouncedQuery);
        const res = await fetch(`/api/fh/jobs?${params}`, { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 429) {
            let message = `Rate limit reached. Retrying automatically in ${Math.round(RATE_LIMIT_BACKOFF_MS / 1000)} seconds.`;
            try {
              const payload = await res.json();
              if (payload?.error && typeof payload.error === "string") {
                message = payload.error;
              }
            } catch {
              // Keep fallback message when payload is not JSON.
            }
            setError(message);
            setMaintenance(false);
            setPollIntervalMs(RATE_LIMIT_BACKOFF_MS);
            return; // Keep existing jobs visible
          }
          if (res.status === 502 || res.status === 503) {
            setMaintenance(true);
            setError(null);
            return; // Keep existing jobs visible
          }
          throw new Error(`Failed to load jobs: ${res.status}`);
        }
        const data: JobsResponse = await res.json();
        setError(null);
        setMaintenance(false);
        setPollIntervalMs(DEFAULT_POLL_INTERVAL_MS);
        setJobs(data.jobs || []);
        if (data.pagination) {
          setTotalCount(data.pagination.totalCount);
          setTotalPages(data.pagination.totalPages);
        }
      } catch (err: any) {
        const msg = err.message || "";
        // Network errors during deployment — show maintenance banner, not red error
        if (msg.includes("NetworkError") || msg.includes("Failed to fetch") || msg.includes("ECONNREFUSED")) {
          setMaintenance(true);
          setError(null);
        } else {
          setError(msg || "Failed to load jobs");
          setMaintenance(false);
        }
      } finally {
        setLoading(false);
      }
    };

    if (isVisible) {
      loadJobs();
    }

    const interval = setInterval(() => {
      if (document.hidden) return;
      loadJobs();
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [currentPage, pageSize, debouncedQuery, pollIntervalMs, isVisible]);

  // Reset to page 1 when page size changes
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case "SUCCEEDED": return styles.statusSuccess;
      case "FAILED": return styles.statusFailed;
      case "RUNNING": return styles.statusRunning;
      case "QUEUED": return styles.statusPending;
      case "PAUSED": return styles.statusPaused;
      case "CANCELLED": return styles.statusCancelled;
      default: return "";
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "SUCCEEDED": return styles.statusBadgeSuccess;
      case "FAILED": return styles.statusBadgeFailed;
      case "RUNNING": return styles.statusBadgeRunning;
      case "QUEUED": return styles.statusBadgePending;
      case "PAUSED": return styles.statusBadgePaused;
      case "CANCELLED": return styles.statusBadgeCancelled;
      default: return "";
    }
  };

  const getProgressClass = (status: string): string => {
    switch (status) {
      case "SUCCEEDED": return styles.progressPercentSuccess;
      case "FAILED": return styles.progressPercentFailed;
      case "RUNNING": return styles.progressPercentRunning;
      case "QUEUED": return styles.progressPercentPending;
      case "PAUSED": return styles.progressPercentPaused;
      case "CANCELLED": return styles.progressPercentCancelled;
      default: return styles.progressPercentDefault;
    }
  };

  const isCompleteStatus = (status: string): boolean => {
    return status === "SUCCEEDED" || status === "FAILED" || status === "CANCELLED";
  };

  const shouldHideProgressPercent = (job: JobSummary): boolean => {
    return isCompleteStatus(job.status) && job.progress >= 100;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const getPipelineBadge = (variant?: string): { icon: string; label: string; className: string } => {
    return { icon: "🎯", label: "ClaimBoundary", className: styles.pipelineBadgeDefault };
  };

  const getVerdictBadge = (label?: string): { icon: string; text: string; className: string } | null => {
    if (!label) return null;
    
    switch (label) {
      case "TRUE": return { icon: "✅", text: "True", className: styles.verdictTrue };
      case "MOSTLY-TRUE": return { icon: "✓", text: "Mostly True", className: styles.verdictMostlyTrue };
      case "LEANING-TRUE": return { icon: "◐", text: "Leaning True", className: styles.verdictLeaningTrue };
      case "MIXED": return { icon: "⚖", text: "Mixed", className: styles.verdictMixed };
      case "UNVERIFIED": return { icon: "?", text: "Unverified", className: styles.verdictUnverified };
      case "LEANING-FALSE": return { icon: "◔", text: "Leaning False", className: styles.verdictLeaningFalse };
      case "MOSTLY-FALSE": return { icon: "✗", text: "Mostly False", className: styles.verdictMostlyFalse };
      case "FALSE": return { icon: "❌", text: "False", className: styles.verdictFalse };
      default: return { icon: "❓", text: label, className: styles.verdictDefault };
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Fact-Check Reports</h1>
        <Link href="/analyze" className={styles.newAnalysisLink}>
          + New Fact-Check
        </Link>
      </div>

      <div className={styles.searchBar}>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search reports..."
          className={styles.searchInput}
          aria-label="Search reports"
        />
      </div>

      {maintenance && (
        <div className={styles.maintenanceBox}>
          &#9881; System update in progress — data will refresh automatically when the service is back.
        </div>
      )}

      {error && (
        <div className={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>
          Loading reports...
        </div>
      ) : jobs.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          {debouncedQuery ? (
            <>
              <h3 className={styles.emptyTitle}>No results for &ldquo;{debouncedQuery}&rdquo;</h3>
              <p className={styles.emptyText}>Try a different search term</p>
            </>
          ) : (
            <>
              <h3 className={styles.emptyTitle}>No reports yet</h3>
              <p className={styles.emptyText}>Start your first verification analysis</p>
              <Link href="/analyze" className={styles.emptyButton}>
                Start Analysis
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className={styles.jobsList}>
          {jobs.map((job) => (
            <Link
              key={job.jobId}
              href={`/jobs/${job.jobId}`}
              className={styles.jobLink}
            >
              <div className={styles.jobCard}>
                {/* Status indicator */}
                <div className={`${styles.statusIndicator} ${getStatusClass(job.status)}`}>
                  {job.status === "SUCCEEDED" && <span className={`${styles.statusIcon} ${styles.statusIconSuccess}`}>✅</span>}
                  {job.status === "FAILED" && <span className={styles.statusIcon}>❌</span>}
                  {job.status === "RUNNING" && <span className={styles.statusIcon}>⏳</span>}
                  {job.status === "QUEUED" && <span className={styles.statusIcon}>🕐</span>}
                  {job.status === "PAUSED" && <span className={styles.statusIcon}>⏸️</span>}
                  {job.status === "CANCELLED" && <span className={styles.statusIcon}>🚫</span>}
                </div>

                {/* Job info */}
                <div className={styles.jobInfo}>
                  {job.status !== "SUCCEEDED" && (
                    <div className={styles.jobMeta}>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                  )}
                  <div className={styles.jobPreview}>
                    {job.inputPreview || "No preview available"}
                  </div>
                  {job.verdictLabel && (() => {
                    const vBadge = getVerdictBadge(job.verdictLabel);
                    if (!vBadge) return null;
                    const displayPct = job.truthPercentage !== undefined
                      ? (isFalseBand(job.verdictLabel) ? 100 - job.truthPercentage : job.truthPercentage)
                      : undefined;
                    return (
                      <div style={{ margin: "0 0 4px" }}>
                        <span className={`${styles.verdictBadge} ${vBadge.className}`} title={`Verdict: ${vBadge.text}${job.confidence != null ? ` · Confidence: ${job.confidence}%` : ""}`}>
                          {vBadge.icon} {vBadge.text} <span style={{ fontWeight: 400 }}>{displayPct !== undefined && <>· {formatVerdictText(displayPct, job.verdictLabel)}</>}
                          {job.confidence !== undefined && <> · {getConfidenceTierLabel(job.confidence)}</>}</span>
                        </span>
                      </div>
                    );
                  })()}
                  <div className={styles.jobTimestamp}>
                    Created: {formatDate(job.createdUtc)}
                  </div>
                  <div>
                    <code className={styles.jobIdCode}>{job.jobId.slice(0, 8)}...</code>
                  </div>
                </div>

                {/* Progress */}
                <div className={styles.jobProgress}>
                  {!shouldHideProgressPercent(job) && (
                    <div className={`${styles.progressPercent} ${getProgressClass(job.status)}`}>
                      {job.progress}%
                    </div>
                  )}
                  {job.status === "RUNNING" && (
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className={styles.jobArrow}>→</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Footer with pagination */}
      <div className={styles.footer}>
        <div className={styles.footerRow}>
          <span>
            Showing {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} job{totalCount !== 1 ? "s" : ""}
          </span>
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
          <div className={styles.pageSizeControl}>
            <label htmlFor="pageSize">Per page:</label>
            <select
              id="pageSize"
              className={styles.limitSelect}
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className={styles.footerNote}>
          Auto-refreshes every 10 seconds (with automatic rate-limit backoff)
        </div>
      </div>
    </div>
  );
}
