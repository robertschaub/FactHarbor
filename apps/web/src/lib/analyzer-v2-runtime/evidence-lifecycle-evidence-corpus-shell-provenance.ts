import { createHash } from "node:crypto";
import type {
  EvidenceCorpusShellDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell";

export type EvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision =
  EvidenceCorpusShellDecision;

export type EvidenceLifecycleEvidenceCorpusShellRuntimeOwnership =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

const SHELL_DECISION_VERSION = "v2.evidence-lifecycle.evidence-corpus-shell.x7w4d";

const DECISION_KEYS = [
  "decisionVersion",
  "downstreamGate",
  "evidenceCorpus",
  "evidenceItemExtractionAuthorized",
  "evidenceItems",
  "extractionInput",
  "parent",
  "productExecution",
  "publicCutoverStatus",
  "publicPointerExposure",
  "semanticExtractionAuthorized",
  "sourceMaterialRecordCount",
  "status",
  "stopReason",
  "visibility",
].sort();

const runtimeOwnedDecisions = new WeakMap<object, string>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export function markEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(
  decision: EvidenceCorpusShellDecision,
): EvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision {
  runtimeOwnedDecisions.set(decision, sha256Json(decision));
  return decision;
}

export function inspectEvidenceLifecycleEvidenceCorpusShellRuntimeOwnership(
  value: unknown,
): EvidenceLifecycleEvidenceCorpusShellRuntimeOwnership {
  if (!isRecord(value) || !hasExactKeys(value, DECISION_KEYS)) {
    return "not_owned";
  }
  const recordedHash = runtimeOwnedDecisions.get(value);
  if (!recordedHash) {
    return "not_owned";
  }
  if (recordedHash !== sha256Json(value)) {
    return "mutated_after_provenance";
  }
  if (
    value.decisionVersion !== SHELL_DECISION_VERSION
    || value.visibility !== "internal_admin_only"
    || value.publicPointerExposure !== "forbidden"
    || value.downstreamGate !== "evidence_item_extraction_gate_closed"
    || value.publicCutoverStatus !== "blocked_precutover"
    || value.semanticExtractionAuthorized !== false
    || value.evidenceItemExtractionAuthorized !== false
    || value.extractionInput !== null
    || !Array.isArray(value.evidenceItems)
    || value.evidenceItems.length !== 0
  ) {
    return "not_owned";
  }
  return "owned";
}

export function readEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(
  value: unknown,
): EvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision | null {
  return inspectEvidenceLifecycleEvidenceCorpusShellRuntimeOwnership(value) === "owned"
    ? value as EvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision
    : null;
}

export function isEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(
  value: unknown,
): value is EvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision {
  return readEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(value) !== null;
}
