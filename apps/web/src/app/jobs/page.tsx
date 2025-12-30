/**
 * Job Results Page - Enhanced for UN-3, UN-17, Article Verdict Problem
 * 
 * Features:
 * - Article Verdict Banner (Article Verdict Problem)
 * - Two-Panel Summary (UN-3)
 * - Claim Highlighting (UN-17)
 * - Traditional report and JSON views
 * 
 * @version 2.2.0
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import TwoPanelSummary from "@/components/TwoPanelSummary";
import ClaimHighlighter from "@/components/ClaimHighlighter";
import ArticleVerdictBanner from "@/components/ArticleVerdictBanner";

type Job = {
  jobId: string;
  status: string;
  progress: number;
  createdUtc: string;
  updatedUtc: string;
  inputType: string;
  inputValue: string;
  inputPreview: string | null;
  resultJson: any | null;
  reportMarkdown: string | null;
};

type EventItem = { id: number; tsUtc: string; level: string; message: string };

// Tab types for the new layout
type TabType = "summary" | "article" | "report" | "json" | "events";

export default function JobPage({ params }: { params: { id: string } }) {
  const jobId = params.id;
  const [job, setJob] = useState<Job | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tab, setTab] = useState<TabType>("summary");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const res = await fetch(`/api/fh/jobs/${jobId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Job;
      if (alive) setJob(data);
    };

    load().catch((e: any) => setErr(e?.message ?? String(e)));

    const id = setInterval(() => {
      load().catch(() => {});
    }, 2000);

    return () => { alive = false; clearInterval(id); };
  }, [jobId]);

  useEffect(() => {
    const es = new EventSource(`/api/fh/jobs/${jobId}/events`);
    es.onmessage = (evt) => {
      try {
        const item = JSON.parse(evt.data) as EventItem;
        setEvents((prev) => {
          const exists = prev.some((p) => p.id === item.id);
          return exists ? prev : [...prev, item].sort((a, b) => a.id - b.id);
        });
      } catch {}
    };
    es.onerror = () => {};
    return () => es.close();
  }, [jobId]);

  const report = job?.reportMarkdown ?? "";
  const jsonText = useMemo(() => (job?.resultJson ? JSON.stringify(job.resultJson, null, 2) : ""), [job]);
  
  // Extract v2.2 components from resultJson
  const result = job?.resultJson;
  const hasV22Data = result?.meta?.schemaVersion?.startsWith("2.2");
  const twoPanelSummary = result?.twoPanelSummary;
  const articleAnalysis = result?.articleAnalysis;
  const claimVerdicts = result?.claimVerdicts || [];
  const originalText = result?.understanding?.originalText || job?.inputValue || "";

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>FactHarbor Analysis</h1>
        {hasV22Data && (
          <span style={styles.versionBadge}>v{result.meta.schemaVersion}</span>
        )}
      </div>

      {err && <div style={styles.error}>Error: {err}</div>}

      {/* Job Info Card */}
      {job ? (
        <div style={styles.jobCard}>
          <div style={styles.jobRow}>
            <span style={styles.jobLabel}>ID:</span>
            <code style={styles.jobValue}>{job.jobId}</code>
          </div>
          <div style={styles.jobRow}>
            <span style={styles.jobLabel}>Status:</span>
            <StatusBadge status={job.status} progress={job.progress} />
          </div>
          <div style={styles.jobRow}>
            <span style={styles.jobLabel}>Input:</span>
            <code style={styles.jobValue}>{job.inputType}</code>
            <span style={styles.inputPreview}>{job.inputPreview ?? "—"}</span>
          </div>
          {result?.meta?.analysisId && (
            <div style={styles.jobRow}>
              <span style={styles.jobLabel}>Analysis ID:</span>
              <code style={styles.jobValue}>{result.meta.analysisId}</code>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.loading}>Loading…</div>
      )}

      {/* Tab Navigation */}
      <div style={styles.tabs}>
        <TabButton 
          active={tab === "summary"} 
          onClick={() => setTab("summary")}
          disabled={!hasV22Data}
        >
          📊 Summary
        </TabButton>
        <TabButton 
          active={tab === "article"} 
          onClick={() => setTab("article")}
          disabled={!hasV22Data || !claimVerdicts.length}
        >
          📖 Article View
        </TabButton>
        <TabButton active={tab === "report"} onClick={() => setTab("report")}>
          📝 Full Report
        </TabButton>
        <TabButton active={tab === "json"} onClick={() => setTab("json")}>
          🔧 JSON
        </TabButton>
        <TabButton active={tab === "events"} onClick={() => setTab("events")}>
          📋 Events ({events.length})
        </TabButton>
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {/* Summary Tab (UN-3 + Article Verdict) */}
        {tab === "summary" && hasV22Data && (
          <div>
            {/* Article Verdict Banner */}
            {articleAnalysis && (
              <ArticleVerdictBanner articleAnalysis={articleAnalysis} />
            )}
            
            {/* Two-Panel Summary (UN-3) */}
            {twoPanelSummary && (
              <TwoPanelSummary
                articleSummary={twoPanelSummary.articleSummary}
                factharborAnalysis={twoPanelSummary.factharborAnalysis}
              />
            )}
            
            {/* Claims List */}
            {claimVerdicts.length > 0 && (
              <div style={styles.claimsSection}>
                <h3 style={styles.sectionTitle}>Claims Analyzed</h3>
                <div style={styles.claimsList}>
                  {claimVerdicts.map((cv: any) => (
                    <ClaimCard key={cv.claimId} claim={cv} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {tab === "summary" && !hasV22Data && job?.status === "Done" && (
          <div style={styles.legacyNote}>
            This analysis was created with an older version. 
            Switch to "Full Report" tab to view results.
          </div>
        )}

        {/* Article View Tab (UN-17: Claim Highlighting) */}
        {tab === "article" && hasV22Data && claimVerdicts.length > 0 && (
          <div>
            <h3 style={styles.sectionTitle}>Article with Claim Highlighting</h3>
            <ClaimHighlighter 
              originalText={originalText}
              claimVerdicts={claimVerdicts}
            />
          </div>
        )}

        {/* Full Report Tab */}
        {tab === "report" && (
          <div style={styles.reportContainer}>
            {report ? (
              <ReactMarkdown>{report}</ReactMarkdown>
            ) : (
              <div style={styles.emptyState}>No report yet.</div>
            )}
          </div>
        )}

        {/* JSON Tab */}
        {tab === "json" && (
          <pre style={styles.jsonContainer}>
            {jsonText || "No result yet."}
          </pre>
        )}

        {/* Events Tab */}
        {tab === "events" && (
          <div style={styles.eventsContainer}>
            <ul style={styles.eventsList}>
              {events.map((e) => (
                <li key={e.id} style={styles.eventItem}>
                  <code style={styles.eventTime}>{e.tsUtc}</code>
                  <span style={getEventLevelStyle(e.level)}>{e.level}</span>
                  <span style={styles.eventMessage}>{e.message}</span>
                </li>
              ))}
              {events.length === 0 && (
                <li style={styles.eventItem}>No events yet.</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function StatusBadge({ status, progress }: { status: string; progress: number }) {
  const isDone = status === "Done";
  const isError = status === "Error";
  
  return (
    <span style={{
      ...styles.statusBadge,
      backgroundColor: isDone ? "#d4edda" : isError ? "#f8d7da" : "#fff3cd",
      color: isDone ? "#155724" : isError ? "#721c24" : "#856404",
    }}>
      {status} {!isDone && !isError && `(${progress}%)`}
    </span>
  );
}

function TabButton({ 
  active, 
  onClick, 
  disabled = false,
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.tabButton,
        ...(active ? styles.tabButtonActive : {}),
        ...(disabled ? styles.tabButtonDisabled : {}),
      }}
    >
      {children}
    </button>
  );
}

function ClaimCard({ claim }: { claim: any }) {
  const color = getVerdictColor(claim.verdict);
  
  return (
    <div style={{ ...styles.claimCard, borderLeftColor: color.border }}>
      <div style={styles.claimHeader}>
        <span style={styles.claimId}>{claim.claimId}</span>
        {claim.isCentral && (
          <span style={styles.centralTag}>🔑 Central</span>
        )}
        <span style={{ ...styles.claimVerdict, backgroundColor: color.bg, color: color.text }}>
          {claim.verdict}
        </span>
        <span style={styles.claimConfidence}>{claim.confidence}%</span>
      </div>
      <div style={styles.claimText}>"{claim.claimText}"</div>
      <div style={styles.claimReasoning}>{claim.reasoning}</div>
    </div>
  );
}

function getVerdictColor(verdict: string): { bg: string; text: string; border: string } {
  switch (verdict) {
    case "WELL-SUPPORTED": return { bg: "#d4edda", text: "#155724", border: "#28a745" };
    case "PARTIALLY-SUPPORTED": return { bg: "#fff3cd", text: "#856404", border: "#ffc107" };
    case "UNCERTAIN": return { bg: "#fff3cd", text: "#856404", border: "#ffc107" };
    case "REFUTED": return { bg: "#f8d7da", text: "#721c24", border: "#dc3545" };
    default: return { bg: "#e9ecef", text: "#495057", border: "#6c757d" };
  }
}

function getEventLevelStyle(level: string): React.CSSProperties {
  const colors: Record<string, string> = {
    info: "#17a2b8",
    warn: "#ffc107",
    error: "#dc3545",
  };
  return {
    ...styles.eventLevel,
    color: colors[level.toLowerCase()] || "#6c757d",
  };
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 700,
  },
  versionBadge: {
    padding: "4px 8px",
    backgroundColor: "#e9ecef",
    borderRadius: "4px",
    fontSize: "12px",
    color: "#666",
  },
  error: {
    padding: "12px",
    backgroundColor: "#f8d7da",
    color: "#721c24",
    borderRadius: "8px",
  },
  jobCard: {
    padding: "16px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    backgroundColor: "#fff",
  },
  jobRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  jobLabel: {
    fontWeight: 600,
    color: "#666",
    minWidth: "80px",
  },
  jobValue: {
    backgroundColor: "#f8f9fa",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "13px",
  },
  inputPreview: {
    color: "#888",
    fontSize: "13px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "400px",
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: 500,
  },
  loading: {
    padding: "20px",
    textAlign: "center",
    color: "#666",
  },
  tabs: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  tabButton: {
    padding: "10px 16px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    transition: "all 0.2s",
  },
  tabButtonActive: {
    backgroundColor: "#007bff",
    color: "#fff",
    borderColor: "#007bff",
  },
  tabButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  tabContent: {
    minHeight: "400px",
  },
  reportContainer: {
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    backgroundColor: "#fff",
    lineHeight: 1.6,
  },
  jsonContainer: {
    padding: "16px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    backgroundColor: "#f8f9fa",
    overflow: "auto",
    fontSize: "12px",
    fontFamily: "monospace",
    maxHeight: "600px",
  },
  eventsContainer: {
    padding: "16px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    backgroundColor: "#fff",
  },
  eventsList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  eventItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 0",
    borderBottom: "1px solid #eee",
    fontSize: "13px",
  },
  eventTime: {
    color: "#888",
    fontSize: "11px",
    minWidth: "180px",
  },
  eventLevel: {
    fontWeight: 600,
    minWidth: "50px",
  },
  eventMessage: {
    color: "#333",
  },
  legacyNote: {
    padding: "20px",
    backgroundColor: "#fff3cd",
    borderRadius: "8px",
    color: "#856404",
    textAlign: "center",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    color: "#888",
  },
  claimsSection: {
    marginTop: "24px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 600,
    marginBottom: "16px",
    color: "#333",
  },
  claimsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  claimCard: {
    padding: "16px",
    border: "1px solid #ddd",
    borderLeft: "4px solid",
    borderRadius: "8px",
    backgroundColor: "#fff",
  },
  claimHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  claimId: {
    fontWeight: 600,
    color: "#666",
  },
  centralTag: {
    padding: "2px 6px",
    backgroundColor: "#e8f4fd",
    borderRadius: "4px",
    fontSize: "11px",
    color: "#0056b3",
  },
  claimVerdict: {
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
  },
  claimConfidence: {
    fontSize: "12px",
    color: "#888",
  },
  claimText: {
    fontSize: "14px",
    fontStyle: "italic",
    color: "#333",
    marginBottom: "8px",
  },
  claimReasoning: {
    fontSize: "13px",
    color: "#555",
    lineHeight: 1.5,
  },
};
