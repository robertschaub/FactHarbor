import { createHash } from "node:crypto";
import {
  BOUNDED_EXTRACTION_INPUT_AUTHORIZATION_DECISION_VERSION,
  type BoundedExtractionInputAuthorizationDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";

export type EvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision =
  BoundedExtractionInputAuthorizationDecision;

export type EvidenceLifecycleExtractionInputAuthorizationRuntimeOwnership =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

const DECISION_KEYS = [
  "boundedTextSidecarCount",
  "decisionVersion",
  "downstreamGate",
  "evidenceCorpus",
  "evidenceItemExtractionAuthorized",
  "evidenceItems",
  "extractionExecutionAuthorized",
  "extractionInputPacket",
  "extractionInputPacketCount",
  "llmExtractionCallAuthorized",
  "parent",
  "productExecution",
  "publicCutoverStatus",
  "publicPointerExposure",
  "semanticExtractionAuthorized",
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

export function markEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(
  decision: BoundedExtractionInputAuthorizationDecision,
): EvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision {
  runtimeOwnedDecisions.set(decision, sha256Json(decision));
  return decision;
}

export function inspectEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnership(
  value: unknown,
): EvidenceLifecycleExtractionInputAuthorizationRuntimeOwnership {
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
    value.decisionVersion !== BOUNDED_EXTRACTION_INPUT_AUTHORIZATION_DECISION_VERSION
    || value.visibility !== "internal_admin_only"
    || value.publicPointerExposure !== "forbidden"
    || value.downstreamGate !== "evidence_item_extraction_execution_gate_closed"
    || value.publicCutoverStatus !== "blocked_precutover"
    || value.extractionExecutionAuthorized !== false
    || value.llmExtractionCallAuthorized !== false
    || value.semanticExtractionAuthorized !== false
    || value.evidenceItemExtractionAuthorized !== false
    || value.evidenceCorpus !== null
    || !Array.isArray(value.evidenceItems)
    || value.evidenceItems.length !== 0
  ) {
    return "not_owned";
  }
  return "owned";
}

export function readEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(
  value: unknown,
): EvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision | null {
  return inspectEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnership(value) === "owned"
    ? value as EvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision
    : null;
}

export function isEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(
  value: unknown,
): value is EvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision {
  return readEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(value) !== null;
}
