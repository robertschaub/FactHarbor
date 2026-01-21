"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import styles from "./source-reliability.module.css";

interface CachedScore {
  domain: string;
  score: number;
  confidence: number;
  evaluatedAt: string;
  expiresAt: string;
  modelPrimary: string;
  modelSecondary: string | null;
  consensusAchieved: boolean;
}

interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  avgScore: number;
  avgConfidence: number;
}

interface CacheData {
  entries: CachedScore[];
  total: number;
  limit: number;
  offset: number;
  stats: CacheStats;
}

// Get admin key from sessionStorage or environment
function getAdminKey(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("fh_admin_key");
  }
  return null;
}

function setAdminKey(key: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("fh_admin_key", key);
  }
}

export default function SourceReliabilityPage() {
  const [data, setData] = useState<CacheData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState("evaluated_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [needsAuth, setNeedsAuth] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const pageSize = 25;

  // Helper to build fetch headers with admin key
  const getHeaders = useCallback((): HeadersInit => {
    const headers: HeadersInit = {};
    const adminKey = getAdminKey();
    if (adminKey) {
      headers["x-admin-key"] = adminKey;
    }
    return headers;
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/admin/source-reliability?${params}`, {
        headers: getHeaders(),
      });
      if (!response.ok) {
        if (response.status === 401) {
          setNeedsAuth(true);
          throw new Error("Unauthorized - admin key required");
        }
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      setNeedsAuth(false);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, getHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKeyInput.trim()) {
      setAdminKey(adminKeyInput.trim());
      setNeedsAuth(false);
      setError(null);
      fetchData();
    }
  };

  const handleCleanup = async () => {
    if (!confirm("Remove all expired entries from the cache?")) return;

    try {
      const response = await fetch("/api/admin/source-reliability?action=cleanup", {
        headers: getHeaders(),
      });
      if (!response.ok) {
        if (response.status === 401) {
          setNeedsAuth(true);
          throw new Error("Unauthorized");
        }
        throw new Error("Cleanup failed");
      }
      const result = await response.json();
      alert(`Deleted ${result.deleted} expired entries`);
      fetchData();
    } catch (err) {
      alert("Cleanup failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(0);
  };

  const formatScore = (score: number) => {
    return (score * 100).toFixed(0) + "%";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return "#10b981"; // green
    if (score >= 0.6) return "#f59e0b"; // amber
    if (score >= 0.4) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.9) return "Very High";
    if (score >= 0.8) return "High";
    if (score >= 0.7) return "Mostly Factual";
    if (score >= 0.5) return "Mixed";
    if (score >= 0.3) return "Low";
    return "Very Low";
  };

  if (loading && !data) {
    return (
      <div className={styles.container}>
        <h1>Source Reliability Cache</h1>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className={styles.container}>
        <h1>Source Reliability Cache</h1>
        <div className={styles.error}>
          Authentication required. Enter your admin key to access this page.
        </div>
        <form onSubmit={handleAuthSubmit} style={{ marginTop: "16px", marginBottom: "16px" }}>
          <input
            type="password"
            value={adminKeyInput}
            onChange={(e) => setAdminKeyInput(e.target.value)}
            placeholder="Enter FH_ADMIN_KEY"
            style={{
              padding: "8px 12px",
              fontSize: "14px",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              marginRight: "8px",
              width: "250px",
            }}
          />
          <button type="submit" className={styles.button}>
            Authenticate
          </button>
        </form>
        <Link href="/admin" className={styles.backLink}>
          ← Back to Admin
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1>Source Reliability Cache</h1>
        <div className={styles.error}>Error: {error}</div>
        <button onClick={fetchData} className={styles.button}>
          Retry
        </button>
        <Link href="/admin" className={styles.backLink}>
          ← Back to Admin
        </Link>
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Source Reliability Cache</h1>
          <p className={styles.subtitle}>
            LLM-evaluated source reliability scores cached for reuse
          </p>
        </div>
        <div className={styles.actions}>
          <button onClick={fetchData} className={styles.button} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button onClick={handleCleanup} className={styles.buttonSecondary}>
            Cleanup Expired
          </button>
          <Link href="/admin" className={styles.backLink}>
            ← Admin
          </Link>
        </div>
      </header>

      {/* Stats Cards */}
      {data?.stats && (
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{data.stats.totalEntries}</div>
            <div className={styles.statLabel}>Cached Sources</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{formatScore(data.stats.avgScore)}</div>
            <div className={styles.statLabel}>Avg Score</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{formatScore(data.stats.avgConfidence)}</div>
            <div className={styles.statLabel}>Avg Confidence</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{data.stats.expiredEntries}</div>
            <div className={styles.statLabel}>Expired</div>
          </div>
        </div>
      )}

      {/* Data Table */}
      {data && data.entries.length > 0 ? (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => handleSort("domain")} className={styles.sortable}>
                    Domain {sortBy === "domain" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("score")} className={styles.sortable}>
                    Score {sortBy === "score" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("confidence")} className={styles.sortable}>
                    Confidence {sortBy === "confidence" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Models</th>
                  <th>Consensus</th>
                  <th onClick={() => handleSort("evaluated_at")} className={styles.sortable}>
                    Evaluated {sortBy === "evaluated_at" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("expires_at")} className={styles.sortable}>
                    Expires {sortBy === "expires_at" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr key={entry.domain}>
                    <td className={styles.domain}>{entry.domain}</td>
                    <td>
                      <span
                        className={styles.scoreBadge}
                        style={{ backgroundColor: getScoreColor(entry.score) }}
                        title={getScoreLabel(entry.score)}
                      >
                        {formatScore(entry.score)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.confidence}>
                        {formatScore(entry.confidence)}
                      </span>
                    </td>
                    <td className={styles.models}>
                      <span title={entry.modelPrimary}>{entry.modelPrimary.split("-")[0]}</span>
                      {entry.modelSecondary && (
                        <>
                          {" + "}
                          <span title={entry.modelSecondary}>{entry.modelSecondary.split("-")[0]}</span>
                        </>
                      )}
                    </td>
                    <td>
                      {entry.consensusAchieved ? (
                        <span className={styles.consensusYes}>✓</span>
                      ) : (
                        <span className={styles.consensusNo}>✗</span>
                      )}
                    </td>
                    <td className={styles.date}>{formatDate(entry.evaluatedAt)}</td>
                    <td className={styles.date}>{formatDate(entry.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className={styles.pageButton}
            >
              ← Previous
            </button>
            <span className={styles.pageInfo}>
              Page {page + 1} of {totalPages} ({data.total} entries)
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className={styles.pageButton}
            >
              Next →
            </button>
          </div>
        </>
      ) : (
        <div className={styles.empty}>
          <p>No cached source reliability data yet.</p>
          <p>Scores will appear here after running analyses with source reliability enabled.</p>
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <h3>Score Legend</h3>
        <div className={styles.legendItems}>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#10b981" }} /> 80-100%: High/Very High</span>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#f59e0b" }} /> 60-79%: Mostly Factual</span>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#f97316" }} /> 40-59%: Mixed</span>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#ef4444" }} /> 0-39%: Low/Very Low</span>
        </div>
      </div>
    </div>
  );
}
