import {
  EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_DECISION_VERSION,
  type EvidenceLifecycleExecutionReadinessDenialDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial";
import { sha256Json } from "@/lib/analyzer-v2/util";

export type EvidenceLifecycleExecutionReadinessRuntimeOwnedDecision =
  EvidenceLifecycleExecutionReadinessDenialDecision;

export type EvidenceLifecycleExecutionReadinessRuntimeOwnership =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

const DECISION_KEYS = [
  "adminDefaultProjection",
  "decisionId",
  "decisionVersion",
  "deniedAuthority",
  "evidenceItems",
  "executionGateStatus",
  "inputTextReturnedByDefault",
  "kind",
  "packetObservation",
  "parent",
  "parserOutput",
  "productExecution",
  "publicCutoverStatus",
  "publicPointerExposure",
  "reportOutput",
  "status",
  "stopCondition",
  "structuralEligibility",
  "visibility",
].sort();

const runtimeOwnedDecisions = new WeakMap<object, string>();

export function markEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(
  decision: EvidenceLifecycleExecutionReadinessDenialDecision,
): EvidenceLifecycleExecutionReadinessRuntimeOwnedDecision {
  runtimeOwnedDecisions.set(decision, sha256Json(decision));
  return decision;
}

export function inspectEvidenceLifecycleExecutionReadinessRuntimeOwnership(
  value: unknown,
): EvidenceLifecycleExecutionReadinessRuntimeOwnership {
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
  if (!isExecutionReadinessDenialContract(value)) {
    return "not_owned";
  }
  return "owned";
}

export function readEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(
  value: unknown,
): EvidenceLifecycleExecutionReadinessRuntimeOwnedDecision | null {
  return inspectEvidenceLifecycleExecutionReadinessRuntimeOwnership(value) === "owned"
    ? value as EvidenceLifecycleExecutionReadinessRuntimeOwnedDecision
    : null;
}

export function isEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(
  value: unknown,
): value is EvidenceLifecycleExecutionReadinessRuntimeOwnedDecision {
  return readEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(value) !== null;
}

function isExecutionReadinessDenialContract(value: Record<string, unknown>): boolean {
  if (
    value.decisionVersion !== EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_DECISION_VERSION ||
    value.kind !== "evidence_lifecycle_execution_readiness_denial" ||
    value.visibility !== "internal_admin_only" ||
    value.publicPointerExposure !== "forbidden" ||
    value.publicCutoverStatus !== "blocked_precutover" ||
    value.adminDefaultProjection !== "hash_length_provenance_only" ||
    value.inputTextReturnedByDefault !== false ||
    value.executionGateStatus !== "closed_pre_execution" ||
    value.deniedAuthority !== "x7w4i_no_extraction_execution_authority" ||
    !Array.isArray(value.evidenceItems) ||
    value.evidenceItems.length !== 0 ||
    value.parserOutput !== null ||
    value.reportOutput !== null
  ) {
    return false;
  }

  const productExecution = value.productExecution;
  if (!isRecord(productExecution)) {
    return false;
  }
  return (
    productExecution.executionReadinessDecisionCreated === true &&
    productExecution.extractionExecutionAuthorized === false &&
    productExecution.llmExtractionCallAuthorized === false &&
    productExecution.evidenceItemGenerated === false &&
    productExecution.parserExecuted === false &&
    productExecution.reportGenerated === false &&
    productExecution.verdictGenerated === false &&
    productExecution.warningGenerated === false &&
    productExecution.confidenceGenerated === false &&
    productExecution.publicProjectionWritten === false &&
    productExecution.cacheRead === false &&
    productExecution.cacheWrite === false &&
    productExecution.sourceReliabilityRead === false &&
    productExecution.sourceReliabilityWrite === false
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}
