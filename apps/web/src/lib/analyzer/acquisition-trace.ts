import type {
  AcquisitionEvidenceTraceEntry,
  AcquisitionSourceTraceEntry,
  AcquisitionTraceObservability,
  CBResearchState,
} from "./types";

const SOURCE_TRACE_LIMIT = 500;
const EVIDENCE_TRACE_LIMIT = 500;
const MAX_TEXT_LENGTH = 500;

function compactText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const compacted = value.replace(/\s+/g, " ").trim();
  if (!compacted) return undefined;
  return compacted.length > MAX_TEXT_LENGTH
    ? `${compacted.slice(0, MAX_TEXT_LENGTH - 3)}...`
    : compacted;
}

function trimSourceEntry(entry: AcquisitionSourceTraceEntry): AcquisitionSourceTraceEntry {
  return {
    ...entry,
    claimStatement: compactText(entry.claimStatement),
    query: compactText(entry.query) ?? "",
    url: compactText(entry.url) ?? "",
    title: compactText(entry.title),
  };
}

function trimEvidenceEntry(entry: AcquisitionEvidenceTraceEntry): AcquisitionEvidenceTraceEntry {
  return {
    ...entry,
    query: compactText(entry.query),
    sourceUrl: compactText(entry.sourceUrl),
    sourceTitle: compactText(entry.sourceTitle),
  };
}

export function getAcquisitionTrace(state: CBResearchState): AcquisitionTraceObservability {
  state.acquisitionTrace ??= {
    sourceTrace: [],
    evidenceTrace: [],
    truncated: false,
    limits: {
      sourceTrace: SOURCE_TRACE_LIMIT,
      evidenceTrace: EVIDENCE_TRACE_LIMIT,
    },
  };
  return state.acquisitionTrace;
}

export function recordSourceTrace(
  state: CBResearchState,
  entries: AcquisitionSourceTraceEntry[],
): void {
  if (entries.length === 0) return;
  const trace = getAcquisitionTrace(state);
  const remaining = Math.max(SOURCE_TRACE_LIMIT - trace.sourceTrace.length, 0);
  if (remaining <= 0) {
    trace.truncated = true;
    return;
  }
  trace.sourceTrace.push(...entries.slice(0, remaining).map(trimSourceEntry));
  if (entries.length > remaining) trace.truncated = true;
}

export function recordEvidenceTrace(
  state: CBResearchState,
  entries: AcquisitionEvidenceTraceEntry[],
): void {
  if (entries.length === 0) return;
  const trace = getAcquisitionTrace(state);
  const remaining = Math.max(EVIDENCE_TRACE_LIMIT - trace.evidenceTrace.length, 0);
  if (remaining <= 0) {
    trace.truncated = true;
    return;
  }
  trace.evidenceTrace.push(...entries.slice(0, remaining).map(trimEvidenceEntry));
  if (entries.length > remaining) trace.truncated = true;
}

export function cloneAcquisitionTrace(
  trace: AcquisitionTraceObservability | undefined,
): AcquisitionTraceObservability | undefined {
  if (!trace) return undefined;
  return {
    sourceTrace: trace.sourceTrace.map((entry) => ({ ...entry })),
    evidenceTrace: trace.evidenceTrace.map((entry) => ({
      ...entry,
      relevantClaimIds: entry.relevantClaimIds ? [...entry.relevantClaimIds] : undefined,
    })),
    truncated: trace.truncated,
    limits: { ...trace.limits },
  };
}
