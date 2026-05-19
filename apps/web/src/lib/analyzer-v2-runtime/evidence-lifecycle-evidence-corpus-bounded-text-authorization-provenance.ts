import { createHash } from "node:crypto";
import {
  EVIDENCE_CORPUS_BOUNDED_TEXT_AUTHORIZATION_DECISION_VERSION,
  type EvidenceCorpusBoundedTextAuthorizationDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization";

export type EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision =
  EvidenceCorpusBoundedTextAuthorizationDecision;

export type EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnership =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

const DECISION_KEYS = [
  "boundedTextSidecar",
  "boundedTextSidecarCount",
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

export function markEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(
  decision: EvidenceCorpusBoundedTextAuthorizationDecision,
): EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision {
  runtimeOwnedDecisions.set(decision, sha256Json(decision));
  return decision;
}

export function inspectEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnership(
  value: unknown,
): EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnership {
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
    value.decisionVersion !== EVIDENCE_CORPUS_BOUNDED_TEXT_AUTHORIZATION_DECISION_VERSION
    || value.visibility !== "internal_admin_only"
    || value.publicPointerExposure !== "forbidden"
    || value.downstreamGate !== "evidence_item_extraction_gate_closed"
    || value.publicCutoverStatus !== "blocked_precutover"
    || value.semanticExtractionAuthorized !== false
    || value.evidenceItemExtractionAuthorized !== false
    || value.evidenceCorpus !== null
    || value.extractionInput !== null
    || !Array.isArray(value.evidenceItems)
    || value.evidenceItems.length !== 0
  ) {
    return "not_owned";
  }
  return "owned";
}

export function readEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(
  value: unknown,
): EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision | null {
  return inspectEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnership(value) === "owned"
    ? value as EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision
    : null;
}

export function isEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(
  value: unknown,
): value is EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision {
  return readEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(value) !== null;
}
