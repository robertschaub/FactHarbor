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
import styles from "./page.module.css";

type JobSummary = {
  jobId: string;
  status: string;
  progress: number;
  createdUtc: string;
  updatedUtc: string;
  inputType: string;
  inputPreview: string | null;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function JobsPage() {
  const [allJobs, setAllJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const res = await fetch("/api/fh/jobs", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to load jobs: ${res.status}`);
        }
        const data = await res.json();
        setAllJobs(data.jobs || []);
      } catch (err: any) {
        setError(err.message || "Failed to load jobs");
      } finally {
        setLoading(false);
      }
    };

    loadJobs();

    // Refresh every 5 seconds
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate pagination
  const totalJobs = allJobs.length;
  const totalPages = Math.ceil(totalJobs / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalJobs);
  const jobs = allJobs.slice(startIndex, endIndex);

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
      case "PENDING": return styles.statusPending;
      default: return "";
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "SUCCEEDED": return styles.statusBadgeSuccess;
      case "FAILED": return styles.statusBadgeFailed;
      case "RUNNING": return styles.statusBadgeRunning;
      case "PENDING": return styles.statusBadgePending;
      default: return "";
    }
  };

  const getProgressClass = (status: string): string => {
    switch (status) {
      case "SUCCEEDED": return styles.progressPercentSuccess;
      case "FAILED": return styles.progressPercentFailed;
      case "RUNNING": return styles.progressPercentRunning;
      case "PENDING": return styles.progressPercentPending;
      default: return styles.progressPercentDefault;
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>FactHarbor Jobs</h1>
        <Link href="/analyze" className={styles.newAnalysisLink}>
          + New Analysis
        </Link>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>
          Loading jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <h3 className={styles.emptyTitle}>No analysis jobs yet</h3>
          <p className={styles.emptyText}>Start your first fact-check analysis</p>
          <Link href="/analyze" className={styles.emptyButton}>
            Start Analysis
          </Link>
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
                  {job.status === "SUCCEEDED" && <span className={styles.statusIcon}>✅</span>}
                  {job.status === "FAILED" && <span className={styles.statusIcon}>❌</span>}
                  {job.status === "RUNNING" && <span className={styles.statusIcon}>⏳</span>}
                  {job.status === "PENDING" && <span className={styles.statusIcon}>🕐</span>}
                </div>

                {/* Job info */}
                <div className={styles.jobInfo}>
                  <div className={styles.jobMeta}>
                    <code className={styles.jobIdCode}>{job.jobId.slice(0, 8)}...</code>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(job.status)}`}>
                      {job.status}
                    </span>
                    <span className={styles.inputTypeBadge}>
                      {job.inputType}
                    </span>
                  </div>
                  <div className={styles.jobPreview}>
                    {job.inputPreview || "No preview available"}
                  </div>
                  <div className={styles.jobTimestamp}>
                    Created: {formatDate(job.createdUtc)}
                  </div>
                </div>

                {/* Progress */}
                <div className={styles.jobProgress}>
                  <div className={`${styles.progressPercent} ${getProgressClass(job.status)}`}>
                    {job.progress}%
                  </div>
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
            Showing {totalJobs === 0 ? 0 : startIndex + 1}-{endIndex} of {totalJobs} job{totalJobs !== 1 ? "s" : ""}
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
          Auto-refreshes every 5 seconds
        </div>
      </div>
    </div>
  );
}
