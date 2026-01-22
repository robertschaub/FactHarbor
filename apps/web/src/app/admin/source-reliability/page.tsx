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

interface WeightConfig {
  blendCenter: number;
  spreadMultiplier: number;
  consensusSpreadMultiplier: number;
  defaultScore: number;
}

interface CacheData {
  entries: CachedScore[];
  total: number;
  limit: number;
  offset: number;
  stats: CacheStats;
  config?: WeightConfig;
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
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
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

  const handleDelete = async (domain: string) => {
    if (!confirm(`Delete cached score for "${domain}"?\n\nThis will be re-evaluated on next analysis.`)) return;

    try {
      const response = await fetch(`/api/admin/source-reliability?domain=${encodeURIComponent(domain)}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!response.ok) {
        if (response.status === 401) {
          setNeedsAuth(true);
          throw new Error("Unauthorized");
        }
        if (response.status === 404) {
          throw new Error("Domain not found");
        }
        throw new Error("Delete failed");
      }
      setSelectedDomains(prev => {
        const next = new Set(prev);
        next.delete(domain);
        return next;
      });
      fetchData();
    } catch (err) {
      alert("Delete failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDomains.size === 0) return;
    
    const count = selectedDomains.size;
    if (!confirm(`Delete ${count} selected cached score${count > 1 ? 's' : ''}?\n\nThese will be re-evaluated on next analysis.`)) return;

    setDeleting(true);
    try {
      const domains = Array.from(selectedDomains);
      const response = await fetch('/api/admin/source-reliability', {
        method: "DELETE",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domains }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          setNeedsAuth(true);
          throw new Error("Unauthorized");
        }
        throw new Error("Delete failed");
      }
      const result = await response.json();
      setSelectedDomains(new Set());
      alert(`Deleted ${result.deleted} of ${count} entries`);
      fetchData();
    } catch (err) {
      alert("Delete failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (domain: string) => {
    setSelectedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    const currentPageDomains = data.entries.map(e => e.domain);
    const allSelected = currentPageDomains.every(d => selectedDomains.has(d));
    
    if (allSelected) {
      // Deselect all on current page
      setSelectedDomains(prev => {
        const next = new Set(prev);
        currentPageDomains.forEach(d => next.delete(d));
        return next;
      });
    } else {
      // Select all on current page
      setSelectedDomains(prev => {
        const next = new Set(prev);
        currentPageDomains.forEach(d => next.add(d));
        return next;
      });
    }
  };

  const isAllSelected = data && data.entries.length > 0 && 
    data.entries.every(e => selectedDomains.has(e.domain));

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

  // Symmetric 5-band scale: each band is 20 points, centered at 0.5
  const getScoreColor = (score: number): string => {
    if (score >= 0.80) return "#10b981"; // green - very_high (80-100%)
    if (score >= 0.60) return "#84cc16"; // lime - high (60-80%)
    if (score >= 0.40) return "#8b5cf6"; // purple - mixed (40-60%, neutral center)
    if (score >= 0.20) return "#f59e0b"; // amber - low (20-40%)
    return "#ef4444"; // red - very_low (0-20%)
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.80) return "Very High (80-100%)";
    if (score >= 0.60) return "High (60-80%)";
    if (score >= 0.40) return "Mixed (40-60%)";
    if (score >= 0.20) return "Low (20-40%)";
    return "Very Low (0-20%)";
  };

  /**
   * Calculate effective weight used in verdict calculations.
   * Formula: amplified deviation from neutral (0.5) based on confidence
   * - Consensus multiplies spread (extra impact when models agree)
   * - Deviation from 0.5 is amplified by spread multiplier
   * - Higher confidence = more impact from the score
   * 
   * Uses config from API (matching server-side calculation) with fallback defaults.
   */
  const calculateEffectiveWeight = (score: number, confidence: number, consensus: boolean): number => {
    // Use config from API or fall back to defaults
    const blendCenter = data?.config?.blendCenter ?? 0.5;
    const spreadMultiplier = data?.config?.spreadMultiplier ?? 1.5;
    const consensusSpreadMultiplier = data?.config?.consensusSpreadMultiplier ?? 1.15;
    
    // Calculate deviation from neutral
    const deviation = score - blendCenter;
    
    // Consensus multiplies spread (agreement = more impact)
    const consensusFactor = consensus ? consensusSpreadMultiplier : 1.0;
    const amplifiedDeviation = deviation * spreadMultiplier * confidence * consensusFactor;
    
    // Clamp to [0, 1]
    return Math.max(0, Math.min(1.0, blendCenter + amplifiedDeviation));
  };

  // Symmetric 5-band scale for effective weight colors
  const getEffectiveWeightColor = (weight: number): string => {
    if (weight >= 0.80) return "#10b981"; // green - very high
    if (weight >= 0.60) return "#84cc16"; // lime - high
    if (weight >= 0.40) return "#8b5cf6"; // purple - mixed (neutral)
    if (weight >= 0.20) return "#f59e0b"; // amber - low
    return "#ef4444"; // red - very low
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
          {selectedDomains.size > 0 && (
            <button 
              onClick={handleDeleteSelected} 
              className={styles.buttonDanger}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : `Delete Selected (${selectedDomains.size})`}
            </button>
          )}
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
                  <th className={styles.checkboxCol}>
                    <input
                      type="checkbox"
                      checked={isAllSelected || false}
                      onChange={toggleSelectAll}
                      title="Select all on this page"
                    />
                  </th>
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
                  <th title="Effective Weight = Score × Confidence × Consensus. This is the actual weight used in verdict calculations.">
                    Eff. Weight
                  </th>
                  <th onClick={() => handleSort("evaluated_at")} className={styles.sortable}>
                    Evaluated {sortBy === "evaluated_at" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th onClick={() => handleSort("expires_at")} className={styles.sortable}>
                    Expires {sortBy === "expires_at" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => {
                  const effectiveWeight = calculateEffectiveWeight(
                    entry.score,
                    entry.confidence,
                    entry.consensusAchieved
                  );
                  return (
                  <tr key={entry.domain} className={selectedDomains.has(entry.domain) ? styles.selectedRow : ""}>
                    <td className={styles.checkboxCol}>
                      <input
                        type="checkbox"
                        checked={selectedDomains.has(entry.domain)}
                        onChange={() => toggleSelect(entry.domain)}
                      />
                    </td>
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
                      <span 
                        className={styles.confidence}
                        title={`LLM confidence: ${entry.confidence >= 0.8 ? 'High' : entry.confidence >= 0.6 ? 'Medium' : 'Low'}`}
                      >
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
                        <span className={styles.consensusYes} title="Multi-model consensus achieved (+5% bonus)">✓</span>
                      ) : (
                        <span className={styles.consensusNo} title="No consensus (single model only)">✗</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={styles.scoreBadge}
                        style={{ backgroundColor: getEffectiveWeightColor(effectiveWeight) }}
                        title={`Effective weight used in verdict calculations\n= Score × (0.75 + Confidence×0.25) × Consensus bonus`}
                      >
                        {formatScore(effectiveWeight)}
                      </span>
                    </td>
                    <td className={styles.date}>{formatDate(entry.evaluatedAt)}</td>
                    <td className={styles.date}>{formatDate(entry.expiresAt)}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(entry.domain)}
                        className={styles.deleteButton}
                        title="Delete this entry"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                  );
                })}
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
        <h3>Score Legend (Symmetric 5-Band Scale)</h3>
        <div className={styles.legendItems}>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#10b981" }} /> 80-100%: Very High</span>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#84cc16" }} /> 60-80%: High</span>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#8b5cf6" }} /> 40-60%: Mixed (neutral center)</span>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#f59e0b" }} /> 20-40%: Low</span>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#ef4444" }} /> 0-20%: Very Low</span>
        </div>
        
        <h3 style={{ marginTop: "16px" }}>How Verdict Weighting Works</h3>
        <div className={styles.legendItems} style={{ flexDirection: "column", gap: "8px" }}>
          <span><strong>Effective Weight</strong> = 0.5 + (deviation × spread × confidence × consensus)</span>
          <span>• <strong>Spread Multiplier</strong>: {data?.config?.spreadMultiplier ?? 1.5}x amplifies deviation from neutral</span>
          <span>• <strong>Consensus Spread</strong>: {data?.config?.consensusSpreadMultiplier ?? 1.15}x extra spread when models agree</span>
          <span>• <strong>Unknown Sources</strong>: {((data?.config?.defaultScore ?? 0.5) * 100).toFixed(0)}% default score (neutral), 50% confidence</span>
        </div>
        
        <h3 style={{ marginTop: "16px" }}>Examples (with current config)</h3>
        <div className={styles.legendItems} style={{ flexDirection: "column", gap: "4px", fontSize: "12px" }}>
          <span>High score (95%, 95% conf, consensus): <strong>100%</strong> effective (capped)</span>
          <span>Medium (70%, 80% conf, no consensus): <strong>~74%</strong> effective</span>
          <span>Unknown source ({((data?.config?.defaultScore ?? 0.5) * 100).toFixed(0)}%, 50% conf): <strong>50%</strong> effective (neutral)</span>
        </div>
      </div>
    </div>
  );
}
