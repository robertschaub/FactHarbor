import {
  SUFFICIENCY_ASSESSMENT_DECISION_VERSION,
  type SufficiencyAssessmentDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import { sha256Json } from "@/lib/analyzer-v2/util";

export type SufficiencyAssessmentRuntimeOwnedDecision = SufficiencyAssessmentDecision;

export type SufficiencyAssessmentRuntimeOwnership =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

const DECISION_KEYS = [
  "admittedEvidenceItemCount",
  "assessmentStatus",
  "blockedReason",
  "damagedReason",
  "decisionId",
  "decisionVersion",
  "defaultProjection",
  "evidenceItemStatementByteLengths",
  "evidenceItemStatementHashes",
  "executionTelemetry",
  "kind",
  "modelId",
  "parentSufficiencyIntakeDecisionId",
  "parentSufficiencyIntakeDecisionVersion",
  "parentW5DecisionId",
  "providerId",
  "publicCutoverStatus",
  "publicPointerExposure",
  "redaction",
  "reportStopRecommendation",
  "sideEffects",
  "sourceMaterialLineageHash",
  "sufficiencyResultPayloadHash",
  "sufficiencyResultStatus",
  "taskKey",
  "taskSchemaVersion",
  "visibility",
  "w4hPacketHash",
].sort();

const runtimeOwnedDecisions = new WeakMap<object, string>();

export function markSufficiencyAssessmentRuntimeOwnedDecision(
  decision: SufficiencyAssessmentDecision,
): SufficiencyAssessmentRuntimeOwnedDecision {
  runtimeOwnedDecisions.set(decision, sha256Json(decision));
  return decision;
}

export function inspectSufficiencyAssessmentRuntimeOwnership(
  value: unknown,
): SufficiencyAssessmentRuntimeOwnership {
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
  if (!isSufficiencyAssessmentContract(value)) {
    return "not_owned";
  }
  return "owned";
}

export function readSufficiencyAssessmentRuntimeOwnedDecision(
  value: unknown,
): SufficiencyAssessmentRuntimeOwnedDecision | null {
  return inspectSufficiencyAssessmentRuntimeOwnership(value) === "owned"
    ? value as SufficiencyAssessmentRuntimeOwnedDecision
    : null;
}

export function isSufficiencyAssessmentRuntimeOwnedDecision(
  value: unknown,
): value is SufficiencyAssessmentRuntimeOwnedDecision {
  return readSufficiencyAssessmentRuntimeOwnedDecision(value) !== null;
}

function isSufficiencyAssessmentContract(value: Record<string, unknown>): boolean {
  if (
    value.decisionVersion !== SUFFICIENCY_ASSESSMENT_DECISION_VERSION ||
    value.kind !== "sufficiency_assessment" ||
    value.visibility !== "internal_admin_only" ||
    value.publicPointerExposure !== "forbidden" ||
    value.publicCutoverStatus !== "blocked_precutover" ||
    value.taskKey !== "evidence_sufficiency" ||
    value.defaultProjection !== "hash_length_provenance_only"
  ) {
    return false;
  }

  const redaction = value.redaction;
  if (!isRecord(redaction)) {
    return false;
  }
  const sideEffects = value.sideEffects;
  if (!isRecord(sideEffects)) {
    return false;
  }

  return (
    redaction.evidenceItemTextReturned === false &&
    redaction.sourceTextReturned === false &&
    redaction.inputPacketReturned === false &&
    redaction.evidenceScopeTextReturned === false &&
    redaction.provenanceTextReturned === false &&
    redaction.promptTextReturned === false &&
    redaction.renderedPromptTextReturned === false &&
    redaction.providerPayloadReturned === false &&
    redaction.sufficiencyResultPayloadReturned === false &&
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
