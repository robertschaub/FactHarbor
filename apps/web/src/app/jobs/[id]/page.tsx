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

import { useCallback, useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { classifyEvent, formatLocalTime, PHASE_LABELS, type EventPhase } from "./lib/event-display";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  percentageToArticleVerdict,
  percentageToClaimVerdict,
  isFalseBand,
  getConfidenceTierLabel,
  formatVerdictText,
} from "@/lib/analyzer/truth-scale";
import styles from "./page.module.css";
import { BoundaryFindings } from "./components/BoundaryFindings";
import { ExpandableText, TextModal } from "./components/ExpandableText";
import { EvidenceScopeTooltip } from "./components/EvidenceScopeTooltip";
import { MethodologySubGroup } from "./components/MethodologySubGroup";
import { BackgroundBanner } from "./components/BackgroundBanner";
import { InputBanner } from "./components/InputBanner";
import { groupEvidenceByMethodology } from "./utils/methodologyGrouping";
import { generateHtmlReport } from "./utils/generateHtmlReport";
import { PromptViewer } from "./components/PromptViewer";
import { ConfigViewer } from "./components/ConfigViewer";
import { buildErrorId } from "@/lib/error-id";
import { SystemHealthBanner } from "@/components/SystemHealthBanner";
import QualityGatesPanel from "@/components/QualityGatesPanel";
import { CoverageMatrixDisplay } from "./components/CoverageMatrix";
import { VerdictNarrativeDisplay } from "./components/VerdictNarrative";
import narrativeStyles from "./components/VerdictNarrative.module.css";
import { scoreToFactualRating } from "../../../lib/source-reliability-config";
import { JsonTreeView } from "./components/JsonTreeView";
import { CopyButton } from "@/components/CopyButton";
import { collectUsedModels, formatUsedModels } from "@/lib/model-usage";
import FallbackReport from "@/components/FallbackReport";
import {
  classifyWarningForDisplay,
} from "@/lib/analyzer/warning-display";
import { useReportNavigation } from "./hooks/useReportNavigation";
import type { AnalysisWarning, TIGERScore } from "@/lib/analyzer/types";
import { resolveEvidenceSourceLabel } from "@/lib/evidence-source-label";
import {
  getBoundaryDescriptionSegments,
  getBoundaryDisplayHeadline,
  getBoundaryDisplaySubtitle,
  getBoundaryNameSegments,
} from "@/lib/claim-boundary-display";

// Module-level helper — browser-safe (client component, only called from event handlers)
function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

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
  isHidden?: boolean;
};

type EventItem = { id: number; tsUtc: string; level: string; message: string };

// ============================================================================
// 7-POINT TRUTH SCALE - Color & Display System
// ============================================================================

/**
 * Colors for 7-level claim verdicts
 */
const CLAIM_VERDICT_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  // Positive (True side) — ColorBrewer Greens: #e5f5e0 / #a1d99b / #31a354
  "TRUE":         { bg: "#31a354", text: "#ffffff", border: "#278a45", icon: "✅" },
  "MOSTLY-TRUE":  { bg: "#a1d99b", text: "#1a5c2a", border: "#82c47a", icon: "✓" },
  "LEANING-TRUE": { bg: "#e5f5e0", text: "#1a5c2a", border: "#c0e0b8", icon: "◐" },
  // Neutral
  "MIXED":        { bg: "#e3f2fd", text: "#1565c0", border: "#2196f3", icon: "⚖" },
  "UNVERIFIED":   { bg: "#fff3e0", text: "#e65100", border: "#ff9800", icon: "?" },
  // Negative (False side) — ColorBrewer Reds: #fee0d2 / #fc9272 / #de2d26
  "LEANING-FALSE": { bg: "#fee0d2", text: "#7f1d1d", border: "#f0c0b0", icon: "◔" },
  "MOSTLY-FALSE":  { bg: "#fc9272", text: "#7f1d1d", border: "#e07858", icon: "✗" },
  "FALSE":         { bg: "#de2d26", text: "#ffffff", border: "#b8241f", icon: "❌" },
};

/**
 * Colors for 7-level question answers
 */
const QUESTION_ANSWER_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  // Positive (Yes side) — ColorBrewer Greens: #e5f5e0 / #a1d99b / #31a354
  "YES":         { bg: "#31a354", text: "#ffffff", border: "#278a45", icon: "✅" },
  "MOSTLY-YES":  { bg: "#a1d99b", text: "#1a5c2a", border: "#82c47a", icon: "✓" },
  "LEANING-YES": { bg: "#e5f5e0", text: "#1a5c2a", border: "#c0e0b8", icon: "↗" },
  // Neutral
  "MIXED":       { bg: "#e3f2fd", text: "#1565c0", border: "#2196f3", icon: "⚖" },
  "UNVERIFIED":  { bg: "#fff3e0", text: "#e65100", border: "#ff9800", icon: "?" },
  // Negative (No side) — ColorBrewer Reds: #fee0d2 / #fc9272 / #de2d26
  "LEANING-NO":  { bg: "#fee0d2", text: "#7f1d1d", border: "#f0c0b0", icon: "↘" },
  "MOSTLY-NO":   { bg: "#fc9272", text: "#7f1d1d", border: "#e07858", icon: "✗" },
  "NO":          { bg: "#de2d26", text: "#ffffff", border: "#b8241f", icon: "❌" },
};

/**
 * Colors for article-level verdicts
 */
const ARTICLE_VERDICT_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  // Positive
  "TRUE": { bg: "#dcfce7", text: "#166534", border: "#86efac", icon: "✅" },
  "MOSTLY-TRUE": { bg: "#dcfce7", text: "#166534", border: "#86efac", icon: "✓" },
  "LEANING-TRUE": { bg: "#dcfce7", text: "#166534", border: "#86efac", icon: "◐" },
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

const DETAIL_POLL_INTERVAL_MS = 10_000;
const DETAIL_RATE_LIMIT_BACKOFF_MS = 60_000;

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
    "MIXED": "Mixed",
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
    "MIXED": "Mixed",
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
  if (status === "INTERRUPTED") return styles.statusFailed;
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

function getDisplayRange(
  range: { min: number; max: number } | undefined,
  verdictLabel: string,
): { min: number; max: number } | null {
  if (!range) return null;
  if (isFalseBand(verdictLabel)) {
    return { min: 100 - range.max, max: 100 - range.min };
  }
  return { min: range.min, max: range.max };
}

function hexLuminance(hex: string): number {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return 1;
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const toLinear = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getVerdictAccentColor(
  verdictLabel: string,
  fallback: { bg: string; text: string; border: string },
): string {
  const uiPalette = CLAIM_VERDICT_COLORS[verdictLabel] || QUESTION_ANSWER_COLORS[verdictLabel] || fallback;

  if (hexLuminance(uiPalette.bg) < 0.5) {
    return uiPalette.bg;
  }
  if (hexLuminance(uiPalette.border) < 0.62) {
    return uiPalette.border;
  }
  return uiPalette.text;
}

function getVerdictUiPalette(
  verdictLabel: string,
  fallback: { bg: string; text: string; border: string },
): { bg: string; text: string; border: string } {
  return CLAIM_VERDICT_COLORS[verdictLabel] || QUESTION_ANSWER_COLORS[verdictLabel] || fallback;
}

function VerdictMeter({
  percentage,
  range,
  fillColor,
  showValue = true,
}: {
  percentage: number;
  range?: { min: number; max: number } | null;
  fillColor: string;
  showValue?: boolean;
}) {
  return (
    <div className={styles.verdictMeterRow}>
      {showValue ? <span className={styles.verdictMeterLabel}>{percentage}%</span> : null}
      <div className={styles.verdictMeterBar} aria-hidden="true">
        <div
          className={styles.verdictMeterFill}
          style={{ width: `${percentage}%`, backgroundColor: fillColor }}
        />
      </div>
      {range && (
        <span className={styles.verdictRange}>
          ({range.min}% - {range.max}%)
        </span>
      )}
    </div>
  );
}

function VerdictMetricBlock({
  label,
  value,
  percentage,
  fillColor,
  range,
  helperText,
}: {
  label: string;
  value: string;
  percentage: number;
  fillColor: string;
  range?: { min: number; max: number } | null;
  helperText?: string;
}) {
  return (
    <div className={styles.verdictMetricBlock}>
      <div className={styles.verdictMetricTitle}>{label}</div>
      <div className={styles.verdictMetricValue}>{value}</div>
      <div className={styles.verdictMetricHelper}>{helperText || "\u00A0"}</div>
      <VerdictMeter percentage={percentage} range={range} fillColor={fillColor} showValue={false} />
    </div>
  );
}

// ============================================================================
// Analysis Timeline — structured display of job events
// ============================================================================

interface PhaseGroup {
  phase: EventPhase;
  entries: Array<{ event: EventItem; label: string; params?: string; effectiveLevel: string }>;
  warnCount: number;
  errorCount: number;
}

function buildPhaseGroups(events: EventItem[]): {
  groups: PhaseGroup[];
  errorEvents: Array<{ event: EventItem; stackTrace?: EventItem }>;
  lifecycleEvents: Array<{ event: EventItem; label: string; params?: string }>;
} {
  const groups: PhaseGroup[] = [];
  const errorEvents: Array<{ event: EventItem; stackTrace?: EventItem }> = [];
  const lifecycleEvents: Array<{ event: EventItem; label: string; params?: string }> = [];
  let currentGroup: PhaseGroup | null = null;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const d = classifyEvent(e.level, e.message);
    // Use overrideLevel when the classifier knows better than the raw event level
    // (e.g. a fully-recovered fallback arrives as "warn" but should display as "info")
    const effectiveLevel = d.overrideLevel ?? e.level.toLowerCase();

    if (d.isStackTrace) {
      // Attach to the last error card
      if (errorEvents.length > 0) errorEvents[errorEvents.length - 1].stackTrace = e;
      continue;
    }

    if (d.phase === "error") {
      errorEvents.push({ event: e });
      continue;
    }

    if (d.phase === "lifecycle") {
      lifecycleEvents.push({ event: e, label: d.label, params: d.params });
      continue;
    }

    // Group consecutive same-phase events
    if (!currentGroup || currentGroup.phase !== d.phase) {
      currentGroup = { phase: d.phase, entries: [], warnCount: 0, errorCount: 0 };
      groups.push(currentGroup);
    }

    currentGroup.entries.push({ event: e, label: d.label, params: d.params, effectiveLevel });
    if (effectiveLevel === "warn") currentGroup.warnCount++;
  }

  return { groups, errorEvents, lifecycleEvents };
}

const PHASE_ICONS: Record<EventPhase, string> = {
  setup:      "⚙️",
  understand: "🔍",
  research:   "📡",
  cluster:    "🗂️",
  verdict:    "⚖️",
  quality:    "✅",
  done:       "🏁",
  lifecycle:  "📌",
  error:      "❌",
  misc:       "•",
};

function PhaseTimeline({ events }: { events: EventItem[] }) {
  const [expandAll, setExpandAll] = useState<boolean | null>(null);

  if (events.length === 0) {
    return <p className={styles.tlEmpty}>No events yet.</p>;
  }

  const { groups, errorEvents, lifecycleEvents } = buildPhaseGroups(events);
  const lastGroupIdx = groups.length - 1;

  return (
    <div className={styles.timeline}>
      {/* Expand / Collapse all toggle */}
      {groups.length > 1 && (
        <div className={styles.tlExpandBar}>
          <button
            className={styles.tlExpandBtn}
            onClick={() => setExpandAll(prev => prev === true ? false : true)}
          >
            {expandAll === true ? "Collapse all" : "Expand all"}
          </button>
        </div>
      )}

      {/* Always-visible error cards */}
      {errorEvents.map(({ event, stackTrace }) => (
        <div key={event.id} className={styles.errorCard}>
          <div className={styles.errorCardTitle}>
            ❌ {classifyEvent(event.level, event.message).label}
            <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 11, color: "var(--text-muted)" }}>
              {formatLocalTime(event.tsUtc)}
            </span>
          </div>
          <div className={styles.errorCardMessage}>{event.message.slice(0, 200)}</div>
          {stackTrace && (
            <details className={styles.stackTraceDetails}>
              <summary className={styles.stackTraceSummary}>Stack trace</summary>
              <pre className={styles.stackTraceBody}>{stackTrace.message.replace(/^Stack \(truncated\):\n?/, "")}</pre>
            </details>
          )}
        </div>
      ))}

      {/* Phase groups */}
      {groups.map((group, idx) => {
        const isLast = idx === lastGroupIdx;
        const icon = PHASE_ICONS[group.phase] ?? "•";
        const label = PHASE_LABELS[group.phase];
        // expandAll overrides default open state; null = default (last group open)
        const isOpen = expandAll !== null ? expandAll : isLast;
        return (
          <details
            key={`${group.phase}-${idx}-${expandAll}`}
            className={styles.phaseGroup}
            open={isOpen}
            onToggle={() => setExpandAll(null)}
          >
            <summary className={styles.phaseSummary}>
              <span className={styles.phaseIcon}>{icon}</span>
              <span className={styles.phaseLabel}>{label}</span>
              {(group.warnCount > 0 || group.errorCount > 0) && (
                <span className={styles.phaseBadges}>
                  {group.warnCount > 0 && (
                    <span className={`${styles.phaseBadge} ${styles.phaseBadgeWarn}`}>⚠ {group.warnCount}</span>
                  )}
                  {group.errorCount > 0 && (
                    <span className={`${styles.phaseBadge} ${styles.phaseBadgeError}`}>✕ {group.errorCount}</span>
                  )}
                </span>
              )}
              <span className={styles.phaseChevron}>{isOpen ? "▾" : "▸"}</span>
            </summary>
            <div className={styles.phaseEvents}>
              {group.entries.map(({ event, label: evLabel, params, effectiveLevel }) => {
                const isWarn = effectiveLevel === "warn";
                const rowClass = [styles.tlEvent, isWarn ? styles.tlWarn : ""].filter(Boolean).join(" ");
                const labelClass = [styles.tlLabel, isWarn ? styles.tlLabelWarn : ""].filter(Boolean).join(" ");
                return (
                  <div key={event.id} className={rowClass}>
                    <span className={styles.tlTimestamp}>{formatLocalTime(event.tsUtc)}</span>
                    <div>
                      <div className={labelClass}>{isWarn ? "⚠ " : ""}{evLabel}</div>
                      {params && <div className={styles.tlParams}>{params}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}

      {/* Lifecycle events */}
      {lifecycleEvents.length > 0 && (
        <div className={styles.lifecycleSection}>
          <div className={styles.lifecycleTitle}>Lifecycle</div>
          {lifecycleEvents.map(({ event, label, params }) => (
            <div key={event.id} className={styles.tlEvent}>
              <span className={styles.tlTimestamp}>{formatLocalTime(event.tsUtc)}</span>
              <div>
                <div className={styles.tlLabel}>{label}</div>
                {params && <div className={styles.tlParams}>{params}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportSection({
  title,
  tooltip,
  children,
  className = "",
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  tooltip?: ReactNode;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const tooltipRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!tooltip) return;
    function handleOutsideClick(e: MouseEvent) {
      if (tooltipRef.current?.open && !tooltipRef.current.contains(e.target as Node)) {
        tooltipRef.current.open = false;
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [tooltip]);

  const classes = className ? `${styles.reportSection} ${className}` : styles.reportSection;
  if (collapsible) {
    return (
      <details className={classes} open={defaultOpen}>
        <summary className={styles.reportSectionToggle}>
          <h2 className={styles.reportSectionTitle}>{title}</h2>
        </summary>
        <div className={styles.reportSectionBody}>
          {children}
        </div>
      </details>
    );
  }
  return (
    <section className={classes}>
      <div className={styles.reportSectionHeader}>
        <div className={styles.reportSectionTitleRow}>
          <h2 className={styles.reportSectionTitle}>{title}</h2>
          {tooltip && (
            <details ref={tooltipRef} className={styles.infoTooltip}>
              <summary className={styles.infoTrigger}>ⓘ</summary>
              <div className={styles.infoPanel}>{tooltip}</div>
            </details>
          )}
        </div>
      </div>
      <div className={styles.reportSectionBody}>
        {children}
      </div>
    </section>
  );
}

export default function JobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tab, setTab] = useState<"report" | "json" | "events">("report");
  const initialTabSet = useRef(false);
  const [showTechnicalNotes, setShowTechnicalNotes] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState(false);
  const [pollIntervalMs, setPollIntervalMs] = useState<number | null>(DETAIL_POLL_INTERVAL_MS);
  const [isVisible, setIsVisible] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDetailsElement>(null);
  const metaMenuRef = useRef<HTMLDetailsElement>(null);
  const { navigateTo: rawNavigateTo, goBack, canGoBack, clearHistory } = useReportNavigation(tab, setTab);

  // Job action states
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingHide, setIsTogglingHide] = useState(false);
  const [hasAdminKey, setHasAdminKey] = useState(false);

  // Login-modal state (shown when cancel is attempted without an admin key)
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginKeyInput, setLoginKeyInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);

  // Check for admin key on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = sessionStorage.getItem("fh_admin_key");
      setHasAdminKey(!!key);
    }
  }, []);

  // Auto-select Events tab when job is still running on first load,
  // and switch to Report when it completes (if user hasn't navigated away).
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!job) return;
    if (!initialTabSet.current) {
      initialTabSet.current = true;
      if (job.status === "RUNNING" || job.status === "QUEUED") {
        setTab("events");
      }
    }
    // Auto-switch from events to report when job finishes
    if (prevStatusRef.current === "RUNNING" && job.status === "SUCCEEDED") {
      setTab((current) => current === "events" ? "report" : current);
    }
    prevStatusRef.current = job.status;
  }, [job]);

  // Pause polling/SSE when tab is hidden to reduce read pressure and background load.
  useEffect(() => {
    const onVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Performs the actual cancel fetch (called both from handleCancel and after successful login)
  const doCancelWithKey = async (adminKey: string) => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/fh/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: { "X-Admin-Key": adminKey },
      });

      if (res.status === 401) {
        // Stored key is stale — clear it and ask the user to log in again
        sessionStorage.removeItem("fh_admin_key");
        setHasAdminKey(false);
        setShowLoginModal(true);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      toast.success("Job cancelled successfully");
    } catch (err: any) {
      toast.error(`Cancel failed: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  // Cancel job handler — opens login modal if no admin key is stored
  const handleCancel = async () => {
    if (!window.confirm("Cancel this analysis job?")) return;

    const adminKey = sessionStorage.getItem("fh_admin_key");
    if (!adminKey) {
      setShowLoginModal(true);
      return;
    }

    await doCancelWithKey(adminKey);
  };

  // Login-modal submit: verify key, store it, then proceed with the cancel
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsVerifyingKey(true);
    try {
      const key = loginKeyInput.trim();
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
      });
      if (!res.ok) {
        setLoginError("Invalid admin key");
        return;
      }
      sessionStorage.setItem("fh_admin_key", key);
      setHasAdminKey(true);
      setShowLoginModal(false);
      setLoginKeyInput("");
      await doCancelWithKey(key);
    } catch {
      setLoginError("Failed to verify key");
    } finally {
      setIsVerifyingKey(false);
    }
  };

  // Delete job handler
  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this job? This cannot be undone.")) return;

    setIsDeleting(true);
    try {
      const adminKey = sessionStorage.getItem("fh_admin_key");
      const res = await fetch(`/api/fh/jobs/${jobId}/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey || "",
        },
      });

      if (res.status === 401) {
        toast.error("Unauthorized: Invalid admin key");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      toast.success("Report deleted successfully");
      // Redirect to jobs list after 1 second
      setTimeout(() => router.push("/jobs"), 1000);
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Hide / unhide report handler (admin only)
  const handleToggleHide = async () => {
    const adminKey = sessionStorage.getItem("fh_admin_key");
    if (!adminKey) return;
    const isCurrentlyHidden = !!job?.isHidden;
    const action = isCurrentlyHidden ? "unhide" : "hide";
    if (!isCurrentlyHidden && !window.confirm("Hide this report? It will no longer be visible to regular users.")) return;
    setIsTogglingHide(true);
    try {
      const res = await fetch(`/api/fh/jobs/${jobId}/${action}`, {
        method: "POST",
        headers: { "X-Admin-Key": adminKey },
      });
      const data = await res.json().catch(() => null) as null | {
        error?: unknown;
        isHidden?: unknown;
      };
      if (!res.ok) {
        const message = typeof data?.error === "string" ? data.error : `HTTP ${res.status}`;
        throw new Error(message);
      }
      const nextIsHidden =
        typeof data?.isHidden === "boolean"
          ? data.isHidden
          : !isCurrentlyHidden;
      setJob((prev) => (prev ? { ...prev, isHidden: nextIsHidden } : prev));
      toast.success(isCurrentlyHidden ? "Report is now visible" : "Report hidden from users");
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setIsTogglingHide(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    const isMaintErr = (msg: string) =>
      /\b50[23]\b|NetworkError|Failed to fetch|ECONNREFUSED/.test(msg);

    const load = async () => {
      const res = await fetch(`/api/fh/jobs/${jobId}`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 429) {
          let message = `Rate limit reached. Retrying automatically in ${Math.round(DETAIL_RATE_LIMIT_BACKOFF_MS / 1000)} seconds.`;
          try {
            const payload = await res.json();
            if (payload?.error && typeof payload.error === "string") {
              message = payload.error;
            }
          } catch {
            // Keep fallback message when payload is not JSON.
          }
          if (alive) {
            setErr(message);
            setMaintenance(false);
            setPollIntervalMs(DETAIL_RATE_LIMIT_BACKOFF_MS);
          }
          return; // Keep existing data visible
        }
        if (res.status === 502 || res.status === 503) {
          setMaintenance(true);
          return; // Keep existing job data visible
        }
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      const data = (await res.json()) as Job;
      if (alive) {
        setJob(data);
        setMaintenance(false);
        setErr(null);
        const isTerminal = ["SUCCEEDED", "FAILED", "CANCELLED", "INTERRUPTED"].includes(data.status);
        setPollIntervalMs(isTerminal ? null : DETAIL_POLL_INTERVAL_MS);
      }
    };

    if (isVisible) {
      load().catch((e: any) => {
        const msg = e?.message ?? String(e);
        if (isMaintErr(msg)) { setMaintenance(true); } else { setErr(msg); }
      });
    }

    if (pollIntervalMs === null) return () => { alive = false; };
    const id = setInterval(() => {
      if (document.hidden) return;
      load().catch((e: any) => {
        const msg = e?.message ?? String(e);
        if (isMaintErr(msg)) {
          setMaintenance(true);
        } else {
          setErr(msg);
        }
      });
    }, pollIntervalMs);
    return () => { alive = false; clearInterval(id); };
  }, [jobId, pollIntervalMs, isVisible]);

  useEffect(() => {
    if (!jobId || !isVisible) return;
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
  }, [jobId, isVisible]);

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
  const hasV22Data = schemaVersion.startsWith("2.") || schemaVersion.startsWith("3.");
  const twoPanelSummary = result?.twoPanelSummary;
  const articleAnalysis = result?.articleAnalysis;
  const claimVerdicts = result?.claimVerdicts || [];
  const verdictSummary = result?.verdictSummary;
  const classificationFallbacks = result?.classificationFallbacks;
  const allAnalysisWarnings: AnalysisWarning[] = Array.isArray(result?.analysisWarnings)
    ? result.analysisWarnings
    : [];
  const warningDiagnostics = allAnalysisWarnings.map((warning) => {
    const classification = classifyWarningForDisplay(warning);
    const bucket = classification.isProviderIssue
      ? (classification.isReportDegrading ? "provider_degrading" : "provider_informational")
      : (classification.isReportDegrading ? "analysis_degrading" : "analysis_informational");
    return {
      type: warning.type,
      bucket,
      originalSeverity: warning.severity,
      displaySeverity: classification.displaySeverity,
      message: warning.message,
    };
  });
  const showWarningDiagnostics =
    hasAdminKey &&
    process.env.NODE_ENV !== "production" &&
    warningDiagnostics.length > 0;
  const qualityGates = result?.qualityGates;  // P1: Quality gates for UI
  const qualityExpanded = warningDiagnostics.some((diag) => diag.displaySeverity === "error") || qualityGates?.passed === false;
  const fallbackReportPanel = (
    <FallbackReport
      summary={classificationFallbacks}
      analysisWarnings={allAnalysisWarnings}
      isAdmin={hasAdminKey}
    />
  );
  const warningDiagnosticsPanel = showWarningDiagnostics ? (
    <details className={styles.devWarningPanel}>
      <summary className={styles.devWarningSummary}>
        Developer diagnostics ({warningDiagnostics.length})
      </summary>
      <div className={styles.devWarningHint}>
        Development-only view of warning bucketing and display severity normalization.
      </div>
      <ul className={styles.devWarningList}>
        {warningDiagnostics.map((diag, idx) => (
          <li key={`wd-${idx}`} className={styles.devWarningItem}>
            <code className={styles.devWarningType}>{diag.type}</code>
            <span className={styles.devWarningMeta}>
              bucket: <code>{diag.bucket}</code> | original: <code>{diag.originalSeverity}</code> | shown: <code>{diag.displaySeverity}</code>
            </span>
            <div className={styles.devWarningMessage}>{diag.message}</div>
          </li>
        ))}
      </ul>
    </details>
  ) : null;
  const qualityGatesPanel = (
    <QualityGatesPanel qualityGates={qualityGates} collapsed={!qualityExpanded} />
  );
  const hasQualitySectionContent =
    Boolean(qualityGates) ||
    Boolean(hasAdminKey) ||
    Boolean(classificationFallbacks?.totalFallbacks) ||
    allAnalysisWarnings.length > 0;
  const hasMultipleContexts =
    result?.meta?.hasMultipleContexts ?? articleAnalysis?.hasMultipleContexts ?? false;
  // LEGACY: analysisContexts fallback for old orchestrated pipeline schemas (backward compatibility)
  const contexts = result?.analysisContexts || [];
  const backgroundDetails = result?.understanding?.backgroundDetails || result?.rawJson?.backgroundDetails;
  const impliedClaim: string = (result?.understanding?.impliedClaim || "").trim();
  const atomicClaimsForDisplay: any[] = result?.understanding?.atomicClaims || [];
  const hasContestedFactors = result?.meta?.hasContestedFactors;
  const searchQueries = result?.searchQueries || [];
  const researchStats = result?.researchStats;
  const evidenceItems = result?.evidenceItems || [];

  // Wrap navigateTo to resolve BF_ (boundary) refs to first evidence item for that boundary.
  // Skips items not currently in the DOM (e.g. inside a collapsed MethodologySubGroup).
  // scrollToAndHighlight will open any closed <details> ancestors automatically.
  const navigateTo = useCallback((refId: string) => {
    if (refId.startsWith("BF_")) {
      const bId = refId.slice(3);
      const ev = evidenceItems
        .filter((e: any) => e.claimBoundaryId === bId && e.id)
        .find((e: any) => document.getElementById(`nav-ev-${e.id}`));
      if (ev?.id) { rawNavigateTo(ev.id); return; }
    }
    rawNavigateTo(refId);
  }, [rawNavigateTo, evidenceItems]);

  // ClaimAssessmentBoundary schema detection (Phase 3)
  const isCBSchema = (typeof result?._schemaVersion === "string" && result._schemaVersion.endsWith("-cb")) ||
                     (typeof result?.meta?.schemaVersion === "string" && result.meta.schemaVersion.endsWith("-cb")) ||
                     result?.meta?.pipeline === "claimboundary";
  const claimBoundaries = result?.claimBoundaries || [];
  const atomicClaimTextById = useMemo(() => {
    const map = new Map<string, string>();
    for (const atomicClaim of atomicClaimsForDisplay) {
      const id = String(atomicClaim?.id || "").trim();
      const statement = String(atomicClaim?.statement || atomicClaim?.text || "").trim();
      if (id && statement) map.set(id, statement);
    }
    return map;
  }, [atomicClaimsForDisplay]);
  const boundaryFindingMap = useMemo(() => {
    const map = new Map<string, Array<any>>();
    for (const claimVerdict of claimVerdicts) {
      for (const finding of claimVerdict?.boundaryFindings || []) {
        const list = map.get(finding.boundaryId) || [];
        const claimId = claimVerdict.claimId;
        const claimText =
          claimVerdict?.claim?.statement ||
          claimVerdict?.claim?.text ||
          claimVerdict?.claimText ||
          (claimId ? atomicClaimTextById.get(claimId) : undefined) ||
          "";
        list.push({
          ...finding,
          claimId,
          claimText,
        });
        map.set(finding.boundaryId, list);
      }
    }
    return map;
  }, [claimVerdicts, atomicClaimTextById]);

  // Pipeline: preserve what the job requested, but prefer the pipeline that actually executed.
  // This avoids schema/UI mismatches when monolithic pipelines fall back to claimboundary.
  const requestedPipelineVariant =
    job?.pipelineVariant ||
    result?.meta?.pipelineVariantRequested ||
    result?.meta?.pipelineVariant ||
    "claimboundary";
  const pipelineFallback = !!result?.meta?.pipelineFallback;
  const fallbackReason: string | undefined = result?.meta?.fallbackReason || undefined;
  const executedPipelineVariant = pipelineFallback
    ? "claimboundary"
    : (result?.meta?.pipelineVariant || requestedPipelineVariant);
  const pipelineVariant = executedPipelineVariant;

  // v2.8.2: For dynamic pipeline, use citations array; for claimboundary, use sources array
  // Dynamic pipeline stores fetched sources as citations with different structure
  const sources = pipelineVariant === "monolithic_dynamic"
    ? (result?.citations || []).map((c: any) => ({
        url: c.url,
        title: c.title,
        fetchSuccess: true, // Citations are only added if successfully fetched
        trackRecordScore: c.trackRecordScore,
        trackRecordConfidence: c.trackRecordConfidence,
        trackRecordConsensus: c.trackRecordConsensus,
        excerpt: c.excerpt,
        category: c.sourceType || 'citation',
      }))
    : result?.sources || [];
  const sourceUrlToIndex = useMemo(() => new Map<string, number>(sources.map((s: any, i: number) => [s.url as string, i])), [sources]);
  const sourceUrlToTitle = useMemo(() => new Map<string, string>(sources.map((s: any) => [s.url as string, (s.title as string) || ""])), [sources]);
  const usedModels = collectUsedModels(result);
  const usedModelsLabel = formatUsedModels(usedModels);
  const modelRolesHint = [
    "Role overview (multi-agent analysis):",
    "• Extractor: identifies AtomicClaims from the input.",
    "• Researcher: gathers supporting and contradicting evidence from external sources.",
    "• Assessor: rates evidence quality/reliability and organizes it into ClaimAssessmentBoundaries.",
    "• Debate agents: Advocate and Challenger stress-test the claim from opposing angles.",
    "• Reconciler: combines debate outputs into a coherent verdict draft.",
    "• Validator: checks consistency and evidence grounding before report finalization.",
    "Note: exact model-to-role assignment can vary by runtime configuration."
  ].join("\n");
  const analysisNotesMeta = (
    <>
      {(usedModels.length > 0 || result?.meta?.llmProvider) && (
        <div className={narrativeStyles.metaLine}>
          <span className={narrativeStyles.metaLabel}>LLM Models Used:</span>
          <Badge
            bg="#e3f2fd"
            color="#1565c0"
            title={
              usedModels.length > 0
                ? `Models used: ${usedModelsLabel}\n\n${modelRolesHint}`
                : `${result?.meta?.llmModel || result?.meta?.llmProvider}\n\n${modelRolesHint}`
            }
            modalTitle="LLM Models and Roles"
          >
            🤖 {usedModels.length > 0 ? usedModelsLabel : result?.meta?.llmProvider}
          </Badge>
        </div>
      )}
      {(isCBSchema && claimBoundaries.length > 2) || (!isCBSchema && hasMultipleContexts) ? (
        <div className={narrativeStyles.metaLine}>
          {isCBSchema && claimBoundaries.length > 2 && (
            <>
              <span className={narrativeStyles.metaLabel}>Claim Assessment Boundaries:</span>
              <Badge
                bg="transparent"
                color="#e65100"
                title="A Boundary is a distinct analytical frame that groups compatible evidence approaches for assessing the claim. Different boundaries can reach different findings."
                modalTitle="Claim Assessment Boundaries"
              >
                🔀 {claimBoundaries.length}
              </Badge>
            </>
          )}
          {!isCBSchema && hasMultipleContexts && (
            <Badge bg="#fff3e0" color="#e65100">🔀 {contexts.length} CONTEXTS</Badge>
          )}
        </div>
      ) : null}
    </>
  );
  const subClaims = result?.understanding?.subClaims || [];
  const tangentialSubClaims = Array.isArray(subClaims)
    ? subClaims.filter((c: any) => c?.thesisRelevance === "tangential")
    : [];

  // Determine if any contestations have actual counter-evidence (CONTESTED)
  // Opinion-based contestations without evidence are not highlighted (almost anything can be doubted)
  // Include Key Factors from both question mode AND article mode (unified in v2.6.18)
  const contextAnswers = verdictSummary?.analysisContextAnswers || [];
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
  const jobMetaContent = job ? (
    <>
      <div className={styles.metaInlineRow}>
        <span className={styles.metaInlineItem}><b>ID:</b> <code title={job.jobId}>{job.jobId.length > 10 ? `${job.jobId.slice(0, 10)}...` : job.jobId}</code><CopyButton text={job.jobId} title="Copy Job ID" className={styles.metaCopyButton} /></span>
        <span className={styles.metaInlineItem}><b>Generated:</b> <code>{new Date(job.updatedUtc).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</code></span>
        {hasV22Data && (
          <span className={styles.metaInlineItem}><b>Schema:</b> <code>{schemaVersion}</code></span>
        )}
        {pipelineVariant === "monolithic_dynamic" && (
          <Badge bg="#fce4ec" color="#c2185b" title="Legacy dynamic pipeline">
            ⚗️ Dynamic (legacy)
          </Badge>
        )}
      </div>
      {job.status !== "SUCCEEDED" && (
        <div><b>Status:</b> <code className={getStatusClass(job.status)}>{job.status}</code> ({job.progress}%)</div>
      )}
      {hasV22Data && (
        <div className={styles.badgesRow}>
          {result.meta.analysisId && <span>— <b>ID:</b> <code>{result.meta.analysisId}</code><CopyButton text={result.meta.analysisId} title="Copy Analysis ID" className={styles.metaCopyButton} /></span>}
          {hasEvidenceBasedContestations && <Badge bg="#fce4ec" color="#c2185b">⚠️ CONTESTED</Badge>}
          {result.meta.isPseudoscience && (
            <Badge bg="#ffebee" color="#c62828" title={`Pseudoscience patterns: ${result.meta.pseudoscienceCategories?.join(", ") || "detected"}`}>
              🔬 PSEUDOSCIENCE
            </Badge>
          )}
          {(() => {
            const totalSearches =
              researchStats?.totalSearches ??
              result?.meta?.dynamicStats?.searches ??
              null;
            return typeof totalSearches === "number" && totalSearches > 0 ? (
              <Badge bg="#e8f5e9" color="#2e7d32" title={result.meta.searchProvider || "Web Search"}>
                🔍 {totalSearches} searches
              </Badge>
            ) : null;
          })()}
          {pipelineFallback && requestedPipelineVariant !== pipelineVariant && (
            <Badge
              bg="#fff3e0"
              color="#e65100"
              title={fallbackReason ? `Fallback reason: ${fallbackReason}` : "Pipeline fallback occurred"}
            >
              ↩️ Fallback
            </Badge>
          )}
        </div>
      )}
    </>
  ) : null;

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
    return () => { document.title = "FactHarbor Alpha"; };
  }, [job, twoPanelSummary]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;

      const exportMenu = exportMenuRef.current;
      if (exportMenu?.open && !exportMenu.contains(event.target)) {
        exportMenu.open = false;
      }

      const metaMenu = metaMenuRef.current;
      if (metaMenu?.open && !metaMenu.contains(event.target)) {
        metaMenu.open = false;
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (exportMenuRef.current?.open) exportMenuRef.current.open = false;
      if (metaMenuRef.current?.open) metaMenuRef.current.open = false;
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Export functions
  const handlePrint = () => {
    window.print();
  };

  const handleExportHTML = () => {
    // Rich HTML report for ClaimAssessmentBoundary pipeline results
    if (isCBSchema && result && job) {
      try {
        const html = generateHtmlReport({
          job: {
            jobId: job.jobId,
            status: job.status,
            inputValue: job.inputValue,
            createdUtc: job.createdUtc,
            updatedUtc: job.updatedUtc,
          },
          result,
          claimVerdicts,
          claimBoundaries,
          evidenceItems,
          sources,
          searchQueries,
          qualityGates,
        });
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = generateFilename('Report', 'html');
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        toast.error("Report generation failed. Try again or use the print option.");
        console.error("generateHtmlReport error:", err);
      }
      return;
    }

    // Fallback: simple HTML export for non-CB results
    // R-C1: sanitize fallback content — do not inject raw markdown/innerHTML directly
    const rawContent = report || "";
    const content = reportRef.current?.innerHTML ||
      `<pre style="white-space:pre-wrap">${rawContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
    const generatedAt = getDisplayDateTime();
    const analysisId = result?.meta?.analysisId || 'N/A';
    const shortName = getShortName();
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FactHarbor Report - ${escapeHtml(shortName)}</title>
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
  <p><strong>Analysis ID:</strong> ${escapeHtml(analysisId)}</p>
  <p><strong>Generated:</strong> ${escapeHtml(generatedAt)}</p>
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

  const closeExportMenu = () => {
    if (exportMenuRef.current) {
      exportMenuRef.current.open = false;
    }
  };

  const renderExportButtons = (buttonClassName: string) => (
    <>
      <button onClick={() => { closeExportMenu(); handlePrint(); }} className={buttonClassName} title="Print">Print</button>
      <button onClick={() => { closeExportMenu(); handleExportHTML(); }} className={buttonClassName} title="Export HTML">HTML</button>
      <button onClick={() => { closeExportMenu(); handleExportMarkdown(); }} className={buttonClassName} title="Export Markdown">Markdown</button>
      <button onClick={() => { closeExportMenu(); handleExportJSON(); }} className={buttonClassName} title="Export JSON">JSON</button>
    </>
  );

  if (!jobId) return <div className={styles.pageContainer}>Loading job ID...</div>;

  return (
    <div className={styles.pageContainer}>
      <SystemHealthBanner />
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>FactHarbor Report</h1>
      </div>

      {/* Tabs — only show tab bar when more than one tab is visible */}
      {(() => {
        const showEventsTab = true; // visible to all users (builds transparency)
        const showJsonTab = hasAdminKey;
        const showReportTab = hasV22Data;
        const visibleTabCount = [showReportTab, showJsonTab, showEventsTab].filter(Boolean).length;
        const showTabBar = visibleTabCount > 1;
        return (
          <div className={styles.tabsContainer}>
            <Link href="/jobs" className={styles.backToList} aria-label="Back to jobs" title="Back to jobs">
              <span className={styles.backToListIcon} aria-hidden="true">←</span>
            </Link>
            {showTabBar && showReportTab && (
              <button onClick={() => { setTab("report"); clearHistory(); }} className={`${styles.tab} ${tab === "report" ? styles.tabActive : ""}`}>📊 Report</button>
            )}
            {showTabBar && showJsonTab && (
              <button onClick={() => setTab("json")} className={`${styles.tab} ${tab === "json" ? styles.tabActive : ""}`}>🔧 JSON</button>
            )}
            {showTabBar && showEventsTab && (
              <button onClick={() => setTab("events")} className={`${styles.tab} ${tab === "events" ? styles.tabActive : ""}`}>📋 Events ({events.length})</button>
            )}

            {/* Export + admin actions */}
            {(job?.status === "SUCCEEDED" || hasAdminKey) && (
              <div className={styles.exportButtons}>
                {hasAdminKey && (
                  <>
                  <button
                    onClick={handleToggleHide}
                    disabled={isTogglingHide}
                    className={`${styles.tab} ${styles.hideTab}`}
                    title={job?.isHidden ? "Unhide report" : "Hide report"}
                    aria-label={job?.isHidden ? "Unhide report" : "Hide report"}
                  >
                    {isTogglingHide ? "⏳" : job?.isHidden ? "👁" : "🙈"}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={`${styles.tab} ${styles.deleteTab}`}
                    title={isDeleting ? "Deleting" : "Delete"}
                    aria-label={isDeleting ? "Deleting" : "Delete"}
                  >
                    {isDeleting ? "⏳" : "🗑"}
                  </button>
                  </>
                )}
                {job?.status === "SUCCEEDED" && (
                  <>
                  {jobMetaContent && (
                    <details ref={metaMenuRef} className={styles.metaMenu}>
                      <summary className={styles.metaMenuSummary} title="Report metadata" aria-label="Report metadata">
                        <span className={styles.metaMenuSummaryText}>Metadata</span>
                      </summary>
                      <div className={styles.metaMenuList}>
                        {jobMetaContent}
                      </div>
                    </details>
                  )}
                  <details ref={exportMenuRef} className={styles.exportMenu}>
                  <summary className={styles.exportMenuSummary} title="Export and print" aria-label="Export and print">
                    <span className={styles.exportMenuIcon} aria-hidden="true">🖨</span>
                    <span className={styles.exportMenuSummaryText}>Export</span>
                  </summary>
                  <div className={styles.exportMenuList}>
                    {renderExportButtons(styles.exportMenuButton)}
                  </div>
                </details>
                </>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {maintenance && (
        <div className={styles.maintenanceBox}>
          &#9881; System update in progress — data will refresh automatically when the service is back.
        </div>
      )}

      {err && (
        <div className={styles.noDataError}>
          <strong>Error:</strong> {err}
        </div>
      )}

      {job ? (
        job.status !== "SUCCEEDED" && (
          <div className={`${styles.jobInfoCard} ${styles.reportSurfaceCard}`}>
            {jobMetaContent}
            {/* Input text — shown for in-progress jobs so the user knows what was submitted */}
            {(job.inputValue || job.inputPreview) && (
              <div style={{ marginTop: 12 }}>
                <InputBanner
                  inputType={job.inputType || "text"}
                  inputValue={job.inputValue || job.inputPreview || ""}
                  textColor="#1565c0"
                  textBackgroundColor="#e3f2fd"
                  textBorderColor="#90caf9"
                />
              </div>
            )}
            {/* Failure reason — last error event */}
            {job.status === "FAILED" && (() => {
              const errorEvent = [...events].reverse().find(e => e.level === "error");
              if (!errorEvent) return null;
              if (hasAdminKey) {
                return (
                  <div style={{ marginTop: 12, padding: "8px 12px", background: "#fff3f3", border: "1px solid #f5c6cb", borderRadius: 6, fontSize: 14, color: "#842029" }}>
                    <strong>Error:</strong> {errorEvent.message}
                  </div>
                );
              }
              const errorId = buildErrorId(errorEvent.message);
              return (
                <div style={{ marginTop: 12, padding: "8px 12px", background: "#fff3f3", border: "1px solid #f5c6cb", borderRadius: 6, fontSize: 14, color: "#842029", lineHeight: 1.5 }}>
                  <strong>Analysis failed.</strong> Try submitting your request again. If the problem persists, contact support and quote error ID <code style={{ fontFamily: "monospace", background: "#fce8e8", padding: "1px 5px", borderRadius: 3 }}>{errorId}</code>.
                </div>
              );
            })()}
            {/* Job Action Buttons */}
            {(job.status === "QUEUED" || job.status === "RUNNING") && (
              <div style={{ marginTop: 16 }}>
                <button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#ff9800",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: isCancelling ? "wait" : "pointer",
                    opacity: isCancelling ? 0.6 : 1,
                  }}
                >
                  {isCancelling ? "Cancelling..." : "⏸️ Cancel Job"}
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        <div className={styles.contentCard} style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
      )}

      {/* Result disclaimer — shown only for completed analyses */}
      {job?.status === "SUCCEEDED" && (
        <div className={styles.printOnlyDisclaimer}>
          Analyses report generated by FactHarbor pre-release. Such reports still contain imperfections and should not be cited as authoritative. Reports are provided without warranty.
        </div>
      )}

      {/* Report Tab — merged Summary + Sources + (admin) Dev Diagnostics */}
      {tab === "report" && hasV22Data && (
        <div className={styles.reportStack}>
          {pipelineVariant === "monolithic_dynamic" ? (
            <ReportSection title="Report" className={styles.reportSurfaceCard}>
              <DynamicResultViewer result={result} />
            </ReportSection>
          ) : (
            <>
              {(twoPanelSummary?.articleSummary || job || impliedClaim || backgroundDetails) && (
                <ReportSection title="Input" className={styles.reportSurfaceCard}>
                  <>
                    {twoPanelSummary?.articleSummary && (
                      <ArticleSummaryBox
                        articleSummary={twoPanelSummary.articleSummary}
                      />
                    )}

                    {job && (
                      <InputBanner
                        inputType={job.inputType || "text"}
                        inputValue={job.inputValue || job.inputPreview || "—"}
                        textColor="#1565c0"
                        textBackgroundColor="#e3f2fd"
                        textBorderColor="#90caf9"
                      />
                    )}

                    {impliedClaim && (
                      <TransformedInputBox
                        originalInput={job?.inputValue || job?.inputPreview || ""}
                        transformedInput={impliedClaim}
                      />
                    )}

                    {backgroundDetails && (
                      <BackgroundBanner backgroundDetails={backgroundDetails} />
                    )}
                  </>
                </ReportSection>
              )}

              {/* Input neutrality: same banner for all input styles */}
              {/* v2.6.31: Handle edge case where hasMultipleContexts is true but context answers are missing */}
              {/* CB Pipeline: dedicated verdict banner using top-level fields */}
              {isCBSchema && typeof result?.truthPercentage === "number" && (() => {
                const cbVerdictLabel = percentageToArticleVerdict(result.truthPercentage, result.confidence ?? 0);
                const cbColor = ARTICLE_VERDICT_COLORS[cbVerdictLabel] || ARTICLE_VERDICT_COLORS["UNVERIFIED"];
                const cbUiPalette = getVerdictUiPalette(cbVerdictLabel, cbColor);
                const cbAccent = getVerdictAccentColor(cbVerdictLabel, cbColor);
                const displayCbPct = isFalseBand(cbVerdictLabel) ? 100 - result.truthPercentage : result.truthPercentage;
                const clampedDisplayCbPct = Math.max(0, Math.min(100, displayCbPct));
                let roundedDisplayCbPct = Math.round(clampedDisplayCbPct);
                // Preserve side-of-50 signal while avoiding decimal display.
                if (clampedDisplayCbPct > 50 && roundedDisplayCbPct === 50) roundedDisplayCbPct = 51;
                if (clampedDisplayCbPct < 50 && roundedDisplayCbPct === 50) roundedDisplayCbPct = 49;
                const cbMixedSplitLabel = `${roundedDisplayCbPct}/${100 - roundedDisplayCbPct}`;
                const cbTruthAssessmentValue = cbVerdictLabel === "MIXED"
                  ? `${cbMixedSplitLabel} split`
                  : formatVerdictText(displayCbPct, cbVerdictLabel);
                const cbTruthAssessmentHelperText = cbVerdictLabel === "MIXED"
                  ? `${roundedDisplayCbPct}% true`
                  : isFalseBand(cbVerdictLabel)
                    ? `${Math.round(result.truthPercentage)}% true`
                    : undefined;
                const cbDisplayRange = getDisplayRange(result.truthPercentageRange, cbVerdictLabel);
                const verdictHeadline = result.verdictNarrative?.headline || "";
                const verdictKeyFinding = result.verdictNarrative?.keyFinding || "";
                const confidencePct = Math.max(0, Math.min(100, Math.round(result.confidence ?? 0)));
                return (
                  <ReportSection title="OVERALL VERDICT" className={`${styles.reportSurfaceCard} ${styles.verdictSection}`}>
                    <div className={styles.articleBanner} style={{ borderColor: cbAccent }}>
                      <div className={styles.articleBannerContent}>
                        <div className={styles.articleBannerPrimary}>
                        <div
                          className={styles.articleVerdictHero}
                          style={{
                            color: cbUiPalette.text,
                            backgroundColor: cbUiPalette.bg,
                            borderColor: cbUiPalette.border,
                          }}
                        >
                          {getVerdictLabel(cbVerdictLabel).toUpperCase().replace(/\s+/g, "-")}
                        </div>
                          {verdictHeadline && (
                            <ExpandableText
                              text={verdictHeadline}
                              threshold={200}
                              className={styles.verdictSubline}
                              modalTitle="Verdict Summary"
                              bare
                              onNavigate={navigateTo}
                            />
                          )}
                        <div className={styles.articleBannerMetrics}>
                          <VerdictMetricBlock
                            label="Truth Assessment"
                            value={cbTruthAssessmentValue}
                            percentage={displayCbPct}
                            range={cbDisplayRange}
                            fillColor={cbAccent}
                            helperText={cbTruthAssessmentHelperText}
                          />
                          <VerdictMetricBlock
                            label="Confidence"
                            value={getConfidenceTierLabel(result.confidence ?? 0)}
                            percentage={confidencePct}
                            fillColor="var(--link)"
                            helperText={`${confidencePct}% confidence`}
                          />
                        </div>
                        </div>
                        {verdictKeyFinding && (
                          <div className={styles.articleBannerAside}>
                            <div className={styles.articleBannerAsideLabel}>Key Finding</div>
                            <ExpandableText
                              text={verdictKeyFinding}
                              threshold={420}
                              className={styles.articleBannerAsideText}
                              modalTitle="Key Finding"
                              bare
                              onNavigate={navigateTo}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </ReportSection>
                );
              })()}

              {/* Legacy pipelines: use ArticleVerdictBanner */}
              {!isCBSchema && (hasMultipleContexts && contextAnswers.length > 0 ? (
                <ReportSection title="OVERALL VERDICT" className={`${styles.reportSurfaceCard} ${styles.verdictSection}`}>
                  <MultiContextStatementBanner
                    verdictSummary={verdictSummary}
                    contexts={contexts}
                    articleThesis={twoPanelSummary?.articleSummary?.mainArgument}
                    articleAnalysis={articleAnalysis}
                    pseudoscienceAnalysis={result?.pseudoscienceAnalysis}
                    fallbackConfidence={twoPanelSummary?.factharborAnalysis?.confidence}
                  />
                </ReportSection>
              ) : (
                /* Single-context OR multi-context with missing context answers: show ArticleVerdictBanner as fallback */
                (articleAnalysis || verdictSummary) && (
                  <ReportSection title="OVERALL VERDICT" className={`${styles.reportSurfaceCard} ${styles.verdictSection}`}>
                    <ArticleVerdictBanner
                      articleAnalysis={articleAnalysis}
                      verdictSummary={verdictSummary}
                      fallbackThesis={twoPanelSummary?.articleSummary?.mainArgument || job?.inputValue}
                      pseudoscienceAnalysis={result?.pseudoscienceAnalysis}
                      fallbackConfidence={twoPanelSummary?.factharborAnalysis?.confidence}
                    />
                  </ReportSection>
                )
              ))}

              {/* Holistic quality evaluation (Stage 6) */}
              {isCBSchema && result?.verdictNarrative && (
                <ReportSection title="Analysis Notes" className={`${styles.reportSurfaceCard} ${styles.cbSection}`}>
                  <VerdictNarrativeDisplay
                    narrative={result.verdictNarrative}
                    supplementalMeta={analysisNotesMeta}
                    onNavigate={navigateTo}
                  />
                  {hasQualitySectionContent ? (
                    <details className={styles.qualitySubsection} open={qualityExpanded}>
                      <summary className={styles.qualitySubsectionSummary}>Quality</summary>
                      <div className={styles.qualitySectionStack}>
                        {qualityGatesPanel}
                        {fallbackReportPanel}
                        {warningDiagnosticsPanel}
                        {hasAdminKey && job && (
                          <div className={styles.adminPanelStack}>
                            <PromptViewer jobId={job.jobId} />
                            <ConfigViewer jobId={job.jobId} />
                          </div>
                        )}
                      </div>
                    </details>
                  ) : null}
                </ReportSection>
              )}

              {/* Holistic quality evaluation (Stage 6) */}
              {isCBSchema && result?.tigerScore && (
                <ReportSection title="TIGERScore Holistic Evaluation" className={`${styles.reportSurfaceCard} ${styles.cbSection}`}>
                  <TIGERScorePanel tigerScore={result.tigerScore} />
                </ReportSection>
              )}

              {isCBSchema && claimBoundaries.length > 0 && (
              <ReportSection
                title="Evidences by Atomic Claims and Claim Assessment Boundaries"
                className={`${styles.reportSurfaceCard} ${styles.cbSection} ${styles.inputSection}`}
                tooltip={
                  <div>
                    <p style={{margin: "0 0 10px", fontWeight: 600, fontSize: "13px", color: "var(--text-primary, #0f172a)"}}>Glossary</p>
                    <p style={{margin: "0 0 8px"}}><strong>Atomic Claim</strong> — A single, independently verifiable assertion extracted from the input.</p>
                    <p style={{margin: "0 0 8px"}}><strong>Evidence Item</strong> — A piece of evidence extracted from a source that is relevant to one or more Atomic Claims. Each evidence item carries a direction (supporting or opposing) and a quality score (probative value).</p>
                    <p style={{margin: "0 0 8px"}}><strong>Evidence Scope</strong> — The specific scope defined for the Atomic Claim analysis. (e.g.: methodology, geographic coverage, time period).</p>
                    <p style={{margin: "0"}}><strong>Claim Assessment Boundary</strong> — A group of compatible evidence scopes (methodology, geography, time period).<br/><br/>The matrix columns show how many evidence items each assessment boundary contributes toward each atomic claim.</p>
                  </div>
                }
              >
                  {result?.coverageMatrix && claimVerdicts.length > 0 && (
                    <CoverageMatrixDisplay
                      matrix={result.coverageMatrix}
                      claimLabels={claimVerdicts.map((v: any) => {
                        const atomicClaims: any[] = result?.understanding?.atomicClaims || [];
                        const matched = atomicClaims.find((ac: any) => ac.id === v.claimId);
                        const text = matched?.statement || v.claim?.statement || v.claimText || v.claim?.text || "Unknown claim";
                        return text;
                      })}
                      boundaryShortLabels={claimBoundaries.map((b: any) => b.shortName || b.name || `Boundary ${b.id}`)}
                      boundaryLabels={claimBoundaries.map((b: any) => b.name || b.shortName || `Boundary ${b.id}`)}
                      hideLegend
                      onNavigate={navigateTo}
                    />
                  )}
              </ReportSection>
              )}

              {(claimVerdicts.length > 0 || tangentialSubClaims.length > 0) && (
                <ReportSection title={isCBSchema ? "Atomic Claims" : "Claims"} className={`${styles.reportSurfaceCard} ${styles.inputSection}`}>
                  <section className={styles.claimsSectionList}>
                    {/* CB pipeline: flat list with inline BoundaryFindings */}
                    {claimVerdicts.map((cv: any) => {
                      const atomicClaims: any[] = result?.understanding?.atomicClaims || [];
                      const matched = atomicClaims.find((ac: any) => ac.id === cv.claimId);
                      const enrichedCv = matched
                        ? { ...matched, ...cv, claimText: matched.statement || cv.claimText }
                        : cv;
                      return (
                        <ClaimCard
                          key={cv.claimId}
                          claim={enrichedCv}
                          claimBoundaries={claimBoundaries}
                          totalBoundaryCount={claimBoundaries.length}
                          onNavigate={navigateTo}
                        />
                      );
                    })}
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
                  </section>
                </ReportSection>
              )}

              {isCBSchema && claimBoundaries.length > 0 && (
                <ReportSection title="Claim Assessment Boundaries" className={`${styles.reportSurfaceCard} ${styles.cbSection} ${styles.inputSection}`}>
                  <div className={styles.boundaryDirectory}>
                    {claimBoundaries.map((boundary: any) => (
                      <details
                        key={boundary.id}
                        id={`nav-cb-${boundary.id}`}
                        className={styles.boundaryAccordion}
                      >
                        {(() => {
                          const scopeFamilies = getBoundaryNameSegments(boundary.name);
                          const mergedNotes = getBoundaryDescriptionSegments(boundary.description);
                          const headline = getBoundaryDisplayHeadline(boundary);
                          const subtitle = getBoundaryDisplaySubtitle(boundary);
                          const visibleScopeFamilies = scopeFamilies.slice(0, 6);
                          const hiddenScopeFamilies = scopeFamilies.slice(6);
                          const visibleMergedNotes = mergedNotes.slice(0, 6);
                          const hiddenMergedNotes = mergedNotes.slice(6);

                          return (
                            <>
                              <summary className={styles.boundarySummary}>
                                <div className={styles.boundarySummaryMain}>
                                  <span className={styles.boundarySummaryId}>{boundary.id}</span>
                                  <span className={styles.boundarySummaryName}>
                                    {headline}
                                  </span>
                                  {subtitle && (
                                    <span className={styles.boundarySummarySubtitle}>
                                      {subtitle}
                                    </span>
                                  )}
                                </div>
                                <div className={styles.boundarySummaryMeta}>
                                  {typeof boundary.evidenceCount === "number" && (
                                    <span className={styles.boundaryEvidenceCount}>
                                      {boundary.evidenceCount} evidence
                                    </span>
                                  )}
                                </div>
                              </summary>
                              <div className={styles.boundaryBody}>
                                {mergedNotes.length > 0 && (
                                  <div className={styles.boundaryNarrativeBlock}>
                                    <span className={styles.boundarySubsectionLabel}>Merged scope notes</span>
                                    <ul className={styles.boundaryList}>
                                      {visibleMergedNotes.map((note) => (
                                        <li key={`${boundary.id}-note-${note}`} className={styles.boundaryListItem}>
                                          {note}
                                        </li>
                                      ))}
                                    </ul>
                                    {hiddenMergedNotes.length > 0 && (
                                      <details className={styles.boundaryInlineDetails}>
                                        <summary className={styles.boundaryInlineSummary}>
                                          Show {hiddenMergedNotes.length} more note{hiddenMergedNotes.length === 1 ? "" : "s"}
                                        </summary>
                                        <ul className={styles.boundaryList}>
                                          {hiddenMergedNotes.map((note) => (
                                            <li key={`${boundary.id}-note-extra-${note}`} className={styles.boundaryListItem}>
                                              {note}
                                            </li>
                                          ))}
                                        </ul>
                                      </details>
                                    )}
                                  </div>
                                )}
                                {scopeFamilies.length > 1 && (
                                  <div className={styles.boundaryNarrativeBlock}>
                                    <span className={styles.boundarySubsectionLabel}>Scope families</span>
                                    <ul className={styles.boundaryList}>
                                      {visibleScopeFamilies.map((scopeName) => (
                                        <li key={`${boundary.id}-scope-${scopeName}`} className={styles.boundaryListItem}>
                                          {scopeName}
                                        </li>
                                      ))}
                                    </ul>
                                    {hiddenScopeFamilies.length > 0 && (
                                      <details className={styles.boundaryInlineDetails}>
                                        <summary className={styles.boundaryInlineSummary}>
                                          Show {hiddenScopeFamilies.length} more scope {hiddenScopeFamilies.length === 1 ? "family" : "families"}
                                        </summary>
                                        <ul className={styles.boundaryList}>
                                          {hiddenScopeFamilies.map((scopeName) => (
                                            <li key={`${boundary.id}-scope-extra-${scopeName}`} className={styles.boundaryListItem}>
                                              {scopeName}
                                            </li>
                                          ))}
                                        </ul>
                                      </details>
                                    )}
                                  </div>
                                )}
                          <div className={styles.boundaryFacts}>
                            {boundary.methodology && (
                              <div className={styles.boundaryFact}>
                                <span className={styles.boundaryFactLabel}>Methodology</span>
                                <span className={styles.boundaryFactValue}>{boundary.methodology}</span>
                              </div>
                            )}
                            {boundary.geographic && (
                              <div className={styles.boundaryFact}>
                                <span className={styles.boundaryFactLabel}>Geographic</span>
                                <span className={styles.boundaryFactValue}>{boundary.geographic}</span>
                              </div>
                            )}
                            {boundary.temporal && (
                              <div className={styles.boundaryFact}>
                                <span className={styles.boundaryFactLabel}>Temporal</span>
                                <span className={styles.boundaryFactValue}>{boundary.temporal}</span>
                              </div>
                            )}
                            {typeof boundary.internalCoherence === "number" && (
                              <div className={styles.boundaryFact}>
                                <span className={styles.boundaryFactLabel}>Internal Coherence</span>
                                <span className={styles.boundaryFactValue}>
                                  {boundary.internalCoherence.toFixed(boundary.internalCoherence === 1 ? 2 : 3)}
                                </span>
                              </div>
                            )}
                          </div>
                          {boundaryFindingMap.get(boundary.id)?.length ? (
                            <div className={styles.boundaryFindingCards}>
                              {boundaryFindingMap.get(boundary.id)!.map((finding: any) => {
                                const findingVerdict = percentageToClaimVerdict(finding.truthPercentage, finding.confidence);
                                const displayFindingPct = isFalseBand(findingVerdict) ? 100 - finding.truthPercentage : finding.truthPercentage;
                                const findingColor = CLAIM_VERDICT_COLORS[findingVerdict] || CLAIM_VERDICT_COLORS.UNVERIFIED;
                                const claimIdText = String(finding.claimId || "").trim();
                                const rawClaimText = String(finding.claimText || "").trim();
                                const dedupedClaimText =
                                  claimIdText && rawClaimText.toLowerCase().startsWith(claimIdText.toLowerCase())
                                    ? rawClaimText.slice(claimIdText.length).replace(/^[\s:–—-]+/, "").trim()
                                    : rawClaimText;
                                const fullClaimText = dedupedClaimText || rawClaimText || "Claim text unavailable";
                                return (
                                  <div key={`${boundary.id}-${finding.claimId}`} className={styles.boundaryFindingCard}>
                                    <div className={styles.boundaryFindingCardHeader}>
                                      <span className={styles.boundaryFindingClaimId} title={`Atomic Claim ${finding.claimId}`}>Claim {finding.claimId}</span>
                                      <ExpandableText
                                        text={fullClaimText}
                                        threshold={100}
                                        className={styles.boundaryFindingClaimText}
                                        modalTitle={`Claim ${finding.claimId}: ${fullClaimText.slice(0, 60)}${fullClaimText.length > 60 ? "…" : ""}`}
                                        bare
                                        onNavigate={navigateTo}
                                      />
                                    </div>
                                    <div className={styles.boundaryFindingCardGrid}>
                                      <div className={styles.boundaryFindingMetric}>
                                        <span className={styles.boundaryFindingMetricLabel}>Truth</span>
                                        <span
                                          className={`${styles.boundaryFindingMetricValue} ${styles.boundaryFindingMetricVerdict}`}
                                          style={{ backgroundColor: findingColor.bg, color: findingColor.text }}
                                        >
                                          {formatVerdictText(displayFindingPct, findingVerdict)}
                                        </span>
                                      </div>
                                      <div className={styles.boundaryFindingMetric}>
                                        <span className={styles.boundaryFindingMetricLabel}>Confidence</span>
                                        <span className={styles.boundaryFindingMetricValue}>{getConfidenceTierLabel(finding.confidence)}</span>
                                      </div>
                                      <div className={styles.boundaryFindingMetric}>
                                        <span className={styles.boundaryFindingMetricLabel}>Direction</span>
                                        <span className={styles.boundaryFindingMetricValue}>{finding.evidenceDirection}</span>
                                      </div>
                                      <div className={styles.boundaryFindingMetric}>
                                        <span className={styles.boundaryFindingMetricLabel}>Evidence</span>
                                        <span className={styles.boundaryFindingMetricValue}>{finding.evidenceCount} items</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                          {navigateTo && typeof boundary.evidenceCount === "number" && boundary.evidenceCount > 0 && (
                            <button
                              type="button"
                              className={styles.boundaryJumpButton}
                              onClick={() => navigateTo(`BF_${boundary.id}`)}
                            >
                              Open evidence for this boundary
                            </button>
                          )}
                              </div>
                            </>
                          );
                        })()}
                      </details>
                    ))}
                  </div>
                </ReportSection>
              )}

            </>
          )}

          {evidenceItems.length > 0 && (
            <ReportSection title="Evidence Items" className={`${styles.reportSurfaceCard} ${styles.inputSection}`}>
              <EvidencePanel
                evidenceItems={evidenceItems}
                disableGrouping={pipelineVariant === "monolithic_dynamic"}
                onNavigate={navigateTo}
                sourceUrlToIndex={sourceUrlToIndex}
                sourceUrlToTitle={sourceUrlToTitle}
                showHeader={false}
                showStats={false}
              />
            </ReportSection>
          )}
          <ReportSection title="Sources" className={`${styles.reportSurfaceCard} ${styles.inputSection}`}>
            <SourcesPanel
              searchQueries={searchQueries}
              sources={sources}
              researchStats={researchStats}
              searchProvider={result?.meta?.searchProvider}
              searchProviders={result?.meta?.searchProviders}
              onNavigate={navigateTo}
              showHeader={false}
              showStats={false}
              showQueries={false}
            />
          </ReportSection>
          {searchQueries.length > 0 && (
            <ReportSection title="Search Queries" className={`${styles.reportSurfaceCard} ${styles.inputSection}`}>
              <SourcesPanel
                searchQueries={searchQueries}
                sources={sources}
                researchStats={researchStats}
                searchProvider={result?.meta?.searchProvider}
                searchProviders={result?.meta?.searchProviders}
                onNavigate={navigateTo}
                showHeader={false}
                showStats={false}
                showSources={false}
              />
            </ReportSection>
          )}

          <SourceReliabilityPanel sources={sources} />

        </div>
      )}

      {/* JSON Tab */}
      {tab === "json" && (
        job?.resultJson ? (
          <JsonTreeView data={job.resultJson} jsonText={jsonText} />
        ) : (
          <pre className={styles.jsonContainer}>No result yet.</pre>
        )
      )}

      {/* Events Tab — shown during analysis or for admins */}
      {tab === "events" && (
        <div className={styles.contentCard}>
          <PhaseTimeline events={events} />
        </div>
      )}

      {/* Admin key login modal — shown when cancelling without a stored key */}
      {showLoginModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h2 className={styles.modalTitle}>Admin Login Required</h2>
            <p className={styles.modalSubtitle}>Enter your admin key to cancel this job.</p>
            <form onSubmit={handleLoginSubmit}>
              <input
                type="password"
                value={loginKeyInput}
                onChange={(e) => setLoginKeyInput(e.target.value)}
                placeholder="Enter FH_ADMIN_KEY"
                autoFocus
                disabled={isVerifyingKey}
                className={styles.modalInput}
              />
              {loginError && (
                <p className={styles.modalError}>{loginError}</p>
              )}
              <div className={styles.modalActions}>
                <button
                  type="submit"
                  disabled={isVerifyingKey || !loginKeyInput.trim()}
                  className={styles.modalSubmitBtn}
                >
                  {isVerifyingKey ? "Verifying..." : "Login & Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLoginModal(false); setLoginKeyInput(""); setLoginError(null); }}
                  className={styles.modalCancelBtn}
                >
                  Cancel
                </button>
              </div>
            </form>
            <p className={styles.modalHint}>
              Key is set via the <code>FH_ADMIN_KEY</code> environment variable.
            </p>
          </div>
        </div>
      )}

      {/* Cross-navigation: floating back button */}
      {canGoBack && (
        <button className={styles.navBackButton} onClick={goBack}>
          ← Back
        </button>
      )}
    </div>
  );
}

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  if (typeof document === 'undefined') return text;
  try {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.documentElement.textContent || text;
  } catch (e) {
    return text;
  }
}


// ============================================================================
// TIGERScore Panel
// ============================================================================

function TIGERScorePanel({ tigerScore }: { tigerScore?: TIGERScore }) {
  if (!tigerScore) return null;

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return { bg: "#dcfce7", text: "#166534" };
    if (score >= 3.5) return { bg: "#f0fdf4", text: "#15803d" };
    if (score >= 2.5) return { bg: "#fef9c3", text: "#854d0e" };
    return { bg: "#fee2e2", text: "#991b1b" };
  };

  const overallColor = getScoreColor(tigerScore.overallScore);

  return (
    <div className={styles.tigerScorePanel}>
      <div className={styles.tigerHeader}>
        <h3 className={styles.tigerTitle}>
          <span>🐅</span> TIGERScore Holistic Evaluation
        </h3>
        <div 
          className={styles.tigerOverallBadge}
          style={{ backgroundColor: overallColor.bg, color: overallColor.text }}
        >
          {tigerScore.overallScore.toFixed(1)} / 5.0
        </div>
      </div>

      <div className={styles.tigerGrid}>
        {[
          { label: "Truth (T)", val: tigerScore.scores.truth },
          { label: "Insight (I)", val: tigerScore.scores.insight },
          { label: "Grounding (G)", val: tigerScore.scores.grounding },
          { label: "Evidence (E)", val: tigerScore.scores.evidence },
          { label: "Relevance (R)", val: tigerScore.scores.relevance },
        ].map((m) => (
          <div key={m.label} className={styles.tigerMetric}>
            <div className={styles.tigerMetricLabel}>{m.label}</div>
            <div className={styles.tigerMetricValue}>
              {m.val}<span className={styles.tigerMetricMax}>/5</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.tigerReasoning}>
        <strong>Auditor's Reasoning:</strong>
        <ExpandableText
          text={tigerScore.reasoning}
          bare
          className={styles.tigerReasoningText}
          modalTitle="TIGERScore Reasoning"
        />
      </div>

      {tigerScore.warnings?.length > 0 && (
        <div className={styles.tigerWarnings}>
          {tigerScore.warnings.map((w: string, i: number) => (
            <div key={i} className={styles.tigerWarning}>
              <span>⚠️</span> {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sources Panel
// ============================================================================

function SourcesPanel({
  searchQueries,
  sources,
  researchStats,
  searchProvider,
  searchProviders,
  onNavigate,
  showHeader = true,
  showStats = true,
  showQueries = true,
  showSources = true,
}: {
  searchQueries: any[];
  sources: any[];
  researchStats: any;
  searchProvider?: string;
  searchProviders?: string;
  onNavigate?: (refId: string) => void;
  showHeader?: boolean;
  showStats?: boolean;
  showQueries?: boolean;
  showSources?: boolean;
}) {
  // Build query text → index lookup for "Found via" navigation
  const queryToIndex = onNavigate ? new Map(searchQueries.map((sq: any, i: number) => [sq.query, i])) : null;
  return (
    <div>
      {showHeader && (
        <div className={styles.sourcesHeader}>
          <h3 className={`${styles.sourcesTitle} ${styles.sectionHeader}`}>Sources</h3>
          {(searchProviders || searchProvider) && (
            <span className={styles.providerBadge}>
              via {searchProviders || searchProvider}
            </span>
          )}
        </div>
      )}

      {!showHeader && (searchProviders || searchProvider) && (
        <div className={styles.sourcesHeaderMeta}>
          <span className={styles.providerBadge}>
            via {searchProviders || searchProvider}
          </span>
        </div>
      )}

      {showStats && researchStats && (
        <div className={styles.statsGrid}>
          <StatCard label="Web Searches" value={researchStats.totalSearches} icon="🔍" />
          <StatCard label="LLM Calls" value={researchStats.llmCalls || "N/A"} icon="🤖" />
          <StatCard label="Results Found" value={researchStats.totalResults} icon="📋" />
          <StatCard label="Sources Fetched" value={researchStats.sourcesFetched} icon="🌐" />
          <StatCard label="Fetch Success" value={researchStats.sourcesSuccessful} icon="✅" />
          <StatCard
            label="Evidence Extracted"
            value={researchStats.evidenceItemsExtracted ?? 0}
            icon="📝"
          />
        </div>
      )}

      {showQueries && (searchQueries.length > 0 ? (
        <details className={styles.details}>
          <summary className={styles.summary}>
            <span>Search Queries Performed ({searchQueries.length})</span>
          </summary>
          <div className={styles.searchQueriesList}>
            {searchQueries.map((sq: any, i: number) => (
              <div key={i} id={`nav-sq_${i}`} className={styles.searchQueryItem}>
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
        </details>
      ) : (
        <div className={styles.noDataWarning}>
          No search queries recorded.
        </div>
      ))}

      {showSources && (
        <>
          <h4 className={styles.sectionTitle} style={{ marginTop: showQueries ? 24 : 0 }}>Sources</h4>
          {sources.length > 0 ? (
        <div className={styles.sourcesList}>
          {sources.map((s: any, i: number) => (
            <div key={i} id={`nav-src_${i}`} className={`${styles.sourceItem} ${s.fetchSuccess ? styles.sourceItemSuccess : styles.sourceItemFailed}`}>
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
                    Found via: {onNavigate && queryToIndex?.has(s.searchQuery) ? (
                      <button className={styles.navLink} style={{ fontSize: "inherit" }} onClick={() => onNavigate(`SQ_${queryToIndex!.get(s.searchQuery)}`)}>&ldquo;{s.searchQuery}&rdquo;</button>
                    ) : (
                      <>"{s.searchQuery}"</>
                    )}
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
        </>
      )}
    </div>
  );
}

// ============================================================================
// Source Reliability Panel — collapsible SR breakdown
// ============================================================================

/** Sort priority: reliable tiers first, then insufficient_data, then unreliable tiers */
const SR_CATEGORY_ORDER: Record<string, number> = {
  highly_reliable: 0,
  reliable: 1,
  leaning_reliable: 2,
  mixed: 3,
  insufficient_data: 4,
  leaning_unreliable: 5,
  unreliable: 6,
  highly_unreliable: 7,
};

/** Human-readable labels for SR categories */
const SR_CATEGORY_LABELS: Record<string, string> = {
  highly_reliable: "Highly Reliable",
  reliable: "Reliable",
  leaning_reliable: "Leaning Reliable",
  mixed: "Mixed",
  insufficient_data: "Insufficient Data",
  leaning_unreliable: "Leaning Unreliable",
  unreliable: "Unreliable",
  highly_unreliable: "Highly Unreliable",
};

function getSRCategoryColorClass(category: string): string {
  switch (category) {
    case "highly_reliable":
    case "reliable":
    case "leaning_reliable":
      return styles.srCategoryGreen;
    case "mixed":
      return styles.srCategoryYellow;
    case "leaning_unreliable":
    case "unreliable":
    case "highly_unreliable":
      return styles.srCategoryRed;
    default:
      return styles.srCategoryGrey;
  }
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface SRSourceEntry {
  url: string;
  category: string;
  trackRecordScore: number | null;
  trackRecordConfidence?: number | null;
  trackRecordConsensus?: boolean | null;
  fetchSuccess?: boolean;
}

function SourceReliabilityPanel({ sources }: { sources: SRSourceEntry[] }) {
  // Filter to sources that have SR data (a category other than empty, and a domain)
  const scoredSources = useMemo(() => {
    const filtered = sources.filter((s) => {
      if (!s.url) return false;
      // Show only SR-evaluated sources (confidence is set even when score is null due to low confidence)
      if (s.trackRecordScore == null && s.trackRecordConfidence == null) return false;
      return true;
    });

    // Sort: reliable → insufficient_data → unreliable
    filtered.sort((a, b) => {
      const orderA = SR_CATEGORY_ORDER[scoreToFactualRating(a.trackRecordScore)] ?? 4;
      const orderB = SR_CATEGORY_ORDER[scoreToFactualRating(b.trackRecordScore)] ?? 4;
      if (orderA !== orderB) return orderA - orderB;
      // Within same category, sort by score descending (nulls last)
      const scoreA = a.trackRecordScore ?? -1;
      const scoreB = b.trackRecordScore ?? -1;
      return scoreB - scoreA;
    });

    return filtered;
  }, [sources]);

  // Don't render if no scored sources
  if (scoredSources.length === 0) return null;

  return (
    <ReportSection
      title={`Source Reliability`}
      className={`${styles.reportSurfaceCard} ${styles.inputSection}`}
      collapsible
      defaultOpen={false}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {scoredSources.length} source{scoredSources.length !== 1 ? "s" : ""} evaluated
        </span>
      </div>
      <table className={styles.srTable}>
        <thead>
          <tr>
            <th>Domain</th>
            <th>Category</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {scoredSources.map((s, i) => {
            const domain = extractDomain(s.url);
            const category = scoreToFactualRating(s.trackRecordScore);
            const label = SR_CATEGORY_LABELS[category] || category.replace(/_/g, " ");
            const colorClass = getSRCategoryColorClass(category);
            const scoreDisplay =
              s.trackRecordScore != null
                ? `${(s.trackRecordScore * 100).toFixed(0)}%`
                : "\u2014";
            return (
              <tr key={`${s.url}-${i}`}>
                <td className={styles.srDomain} title={domain}>{domain}</td>
                <td>
                  <span className={`${styles.srCategoryBadge} ${colorClass}`}>
                    {label}
                  </span>
                </td>
                <td className={styles.srScore}>{scoreDisplay}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ReportSection>
  );
}

// ============================================================================
// Evidence Panel - NEW v2.6.29: Display extracted evidence with counter-evidence marking
// ============================================================================

function EvidencePanel({
  evidenceItems,
  disableGrouping = false,
  onNavigate,
  sourceUrlToIndex,
  sourceUrlToTitle,
  showHeader = true,
  showStats = true,
}: {
  evidenceItems: any[];
  disableGrouping?: boolean;
  onNavigate?: (refId: string) => void;
  sourceUrlToIndex?: Map<string, number>;
  sourceUrlToTitle?: Map<string, string>;
  showHeader?: boolean;
  showStats?: boolean;
}) {
  if (!evidenceItems || evidenceItems.length === 0) return null;

  // Group evidence items by claim direction and source type
  const supportingEvidence = evidenceItems.filter((f: any) => f.claimDirection === "supports" && !f.fromOppositeClaimSearch && f.searchStrategy !== "contrarian");
  const contradictingEvidence = evidenceItems.filter((f: any) => f.claimDirection === "contradicts" && !f.fromOppositeClaimSearch && f.searchStrategy !== "contrarian");
  // NEW v2.6.29: Evidence from opposite claim search - evidence that supports the inverse claim
  const oppositeClaimEvidence = evidenceItems.filter((f: any) => f.fromOppositeClaimSearch === true);
  // NEW: Contrarian evidence from triggered re-search
  const contrarianEvidence = evidenceItems.filter((f: any) => f.searchStrategy === "contrarian");
  const neutralEvidence = evidenceItems.filter((f: any) =>
    (f.claimDirection === "neutral" || !f.claimDirection) && !f.fromOppositeClaimSearch && f.searchStrategy !== "contrarian"
  );

  const renderEvidenceCard = (item: any, className: string, extraMeta?: ReactNode) => {
    const isContrarian = item.searchStrategy === "contrarian";
    const finalClassName = isContrarian ? `${styles.evidenceItemContrarian}` : className;
    const matchedSourceIndex = item.sourceUrl ? sourceUrlToIndex?.get(item.sourceUrl) : undefined;
    const sourceLabel = resolveEvidenceSourceLabel(
      item,
      item.sourceUrl ? sourceUrlToTitle?.get(item.sourceUrl) : undefined,
    );

    return (
      <div key={item.id || item.statement} id={item.id ? `nav-ev-${item.id}` : undefined} className={`${styles.evidenceItem} ${finalClassName}`}>
        <div className={styles.evidenceText}>
          {(item.id || item.category || item.evidenceScope) && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              {item.id && <span style={{ fontSize: 10, color: "var(--color-text-muted, #888)", fontFamily: "monospace", userSelect: "all" }} title="Evidence reference ID">{item.id}</span>}
              {item.category && <span className={styles.evidenceCategory}>{item.category}</span>}
              {item.evidenceScope && <EvidenceScopeTooltip evidenceScope={item.evidenceScope} />}
            </div>
          )}
          {isContrarian && <span style={{ color: '#ed8936', fontWeight: 700, marginRight: '6px' }}>[CONTRARIAN]</span>}
          <ExpandableText text={item.statement || ""} modalTitle="Evidence Statement" threshold={400} bare onNavigate={onNavigate} />
        </div>
        <div className={styles.evidenceMeta}>
          {onNavigate && item.sourceUrl && matchedSourceIndex !== undefined ? (
            <button className={`${styles.evidenceSource} ${styles.navLink}`} style={{ fontSize: "inherit" }} onClick={() => onNavigate(`SRC_${matchedSourceIndex}`)}>{decodeHtmlEntities(sourceLabel)}</button>
          ) : item.sourceUrl ? (
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.evidenceSource}>
              {decodeHtmlEntities(sourceLabel)}
            </a>
          ) : (
            <span className={styles.evidenceSource}>{decodeHtmlEntities(sourceLabel)}</span>
          )}
          {onNavigate && item.relevantClaimIds?.length > 0 && (
            <span className={styles.evidenceRefList} style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 4 }}>Claims:</span>
              {item.relevantClaimIds.map((id: string) => (
                <button key={id} className={styles.navLink} style={{ fontSize: 11 }} onClick={() => onNavigate(id)} title={`Go to claim ${id}`}>{id}</button>
              ))}
            </span>
          )}
          {onNavigate && item.claimBoundaryId && (
            <button className={styles.navLink} style={{ fontSize: 11 }} onClick={() => onNavigate(item.claimBoundaryId)} title={`Go to boundary ${item.claimBoundaryId}`}>Boundary: {item.claimBoundaryId}</button>
          )}
          {extraMeta}
        </div>
      </div>
    );
  };

  // Renders a list of evidence items, grouping by methodology/EvidenceScope when applicable
  const renderEvidenceList = (items: any[], className: string, extraMeta?: (item: any) => ReactNode) => {
    if (items.length === 0) return null;
    if (disableGrouping) {
      return items.map((item: any) => renderEvidenceCard(item, className, extraMeta?.(item)));
    }

    const groups = groupEvidenceByMethodology(items);
    if (!groups) {
      return items.map((item: any) => renderEvidenceCard(item, className, extraMeta?.(item)));
    }

    return groups.map((group) => (
      <MethodologySubGroup
        key={group.key}
        group={group}
        renderEvidenceItem={(item) => renderEvidenceCard(item, className, extraMeta?.(item))}
      />
    ));
  };

  return (
    <div className={styles.evidencePanel}>
      {showHeader && <h3 className={`${styles.evidencePanelTitle} ${styles.sectionHeader}`}>Evidence Items</h3>}

      {showStats && (
        <div className={styles.evidenceStats}>
        <span className={styles.evidenceStatSupporting}>✅ {supportingEvidence.length} supporting</span>
        <span className={styles.evidenceStatContradicting}>❌ {contradictingEvidence.length} contradicting</span>
        <span className={styles.evidenceStatOpposite}>🔄 {oppositeClaimEvidence.length} opposite claim</span>
        <span className={styles.evidenceStatContrarian}>🔍 {contrarianEvidence.length} contrarian</span>
        <span className={styles.evidenceStatNeutral}>➖ {neutralEvidence.length} neutral</span>
        </div>
      )}

      {/* NEW: Contrarian Evidence - triggered by pool imbalance */}
      {contrarianEvidence.length > 0 && (
        <div className={`${styles.evidenceSection} ${styles.evidenceSectionContrarian}`}>
          <h4 className={`${styles.evidenceSectionTitle} ${styles.evidenceSectionTitleContrarian}`}>
            Contrarian Evidence ({contrarianEvidence.length})
          </h4>
          <p className={styles.evidenceSectionNote}>
            These evidence items were gathered specifically to address a detected imbalance in the evidence pool.
          </p>
          <div className={styles.evidenceList}>
            {renderEvidenceList(contrarianEvidence, styles.evidenceItemContrarian)}
          </div>
        </div>
      )}

      {/* NEW v2.6.29: Opposite Claim Evidence - displayed prominently */}
      {oppositeClaimEvidence.length > 0 && (
        <div className={`${styles.evidenceSection} ${styles.evidenceSectionOpposite}`}>
          <h4 className={`${styles.evidenceSectionTitle} ${styles.evidenceSectionTitleOpposite}`}>
            Evidence for Opposite Claim ({oppositeClaimEvidence.length})
          </h4>
          <p className={styles.oppositeClaimNote}>
            These evidence items were found by searching for the opposite of the user's claim.
            They support the inverse position and count against the original claim.
          </p>
          <div className={styles.evidenceList}>
            {renderEvidenceList(oppositeClaimEvidence, styles.evidenceItemOpposite, () => (
              <span className={styles.evidenceOppositeTag}>OPPOSITE CLAIM</span>
            ))}
          </div>
        </div>
      )}

      {contradictingEvidence.length > 0 && (
        <div className={`${styles.evidenceSection} ${styles.evidenceSectionContradicting}`}>
          <h4 className={`${styles.evidenceSectionTitle} ${styles.evidenceSectionTitleContradicting}`}>
            Contradicting Evidence ({contradictingEvidence.length})
          </h4>
          <div className={styles.evidenceList}>
            {renderEvidenceList(contradictingEvidence, styles.evidenceItemContradicting)}
          </div>
        </div>
      )}

      {supportingEvidence.length > 0 && (
        <div className={`${styles.evidenceSection} ${styles.evidenceSectionSupporting}`}>
          <h4 className={`${styles.evidenceSectionTitle} ${styles.evidenceSectionTitleSupporting}`}>
            Supporting Evidence ({supportingEvidence.length})
          </h4>
          <div className={styles.evidenceList}>
            {renderEvidenceList(supportingEvidence, styles.evidenceItemSupporting)}
          </div>
        </div>
      )}

      {neutralEvidence.length > 0 && (
        <details className={`${styles.details} ${styles.evidenceSection} ${styles.evidenceSectionNeutral}`}>
          <summary className={styles.summary}>
            <span className={styles.evidenceSectionTitleNeutral}>Neutral / Context Evidence ({neutralEvidence.length})</span>
          </summary>
          <div className={styles.evidenceList}>
            {renderEvidenceList(neutralEvidence, styles.evidenceItemNeutral)}
          </div>
        </details>
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

function Badge({ children, bg, color, title, modalTitle, onNavigate }: { children: React.ReactNode; bg: string; color: string; title?: string; modalTitle?: string; onNavigate?: (refId: string) => void }) {
  const [showTip, setShowTip] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const isLong = title && title.length > 120;
  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onClick={title ? () => (isLong ? setShowModal(true) : setShowTip(v => !v)) : undefined}
      onBlur={title && !isLong ? () => setShowTip(false) : undefined}
      tabIndex={title ? 0 : undefined}
    >
      <span style={{ padding: "2px 8px", backgroundColor: bg, color, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: title ? "help" : "default", display: "inline-block" }} title={!isLong ? title : undefined}>
        {children}
      </span>
      {title && !isLong && showTip && (
        <span style={{ position: "absolute", left: 0, top: "calc(100% + 4px)", zIndex: 10, background: "#fff", color: "#333", fontSize: 12, padding: "6px 10px", borderRadius: 4, whiteSpace: "pre-line", minWidth: 200, maxWidth: 300, lineHeight: 1.4, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", border: "1px solid #e0e0e0" }}>
          {title}
        </span>
      )}
      {isLong && showModal && (
        <TextModal text={title} title={modalTitle || "Details"} onClose={() => setShowModal(false)} onNavigate={onNavigate} />
      )}
    </span>
  );
}

// ============================================================================
// Triangulation Score Helpers (Phase 5k: CB Pipeline)
// ============================================================================

/**
 * Get color scheme for triangulation level
 */
function getTriangulationColor(level: string): { bg: string; text: string } {
  switch (level) {
    case "strong":
      return { bg: "#dcfce7", text: "#166534" }; // Green
    case "moderate":
      return { bg: "#fff9c4", text: "#f57f17" }; // Yellow
    case "weak":
      return { bg: "#ffccbc", text: "#bf360c" }; // Orange
    case "conflicted":
      return { bg: "#ffcdd2", text: "#c62828" }; // Red
    default:
      return { bg: "#f5f5f5", text: "#666666" }; // Gray
  }
}

/**
 * Get icon for triangulation level
 */
function getTriangulationIcon(level: string): string {
  switch (level) {
    case "strong":
      return "◆"; // Strong agreement
    case "moderate":
      return "◇"; // Moderate agreement
    case "weak":
      return "○"; // Weak/single boundary
    case "conflicted":
      return "⚠"; // Conflicted across boundaries
    default:
      return "?";
  }
}

/**
 * Get tooltip text for triangulation score
 */
function getTriangulationTooltip(score: any): string {
  const { boundaryCount, supporting, contradicting, level } = score;
  switch (level) {
    case "strong":
      return `Strong agreement: ${supporting} of ${boundaryCount} independent evidence approaches support this claim. This is a well-corroborated finding.`;
    case "moderate":
      return `Moderate agreement: ${supporting} of ${boundaryCount} evidence approaches support this claim, but agreement is not unanimous. The verdict is likely reliable but has some caveats.`;
    case "weak":
      return boundaryCount <= 1
        ? `Only ${boundaryCount} evidence approach available — insufficient cross-verification. Treat this verdict with caution.`
        : `Weak agreement: evidence approaches show limited consensus (${supporting} supporting of ${boundaryCount}). Treat this verdict with caution.`;
    case "conflicted":
      return `Conflicted: ${supporting} evidence approach${supporting !== 1 ? "es" : ""} support and ${contradicting} contradict this claim across ${boundaryCount} independent approaches. This can happen when evidence genuinely points in different directions — review the supporting and contradicting evidence to judge for yourself.`;
    default:
      return `${boundaryCount} evidence approaches analyzed.`;
  }
}

// ============================================================================
// Multi-Context Verdict Banner (for statements with multiple contexts)
// ============================================================================

function MultiContextStatementBanner({ verdictSummary, contexts, articleThesis, articleAnalysis, pseudoscienceAnalysis, fallbackConfidence }: { verdictSummary: any; contexts: any[]; articleThesis?: string; articleAnalysis?: any; pseudoscienceAnalysis?: any; fallbackConfidence?: number }) {
  const overallTruth = getVerdictTruthPercentage(verdictSummary);
  // v2.6.31: Also check twoPanelSummary.factharborAnalysis.confidence via fallbackConfidence prop
  const overallConfidence = verdictSummary?.confidence ?? fallbackConfidence ?? 0;
  const overallVerdict = percentageToClaimVerdict(overallTruth, overallConfidence);
  const overallColor = CLAIM_VERDICT_COLORS[overallVerdict] || CLAIM_VERDICT_COLORS["UNVERIFIED"];
  const displayOverallPct = isFalseBand(overallVerdict) ? 100 - overallTruth : overallTruth;

  // v2.6.38: Check if overall verdict is reliable (single context vs multiple distinct contexts)
  const verdictReliability = articleAnalysis?.articleVerdictReliability || "high";
  const isUnreliableAverage = verdictReliability === "low";

  // Determine if any contestations have actual counter-evidence (CONTESTED)
  const contextAnswers = verdictSummary?.analysisContextAnswers || [];
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
  const verdictReason = articleAnalysis?.articleVerdictReason || articleAnalysis?.verdictExplanation || verdictSummary?.analysisContextSummary || verdictSummary?.summary || "";

  return (
    <div className={styles.multiContextBanner}>
      <div className={styles.contextNotice}>
        <span className={styles.contextIcon}>🔀</span>
        <span
          className={styles.contextText}
          title='A "context" is a bounded analytical frame that should be analyzed separately.'
        >
          {contexts.length} distinct contexts analyzed separately
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
          <span className={styles.answerPercentage}>{formatVerdictText(displayOverallPct, overallVerdict)} <span style={{ fontSize: 12, color: "var(--text-muted)" }} title={`${overallConfidence}%`}>· {getConfidenceTierLabel(overallConfidence)}</span></span>
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
          <div className={styles.contextSummary}>
            <ExpandableText text={verdictReason} threshold={400} modalTitle="Verdict Summary" bare className={styles.contextSummaryText} />
          </div>
        )}

        {/* v2.6.38: Explain unreliable average */}
        {isUnreliableAverage && (
          <div className={styles.calibrationNote} style={{ background: "var(--color-accent-amber-bg)", borderLeft: "3px solid var(--color-accent-amber-border)" }}>
            <span className={styles.calibrationText}>
              ℹ️ This average may not be meaningful because contexts answer different questions. Focus on individual context verdicts below.
            </span>
          </div>
        )}

        {/* Only show shortAnswer if it's different from verdictReason to avoid duplication */}
        {(verdictSummary?.shortAnswer || verdictSummary?.summary) &&
         (verdictSummary?.shortAnswer || verdictSummary?.summary) !== verdictReason && (
          <div className={styles.shortAnswerBox} style={{ borderLeftColor: overallColor.border }}>
            <ExpandableText text={verdictSummary.shortAnswer || verdictSummary.summary} threshold={400} modalTitle="Assessment" bare className={styles.shortAnswerText} />
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

        {/* v2.6.28: Show overall KEY FACTORS inside verdict box when no per-context breakdown */}
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
        <div className={styles.contextsAnalysis}>
          <h4 className={styles.contextsHeader} style={isUnreliableAverage ? { fontSize: '1.1rem', fontWeight: 700 } : undefined}>
            {isUnreliableAverage && '⭐ '}📑 {isUnreliableAverage ? 'Individual Context Verdicts (Primary)' : 'Contexts'}
          </h4>
          <div className={styles.contextsStack}>
            {contextAnswers.map((pa: any) => {
              const contextId = pa.contextId;
              const context = contexts.find((c: any) => c.id === contextId);
              const key = contextId || pa.contextName || context?.id || "context";
              return <ContextCard key={key} contextAnswer={pa} context={context} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ContextCard({ contextAnswer, context }: { contextAnswer: any; context: any }) {
  const contextTruth = getVerdictTruthPercentage(contextAnswer);
  const contextConfidence = contextAnswer?.confidence ?? 0;
  const contextVerdict = percentageToClaimVerdict(contextTruth, contextConfidence);
  const color = CLAIM_VERDICT_COLORS[contextVerdict] || CLAIM_VERDICT_COLORS["UNVERIFIED"];
  const displayContextPct = isFalseBand(contextVerdict) ? 100 - contextTruth : contextTruth;

  const factors = contextAnswer.keyFactors || [];
  const positiveCount = factors.filter((f: any) => f.supports === "yes").length;
  const negativeCount = factors.filter((f: any) => f.supports === "no").length;
  const neutralCount = factors.filter((f: any) => f.supports === "neutral").length;
  // Only count as "contested" factors with actual counter-evidence (not mere opinions/doubts)
  const contestedCount = factors.filter((f: any) =>
    f.supports === "no" &&
    f.isContested &&
    (f.factualBasis === "established" || f.factualBasis === "disputed")
  ).length;

  const subject = (context?.subject || "").trim();
  const rawOutcome = (context?.outcome || "").trim().toLowerCase();
  // Don't display vague outcomes - only show if we have a concrete outcome
  const isVagueOutcome = !rawOutcome ||
    rawOutcome === "unknown" ||
    rawOutcome === "pending" ||
    rawOutcome.includes("investigation") ||
    rawOutcome.includes("ongoing") ||
    rawOutcome.includes("not yet");
  const outcome = isVagueOutcome ? "" : context?.outcome?.trim() || "";
  const charges: string[] = Array.isArray(context?.charges) ? context.charges : [];
  const showAbout = !!subject || (charges.length > 0) || !!outcome;

  return (
    <div className={styles.contextCard} style={{ borderColor: color.border }}>
      <div className={styles.contextCardHeader}>
        <div className={styles.contextCardTitle}>
          {context?.name || contextAnswer.contextName}
        </div>
        {context && (
          <div className={styles.contextCardMeta}>
            {context.court && <span>{context.court} • </span>}
            {context.date && <span>{context.date}</span>}
            {context.status && context.status !== "unknown" && <span> • {context.status}</span>}
          </div>
        )}
        {/* v2.6.39: Show assessed statement to clarify what is being evaluated in this context */}
        {context?.assessedStatement && (
          <div className={styles.contextAssessmentQuestion}>
            <span className={styles.contextAssessmentLabel}>Assessed Statement:</span> {context.assessedStatement}
          </div>
        )}
        {showAbout && (
          <div className={styles.contextAboutInline}>
            {subject && (
              <span className={styles.contextAboutItem}>
                <span className={styles.contextAboutLabel}>Subject:</span> {subject}
              </span>
            )}
            {charges.length > 0 && (
              <span className={styles.contextAboutItem}>
                <span className={styles.contextAboutLabel}>Charges:</span> {charges.slice(0, 3).join("; ")}{charges.length > 3 ? "…" : ""}
              </span>
            )}
            {outcome && (
              <span className={styles.contextAboutItem}>
                <span className={styles.contextAboutLabel}>Outcome:</span> {outcome}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.contextCardContent}>
        <div className={styles.contextAnswerRow}>
          <span className={styles.contextAnswerBadge} style={{ backgroundColor: color.bg, color: color.text }}>
            {color.icon} {getVerdictLabel(contextVerdict)}
          </span>
          <span className={styles.contextPercentage}>{formatVerdictText(displayContextPct, contextVerdict)} <span style={{ fontSize: 11, color: "var(--text-muted)" }} title={`${contextAnswer.confidence}%`}>· {getConfidenceTierLabel(contextAnswer.confidence)}</span></span>
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

        {contextAnswer.shortAnswer && (
          <div className={styles.contextShortAnswer}>
            <span className={styles.contextAssessmentLabel}>Assessment:</span>{" "}
            <ExpandableText text={contextAnswer.shortAnswer} threshold={300} modalTitle="Assessment" bare />
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
        <ExpandableText text={factor.explanation || ""} threshold={300} modalTitle="Key Factor" bare className={styles.keyFactorExplanation} />
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
  const accentColor = getVerdictAccentColor(articleVerdictLabel, color);

  const isPseudo = pseudoscienceAnalysis?.isPseudoscience || articleAnalysis?.isPseudoscience;
  const pseudoCategories = pseudoscienceAnalysis?.categories || articleAnalysis?.pseudoscienceCategories || [];

  const articlePct = articleTruth;
  const displayArticlePct = isFalseBand(articleVerdictLabel) ? 100 - articlePct : articlePct;
  const articleDisplayRange = getDisplayRange(
    articleAnalysis?.truthPercentageRange ?? verdictSummary?.truthPercentageRange,
    articleVerdictLabel,
  );

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
    <div className={styles.articleBanner} style={{ borderColor: accentColor }}>
      <div className={styles.articleBannerContent}>
        {/* v2.6.25: Unified verdict label */}
        <div className={styles.articleVerdictHeader}>
          <span className={styles.articleVerdictLabel} title="Overall verdict is assessed holistically. Claims average may differ due to evidence discovery and weighting.">VERDICT</span>
        </div>
        <div className={styles.articleVerdictRow}>
          <span className={styles.articleVerdictBadge} style={{ backgroundColor: color.bg, color: color.text }}>
            {color.icon} {getVerdictLabel(articleVerdictLabel)}
          </span>
          <span className={styles.verdictConfidenceTag}>
            Confidence: {getConfidenceTierLabel(articleConfidence)}
          </span>
          {isPseudo && (
            <span className={styles.pseudoscienceBadge}>
              🔬 Pseudoscience Detected
            </span>
          )}
        </div>

        <VerdictMeter percentage={displayArticlePct} range={articleDisplayRange} fillColor={accentColor} />

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
          <div className={styles.verdictReasonBox} style={{ borderLeftColor: accentColor }}>
            <ExpandableText text={verdictReason} threshold={400} modalTitle="Verdict Explanation" bare />
          </div>
        )}

        {/* Short Answer / Assessment */}
        {shortAnswer && (
          <div className={styles.shortAnswerBox} style={{ borderLeftColor: accentColor }}>
            <ExpandableText text={shortAnswer} threshold={400} modalTitle="Assessment" bare className={styles.shortAnswerText} />
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
        <ExpandableText text={decodeHtmlEntities(articleSummary.mainArgument)} threshold={400} modalTitle="Input Summary" bare className={styles.articleSummaryValue} />
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
  // Only show if normalization materially changed the displayed input.
  const canonicalizeForComparison = (text: string): string => {
    return (text || "")
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[.!?…:;,]+$/u, "");
  };
  const normalizedOriginal = canonicalizeForComparison(originalInput);
  const normalizedTransformed = canonicalizeForComparison(transformedInput);
  const isTransformed = normalizedOriginal !== normalizedTransformed;

  if (!isTransformed || !transformedInput) return null;

  return (
    <div className={styles.transformedInputBox}>
      <div className={styles.transformedInputHeader}>
        <span className={styles.transformedInputTitle}>Analyzed As</span>
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
          <b>🔍 FactHarbor Report</b>
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
// Visual Truth Meter
// ============================================================================

function VisualTruthMeter({
  truth,
  range
}: {
  truth: number;
  range?: { min: number; max: number };
}) {
  return (
    <div className={styles.visualTruthMeter}>
      <div className={styles.meterContainer}>
        {range && (
          <div
            className={styles.meterRange}
            style={{
              left: `${range.min}%`,
              width: `${range.max - range.min}%`
            }}
          />
        )}
        <div
          className={styles.meterMark}
          style={{ left: `${truth}%` }}
        />
      </div>
      <div className={styles.meterLabels}>
        <span>0%</span>
        <span className={styles.meterValueLabel}>{truth}%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function ClaimCard({
  claim,
  claimBoundaries = [],
  totalBoundaryCount = 0,
  onNavigate,
}: {
  claim: any;
  claimBoundaries?: any[];
  totalBoundaryCount?: number;
  onNavigate?: (refId: string) => void;
}) {
  const claimTruth = getClaimTruthPercentage(claim);
  const claimConfidence = claim?.confidence ?? 0;
  const claimVerdictLabel = percentageToClaimVerdict(claimTruth, claimConfidence);
  const color = CLAIM_VERDICT_COLORS[claimVerdictLabel] || CLAIM_VERDICT_COLORS["UNVERIFIED"];
  const displayClaimPct = isFalseBand(claimVerdictLabel) ? 100 - claimTruth : claimTruth;

  // Only show CONTESTED label when opposition has actual counter-evidence
  const hasEvidenceBasedContestation = claim.isContested &&
    (claim.factualBasis === "established" || claim.factualBasis === "disputed");

  const isTangential = claim.thesisRelevance === "tangential";

  return (
    <div id={claim.claimId ? `nav-claim-${claim.claimId}` : undefined} className={`${styles.claimCard} ${hasEvidenceBasedContestation ? styles.claimCardContested : ""} ${isTangential ? styles.claimCardTangential : ""}`} style={{ borderLeftColor: isTangential ? "#9e9e9e" : color.border }}>
      <div className={styles.claimEyebrow}>
        <span className={styles.claimEyebrowLabel}>Atomic Claim</span>
        <span className={styles.claimEyebrowId}>{claim.claimId}</span>
      </div>
      <div className={styles.claimText}>
        {claim.claimText}
      </div>
      <div className={styles.claimVerdictRow} style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}>
        <span className={styles.claimVerdictMain}>{color.icon} {getVerdictLabel(claimVerdictLabel)}</span>
        <span className={styles.claimVerdictPct}>{formatVerdictText(displayClaimPct, claimVerdictLabel)}</span>
        <span className={styles.claimVerdictConf}>{getConfidenceTierLabel(claim.confidence)}</span>
        {claim.truthPercentageRange && (
          <span className={styles.claimVerdictRange}>
            range: {isFalseBand(claimVerdictLabel) ? 100 - claim.truthPercentageRange.max : claim.truthPercentageRange.min}%–{isFalseBand(claimVerdictLabel) ? 100 - claim.truthPercentageRange.min : claim.truthPercentageRange.max}%
          </span>
        )}
      </div>
      <div className={styles.claimCardHeader}>
        {claim.category && <Badge bg="#f3f4f6" color="#4b5563">{claim.category.toUpperCase()}</Badge>}
        {claim.isCentral && <Badge bg="#e8f4fd" color="#0056b3">🔑 Central</Badge>}
        {claim.harmPotential === "high" && <Badge bg="#ffebee" color="#c62828">⚠️ High Harm</Badge>}
        {claim.verifiability && <Badge bg="#f3e5f5" color="#6a1b9a">🔍 Verifiability: {claim.verifiability.toUpperCase()}</Badge>}
        {isTangential && <Badge bg="#f5f5f5" color="#616161">📎 Tangential</Badge>}
        {claim.isCounterClaim && <Badge bg="#fff3e0" color="#e65100">↔️ Counter</Badge>}
        {isTangential && (
          <Badge bg="#eeeeee" color="#757575">Not in verdict</Badge>
        )}
        {hasEvidenceBasedContestation && (
          <Badge bg="#fce4ec" color="#c2185b">⚠️ CONTESTED</Badge>
        )}
        {claim.isPseudoscience && (
          <Badge bg="#ffebee" color="#c62828">🔬 Pseudoscience</Badge>
        )}
        {/* CB Pipeline: Triangulation Score (Phase 5k) */}
        {claim.triangulationScore && (
          <Badge
            bg={getTriangulationColor(claim.triangulationScore.level).bg}
            color={getTriangulationColor(claim.triangulationScore.level).text}
            title={getTriangulationTooltip(claim.triangulationScore)}
          >
            {getTriangulationIcon(claim.triangulationScore.level)} {claim.triangulationScore.level.toUpperCase()}
          </Badge>
        )}
      </div>
      
      {claim.misleadingness && claim.misleadingness !== "not_misleading" && (
        <div className={styles.misleadingnessInline}>
          <div className={styles.misleadingnessLabel}>
            ⚠️ {claim.misleadingness.replace("_", " ").toUpperCase()}
          </div>
          {claim.misleadingnessReason && (
            <ExpandableText
              text={claim.misleadingnessReason}
              threshold={300}
              className={styles.misleadingnessText}
              modalTitle={`Misleadingness — ${claim.claimText ? claim.claimText.slice(0, 60) + (claim.claimText.length > 60 ? "…" : "") : claim.claimId || "Claim"}`}
              bare
              onNavigate={onNavigate}
            />
          )}
        </div>
      )}

      <ExpandableText
        text={claim.reasoning || ""}
        className={styles.claimReasoning}
        modalTitle={`Reasoning — ${claim.claimText ? claim.claimText.slice(0, 60) + (claim.claimText.length > 60 ? "…" : "") : claim.claimId || "Claim"}`}
        bare
        onNavigate={onNavigate}
      />
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

      {/* ClaimAssessmentBoundary pipeline: show boundary findings (Phase 3) */}
      {claim.boundaryFindings && (
        <BoundaryFindings
          boundaryFindings={claim.boundaryFindings}
          claimBoundaries={claimBoundaries}
          totalBoundaryCount={totalBoundaryCount}
          onNavigate={onNavigate}
        />
      )}

      {/* Evidence references (navigable links to Sources tab) */}
      {onNavigate && (claim.supportingEvidenceIds?.length > 0 || claim.contradictingEvidenceIds?.length > 0) && (
        <div className={styles.evidenceRefList}>
          {claim.supportingEvidenceIds?.length > 0 && (
            <div className={styles.evidenceRefGroup}>
              <span className={styles.evidenceRefLabel}>Supporting Evidence:</span>
              <div className={styles.evidenceRefIds}>
                {claim.supportingEvidenceIds.map((id: string) => (
                  <button key={id} className={styles.navLink} style={{ fontSize: 12 }} onClick={() => onNavigate(id)}>{id}</button>
                ))}
              </div>
            </div>
          )}
          {claim.contradictingEvidenceIds?.length > 0 && (
            <div className={styles.evidenceRefGroup}>
              <span className={styles.evidenceRefLabel}>Contradicting Evidence:</span>
              <div className={styles.evidenceRefIds}>
                {claim.contradictingEvidenceIds.map((id: string) => (
                  <button key={id} className={styles.navLink} style={{ fontSize: 12 }} onClick={() => onNavigate(id)}>{id}</button>
                ))}
              </div>
            </div>
          )}
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
      {result.verdict && (() => {
        const dynVerdict = (result.verdict.label || "").toUpperCase();
        const dynScore = result.verdict.score;
        const dynConf = result.verdict.confidence;
        const dynFalse = isFalseBand(dynVerdict);
        const dynDisplayPct = dynScore !== undefined ? (dynFalse ? 100 - dynScore : dynScore) : undefined;
        const dynWord = dynFalse ? "false" : "true";
        const dynVerdictText = dynVerdict === "MIXED" && dynDisplayPct !== undefined
          ? `${dynDisplayPct}/${100 - dynDisplayPct} split`
          : dynVerdict === "UNVERIFIED" ? "Insufficient evidence"
          : dynDisplayPct !== undefined ? `${dynDisplayPct}% ${dynWord}` : "";
        return (
        <div className={styles.dynamicVerdict}>
          <div className={styles.verdictLabel}>
            {result.verdict.label}
            {dynVerdictText && (
              <span style={{ fontWeight: 400, marginLeft: 8 }}>· {dynVerdictText}</span>
            )}
          </div>
          {dynConf !== undefined && (
            <div className={styles.verdictConfidence}>· {getConfidenceTierLabel(dynConf)}</div>
          )}
          {result.verdict.reasoning && (
            <ExpandableText text={result.verdict.reasoning} className={styles.verdictReasoning} modalTitle="Verdict Reasoning" />
          )}
        </div>
        );
      })()}

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
