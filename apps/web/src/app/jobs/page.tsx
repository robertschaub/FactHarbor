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

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const res = await fetch("/api/fh/jobs", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to load jobs: ${res.status}`);
        }
        const data = await res.json();
        setJobs(data.jobs || []);
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

      {/* Footer info */}
      <div className={styles.footer}>
        Showing {jobs.length} job{jobs.length !== 1 ? "s" : ""} • Auto-refreshes every 5 seconds
      </div>
    </div>
  );
}
