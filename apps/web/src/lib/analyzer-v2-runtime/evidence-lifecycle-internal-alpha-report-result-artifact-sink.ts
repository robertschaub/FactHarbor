import {
  buildInternalAlphaReportResultCandidate,
  INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
  type InternalAlphaReportResultCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result";
import type { BoundaryVerdictExecutionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import type { BoundaryVerdictCandidateDecision } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import type { BoundedEvidenceExtractionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import type { EvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import type { InternalAlphaReportStopCandidate } from "@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate";
import type { SufficiencyAssessmentDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import type { SufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import { sha256Json } from "@/lib/analyzer-v2/util";
import {
  inspectBoundaryVerdictExecutionRuntimeOwnership,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-provenance";

export const INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.internal-alpha-report-result-artifact.w8b" as const;
export const INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_SERIALIZED_BYTES = 49_152;
export const INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type InternalAlphaReportResultRuntimeArtifact = {
  readonly artifactVersion: typeof INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_boundary_verdict_execution";
  readonly defaultProjection: "admin_structured_candidate_no_source_text";
  readonly decisionHash: string;
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate;
};

export type InternalAlphaReportResultRuntimeArtifactDefaultProjection = {
  readonly artifactVersion: typeof INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly source: "product_v2_orchestrator_after_boundary_verdict_execution";
  readonly defaultProjection: "admin_structured_candidate_no_source_text";
  readonly ledgerIdReturned: false;
  readonly ledgerIdHash: string;
  readonly runIdReturned: false;
  readonly runIdHash: string;
  readonly createdUtc: string;
  readonly decisionHash: string;
  readonly internalAlphaReportResult: {
    readonly decisionVersion: typeof INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION;
    readonly decisionIdReturned: false;
    readonly decisionIdHash: string;
    readonly kind: InternalAlphaReportResultCandidate["kind"];
    readonly status: InternalAlphaReportResultCandidate["status"];
    readonly blockedReason: InternalAlphaReportResultCandidate["blockedReason"];
    readonly damagedReason: InternalAlphaReportResultCandidate["damagedReason"];
    readonly visibility: "internal_admin_only";
    readonly publicPointerExposure: "forbidden";
    readonly publicCutoverStatus: "blocked_precutover";
    readonly defaultProjection: "admin_structured_candidate_no_source_text";
    readonly reportReadiness: InternalAlphaReportResultCandidate["reportReadiness"];
    readonly boundaryVerdictSummary: InternalAlphaReportResultCandidate["boundaryVerdictSummary"];
    readonly evidenceTraceability: InternalAlphaReportResultCandidate["evidenceTraceability"];
    readonly upstreamStopAttribution: InternalAlphaReportResultCandidate["upstreamStopAttribution"];
    readonly warningMaterialityInputs: InternalAlphaReportResultCandidate["warningMaterialityInputs"];
    readonly providerAndCostTelemetry: InternalAlphaReportResultCandidate["providerAndCostTelemetry"];
    readonly redaction: InternalAlphaReportResultCandidate["redaction"];
    readonly sideEffects: InternalAlphaReportResultCandidate["sideEffects"];
    readonly w8aMergeTrigger: InternalAlphaReportResultCandidate["w8aMergeTrigger"];
    readonly approvalPointer: InternalAlphaReportResultCandidate["approvalPointer"];
  };
};

export type InternalAlphaReportResultArtifactRecordResult =
  | {
      readonly status: "recorded";
      readonly artifact: InternalAlphaReportResultRuntimeArtifact;
    }
  | {
      readonly status: "skipped_artifact_oversize";
      readonly artifact: InternalAlphaReportResultRuntimeArtifact;
    }
  | {
      readonly status: "skipped_invalid_ledger_id";
      readonly artifact: null;
    };

type ArtifactLedger = Map<string, InternalAlphaReportResultRuntimeArtifact[]>;
type InternalAlphaReportResultArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2InternalAlphaReportResultArtifactLedgers?: ArtifactLedger;
};

function ledger(): ArtifactLedger {
  const globalLedger = globalThis as InternalAlphaReportResultArtifactLedgerGlobal;
  globalLedger.__factHarborV2InternalAlphaReportResultArtifactLedgers ??=
    new Map<string, InternalAlphaReportResultRuntimeArtifact[]>();
  return globalLedger.__factHarborV2InternalAlphaReportResultArtifactLedgers;
}

function freezeDeep<T>(value: T): T {
  if (!value || typeof value !== "object") {
    return value;
  }
  for (const child of Object.values(value)) {
    freezeDeep(child);
  }
  return Object.freeze(value);
}

function cloneJson<T>(value: T): T {
  return freezeDeep(JSON.parse(JSON.stringify(value)) as T);
}

function recordsForLedger(ledgerId: string): InternalAlphaReportResultRuntimeArtifact[] {
  const store = ledger();
  const existing = store.get(ledgerId);
  if (existing) {
    store.delete(ledgerId);
    store.set(ledgerId, existing);
    return existing;
  }

  const records: InternalAlphaReportResultRuntimeArtifact[] = [];
  store.set(ledgerId, records);
  while (store.size > INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_LEDGER_COUNT) {
    const oldestLedgerId = store.keys().next().value;
    if (!oldestLedgerId) {
      break;
    }
    store.delete(oldestLedgerId);
  }
  return records;
}

function appendBoundedRecord(
  records: InternalAlphaReportResultRuntimeArtifact[],
  artifact: InternalAlphaReportResultRuntimeArtifact,
): void {
  const recordsToDrop = records.length - INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneJson(artifact));
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0 &&
    ledgerId.trim() === ledgerId &&
    ledgerId.length <= INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_LEDGER_ID_LENGTH &&
    /^[A-Za-z0-9:._-]+$/.test(ledgerId);
}

function serializedByteLength(artifact: InternalAlphaReportResultRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

export function buildInternalAlphaReportResultRuntimeArtifact(input: {
  readonly context: PipelineRunContext;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision | null | undefined;
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null | undefined;
  readonly internalAlphaReportStop: InternalAlphaReportStopCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
}): InternalAlphaReportResultRuntimeArtifact {
  const internalAlphaReportResult = buildInternalAlphaReportResultCandidate({
    boundedEvidenceExtraction: input.boundedEvidenceExtraction,
    evidenceItemHandoff: input.evidenceItemHandoff,
    sufficiencyIntake: input.sufficiencyIntake,
    sufficiencyAssessment: input.sufficiencyAssessment,
    boundaryVerdictCandidate: input.boundaryVerdictCandidate,
    internalAlphaReportStop: input.internalAlphaReportStop,
    boundaryVerdictExecution: input.boundaryVerdictExecution,
    boundaryVerdictExecutionRuntimeOwnership:
      inspectBoundaryVerdictExecutionRuntimeOwnership(input.boundaryVerdictExecution),
  });

  return {
    artifactVersion: INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: input.context.observabilityLedger.ledgerId,
    runId: input.context.runId,
    createdUtc: input.context.generatedUtc,
    source: "product_v2_orchestrator_after_boundary_verdict_execution",
    defaultProjection: "admin_structured_candidate_no_source_text",
    decisionHash: sha256Json(internalAlphaReportResult),
    internalAlphaReportResult,
  };
}

export function recordInternalAlphaReportResultRuntimeArtifact(input: {
  readonly context: PipelineRunContext;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision | null | undefined;
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null | undefined;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null | undefined;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null | undefined;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null | undefined;
  readonly internalAlphaReportStop: InternalAlphaReportStopCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
}): InternalAlphaReportResultArtifactRecordResult {
  if (!ledgerIdIsBounded(input.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildInternalAlphaReportResultRuntimeArtifact(input);
  if (serializedByteLength(artifact) > INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_MAX_SERIALIZED_BYTES) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readInternalAlphaReportResultRuntimeArtifacts(
  ledgerId: string,
): readonly InternalAlphaReportResultRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (ledger().get(ledgerId) ?? []).map(cloneJson);
}

export function readInternalAlphaReportResultRuntimeArtifactDefaultProjections(
  ledgerId: string,
): readonly InternalAlphaReportResultRuntimeArtifactDefaultProjection[] {
  return readInternalAlphaReportResultRuntimeArtifacts(ledgerId).map(
    redactInternalAlphaReportResultRuntimeArtifact,
  );
}

export function clearInternalAlphaReportResultRuntimeArtifacts(ledgerId?: string): void {
  const store = ledger();
  if (ledgerId) {
    store.delete(ledgerId);
    return;
  }
  store.clear();
}

export function redactInternalAlphaReportResultRuntimeArtifact(
  artifact: InternalAlphaReportResultRuntimeArtifact,
): InternalAlphaReportResultRuntimeArtifactDefaultProjection {
  const result = artifact.internalAlphaReportResult;
  return cloneJson({
    artifactVersion: artifact.artifactVersion,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    source: artifact.source,
    defaultProjection: "admin_structured_candidate_no_source_text",
    ledgerIdReturned: false,
    ledgerIdHash: sha256Json({ ledgerId: artifact.ledgerId }),
    runIdReturned: false,
    runIdHash: sha256Json({ runId: artifact.runId }),
    createdUtc: artifact.createdUtc,
    decisionHash: artifact.decisionHash,
    internalAlphaReportResult: {
      decisionVersion: result.decisionVersion,
      decisionIdReturned: false,
      decisionIdHash: sha256Json({ decisionId: result.decisionId }),
      kind: result.kind,
      status: result.status,
      blockedReason: result.blockedReason,
      damagedReason: result.damagedReason,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "admin_structured_candidate_no_source_text",
      reportReadiness: result.reportReadiness,
      boundaryVerdictSummary: result.boundaryVerdictSummary,
      evidenceTraceability: result.evidenceTraceability,
      upstreamStopAttribution: result.upstreamStopAttribution,
      warningMaterialityInputs: result.warningMaterialityInputs,
      providerAndCostTelemetry: result.providerAndCostTelemetry,
      redaction: result.redaction,
      sideEffects: result.sideEffects,
      w8aMergeTrigger: result.w8aMergeTrigger,
      approvalPointer: result.approvalPointer,
    },
  });
}
