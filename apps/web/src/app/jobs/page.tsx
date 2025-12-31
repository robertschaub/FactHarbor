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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "SUCCEEDED": return "#28a745";
      case "FAILED": return "#dc3545";
      case "RUNNING": return "#007bff";
      case "PENDING": return "#ffc107";
      default: return "#6c757d";
    }
  };

  const getStatusBg = (status: string): string => {
    switch (status) {
      case "SUCCEEDED": return "#d4edda";
      case "FAILED": return "#f8d7da";
      case "RUNNING": return "#cce5ff";
      case "PENDING": return "#fff3cd";
      default: return "#e9ecef";
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
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>FactHarbor Jobs</h1>
        <Link 
          href="/analyze" 
          style={{ 
            padding: "10px 20px", 
            backgroundColor: "#007bff", 
            color: "#fff", 
            borderRadius: 8, 
            textDecoration: "none",
            fontWeight: 600
          }}
        >
          + New Analysis
        </Link>
      </div>

      {error && (
        <div style={{ 
          padding: 16, 
          backgroundColor: "#f8d7da", 
          color: "#721c24", 
          borderRadius: 8, 
          marginBottom: 20,
          border: "1px solid #f5c6cb"
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
          Loading jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          padding: 60, 
          backgroundColor: "#f8f9fa", 
          borderRadius: 12,
          border: "1px solid #ddd"
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <h3 style={{ margin: "0 0 8px", color: "#333" }}>No analysis jobs yet</h3>
          <p style={{ color: "#666", marginBottom: 20 }}>Start your first fact-check analysis</p>
          <Link 
            href="/analyze" 
            style={{ 
              padding: "12px 24px", 
              backgroundColor: "#007bff", 
              color: "#fff", 
              borderRadius: 8, 
              textDecoration: "none",
              fontWeight: 600,
              display: "inline-block"
            }}
          >
            Start Analysis
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {jobs.map((job) => (
            <Link 
              key={job.jobId} 
              href={`/jobs/${job.jobId}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={{ 
                padding: 16, 
                border: "1px solid #ddd", 
                borderRadius: 10, 
                backgroundColor: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 16,
                transition: "box-shadow 0.2s, border-color 0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                e.currentTarget.style.borderColor = "#007bff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "#ddd";
              }}
              >
                {/* Status indicator */}
                <div style={{ 
                  width: 50, 
                  height: 50, 
                  borderRadius: "50%", 
                  backgroundColor: getStatusBg(job.status),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  {job.status === "SUCCEEDED" && <span style={{ fontSize: 24 }}>✅</span>}
                  {job.status === "FAILED" && <span style={{ fontSize: 24 }}>❌</span>}
                  {job.status === "RUNNING" && <span style={{ fontSize: 24 }}>⏳</span>}
                  {job.status === "PENDING" && <span style={{ fontSize: 24 }}>🕐</span>}
                </div>
                
                {/* Job info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <code style={{ fontSize: 12, color: "#666" }}>{job.jobId.slice(0, 8)}...</code>
                    <span style={{ 
                      padding: "2px 8px", 
                      borderRadius: 4, 
                      fontSize: 11, 
                      fontWeight: 600,
                      backgroundColor: getStatusBg(job.status),
                      color: getStatusColor(job.status)
                    }}>
                      {job.status}
                    </span>
                    <span style={{ 
                      padding: "2px 8px", 
                      borderRadius: 4, 
                      fontSize: 11,
                      backgroundColor: "#e9ecef",
                      color: "#495057"
                    }}>
                      {job.inputType}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: 14, 
                    color: "#333", 
                    overflow: "hidden", 
                    textOverflow: "ellipsis", 
                    whiteSpace: "nowrap",
                    marginBottom: 4
                  }}>
                    {job.inputPreview || "No preview available"}
                  </div>
                  <div style={{ fontSize: 11, color: "#888" }}>
                    Created: {formatDate(job.createdUtc)}
                  </div>
                </div>
                
                {/* Progress */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: getStatusColor(job.status) }}>
                    {job.progress}%
                  </div>
                  {job.status === "RUNNING" && (
                    <div style={{ 
                      width: 80, 
                      height: 6, 
                      backgroundColor: "#e9ecef", 
                      borderRadius: 3,
                      marginTop: 4,
                      overflow: "hidden"
                    }}>
                      <div style={{ 
                        width: `${job.progress}%`, 
                        height: "100%", 
                        backgroundColor: "#007bff",
                        transition: "width 0.3s"
                      }} />
                    </div>
                  )}
                </div>
                
                {/* Arrow */}
                <div style={{ color: "#ccc", fontSize: 20 }}>→</div>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {/* Footer info */}
      <div style={{ 
        marginTop: 30, 
        padding: 16, 
        backgroundColor: "#f8f9fa", 
        borderRadius: 8, 
        fontSize: 12, 
        color: "#666",
        textAlign: "center"
      }}>
        Showing {jobs.length} job{jobs.length !== 1 ? "s" : ""} • Auto-refreshes every 5 seconds
      </div>
    </div>
  );
}
