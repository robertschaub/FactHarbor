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
  misc:       "Additional",
};

export interface EventDisplay {
  phase: EventPhase;
  /** Short human-readable label for this specific event */
  label: string;
  /** Key parameters extracted from the message (shown as muted secondary line) */
  params?: string;
  /** True for stack-trace events — rendered as collapsible block */
  isStackTrace?: boolean;
  /**
   * Override the displayed severity (used when a warn-level event is
   * actually a fully-recovered fallback, not a real user-facing warning).
   */
  overrideLevel?: "info" | "warn";
  /**
   * When true, this event's params (e.g. model name from an LLM call) should be
   * appended to the preceding timeline entry instead of shown as a new row.
   * Used for LLM call events that directly follow a human-readable step event
   * for the same operation.
   */
  mergeIntoPrevious?: true;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const LLM_CALL_PHASE: Partial<Record<string, EventPhase>> = {
  "advocate": "verdict", "self-consistency": "verdict", "challenger": "verdict",
  "reconciler": "verdict", "validation": "verdict", "verdict narrative": "verdict",
  "auditor": "quality",
  "clustering": "cluster",
  "query generation": "research", "relevance classification": "research",
  "evidence extraction": "research", "preliminary evidence": "understand",
  "evidence applicability": "research",
  "claim extraction (Pass 1)": "understand", "claim extraction (Pass 2)": "understand",
};

// LLM call roles that fire immediately after a human-readable step event for the same
// operation. These are absorbed into the preceding timeline entry (model name appended
// to params) rather than shown as a separate row.
const MERGE_INTO_PREVIOUS_ROLES = new Set([
  "advocate", "self-consistency", "challenger", "reconciler",
  "validation", "verdict narrative", "auditor", "clustering",
  "claim extraction (Pass 1)", "claim extraction (Pass 2)",
]);

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
  if (msg === "Triggering runner") return { phase: "setup", label: "Triggering runner" };
  if (msg === "Runner started") return { phase: "setup", label: "Analysis started" };
  if (msg.startsWith("Preparing input")) {
    const detail = msg.replace(/^Preparing input\s*/i, "").replace(/[()]/g, "").trim();
    return { phase: "setup", label: "Preparing input", params: detail || undefined };
  }
  if (msg.startsWith("Fetching URL content") || msg.startsWith("Detected URL input")) {
    return { phase: "setup", label: "Fetching URL content" };
  }
  // LLM model selection event emitted at pipeline start
  if (msg.startsWith("LLM:")) {
    const detail = msg.replace(/^LLM:\s*/i, "").trim();
    return { phase: "setup", label: "LLM model", params: detail || undefined, mergeIntoPrevious: true };
  }
  // Per-call LLM trace: "LLM call: <role> — <model>"
  if (msg.startsWith("LLM call:")) {
    const detail = msg.replace(/^LLM call:\s*/i, "").trim();
    const sepIdx = detail.indexOf(" — ");
    const role  = sepIdx >= 0 ? detail.slice(0, sepIdx).trim() : detail;
    const model = sepIdx >= 0 ? detail.slice(sepIdx + 3).trim() : undefined;
    const phase: EventPhase = LLM_CALL_PHASE[role] ?? "understand";
    const label = role.charAt(0).toUpperCase() + role.slice(1);
    if (MERGE_INTO_PREVIOUS_ROLES.has(role)) {
      return { phase, label, params: model || undefined, mergeIntoPrevious: true };
    }
    return { phase, label, params: model || undefined };
  }

  // ── Understand ────────────────────────────────────────────────────────────
  if (msg.startsWith("Extracting claims from input")) return { phase: "understand", label: "Extracting claims" };
  if (msg.startsWith("Extracting claims: Pass 1"))   return { phase: "understand", label: "Scanning input — Pass 1" };
  if (msg.startsWith("Extracting claims: preliminary web search")) return { phase: "understand", label: "Initial web search" };
  if (msg.startsWith("Preliminary search:")) {
    const detail = msg.replace(/^Preliminary search:\s*/i, "").trim();
    return { phase: "understand", label: "Search results", params: detail || undefined };
  }
  if (msg.startsWith("Extracting claims: Pass 2"))   return { phase: "understand", label: "Refining claims — Pass 2" };
  if (msg.startsWith("Extracting claims: Gate 1"))   return { phase: "understand", label: "Gate 1 validation" };
  if (msg.startsWith("Extracting claims: reprompt attempt")) {
    const m = msg.match(/reprompt attempt (\d+\/\d+)/);
    return { phase: "understand", label: "Reprompt", params: m?.[1] };
  }
  if (msg.startsWith("Extracting claims: multi-event reprompt")) return { phase: "understand", label: "Multi-event reprompt" };
  if (msg.startsWith("Validating claim contract fidelity")) {
    return { phase: "understand", label: "Validating claim contract" };
  }
  if (msg.startsWith("Retrying Pass 2 with claim contract guidance")) {
    return { phase: "understand", label: "Retrying Pass 2 with contract guidance" };
  }
  if (msg.startsWith("Extracting claims")) {
    const detail = msg.replace(/^Extracting claims[:\s]*/i, "").trim();
    return { phase: "understand", label: "Extracting claims", params: detail || undefined };
  }
  // Fallback model recovery — label as info (fallback succeeded)
  if (msg.startsWith("Stage 1 Pass 2 recovered via fallback model")) {
    const m = msg.match(/fallback model \(([^)]+)\)/);
    return { phase: "understand", label: "Fallback model used", params: m?.[1], overrideLevel: "info" };
  }

  // ── Research ──────────────────────────────────────────────────────────────
  if (msg.startsWith("Researching evidence"))             return { phase: "research", label: "Searching for evidence" };
  if (msg.startsWith("Running contrarian evidence"))      return { phase: "research", label: "Contrarian evidence search" };
  if (msg.startsWith("Searching for contradicting evidence")) {
    const m = msg.match(/\((\d+\/\d+)\)/);
    return { phase: "research", label: "Contradicting evidence search", params: m?.[1] };
  }
  if (msg.startsWith("Assessing evidence applicability")) return { phase: "research", label: "Filtering evidence" };
  if (msg.startsWith("Evaluating source reliability"))    return { phase: "research", label: "Evaluating source reliability" };
  if (msg.startsWith("Preliminary evidence remap:")) {
    const detail = msg.replace(/^Preliminary evidence remap:\s*/i, "").trim();
    return { phase: "research", label: "Preliminary evidence remap", params: detail || undefined };
  }
  // Successful search event — info, not a warning
  if (msg.startsWith("Search:")) {
    const detail = msg.replace(/^Search:\s*/i, "").trim();
    return { phase: "research", label: "Search results", params: detail || undefined, overrideLevel: "info" };
  }
  if (msg.startsWith("Search provider")) {
    const provider = extractSearchProvider(msg);
    const err = extractSearchError(msg);
    // Individual provider errors are operational info — fallback providers typically recover.
    // Only escalate to warn if the pipeline reports all providers failed (separate event).
    return {
      phase: "research",
      label: "Search provider error",
      params: [provider, err].filter(Boolean).join(" — ") || undefined,
      overrideLevel: "info",
    };
  }
  if (msg.startsWith("Preliminary search error")) {
    const detail = msg.replace(/^Preliminary search error[:\s]*/i, "").trim().slice(0, 80);
    return { phase: "research", label: "Search error", params: detail || undefined };
  }
  if (msg.startsWith("Research time budget reached during contradiction")) {
    return { phase: "research", label: "Contradiction search time limit reached" };
  }
  if (msg.startsWith("Research time budget reached")) {
    const m = msg.match(/\((\d+) min\)/);
    return { phase: "research", label: "Research time limit reached", params: m?.[1] ? `${m[1]} min elapsed` : undefined };
  }
  if (msg.startsWith("No new evidence found in")) {
    const m = msg.match(/in (\d+) consecutive/);
    return { phase: "research", label: "No new evidence found", params: m?.[1] ? `${m[1]} iterations` : undefined };
  }

  // ── Cluster ───────────────────────────────────────────────────────────────
  if (msg.startsWith("Clustering evidence")) return { phase: "cluster", label: "Grouping evidence into boundaries" };

  // ── Verdict ───────────────────────────────────────────────────────────────
  if (msg.startsWith("Generating verdicts"))          return { phase: "verdict", label: "Generating verdicts" };
  if (msg.startsWith("Aggregating final assessment")) return { phase: "verdict", label: "Aggregating assessment" };
  // Debate step events (emitted by verdict stage)
  if (msg.startsWith("Verdict debate: advocate")) {
    const m = msg.match(/(\d+) claim/);
    return { phase: "verdict", label: "Advocate verdict", params: m ? `${m[1]} claims` : undefined };
  }
  if (msg.startsWith("Verdict debate: self-consistency")) {
    return { phase: "verdict", label: "Self-consistency check" };
  }
  if (msg.startsWith("Verdict debate: adversarial challenge")) {
    return { phase: "verdict", label: "Adversarial challenge" };
  }
  if (msg.startsWith("Verdict debate: reconciliation")) {
    return { phase: "verdict", label: "Reconciling verdicts" };
  }
  if (msg.startsWith("Verdict debate: validation")) {
    return { phase: "verdict", label: "Validating verdicts" };
  }

  // ── Quality ───────────────────────────────────────────────────────────────
  if (msg.startsWith("Performing holistic TIGERScore") || msg.startsWith("TIGERScore")) {
    return { phase: "quality", label: "Holistic quality evaluation" };
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (msg.startsWith("Storing result")) return { phase: "done", label: "Storing result" };
  if (msg === "Result stored")          return { phase: "done", label: "Result stored" };
  if (msg === "Done" || msg === "Analysis complete." || msg.startsWith("Analysis complete")) {
    return { phase: "done", label: "Analysis complete" };
  }

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
