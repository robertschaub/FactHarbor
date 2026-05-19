import {
  BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION,
  type BoundedEvidenceExtractionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import { sha256Json } from "@/lib/analyzer-v2/util";

export type BoundedEvidenceExtractionRuntimeOwnedDecision = BoundedEvidenceExtractionDecision;

export type BoundedEvidenceExtractionRuntimeOwnership =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

const DECISION_KEYS = [
  "blockedReason",
  "damagedReason",
  "decisionId",
  "decisionVersion",
  "defaultProjection",
  "evidenceItemCount",
  "evidenceItemStatementByteLengths",
  "evidenceItemStatementHashes",
  "evidenceItemStatementProjections",
  "evidenceItemTextReturnedByDefault",
  "executionTelemetry",
  "extractionResult",
  "extractionResultHash",
  "extractionResultStatus",
  "extractionStatus",
  "kind",
  "outputSchemaVersion",
  "parent",
  "productExecution",
  "promptSectionId",
  "publicCutoverStatus",
  "publicPointerExposure",
  "sideEffects",
  "sourceTextReturnedByDefault",
  "status",
  "taskKey",
  "visibility",
].sort();

const runtimeOwnedDecisions = new WeakMap<object, string>();

export function markBoundedEvidenceExtractionRuntimeOwnedDecision(
  decision: BoundedEvidenceExtractionDecision,
): BoundedEvidenceExtractionRuntimeOwnedDecision {
  runtimeOwnedDecisions.set(decision, sha256Json(decision));
  return decision;
}

export function inspectBoundedEvidenceExtractionRuntimeOwnership(
  value: unknown,
): BoundedEvidenceExtractionRuntimeOwnership {
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
  if (!isBoundedEvidenceExtractionContract(value)) {
    return "not_owned";
  }
  return "owned";
}

export function readBoundedEvidenceExtractionRuntimeOwnedDecision(
  value: unknown,
): BoundedEvidenceExtractionRuntimeOwnedDecision | null {
  return inspectBoundedEvidenceExtractionRuntimeOwnership(value) === "owned"
    ? value as BoundedEvidenceExtractionRuntimeOwnedDecision
    : null;
}

export function isBoundedEvidenceExtractionRuntimeOwnedDecision(
  value: unknown,
): value is BoundedEvidenceExtractionRuntimeOwnedDecision {
  return readBoundedEvidenceExtractionRuntimeOwnedDecision(value) !== null;
}

function isBoundedEvidenceExtractionContract(value: Record<string, unknown>): boolean {
  if (
    value.decisionVersion !== BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION ||
    value.kind !== "bounded_evidence_extraction_execution" ||
    value.visibility !== "internal_admin_only" ||
    value.publicPointerExposure !== "forbidden" ||
    value.publicCutoverStatus !== "blocked_precutover" ||
    value.taskKey !== "evidence_extraction" ||
    value.defaultProjection !== "hash_length_provenance_only" ||
    value.evidenceItemTextReturnedByDefault !== false ||
    value.sourceTextReturnedByDefault !== false
  ) {
    return false;
  }

  const productExecution = value.productExecution;
  if (!isRecord(productExecution)) {
    return false;
  }
  return (
    productExecution.parserExecuted === false &&
    productExecution.reportGenerated === false &&
    productExecution.verdictGenerated === false &&
    productExecution.warningGenerated === false &&
    productExecution.confidenceGenerated === false &&
    productExecution.publicProjectionWritten === false &&
    productExecution.cacheRead === false &&
    productExecution.cacheWrite === false &&
    productExecution.sourceReliabilityRead === false &&
    productExecution.sourceReliabilityWrite === false &&
    productExecution.storageWrite === false
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}
