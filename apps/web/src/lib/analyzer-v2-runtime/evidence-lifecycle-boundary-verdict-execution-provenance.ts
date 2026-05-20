import {
  BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
  type BoundaryVerdictExecutionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import { sha256Json } from "@/lib/analyzer-v2/util";

export type BoundaryVerdictExecutionRuntimeOwnedDecision = BoundaryVerdictExecutionDecision;

export type BoundaryVerdictExecutionRuntimeOwnership =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

const DECISION_KEYS = [
  "approvalPointer",
  "blockedReason",
  "boundaryCandidateCount",
  "citedEvidenceItemRefs",
  "combinedCallQualityTrigger",
  "damagedReason",
  "decisionId",
  "decisionVersion",
  "defaultProjection",
  "evidenceItemCount",
  "executionTelemetry",
  "inputPacketByteLength",
  "inputPacketHash",
  "kind",
  "outputSchemaVersion",
  "promptSectionId",
  "publicCutoverStatus",
  "publicPointerExposure",
  "redaction",
  "resultPayloadHash",
  "sideEffects",
  "status",
  "taskKey",
  "verdictCandidateCount",
  "visibility",
  "w7aMergeTrigger",
  "warningMaterialityInputs",
].sort();

const runtimeOwnedDecisions = new WeakMap<object, string>();

export function markBoundaryVerdictExecutionRuntimeOwnedDecision(
  decision: BoundaryVerdictExecutionDecision,
): BoundaryVerdictExecutionRuntimeOwnedDecision {
  runtimeOwnedDecisions.set(decision, sha256Json(decision));
  return decision;
}

export function inspectBoundaryVerdictExecutionRuntimeOwnership(
  value: unknown,
): BoundaryVerdictExecutionRuntimeOwnership {
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
  if (!isBoundaryVerdictExecutionContract(value)) {
    return "not_owned";
  }
  return "owned";
}

export function readBoundaryVerdictExecutionRuntimeOwnedDecision(
  value: unknown,
): BoundaryVerdictExecutionRuntimeOwnedDecision | null {
  return inspectBoundaryVerdictExecutionRuntimeOwnership(value) === "owned"
    ? value as BoundaryVerdictExecutionRuntimeOwnedDecision
    : null;
}

export function isBoundaryVerdictExecutionRuntimeOwnedDecision(
  value: unknown,
): value is BoundaryVerdictExecutionRuntimeOwnedDecision {
  return readBoundaryVerdictExecutionRuntimeOwnedDecision(value) !== null;
}

function isBoundaryVerdictExecutionContract(value: Record<string, unknown>): boolean {
  if (
    value.decisionVersion !== BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION ||
    value.kind !== "boundary_verdict_execution" ||
    value.visibility !== "internal_admin_only" ||
    value.publicPointerExposure !== "forbidden" ||
    value.publicCutoverStatus !== "blocked_precutover" ||
    value.taskKey !== "boundary_verdict_execution" ||
    value.defaultProjection !== "hash_length_provenance_only"
  ) {
    return false;
  }

  const redaction = value.redaction;
  const sideEffects = value.sideEffects;
  if (!isRecord(redaction) || !isRecord(sideEffects)) {
    return false;
  }

  return (
    redaction.evidenceItemTextReturned === false &&
    redaction.sourceTextReturned === false &&
    redaction.inputPacketReturned === false &&
    redaction.promptTextReturned === false &&
    redaction.renderedPromptTextReturned === false &&
    redaction.providerPayloadReturned === false &&
    redaction.boundaryCandidateTextReturned === false &&
    redaction.verdictCandidateTextReturned === false &&
    redaction.warningMaterialityTextReturned === false &&
    redaction.hiddenLedgerReferenceReturned === false &&
    redaction.internalStateReturned === false &&
    sideEffects.cacheRead === false &&
    sideEffects.cacheWrite === false &&
    sideEffects.parserExecuted === false &&
    sideEffects.sourceReliabilityRead === false &&
    sideEffects.sourceReliabilityWrite === false &&
    sideEffects.storageWrite === false &&
    sideEffects.reportGenerated === false &&
    sideEffects.verdictGenerated === false &&
    sideEffects.warningGenerated === false &&
    sideEffects.confidenceGenerated === false &&
    sideEffects.publicSurfaceWritten === false
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
