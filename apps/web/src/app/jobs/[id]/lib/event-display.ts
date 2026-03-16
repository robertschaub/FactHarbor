/**
 * Event Display Classification
 *
 * Maps machine-generated pipeline event messages to user-friendly
 * phase labels and extracted parameters for the Analysis Timeline UI.
 *
 * All classification is structural (prefix/exact match on fixed
 * machine-generated strings) — not semantic text analysis.
 */

export type EventPhase =
  | "setup"
  | "understand"
  | "research"
  | "cluster"
  | "verdict"
  | "quality"
  | "done"
  | "lifecycle"
  | "error"
  | "misc";

export const PHASE_LABELS: Record<EventPhase, string> = {
  setup:      "Setup",
  understand: "Understanding Input",
  research:   "Searching Evidence",
  cluster:    "Grouping Evidence",
  verdict:    "Generating Verdicts",
  quality:    "Quality Evaluation",
  done:       "Complete",
  lifecycle:  "Lifecycle",
  error:      "Error",
  misc:       "Other",
};

export interface EventDisplay {
  phase: EventPhase;
  /** Short human-readable label for this specific event */
  label: string;
  /** Key parameters extracted from the message (shown as muted secondary line) */
  params?: string;
  /** True for stack-trace events — rendered as collapsible block */
  isStackTrace?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractSearchProvider(msg: string): string | undefined {
  return msg.match(/Search provider "([^"]+)"/)?.[1];
}

function extractSearchError(msg: string): string | undefined {
  return msg.match(/Search provider "[^"]+"\s*error:\s*(.+)/i)?.[1]?.trim().slice(0, 80);
}

// ---------------------------------------------------------------------------
// Main classification function
// ---------------------------------------------------------------------------

export function classifyEvent(level: string, message: string): EventDisplay {
  const msg = message.trim();
  const lvl = level.toLowerCase();

  // ── Errors (level takes priority) ────────────────────────────────────────
  if (lvl === "error") {
    if (msg.startsWith("Stack (truncated):") || msg.startsWith("Stack:\n")) {
      return { phase: "error", label: "Stack trace", isStackTrace: true };
    }
    if (msg.startsWith("Failed to extract verdict")) {
      const detail = msg.replace(/^Failed to extract verdict[:\s]*/i, "").trim().slice(0, 80);
      return { phase: "error", label: "Verdict extraction failed", params: detail || undefined };
    }
    return { phase: "error", label: "Error", params: msg.slice(0, 100) || undefined };
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (msg === "Job created")    return { phase: "setup", label: "Job created" };
  if (msg === "Runner started") return { phase: "setup", label: "Analysis started" };
  if (msg.startsWith("Preparing input")) {
    const detail = msg.replace(/^Preparing input\s*/i, "").replace(/[()]/g, "").trim();
    return { phase: "setup", label: "Preparing input", params: detail || undefined };
  }

  // ── Understand ────────────────────────────────────────────────────────────
  if (msg.startsWith("Extracting claims from input")) return { phase: "understand", label: "Extracting claims" };
  if (msg.startsWith("Extracting claims: Pass 1"))   return { phase: "understand", label: "Scanning input — Pass 1" };
  if (msg.startsWith("Extracting claims: preliminary web search")) return { phase: "understand", label: "Initial web search" };
  if (msg.startsWith("Extracting claims: Pass 2"))   return { phase: "understand", label: "Refining claims — Pass 2" };
  if (msg.startsWith("Extracting claims: Gate 1"))   return { phase: "understand", label: "Gate 1 validation" };
  if (msg.startsWith("Extracting claims: reprompt attempt")) {
    const m = msg.match(/reprompt attempt (\d+\/\d+)/);
    return { phase: "understand", label: "Reprompt", params: m?.[1] };
  }
  if (msg.startsWith("Extracting claims: multi-event reprompt")) return { phase: "understand", label: "Multi-event reprompt" };
  if (msg.startsWith("Extracting claims")) {
    const detail = msg.replace(/^Extracting claims[:\s]*/i, "").trim();
    return { phase: "understand", label: "Extracting claims", params: detail || undefined };
  }

  // ── Research ──────────────────────────────────────────────────────────────
  if (msg.startsWith("Researching evidence"))          return { phase: "research", label: "Searching for evidence" };
  if (msg.startsWith("Running contrarian evidence"))   return { phase: "research", label: "Contrarian evidence search" };
  if (msg.startsWith("Assessing evidence applicability")) return { phase: "research", label: "Filtering evidence" };
  if (msg.startsWith("Search provider")) {
    const provider = extractSearchProvider(msg);
    const err = extractSearchError(msg);
    return {
      phase: "research",
      label: "Search provider error",
      params: [provider, err].filter(Boolean).join(" — ") || undefined,
    };
  }

  // ── Cluster ───────────────────────────────────────────────────────────────
  if (msg.startsWith("Clustering evidence")) return { phase: "cluster", label: "Grouping evidence into boundaries" };

  // ── Verdict ───────────────────────────────────────────────────────────────
  if (msg.startsWith("Generating verdicts"))          return { phase: "verdict", label: "Generating verdicts" };
  if (msg.startsWith("Aggregating final assessment")) return { phase: "verdict", label: "Aggregating assessment" };

  // ── Quality ───────────────────────────────────────────────────────────────
  if (msg.startsWith("Performing holistic TIGERScore") || msg.startsWith("TIGERScore")) {
    return { phase: "quality", label: "Holistic quality evaluation" };
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (msg.startsWith("Storing result")) return { phase: "done", label: "Storing result" };
  if (msg === "Result stored")          return { phase: "done", label: "Result stored" };
  if (msg === "Done")                   return { phase: "done", label: "Analysis complete" };

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  if (msg === "Job cancelled by user")   return { phase: "lifecycle", label: "Job cancelled" };
  if (msg === "Report hidden by admin")  return { phase: "lifecycle", label: "Report hidden" };
  if (msg === "Report unhidden by admin") return { phase: "lifecycle", label: "Report visible again" };
  if (msg.startsWith("Retry job created from")) {
    const m = msg.match(/from (\S+) \(retry #(\d+)/);
    return { phase: "lifecycle", label: "Retry created", params: m ? `from ${m[1]}, retry #${m[2]}` : undefined };
  }

  // ── Misc (unknown — never lose data) ─────────────────────────────────────
  return { phase: "misc", label: msg.slice(0, 80), params: msg.length > 80 ? msg.slice(80) : undefined };
}

/** Format an ISO UTC timestamp as local HH:mm:ss */
export function formatLocalTime(tsUtc: string): string {
  try {
    const d = new Date(tsUtc);
    if (isNaN(d.getTime())) return tsUtc;
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return tsUtc;
  }
}
