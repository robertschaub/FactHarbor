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
  reasoning?: string | null;
  category?: string | null;
  biasIndicator?: string | null;
  evidenceCited?: string | null; // JSON array stored as string
}

interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  avgScore: number;
  avgConfidence: number;
}

interface WeightConfig {
  blendCenter: number;
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
  const [domainsInput, setDomainsInput] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [forceReevaluate, setForceReevaluate] = useState(false);
  const [evalResults, setEvalResults] = useState<Array<{
    domain: string;
    success: boolean;
    cached?: boolean;
    score?: number;
    confidence?: number;
    consensus?: boolean;
    models?: string;
    error?: string;
  }> | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<CachedScore | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const PAGE_SIZE_OPTIONS = [25, 50, 100];

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

  // Reset to page 1 when page size changes
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

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

  const handleEvaluateDomains = async () => {
    if (!domainsInput.trim()) return;
    
    setEvaluating(true);
    setEvalResults(null);
    
    try {
      const response = await fetch("/api/admin/source-reliability", {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domains: domainsInput, forceReevaluate }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setNeedsAuth(true);
          throw new Error("Unauthorized");
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setEvalResults(result.results);
      
      // Refresh the main data table if we had successful evaluations
      if (result.successful > 0) {
        fetchData();
      }
    } catch (err) {
      setEvalResults([{
        domain: "Error",
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }]);
    } finally {
      setEvaluating(false);
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

  // Symmetric 7-band scale (matches verdict scale), centered at 0.5
  const getScoreColor = (score: number): string => {
    if (score >= 0.86) return "#10b981"; // green - highly reliable
    if (score >= 0.72) return "#22c55e"; // emerald - reliable
    if (score >= 0.58) return "#84cc16"; // lime - mostly reliable
    if (score >= 0.43) return "#8b5cf6"; // purple - uncertain (center)
    if (score >= 0.29) return "#f59e0b"; // amber - mostly unreliable
    if (score >= 0.15) return "#f97316"; // orange - unreliable
    return "#ef4444"; // red - highly unreliable
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.86) return "Highly Reliable (86-100%)";
    if (score >= 0.72) return "Reliable (72-86%)";
    if (score >= 0.58) return "Mostly Reliable (58-72%)";
    if (score >= 0.43) return "Uncertain (43-57%)";
    if (score >= 0.29) return "Mostly Unreliable (29-43%)";
    if (score >= 0.15) return "Unreliable (15-29%)";
    return "Highly Unreliable (0-15%)";
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

      {/* Evaluate Domains Section */}
      <div className={styles.evaluateSection}>
        <h3>Evaluate Domains</h3>
        <p className={styles.evaluateHelp}>
          Enter domains to evaluate (one per line, comma-separated, or space-separated). 
          Max 20 domains per request.
        </p>
        <div className={styles.evaluateForm}>
          <textarea
            className={styles.domainsInput}
            placeholder="example.com&#10;news.example.org&#10;blog.example.net"
            value={domainsInput}
            onChange={(e) => setDomainsInput(e.target.value)}
            rows={4}
            disabled={evaluating}
          />
          <div className={styles.evaluateActions}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={forceReevaluate}
                onChange={(e) => setForceReevaluate(e.target.checked)}
                disabled={evaluating}
              />
              Re-evaluate existing domains
            </label>
            <button
              onClick={handleEvaluateDomains}
              className={styles.button}
              disabled={evaluating || !domainsInput.trim()}
            >
              {evaluating ? "Evaluating..." : "Evaluate Domains"}
            </button>
          </div>
        </div>
        
        {/* Evaluation Results */}
        {evalResults && evalResults.length > 0 && (
          <div className={styles.evalResults}>
            <h4>Results</h4>
            <table className={styles.evalTable}>
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Confidence</th>
                  <th>Consensus</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {evalResults.map((r, i) => (
                  <tr key={i} className={r.success ? (r.cached ? styles.evalCached : styles.evalSuccess) : styles.evalFailed}>
                    <td>{r.domain}</td>
                    <td>{r.success ? (r.cached ? "✓ (cached)" : "✓") : "✗"}</td>
                    <td>
                      {r.success && r.score !== undefined ? (
                        <span style={{ color: getScoreColor(r.score) }}>
                          {formatScore(r.score)}
                        </span>
                      ) : "-"}
                    </td>
                    <td>{r.success && r.confidence !== undefined ? formatScore(r.confidence) : "-"}</td>
                    <td>{r.success ? (r.consensus ? "✓" : "✗") : "-"}</td>
                    <td className={r.cached ? styles.cachedLabel : ""}>
                      {r.cached ? "Cached" : r.models || "-"}
                    </td>
                  </tr>
                ))}
                {/* Show errors in separate rows below for clarity */}
                {evalResults.filter(r => !r.success && r.error).map((r, i) => (
                  <tr key={`error-${i}`} className={styles.errorDetailsRow}>
                    <td colSpan={6} className={styles.errorDetails}>
                      <strong>Error for {r.domain}:</strong> {r.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button 
              onClick={() => { setEvalResults(null); setDomainsInput(""); }}
              className={styles.buttonSecondary}
              style={{ marginTop: "8px" }}
            >
              Clear Results
            </button>
          </div>
        )}
      </div>

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
                {data.entries.map((entry) => (
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
                        <span className={styles.consensusYes} title="Multi-model consensus achieved">✓</span>
                      ) : (
                        <span className={styles.consensusNo} title="No consensus (single model only)">✗</span>
                      )}
                    </td>
                    <td className={styles.date}>{formatDate(entry.evaluatedAt)}</td>
                    <td className={styles.date}>{formatDate(entry.expiresAt)}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className={styles.viewButton}
                          title="View detailed evaluation"
                        >
                          👁
                        </button>
                        <button
                          onClick={() => handleDelete(entry.domain)}
                          className={styles.deleteButton}
                          title="Delete this entry"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
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
            <div className={styles.pageSizeControl}>
              <label htmlFor="pageSize">Per page:</label>
              <select
                id="pageSize"
                className={styles.pageSizeSelect}
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
        </>
      ) : (
        <div className={styles.empty}>
          <p>No cached source reliability data yet.</p>
          <p>Scores will appear here after running analyses with source reliability enabled.</p>
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        <h3>Score Legend (Symmetric 7-Band Scale)</h3>
        <div className={styles.legendItems}>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#10b981" }} /> 86-100%: Highly Reliable</span>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#22c55e" }} /> 72-86%: Reliable</span>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#84cc16" }} /> 58-72%: Mostly Reliable</span>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#8b5cf6" }} /> 43-57%: Uncertain (center)</span>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#f59e0b" }} /> 29-43%: Mostly Unreliable</span>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#f97316" }} /> 15-29%: Unreliable</span>
          <span><span className={styles.legendDot} style={{ backgroundColor: "#ef4444" }} /> 0-15%: Highly Unreliable</span>
        </div>
        
        <h3 style={{ marginTop: "16px" }}>How It Works</h3>
        <div className={styles.legendItems} style={{ flexDirection: "column", gap: "8px" }}>
          <span>• <strong>Score</strong> = LLM-evaluated reliability (directly used in verdict weighting)</span>
          <span>• <strong>Confidence</strong> = How certain the LLM was (used as quality gate, threshold: 65%)</span>
          <span>• <strong>Consensus</strong> = Claude and GPT-4 agreed within 15%</span>
          <span>• <strong>Unknown Sources</strong> = Default to 50% (neutral)</span>
        </div>
      </div>

      {/* Details Modal */}
      {selectedEntry && (
        <div className={styles.modal} onClick={() => setSelectedEntry(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Source Evaluation Details</h2>
              <button onClick={() => setSelectedEntry(null)} className={styles.modalClose}>
                ✕
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.detailSection}>
                <h3>Domain</h3>
                <p className={styles.domainLarge}>{selectedEntry.domain}</p>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailSection}>
                  <h3>Reliability Score</h3>
                  <div className={styles.scoreDisplay}>
                    <span
                      className={styles.scoreBadgeLarge}
                      style={{ backgroundColor: getScoreColor(selectedEntry.score) }}
                    >
                      {formatScore(selectedEntry.score)}
                    </span>
                    <span className={styles.scoreLabel}>{getScoreLabel(selectedEntry.score)}</span>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h3>Confidence</h3>
                  <p className={styles.valueDisplay}>{formatScore(selectedEntry.confidence)}</p>
                  <p className={styles.valueLabel}>
                    {selectedEntry.confidence >= 0.8 ? "High confidence" : selectedEntry.confidence >= 0.6 ? "Medium confidence" : "Low confidence"}
                  </p>
                </div>

                {selectedEntry.category && (
                  <div className={styles.detailSection}>
                    <h3>Category</h3>
                    <p className={styles.valueDisplay}>{selectedEntry.category.replace(/_/g, " ").toUpperCase()}</p>
                  </div>
                )}

                {selectedEntry.biasIndicator && (
                  <div className={styles.detailSection}>
                    <h3>Bias Indicator</h3>
                    <p className={styles.valueDisplay}>{selectedEntry.biasIndicator.replace(/_/g, " ").toUpperCase()}</p>
                  </div>
                )}
              </div>

              {selectedEntry.reasoning && (
                <div className={styles.detailSection}>
                  <h3>LLM Reasoning</h3>
                  <div className={styles.reasoningBox}>
                    {selectedEntry.reasoning}
                  </div>
                </div>
              )}

              {selectedEntry.evidenceCited && (() => {
                try {
                  const evidence = JSON.parse(selectedEntry.evidenceCited);
                  if (Array.isArray(evidence) && evidence.length > 0) {
                    return (
                      <div className={styles.detailSection}>
                        <h3>Evidence Cited by LLM</h3>
                        <ul className={styles.evidenceList}>
                          {evidence.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                } catch {
                  // Invalid JSON, skip
                }
                return null;
              })()}

              <div className={styles.detailGrid}>
                <div className={styles.detailSection}>
                  <h3>Evaluation Models</h3>
                  <p className={styles.modelInfo}>
                    <strong>Primary:</strong> {selectedEntry.modelPrimary}<br />
                    {selectedEntry.modelSecondary && (
                      <><strong>Secondary:</strong> {selectedEntry.modelSecondary}<br /></>
                    )}
                    <strong>Consensus:</strong> {selectedEntry.consensusAchieved ? "✓ Achieved" : "✗ Not achieved"}
                  </p>
                </div>

                <div className={styles.detailSection}>
                  <h3>Cache Info</h3>
                  <p className={styles.dateInfo}>
                    <strong>Evaluated:</strong> {formatDate(selectedEntry.evaluatedAt)}<br />
                    <strong>Expires:</strong> {formatDate(selectedEntry.expiresAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={() => setSelectedEntry(null)} className={styles.button}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
