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

import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  percentageToArticleVerdict,
  percentageToClaimVerdict,
} from "@/lib/analyzer/truth-scale";
import styles from "./page.module.css";
import { ClaimsGroupedByScope } from "./components/ClaimsGroupedByScope";
import { EvidenceScopeTooltip } from "./components/EvidenceScopeTooltip";
import { MethodologySubGroup } from "./components/MethodologySubGroup";
import { ArticleFrameBanner } from "./components/ArticleFrameBanner";
import { groupFactsByMethodology } from "./utils/methodologyGrouping";
import { PromptViewer } from "./components/PromptViewer";

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
  pipelineVariant?: string;
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
  "MIXED": { bg: "#e3f2fd", text: "#1565c0", border: "#2196f3", icon: "⚖" },  // Blue: confident mix (evidence on both sides)
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
  "MIXED": { bg: "#e3f2fd", text: "#1565c0", border: "#2196f3", icon: "⚖" },  // Blue: confident mix
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
  "MIXED": { bg: "#e3f2fd", text: "#1565c0", border: "#2196f3", icon: "⚖" },  // Blue: confident mix
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
  "MIXED": 50,
  "UNVERIFIED": 50,
  "LEANING-FALSE": 36,
  "MOSTLY-FALSE": 22,
  "FALSE": 7,
};

const ARTICLE_VERDICT_MIDPOINTS: Record<string, number> = {
  // Statement verdicts
  "TRUE": 93,
  "MOSTLY-TRUE": 79,
  "LEANING-TRUE": 64,
  "MIXED": 50,
  "UNVERIFIED": 50,
  "LEANING-FALSE": 36,
  "MOSTLY-FALSE": 22,
  "FALSE": 7,
  // v2.6.31: Legacy question-based verdicts (for backward compatibility with pre-neutrality jobs)
  "YES": 93,
  "MOSTLY-YES": 79,
  "LEANING-YES": 64,
  "LEANING-NO": 36,
  "MOSTLY-NO": 22,
  "NO": 7,
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

function getVerdictTruthPercentage(summary: any): number {
  if (typeof summary?.truthPercentage === "number") {
    return normalizePercentage(summary.truthPercentage);
  }
  if (typeof summary?.answer === "number") {
    return normalizePercentage(summary.answer);
  }
  if (typeof summary?.verdict === "number") {
    return normalizePercentage(summary.verdict);
  }
  return resolveTruthPercentage(summary?.answer ?? summary?.verdict, ARTICLE_VERDICT_MIDPOINTS);
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

// Helper function to get track record score CSS class (symmetric 7-band scale)
function getTrackRecordClass(score: number): string {
  if (score >= 0.58) return styles.trackRecordHigh;    // leaning_reliable+ (58%+)
  if (score >= 0.43) return styles.trackRecordMedium;  // mixed (43-57%, variable track record)
  return styles.trackRecordLow;                        // leaning_unreliable- (<43%)
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
  const verdictSummary = result?.verdictSummary;
  const hasMultipleContexts =
    result?.meta?.hasMultipleContexts ?? result?.meta?.hasMultipleProceedings;
  // Prefer "analysisContexts" (v2.7), fall back to legacy fields for compatibility
  const scopes = result?.analysisContexts || result?.scopes || result?.proceedings || [];
  const impliedClaim: string = (result?.understanding?.impliedClaim || "").trim();
  const hasContestedFactors = result?.meta?.hasContestedFactors;
  const searchQueries = result?.searchQueries || [];
  const sources = result?.sources || [];
  const researchStats = result?.researchStats;
  const facts = result?.facts || []; // NEW v2.6.29: Access extracted facts for counter-evidence display
  // Prefer job.pipelineVariant (available immediately) over result meta (only after completion)
  const pipelineVariant = job?.pipelineVariant || result?.meta?.pipelineVariant || "orchestrated";
  const subClaims = result?.understanding?.subClaims || [];
  const tangentialSubClaims = Array.isArray(subClaims)
    ? subClaims.filter((c: any) => c?.thesisRelevance === "tangential")
    : [];

  // Determine if any contestations have actual counter-evidence (CONTESTED)
  // Opinion-based contestations without evidence are not highlighted (almost anything can be doubted)
  // Include Key Factors from both question mode AND article mode (unified in v2.6.18)
  const contextAnswers =
    verdictSummary?.contextAnswers || verdictSummary?.proceedingAnswers || [];
  const allKeyFactors: any[] = [
    ...(verdictSummary?.keyFactors || []),
    ...(contextAnswers.flatMap((p: any) => p.keyFactors || []) || []),
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
    const overallVerdict = twoPanelSummary?.factharborAnalysis?.overallVerdict;
    const overallConfidence = twoPanelSummary?.factharborAnalysis?.confidence ?? 0;
    const overallVerdictLabel =
      typeof overallVerdict === "number"
        ? percentageToClaimVerdict(overallVerdict, overallConfidence)
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span><b>ID:</b> <code>{job.jobId}</code></span>
            <Badge
              bg={pipelineVariant === "monolithic_dynamic" ? "#fce4ec" : pipelineVariant === "monolithic_canonical" ? "#fff3e0" : "#e3f2fd"}
              color={pipelineVariant === "monolithic_dynamic" ? "#c2185b" : pipelineVariant === "monolithic_canonical" ? "#e65100" : "#1565c0"}
              title={`Pipeline: ${pipelineVariant || "orchestrated"}`}
            >
              {pipelineVariant === "monolithic_dynamic" ? "⚗️ Dynamic" : pipelineVariant === "monolithic_canonical" ? "🔬 Canonical" : "🎯 Orchestrated"}
            </Badge>
          </div>
          <div><b>Status:</b> <code className={getStatusClass(job.status)}>{job.status}</code> ({job.progress}%)</div>
          <div className={styles.metaRow}><b>Generated:</b> <code>{new Date(job.updatedUtc).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</code></div>
          <div className={styles.inputRow}>
            <b>Input:</b> <code>{job.inputType}</code> — <span className={styles.inputValue}>{job.inputValue || job.inputPreview || "—"}</span>
          </div>
          {hasV22Data && (
            <div className={styles.badgesRow}>
              <span><b>Schema:</b> <code>{schemaVersion}</code></span>
              {result.meta.analysisId && <span>— <b>ID:</b> <code>{result.meta.analysisId}</code></span>}
              {/* v2.6.31: Removed QUESTION badge - Input Neutrality: no separate paths for questions */}
              {hasMultipleContexts && <Badge bg="#fff3e0" color="#e65100">🔀 {scopes.length} CONTEXTS</Badge>}
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
          {pipelineVariant === "monolithic_dynamic" ? (
            <DynamicResultViewer result={result} />
          ) : (
            <>
              {/* v2.6.31: Show article summary FIRST (Input Neutrality: same layout for all inputs) */}
              {twoPanelSummary?.articleSummary && (
                <ArticleSummaryBox
                  articleSummary={twoPanelSummary.articleSummary}
                />
              )}

              {(() => {
                const articleFrame =
                  pipelineVariant === "monolithic_dynamic"
                    ? result?.rawJson?.articleFrame
                    : result?.understanding?.analysisContext;
                return articleFrame ? (
                  <ArticleFrameBanner articleFrame={articleFrame} />
                ) : null;
              })()}

              {/* v2.6.33: Show transformed input if different from original */}
              {impliedClaim && (
                <TransformedInputBox
                  originalInput={job?.inputValue || ""}
                  transformedInput={impliedClaim}
                />
              )}

              {/* Input neutrality: same banner for all input styles */}
              {/* v2.6.31: Handle edge case where hasMultipleContexts is true but context answers are missing */}
              {hasMultipleContexts && contextAnswers.length > 0 ? (
                <MultiScopeStatementBanner
                  verdictSummary={verdictSummary}
                  scopes={scopes}
                  articleThesis={twoPanelSummary?.articleSummary?.mainArgument}
                  articleAnalysis={articleAnalysis}
                  pseudoscienceAnalysis={result?.pseudoscienceAnalysis}
                  fallbackConfidence={twoPanelSummary?.factharborAnalysis?.confidence}
                />
              ) : (
                /* Single-scope OR multi-scope with missing context answers: show ArticleVerdictBanner as fallback */
                (articleAnalysis || verdictSummary) && (
                  <ArticleVerdictBanner
                    articleAnalysis={articleAnalysis}
                    verdictSummary={verdictSummary}
                    fallbackThesis={twoPanelSummary?.articleSummary?.mainArgument || job?.inputValue}
                    pseudoscienceAnalysis={result?.pseudoscienceAnalysis}
                    fallbackConfidence={twoPanelSummary?.factharborAnalysis?.confidence}
                  />
                )
              )}

              {(claimVerdicts.length > 0 || tangentialSubClaims.length > 0) && (
                <div className={styles.claimsSection}>
                  {/* v2.6.31: Input Neutrality - same label for all inputs */}
                  <h3 className={styles.claimsSectionTitle}>Claims Analyzed</h3>
                  {hasMultipleContexts ? (
                    <ClaimsGroupedByScope
                      claimVerdicts={claimVerdicts}
                      scopes={scopes}
                      tangentialClaims={tangentialSubClaims}
                      renderClaim={(claim, showCrossScope) => (
                        <ClaimCard claim={claim} showCrossScope={showCrossScope} />
                      )}
                    />
                  ) : (
                    <>
                      {claimVerdicts.map((cv: any) => <ClaimCard key={cv.claimId} claim={cv} />)}
                      {tangentialSubClaims.length > 0 && (
                        <details className={styles.tangentialDetails}>
                          <summary className={styles.tangentialSummary}>
                            📎 Related context (tangential; excluded from verdict) ({tangentialSubClaims.length})
                          </summary>
                          <ul className={styles.tangentialList}>
                            {tangentialSubClaims.map((c: any) => (
                              <li key={c.id} className={styles.tangentialItem}>
                                <code className={styles.tangentialClaimId}>{c.id}</code> {c.text}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Sources Tab */}
      {tab === "sources" && hasV22Data && (
        <div className={styles.contentCard}>
          <SourcesPanel searchQueries={searchQueries} sources={sources} researchStats={researchStats} searchProvider={result?.meta?.searchProvider} />
          {/* NEW v2.6.29: Display facts with counter-evidence marking */}
          {facts.length > 0 && (
            <FactsPanel
              facts={facts}
              disableGrouping={pipelineVariant === "monolithic_dynamic"}
            />
          )}
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
          {job && <PromptViewer jobId={job.jobId} />}
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

// ============================================================================
// Facts Panel - NEW v2.6.29: Display facts with counter-evidence marking
// ============================================================================

function FactsPanel({ facts, disableGrouping = false }: { facts: any[]; disableGrouping?: boolean }) {
  if (!facts || facts.length === 0) return null;

  // Group facts by claim direction and source type
  const supportingFacts = facts.filter((f: any) => f.claimDirection === "supports" && !f.fromOppositeClaimSearch);
  const contradictingFacts = facts.filter((f: any) => f.claimDirection === "contradicts" && !f.fromOppositeClaimSearch);
  // NEW v2.6.29: Facts from opposite claim search - evidence that supports the inverse claim
  const oppositeClaimFacts = facts.filter((f: any) => f.fromOppositeClaimSearch === true);
  const neutralFacts = facts.filter((f: any) =>
    (f.claimDirection === "neutral" || !f.claimDirection) && !f.fromOppositeClaimSearch
  );

  const renderFactCard = (fact: any, className: string, extraMeta?: ReactNode) => (
    <div key={fact.id || fact.fact} className={`${styles.factItem} ${className}`}>
      <div className={styles.factText}>
        {fact.fact}
        {fact.evidenceScope && (
          <EvidenceScopeTooltip evidenceScope={fact.evidenceScope} />
        )}
      </div>
      <div className={styles.factMeta}>
        <span className={styles.factCategory}>{fact.category}</span>
        <span className={styles.factSource}>{decodeHtmlEntities(fact.sourceTitle || 'Unknown')}</span>
        {extraMeta}
      </div>
    </div>
  );

  const renderFactList = (factList: any[], className: string, extraMeta?: (fact: any) => ReactNode) => {
    if (factList.length === 0) return null;
    if (disableGrouping) {
      return factList.map((fact: any) => renderFactCard(fact, className, extraMeta?.(fact)));
    }

    const groups = groupFactsByMethodology(factList);
    if (!groups) {
      return factList.map((fact: any) => renderFactCard(fact, className, extraMeta?.(fact)));
    }

    return groups.map((group) => (
      <MethodologySubGroup
        key={group.key}
        group={group}
        renderFact={(fact) => renderFactCard(fact, className, extraMeta?.(fact))}
      />
    ));
  };

  return (
    <div className={styles.factsPanel}>
      <h3 className={styles.factsPanelTitle}>📊 Evidence Analysis</h3>

      <div className={styles.factsStats}>
        <span className={styles.factStatSupporting}>✅ {supportingFacts.length} supporting</span>
        <span className={styles.factStatContradicting}>❌ {contradictingFacts.length} contradicting</span>
        <span className={styles.factStatOpposite}>🔄 {oppositeClaimFacts.length} opposite claim</span>
        <span className={styles.factStatNeutral}>➖ {neutralFacts.length} neutral</span>
      </div>

      {/* NEW v2.6.29: Opposite Claim Evidence - displayed prominently */}
      {oppositeClaimFacts.length > 0 && (
        <div className={styles.factsSection}>
          <h4 className={styles.factsSectionTitle} style={{ color: '#1565c0' }}>
            🔄 Evidence for Opposite Claim ({oppositeClaimFacts.length})
          </h4>
          <p className={styles.oppositeClaimNote}>
            These facts were found by searching for the opposite of the user's claim.
            They support the inverse position and count against the original claim.
          </p>
          <div className={styles.factsList}>
            {renderFactList(oppositeClaimFacts, styles.factItemOpposite, () => (
              <span className={styles.factOppositeTag}>OPPOSITE CLAIM</span>
            ))}
          </div>
        </div>
      )}

      {contradictingFacts.length > 0 && (
        <div className={styles.factsSection}>
          <h4 className={styles.factsSectionTitle} style={{ color: '#c62828' }}>
            ⚠️ Counter-Evidence ({contradictingFacts.length})
          </h4>
          <div className={styles.factsList}>
            {renderFactList(contradictingFacts, styles.factItemContradicting)}
          </div>
        </div>
      )}

      {supportingFacts.length > 0 && (
        <div className={styles.factsSection}>
          <h4 className={styles.factsSectionTitle} style={{ color: '#2e7d32' }}>
            ✓ Supporting Evidence ({supportingFacts.length})
          </h4>
          <div className={styles.factsList}>
            {renderFactList(supportingFacts, styles.factItemSupporting)}
          </div>
        </div>
      )}

      {neutralFacts.length > 0 && (
        <div className={styles.factsSection}>
          <h4 className={styles.factsSectionTitle} style={{ color: '#757575' }}>
            Background context ({neutralFacts.length})
          </h4>
          <div className={styles.factsList}>
            {renderFactList(neutralFacts.slice(0, 5), styles.factItemNeutral)}
            {neutralFacts.length > 5 && (
              <div className={styles.factMoreIndicator}>
                + {neutralFacts.length - 5} more background facts
              </div>
            )}
          </div>
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
// Multi-Scope Verdict Banner (for statements with multiple scopes)
// ============================================================================

function MultiScopeStatementBanner({ verdictSummary, scopes, articleThesis, articleAnalysis, pseudoscienceAnalysis, fallbackConfidence }: { verdictSummary: any; scopes: any[]; articleThesis?: string; articleAnalysis?: any; pseudoscienceAnalysis?: any; fallbackConfidence?: number }) {
  const overallTruth = getVerdictTruthPercentage(verdictSummary);
  // v2.6.31: Also check twoPanelSummary.factharborAnalysis.confidence via fallbackConfidence prop
  const overallConfidence = verdictSummary?.confidence ?? fallbackConfidence ?? 0;
  const overallVerdict = percentageToClaimVerdict(overallTruth, overallConfidence);
  const overallColor = CLAIM_VERDICT_COLORS[overallVerdict] || CLAIM_VERDICT_COLORS["UNVERIFIED"];

  // v2.6.38: Check if overall verdict is reliable (single context vs multiple distinct contexts)
  const verdictReliability = articleAnalysis?.articleVerdictReliability || "high";
  const isUnreliableAverage = verdictReliability === "low";

  // Determine if any contestations have actual counter-evidence (CONTESTED)
  const contextAnswers =
    verdictSummary?.contextAnswers || verdictSummary?.proceedingAnswers || [];
  const allKeyFactors: any[] = [
    ...(verdictSummary?.keyFactors || []),
    ...(contextAnswers.flatMap((p: any) => p.keyFactors || []) || []),
  ];
  const hasEvidenceBasedContestations = allKeyFactors.some(
    (f: any) =>
      f.supports === "no" &&
      f.isContested &&
      (f.factualBasis === "established" || f.factualBasis === "disputed")
  );

  // Pseudoscience detection
  const isPseudo = pseudoscienceAnalysis?.isPseudoscience || articleAnalysis?.isPseudoscience;
  const pseudoCategories = pseudoscienceAnalysis?.categories || articleAnalysis?.pseudoscienceCategories || [];

  // Get the verdict reason (include summary as fallback)
  const verdictReason = articleAnalysis?.articleVerdictReason || articleAnalysis?.verdictExplanation || verdictSummary?.proceedingSummary || verdictSummary?.summary || "";

  return (
    <div className={styles.multiScopeBanner}>
      <div className={styles.scopeNotice}>
        <span className={styles.scopeIcon}>🔀</span>
        <span
          className={styles.scopeText}
          title='A "context" is a bounded analytical frame (AnalysisContext) that should be analyzed separately.'
        >
          {scopes.length} distinct contexts analyzed separately
        </span>
        {hasEvidenceBasedContestations && (
          <Badge bg="#fce4ec" color="#c2185b">⚠️ Contains contested factors</Badge>
        )}
        {isPseudo && (
          <Badge bg="#ffebee" color="#c62828">🔬 Pseudoscience Detected</Badge>
        )}
      </div>

      <div className={styles.answerContent} style={{ borderColor: overallColor.border }}>
        <div className={styles.answerRow} style={isUnreliableAverage ? { opacity: 0.6 } : undefined}>
          <span className={styles.answerLabel} title={isUnreliableAverage ? "This average may not be meaningful - see individual context verdicts below" : "Overall verdict is assessed holistically. Claims average may differ due to evidence discovery and weighting."}>
            VERDICT {isUnreliableAverage && "(avg)"}
          </span>
          <span className={styles.answerBadge} style={{ backgroundColor: overallColor.bg, color: overallColor.text }}>
            {overallColor.icon} {getVerdictLabel(overallVerdict)}
          </span>
          <span className={styles.answerPercentage}>{overallTruth}% <span style={{ fontSize: 12, color: "#999" }}>({overallConfidence}% confidence)</span></span>
        </div>

        {articleAnalysis?.claimsAverageTruthPercentage !== undefined && (
          <div
            className={styles.claimsAverageRow}
            title="Weighted average of direct claim verdicts (centrality × confidence); counter-claims are inverted; tangential claims are excluded."
          >
            <span
              className={styles.claimsAverageLabel}
              title="Weighted average of direct claim verdicts (centrality × confidence); counter-claims are inverted; tangential claims are excluded."
            >
              Claims average
            </span>
            <span className={styles.claimsAverageValue}>{articleAnalysis.claimsAverageTruthPercentage}%</span>
          </div>
        )}

        {verdictSummary?.calibrationNote && (
          <div className={styles.calibrationNote}>
            <span className={styles.calibrationText}>⚠️ {verdictSummary.calibrationNote}</span>
          </div>
        )}

        {verdictReason && (
          <div className={styles.scopeSummary}>
            <div className={styles.scopeSummaryText}>{verdictReason}</div>
          </div>
        )}

        {/* v2.6.38: Explain unreliable average */}
        {isUnreliableAverage && (
          <div className={styles.calibrationNote} style={{ background: '#fff4e6', borderLeft: '3px solid #ff9800' }}>
            <span className={styles.calibrationText}>
              ℹ️ This average may not be meaningful because contexts answer different questions. Focus on individual context verdicts below.
            </span>
          </div>
        )}

        {/* Only show shortAnswer if it's different from verdictReason to avoid duplication */}
        {(verdictSummary?.shortAnswer || verdictSummary?.summary) && 
         (verdictSummary?.shortAnswer || verdictSummary?.summary) !== verdictReason && (
          <div className={styles.shortAnswerBox} style={{ borderLeftColor: overallColor.border }}>
            <div className={styles.shortAnswerText}>{verdictSummary.shortAnswer || verdictSummary.summary}</div>
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

        {/* v2.6.28: Show overall KEY FACTORS inside verdict box when no per-scope breakdown */}
        {contextAnswers.length === 0 && verdictSummary?.keyFactors?.length > 0 && (
          <div className={styles.keyFactorsSection}>
            <div className={styles.keyFactorsHeader}>KEY FACTORS</div>
            <div className={styles.keyFactorsList}>
              {verdictSummary.keyFactors.map((factor: any, i: number) => (
                <KeyFactorRow key={i} factor={factor} showContestation={true} />
              ))}
            </div>
          </div>
        )}
      </div>

        {contextAnswers.length > 0 && (
        <div className={styles.scopesAnalysis}>
          <h4 className={styles.scopesHeader} style={isUnreliableAverage ? { fontSize: '1.1rem', fontWeight: 700 } : undefined}>
            {isUnreliableAverage && '⭐ '}📑 {isUnreliableAverage ? 'Individual Context Verdicts (Primary)' : 'Contexts'}
          </h4>
          <div className={styles.scopesStack}>
            {contextAnswers.map((pa: any) => {
              const scopeId = pa.contextId ?? pa.proceedingId;
              const scope = scopes.find((s: any) => s.id === scopeId);
              const key = scopeId || pa.contextName || pa.proceedingName || scope?.id || "context";
              return <ScopeCard key={key} scopeAnswer={pa} scope={scope} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ScopeCard({ scopeAnswer, scope }: { scopeAnswer: any; scope: any }) {
  const scopeTruth = getVerdictTruthPercentage(scopeAnswer);
  const scopeConfidence = scopeAnswer?.confidence ?? 0;
  const scopeVerdict = percentageToClaimVerdict(scopeTruth, scopeConfidence);
  const color = CLAIM_VERDICT_COLORS[scopeVerdict] || CLAIM_VERDICT_COLORS["UNVERIFIED"];

  const factors = scopeAnswer.keyFactors || [];
  const positiveCount = factors.filter((f: any) => f.supports === "yes").length;
  const negativeCount = factors.filter((f: any) => f.supports === "no").length;
  const neutralCount = factors.filter((f: any) => f.supports === "neutral").length;
  // Only count as "contested" factors with actual counter-evidence (not mere opinions/doubts)
  const contestedCount = factors.filter((f: any) => 
    f.supports === "no" && 
    f.isContested && 
    (f.factualBasis === "established" || f.factualBasis === "disputed")
  ).length;

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
    <div className={styles.scopeCard} style={{ borderColor: color.border }}>
      <div className={styles.scopeCardHeader}>
        <div className={styles.scopeCardTitle}>
          {scope?.name || scopeAnswer.contextName || scopeAnswer.proceedingName}
        </div>
        {scope && (
          <div className={styles.scopeCardMeta}>
            {scope.court && <span>{scope.court} • </span>}
            {scope.date && <span>{scope.date}</span>}
            {scope.status && scope.status !== "unknown" && <span> • {scope.status}</span>}
          </div>
        )}
        {/* v2.6.39: Show assessed statement to clarify what is being evaluated in this context */}
        {scope?.assessedStatement && (
          <div className={styles.scopeAssessmentQuestion}>
            <span className={styles.scopeAssessmentLabel}>Assessed Statement:</span> {scope.assessedStatement}
          </div>
        )}
        {showAbout && (
          <div className={styles.scopeAboutInline}>
            {subject && (
              <span className={styles.scopeAboutItem}>
                <span className={styles.scopeAboutLabel}>Subject:</span> {subject}
              </span>
            )}
            {charges.length > 0 && (
              <span className={styles.scopeAboutItem}>
                <span className={styles.scopeAboutLabel}>Charges:</span> {charges.slice(0, 3).join("; ")}{charges.length > 3 ? "…" : ""}
              </span>
            )}
            {outcome && (
              <span className={styles.scopeAboutItem}>
                <span className={styles.scopeAboutLabel}>Outcome:</span> {outcome}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.scopeCardContent}>
        <div className={styles.scopeAnswerRow}>
          <span className={styles.scopeAnswerBadge} style={{ backgroundColor: color.bg, color: color.text }}>
            {color.icon} {getVerdictLabel(scopeVerdict)}
          </span>
          <span className={styles.scopePercentage}>{scopeTruth}% <span style={{ fontSize: 11, color: "#999" }}>({scopeAnswer.confidence}%  confidence)</span></span>
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
          <div className={styles.scopeShortAnswer}>
            <span className={styles.scopeAssessmentLabel}>Assessment:</span>{" "}
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
// Article Verdict Banner
// ============================================================================

function ArticleVerdictBanner({ articleAnalysis, verdictSummary, fallbackThesis, pseudoscienceAnalysis, fallbackConfidence }: { articleAnalysis: any; verdictSummary?: any; fallbackThesis?: string; pseudoscienceAnalysis?: any; fallbackConfidence?: number }) {
  // CRITICAL FIX: Use verdictSummary as fallback when articleAnalysis is missing
  // The verdictSummary contains the correct truth percentage from the analyzer
  const articleTruth = articleAnalysis 
    ? getArticleTruthPercentage(articleAnalysis) 
    : getVerdictTruthPercentage(verdictSummary);
  // v2.6.28: Use verdictSummary confidence as fallback when articleAnalysis confidence is missing
  // v2.6.31: Also check twoPanelSummary.factharborAnalysis.confidence via fallbackConfidence prop
  const articleConfidence = articleAnalysis?.confidence ?? articleAnalysis?.articleConfidence ?? verdictSummary?.confidence ?? fallbackConfidence ?? 0;
  const articleVerdictLabel = percentageToArticleVerdict(articleTruth, articleConfidence);
  const color = ARTICLE_VERDICT_COLORS[articleVerdictLabel] || ARTICLE_VERDICT_COLORS["UNVERIFIED"];

  const isPseudo = pseudoscienceAnalysis?.isPseudoscience || articleAnalysis?.isPseudoscience;
  const pseudoCategories = pseudoscienceAnalysis?.categories || articleAnalysis?.pseudoscienceCategories || [];

  const articlePct = articleTruth;

  // Get the verdict reason - try multiple sources (include summary as fallback)
  const verdictReason = articleAnalysis?.articleVerdictReason || articleAnalysis?.verdictExplanation || verdictSummary?.nuancedAnswer || verdictSummary?.summary || "";

  // Get short answer from verdictSummary as assessment
  // CRITICAL: Only use summary as fallback if it's different from verdictReason to avoid duplication
  const rawShortAnswer = verdictSummary?.shortAnswer || verdictSummary?.summary || "";
  const shortAnswer = rawShortAnswer === verdictReason ? "" : rawShortAnswer;

  // Get key factors - prefer articleAnalysis, fallback to verdictSummary
  const keyFactors = (articleAnalysis?.keyFactors && articleAnalysis.keyFactors.length > 0)
    ? articleAnalysis.keyFactors
    : (verdictSummary?.keyFactors || []);

  return (
    <div className={styles.articleBanner} style={{ borderColor: color.border }}>
      <div className={styles.articleBannerContent}>
        {/* v2.6.25: Unified verdict label */}
        <div className={styles.articleVerdictHeader}>
          <span className={styles.articleVerdictLabel} title="Overall verdict is assessed holistically. Claims average may differ due to evidence discovery and weighting.">VERDICT</span>
        </div>
        <div className={styles.articleVerdictRow}>
          <span className={styles.articleVerdictBadge} style={{ backgroundColor: color.bg, color: color.text }}>
            {color.icon} {getVerdictLabel(articleVerdictLabel)}
          </span>
          <span className={styles.articlePercentage}>
            {articlePct}% <span style={{ fontSize: 12, color: "#999" }}>({articleConfidence}% confidence)</span>
          </span>
          {isPseudo && (
            <span className={styles.pseudoscienceBadge}>
              🔬 Pseudoscience Detected
            </span>
          )}
        </div>

        {articleAnalysis?.claimsAverageTruthPercentage !== undefined && (
          <div
            className={styles.claimsAverageRow}
            title="Weighted average of direct claim verdicts (centrality × confidence); counter-claims are inverted; tangential claims are excluded."
          >
            <span
              className={styles.claimsAverageLabel}
              title="Weighted average of direct claim verdicts (centrality × confidence); counter-claims are inverted; tangential claims are excluded."
            >
              Claims average
            </span>
            <span className={styles.claimsAverageValue}>{articleAnalysis.claimsAverageTruthPercentage}%</span>
          </div>
        )}

        {/* Verdict Explanation */}
        {verdictReason && (
          <div className={styles.verdictReasonBox} style={{ borderLeftColor: color.border }}>
            {verdictReason}
          </div>
        )}

        {/* Short Answer / Assessment */}
        {shortAnswer && (
          <div className={styles.shortAnswerBox} style={{ borderLeftColor: color.border }}>
            <div className={styles.shortAnswerText}>{shortAnswer}</div>
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

        {/* v2.6.28: Key Factors - unified from articleAnalysis or verdictSummary */}
        {keyFactors.length > 0 && (
          <div className={styles.keyFactorsSection}>
            <div className={styles.keyFactorsHeader}>KEY FACTORS</div>
            <div className={styles.keyFactorsList}>
              {keyFactors.map((factor: any, i: number) => (
                <KeyFactorRow key={i} factor={factor} showContestation={true} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Input Summary Box
// ============================================================================

function ArticleSummaryBox({ articleSummary }: { articleSummary: any }) {
  if (!articleSummary?.mainArgument) return null;
  return (
    <div className={styles.articleSummaryBox}>
      <div className={styles.articleSummaryHeader}>
        <b>📄 Input Summary</b>
      </div>
      <div className={styles.articleSummaryContent}>
        <div className={styles.articleSummaryValue}>{decodeHtmlEntities(articleSummary.mainArgument)}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Collapsible Text Component
// ============================================================================

function CollapsibleText({
  text,
  maxLength = 200,
  label
}: {
  text: string;
  maxLength?: number;
  label?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > maxLength;

  const displayText = expanded || !needsTruncation
    ? text
    : text.slice(0, maxLength).trim() + "...";

  return (
    <span className={styles.collapsibleText}>
      {label && <span className={styles.collapsibleLabel}>{label}</span>}
      <span className={styles.collapsibleContent}>{displayText}</span>
      {needsTruncation && (
        <button
          className={styles.showMoreBtn}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </span>
  );
}

// ============================================================================
// Transformed Input Display
// ============================================================================

function TransformedInputBox({
  originalInput,
  transformedInput
}: {
  originalInput: string;
  transformedInput: string;
}) {
  // Only show if transformation is meaningfully different from original
  const normalizedOriginal = originalInput.trim().toLowerCase().replace(/[?!.]+$/, "");
  const normalizedTransformed = transformedInput.trim().toLowerCase().replace(/[?!.]+$/, "");
  const isTransformed = normalizedOriginal !== normalizedTransformed;

  if (!isTransformed || !transformedInput) return null;

  return (
    <div className={styles.transformedInputBox}>
      <div className={styles.transformedInputHeader}>
        <b>🔄 Analyzed As</b>
        <span className={styles.transformedInputHint}>
          (normalized for consistent analysis)
        </span>
      </div>
      <div className={styles.transformedInputContent}>
        <CollapsibleText text={transformedInput} maxLength={250} />
      </div>
    </div>
  );
}

// ============================================================================
// Two-Panel Summary
// ============================================================================

function TwoPanelSummary({ articleSummary, factharborAnalysis }: { articleSummary: any; factharborAnalysis: any }) {
  const overallTruth = typeof factharborAnalysis?.overallVerdict === "number"
    ? factharborAnalysis.overallVerdict
    : 50;
  const overallConfidence = factharborAnalysis?.confidence ?? 0;
  const overallLabel = percentageToClaimVerdict(overallTruth, overallConfidence);
  return (
    <div className={styles.twoPanelContainer}>
      <div className={styles.twoPanelPanel}>
        <div className={styles.twoPanelHeader}>
          <b>📄 Input</b>
        </div>
        <div className={styles.twoPanelContent}>
          <div className={styles.twoPanelLabel}>Title</div>
          <div className={styles.twoPanelValue}>{decodeHtmlEntities(articleSummary.title)}</div>
          <div className={styles.twoPanelLabel}>Main Thesis</div>
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

function ClaimCard({ claim, showCrossScope = false }: { claim: any; showCrossScope?: boolean }) {
  const claimTruth = getClaimTruthPercentage(claim);
  const claimConfidence = claim?.confidence ?? 0;
  const claimVerdictLabel = percentageToClaimVerdict(claimTruth, claimConfidence);
  const color = CLAIM_VERDICT_COLORS[claimVerdictLabel] || CLAIM_VERDICT_COLORS["UNVERIFIED"];

  // Only show CONTESTED label when opposition has actual counter-evidence
  const hasEvidenceBasedContestation = claim.isContested &&
    (claim.factualBasis === "established" || claim.factualBasis === "disputed");

  const isTangential = claim.thesisRelevance === "tangential";

  return (
    <div className={`${styles.claimCard} ${hasEvidenceBasedContestation ? styles.claimCardContested : ""} ${isTangential ? styles.claimCardTangential : ""}`} style={{ borderLeftColor: isTangential ? "#9e9e9e" : color.border }}>
      <div className={styles.claimCardHeader}>
        <span className={styles.claimId}>{claim.claimId}</span>
        {claim.isCentral && <Badge bg="#e8f4fd" color="#0056b3">🔑 Central</Badge>}
        {claim.harmPotential === "high" && <Badge bg="#ffebee" color="#c62828">⚠️ High Harm</Badge>}
        {isTangential && <Badge bg="#f5f5f5" color="#616161">📎 Tangential</Badge>}
        {claim.isCounterClaim && <Badge bg="#fff3e0" color="#e65100">↔️ Counter</Badge>}
        <Badge bg={color.bg} color={color.text}>
          {color.icon} {getVerdictLabel(claimVerdictLabel)} {claimTruth}% ({claim.confidence}% confidence)
        </Badge>
        {isTangential && (
          <Badge bg="#eeeeee" color="#757575">Not in verdict</Badge>
        )}
        {hasEvidenceBasedContestation && (
          <Badge bg="#fce4ec" color="#c2185b">⚠️ CONTESTED</Badge>
        )}
        {showCrossScope && (
          <Badge bg="#eef2ff" color="#1e3a8a">Cross-scope</Badge>
        )}
        {claim.isPseudoscience && (
          <Badge bg="#ffebee" color="#c62828">🔬 Pseudoscience</Badge>
        )}
      </div>
      <div className={styles.claimLabel}>Claim Being Evaluated:</div>
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

// ============================================================================
// Dynamic Result Viewer - NEW v2.6.35
// ============================================================================

function DynamicResultViewer({ result }: { result: any }) {
  const citationsCount = result.citations?.length || 0;
  // Estimate sentence count from summary (dynamic pipeline uses summary, not narrativeMarkdown)
  const narrativeText = result.summary || result.narrativeMarkdown || "";
  const sentencesCount = narrativeText.split(/[.!?]+/).filter(Boolean).length || 1;
  // Normalize grounding to 0-100%: 1+ citation per sentence = 100%, scale linearly below
  const groundingRatio = citationsCount / sentencesCount;
  const groundingPercent = Math.min(100, Math.round(groundingRatio * 100));
  const groundingQuality = groundingPercent >= 75 ? "good" : groundingPercent >= 40 ? "moderate" : "low";
  const groundingLabel = groundingPercent >= 75 ? "Well Sourced" : groundingPercent >= 40 ? "Partially Sourced" : "Limited Sources";

  return (
    <div className={styles.dynamicViewer}>
      <div className={styles.groundingScoreBadge} data-quality={groundingQuality}>
        📊 Source Coverage: <strong>{groundingPercent}%</strong> ({groundingLabel})
        <span className={styles.groundingTooltip} title={`${citationsCount} citations for ${sentencesCount} statements. Measures how well claims are backed by sources (separate from truth verdict).`}> ℹ️</span>
      </div>

      {/* Verdict display */}
      {result.verdict && (
        <div className={styles.dynamicVerdict}>
          <div className={styles.verdictLabel}>
            {result.verdict.label}
            {result.verdict.score !== undefined && (
              <strong style={{ marginLeft: 8 }}>{result.verdict.score}%</strong>
            )}
          </div>
          {result.verdict.confidence !== undefined && (
            <div className={styles.verdictConfidence}>Confidence: {result.verdict.confidence}%</div>
          )}
          {result.verdict.reasoning && (
            <div className={styles.verdictReasoning}>{result.verdict.reasoning}</div>
          )}
        </div>
      )}

      {/* Summary */}
      {result.summary && (
        <div className={styles.narrativeSection}>
          <h3 className={styles.sectionTitle}>📝 Summary</h3>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {result.summary}
          </ReactMarkdown>
        </div>
      )}

      {/* Findings */}
      {result.findings && result.findings.length > 0 && (
        <div className={styles.findingsSection}>
          <h3 className={styles.sectionTitle}>🔍 Key Findings</h3>
          <div className={styles.findingsList}>
            {result.findings.map((f: any, i: number) => (
              <div key={i} className={styles.findingItem} data-support={f.support}>
                <span className={styles.findingSupport}>
                  {f.support === "strong" ? "🟢" : f.support === "moderate" ? "🟡" : f.support === "weak" ? "🟠" : "🔴"}
                </span>
                <span className={styles.findingPoint}>{f.point}</span>
                {f.notes && <span className={styles.findingNotes}> — {f.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Limitations */}
      {result.limitations && result.limitations.length > 0 && (
        <div className={styles.limitationsSection}>
          <h3 className={styles.sectionTitle}>⚠️ Limitations</h3>
          <ul className={styles.limitationsList}>
            {result.limitations.map((l: string, i: number) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Citations */}
      {result.citations && result.citations.length > 0 && (
        <div className={styles.citationsSection}>
          <h3 className={styles.sectionTitle}>📚 Citations & Evidence ({citationsCount})</h3>
          <div className={styles.citationsList}>
            {result.citations.map((c: any, i: number) => (
              <div key={i} className={styles.citationItem}>
                <div className={styles.citationExcerpt}>"{c.excerpt}"</div>
                <div className={styles.citationMeta}>
                  {c.title && <span className={styles.citationTitle}>{c.title} — </span>}
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className={styles.citationUrl}>
                    {c.url}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
