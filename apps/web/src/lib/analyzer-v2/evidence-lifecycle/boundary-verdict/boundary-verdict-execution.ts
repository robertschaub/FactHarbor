import { createHash } from "node:crypto";

import type { BoundedEvidenceExtractionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import type { EvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import { EVIDENCE_ITEM_HANDOFF_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import type { InternalAlphaReportStopCandidate } from "@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate";
import { INTERNAL_ALPHA_REPORT_STOP_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate";
import type { SufficiencyAssessmentDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import { SUFFICIENCY_ASSESSMENT_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import type { SufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import { SUFFICIENCY_INTAKE_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import { BoundaryVerdictExecutionResultSchema } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas";
import {
  BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
  EVIDENCE_TASK_PROMPT_SECTION_IDS,
  type BoundaryVerdictExecutionResult,
  type EvidenceLifecycleTaskBlockedReason,
  type EvidenceLifecycleTaskDamagedReason,
  type EvidenceLifecycleTaskEvent,
  type ExtractedEvidenceItemContract,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import type { BoundaryVerdictCandidateDecision } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import { BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import { ANALYZER_V2_W7_B_CAPTAIN_APPROVAL } from "@/lib/analyzer-v2/gateway/approval-records";
import { canExecuteAnalyzerV2GatewayTask } from "@/lib/analyzer-v2/gateway/policy";
import type {
  AnalyzerV2CacheDecision,
  AnalyzerV2CacheDimension,
  AnalyzerV2TaskModelPolicy,
} from "@/lib/analyzer-v2/gateway/types";
import {
  getPipelineRunGatewayTask,
  getPipelineRunTaskModelPolicy,
  type PipelineRunContext,
} from "@/lib/analyzer-v2/run-context";
import { sha256Json } from "@/lib/analyzer-v2/util";

export const BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION =
  "v2.evidence-lifecycle.boundary-verdict-execution.w7b" as const;
export const BOUNDARY_VERDICT_EXECUTION_INPUT_PACKET_VERSION =
  "v2.evidence-lifecycle.boundary-verdict-input.w7b" as const;
export const BOUNDARY_VERDICT_EXECUTION_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-20_V2_Slice_W7-B_Boundary_Verdict_LLM_Execution_Approval_Package.md" as const;
export const BOUNDARY_VERDICT_EXECUTION_CACHE_NAMESPACE =
  "analyzer-v2:v2.semantic.boundary-verdict-execution.w7b:boundary_verdict_execution" as const;
export const BOUNDARY_VERDICT_EXECUTION_MAX_EVIDENCE_ITEMS = 50 as const;
export const BOUNDARY_VERDICT_EXECUTION_MAX_PACKET_BYTES = 100_000 as const;
export const BOUNDARY_VERDICT_EXECUTION_SCHEMA_DIAGNOSTICS_REMOVAL_TRIGGER =
  "remove_or_fold_into_stable_w7b_telemetry_after_two_successive_highjump_boundary_verdict_canaries_or_end_of_current_highjump_tranche" as const;

const BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES = 8;
const BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_PATH_SEGMENTS = 8;
const BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_PATH_SEGMENT_LENGTH = 64;
const BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_CODE_LENGTH = 80;

export type BoundaryVerdictExecutionStatus =
  | "boundary_verdict_candidates_created_internal"
  | "boundary_verdict_execution_blocked"
  | "boundary_verdict_execution_damaged";

export type BoundaryVerdictExecutionBlockedReason =
  | "bounded_evidence_extraction_missing"
  | "bounded_evidence_extraction_not_accepted"
  | "evidence_item_handoff_missing"
  | "evidence_item_handoff_not_ready"
  | "sufficiency_intake_missing"
  | "sufficiency_intake_not_ready"
  | "sufficiency_assessment_missing"
  | "sufficiency_assessment_not_completed"
  | "boundary_verdict_candidate_missing"
  | "boundary_verdict_candidate_not_ready"
  | "report_stop_candidate_missing"
  | "report_stop_candidate_not_ready"
  | "lineage_mismatch"
  | "statement_projection_mismatch"
  | "side_effects_not_closed"
  | "sufficiency_stop_refine_retrieval"
  | "sufficiency_stop_damage_report"
  | "boundary_verdict_input_too_large"
  | "prompt_or_model_not_approved"
  | "task_policy_not_executable"
  | "cache_contract_not_no_store"
  | "prompt_render_missing"
  | EvidenceLifecycleTaskBlockedReason;

export type BoundaryVerdictExecutionDamagedReason =
  | "provider_unavailable"
  | "parse_failure"
  | "schema_validation_failed"
  | "task_contract_validation_failed"
  | "provider_telemetry_invalid"
  | EvidenceLifecycleTaskDamagedReason;

export type BoundaryVerdictEvidenceScopeProjection = {
  readonly scopeIdHash: string;
  readonly methodHash: string | null;
  readonly temporalBoundsHash: string | null;
  readonly populationOrDomainHash: string | null;
  readonly geographicScopeHash: string | null;
  readonly limitationCount: number;
  readonly limitationHashes: readonly string[];
};

export type BoundaryVerdictExecutionInputPacketItem = {
  readonly evidenceItemId: string;
  readonly statement: string;
  readonly statementHash: string;
  readonly statementByteLength: number;
  readonly targetAtomicClaimIds: readonly string[];
  readonly claimDirection: ExtractedEvidenceItemContract["claimDirection"];
  readonly probativeValue: ExtractedEvidenceItemContract["probativeValue"];
  readonly evidenceStrength: ExtractedEvidenceItemContract["evidenceStrength"];
  readonly extractionConfidence: ExtractedEvidenceItemContract["extractionConfidence"];
  readonly evidenceScopeHash: string;
  readonly evidenceScope: BoundaryVerdictEvidenceScopeProjection;
  readonly provenanceHash: string;
};

export type BoundaryVerdictExecutionInputPacket = {
  readonly packetVersion: typeof BOUNDARY_VERDICT_EXECUTION_INPUT_PACKET_VERSION;
  readonly packetId: string;
  readonly parentW5DecisionId: string;
  readonly parentW5FDecisionId: string;
  readonly parentW6BDecisionId: string;
  readonly parentW6CDecisionId: string;
  readonly parentW7ADecisionId: string;
  readonly parentW8ADecisionId: string;
  readonly evidenceItemCount: number;
  readonly evidenceItems: readonly BoundaryVerdictExecutionInputPacketItem[];
  readonly sufficiencyAssessmentProjection: {
    readonly sufficiencyResultStatus: SufficiencyAssessmentDecision["sufficiencyResultStatus"];
    readonly reportStopRecommendation: SufficiencyAssessmentDecision["reportStopRecommendation"];
    readonly sufficiencyResultPayloadHash: string | null;
  };
  readonly warningMaterialitySeed: {
    readonly upstreamSufficiencyStatus: SufficiencyAssessmentDecision["sufficiencyResultStatus"];
    readonly upstreamRecommendedNextAction: SufficiencyAssessmentDecision["reportStopRecommendation"];
    readonly userVisibleWarningPublication: "closed";
  };
  readonly sourceMaterialLineageHash: string;
  readonly sourceProviderId: string;
  readonly parentEvidenceExtractionModelId: string;
};

export type BoundaryVerdictExecutionProviderTelemetry = {
  readonly providerId: string;
  readonly modelId: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly durationMs: number;
};

export type BoundaryVerdictExecutionProviderCallRequest = {
  readonly renderedPrompt: string;
  readonly promptContentHash: string;
  readonly outputSchemaVersion: typeof BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION;
  readonly attemptNumber: number;
  readonly maxAttempts: number;
  readonly modelPolicy: AnalyzerV2TaskModelPolicy;
  readonly inputPacket: BoundaryVerdictExecutionInputPacket;
};

export type BoundaryVerdictExecutionProviderCallResponse = {
  readonly output: unknown;
  readonly telemetry: BoundaryVerdictExecutionProviderTelemetry;
};

export type BoundaryVerdictExecutionProviderCall = (
  request: BoundaryVerdictExecutionProviderCallRequest,
) => Promise<BoundaryVerdictExecutionProviderCallResponse>;

export type BoundaryVerdictExecutionSchemaDiagnosticIssue = {
  readonly path: readonly string[];
  readonly code: string;
};

export type BoundaryVerdictExecutionSchemaDiagnostics = {
  readonly diagnosticVersion: "v2.evidence-lifecycle.boundary-verdict-execution.schema-diagnostics.hj2";
  readonly contractName: "BoundaryVerdictExecutionResultSchema";
  readonly contractVersion: typeof BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION;
  readonly outputParseStatus: "not_attempted" | "parse_failure" | "parsed";
  readonly failureCategory:
    | "none"
    | "parse_failure"
    | "schema_validation"
    | "task_contract_validation";
  readonly issueCount: number;
  readonly issues: readonly BoundaryVerdictExecutionSchemaDiagnosticIssue[];
  readonly rawProviderOutputReturned: false;
  readonly rawSchemaMessagesReturned: false;
  readonly providerCompletionTextReturned: false;
  readonly sourceTextReturned: false;
  readonly inputTextReturned: false;
  readonly evidenceItemTextReturned: false;
  readonly promptTextReturned: false;
  readonly stackTraceReturned: false;
  readonly removalTrigger: typeof BOUNDARY_VERDICT_EXECUTION_SCHEMA_DIAGNOSTICS_REMOVAL_TRIGGER;
};

export type BoundaryVerdictExecutionModelAttempt = {
  readonly attemptNumber: number;
  readonly promptContentHash: string;
  readonly status: "accepted" | "invalid_schema" | "parse_failure" | "provider_failure";
  readonly providerTelemetry: BoundaryVerdictExecutionProviderTelemetry | null;
  readonly failureCode: string | null;
  readonly schemaDiagnostics: BoundaryVerdictExecutionSchemaDiagnostics | null;
};

export type BoundaryVerdictExecutionTelemetry = {
  readonly gatewayTaskId: "boundary_verdict_execution";
  readonly promptSectionId: typeof EVIDENCE_TASK_PROMPT_SECTION_IDS.boundary_verdict_execution;
  readonly promptContentHash: string | null;
  readonly renderedPromptHash: string | null;
  readonly inputPacketHash: string | null;
  readonly inputPacketByteLength: number | null;
  readonly outputSchemaVersion: typeof BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION;
  readonly schemaDiagnostics: BoundaryVerdictExecutionSchemaDiagnostics | null;
  readonly modelPolicyId: string | null;
  readonly providerId: string | null;
  readonly modelId: string | null;
  readonly attemptCount: number;
  readonly schemaRetryCount: number;
  readonly tokenUsage: {
    readonly inputTokens: number | null;
    readonly outputTokens: number | null;
    readonly totalTokens: number | null;
  };
  readonly durationMs: number | null;
  readonly cacheDecision: "no_store_no_read";
  readonly cacheDecisionReason: AnalyzerV2CacheDecision["reason"] | null;
  readonly cachePolicyId: string | null;
  readonly approvalPointer: typeof BOUNDARY_VERDICT_EXECUTION_SOURCE_PACKAGE;
};

export type BoundaryVerdictExecutionSideEffects = {
  readonly boundaryVerdictLlmCalled: boolean;
  readonly promptLoaded: boolean;
  readonly promptRendered: boolean;
  readonly adapterCalled: boolean;
  readonly modelCalled: boolean;
  readonly providerCallbackCreated: boolean;
  readonly providerSdkLoaded: boolean;
  readonly cacheDecisionConstructed: boolean;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly parserExecuted: false;
  readonly sourceReliabilityRead: false;
  readonly sourceReliabilityWrite: false;
  readonly storageWrite: false;
  readonly reportGenerated: false;
  readonly verdictGenerated: false;
  readonly warningGenerated: false;
  readonly confidenceGenerated: false;
  readonly publicSurfaceWritten: false;
};

export type BoundaryVerdictExecutionDecision = {
  readonly decisionVersion: typeof BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION;
  readonly decisionId: string;
  readonly kind: "boundary_verdict_execution";
  readonly status: BoundaryVerdictExecutionStatus;
  readonly blockedReason: BoundaryVerdictExecutionBlockedReason | null;
  readonly damagedReason: BoundaryVerdictExecutionDamagedReason | null;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly defaultProjection: "hash_length_provenance_only";
  readonly taskKey: "boundary_verdict_execution";
  readonly promptSectionId: typeof EVIDENCE_TASK_PROMPT_SECTION_IDS.boundary_verdict_execution;
  readonly outputSchemaVersion: typeof BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION;
  readonly inputPacketHash: string | null;
  readonly inputPacketByteLength: number | null;
  readonly evidenceItemCount: number;
  readonly boundaryCandidateCount: number;
  readonly verdictCandidateCount: number;
  readonly citedEvidenceItemRefs: readonly string[];
  readonly resultPayloadHash: string | null;
  readonly warningMaterialityInputs: {
    readonly warningPublication: "closed";
    readonly userVisibleWarningCount: 0;
    readonly upstreamSufficiencyStatus: SufficiencyAssessmentDecision["sufficiencyResultStatus"];
    readonly upstreamRecommendedNextAction: SufficiencyAssessmentDecision["reportStopRecommendation"];
    readonly boundaryVerdictIntegrityEventCount: number;
    readonly candidateMaterialUncertaintySignalCount: number;
  };
  readonly executionTelemetry: BoundaryVerdictExecutionTelemetry;
  readonly redaction: {
    readonly evidenceItemTextReturned: false;
    readonly sourceTextReturned: false;
    readonly inputPacketReturned: false;
    readonly promptTextReturned: false;
    readonly renderedPromptTextReturned: false;
    readonly providerPayloadReturned: false;
    readonly boundaryCandidateTextReturned: false;
    readonly verdictCandidateTextReturned: false;
    readonly warningMaterialityTextReturned: false;
    readonly hiddenLedgerReferenceReturned: false;
    readonly internalStateReturned: false;
  };
  readonly sideEffects: BoundaryVerdictExecutionSideEffects;
  readonly w7aMergeTrigger:
    "merge_w7a_after_w7b_verifier_stable_and_fail_closed_parity_covered";
  readonly combinedCallQualityTrigger:
    "compare_first_successful_benchmark_family_candidate_against_best_available_boundary_comparator";
  readonly approvalPointer: typeof BOUNDARY_VERDICT_EXECUTION_SOURCE_PACKAGE;
};

export type RunBoundaryVerdictExecutionRequest = {
  readonly context: PipelineRunContext;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision | null;
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null;
  readonly internalAlphaReportStop: InternalAlphaReportStopCandidate | null;
  readonly renderedPrompt: string;
  readonly promptContentHash: string;
  readonly configSnapshotHash: string;
  readonly providerCall: BoundaryVerdictExecutionProviderCall;
  readonly providerCallbackCreated?: boolean;
  readonly providerSdkLoaded?: boolean;
};

type CacheKeyInput = Partial<Record<AnalyzerV2CacheDimension, string | number>>;

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function isRealValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function noSideEffects(
  overrides: Partial<BoundaryVerdictExecutionSideEffects> = {},
): BoundaryVerdictExecutionSideEffects {
  return {
    boundaryVerdictLlmCalled: false,
    promptLoaded: false,
    promptRendered: false,
    adapterCalled: false,
    modelCalled: false,
    providerCallbackCreated: false,
    providerSdkLoaded: false,
    cacheDecisionConstructed: false,
    cacheRead: false,
    cacheWrite: false,
    parserExecuted: false,
    sourceReliabilityRead: false,
    sourceReliabilityWrite: false,
    storageWrite: false,
    reportGenerated: false,
    verdictGenerated: false,
    warningGenerated: false,
    confidenceGenerated: false,
    publicSurfaceWritten: false,
    ...overrides,
  };
}

function telemetry(
  overrides: Partial<BoundaryVerdictExecutionTelemetry> = {},
): BoundaryVerdictExecutionTelemetry {
  return {
    gatewayTaskId: "boundary_verdict_execution",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.boundary_verdict_execution,
    promptContentHash: null,
    renderedPromptHash: null,
    inputPacketHash: null,
    inputPacketByteLength: null,
    outputSchemaVersion: BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
    schemaDiagnostics: null,
    modelPolicyId: null,
    providerId: null,
    modelId: null,
    attemptCount: 0,
    schemaRetryCount: 0,
    tokenUsage: {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
    },
    durationMs: null,
    cacheDecision: "no_store_no_read",
    cacheDecisionReason: null,
    cachePolicyId: null,
    approvalPointer: BOUNDARY_VERDICT_EXECUTION_SOURCE_PACKAGE,
    ...overrides,
  };
}

function textOrNullHash(value: string | null): string | null {
  return value === null ? null : sha256Text(value);
}

function evidenceScopeProjection(
  scope: ExtractedEvidenceItemContract["evidenceScope"],
): BoundaryVerdictEvidenceScopeProjection {
  return {
    scopeIdHash: sha256Text(scope.scopeId),
    methodHash: textOrNullHash(scope.method),
    temporalBoundsHash: textOrNullHash(scope.temporalBounds),
    populationOrDomainHash: textOrNullHash(scope.populationOrDomain),
    geographicScopeHash: textOrNullHash(scope.geographicScope),
    limitationCount: scope.limitations.length,
    limitationHashes: scope.limitations.map((limitation) => sha256Text(limitation)),
  };
}

function packetItem(item: ExtractedEvidenceItemContract): BoundaryVerdictExecutionInputPacketItem {
  return {
    evidenceItemId: item.evidenceItemId,
    statement: item.statement,
    statementHash: sha256Text(item.statement),
    statementByteLength: utf8ByteLength(item.statement),
    targetAtomicClaimIds: item.targetAtomicClaimIds.map((claimId) => claimId),
    claimDirection: item.claimDirection,
    probativeValue: item.probativeValue,
    evidenceStrength: item.evidenceStrength,
    extractionConfidence: item.extractionConfidence,
    evidenceScopeHash: sha256Json(item.evidenceScope),
    evidenceScope: evidenceScopeProjection(item.evidenceScope),
    provenanceHash: sha256Json(item.provenance),
  };
}

function parentSideEffectsClosed(input: {
  readonly w5: BoundedEvidenceExtractionDecision;
  readonly handoff: EvidenceItemHandoffDecision;
  readonly intake: SufficiencyIntakeDecision;
  readonly assessment: SufficiencyAssessmentDecision;
  readonly w7a: BoundaryVerdictCandidateDecision;
  readonly w8a: InternalAlphaReportStopCandidate;
}): boolean {
  return input.w5.sideEffects.cacheRead === false &&
    input.w5.sideEffects.cacheWrite === false &&
    input.w5.sideEffects.parserExecuted === false &&
    input.w5.sideEffects.sourceReliabilityCalled === false &&
    input.w5.sideEffects.storageWrite === false &&
    input.w5.sideEffects.reportGenerated === false &&
    input.w5.sideEffects.verdictGenerated === false &&
    input.w5.sideEffects.warningGenerated === false &&
    input.w5.sideEffects.confidenceGenerated === false &&
    input.w5.sideEffects.publicSurfaceWritten === false &&
    input.w5.productExecution.cacheRead === false &&
    input.w5.productExecution.cacheWrite === false &&
    input.w5.productExecution.parserExecuted === false &&
    input.w5.productExecution.sourceReliabilityRead === false &&
    input.w5.productExecution.sourceReliabilityWrite === false &&
    input.w5.productExecution.storageWrite === false &&
    input.w5.productExecution.reportGenerated === false &&
    input.w5.productExecution.verdictGenerated === false &&
    input.w5.productExecution.warningGenerated === false &&
    input.w5.productExecution.confidenceGenerated === false &&
    input.w5.productExecution.publicProjectionWritten === false &&
    input.handoff.sideEffects.evidenceItemTextReturned === false &&
    input.handoff.sideEffects.sourceTextReturned === false &&
    input.handoff.sideEffects.inputTextReturned === false &&
    input.handoff.sideEffects.cacheRead === false &&
    input.handoff.sideEffects.cacheWrite === false &&
    input.handoff.sideEffects.parserExecuted === false &&
    input.handoff.sideEffects.sourceReliabilityRead === false &&
    input.handoff.sideEffects.sourceReliabilityWrite === false &&
    input.handoff.sideEffects.storageWrite === false &&
    input.handoff.sideEffects.reportGenerated === false &&
    input.handoff.sideEffects.verdictGenerated === false &&
    input.handoff.sideEffects.warningGenerated === false &&
    input.handoff.sideEffects.confidenceGenerated === false &&
    input.handoff.sideEffects.publicSurfaceWritten === false &&
    input.intake.sideEffects.cacheRead === false &&
    input.intake.sideEffects.cacheWrite === false &&
    input.intake.sideEffects.parserExecuted === false &&
    input.intake.sideEffects.sourceReliabilityRead === false &&
    input.intake.sideEffects.sourceReliabilityWrite === false &&
    input.intake.sideEffects.storageWrite === false &&
    input.intake.sideEffects.reportGenerated === false &&
    input.intake.sideEffects.verdictGenerated === false &&
    input.intake.sideEffects.warningGenerated === false &&
    input.intake.sideEffects.confidenceGenerated === false &&
    input.intake.sideEffects.publicSurfaceWritten === false &&
    input.assessment.sideEffects.cacheRead === false &&
    input.assessment.sideEffects.cacheWrite === false &&
    input.assessment.sideEffects.parserExecuted === false &&
    input.assessment.sideEffects.sourceReliabilityRead === false &&
    input.assessment.sideEffects.sourceReliabilityWrite === false &&
    input.assessment.sideEffects.storageWrite === false &&
    input.assessment.sideEffects.reportGenerated === false &&
    input.assessment.sideEffects.verdictGenerated === false &&
    input.assessment.sideEffects.warningGenerated === false &&
    input.assessment.sideEffects.confidenceGenerated === false &&
    input.assessment.sideEffects.publicSurfaceWritten === false &&
    input.w7a.sideEffects.cacheRead === false &&
    input.w7a.sideEffects.cacheWrite === false &&
    input.w7a.sideEffects.parserExecuted === false &&
    input.w7a.sideEffects.sourceReliabilityRead === false &&
    input.w7a.sideEffects.sourceReliabilityWrite === false &&
    input.w7a.sideEffects.storageWrite === false &&
    input.w7a.sideEffects.reportGenerated === false &&
    input.w7a.sideEffects.verdictGenerated === false &&
    input.w7a.sideEffects.warningGenerated === false &&
    input.w7a.sideEffects.confidenceGenerated === false &&
    input.w7a.sideEffects.publicSurfaceWritten === false &&
    input.w8a.sideEffects.cacheRead === false &&
    input.w8a.sideEffects.cacheWrite === false &&
    input.w8a.sideEffects.parserExecuted === false &&
    input.w8a.sideEffects.sourceReliabilityRead === false &&
    input.w8a.sideEffects.sourceReliabilityWrite === false &&
    input.w8a.sideEffects.storageWrite === false &&
    input.w8a.sideEffects.reportProseGenerated === false &&
    input.w8a.sideEffects.boundaryCandidatesGenerated === false &&
    input.w8a.sideEffects.verdictCandidateGenerated === false &&
    input.w8a.sideEffects.verdictGenerated === false &&
    input.w8a.sideEffects.warningGenerated === false &&
    input.w8a.sideEffects.confidenceGenerated === false &&
    input.w8a.sideEffects.publicSurfaceWritten === false;
}

function validateParents(request: RunBoundaryVerdictExecutionRequest): BoundaryVerdictExecutionBlockedReason | null {
  const w5 = request.boundedEvidenceExtraction;
  const handoff = request.evidenceItemHandoff;
  const intake = request.sufficiencyIntake;
  const assessment = request.sufficiencyAssessment;
  const w7a = request.boundaryVerdictCandidate;
  const w8a = request.internalAlphaReportStop;

  if (!w5) return "bounded_evidence_extraction_missing";
  if (
    w5.status !== "hidden_evidence_item_extraction_completed" ||
    w5.extractionResultStatus !== "accepted" ||
    w5.extractionStatus !== "evidence_extracted" ||
    w5.extractionResult?.status !== "accepted" ||
    w5.evidenceItemCount <= 0
  ) {
    return "bounded_evidence_extraction_not_accepted";
  }
  if (!handoff) return "evidence_item_handoff_missing";
  if (handoff.handoffStatus !== "evidence_items_ready_for_downstream_internal_handoff") {
    return "evidence_item_handoff_not_ready";
  }
  if (!intake) return "sufficiency_intake_missing";
  if (intake.intakeStatus !== "sufficiency_intake_ready_for_contract_only_assessment") {
    return "sufficiency_intake_not_ready";
  }
  if (!assessment) return "sufficiency_assessment_missing";
  if (assessment.assessmentStatus !== "sufficiency_assessment_completed") {
    return "sufficiency_assessment_not_completed";
  }
  if (assessment.reportStopRecommendation === "refine_retrieval") return "sufficiency_stop_refine_retrieval";
  if (assessment.reportStopRecommendation === "damage_report") return "sufficiency_stop_damage_report";
  if (!w7a) return "boundary_verdict_candidate_missing";
  if (w7a.status !== "boundary_verdict_candidate_ready") return "boundary_verdict_candidate_not_ready";
  if (!w8a) return "report_stop_candidate_missing";
  if (w8a.status !== "alpha_report_stop_created_not_report_ready") return "report_stop_candidate_not_ready";
  if (!parentSideEffectsClosed({ w5, handoff, intake, assessment, w7a, w8a })) {
    return "side_effects_not_closed";
  }
  if (!parentLineageMatches({ w5, handoff, intake, assessment, w7a, w8a })) {
    return "lineage_mismatch";
  }
  if (!statementProjectionMatches({ w5, handoff, intake, assessment })) {
    return "statement_projection_mismatch";
  }
  if (w5.evidenceItemCount > BOUNDARY_VERDICT_EXECUTION_MAX_EVIDENCE_ITEMS) {
    return "boundary_verdict_input_too_large";
  }
  return null;
}

function parentLineageMatches(input: {
  readonly w5: BoundedEvidenceExtractionDecision;
  readonly handoff: EvidenceItemHandoffDecision;
  readonly intake: SufficiencyIntakeDecision;
  readonly assessment: SufficiencyAssessmentDecision;
  readonly w7a: BoundaryVerdictCandidateDecision;
  readonly w8a: InternalAlphaReportStopCandidate;
}): boolean {
  return input.handoff.decisionVersion === EVIDENCE_ITEM_HANDOFF_DECISION_VERSION &&
    input.intake.decisionVersion === SUFFICIENCY_INTAKE_DECISION_VERSION &&
    input.assessment.decisionVersion === SUFFICIENCY_ASSESSMENT_DECISION_VERSION &&
    input.w7a.decisionVersion === BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION &&
    input.w8a.decisionVersion === INTERNAL_ALPHA_REPORT_STOP_DECISION_VERSION &&
    input.handoff.parentW5ArtifactId === input.w5.decisionId &&
    input.intake.parentEvidenceItemHandoffDecisionId === input.handoff.decisionId &&
    input.assessment.parentSufficiencyIntakeDecisionId === input.intake.decisionId &&
    input.assessment.parentW5DecisionId === input.w5.decisionId &&
    input.w7a.inputLineage.evidenceItemHandoffDecisionId === input.handoff.decisionId &&
    input.w7a.inputLineage.sufficiencyIntakeDecisionId === input.intake.decisionId &&
    input.w7a.inputLineage.sufficiencyAssessmentDecisionId === input.assessment.decisionId &&
    input.w8a.inputLineage.evidenceItemHandoffDecisionId === input.handoff.decisionId &&
    input.w8a.inputLineage.sufficiencyIntakeDecisionId === input.intake.decisionId &&
    input.w8a.inputLineage.sufficiencyAssessmentDecisionId === input.assessment.decisionId &&
    input.w8a.inputLineage.boundaryVerdictCandidateDecisionId === input.w7a.decisionId &&
    isRealValue(input.handoff.sourceMaterialLineageHash) &&
    isRealValue(input.handoff.w4hPacketHash) &&
    isRealValue(input.handoff.providerId) &&
    isRealValue(input.handoff.modelId) &&
    input.handoff.sourceMaterialLineageHash === input.intake.sourceMaterialLineageHash &&
    input.handoff.sourceMaterialLineageHash === input.assessment.sourceMaterialLineageHash &&
    input.handoff.w4hPacketHash === input.intake.w4hPacketHash &&
    input.handoff.w4hPacketHash === input.assessment.w4hPacketHash &&
    input.handoff.providerId === input.intake.providerId &&
    input.handoff.providerId === input.assessment.providerId &&
    input.handoff.modelId === input.intake.modelId &&
    input.handoff.modelId === input.assessment.modelId;
}

function statementProjectionMatches(input: {
  readonly w5: BoundedEvidenceExtractionDecision;
  readonly handoff: EvidenceItemHandoffDecision;
  readonly intake: SufficiencyIntakeDecision;
  readonly assessment: SufficiencyAssessmentDecision;
}): boolean {
  const result = input.w5.extractionResult;
  if (result?.status !== "accepted" || result.evidenceItems.length !== input.w5.evidenceItemCount) {
    return false;
  }
  const hashSets = [
    input.w5.evidenceItemStatementHashes,
    input.handoff.evidenceItemStatementHashes,
    input.intake.evidenceItemStatementHashes,
    input.assessment.evidenceItemStatementHashes,
  ];
  const lengthSets = [
    input.w5.evidenceItemStatementByteLengths,
    input.handoff.evidenceItemStatementByteLengths,
    input.intake.evidenceItemStatementByteLengths,
    input.assessment.evidenceItemStatementByteLengths,
  ];
  if (
    hashSets.some((hashes) => hashes.length !== input.w5.evidenceItemCount) ||
    lengthSets.some((lengths) => lengths.length !== input.w5.evidenceItemCount)
  ) {
    return false;
  }
  return result.evidenceItems.every((item, index) => {
    const hash = sha256Text(item.statement);
    const length = utf8ByteLength(item.statement);
    return hashSets.every((hashes) => hashes[index] === hash) &&
      lengthSets.every((lengths) => lengths[index] === length);
  });
}

function buildInputPacket(request: RunBoundaryVerdictExecutionRequest): BoundaryVerdictExecutionInputPacket {
  const w5 = request.boundedEvidenceExtraction!;
  const handoff = request.evidenceItemHandoff!;
  const intake = request.sufficiencyIntake!;
  const assessment = request.sufficiencyAssessment!;
  const w7a = request.boundaryVerdictCandidate!;
  const w8a = request.internalAlphaReportStop!;
  const evidenceItems = w5.extractionResult?.status === "accepted"
    ? w5.extractionResult.evidenceItems.map(packetItem)
    : [];
  const base = {
    packetVersion: BOUNDARY_VERDICT_EXECUTION_INPUT_PACKET_VERSION,
    parentW5DecisionId: w5.decisionId,
    parentW5FDecisionId: handoff.decisionId,
    parentW6BDecisionId: intake.decisionId,
    parentW6CDecisionId: assessment.decisionId,
    parentW7ADecisionId: w7a.decisionId,
    parentW8ADecisionId: w8a.decisionId,
    evidenceItemCount: evidenceItems.length,
    evidenceItems,
    sufficiencyAssessmentProjection: {
      sufficiencyResultStatus: assessment.sufficiencyResultStatus,
      reportStopRecommendation: assessment.reportStopRecommendation,
      sufficiencyResultPayloadHash: assessment.sufficiencyResultPayloadHash,
    },
    warningMaterialitySeed: {
      upstreamSufficiencyStatus: assessment.sufficiencyResultStatus,
      upstreamRecommendedNextAction: assessment.reportStopRecommendation,
      userVisibleWarningPublication: "closed" as const,
    },
    sourceMaterialLineageHash: handoff.sourceMaterialLineageHash!,
    sourceProviderId: handoff.providerId!,
    parentEvidenceExtractionModelId: handoff.modelId!,
  };
  return {
    ...base,
    packetId: `BOUNDARY_VERDICT_INPUT_${sha256Json(base).slice(0, 24).toUpperCase()}`,
  };
}

function hasCacheDimensionValue(input: CacheKeyInput, dimension: AnalyzerV2CacheDimension): boolean {
  const value = input[dimension];
  return (typeof value === "string" && value.trim().length > 0)
    || (typeof value === "number" && Number.isFinite(value));
}

function buildNoStoreCacheDecision(params: {
  readonly context: PipelineRunContext;
  readonly modelPolicy: AnalyzerV2TaskModelPolicy;
  readonly inputPacket: BoundaryVerdictExecutionInputPacket;
  readonly promptContentHash: string;
  readonly configSnapshotHash: string;
}): AnalyzerV2CacheDecision {
  const task = getPipelineRunGatewayTask(params.context, "boundary_verdict_execution");
  const policy = task.cachePolicy;
  const input: CacheKeyInput = {
    promptProfile: "claimboundary-v2",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.boundary_verdict_execution,
    promptContentHash: params.promptContentHash,
    modelTask: params.modelPolicy.modelTask,
    provider: params.inputPacket.sourceProviderId,
    modelName: params.inputPacket.parentEvidenceExtractionModelId,
    temperature: params.modelPolicy.temperature,
    outputSchemaVersion: BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
    configSnapshotHash: params.configSnapshotHash,
    resultSchemaVersion: BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
    inputIdentityHash: sha256Json({
      packetId: params.inputPacket.packetId,
      packetHash: sha256Json(params.inputPacket),
      parentW5DecisionId: params.inputPacket.parentW5DecisionId,
      parentW5FDecisionId: params.inputPacket.parentW5FDecisionId,
    }),
    sourceIdentityHash: params.inputPacket.sourceMaterialLineageHash,
    currentDateBucket: params.context.currentDate,
    adapterVersion: BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
  };
  const missingDimensions = (policy?.requiredDimensions ?? []).filter(
    (dimension) => !hasCacheDimensionValue(input, dimension),
  );

  return {
    namespace: BOUNDARY_VERDICT_EXECUTION_CACHE_NAMESPACE,
    canRead: false,
    canWrite: false,
    reason: missingDimensions.length > 0
      ? "no_store_due_to_incomplete_dimensions"
      : "no_store_runtime_dispatch_safety",
    missingDimensions,
    keyParts: missingDimensions.length > 0 || !policy
      ? []
      : [...policy.requiredDimensions, ...policy.optionalDimensions]
        .filter((dimension) => hasCacheDimensionValue(input, dimension))
        .map((dimension) => ({
          dimension,
          value: String(input[dimension]),
        })),
  };
}

function parseProviderOutputText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (directParseError) {
    const trimmed = text.trim();
    const fencedJson = trimmed.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i);
    if (!fencedJson) {
      throw directParseError;
    }
    return JSON.parse(fencedJson[1]);
  }
}

function coerceProviderOutput(output: unknown): { readonly status: "parsed"; readonly value: unknown } | {
  readonly status: "parse_failure";
} {
  if (typeof output !== "string") {
    return { status: "parsed", value: output };
  }
  try {
    return { status: "parsed", value: parseProviderOutputText(output) };
  } catch {
    return { status: "parse_failure" };
  }
}

function providerTelemetryValid(input: BoundaryVerdictExecutionProviderTelemetry): boolean {
  return isRealValue(input.providerId)
    && isRealValue(input.modelId)
    && [input.inputTokens, input.outputTokens, input.totalTokens, input.durationMs]
      .every((value) => Number.isFinite(value) && value >= 0);
}

function boundedDiagnosticCode(value: string): string {
  return value
    .replace(/[^A-Za-z0-9_.-]/g, "_")
    .slice(0, BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_CODE_LENGTH) || "unknown";
}

function boundedDiagnosticPathSegment(value: string): string {
  return value.slice(0, BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_PATH_SEGMENT_LENGTH);
}

function sanitizeSchemaPathSegment(segment: unknown): string {
  if (typeof segment === "string" && /^[A-Za-z0-9_-]+$/.test(segment)) {
    return boundedDiagnosticPathSegment(segment);
  }
  if (typeof segment === "number" && Number.isInteger(segment) && segment >= 0) {
    return String(segment);
  }
  return "[non_structural]";
}

function isDiagnosticRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function collectSchemaIssueDiagnostics(rawIssues: readonly unknown[]): readonly {
  readonly path?: readonly unknown[];
  readonly code: string;
}[] {
  const collected: Array<{ path?: readonly unknown[]; code: string }> = [];

  function visit(issue: unknown): void {
    if (collected.length >= BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES) {
      return;
    }
    if (!isDiagnosticRecord(issue)) {
      return;
    }
    const code = typeof issue.code === "string" ? issue.code : "unknown";
    const path = Array.isArray(issue.path) ? issue.path : [];
    collected.push({ path, code });

    const unionErrors = issue.unionErrors;
    if (Array.isArray(unionErrors)) {
      for (const error of unionErrors) {
        if (collected.length >= BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES) {
          break;
        }
        if (isDiagnosticRecord(error) && Array.isArray(error.issues)) {
          for (const childIssue of error.issues) {
            visit(childIssue);
            if (collected.length >= BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES) {
              break;
            }
          }
        }
      }
    }

    const errors = issue.errors;
    if (Array.isArray(errors)) {
      for (const child of errors) {
        if (collected.length >= BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES) {
          break;
        }
        if (Array.isArray(child)) {
          for (const childIssue of child) {
            visit(childIssue);
            if (collected.length >= BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES) {
              break;
            }
          }
        } else {
          visit(child);
        }
      }
    }
  }

  for (const issue of rawIssues) {
    visit(issue);
    if (collected.length >= BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES) {
      break;
    }
  }

  return collected;
}

function schemaDiagnostics(params: {
  readonly outputParseStatus: BoundaryVerdictExecutionSchemaDiagnostics["outputParseStatus"];
  readonly failureCategory: BoundaryVerdictExecutionSchemaDiagnostics["failureCategory"];
  readonly issues?: readonly { readonly path?: readonly unknown[]; readonly code: string }[];
}): BoundaryVerdictExecutionSchemaDiagnostics {
  const issues = (params.issues ?? [])
    .slice(0, BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES)
    .map((issue) => ({
      path: (issue.path ?? [])
        .slice(0, BOUNDARY_VERDICT_EXECUTION_MAX_SCHEMA_PATH_SEGMENTS)
        .map(sanitizeSchemaPathSegment),
      code: boundedDiagnosticCode(issue.code),
    }));

  return {
    diagnosticVersion: "v2.evidence-lifecycle.boundary-verdict-execution.schema-diagnostics.hj2",
    contractName: "BoundaryVerdictExecutionResultSchema",
    contractVersion: BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
    outputParseStatus: params.outputParseStatus,
    failureCategory: params.failureCategory,
    issueCount: issues.length,
    issues,
    rawProviderOutputReturned: false,
    rawSchemaMessagesReturned: false,
    providerCompletionTextReturned: false,
    sourceTextReturned: false,
    inputTextReturned: false,
    evidenceItemTextReturned: false,
    promptTextReturned: false,
    stackTraceReturned: false,
    removalTrigger: BOUNDARY_VERDICT_EXECUTION_SCHEMA_DIAGNOSTICS_REMOVAL_TRIGGER,
  };
}

function isApprovedW7BModelPolicy(policy: AnalyzerV2TaskModelPolicy): boolean {
  return policy.policyId === "v2.model.boundary_verdict_execution.w7b"
    && policy.gatewayTaskId === "boundary_verdict_execution"
    && policy.modelTask === "verdict"
    && policy.modelTier === "standard"
    && policy.providerPolicy === "from_config_snapshot"
    && policy.temperature === 0.1
    && policy.maxCalls === 2
    && policy.schemaRetryCount === 1
    && policy.timeoutMs === 90000
    && policy.maxOutputTokens === 4000
    && policy.fallbackBehavior === "none_fail_closed"
    && policy.escalationBehavior === "surface_provider_failure"
    && policy.execution === "blocked_until_prompt_model_cache_approval"
    && policy.approval.status === ANALYZER_V2_W7_B_CAPTAIN_APPROVAL.status
    && policy.approval.reviewer === ANALYZER_V2_W7_B_CAPTAIN_APPROVAL.reviewer
    && policy.approval.approvedAt === ANALYZER_V2_W7_B_CAPTAIN_APPROVAL.approvedAt;
}

function resultEvent(
  type: EvidenceLifecycleTaskEvent["type"],
  severity: EvidenceLifecycleTaskEvent["severity"],
  message: string,
  references: string[],
): EvidenceLifecycleTaskEvent {
  return { type, severity, message, references };
}

function blockedResult(reason: EvidenceLifecycleTaskBlockedReason): BoundaryVerdictExecutionResult {
  return {
    schemaVersion: BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
    taskKey: "boundary_verdict_execution",
    status: "blocked",
    boundarySetCandidate: null,
    verdictSetCandidate: null,
    warningMaterialityInputs: null,
    integrityEvents: [resultEvent("task_policy_blocked", "info", "Boundary verdict execution was blocked.", [reason])],
    blockedReason: reason,
    damagedReason: null,
  };
}

function damagedResult(reason: EvidenceLifecycleTaskDamagedReason): BoundaryVerdictExecutionResult {
  return {
    schemaVersion: BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
    taskKey: "boundary_verdict_execution",
    status: "damaged",
    boundarySetCandidate: null,
    verdictSetCandidate: null,
    warningMaterialityInputs: null,
    integrityEvents: [resultEvent("schema_validation_failed", "error", "Boundary verdict execution was damaged.", [reason])],
    blockedReason: null,
    damagedReason: reason,
  };
}

function validateAcceptedResultContent(
  result: BoundaryVerdictExecutionResult,
  packet: BoundaryVerdictExecutionInputPacket,
): "unknown_evidence_item_id" | "unknown_boundary_candidate_id" | null {
  if (result.status !== "accepted") {
    return null;
  }
  const evidenceItemIds = new Set(packet.evidenceItems.map((item) => item.evidenceItemId));
  const boundaryIds = new Set(result.boundarySetCandidate.boundaries.map((boundary) => boundary.boundaryCandidateId));
  for (const boundary of result.boundarySetCandidate.boundaries) {
    if (boundary.evidenceItemIds.some((id) => !evidenceItemIds.has(id))) {
      return "unknown_evidence_item_id";
    }
  }
  for (const verdict of result.verdictSetCandidate.verdictCandidates) {
    if (verdict.evidenceItemIds.some((id) => !evidenceItemIds.has(id))) {
      return "unknown_evidence_item_id";
    }
    if (verdict.boundaryCandidateIds.some((id) => !boundaryIds.has(id))) {
      return "unknown_boundary_candidate_id";
    }
  }
  return null;
}

function blockedDecision(
  request: RunBoundaryVerdictExecutionRequest,
  reason: BoundaryVerdictExecutionBlockedReason,
  sideEffects: BoundaryVerdictExecutionSideEffects = noSideEffects({
    providerCallbackCreated: request.providerCallbackCreated === true,
    providerSdkLoaded: request.providerSdkLoaded === true,
  }),
  telemetryOverrides: Partial<BoundaryVerdictExecutionTelemetry> = {},
): BoundaryVerdictExecutionDecision {
  return decision({
    request,
    status: "boundary_verdict_execution_blocked",
    blockedReason: reason,
    damagedReason: null,
    result: blockedResult(reason === "prompt_or_model_not_approved" ? "prompt_not_approved" : "task_policy_not_executable"),
    inputPacket: null,
    inputPacketHash: null,
    inputPacketByteLength: null,
    sideEffects,
    executionTelemetry: telemetry(telemetryOverrides),
  });
}

function damagedDecision(
  request: RunBoundaryVerdictExecutionRequest,
  reason: BoundaryVerdictExecutionDamagedReason,
  sideEffects: BoundaryVerdictExecutionSideEffects,
  telemetryOverrides: Partial<BoundaryVerdictExecutionTelemetry>,
  result: BoundaryVerdictExecutionResult | null = null,
  inputPacket: BoundaryVerdictExecutionInputPacket | null = null,
): BoundaryVerdictExecutionDecision {
  const packetHash = inputPacket ? sha256Json(inputPacket) : null;
  return decision({
    request,
    status: "boundary_verdict_execution_damaged",
    blockedReason: null,
    damagedReason: reason,
    result: result ?? damagedResult(reason === "provider_unavailable" ? "provider_unavailable" : "schema_validation_failed"),
    inputPacket,
    inputPacketHash: packetHash,
    inputPacketByteLength: inputPacket ? utf8ByteLength(JSON.stringify(inputPacket)) : null,
    sideEffects,
    executionTelemetry: telemetry(telemetryOverrides),
  });
}

function acceptedDecision(
  request: RunBoundaryVerdictExecutionRequest,
  result: BoundaryVerdictExecutionResult,
  inputPacket: BoundaryVerdictExecutionInputPacket,
  sideEffects: BoundaryVerdictExecutionSideEffects,
  executionTelemetry: BoundaryVerdictExecutionTelemetry,
): BoundaryVerdictExecutionDecision {
  const inputPacketHash = sha256Json(inputPacket);
  return decision({
    request,
    status: "boundary_verdict_candidates_created_internal",
    blockedReason: null,
    damagedReason: null,
    result,
    inputPacket,
    inputPacketHash,
    inputPacketByteLength: utf8ByteLength(JSON.stringify(inputPacket)),
    sideEffects,
    executionTelemetry,
  });
}

function decision(params: {
  readonly request: RunBoundaryVerdictExecutionRequest;
  readonly status: BoundaryVerdictExecutionStatus;
  readonly blockedReason: BoundaryVerdictExecutionBlockedReason | null;
  readonly damagedReason: BoundaryVerdictExecutionDamagedReason | null;
  readonly result: BoundaryVerdictExecutionResult | null;
  readonly inputPacket: BoundaryVerdictExecutionInputPacket | null;
  readonly inputPacketHash: string | null;
  readonly inputPacketByteLength: number | null;
  readonly sideEffects: BoundaryVerdictExecutionSideEffects;
  readonly executionTelemetry: BoundaryVerdictExecutionTelemetry;
}): BoundaryVerdictExecutionDecision {
  const accepted = params.result?.status === "accepted" ? params.result : null;
  const citedEvidenceItemRefs = accepted
    ? Array.from(new Set([
      ...accepted.boundarySetCandidate.boundaries.flatMap((boundary) => boundary.evidenceItemIds),
      ...accepted.verdictSetCandidate.verdictCandidates.flatMap((verdict) => verdict.evidenceItemIds),
    ])).sort()
    : [];
  const uncertaintySignalCount = accepted
    ? accepted.verdictSetCandidate.verdictCandidates.reduce(
      (total, candidate) => total + candidate.materialUncertaintySignals.length,
      0,
    )
    : 0;
  const decisionHash = sha256Json({
    status: params.status,
    blockedReason: params.blockedReason,
    damagedReason: params.damagedReason,
    inputPacketHash: params.inputPacketHash,
    resultPayloadHash: params.result ? sha256Json(params.result) : null,
  });

  return {
    decisionVersion: BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
    decisionId: `BOUNDARY_VERDICT_EXECUTION_${decisionHash.slice(0, 24).toUpperCase()}`,
    kind: "boundary_verdict_execution",
    status: params.status,
    blockedReason: params.blockedReason,
    damagedReason: params.damagedReason,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    taskKey: "boundary_verdict_execution",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.boundary_verdict_execution,
    outputSchemaVersion: BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
    inputPacketHash: params.inputPacketHash,
    inputPacketByteLength: params.inputPacketByteLength,
    evidenceItemCount: params.inputPacket?.evidenceItemCount ?? 0,
    boundaryCandidateCount: accepted?.boundarySetCandidate.boundaries.length ?? 0,
    verdictCandidateCount: accepted?.verdictSetCandidate.verdictCandidates.length ?? 0,
    citedEvidenceItemRefs,
    resultPayloadHash: params.result ? sha256Json(params.result) : null,
    warningMaterialityInputs: {
      warningPublication: "closed",
      userVisibleWarningCount: 0,
      upstreamSufficiencyStatus: params.request.sufficiencyAssessment?.sufficiencyResultStatus ?? null,
      upstreamRecommendedNextAction: params.request.sufficiencyAssessment?.reportStopRecommendation ?? null,
      boundaryVerdictIntegrityEventCount: params.result?.integrityEvents.length ?? 0,
      candidateMaterialUncertaintySignalCount: uncertaintySignalCount,
    },
    executionTelemetry: params.executionTelemetry,
    redaction: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputPacketReturned: false,
      promptTextReturned: false,
      renderedPromptTextReturned: false,
      providerPayloadReturned: false,
      boundaryCandidateTextReturned: false,
      verdictCandidateTextReturned: false,
      warningMaterialityTextReturned: false,
      hiddenLedgerReferenceReturned: false,
      internalStateReturned: false,
    },
    sideEffects: params.sideEffects,
    w7aMergeTrigger: "merge_w7a_after_w7b_verifier_stable_and_fail_closed_parity_covered",
    combinedCallQualityTrigger:
      "compare_first_successful_benchmark_family_candidate_against_best_available_boundary_comparator",
    approvalPointer: BOUNDARY_VERDICT_EXECUTION_SOURCE_PACKAGE,
  };
}

function telemetryFromAttempts(params: {
  readonly attempts: readonly BoundaryVerdictExecutionModelAttempt[];
  readonly modelPolicy: AnalyzerV2TaskModelPolicy;
  readonly promptContentHash: string;
  readonly renderedPrompt: string;
  readonly inputPacketHash: string;
  readonly inputPacketByteLength: number;
  readonly cacheDecision: AnalyzerV2CacheDecision;
  readonly cachePolicyId: string | null;
}): BoundaryVerdictExecutionTelemetry {
  const providerAttempts = params.attempts
    .map((attempt) => attempt.providerTelemetry)
    .filter((attempt): attempt is BoundaryVerdictExecutionProviderTelemetry => attempt !== null);
  const lastTelemetry = providerAttempts.at(-1) ?? null;

  return telemetry({
    promptContentHash: params.promptContentHash,
    renderedPromptHash: sha256Text(params.renderedPrompt),
    inputPacketHash: params.inputPacketHash,
    inputPacketByteLength: params.inputPacketByteLength,
    schemaDiagnostics: params.attempts.at(-1)?.schemaDiagnostics ?? null,
    modelPolicyId: params.modelPolicy.policyId,
    providerId: lastTelemetry?.providerId ?? null,
    modelId: lastTelemetry?.modelId ?? null,
    attemptCount: params.attempts.length,
    schemaRetryCount: params.attempts.filter((attempt) =>
      attempt.status === "invalid_schema" || attempt.status === "parse_failure"
    ).length,
    tokenUsage: {
      inputTokens: providerAttempts.reduce((total, entry) => total + entry.inputTokens, 0),
      outputTokens: providerAttempts.reduce((total, entry) => total + entry.outputTokens, 0),
      totalTokens: providerAttempts.reduce((total, entry) => total + entry.totalTokens, 0),
    },
    durationMs: providerAttempts.reduce((total, entry) => total + entry.durationMs, 0),
    cacheDecisionReason: params.cacheDecision.reason,
    cachePolicyId: params.cachePolicyId,
  });
}

export async function runBoundaryVerdictExecutionRuntime(
  request: RunBoundaryVerdictExecutionRequest,
): Promise<BoundaryVerdictExecutionDecision> {
  const providerFlags = {
    providerCallbackCreated: request.providerCallbackCreated === true,
    providerSdkLoaded: request.providerSdkLoaded === true,
  };
  const parentValidation = validateParents(request);
  if (parentValidation) {
    return blockedDecision(request, parentValidation, noSideEffects(providerFlags));
  }
  if (!isRealValue(request.renderedPrompt) || !isRealValue(request.promptContentHash)) {
    return blockedDecision(request, "prompt_render_missing", noSideEffects(providerFlags));
  }

  const gatewayTask = getPipelineRunGatewayTask(request.context, "boundary_verdict_execution");
  const modelPolicy = getPipelineRunTaskModelPolicy(request.context, "boundary_verdict_execution");
  const preparedSideEffects = noSideEffects({
    ...providerFlags,
    promptLoaded: true,
    promptRendered: true,
  });
  if (!modelPolicy || !isApprovedW7BModelPolicy(modelPolicy)) {
    return blockedDecision(request, "prompt_or_model_not_approved", preparedSideEffects, {
      promptContentHash: request.promptContentHash,
      renderedPromptHash: sha256Text(request.renderedPrompt),
      modelPolicyId: modelPolicy?.policyId ?? null,
      cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
    });
  }
  if (!canExecuteAnalyzerV2GatewayTask(gatewayTask)) {
    return blockedDecision(request, "task_policy_not_executable", preparedSideEffects, {
      promptContentHash: request.promptContentHash,
      renderedPromptHash: sha256Text(request.renderedPrompt),
      modelPolicyId: modelPolicy.policyId,
      cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
    });
  }

  const inputPacket = buildInputPacket(request);
  const inputPacketByteLength = utf8ByteLength(JSON.stringify(inputPacket));
  const inputPacketHash = sha256Json(inputPacket);
  if (inputPacket.evidenceItemCount > BOUNDARY_VERDICT_EXECUTION_MAX_EVIDENCE_ITEMS ||
    inputPacketByteLength > BOUNDARY_VERDICT_EXECUTION_MAX_PACKET_BYTES) {
    return blockedDecision(request, "boundary_verdict_input_too_large", preparedSideEffects, {
      promptContentHash: request.promptContentHash,
      renderedPromptHash: sha256Text(request.renderedPrompt),
      inputPacketHash,
      inputPacketByteLength,
      modelPolicyId: modelPolicy.policyId,
      cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
    });
  }

  const cacheDecision = buildNoStoreCacheDecision({
    context: request.context,
    modelPolicy,
    inputPacket,
    promptContentHash: request.promptContentHash,
    configSnapshotHash: request.configSnapshotHash,
  });
  const postCacheSideEffects = noSideEffects({
    ...preparedSideEffects,
    cacheDecisionConstructed: true,
  });
  const baseTelemetry = {
    promptContentHash: request.promptContentHash,
    renderedPromptHash: sha256Text(request.renderedPrompt),
    inputPacketHash,
    inputPacketByteLength,
    modelPolicyId: modelPolicy.policyId,
    cacheDecisionReason: cacheDecision.reason,
    cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
  };
  if (cacheDecision.reason !== "no_store_runtime_dispatch_safety" || cacheDecision.canRead || cacheDecision.canWrite) {
    return blockedDecision(request, "cache_contract_not_no_store", postCacheSideEffects, baseTelemetry);
  }

  const attempts: BoundaryVerdictExecutionModelAttempt[] = [];
  const maxAttempts = Math.max(1, Math.min(modelPolicy.maxCalls, modelPolicy.schemaRetryCount + 1));
  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    let providerResponse: BoundaryVerdictExecutionProviderCallResponse;
    try {
      providerResponse = await request.providerCall({
        renderedPrompt: request.renderedPrompt,
        promptContentHash: request.promptContentHash,
        outputSchemaVersion: BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
        attemptNumber,
        maxAttempts,
        modelPolicy,
        inputPacket,
      });
    } catch {
      attempts.push({
        attemptNumber,
        promptContentHash: request.promptContentHash,
        status: "provider_failure",
        providerTelemetry: null,
        failureCode: "provider_unavailable",
        schemaDiagnostics: null,
      });
      return damagedDecision(request, "provider_unavailable", noSideEffects({
        ...postCacheSideEffects,
        adapterCalled: true,
        boundaryVerdictLlmCalled: true,
      }), {
        ...baseTelemetry,
        attemptCount: attempts.length,
      }, null, inputPacket);
    }

    const calledSideEffects = noSideEffects({
      ...postCacheSideEffects,
      adapterCalled: true,
      modelCalled: true,
      boundaryVerdictLlmCalled: true,
    });
    if (!providerTelemetryValid(providerResponse.telemetry)) {
      attempts.push({
        attemptNumber,
        promptContentHash: request.promptContentHash,
        status: "provider_failure",
        providerTelemetry: null,
        failureCode: "provider_telemetry_invalid",
        schemaDiagnostics: null,
      });
      return damagedDecision(request, "provider_telemetry_invalid", calledSideEffects, {
        ...baseTelemetry,
        attemptCount: attempts.length,
      }, null, inputPacket);
    }

    const parsedOutput = coerceProviderOutput(providerResponse.output);
    if (parsedOutput.status === "parse_failure") {
      attempts.push({
        attemptNumber,
        promptContentHash: request.promptContentHash,
        status: "parse_failure",
        providerTelemetry: providerResponse.telemetry,
        failureCode: "parse_failure",
        schemaDiagnostics: schemaDiagnostics({
          outputParseStatus: "parse_failure",
          failureCategory: "parse_failure",
          issues: [{ path: [], code: "json_parse_error" }],
        }),
      });
      if (attemptNumber < maxAttempts) {
        continue;
      }
      return damagedDecision(request, "parse_failure", calledSideEffects, telemetryFromAttempts({
        attempts,
        modelPolicy,
        promptContentHash: request.promptContentHash,
        renderedPrompt: request.renderedPrompt,
        inputPacketHash,
        inputPacketByteLength,
        cacheDecision,
        cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
      }), null, inputPacket);
    }

    const parsedResult = BoundaryVerdictExecutionResultSchema.safeParse(parsedOutput.value);
    if (!parsedResult.success) {
      const diagnostics = schemaDiagnostics({
        outputParseStatus: "parsed",
        failureCategory: "schema_validation",
        issues: collectSchemaIssueDiagnostics(parsedResult.error.issues),
      });
      attempts.push({
        attemptNumber,
        promptContentHash: request.promptContentHash,
        status: "invalid_schema",
        providerTelemetry: providerResponse.telemetry,
        failureCode: "schema_validation_failed",
        schemaDiagnostics: diagnostics,
      });
      if (attemptNumber < maxAttempts) {
        continue;
      }
      return damagedDecision(request, "schema_validation_failed", calledSideEffects, telemetryFromAttempts({
        attempts,
        modelPolicy,
        promptContentHash: request.promptContentHash,
        renderedPrompt: request.renderedPrompt,
        inputPacketHash,
        inputPacketByteLength,
        cacheDecision,
        cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
      }), null, inputPacket);
    }

    const result = parsedResult.data as BoundaryVerdictExecutionResult;
    const contractError = validateAcceptedResultContent(result, inputPacket);
    if (contractError) {
      attempts.push({
        attemptNumber,
        promptContentHash: request.promptContentHash,
        status: "invalid_schema",
        providerTelemetry: providerResponse.telemetry,
        failureCode: contractError,
        schemaDiagnostics: schemaDiagnostics({
          outputParseStatus: "parsed",
          failureCategory: "task_contract_validation",
          issues: [{ path: ["boundaryVerdictExecutionResult"], code: contractError }],
        }),
      });
      if (attemptNumber < maxAttempts) {
        continue;
      }
      return damagedDecision(request, "task_contract_validation_failed", calledSideEffects, telemetryFromAttempts({
        attempts,
        modelPolicy,
        promptContentHash: request.promptContentHash,
        renderedPrompt: request.renderedPrompt,
        inputPacketHash,
        inputPacketByteLength,
        cacheDecision,
        cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
      }), damagedResult("task_contract_validation_failed"), inputPacket);
    }

    attempts.push({
      attemptNumber,
      promptContentHash: request.promptContentHash,
      status: "accepted",
      providerTelemetry: providerResponse.telemetry,
      failureCode: null,
      schemaDiagnostics: null,
    });
    if (result.status === "blocked") {
      return decision({
        request,
        status: "boundary_verdict_execution_blocked",
        blockedReason: result.blockedReason,
        damagedReason: null,
        result,
        inputPacket,
        inputPacketHash,
        inputPacketByteLength,
        sideEffects: calledSideEffects,
        executionTelemetry: telemetryFromAttempts({
          attempts,
          modelPolicy,
          promptContentHash: request.promptContentHash,
          renderedPrompt: request.renderedPrompt,
          inputPacketHash,
          inputPacketByteLength,
          cacheDecision,
          cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
        }),
      });
    }
    if (result.status === "damaged") {
      return damagedDecision(request, result.damagedReason, calledSideEffects, telemetryFromAttempts({
        attempts,
        modelPolicy,
        promptContentHash: request.promptContentHash,
        renderedPrompt: request.renderedPrompt,
        inputPacketHash,
        inputPacketByteLength,
        cacheDecision,
        cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
      }), result, inputPacket);
    }
    return acceptedDecision(request, result, inputPacket, calledSideEffects, telemetryFromAttempts({
      attempts,
      modelPolicy,
      promptContentHash: request.promptContentHash,
      renderedPrompt: request.renderedPrompt,
      inputPacketHash,
      inputPacketByteLength,
      cacheDecision,
      cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
    }));
  }

  return damagedDecision(request, "schema_validation_failed", noSideEffects({
    ...postCacheSideEffects,
    adapterCalled: true,
    boundaryVerdictLlmCalled: true,
  }), baseTelemetry, null, inputPacket);
}
