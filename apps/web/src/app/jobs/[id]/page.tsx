/**
 * Job Results Page v2.6.15
 *
 * Features:
 * - 7-Level Truth Scale (Symmetric, neutral)
 * - truthPercentage (0-100%) as primary internal value
 * - Verdict label derived from percentage
 * - TRUE/MOSTLY-TRUE/LEANING-TRUE/UNVERIFIED/LEANING-FALSE/MOSTLY-FALSE/FALSE
 * - YES/MOSTLY-YES/LEANING-YES/UNVERIFIED/LEANING-NO/MOSTLY-NO/NO
 *
 * @version 2.6.0
 */

"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  percentageToArticleVerdict,
  percentageToClaimVerdict,
} from "@/lib/analyzer/truth-scale";
import styles from "./page.module.css";

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

// ============================================================================
// 7-POINT TRUTH SCALE - Color & Display System
// ============================================================================

/**
 * Colors for 7-level claim verdicts
 */
const CLAIM_VERDICT_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  // Positive (True side)
  "TRUE": { bg: "#d4edda", text: "#155724", border: "#28a745", icon: "✅" },
  "MOSTLY-TRUE": { bg: "#e8f5e9", text: "#2e7d32", border: "#66bb6a", icon: "✓" },
  "LEANING-TRUE": { bg: "#fff9c4", text: "#f57f17", border: "#ffeb3b", icon: "◐" },
  // Neutral
  "BALANCED": { bg: "#e3f2fd", text: "#1565c0", border: "#2196f3", icon: "⚖" },  // Blue: confident balance (evidence on both sides)
  "UNVERIFIED": { bg: "#fff3e0", text: "#e65100", border: "#ff9800", icon: "?" },  // Orange: insufficient evidence
  // Negative (False side)
  "LEANING-FALSE": { bg: "#ffccbc", text: "#bf360c", border: "#ff5722", icon: "◔" },
  "MOSTLY-FALSE": { bg: "#ffcdd2", text: "#c62828", border: "#f44336", icon: "✗" },
  "FALSE": { bg: "#b71c1c", text: "#ffffff", border: "#b71c1c", icon: "❌" },
};

/**
 * Colors for 7-level question answers
 */
const QUESTION_ANSWER_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  // Positive (Yes side)
  "YES": { bg: "#d4edda", text: "#155724", border: "#28a745", icon: "✅" },
  "MOSTLY-YES": { bg: "#e8f5e9", text: "#2e7d32", border: "#66bb6a", icon: "✓" },
  "LEANING-YES": { bg: "#fff9c4", text: "#f57f17", border: "#ffeb3b", icon: "↗" },
  // Neutral
  "BALANCED": { bg: "#e3f2fd", text: "#1565c0", border: "#2196f3", icon: "⚖" },  // Blue: confident balance
  "UNVERIFIED": { bg: "#fff3e0", text: "#e65100", border: "#ff9800", icon: "?" },  // Orange: insufficient evidence
  // Negative (No side)
  "LEANING-NO": { bg: "#ffccbc", text: "#bf360c", border: "#ff5722", icon: "↘" },
  "MOSTLY-NO": { bg: "#ffcdd2", text: "#c62828", border: "#f44336", icon: "✗" },
  "NO": { bg: "#b71c1c", text: "#ffffff", border: "#b71c1c", icon: "❌" },
};

/**
 * Colors for article-level verdicts
 */
const ARTICLE_VERDICT_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  // Positive
  "TRUE": { bg: "#d4edda", text: "#155724", border: "#28a745", icon: "✅" },
  "MOSTLY-TRUE": { bg: "#e8f5e9", text: "#2e7d32", border: "#66bb6a", icon: "✓" },
  "LEANING-TRUE": { bg: "#fff9c4", text: "#f57f17", border: "#ffeb3b", icon: "◐" },
  // Neutral
  "BALANCED": { bg: "#e3f2fd", text: "#1565c0", border: "#2196f3", icon: "⚖" },  // Blue: confident balance
  "UNVERIFIED": { bg: "#fff3e0", text: "#e65100", border: "#ff9800", icon: "?" },  // Orange: insufficient evidence
  // Negative
  "LEANING-FALSE": { bg: "#ffccbc", text: "#bf360c", border: "#ff5722", icon: "◔" },
  "MOSTLY-FALSE": { bg: "#ffcdd2", text: "#c62828", border: "#f44336", icon: "✗" },
  "FALSE": { bg: "#b71c1c", text: "#ffffff", border: "#b71c1c", icon: "❌" },
};

const CLAIM_VERDICT_MIDPOINTS: Record<string, number> = {
  "TRUE": 93,
  "MOSTLY-TRUE": 79,
  "LEANING-TRUE": 64,
  "UNVERIFIED": 50,
  "LEANING-FALSE": 36,
  "MOSTLY-FALSE": 22,
  "FALSE": 7,
};

const QUESTION_ANSWER_MIDPOINTS: Record<string, number> = {
  "YES": 93,
  "MOSTLY-YES": 79,
  "LEANING-YES": 64,
  "UNVERIFIED": 50,
  "LEANING-NO": 36,
  "MOSTLY-NO": 22,
  "NO": 7,
};

const ARTICLE_VERDICT_MIDPOINTS: Record<string, number> = {
  "TRUE": 93,
  "MOSTLY-TRUE": 79,
  "LEANING-TRUE": 64,
  "UNVERIFIED": 50,
  "LEANING-FALSE": 36,
  "MOSTLY-FALSE": 22,
  "FALSE": 7,
};

function normalizePercentage(value: number): number {
  if (!Number.isFinite(value)) return 50;
  const normalized = value >= 0 && value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function resolveTruthPercentage(
  value: unknown,
  midpoints: Record<string, number>,
  fallback = 50,
): number {
  if (typeof value === "number") return normalizePercentage(value);
  if (typeof value === "string" && midpoints[value] !== undefined) return midpoints[value];
  return fallback;
}

function getClaimTruthPercentage(claim: any): number {
  if (typeof claim?.truthPercentage === "number") {
    return normalizePercentage(claim.truthPercentage);
  }
  if (typeof claim?.verdict === "number") {
    return normalizePercentage(claim.verdict);
  }
  return resolveTruthPercentage(claim?.verdict, CLAIM_VERDICT_MIDPOINTS);
}

function getAnswerTruthPercentage(answer: any): number {
  if (typeof answer?.truthPercentage === "number") {
    return normalizePercentage(answer.truthPercentage);
  }
  if (typeof answer?.answer === "number") {
    return normalizePercentage(answer.answer);
  }
  return resolveTruthPercentage(answer?.answer, QUESTION_ANSWER_MIDPOINTS);
}

function getArticleTruthPercentage(articleAnalysis: any): number {
  if (typeof articleAnalysis?.articleTruthPercentage === "number") {
    return normalizePercentage(articleAnalysis.articleTruthPercentage);
  }
  if (typeof articleAnalysis?.articleVerdict === "number") {
    return normalizePercentage(articleAnalysis.articleVerdict);
  }
  if (typeof articleAnalysis?.truthPercentage === "number") {
    return normalizePercentage(articleAnalysis.truthPercentage);
  }
  return resolveTruthPercentage(articleAnalysis?.articleVerdict, ARTICLE_VERDICT_MIDPOINTS);
}

/**
 * Get human-readable label for verdict
 */
function getVerdictLabel(verdict: string): string {
  const labels: Record<string, string> = {
    "TRUE": "True",
    "MOSTLY-TRUE": "Mostly True",
    "LEANING-TRUE": "Leaning True",
    "UNVERIFIED": "Unverified",
    "LEANING-FALSE": "Leaning False",
    "MOSTLY-FALSE": "Mostly False",
    "FALSE": "False",
  };
  return labels[verdict] || verdict;
}

/**
 * Get human-readable label for question answer
 */
function getAnswerLabel(answer: string): string {
  const labels: Record<string, string> = {
    "YES": "Yes",
    "MOSTLY-YES": "Mostly Yes",
    "LEANING-YES": "Leaning Yes",
    "UNVERIFIED": "Unverified",
    "LEANING-NO": "Leaning No",
    "MOSTLY-NO": "Mostly No",
    "NO": "No",
  };
  return labels[answer] || answer;
}

// Helper function to get status CSS class
function getStatusClass(status: string): string {
  if (status === "SUCCEEDED") return styles.statusSuccess;
  if (status === "FAILED") return styles.statusFailed;
  return styles.statusWarning;
}

// Helper function to get event level CSS class
function getEventLevelClass(level: string): string {
  switch (level.toLowerCase()) {
    case "info": return styles.eventLevelInfo;
    case "warn": return styles.eventLevelWarn;
    case "error": return styles.eventLevelError;
    default: return styles.eventLevelDefault;
  }
}

// Helper function to get track record score CSS class
function getTrackRecordClass(score: number): string {
  if (score >= 0.8) return styles.trackRecordHigh;
  if (score >= 0.6) return styles.trackRecordMedium;
  return styles.trackRecordLow;
}

export default function JobPage() {
  const params = useParams();
  const jobId = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tab, setTab] = useState<"summary" | "article" | "sources" | "report" | "json" | "events">("summary");
  const [showTechnicalNotes, setShowTechnicalNotes] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    const load = async () => {
      const res = await fetch(`/api/fh/jobs/${jobId}`, { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      const data = (await res.json()) as Job;
      if (alive) setJob(data);
    };
    load().catch((e: any) => setErr(e?.message ?? String(e)));
    const id = setInterval(() => { load().catch(() => {}); }, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
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
    es.onerror = () => {
      // Silently handle SSE errors
    };
    return () => es.close();
  }, [jobId]);

  const report = job?.reportMarkdown ?? "";
  const reportSections = useMemo(() => {
    const marker = "\n## Technical Notes";
    const idx = report.indexOf(marker);
    if (idx === -1) {
      return { publicReport: report, technicalNotes: "" };
    }
    return {
      publicReport: report.slice(0, idx),
      technicalNotes: report.slice(idx)
    };
  }, [report]);
  const jsonText = useMemo(() => (job?.resultJson ? JSON.stringify(job.resultJson, null, 2) : ""), [job]);

  const result = job?.resultJson;
  const schemaVersion = result?.meta?.schemaVersion || "";
  const hasV22Data = schemaVersion.startsWith("2.");
  const twoPanelSummary = result?.twoPanelSummary;
  const articleAnalysis = result?.articleAnalysis;
  const claimVerdicts = result?.claimVerdicts || [];
  const questionAnswer = result?.questionAnswer;
  const isQuestion = result?.meta?.isQuestion || articleAnalysis?.isQuestion;
  const hasMultipleProceedings = result?.meta?.hasMultipleProceedings;
  // Prefer "scopes" (new unified terminology), fall back to "proceedings" for backward compatibility
  const scopes = result?.scopes || result?.proceedings || [];
  const impliedClaim: string = (result?.understanding?.impliedClaim || "").trim();
  const hasContestedFactors = result?.meta?.hasContestedFactors;
  const searchQueries = result?.searchQueries || [];
  const sources = result?.sources || [];
  const researchStats = result?.researchStats;

  // Determine if any contestations have actual counter-evidence (CONTESTED)
  // Opinion-based contestations without evidence are not highlighted (almost anything can be doubted)
  // Include Key Factors from both question mode AND article mode (unified in v2.6.18)
  const allKeyFactors: any[] = [
    ...(questionAnswer?.keyFactors || []),
    ...(questionAnswer?.proceedingAnswers?.flatMap((p: any) => p.keyFactors || []) || []),
    ...(articleAnalysis?.keyFactors || []), // NEW v2.6.18: Article mode Key Factors
  ];
  const hasEvidenceBasedContestations = allKeyFactors.some(
    (f: any) =>
      f.supports === "no" &&
      f.isContested &&
      (f.factualBasis === "established" || f.factualBasis === "disputed")
  );

  // Helper: Generate short name from title or input
  const getShortName = (): string => {
    const overallVerdictLabel =
      typeof twoPanelSummary?.factharborAnalysis?.overallVerdict === "number"
        ? percentageToClaimVerdict(twoPanelSummary.factharborAnalysis.overallVerdict)
        : "";
    // Try to get title from twoPanelSummary
    const title = twoPanelSummary?.articleSummary?.title ||
                  overallVerdictLabel ||
                  job?.inputValue ||
                  "Analysis";
    // Clean and truncate: remove special chars, limit to 40 chars
    return title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 40)
      .replace(/_+$/, ''); // Remove trailing underscores
  };

  // Helper: Format datetime for filename (local time with seconds)
  const getDateTimeString = (): string => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  };

  // Helper: Format datetime for display (local time with seconds)
  const getDisplayDateTime = (): string => {
    return new Date().toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Helper: Generate filename
  const generateFilename = (type: string, ext: string): string => {
    const shortName = getShortName();
    const dateTime = getDateTimeString();
    return `${shortName}_${type}_${dateTime}.${ext}`;
  };

  // Update page title for better Print-to-PDF filename
  useEffect(() => {
    if (job && twoPanelSummary) {
      const shortName = getShortName();
      const dateTime = getDateTimeString();
      document.title = `${shortName}_Report_${dateTime}`;
    } else if (job) {
      document.title = `FactHarbor_${job.jobId.slice(0, 8)}`;
    }
    return () => { document.title = "FactHarbor POC1"; };
  }, [job, twoPanelSummary]);

  // Export functions
  const handlePrint = () => {
    window.print();
  };

  const handleExportHTML = () => {
    const content = reportRef.current?.innerHTML || report;
    const generatedAt = getDisplayDateTime();
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FactHarbor Analysis - ${getShortName()}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    h1, h2, h3 { color: #333; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>FactHarbor Analysis Report</h1>
  <p><strong>Analysis ID:</strong> ${result?.meta?.analysisId || 'N/A'}</p>
  <p><strong>Generated:</strong> ${generatedAt}</p>
  <hr>
  ${content}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateFilename('Report', 'html');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateFilename('Data', 'json');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateFilename('Report', 'md');
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!jobId) return <div className={styles.pageContainer}>Loading job ID...</div>;

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.pageTitle}>FactHarbor Analysis</h1>

      {err && (
        <div className={styles.noDataError}>
          <strong>Error:</strong> {err}
        </div>
      )}

      {job ? (
        <div className={styles.jobInfoCard}>
          <div><b>ID:</b> <code>{job.jobId}</code></div>
          <div><b>Status:</b> <code className={getStatusClass(job.status)}>{job.status}</code> ({job.progress}%)</div>
          <div className={styles.metaRow}><b>Generated:</b> <code>{new Date(job.updatedUtc).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</code></div>
          <div className={styles.inputRow}>
            <b>Input:</b> <code>{job.inputType}</code> — <span className={styles.inputValue}>{job.inputValue || job.inputPreview || "—"}</span>
          </div>
          {hasV22Data && (
            <div className={styles.badgesRow}>
              <span><b>Schema:</b> <code>{schemaVersion}</code></span>
              {result.meta.analysisId && <span>— <b>ID:</b> <code>{result.meta.analysisId}</code></span>}
              {isQuestion && <Badge bg="#e3f2fd" color="#1565c0">📝 QUESTION</Badge>}
              {hasMultipleProceedings && <Badge bg="#fff3e0" color="#e65100">🔀 {scopes.length} SCOPES</Badge>}
              {hasEvidenceBasedContestations && <Badge bg="#fce4ec" color="#c2185b">⚠️ CONTESTED</Badge>}
              {result.meta.isPseudoscience && (
                <Badge bg="#ffebee" color="#c62828" title={`Pseudoscience patterns: ${result.meta.pseudoscienceCategories?.join(", ") || "detected"}`}>
                  🔬 PSEUDOSCIENCE
                </Badge>
              )}
              {researchStats && (
                <Badge bg="#e8f5e9" color="#2e7d32" title={result.meta.searchProvider || "Web Search"}>
                  🔍 {researchStats.totalSearches} searches
                </Badge>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.contentCard} style={{ textAlign: "center", color: "#666" }}>Loading...</div>
      )}

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        {hasV22Data && (
          <>
            <button onClick={() => setTab("summary")} className={`${styles.tab} ${tab === "summary" ? styles.tabActive : ""}`}>📊 Summary</button>
            <button onClick={() => setTab("sources")} className={`${styles.tab} ${tab === "sources" ? styles.tabActive : ""}`}>🔍 Sources ({sources.length})</button>
          </>
        )}
        <button onClick={() => setTab("json")} className={`${styles.tab} ${tab === "json" ? styles.tabActive : ""}`}>🔧 JSON</button>
        <button onClick={() => setTab("events")} className={`${styles.tab} ${tab === "events" ? styles.tabActive : ""}`}>📋 Events ({events.length})</button>

        {/* Export dropdown */}
        {job?.status === "SUCCEEDED" && (
          <div className={styles.exportButtons}>
            <button onClick={handlePrint} className={styles.tab} title="Print">🖨️</button>
            <button onClick={handleExportHTML} className={styles.tab} title="Export HTML">📄</button>
            <button onClick={handleExportMarkdown} className={styles.tab} title="Export Markdown">📝</button>
            <button onClick={handleExportJSON} className={styles.tab} title="Export JSON">💾</button>
          </div>
        )}
      </div>

      {/* Summary Tab */}
      {tab === "summary" && hasV22Data && (
        <div className={styles.contentCard}>
          {isQuestion && questionAnswer && (
            hasMultipleProceedings
              ? <MultiScopeAnswerBanner questionAnswer={questionAnswer} scopes={scopes} impliedClaim={impliedClaim} />
              : <QuestionAnswerBanner questionAnswer={questionAnswer} impliedClaim={impliedClaim} />
          )}

          {!isQuestion && twoPanelSummary && (
            <>
              {impliedClaim && (
                <div className={styles.impliedClaimBox}>
                  <span className={styles.impliedClaimLabel}>Implied claim:</span>{" "}
                  <span className={styles.impliedClaimText}>"{impliedClaim}"</span>
                </div>
              )}
              <ArticleSummaryBox
                articleSummary={twoPanelSummary.articleSummary}
              />
            </>
          )}

          {!isQuestion && articleAnalysis && (
            <ArticleVerdictBanner
              articleAnalysis={articleAnalysis}
              fallbackThesis={twoPanelSummary?.articleSummary?.mainArgument || job?.inputValue}
              pseudoscienceAnalysis={result?.pseudoscienceAnalysis}
            />
          )}

          {claimVerdicts.length > 0 && (
            <div className={styles.claimsSection}>
              <h3 className={styles.claimsSectionTitle}>{isQuestion ? "Supporting Analysis" : "Claims Analyzed"}</h3>
              {hasMultipleProceedings ? (
                <ClaimsGroupedByScope claimVerdicts={claimVerdicts} scopes={scopes} />
              ) : (
                claimVerdicts.map((cv: any) => <ClaimCard key={cv.claimId} claim={cv} />)
              )}
            </div>
          )}
        </div>
      )}

      {/* Sources Tab */}
      {tab === "sources" && hasV22Data && (
        <div className={styles.contentCard}>
          <SourcesPanel searchQueries={searchQueries} sources={sources} researchStats={researchStats} searchProvider={result?.meta?.searchProvider} />
        </div>
      )}

      {/* JSON Tab */}
      {tab === "json" && (
        <pre className={styles.jsonContainer}>
          {jsonText || "No result yet."}
        </pre>
      )}

      {/* Events Tab */}
      {tab === "events" && (
        <div className={styles.contentCard}>
          <ul className={styles.eventsList}>
            {events.map((e) => (
              <li key={e.id} className={styles.eventItem}>
                <code className={styles.eventTimestamp}>{e.tsUtc}</code>{" "}
                <b className={getEventLevelClass(e.level)}>{e.level}</b> — {e.message}
              </li>
            ))}
            {events.length === 0 && <li style={{ color: "#666" }}>No events yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  if (typeof document === 'undefined') return text;
  try {
    const textarea = document.createElement('textarea');
    if (!textarea) return text;
    textarea.innerHTML = text;
    return textarea.value || text;
  } catch (e) {
    return text;
  }
}


// ============================================================================
// Sources Panel
// ============================================================================

function SourcesPanel({ searchQueries, sources, researchStats, searchProvider }: { searchQueries: any[]; sources: any[]; researchStats: any; searchProvider?: string }) {
  return (
    <div>
      <div className={styles.sourcesHeader}>
        <h3 className={styles.sourcesTitle}>🔍 Research Summary</h3>
        {searchProvider && (
          <span className={styles.providerBadge}>
            via {searchProvider}
          </span>
        )}
      </div>

      {researchStats && (
        <div className={styles.statsGrid}>
          <StatCard label="Web Searches" value={researchStats.totalSearches} icon="🔍" />
          <StatCard label="LLM Calls" value={researchStats.llmCalls || "N/A"} icon="🤖" />
          <StatCard label="Results Found" value={researchStats.totalResults} icon="📋" />
          <StatCard label="Sources Fetched" value={researchStats.sourcesFetched} icon="🌐" />
          <StatCard label="Fetch Success" value={researchStats.sourcesSuccessful} icon="✅" />
          <StatCard label="Facts Extracted" value={researchStats.factsExtracted} icon="📝" />
        </div>
      )}

      <h4 className={styles.sectionTitle}>Search Queries Performed</h4>
      {searchQueries.length > 0 ? (
        <div className={styles.searchQueriesList}>
          {searchQueries.map((sq: any, i: number) => (
            <div key={i} className={styles.searchQueryItem}>
              <span className={styles.searchQueryIcon}>🔍</span>
              <div className={styles.searchQueryContent}>
                <code className={styles.searchQueryText}>{sq.query}</code>
                <div className={styles.searchQueryMeta}>
                  Focus: {sq.focus} | Iteration: {sq.iteration}
                  {sq.searchProvider && <> | Provider: {sq.searchProvider}</>}
                </div>
              </div>
              <div className={`${styles.searchResultsBadge} ${sq.resultsCount > 0 ? styles.searchResultsSuccess : styles.searchResultsFailed}`}>
                {sq.resultsCount} results
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.noDataWarning}>
          No search queries recorded.
        </div>
      )}

      <h4 className={styles.sectionTitle} style={{ marginTop: 24 }}>Sources Fetched</h4>
      {sources.length > 0 ? (
        <div className={styles.sourcesList}>
          {sources.map((s: any, i: number) => (
            <div key={i} className={`${styles.sourceItem} ${s.fetchSuccess ? styles.sourceItemSuccess : styles.sourceItemFailed}`}>
              <span className={styles.sourceIcon}>{s.fetchSuccess ? "✅" : "❌"}</span>
              <div className={styles.sourceContent}>
                <div className={styles.sourceTitle}>
                  {decodeHtmlEntities(s.title || "Unknown")}
                </div>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className={styles.sourceUrl}>
                  {s.url}
                </a>
                {s.searchQuery && (
                  <div className={styles.sourceQuery}>
                    Found via: "{s.searchQuery}"
                  </div>
                )}
              </div>
              <div className={styles.sourceMetadata}>
                {s.trackRecordScore && (
                  <div className={`${styles.trackRecordScore} ${getTrackRecordClass(s.trackRecordScore)}`}>
                    {(s.trackRecordScore * 100).toFixed(0)}%
                  </div>
                )}
                <div className={styles.sourceCategory}>{s.category}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.noDataError}>
          No sources were fetched.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

// ============================================================================
// Utility Components
// ============================================================================

function Badge({ children, bg, color, title }: { children: React.ReactNode; bg: string; color: string; title?: string }) {
  return (
    <span style={{ padding: "2px 8px", backgroundColor: bg, color, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: title ? "help" : "default" }} title={title}>
      {children}
    </span>
  );
}

// ============================================================================
// Multi-Scope Answer Banner
// ============================================================================

function MultiScopeAnswerBanner({ questionAnswer, scopes, impliedClaim }: { questionAnswer: any; scopes: any[]; impliedClaim?: string }) {
  const overallTruth = getAnswerTruthPercentage(questionAnswer);
  const overallConfidence = questionAnswer?.confidence ?? 0;
  const overallVerdict = percentageToClaimVerdict(overallTruth, overallConfidence);
  const overallColor = CLAIM_VERDICT_COLORS[overallVerdict] || CLAIM_VERDICT_COLORS["UNVERIFIED"];
  const showImpliedClaim =
    !!impliedClaim &&
    impliedClaim.trim().length > 0 &&
    String(questionAnswer?.question || "").trim() !== impliedClaim.trim();

  // Determine if any contestations have actual counter-evidence (CONTESTED)
  // Opinion-based contestations without evidence are not highlighted
  const allKeyFactors: any[] = [
    ...(questionAnswer?.keyFactors || []),
    ...(questionAnswer?.proceedingAnswers?.flatMap((p: any) => p.keyFactors || []) || []),
  ];
  const hasEvidenceBasedContestations = allKeyFactors.some(
    (f: any) =>
      f.supports === "no" &&
      f.isContested &&
      (f.factualBasis === "established" || f.factualBasis === "disputed")
  );

  return (
    <div className={styles.multiProceedingBanner}>
      <div className={styles.questionHeader}>
        <div className={styles.questionLabel}>
          📝 Question Asked
        </div>
        <div className={styles.questionText}>
          "{questionAnswer.question}"
        </div>
        {showImpliedClaim && (
          <div className={styles.impliedClaimRow}>
            <div className={styles.impliedClaimLabel}>Implied claim</div>
            <div className={styles.impliedClaimText}>"{impliedClaim}"</div>
          </div>
        )}
      </div>

      <div className={styles.proceedingNotice}>
        <span className={styles.proceedingIcon}>🔀</span>
        <span className={styles.proceedingText}>
          {scopes.length} distinct scopes analyzed separately
        </span>
        {hasEvidenceBasedContestations && (
          <Badge bg="#fce4ec" color="#c2185b">⚠️ Contains contested factors</Badge>
        )}
      </div>

      <div className={styles.answerContent} style={{ borderColor: overallColor.border }}>
        <div className={styles.answerRow}>
          <span className={styles.answerLabel}>Overall Answer</span>
          <span className={styles.answerBadge} style={{ backgroundColor: overallColor.bg, color: overallColor.text }}>
            {overallColor.icon} {getVerdictLabel(overallVerdict)}
          </span>
          <span className={styles.answerPercentage}>{overallTruth}% <span style={{ fontSize: 12, color: "#999" }}>({questionAnswer.confidence}%  confidence)</span></span>
        </div>

        {questionAnswer.calibrationNote && (
          <div className={styles.calibrationNote}>
            <span className={styles.calibrationText}>⚠️ {questionAnswer.calibrationNote}</span>
          </div>
        )}

        {questionAnswer.proceedingSummary && (
          <div className={styles.proceedingSummary}>
            <div className={styles.proceedingSummaryText}>{questionAnswer.proceedingSummary}</div>
          </div>
        )}

        <div className={styles.shortAnswerBox} style={{ borderLeftColor: overallColor.border }}>
          <div className={styles.shortAnswerText}>{questionAnswer.shortAnswer}</div>
        </div>
      </div>

      {questionAnswer.proceedingAnswers && questionAnswer.proceedingAnswers.length > 0 && (
        <div className={styles.proceedingsAnalysis}>
          <h4 className={styles.proceedingsHeader}>
            🔀 Scope-by-Scope Analysis
          </h4>
          <div className={styles.proceedingsStack}>
            {questionAnswer.proceedingAnswers.map((pa: any) => {
              const scope = scopes.find((s: any) => s.id === pa.proceedingId);
              return <ScopeCard key={pa.proceedingId} scopeAnswer={pa} scope={scope} />;
            })}
          </div>
        </div>
      )}

      {/* Show overall key factors only when there are NO per-proceeding answers (single question without proceedings) */}
      {(!questionAnswer.proceedingAnswers || questionAnswer.proceedingAnswers.length === 0) && questionAnswer.keyFactors?.length > 0 && (
        <div className={styles.keyFactorsSection}>
          <div className={styles.keyFactorsHeader}>Key Factors</div>
          <div className={styles.keyFactorsList}>
            {questionAnswer.keyFactors.map((factor: any, i: number) => (
              <KeyFactorRow key={i} factor={factor} showContestation={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScopeCard({ scopeAnswer, scope }: { scopeAnswer: any; scope: any }) {
  const scopeTruth = getAnswerTruthPercentage(scopeAnswer);
  const scopeConfidence = scopeAnswer?.confidence ?? 0;
  const scopeVerdict = percentageToClaimVerdict(scopeTruth, scopeConfidence);
  const color = CLAIM_VERDICT_COLORS[scopeVerdict] || CLAIM_VERDICT_COLORS["UNVERIFIED"];

  const factors = scopeAnswer.keyFactors || [];
  const positiveCount = factors.filter((f: any) => f.supports === "yes").length;
  const negativeCount = factors.filter((f: any) => f.supports === "no").length;
  const neutralCount = factors.filter((f: any) => f.supports === "neutral").length;
  const contestedCount = factors.filter((f: any) => f.supports === "no" && f.isContested).length;

  const subject = (scope?.subject || "").trim();
  const rawOutcome = (scope?.outcome || "").trim().toLowerCase();
  // Don't display vague outcomes - only show if we have a concrete outcome
  const isVagueOutcome = !rawOutcome || 
    rawOutcome === "unknown" || 
    rawOutcome === "pending" || 
    rawOutcome.includes("investigation") ||
    rawOutcome.includes("ongoing") ||
    rawOutcome.includes("not yet");
  const outcome = isVagueOutcome ? "" : scope?.outcome?.trim() || "";
  const charges: string[] = Array.isArray(scope?.charges) ? scope.charges : [];
  const showAbout = !!subject || (charges.length > 0) || !!outcome;

  return (
    <div className={styles.proceedingCard} style={{ borderColor: color.border }}>
      <div className={styles.proceedingCardHeader}>
        <div className={styles.proceedingCardTitle}>
          {scope?.name || scopeAnswer.proceedingName}
        </div>
        {scope && (
          <div className={styles.proceedingCardMeta}>
            {scope.court && <span>{scope.court} • </span>}
            {scope.date && <span>{scope.date}</span>}
            {scope.status && scope.status !== "unknown" && <span> • {scope.status}</span>}
          </div>
        )}
        {showAbout && (
          <div className={styles.proceedingAboutInline}>
            {subject && (
              <span className={styles.proceedingAboutItem}>
                <span className={styles.proceedingAboutLabel}>Subject:</span> {subject}
              </span>
            )}
            {charges.length > 0 && (
              <span className={styles.proceedingAboutItem}>
                <span className={styles.proceedingAboutLabel}>Charges:</span> {charges.slice(0, 3).join("; ")}{charges.length > 3 ? "…" : ""}
              </span>
            )}
            {outcome && (
              <span className={styles.proceedingAboutItem}>
                <span className={styles.proceedingAboutLabel}>Outcome:</span> {outcome}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.proceedingCardContent}>
        <div className={styles.proceedingAnswerRow}>
          <span className={styles.proceedingAnswerBadge} style={{ backgroundColor: color.bg, color: color.text }}>
            {color.icon} {getVerdictLabel(scopeVerdict)}
          </span>
          <span className={styles.proceedingPercentage}>{scopeTruth}% <span style={{ fontSize: 11, color: "#999" }}>({scopeAnswer.confidence}%  confidence)</span></span>
        </div>

        <div className={`${styles.factorsSummary} ${contestedCount > 0 ? styles.factorsSummaryContested : styles.factorsSummaryNormal}`}>
          <span className={styles.factorsPositive}>✅ {positiveCount} positive</span>
          <span className={styles.factorsNegative}>
            ❌ {negativeCount} negative
            {contestedCount > 0 && (
              <span className={styles.factorsContested}> ({contestedCount} contested)</span>
            )}
          </span>
          {neutralCount > 0 && <span className={styles.factorsNeutral}>➖ {neutralCount} neutral</span>}
        </div>

        {scopeAnswer.shortAnswer && (
          <div className={styles.proceedingShortAnswer}>
            <span className={styles.proceedingAssessmentLabel}>Assessment:</span>{" "}
            {scopeAnswer.shortAnswer}
          </div>
        )}

        {factors.length > 0 && (
          <div className={styles.factorsListSection}>
            <div className={styles.factorsListHeader}>Key Factors ({factors.length})</div>
            {factors.map((f: any, i: number) => {
              // Only show CONTESTED label when opposition has actual counter-evidence
              const hasEvidenceBasedContestation = f.isContested &&
                (f.factualBasis === "established" || f.factualBasis === "disputed");
              return (
                <div key={i} className={`${styles.factorItem} ${hasEvidenceBasedContestation ? styles.factorItemContested : styles.factorItemNormal}`}>
                  <span className={styles.factorIcon}>{f.supports === "yes" ? "✅" : f.supports === "no" ? "❌" : "➖"}</span>
                  <div className={styles.factorTextWrapper}>
                    <span className={styles.factorText}>
                      {f.factor}
                      {hasEvidenceBasedContestation && <span className={styles.contestedLabel}> ⚠️ CONTESTED</span>}
                    </span>
                    {f.isContested && f.contestedBy && (
                      <span className={styles.factorContestation}>
                        {hasEvidenceBasedContestation ? "Contested by" : "Doubted by"}: {f.contestedBy}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KeyFactorRow({ factor, showContestation = true }: { factor: any; showContestation?: boolean }) {
  const icon = factor.supports === "yes" ? "✅" : factor.supports === "no" ? "❌" : "➖";

  // Only show CONTESTED when opposition has actual counter-evidence
  // Opinion-based contestations without evidence are not highlighted (almost anything can be doubted)
  const hasEvidenceBasedContestation = showContestation && factor.isContested &&
    (factor.factualBasis === "established" || factor.factualBasis === "disputed");

  return (
    <div className={`${styles.keyFactorRow} ${hasEvidenceBasedContestation ? styles.keyFactorRowContested : styles.keyFactorRowNormal}`}>
      <span className={styles.keyFactorIcon}>{icon}</span>
      <div className={styles.keyFactorContent}>
        <div className={styles.keyFactorHeader}>
          <span className={styles.keyFactorTitle}>{factor.factor}</span>
          {hasEvidenceBasedContestation && (
            <Badge bg="#fce4ec" color="#c2185b">⚠️ CONTESTED</Badge>
          )}
        </div>
        <div className={styles.keyFactorExplanation}>{factor.explanation}</div>
        {showContestation && factor.isContested && factor.contestedBy && (
          <div className={styles.keyFactorContestation}>
            {hasEvidenceBasedContestation ? "Contested by" : "Doubted by"}: {factor.contestedBy}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Single Question Answer Banner
// ============================================================================

function QuestionAnswerBanner({ questionAnswer, impliedClaim }: { questionAnswer: any; impliedClaim?: string }) {
  const answerTruth = getAnswerTruthPercentage(questionAnswer);
  const answerConfidence = questionAnswer?.confidence ?? 0;
  const answerVerdict = percentageToClaimVerdict(answerTruth, answerConfidence);
  const color = CLAIM_VERDICT_COLORS[answerVerdict] || CLAIM_VERDICT_COLORS["UNVERIFIED"];
  const showImpliedClaim =
    !!impliedClaim &&
    impliedClaim.trim().length > 0 &&
    String(questionAnswer?.question || "").trim() !== impliedClaim.trim();

  // Check for contested factors (evidence-based only)
  const allKeyFactors = questionAnswer?.keyFactors || [];
  const hasEvidenceBasedContestations = allKeyFactors.some(
    (f: any) =>
      f.supports === "no" &&
      f.isContested &&
      (f.factualBasis === "established" || f.factualBasis === "disputed")
  );

  // Calculate factor counts
  const positiveFactors = allKeyFactors.filter((f: any) => f.supports === "yes").length;
  const negativeFactors = allKeyFactors.filter((f: any) => f.supports === "no").length;
  const neutralFactors = allKeyFactors.filter((f: any) => f.supports === "neutral").length;

  return (
    <div className={styles.questionBanner} style={{ borderColor: color.border }}>
      <div className={styles.questionBannerHeader}>
        <div className={styles.questionBannerLabel}>📝 Question</div>
        <div className={styles.questionBannerText}>"{questionAnswer.question}"</div>
        {showImpliedClaim && (
          <div className={styles.impliedClaimRow}>
            <div className={styles.impliedClaimLabel}>Implied claim</div>
            <div className={styles.impliedClaimText}>"{impliedClaim}"</div>
          </div>
        )}
      </div>

      <div className={styles.questionBannerContent}>
        <div className={styles.questionBannerAnswerRow}>
          <span className={styles.questionBannerAnswerBadge} style={{ backgroundColor: color.bg, color: color.text }}>
            {color.icon} {getVerdictLabel(answerVerdict)}
          </span>
          <span className={styles.questionBannerPercentage}>{answerTruth}% <span style={{ fontSize: 12, color: "#999" }}>({questionAnswer.confidence}%  confidence)</span></span>
          {hasEvidenceBasedContestations && (
            <Badge bg="#fce4ec" color="#c2185b">⚠️ Contains contested factors</Badge>
          )}
        </div>

        {allKeyFactors.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
            <span style={{ marginRight: 12 }}>✅ {positiveFactors} positive</span>
            <span style={{ marginRight: 12 }}>❌ {negativeFactors} negative</span>
            <span>⚪ {neutralFactors} neutral</span>
          </div>
        )}

        <div className={styles.questionBannerShortAnswer} style={{ borderLeftColor: color.border }}>
          <div className={styles.questionBannerShortAnswerText}>{questionAnswer.shortAnswer}</div>
        </div>
      </div>

      {questionAnswer.keyFactors?.length > 0 && (
        <div className={styles.questionBannerKeyFactors}>
          <div className={styles.questionBannerKeyFactorsLabel}>KEY FACTORS</div>
          {questionAnswer.keyFactors.map((factor: any, i: number) => (
            <KeyFactorRow key={i} factor={factor} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Article Verdict Banner
// ============================================================================

function ArticleVerdictBanner({ articleAnalysis, fallbackThesis, pseudoscienceAnalysis }: { articleAnalysis: any; fallbackThesis?: string; pseudoscienceAnalysis?: any }) {
  const articleTruth = getArticleTruthPercentage(articleAnalysis);
  const articleVerdictLabel = percentageToArticleVerdict(articleTruth);
  const color = ARTICLE_VERDICT_COLORS[articleVerdictLabel] || ARTICLE_VERDICT_COLORS["UNVERIFIED"];

  const isPseudo = pseudoscienceAnalysis?.isPseudoscience || articleAnalysis.isPseudoscience;
  const pseudoCategories = pseudoscienceAnalysis?.categories || articleAnalysis.pseudoscienceCategories || [];

  const articlePct = articleTruth;

  // Get the verdict reason or generate a summary
  const verdictReason = articleAnalysis.articleVerdictReason || articleAnalysis.verdictExplanation || "";

  return (
    <div className={styles.articleBanner} style={{ borderColor: color.border }}>
      <div className={styles.articleBannerContent}>
        {/* ARTICLE VERDICT - Primary focus */}
        <div className={styles.articleVerdictHeader}>
          <span className={styles.articleVerdictLabel}>Article Verdict</span>
        </div>
        <div className={styles.articleVerdictRow}>
          <span className={styles.articleVerdictBadge} style={{ backgroundColor: color.bg, color: color.text }}>
            {color.icon} {getVerdictLabel(articleVerdictLabel)}
          </span>
          <span className={styles.articlePercentage}>{articlePct}%</span>
          {isPseudo && (
            <span className={styles.pseudoscienceBadge}>
              🔬 Pseudoscience Detected
            </span>
          )}
        </div>

        {/* Verdict Explanation */}
        {verdictReason && (
          <div className={styles.verdictReasonBox} style={{ borderLeftColor: color.border }}>
            {verdictReason}
          </div>
        )}

        {isPseudo && pseudoCategories.length > 0 && (
          <div className={styles.pseudoscienceWarning}>
            <div className={styles.pseudoscienceWarningHeader}>
              ⚠️ Scientific Credibility Warning
            </div>
            <div className={styles.pseudoscienceWarningText}>
              This content contains claims based on <b>{pseudoCategories.map((c: string) =>
                c.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
              ).join(", ")}</b> — concepts that contradict established scientific consensus.
            </div>
          </div>
        )}

        {/* NEW v2.6.18: Key Factors for article mode (unified with question mode) */}
        {articleAnalysis.keyFactors && articleAnalysis.keyFactors.length > 0 && (
          <div className={styles.keyFactorsSection}>
            <div className={styles.keyFactorsHeader}>Key Factors</div>
            <div className={styles.keyFactorsList}>
              {articleAnalysis.keyFactors.map((factor: any, i: number) => {
                const hasEvidenceBasedContestation = factor.isContested &&
                  (factor.factualBasis === "established" || factor.factualBasis === "disputed");
                return (
                  <div key={i} className={`${styles.keyFactor} ${hasEvidenceBasedContestation ? styles.keyFactorContested : ""}`}>
                    <span className={styles.keyFactorIcon}>
                      {factor.supports === "yes" ? "✅" : factor.supports === "no" ? "❌" : "⚪"}
                    </span>
                    <span className={styles.keyFactorText}>{factor.factor}</span>
                    {hasEvidenceBasedContestation && (
                      <span className={styles.contestedBadge}>⚠️ CONTESTED</span>
                    )}
                    {factor.isContested && factor.contestedBy && (
                      <div className={styles.contestedByText}>
                        {hasEvidenceBasedContestation ? "Contested by" : "Doubted by"}: {factor.contestedBy}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Article Summary Box
// ============================================================================

function ArticleSummaryBox({ articleSummary }: { articleSummary: any }) {
  return (
    <div className={styles.articleSummaryBox}>
      <div className={styles.articleSummaryHeader}>
        <b>📄 Article Summary</b>
      </div>
      <div className={styles.articleSummaryContent}>
        <div className={styles.articleSummaryValue}>{decodeHtmlEntities(articleSummary.mainArgument)}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Two-Panel Summary
// ============================================================================

function TwoPanelSummary({ articleSummary, factharborAnalysis, isQuestion }: { articleSummary: any; factharborAnalysis: any; isQuestion?: boolean }) {
  const overallTruth = typeof factharborAnalysis?.overallVerdict === "number"
    ? factharborAnalysis.overallVerdict
    : 50;
  const overallLabel = percentageToClaimVerdict(overallTruth);
  return (
    <div className={styles.twoPanelContainer}>
      <div className={styles.twoPanelPanel}>
        <div className={styles.twoPanelHeader}>
          <b>{isQuestion ? "❓ The Question" : "📄 Article"}</b>
        </div>
        <div className={styles.twoPanelContent}>
          <div className={styles.twoPanelLabel}>Title</div>
          <div className={styles.twoPanelValue}>{decodeHtmlEntities(articleSummary.title)}</div>
          <div className={styles.twoPanelLabel}>{isQuestion ? "Implied Claim" : "Main Thesis"}</div>
          <div className={styles.twoPanelValue}>{decodeHtmlEntities(articleSummary.mainArgument)}</div>
        </div>
      </div>

      <div className={`${styles.twoPanelPanel} ${styles.twoPanelPanelAnalysis}`}>
        <div className={styles.twoPanelHeader}>
          <b>🔍 FactHarbor Analysis</b>
        </div>
        <div className={styles.twoPanelContent}>
          {/* Source Credibility hidden at article level - TODO: show at claim level later */}
          <div className={styles.twoPanelLabel}>Methodology</div>
          <div className={styles.twoPanelValue}>{factharborAnalysis.methodologyAssessment}</div>
          <div className={styles.twoPanelOverall}>
            <div className={styles.twoPanelOverallLabel}>OVERALL</div>
            <div className={styles.twoPanelOverallValue}>{getVerdictLabel(overallLabel)} ({overallTruth}%)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Claims Components
// ============================================================================

function ClaimsGroupedByScope({ claimVerdicts, scopes }: { claimVerdicts: any[]; scopes: any[] }) {
  const claimsByScope = new Map<string, any[]>();
  const crossScopeClaims: any[] = [];

  for (const cv of claimVerdicts) {
    if (!cv.relatedProceedingId) {
      crossScopeClaims.push(cv);
      continue;
    }
    if (!claimsByScope.has(cv.relatedProceedingId)) claimsByScope.set(cv.relatedProceedingId, []);
    claimsByScope.get(cv.relatedProceedingId)!.push(cv);
  }

  const scopeIds = scopes.map((s: any) => s.id);
  const hasScopes = scopeIds.length > 0;
  const groups: Array<{ id: string; title: string; claims: any[] }> = [];

  if (hasScopes) {
    for (const scope of scopes) {
      const ownClaims = claimsByScope.get(scope.id) || [];
      const combined = [...ownClaims];
      for (const crossClaim of crossScopeClaims) {
        if (!combined.some((c) => c.claimId === crossClaim.claimId)) {
          combined.push(crossClaim);
        }
      }
      if (combined.length === 0) continue;
      groups.push({
        id: scope.id,
        title: `⚖️ ${scope.shortName}: ${scope.name}`,
        claims: combined,
      });
    }

    for (const [scopeId, claims] of claimsByScope.entries()) {
      if (scopeIds.includes(scopeId)) continue;
      if (claims.length === 0) continue;
      groups.push({
        id: scopeId,
        title: `Scope ${scopeId}`,
        claims,
      });
    }
  } else {
    const claimsByGroup = new Map<string, any[]>();
    for (const cv of claimVerdicts) {
      const scopeId = cv.relatedProceedingId || "general";
      if (!claimsByGroup.has(scopeId)) claimsByGroup.set(scopeId, []);
      claimsByGroup.get(scopeId)!.push(cv);
    }

    for (const [scopeId, claims] of claimsByGroup.entries()) {
      if (claims.length === 0) continue;
      const scope = scopes.find((s: any) => s.id === scopeId);
      groups.push({
        id: scopeId,
        title: scope ? `⚖️ ${scope.shortName}: ${scope.name}` : "General Claims",
        claims,
      });
    }
  }

  return (
    <div>
      {groups.map((group) => (
        <div key={group.id} className={styles.proceedingGroup}>
          <h4 className={styles.proceedingGroupHeader}>
            {group.title}
          </h4>
          {group.claims.map((cv: any) => (
            <ClaimCard
              key={`${group.id}:${cv.claimId}`}
              claim={cv}
              showCrossProceeding={hasScopes && !cv.relatedProceedingId}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ClaimCard({ claim, showCrossProceeding = false }: { claim: any; showCrossProceeding?: boolean }) {
  const claimTruth = getClaimTruthPercentage(claim);
  const claimConfidence = claim?.confidence ?? 0;
  const claimVerdictLabel = percentageToClaimVerdict(claimTruth, claimConfidence);
  const color = CLAIM_VERDICT_COLORS[claimVerdictLabel] || CLAIM_VERDICT_COLORS["UNVERIFIED"];

  // Only show CONTESTED label when opposition has actual counter-evidence
  const hasEvidenceBasedContestation = claim.isContested &&
    (claim.factualBasis === "established" || claim.factualBasis === "disputed");

  return (
    <div className={`${styles.claimCard} ${hasEvidenceBasedContestation ? styles.claimCardContested : ""}`} style={{ borderLeftColor: color.border }}>
      <div className={styles.claimCardHeader}>
        <span className={styles.claimId}>{claim.claimId}</span>
        {claim.isCentral && <Badge bg="#e8f4fd" color="#0056b3">🔑 Central</Badge>}
        <Badge bg={color.bg} color={color.text}>
          {color.icon} {getVerdictLabel(claimVerdictLabel)} {claimTruth}% ({claim.confidence}% confidence)
        </Badge>
        {hasEvidenceBasedContestation && (
          <Badge bg="#fce4ec" color="#c2185b">⚠️ CONTESTED</Badge>
        )}
        {showCrossProceeding && (
          <Badge bg="#eef2ff" color="#1e3a8a">Cross-scope</Badge>
        )}
        {claim.isPseudoscience && (
          <Badge bg="#ffebee" color="#c62828">🔬 Pseudoscience</Badge>
        )}
      </div>
      <div className={styles.claimText}>"{claim.claimText}"</div>
      <div className={styles.claimReasoning}>{claim.reasoning}</div>
      {claim.isContested && claim.contestedBy && (
        <div className={styles.claimContestation}>
          {hasEvidenceBasedContestation ? "Contested by" : "Doubted by"}: {claim.contestedBy}
        </div>
      )}
      {claim.escalationReason && (
        <div className={styles.claimEscalation}>
          ⚠️ {claim.escalationReason}
        </div>
      )}
    </div>
  );
}

function ClaimHighlighter({ originalText, claimVerdicts }: { originalText: string; claimVerdicts: any[] }) {
  return (
    <div>
      <div className={styles.highlighterTextContainer}>
        {originalText}
      </div>

      <div className={styles.highlighterClaimsSection}>
        <h4 className={styles.highlighterClaimsTitle}>Claims Found:</h4>
        {claimVerdicts.map((cv: any) => {
          // Map highlightColor to background color
          const bgColor =
            cv.highlightColor === "green" ? "#d4edda" :
            cv.highlightColor === "light-green" ? "#e8f5e9" :
            cv.highlightColor === "yellow" ? "#fff9c4" :
            cv.highlightColor === "orange" ? "#fff3e0" :
            cv.highlightColor === "dark-orange" ? "#ffccbc" :
            cv.highlightColor === "red" ? "#ffcdd2" :
            cv.highlightColor === "dark-red" ? "#ffebee" :
            "#fff3e0"; // default orange for unverified
          const claimTruth = getClaimTruthPercentage(cv);
          const cvConfidence = cv?.confidence ?? 0;
          const claimVerdictLabel = percentageToClaimVerdict(claimTruth, cvConfidence);

          return (
            <div key={cv.claimId} className={styles.highlighterClaimItem} style={{ backgroundColor: bgColor }}>
              <span className={styles.highlighterClaimId}>{cv.claimId}</span>
              <div>
                <div className={styles.highlighterClaimText}>{cv.claimText}</div>
                <div className={styles.highlighterClaimVerdict}>{getVerdictLabel(claimVerdictLabel)} ({claimTruth}%)</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
