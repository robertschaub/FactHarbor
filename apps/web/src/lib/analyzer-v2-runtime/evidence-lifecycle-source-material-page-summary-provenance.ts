import { createHash } from "node:crypto";
import type {
  EvidenceLifecycleSourceMaterialPageSummaryDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner";

export type EvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision =
  EvidenceLifecycleSourceMaterialPageSummaryDecision;

const SOURCE_MATERIAL_PAGE_SUMMARY_VERSION =
  "v2.evidence-lifecycle.source-material.page-summary.x7w3b";

const DECISION_KEYS = [
  "candidateProviderNetworkStatus",
  "downstreamGate",
  "evidenceCorpus",
  "evidenceItems",
  "extractionInput",
  "fetchDiagnosticCount",
  "fetchDiagnostics",
  "locatorVersion",
  "materializedPreviewRecordCount",
  "productExecution",
  "publicCutoverStatus",
  "publicPointerExposure",
  "sourceCandidatePreviewRecordCount",
  "sourceCandidatePreviewStatus",
  "sourceMaterialEndpointId",
  "sourceMaterialRecordCount",
  "sourceMaterialRecords",
  "sourceMaterialVersion",
  "status",
  "stopReason",
  "visibility",
  "attemptedFetchCount",
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

export function markEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(
  decision: EvidenceLifecycleSourceMaterialPageSummaryDecision,
): EvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision {
  runtimeOwnedDecisions.set(decision, sha256Json(decision));
  return decision;
}

export function readEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(
  value: unknown,
): EvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision | null {
  if (!isRecord(value) || !hasExactKeys(value, DECISION_KEYS)) {
    return null;
  }
  const recordedHash = runtimeOwnedDecisions.get(value);
  if (!recordedHash || recordedHash !== sha256Json(value)) {
    return null;
  }
  if (
    value.sourceMaterialVersion !== SOURCE_MATERIAL_PAGE_SUMMARY_VERSION
    || value.visibility !== "internal_admin_only"
    || value.publicPointerExposure !== "forbidden"
    || value.downstreamGate !== "source_material_to_evidence_corpus_gate_closed"
    || value.publicCutoverStatus !== "blocked_precutover"
  ) {
    return null;
  }
  return value as unknown as EvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision;
}

export function isEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(
  value: unknown,
): value is EvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision {
  return readEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(value) !== null;
}
