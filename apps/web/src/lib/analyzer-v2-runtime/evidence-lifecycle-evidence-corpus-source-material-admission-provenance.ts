import { createHash } from "node:crypto";
import type {
  EvidenceCorpusSourceMaterialAdmissionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission";

export type EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision =
  EvidenceCorpusSourceMaterialAdmissionDecision;

export type EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnership =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

const SOURCE_MATERIAL_ADMISSION_VERSION =
  "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c";

const DECISION_KEYS = [
  "admittedCorpusAdmissionInputCount",
  "corpusAdmissionInput",
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
  "rejectedCorpusAdmissionInputCount",
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

export function markEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision(
  decision: EvidenceCorpusSourceMaterialAdmissionDecision,
): EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision {
  runtimeOwnedDecisions.set(decision, sha256Json(decision));
  return decision;
}

export function inspectEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnership(
  value: unknown,
): EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnership {
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
    value.decisionVersion !== SOURCE_MATERIAL_ADMISSION_VERSION
    || value.visibility !== "internal_admin_only"
    || value.publicPointerExposure !== "forbidden"
    || value.downstreamGate !== "evidence_corpus_construction_gate_closed"
    || value.publicCutoverStatus !== "blocked_precutover"
    || value.evidenceCorpus !== null
    || value.evidenceCorpusBuildAuthorized !== false
    || value.extractionInput !== null
    || !Array.isArray(value.evidenceItems)
    || value.evidenceItems.length !== 0
  ) {
    return "not_owned";
  }
  return "owned";
}

export function readEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision(
  value: unknown,
): EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision | null {
  return inspectEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnership(value) === "owned"
    ? value as EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision
    : null;
}

export function isEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision(
  value: unknown,
): value is EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision {
  return readEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision(value) !== null;
}
