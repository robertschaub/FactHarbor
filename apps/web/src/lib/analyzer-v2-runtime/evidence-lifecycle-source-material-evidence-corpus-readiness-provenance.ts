import { createHash } from "node:crypto";
import type {
  EvidenceCorpusSourceMaterialReadinessDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness";

export type EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision =
  EvidenceCorpusSourceMaterialReadinessDecision;

const SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_VERSION =
  "v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a";

const DECISION_KEYS = [
  "admittedSourceMaterialRecordCount",
  "decisionVersion",
  "downstreamGate",
  "evidenceCorpus",
  "evidenceCorpusBuildAuthorized",
  "evidenceItems",
  "extractionInput",
  "parent",
  "productExecution",
  "publicCutoverStatus",
  "publicPointerExposure",
  "rejectedSourceMaterialRecordCount",
  "sourceMaterialRecord",
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

export function markEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(
  decision: EvidenceCorpusSourceMaterialReadinessDecision,
): EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision {
  runtimeOwnedDecisions.set(decision, sha256Json(decision));
  return decision;
}

export function readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(
  value: unknown,
): EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision | null {
  if (!isRecord(value) || !hasExactKeys(value, DECISION_KEYS)) {
    return null;
  }
  const recordedHash = runtimeOwnedDecisions.get(value);
  if (!recordedHash || recordedHash !== sha256Json(value)) {
    return null;
  }
  if (
    value.decisionVersion !== SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_VERSION
    || value.visibility !== "internal_admin_only"
    || value.publicPointerExposure !== "forbidden"
    || value.downstreamGate !== "evidence_corpus_build_gate_closed"
    || value.publicCutoverStatus !== "blocked_precutover"
    || value.evidenceCorpus !== null
    || value.evidenceCorpusBuildAuthorized !== false
    || value.extractionInput !== null
    || !Array.isArray(value.evidenceItems)
    || value.evidenceItems.length !== 0
  ) {
    return null;
  }
  return value as unknown as EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision;
}

export function isEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(
  value: unknown,
): value is EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision {
  return readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(value) !== null;
}
