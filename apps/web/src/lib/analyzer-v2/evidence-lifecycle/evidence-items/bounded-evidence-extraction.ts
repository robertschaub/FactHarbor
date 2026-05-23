import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { ClaimContractSchema } from "@/lib/analyzer-v2/claim-understanding/schemas";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import {
  type BoundedExtractionInputAuthorizationDecision,
  type BoundedTextExtractionInputPacket,
  BOUNDED_EXTRACTION_INPUT_AGGREGATE_MAX_TEXT_BYTES,
  BOUNDED_EXTRACTION_INPUT_AUTHORIZATION_DECISION_VERSION,
  BOUNDED_EXTRACTION_INPUT_MAX_TEXT_BYTES,
  BOUNDED_EXTRACTION_INPUT_PACKET_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";
import {
  EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_DECISION_VERSION,
  type EvidenceLifecycleExecutionReadinessDenialDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial";
import {
  EvidenceApplicabilityResultSchema,
  EvidenceExtractionResultSchema,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas";
import {
  EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
  EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  EVIDENCE_TASK_PROMPT_SECTION_IDS,
  type EvidenceApplicabilityResult,
  type EvidenceExtractionResult,
  type EvidenceLifecycleTaskEvent,
  type ExtractedEvidenceItemContract,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import {
  ANALYZER_V2_HJ78_CAPTAIN_APPROVAL,
  ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL,
} from "@/lib/analyzer-v2/gateway/approval-records";
import {
  ANALYZER_V2_EVIDENCE_APPLICABILITY_CACHE_POLICY,
  ANALYZER_V2_EVIDENCE_EXTRACTION_CACHE_POLICY,
} from "@/lib/analyzer-v2/gateway/cache-policy-registry";
import { canExecuteAnalyzerV2GatewayTask } from "@/lib/analyzer-v2/gateway/policy";
import type {
  AnalyzerV2CacheDecision,
  AnalyzerV2CacheDimension,
  AnalyzerV2CachePolicy,
  AnalyzerV2GatewayTask,
  AnalyzerV2TaskModelPolicy,
} from "@/lib/analyzer-v2/gateway/types";
import {
  getPipelineRunGatewayTask,
  getPipelineRunTaskModelPolicy,
  type PipelineRunContext,
} from "@/lib/analyzer-v2/run-context";
import { sha256Json } from "@/lib/analyzer-v2/util";
import { canonicalizeContent, computeContentHash } from "@/lib/config-schemas";

export const BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION =
  "v2.evidence-lifecycle.bounded-evidence-extraction.x7w5" as const;
export const BOUNDED_EVIDENCE_EXTRACTION_RUNTIME_VERSION =
  "v2.evidence-lifecycle.bounded-evidence-extraction.runtime.x7w5" as const;
export const BOUNDED_EVIDENCE_APPLICABILITY_RUNTIME_VERSION =
  "v2.evidence-lifecycle.evidence-applicability.runtime.hj78" as const;
export const BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.bounded-evidence-extraction-artifact.x7w5" as const;
export const BOUNDED_EVIDENCE_EXTRACTION_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-19_V2_Slice_X7-W5_First_Bounded_EvidenceItem_Authorization_Review_Package.md" as const;
export const BOUNDED_EVIDENCE_APPLICABILITY_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-23_V2_HighJump_HJ78_Evidence_Applicability_Precheck.md" as const;
export const BOUNDED_EVIDENCE_EXTRACTION_PROMPT_PROFILE = "claimboundary-v2" as const;
export const BOUNDED_EVIDENCE_EXTRACTION_PROMPT_FILE = "claimboundary-v2.prompt.md" as const;
export const BOUNDED_EVIDENCE_APPLICABILITY_SECTION_ID =
  EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_applicability;
export const BOUNDED_EVIDENCE_EXTRACTION_SECTION_ID =
  EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_extraction;
export const BOUNDED_EVIDENCE_APPLICABILITY_CACHE_NAMESPACE = [
  "analyzer-v2",
  ANALYZER_V2_EVIDENCE_APPLICABILITY_CACHE_POLICY.policyId,
  "evidence_applicability",
].join(":");
export const BOUNDED_EVIDENCE_EXTRACTION_CACHE_NAMESPACE = [
  "analyzer-v2",
  ANALYZER_V2_EVIDENCE_EXTRACTION_CACHE_POLICY.policyId,
  "evidence_extraction",
].join(":");
export const BOUNDED_EVIDENCE_EXTRACTION_SCHEMA_DIAGNOSTICS_REMOVAL_TRIGGER =
  "remove_or_fold_into_stable_w5_telemetry_after_schema_root_cause_resolution_and_later_captain_approved_canary" as const;

const BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES = 8;
const BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_PATH_SEGMENTS = 8;
const BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_PATH_SEGMENT_LENGTH = 64;
const BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_CODE_LENGTH = 80;

const BOUNDED_EVIDENCE_EXTRACTION_VARIABLES = [
  "claimContractJson",
  "taskPolicySnapshotJson",
  "sourceContentPacketsJson",
  "applicabilityResultJson",
] as const;

const BOUNDED_EVIDENCE_APPLICABILITY_VARIABLES = [
  "claimContractJson",
  "taskPolicySnapshotJson",
  "sourceContentPacketsJson",
  "sourceAcquisitionTraceJson",
] as const;

export type BoundedEvidenceExtractionPromptVariable =
  typeof BOUNDED_EVIDENCE_EXTRACTION_VARIABLES[number];

export type BoundedEvidenceApplicabilityPromptVariable =
  typeof BOUNDED_EVIDENCE_APPLICABILITY_VARIABLES[number];

export type BoundedEvidenceExtractionRuntimeOwnership =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

export type BoundedEvidenceExtractionStatus =
  | "hidden_evidence_item_extraction_completed"
  | "hidden_no_extractable_evidence"
  | "blocked_pre_execution"
  | "damaged_execution";

export type BoundedEvidenceExtractionBlockedReason =
  | "w4h_decision_missing"
  | "w4h_not_runtime_owned"
  | "w4h_packet_missing"
  | "w4h_packet_invalid"
  | "w4i_decision_missing"
  | "w4i_not_runtime_owned"
  | "w4i_not_structurally_eligible"
  | "parent_lineage_mismatch"
  | "provider_id_mismatch"
  | "packet_hash_mismatch"
  | "packet_length_mismatch"
  | "prompt_or_model_not_approved"
  | "task_policy_not_executable"
  | "token_budget_overflow"
  | "cache_contract_not_no_store";

export type BoundedEvidenceExtractionDamagedReason =
  | "provider_unavailable"
  | "parse_failure"
  | "schema_validation_failed"
  | "task_contract_validation_failed"
  | "prompt_render_failed";

type BoundedEvidenceExtractionTaskContractDiagnosticCode =
  | "approved_packet_mismatch"
  | "empty_evidence_statement"
  | "missing_target_atomic_claims"
  | "unselected_target_atomic_claim";

export type BoundedEvidenceExtractionSideEffects = {
  readonly promptLoaded: boolean;
  readonly promptRendered: boolean;
  readonly adapterCalled: boolean;
  readonly modelCalled: boolean;
  readonly cacheDecisionConstructed: boolean;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly providerCallbackCreated: boolean;
  readonly providerSdkLoaded: boolean;
  readonly parserExecuted: false;
  readonly sourceReliabilityCalled: false;
  readonly storageWrite: false;
  readonly reportGenerated: false;
  readonly verdictGenerated: false;
  readonly warningGenerated: false;
  readonly confidenceGenerated: false;
  readonly publicSurfaceWritten: false;
};

export type BoundedEvidenceExtractionProviderTelemetry = {
  readonly providerId: string;
  readonly modelId: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly durationMs: number;
};

export type BoundedEvidenceExtractionProviderCallRequest = {
  readonly renderedPrompt: string;
  readonly promptContentHash: string;
  readonly outputSchemaVersion: typeof EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION;
  readonly attemptNumber: number;
  readonly maxAttempts: number;
  readonly modelPolicy: AnalyzerV2TaskModelPolicy;
  readonly inputFrame: BoundedEvidenceExtractionInputFrame;
};

export type BoundedEvidenceExtractionProviderCallResponse = {
  readonly output: unknown;
  readonly telemetry: BoundedEvidenceExtractionProviderTelemetry;
};

export type BoundedEvidenceExtractionProviderCall = (
  request: BoundedEvidenceExtractionProviderCallRequest,
) => Promise<BoundedEvidenceExtractionProviderCallResponse>;

export type BoundedEvidenceApplicabilityProviderCallRequest = {
  readonly renderedPrompt: string;
  readonly promptContentHash: string;
  readonly outputSchemaVersion: typeof EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION;
  readonly attemptNumber: number;
  readonly maxAttempts: number;
  readonly modelPolicy: AnalyzerV2TaskModelPolicy;
  readonly inputFrame: BoundedEvidenceExtractionInputFrame;
};

export type BoundedEvidenceApplicabilityProviderCallResponse = {
  readonly output: unknown;
  readonly telemetry: BoundedEvidenceExtractionProviderTelemetry;
};

export type BoundedEvidenceApplicabilityProviderCall = (
  request: BoundedEvidenceApplicabilityProviderCallRequest,
) => Promise<BoundedEvidenceApplicabilityProviderCallResponse>;

export type BoundedEvidenceExtractionSchemaDiagnosticIssue = {
  readonly path: readonly string[];
  readonly code: string;
};

export type BoundedEvidenceExtractionSchemaDiagnostics = {
  readonly diagnosticVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.schema-diagnostics.x7w5c";
  readonly contractName: "EvidenceExtractionResultSchema";
  readonly contractVersion: typeof EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION;
  readonly outputParseStatus: "not_attempted" | "parse_failure" | "parsed";
  readonly failureCategory:
    | "none"
    | "parse_failure"
    | "schema_validation"
    | "task_contract_validation";
  readonly issueCount: number;
  readonly issues: readonly BoundedEvidenceExtractionSchemaDiagnosticIssue[];
  readonly rawProviderOutputReturned: false;
  readonly rawSchemaMessagesReturned: false;
  readonly providerCompletionTextReturned: false;
  readonly sourceTextReturned: false;
  readonly inputTextReturned: false;
  readonly evidenceItemTextReturned: false;
  readonly promptTextReturned: false;
  readonly stackTraceReturned: false;
  readonly removalTrigger: typeof BOUNDED_EVIDENCE_EXTRACTION_SCHEMA_DIAGNOSTICS_REMOVAL_TRIGGER;
};

export type BoundedEvidenceExtractionModelAttempt = {
  readonly attemptNumber: number;
  readonly promptContentHash: string;
  readonly status: "accepted" | "invalid_schema" | "parse_failure" | "provider_failure";
  readonly providerTelemetry: BoundedEvidenceExtractionProviderTelemetry | null;
  readonly failureMessage: string | null;
  readonly schemaDiagnostics: BoundedEvidenceExtractionSchemaDiagnostics | null;
};

export type BoundedEvidenceExtractionInputFrame = {
  readonly packetId: string;
  readonly sourceRecordId: string;
  readonly contentPacketId: string;
  readonly inputTextHash: string;
  readonly inputTextByteLength: number;
  readonly providerId: string;
  readonly sourceContentPackets: readonly {
    readonly sourceRecordId: string;
    readonly contentPacketId: string;
    readonly providerId: string;
  }[];
  readonly targetAtomicClaimIds: readonly string[];
};

export type BoundedEvidenceExtractionModelTelemetry = {
  readonly adapterVersion: typeof BOUNDED_EVIDENCE_EXTRACTION_RUNTIME_VERSION;
  readonly promptContentHash: string | null;
  readonly renderedPromptHash: string | null;
  readonly configSnapshotHash: string | null;
  readonly outputSchemaVersion: typeof EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION;
  readonly schemaDiagnostics: BoundedEvidenceExtractionSchemaDiagnostics | null;
  readonly gatewayTaskId: "evidence_extraction";
  readonly modelPolicyId: string | null;
  readonly providerId: string | null;
  readonly modelId: string | null;
  readonly retryCount: 0;
  readonly tokenUsage: {
    readonly inputTokens: number | null;
    readonly outputTokens: number | null;
    readonly totalTokens: number | null;
  };
  readonly durationMs: number | null;
  readonly cacheDecision: "no_store_no_read";
  readonly cacheDecisionReason: AnalyzerV2CacheDecision["reason"] | null;
  readonly approvalPointer: typeof BOUNDED_EVIDENCE_EXTRACTION_SOURCE_PACKAGE | null;
};

export type BoundedEvidenceApplicabilityPrecheckSummary = {
  readonly source:
    | "runtime_evidence_applicability_task"
    | "runtime_evidence_applicability_damaged_structural_fallback"
    | "structural_uncertain_fallback"
    | "not_reached";
  readonly resultStatus: EvidenceApplicabilityResult["status"] | null;
  readonly resultHash: string | null;
  readonly decisionCount: number;
  readonly applicableCount: number;
  readonly notApplicableCount: number;
  readonly uncertainCount: number;
  readonly modelCalled: boolean;
  readonly promptContentHash: string | null;
  readonly renderedPromptHash: string | null;
  readonly modelPolicyId: string | null;
  readonly providerId: string | null;
  readonly modelId: string | null;
  readonly tokenUsage: {
    readonly inputTokens: number | null;
    readonly outputTokens: number | null;
    readonly totalTokens: number | null;
  };
  readonly durationMs: number | null;
  readonly cacheDecision: "no_store_no_read";
  readonly cacheDecisionReason: AnalyzerV2CacheDecision["reason"] | null;
  readonly resultReturnedByDefault: false;
  readonly rationaleReturnedByDefault: false;
  readonly sourceTextReturnedByDefault: false;
  readonly promptTextReturnedByDefault: false;
  readonly approvalPointer: typeof BOUNDED_EVIDENCE_APPLICABILITY_SOURCE_PACKAGE | null;
};

export type EvidenceItemStatementProjection = {
  readonly evidenceItemId: string;
  readonly sourceRecordId: string;
  readonly contentPacketId: string;
  readonly statementHash: string;
  readonly statementByteLength: number;
  readonly statementCharLength: number;
  readonly targetAtomicClaimIds: readonly string[];
  readonly claimDirection: ExtractedEvidenceItemContract["claimDirection"];
  readonly probativeValue: ExtractedEvidenceItemContract["probativeValue"];
  readonly evidenceStrength: ExtractedEvidenceItemContract["evidenceStrength"];
  readonly extractionConfidence: ExtractedEvidenceItemContract["extractionConfidence"];
  readonly evidenceScopeHash: string;
  readonly provenanceHash: string;
};

export type BoundedEvidenceExtractionDecision = {
  readonly decisionVersion: typeof BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION;
  readonly decisionId: string;
  readonly kind: "bounded_evidence_extraction_execution";
  readonly status: BoundedEvidenceExtractionStatus;
  readonly blockedReason: BoundedEvidenceExtractionBlockedReason | null;
  readonly damagedReason: BoundedEvidenceExtractionDamagedReason | null;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly taskKey: "evidence_extraction";
  readonly promptSectionId: typeof BOUNDED_EVIDENCE_EXTRACTION_SECTION_ID;
  readonly outputSchemaVersion: typeof EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION;
  readonly defaultProjection: "hash_length_provenance_only";
  readonly evidenceItemTextReturnedByDefault: false;
  readonly sourceTextReturnedByDefault: false;
  readonly parent: {
    readonly w4hDecisionVersion: typeof BOUNDED_EXTRACTION_INPUT_AUTHORIZATION_DECISION_VERSION | null;
    readonly w4hStatus: string | null;
    readonly w4hRuntimeOwnership: BoundedEvidenceExtractionRuntimeOwnership;
    readonly w4iDecisionVersion: typeof EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_DECISION_VERSION | null;
    readonly w4iStatus: string | null;
    readonly w4iRuntimeOwnership: BoundedEvidenceExtractionRuntimeOwnership;
    readonly w4iPreCallGate: "merged_by_parity_rechecked_not_deleted" | "not_reached";
    readonly parentPacketId: string | null;
    readonly parentPacketHash: string | null;
    readonly parentPacketByteLength: number | null;
    readonly parentProviderId: string | null;
    readonly sourceMaterialRef: string | null;
    readonly contentPacketId: string | null;
    readonly sourceContentPackets: readonly {
      readonly sourceRecordId: string;
      readonly contentPacketId: string;
      readonly providerId: string;
    }[];
  };
  readonly extractionResult: EvidenceExtractionResult | null;
  readonly applicabilityPrecheck?: BoundedEvidenceApplicabilityPrecheckSummary;
  readonly extractionResultHash: string | null;
  readonly extractionResultStatus: EvidenceExtractionResult["status"] | null;
  readonly extractionStatus: Extract<EvidenceExtractionResult, { status: "accepted" }>["extractionStatus"] | null;
  readonly evidenceItemCount: number;
  readonly evidenceItemStatementHashes: readonly string[];
  readonly evidenceItemStatementByteLengths: readonly number[];
  readonly evidenceItemStatementProjections: readonly EvidenceItemStatementProjection[];
  readonly executionTelemetry: BoundedEvidenceExtractionModelTelemetry;
  readonly sideEffects: BoundedEvidenceExtractionSideEffects;
  readonly productExecution: {
    readonly w4hPacketObserved: boolean;
    readonly w4iEligibilityObserved: boolean;
    readonly boundedEvidenceExtractionExecuted: boolean;
    readonly extractionExecutionAuthorized: boolean;
    readonly llmExtractionCallAuthorized: boolean;
    readonly evidenceItemGenerated: boolean;
    readonly parserExecuted: false;
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
    readonly warningGenerated: false;
    readonly confidenceGenerated: false;
    readonly publicProjectionWritten: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly sourceReliabilityRead: false;
    readonly sourceReliabilityWrite: false;
    readonly storageWrite: false;
  };
};

export type RunBoundedEvidenceExtractionRuntimeRequest = {
  readonly context: PipelineRunContext;
  readonly claimContract: ClaimContract;
  readonly extractionInputAuthorization: BoundedExtractionInputAuthorizationDecision | null;
  readonly extractionInputRuntimeOwnership: BoundedEvidenceExtractionRuntimeOwnership;
  readonly executionReadinessDenial: EvidenceLifecycleExecutionReadinessDenialDecision | null;
  readonly executionReadinessRuntimeOwnership: BoundedEvidenceExtractionRuntimeOwnership;
  readonly providerCall: BoundedEvidenceExtractionProviderCall;
  readonly applicabilityProviderCall?: BoundedEvidenceApplicabilityProviderCall;
  readonly applicabilityResult?: EvidenceApplicabilityResult | null;
  readonly providerId: string;
  readonly modelId: string;
  readonly configSnapshotHash: string;
  readonly providerCallbackCreated?: boolean;
  readonly providerSdkLoaded?: boolean;
};

type CacheKeyInput = Partial<Record<AnalyzerV2CacheDimension, string | number>>;
type RenderedBoundedEvidenceExtractionPrompt = {
  readonly profile: typeof BOUNDED_EVIDENCE_EXTRACTION_PROMPT_PROFILE;
  readonly sectionId: typeof BOUNDED_EVIDENCE_EXTRACTION_SECTION_ID;
  readonly promptFilePath: string;
  readonly promptContentHash: string;
  readonly renderedPrompt: string;
};

type RenderedEvidenceApplicabilityPrompt = {
  readonly profile: typeof BOUNDED_EVIDENCE_EXTRACTION_PROMPT_PROFILE;
  readonly sectionId: typeof BOUNDED_EVIDENCE_APPLICABILITY_SECTION_ID;
  readonly promptFilePath: string;
  readonly promptContentHash: string;
  readonly renderedPrompt: string;
};

const FORBIDDEN_RUNTIME_VALUES = new Set(["placeholder", "todo", "unknown", "und"]);

function noSideEffects(
  overrides: Partial<BoundedEvidenceExtractionSideEffects> = {},
): BoundedEvidenceExtractionSideEffects {
  return {
    promptLoaded: false,
    promptRendered: false,
    adapterCalled: false,
    modelCalled: false,
    cacheDecisionConstructed: false,
    cacheRead: false,
    cacheWrite: false,
    providerCallbackCreated: false,
    providerSdkLoaded: false,
    parserExecuted: false,
    sourceReliabilityCalled: false,
    storageWrite: false,
    reportGenerated: false,
    verdictGenerated: false,
    warningGenerated: false,
    confidenceGenerated: false,
    publicSurfaceWritten: false,
    ...overrides,
  };
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function event(
  type: EvidenceLifecycleTaskEvent["type"],
  severity: EvidenceLifecycleTaskEvent["severity"],
  message: string,
  references: string[],
): EvidenceLifecycleTaskEvent {
  return { type, severity, message, references };
}

function isRealRuntimeValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return value.trim().length > 0 && !FORBIDDEN_RUNTIME_VALUES.has(normalized);
}

function parentSummary(
  request: Pick<
    RunBoundedEvidenceExtractionRuntimeRequest,
    | "extractionInputAuthorization"
    | "extractionInputRuntimeOwnership"
    | "executionReadinessDenial"
    | "executionReadinessRuntimeOwnership"
  >,
  packet: BoundedTextExtractionInputPacket | null,
): BoundedEvidenceExtractionDecision["parent"] {
  return {
    w4hDecisionVersion: request.extractionInputAuthorization?.decisionVersion ===
      BOUNDED_EXTRACTION_INPUT_AUTHORIZATION_DECISION_VERSION
      ? BOUNDED_EXTRACTION_INPUT_AUTHORIZATION_DECISION_VERSION
      : null,
    w4hStatus: request.extractionInputAuthorization?.status ?? null,
    w4hRuntimeOwnership: request.extractionInputRuntimeOwnership,
    w4iDecisionVersion: request.executionReadinessDenial?.decisionVersion ===
      EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_DECISION_VERSION
      ? EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_DECISION_VERSION
      : null,
    w4iStatus: request.executionReadinessDenial?.status ?? null,
    w4iRuntimeOwnership: request.executionReadinessRuntimeOwnership,
    w4iPreCallGate: packet ? "merged_by_parity_rechecked_not_deleted" : "not_reached",
    parentPacketId: packet?.packetId ?? null,
    parentPacketHash: packet?.inputTextHash ?? null,
    parentPacketByteLength: packet?.inputTextByteLength ?? null,
    parentProviderId: packet?.providerId ?? request.extractionInputAuthorization?.parent.providerId ?? null,
    sourceMaterialRef: packet?.sourceMaterialRef ?? null,
    contentPacketId: packet?.packetId ?? null,
    sourceContentPackets: packet?.sourceContentPackets.map((contentPacket) => ({
      sourceRecordId: contentPacket.sourceRecordId,
      contentPacketId: contentPacket.contentPacketId,
      providerId: contentPacket.providerId,
    })) ?? [],
  };
}

function telemetry(
  overrides: Partial<BoundedEvidenceExtractionModelTelemetry> = {},
): BoundedEvidenceExtractionModelTelemetry {
  return {
    adapterVersion: BOUNDED_EVIDENCE_EXTRACTION_RUNTIME_VERSION,
    promptContentHash: null,
    renderedPromptHash: null,
    configSnapshotHash: null,
    outputSchemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
    schemaDiagnostics: null,
    gatewayTaskId: "evidence_extraction",
    modelPolicyId: null,
    providerId: null,
    modelId: null,
    retryCount: 0,
    tokenUsage: {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
    },
    durationMs: null,
    cacheDecision: "no_store_no_read",
    cacheDecisionReason: null,
    approvalPointer: null,
    ...overrides,
  };
}

function applicabilityPrecheckSummary(
  overrides: Partial<BoundedEvidenceApplicabilityPrecheckSummary> = {},
): BoundedEvidenceApplicabilityPrecheckSummary {
  return {
    source: "not_reached",
    resultStatus: null,
    resultHash: null,
    decisionCount: 0,
    applicableCount: 0,
    notApplicableCount: 0,
    uncertainCount: 0,
    modelCalled: false,
    promptContentHash: null,
    renderedPromptHash: null,
    modelPolicyId: null,
    providerId: null,
    modelId: null,
    tokenUsage: {
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
    },
    durationMs: null,
    cacheDecision: "no_store_no_read",
    cacheDecisionReason: null,
    resultReturnedByDefault: false,
    rationaleReturnedByDefault: false,
    sourceTextReturnedByDefault: false,
    promptTextReturnedByDefault: false,
    approvalPointer: null,
    ...overrides,
  };
}

function summarizeApplicabilityResult(params: {
  readonly result: EvidenceApplicabilityResult;
  readonly source: BoundedEvidenceApplicabilityPrecheckSummary["source"];
  readonly modelCalled?: boolean;
  readonly promptContentHash?: string | null;
  readonly renderedPromptHash?: string | null;
  readonly modelPolicyId?: string | null;
  readonly providerTelemetry?: BoundedEvidenceExtractionProviderTelemetry | null;
  readonly cacheDecisionReason?: AnalyzerV2CacheDecision["reason"] | null;
}): BoundedEvidenceApplicabilityPrecheckSummary {
  const decisions = params.result.status === "accepted" ? params.result.applicabilityDecisions : [];
  return applicabilityPrecheckSummary({
    source: params.source,
    resultStatus: params.result.status,
    resultHash: sha256Json(params.result),
    decisionCount: decisions.length,
    applicableCount: decisions.filter((decisionEntry) => decisionEntry.applicability === "applicable").length,
    notApplicableCount: decisions.filter((decisionEntry) => decisionEntry.applicability === "not_applicable").length,
    uncertainCount: decisions.filter((decisionEntry) => decisionEntry.applicability === "uncertain").length,
    modelCalled: params.modelCalled === true,
    promptContentHash: params.promptContentHash ?? null,
    renderedPromptHash: params.renderedPromptHash ?? null,
    modelPolicyId: params.modelPolicyId ?? null,
    providerId: params.providerTelemetry?.providerId ?? null,
    modelId: params.providerTelemetry?.modelId ?? null,
    tokenUsage: {
      inputTokens: params.providerTelemetry?.inputTokens ?? null,
      outputTokens: params.providerTelemetry?.outputTokens ?? null,
      totalTokens: params.providerTelemetry?.totalTokens ?? null,
    },
    durationMs: params.providerTelemetry?.durationMs ?? null,
    cacheDecisionReason: params.cacheDecisionReason ?? null,
    approvalPointer:
      params.source === "runtime_evidence_applicability_task"
        || params.source === "runtime_evidence_applicability_damaged_structural_fallback"
        ? BOUNDED_EVIDENCE_APPLICABILITY_SOURCE_PACKAGE
        : null,
  });
}

function boundedDiagnosticCode(value: string): string {
  return value
    .replace(/[^A-Za-z0-9_.-]/g, "_")
    .slice(0, BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_CODE_LENGTH) || "unknown";
}

function boundedDiagnosticPathSegment(value: string): string {
  return value.slice(0, BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_PATH_SEGMENT_LENGTH);
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
    if (collected.length >= BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES) {
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
        if (collected.length >= BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES) {
          break;
        }
        if (isDiagnosticRecord(error) && Array.isArray(error.issues)) {
          for (const childIssue of error.issues) {
            visit(childIssue);
            if (collected.length >= BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES) {
              break;
            }
          }
        }
      }
    }

    const errors = issue.errors;
    if (Array.isArray(errors)) {
      for (const child of errors) {
        if (collected.length >= BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES) {
          break;
        }
        if (Array.isArray(child)) {
          for (const childIssue of child) {
            visit(childIssue);
            if (collected.length >= BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES) {
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
    if (collected.length >= BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES) {
      break;
    }
  }

  return collected;
}

function schemaDiagnostics(params: {
  readonly outputParseStatus: BoundedEvidenceExtractionSchemaDiagnostics["outputParseStatus"];
  readonly failureCategory: BoundedEvidenceExtractionSchemaDiagnostics["failureCategory"];
  readonly issues?: readonly { readonly path?: readonly unknown[]; readonly code: string }[];
}): BoundedEvidenceExtractionSchemaDiagnostics {
  const issues = (params.issues ?? [])
    .slice(0, BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_DIAGNOSTIC_ISSUES)
    .map((issue) => ({
      path: (issue.path ?? [])
        .slice(0, BOUNDED_EVIDENCE_EXTRACTION_MAX_SCHEMA_PATH_SEGMENTS)
        .map(sanitizeSchemaPathSegment),
      code: boundedDiagnosticCode(issue.code),
    }));

  return {
    diagnosticVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.schema-diagnostics.x7w5c",
    contractName: "EvidenceExtractionResultSchema",
    contractVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
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
    removalTrigger: BOUNDED_EVIDENCE_EXTRACTION_SCHEMA_DIAGNOSTICS_REMOVAL_TRIGGER,
  };
}

function decision(params: {
  readonly request: Pick<
    RunBoundedEvidenceExtractionRuntimeRequest,
    | "extractionInputAuthorization"
    | "extractionInputRuntimeOwnership"
    | "executionReadinessDenial"
    | "executionReadinessRuntimeOwnership"
  >;
  readonly packet: BoundedTextExtractionInputPacket | null;
  readonly status: BoundedEvidenceExtractionStatus;
  readonly blockedReason: BoundedEvidenceExtractionBlockedReason | null;
  readonly damagedReason: BoundedEvidenceExtractionDamagedReason | null;
  readonly extractionResult: EvidenceExtractionResult | null;
  readonly applicabilityPrecheck?: BoundedEvidenceApplicabilityPrecheckSummary;
  readonly executionTelemetry: BoundedEvidenceExtractionModelTelemetry;
  readonly sideEffects: BoundedEvidenceExtractionSideEffects;
}): BoundedEvidenceExtractionDecision {
  const evidenceItems = params.extractionResult?.status === "accepted"
    ? params.extractionResult.evidenceItems
    : null;
  const statementProjections = (evidenceItems ?? []).map(projectEvidenceItemStatement);
  const extractionResultHash = params.extractionResult ? sha256Json(params.extractionResult) : null;
  const evidenceItemGenerated = params.status === "hidden_evidence_item_extraction_completed"
    && statementProjections.length > 0;

  return {
    decisionVersion: BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION,
    decisionId: buildDecisionId({
      status: params.status,
      packet: params.packet,
      extractionResultHash,
    }),
    kind: "bounded_evidence_extraction_execution",
    status: params.status,
    blockedReason: params.blockedReason,
    damagedReason: params.damagedReason,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    taskKey: "evidence_extraction",
    promptSectionId: BOUNDED_EVIDENCE_EXTRACTION_SECTION_ID,
    outputSchemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
    defaultProjection: "hash_length_provenance_only",
    evidenceItemTextReturnedByDefault: false,
    sourceTextReturnedByDefault: false,
    parent: parentSummary(params.request, params.packet),
    extractionResult: params.extractionResult,
    applicabilityPrecheck: params.applicabilityPrecheck,
    extractionResultHash,
    extractionResultStatus: params.extractionResult?.status ?? null,
    extractionStatus: params.extractionResult?.status === "accepted"
      ? params.extractionResult.extractionStatus
      : null,
    evidenceItemCount: statementProjections.length,
    evidenceItemStatementHashes: statementProjections.map((projection) => projection.statementHash),
    evidenceItemStatementByteLengths: statementProjections.map((projection) => projection.statementByteLength),
    evidenceItemStatementProjections: statementProjections,
    executionTelemetry: params.executionTelemetry,
    sideEffects: params.sideEffects,
    productExecution: {
      w4hPacketObserved: params.packet !== null,
      w4iEligibilityObserved:
        params.request.executionReadinessDenial?.status ===
          "extraction_input_structurally_eligible_execution_denied",
      boundedEvidenceExtractionExecuted:
        params.status === "hidden_evidence_item_extraction_completed" ||
        params.status === "hidden_no_extractable_evidence" ||
        (
          params.status === "damaged_execution" &&
          params.sideEffects.adapterCalled
        ),
      extractionExecutionAuthorized:
        params.status === "hidden_evidence_item_extraction_completed" ||
        params.status === "hidden_no_extractable_evidence" ||
        (
          params.status === "damaged_execution" &&
          params.sideEffects.adapterCalled
        ),
      llmExtractionCallAuthorized:
        params.status === "hidden_evidence_item_extraction_completed" ||
        params.status === "hidden_no_extractable_evidence" ||
        (
          params.status === "damaged_execution" &&
          params.sideEffects.modelCalled
        ),
      evidenceItemGenerated,
      parserExecuted: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicProjectionWritten: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
    },
  };
}

function buildDecisionId(params: {
  readonly status: BoundedEvidenceExtractionStatus;
  readonly packet: BoundedTextExtractionInputPacket | null;
  readonly extractionResultHash: string | null;
}): string {
  return `BOUNDED_EVIDENCE_EXTRACTION_${sha256Json({
    status: params.status,
    packetId: params.packet?.packetId ?? null,
    packetHash: params.packet?.inputTextHash ?? null,
    extractionResultHash: params.extractionResultHash,
  }).slice(0, 24).toUpperCase()}`;
}

function projectEvidenceItemStatement(item: ExtractedEvidenceItemContract): EvidenceItemStatementProjection {
  return {
    evidenceItemId: item.evidenceItemId,
    sourceRecordId: item.sourceRecordId,
    contentPacketId: item.contentPacketId,
    statementHash: sha256Text(item.statement),
    statementByteLength: utf8ByteLength(item.statement),
    statementCharLength: Array.from(item.statement).length,
    targetAtomicClaimIds: [...item.targetAtomicClaimIds],
    claimDirection: item.claimDirection,
    probativeValue: item.probativeValue,
    evidenceStrength: item.evidenceStrength,
    extractionConfidence: item.extractionConfidence,
    evidenceScopeHash: sha256Json(item.evidenceScope),
    provenanceHash: sha256Json(item.provenance),
  };
}

function blockedResult(
  reason: "task_policy_not_executable" | "input_contract_invalid" | "prompt_not_approved",
  message: string,
): EvidenceExtractionResult {
  return {
    schemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
    taskKey: "evidence_extraction",
    status: "blocked",
    extractionStatus: null,
    rationale: null,
    evidenceItems: null,
    integrityEvents: [
      event(
        reason === "input_contract_invalid" ? "input_contract_invalid" : "task_policy_blocked",
        "error",
        message,
        ["evidence_extraction"],
      ),
    ],
    blockedReason: reason,
    damagedReason: null,
  };
}

function damagedResult(
  reason: "provider_unavailable" | "schema_validation_failed" | "task_contract_validation_failed",
  message: string,
): EvidenceExtractionResult {
  return {
    schemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
    taskKey: "evidence_extraction",
    status: "damaged",
    extractionStatus: null,
    rationale: null,
    evidenceItems: null,
    integrityEvents: [
      event(
        reason === "provider_unavailable" ? "provider_unavailable" : "schema_validation_failed",
        "error",
        message,
        ["evidence_extraction"],
      ),
    ],
    blockedReason: null,
    damagedReason: reason,
  };
}

function validateW4h(
  request: RunBoundedEvidenceExtractionRuntimeRequest,
): { status: "accepted"; packet: BoundedTextExtractionInputPacket } | {
  status: "blocked";
  reason: BoundedEvidenceExtractionBlockedReason;
} {
  const decisionInput = request.extractionInputAuthorization;
  if (!decisionInput) {
    return { status: "blocked", reason: "w4h_decision_missing" };
  }
  if (request.extractionInputRuntimeOwnership !== "owned") {
    return { status: "blocked", reason: "w4h_not_runtime_owned" };
  }
  if (
    decisionInput.decisionVersion !== BOUNDED_EXTRACTION_INPUT_AUTHORIZATION_DECISION_VERSION ||
    decisionInput.status !== "bounded_extraction_input_packet_created_extraction_execution_closed" ||
    decisionInput.visibility !== "internal_admin_only" ||
    decisionInput.publicPointerExposure !== "forbidden" ||
    decisionInput.publicCutoverStatus !== "blocked_precutover"
  ) {
    return { status: "blocked", reason: "w4h_packet_invalid" };
  }
  const packet = decisionInput.extractionInputPacket;
  if (!packet || decisionInput.extractionInputPacketCount !== 1) {
    return { status: "blocked", reason: "w4h_packet_missing" };
  }
  if (
    packet.packetVersion !== BOUNDED_EXTRACTION_INPUT_PACKET_VERSION ||
    packet.kind !== "bounded_text_extraction_input_packet" ||
    packet.visibility !== "internal_admin_only" ||
    packet.publicPointerExposure !== "forbidden" ||
    packet.publicCutoverStatus !== "blocked_precutover" ||
    packet.inputText.length === 0 ||
    packet.inputTextByteLength <= 0 ||
    packet.inputTextByteLength > BOUNDED_EXTRACTION_INPUT_AGGREGATE_MAX_TEXT_BYTES ||
    utf8ByteLength(packet.inputText) !== packet.inputTextByteLength ||
    Array.from(packet.inputText).length !== packet.inputTextCharLength ||
    packet.inputTextHash !== sha256Text(packet.inputText)
  ) {
    return { status: "blocked", reason: "w4h_packet_invalid" };
  }
  if (
    packet.sourceMaterialTextHash !== packet.inputTextHash ||
    packet.sourceMaterialTextByteLength !== packet.inputTextByteLength
  ) {
    return { status: "blocked", reason: "packet_hash_mismatch" };
  }
  if (
    packet.providerId !== decisionInput.parent.providerId ||
    packet.providerId.trim().length === 0 ||
    packet.sourceContentPackets.length === 0 ||
    packet.providerIds.length !== packet.sourceContentPackets.length ||
    packet.providerIds.some((providerId, index) =>
      providerId.trim().length === 0 || providerId !== packet.sourceContentPackets[index]?.providerId
    )
  ) {
    return { status: "blocked", reason: "provider_id_mismatch" };
  }
  for (const contentPacket of packet.sourceContentPackets) {
    if (
      contentPacket.sourceRecordId.trim().length === 0 ||
      contentPacket.contentPacketId.trim().length === 0 ||
      contentPacket.contentText.length === 0 ||
      contentPacket.contentTextByteLength <= 0 ||
      contentPacket.contentTextByteLength > BOUNDED_EXTRACTION_INPUT_MAX_TEXT_BYTES ||
      utf8ByteLength(contentPacket.contentText) !== contentPacket.contentTextByteLength ||
      Array.from(contentPacket.contentText).length !== contentPacket.contentTextCharLength
    ) {
      return { status: "blocked", reason: "packet_length_mismatch" };
    }
    if (contentPacket.contentTextHash !== sha256Text(contentPacket.contentText)) {
      return { status: "blocked", reason: "packet_hash_mismatch" };
    }
  }
  return { status: "accepted", packet };
}

function validateW4i(
  request: RunBoundedEvidenceExtractionRuntimeRequest,
  packet: BoundedTextExtractionInputPacket,
): BoundedEvidenceExtractionBlockedReason | null {
  const decisionInput = request.executionReadinessDenial;
  if (!decisionInput) {
    return "w4i_decision_missing";
  }
  if (request.executionReadinessRuntimeOwnership !== "owned") {
    return "w4i_not_runtime_owned";
  }
  if (
    decisionInput.decisionVersion !== EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_DECISION_VERSION ||
    decisionInput.status !== "extraction_input_structurally_eligible_execution_denied" ||
    decisionInput.executionGateStatus !== "closed_pre_execution" ||
    decisionInput.deniedAuthority !== "x7w4i_no_extraction_execution_authority" ||
    decisionInput.visibility !== "internal_admin_only" ||
    decisionInput.publicPointerExposure !== "forbidden" ||
    decisionInput.publicCutoverStatus !== "blocked_precutover"
  ) {
    return "w4i_not_structurally_eligible";
  }
  if (
    decisionInput.packetObservation.packetCount !== 1 ||
    decisionInput.packetObservation.inputTextHash !== packet.inputTextHash ||
    decisionInput.packetObservation.inputTextByteLength !== packet.inputTextByteLength ||
    decisionInput.packetObservation.sourceMaterialTextHash !== packet.sourceMaterialTextHash ||
    decisionInput.packetObservation.sourceMaterialTextByteLength !== packet.sourceMaterialTextByteLength ||
    decisionInput.parent.providerId !== packet.providerId ||
    decisionInput.parent.packetId !== packet.packetId
  ) {
    if (decisionInput.parent.providerId !== packet.providerId) {
      return "provider_id_mismatch";
    }
    if (decisionInput.packetObservation.inputTextByteLength !== packet.inputTextByteLength) {
      return "packet_length_mismatch";
    }
    return "packet_hash_mismatch";
  }
  return null;
}

function validateClaimContract(
  claimContract: ClaimContract,
  packet: BoundedTextExtractionInputPacket,
): { status: "accepted"; selectedAtomicClaimIds: readonly string[] } | {
  status: "blocked";
  reason: BoundedEvidenceExtractionBlockedReason;
} {
  const parsed = ClaimContractSchema.safeParse(claimContract);
  if (!parsed.success) {
    return { status: "blocked", reason: "w4h_packet_invalid" };
  }
  const selectedAtomicClaimIds = parsed.data.input.selectedAtomicClaimIds
    .map((claimId) => claimId.trim())
    .filter((claimId) => claimId.length > 0);
  if (selectedAtomicClaimIds.length === 0 || new Set(selectedAtomicClaimIds).size !== selectedAtomicClaimIds.length) {
    return { status: "blocked", reason: "w4h_packet_invalid" };
  }
  if (
    packet.sourceMaterialRef.trim().length === 0 ||
    packet.packetId.trim().length === 0 ||
    packet.languageCode.trim().length === 0
  ) {
    return { status: "blocked", reason: "parent_lineage_mismatch" };
  }
  return { status: "accepted", selectedAtomicClaimIds };
}

function isApprovedX7W5ModelPolicy(policy: AnalyzerV2TaskModelPolicy): boolean {
  return policy.policyId === "v2.model.evidence_extraction.x7w5"
    && policy.gatewayTaskId === "evidence_extraction"
    && policy.modelTask === "extract_evidence"
    && policy.modelTier === "standard"
    && policy.providerPolicy === "from_config_snapshot"
    && policy.temperature === 0.1
    && policy.maxCalls === 1
    && policy.schemaRetryCount === 0
    && policy.timeoutMs === 90000
    && policy.maxOutputTokens === 8000
    && policy.fallbackBehavior === "none_fail_closed"
    && policy.escalationBehavior === "surface_provider_failure"
    && policy.execution === "blocked_until_prompt_model_cache_approval"
    && policy.approval.status === ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL.status
    && policy.approval.reviewer === ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL.reviewer
    && policy.approval.approvedAt === ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL.approvedAt;
}

function isApprovedHJ78ApplicabilityModelPolicy(policy: AnalyzerV2TaskModelPolicy): boolean {
  return policy.policyId === "v2.model.evidence_applicability.hj78"
    && policy.gatewayTaskId === "evidence_applicability"
    && policy.modelTask === "extract_evidence"
    && policy.modelTier === "standard"
    && policy.providerPolicy === "from_config_snapshot"
    && policy.temperature === 0.1
    && policy.maxCalls === 1
    && policy.schemaRetryCount === 0
    && policy.timeoutMs === 90000
    && policy.maxOutputTokens === 4000
    && policy.fallbackBehavior === "none_fail_closed"
    && policy.escalationBehavior === "surface_provider_failure"
    && policy.execution === "blocked_until_prompt_model_cache_approval"
    && policy.approval.status === ANALYZER_V2_HJ78_CAPTAIN_APPROVAL.status
    && policy.approval.reviewer === ANALYZER_V2_HJ78_CAPTAIN_APPROVAL.reviewer
    && policy.approval.approvedAt === ANALYZER_V2_HJ78_CAPTAIN_APPROVAL.approvedAt;
}

function validateTaskPolicy(
  context: PipelineRunContext,
): {
  status: "accepted";
  gatewayTask: AnalyzerV2GatewayTask;
  modelPolicy: AnalyzerV2TaskModelPolicy;
  cachePolicy: AnalyzerV2CachePolicy;
} | {
  status: "blocked";
  reason: BoundedEvidenceExtractionBlockedReason;
} {
  const gatewayTask = getPipelineRunGatewayTask(context, "evidence_extraction");
  const modelPolicy = getPipelineRunTaskModelPolicy(context, "evidence_extraction");
  const cachePolicy = gatewayTask.cachePolicy ?? ANALYZER_V2_EVIDENCE_EXTRACTION_CACHE_POLICY;
  if (!modelPolicy || !isApprovedX7W5ModelPolicy(modelPolicy)) {
    return { status: "blocked", reason: "prompt_or_model_not_approved" };
  }
  if (!canExecuteAnalyzerV2GatewayTask(gatewayTask)) {
    return { status: "blocked", reason: "task_policy_not_executable" };
  }
  if (cachePolicy.approval.status !== "approved") {
    return { status: "blocked", reason: "prompt_or_model_not_approved" };
  }
  return { status: "accepted", gatewayTask, modelPolicy, cachePolicy };
}

function validateApplicabilityTaskPolicy(
  context: PipelineRunContext,
): {
  status: "accepted";
  gatewayTask: AnalyzerV2GatewayTask;
  modelPolicy: AnalyzerV2TaskModelPolicy;
  cachePolicy: AnalyzerV2CachePolicy;
} | {
  status: "blocked";
  reason: BoundedEvidenceExtractionBlockedReason;
} {
  const gatewayTask = getPipelineRunGatewayTask(context, "evidence_applicability");
  const modelPolicy = getPipelineRunTaskModelPolicy(context, "evidence_applicability");
  const cachePolicy = gatewayTask.cachePolicy ?? ANALYZER_V2_EVIDENCE_APPLICABILITY_CACHE_POLICY;
  if (!modelPolicy || !isApprovedHJ78ApplicabilityModelPolicy(modelPolicy)) {
    return { status: "blocked", reason: "prompt_or_model_not_approved" };
  }
  if (!canExecuteAnalyzerV2GatewayTask(gatewayTask)) {
    return { status: "blocked", reason: "task_policy_not_executable" };
  }
  if (cachePolicy.approval.status !== "approved") {
    return { status: "blocked", reason: "prompt_or_model_not_approved" };
  }
  return { status: "accepted", gatewayTask, modelPolicy, cachePolicy };
}

function hasCacheDimensionValue(input: CacheKeyInput, dimension: AnalyzerV2CacheDimension): boolean {
  const value = input[dimension];
  return (typeof value === "string" && value.trim().length > 0)
    || (typeof value === "number" && Number.isFinite(value));
}

function buildCacheKeyParts(
  policy: AnalyzerV2CachePolicy,
  input: CacheKeyInput,
): Array<{ dimension: AnalyzerV2CacheDimension; value: string }> {
  return [...policy.requiredDimensions, ...policy.optionalDimensions]
    .filter((dimension) => hasCacheDimensionValue(input, dimension))
    .map((dimension) => ({
      dimension,
      value: String(input[dimension]),
    }));
}

function buildNoStoreCacheDecision(
  policy: AnalyzerV2CachePolicy,
  namespace: string,
  input: CacheKeyInput,
): AnalyzerV2CacheDecision {
  const missingDimensions = policy.requiredDimensions.filter(
    (dimension) => !hasCacheDimensionValue(input, dimension),
  );
  if (missingDimensions.length > 0) {
    return {
      namespace,
      canRead: false,
      canWrite: false,
      reason: "no_store_until_execution_approved",
      missingDimensions,
      keyParts: [],
    };
  }
  return {
    namespace,
    canRead: false,
    canWrite: false,
    reason: "no_store_runtime_dispatch_safety",
    missingDimensions: [],
    keyParts: buildCacheKeyParts(policy, input),
  };
}

function buildTaskPolicySnapshot(params: {
  gatewayTask: AnalyzerV2GatewayTask;
  modelPolicy: AnalyzerV2TaskModelPolicy;
  cachePolicy: AnalyzerV2CachePolicy;
  w4iStatus: string;
}): Record<string, unknown> {
  return {
    gatewayTask: params.gatewayTask,
    modelPolicy: params.modelPolicy,
    cachePolicy: params.cachePolicy,
    approvedScope: "hidden_internal_evidence_extraction_single_packet",
    sourcePackage: BOUNDED_EVIDENCE_EXTRACTION_SOURCE_PACKAGE,
    w4iPreCallGate: {
      status: params.w4iStatus,
      mergeState: "merged_by_parity_rechecked_not_deleted",
      removalTrigger: "first_positive_w5_executor_proof_plus_reviewed_followup",
    },
  };
}

function buildApplicabilityTaskPolicySnapshot(params: {
  gatewayTask: AnalyzerV2GatewayTask;
  modelPolicy: AnalyzerV2TaskModelPolicy;
  cachePolicy: AnalyzerV2CachePolicy;
}): Record<string, unknown> {
  return {
    gatewayTask: params.gatewayTask,
    modelPolicy: params.modelPolicy,
    cachePolicy: params.cachePolicy,
    approvedScope: "hidden_internal_evidence_applicability_precheck_single_packet",
    sourcePackage: BOUNDED_EVIDENCE_APPLICABILITY_SOURCE_PACKAGE,
  };
}

function buildSourceContentPacketsJson(packet: BoundedTextExtractionInputPacket): string {
  return JSON.stringify(packet.sourceContentPackets.map((contentPacket) => ({
    sourceRecordId: contentPacket.sourceRecordId,
    contentPacketId: contentPacket.contentPacketId,
    providerId: contentPacket.providerId,
    sourceMaterialKind: contentPacket.sourceMaterialKind,
    languageCode: contentPacket.languageCode,
    contentText: contentPacket.contentText,
    contentTextHash: contentPacket.contentTextHash,
    contentTextByteLength: contentPacket.contentTextByteLength,
    contentTextCharLength: contentPacket.contentTextCharLength,
    maxContentTextBytes: contentPacket.maxContentTextBytes,
    provenance: {
      locatorRef: contentPacket.provenance.locatorRef,
      candidatePreviewId: contentPacket.provenance.candidatePreviewId,
      sourceMaterialEndpointId: contentPacket.sourceMaterialEndpointId,
    },
  })));
}

function buildSourceAcquisitionTraceJson(packet: BoundedTextExtractionInputPacket): string {
  return JSON.stringify({
    traceVersion: "v2.evidence-lifecycle.evidence-applicability.source-trace.hj78",
    parentPacketId: packet.packetId,
    parentPacketHash: packet.inputTextHash,
    parentPacketByteLength: packet.inputTextByteLength,
    sourceMaterialRefs: packet.sourceMaterialRefs,
    providerIds: packet.providerIds,
    sourceMaterialEndpointIds: packet.sourceMaterialEndpointIds,
    sourceMaterialKinds: packet.sourceMaterialKinds,
    languageCodes: packet.languageCodes,
    sourceContentPackets: packet.sourceContentPackets.map((contentPacket) => ({
      sourceRecordId: contentPacket.sourceRecordId,
      contentPacketId: contentPacket.contentPacketId,
      providerId: contentPacket.providerId,
      sourceMaterialEndpointId: contentPacket.sourceMaterialEndpointId,
      sourceMaterialKind: contentPacket.sourceMaterialKind,
      languageCode: contentPacket.languageCode,
      contentTextHash: contentPacket.contentTextHash,
      contentTextByteLength: contentPacket.contentTextByteLength,
      contentTextCharLength: contentPacket.contentTextCharLength,
      maxContentTextBytes: contentPacket.maxContentTextBytes,
      provenance: contentPacket.provenance,
    })),
    redaction: {
      contentTextReturned: false,
      inputTextReturned: false,
      sourceTextReturned: false,
      rawProviderPayloadReturned: false,
      promptTextReturned: false,
    },
  });
}

function buildStructuralApplicabilityResult(
  packet: BoundedTextExtractionInputPacket,
  selectedAtomicClaimIds: readonly string[],
): EvidenceApplicabilityResult {
  return {
    schemaVersion: "v2.evidence_applicability_result.0",
    taskKey: "evidence_applicability",
    status: "accepted",
    applicabilityDecisions: packet.sourceContentPackets.map((contentPacket) => ({
      sourceRecordId: contentPacket.sourceRecordId,
      contentPacketId: contentPacket.contentPacketId,
      targetAtomicClaimIds: [...selectedAtomicClaimIds],
      applicability: "uncertain",
      rationale: "W5 uses the existing extraction prompt with structural-only applicability context; semantic extraction remains LLM-owned.",
      missingDimensions: [],
    })),
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function buildPromptVariables(params: {
  claimContract: ClaimContract;
  taskPolicySnapshot: Record<string, unknown>;
  packet: BoundedTextExtractionInputPacket;
  selectedAtomicClaimIds: readonly string[];
  applicabilityResult: EvidenceApplicabilityResult;
}): Record<BoundedEvidenceExtractionPromptVariable, string> {
  return {
    claimContractJson: JSON.stringify(params.claimContract),
    taskPolicySnapshotJson: JSON.stringify(params.taskPolicySnapshot),
    sourceContentPacketsJson: buildSourceContentPacketsJson(params.packet),
    applicabilityResultJson: JSON.stringify(params.applicabilityResult),
  };
}

function buildApplicabilityPromptVariables(params: {
  claimContract: ClaimContract;
  taskPolicySnapshot: Record<string, unknown>;
  packet: BoundedTextExtractionInputPacket;
}): Record<BoundedEvidenceApplicabilityPromptVariable, string> {
  return {
    claimContractJson: JSON.stringify(params.claimContract),
    taskPolicySnapshotJson: JSON.stringify(params.taskPolicySnapshot),
    sourceContentPacketsJson: buildSourceContentPacketsJson(params.packet),
    sourceAcquisitionTraceJson: buildSourceAcquisitionTraceJson(params.packet),
  };
}

async function loadAndRenderPrompt(
  variables: Record<BoundedEvidenceExtractionPromptVariable, string>,
): Promise<RenderedBoundedEvidenceExtractionPrompt> {
  const promptRoot = path.resolve(process.cwd(), "prompts");
  const promptFilePath = path.join(promptRoot, BOUNDED_EVIDENCE_EXTRACTION_PROMPT_FILE);
  for (const variableName of BOUNDED_EVIDENCE_EXTRACTION_VARIABLES) {
    JSON.parse(variables[variableName]);
  }
  const content = (await readFile(promptFilePath, "utf8")).replace(/\r\n/g, "\n");
  const frontmatterPipeline = readFrontmatterPipeline(content);
  if (frontmatterPipeline !== BOUNDED_EVIDENCE_EXTRACTION_PROMPT_PROFILE) {
    throw new Error("Analyzer V2 evidence-extraction prompt frontmatter pipeline mismatch.");
  }
  const section = readSection(content, BOUNDED_EVIDENCE_EXTRACTION_SECTION_ID);
  if (!section.includes(EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION)) {
    throw new Error("Analyzer V2 evidence-extraction prompt section is not aligned to the approved schema.");
  }
  for (const variableName of BOUNDED_EVIDENCE_EXTRACTION_VARIABLES) {
    if (!section.includes(variableName)) {
      throw new Error("Analyzer V2 evidence-extraction prompt section is missing a required packet name.");
    }
  }

  return {
    profile: BOUNDED_EVIDENCE_EXTRACTION_PROMPT_PROFILE,
    sectionId: BOUNDED_EVIDENCE_EXTRACTION_SECTION_ID,
    promptFilePath,
    promptContentHash: computeContentHash(canonicalizeContent("prompt", content)),
    renderedPrompt: [
      section,
      "### Runtime JSON Packets",
      ...BOUNDED_EVIDENCE_EXTRACTION_VARIABLES.map((variableName) => [
        `Packet: ${variableName}`,
        "```json",
        variables[variableName],
        "```",
      ].join("\n")),
    ].join("\n\n"),
  };
}

async function loadAndRenderApplicabilityPrompt(
  variables: Record<BoundedEvidenceApplicabilityPromptVariable, string>,
): Promise<RenderedEvidenceApplicabilityPrompt> {
  const promptRoot = path.resolve(process.cwd(), "prompts");
  const promptFilePath = path.join(promptRoot, BOUNDED_EVIDENCE_EXTRACTION_PROMPT_FILE);
  for (const variableName of BOUNDED_EVIDENCE_APPLICABILITY_VARIABLES) {
    JSON.parse(variables[variableName]);
  }
  const content = (await readFile(promptFilePath, "utf8")).replace(/\r\n/g, "\n");
  const frontmatterPipeline = readFrontmatterPipeline(content);
  if (frontmatterPipeline !== BOUNDED_EVIDENCE_EXTRACTION_PROMPT_PROFILE) {
    throw new Error("Analyzer V2 evidence-applicability prompt frontmatter pipeline mismatch.");
  }
  const section = readSection(content, BOUNDED_EVIDENCE_APPLICABILITY_SECTION_ID);
  if (!section.includes(EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION)) {
    throw new Error("Analyzer V2 evidence-applicability prompt section is not aligned to the approved schema.");
  }
  for (const variableName of BOUNDED_EVIDENCE_APPLICABILITY_VARIABLES) {
    if (!section.includes(variableName)) {
      throw new Error("Analyzer V2 evidence-applicability prompt section is missing a required packet name.");
    }
  }

  return {
    profile: BOUNDED_EVIDENCE_EXTRACTION_PROMPT_PROFILE,
    sectionId: BOUNDED_EVIDENCE_APPLICABILITY_SECTION_ID,
    promptFilePath,
    promptContentHash: computeContentHash(canonicalizeContent("prompt", content)),
    renderedPrompt: [
      section,
      "### Runtime JSON Packets",
      ...BOUNDED_EVIDENCE_APPLICABILITY_VARIABLES.map((variableName) => [
        `Packet: ${variableName}`,
        "```json",
        variables[variableName],
        "```",
      ].join("\n")),
    ].join("\n\n"),
  };
}

function readFrontmatterPipeline(content: string): string | null {
  if (!content.startsWith("---\n")) {
    return null;
  }
  const end = content.indexOf("\n---", 4);
  if (end < 0) {
    return null;
  }
  const match = content.slice(4, end).match(/^pipeline:\s*(.+)$/m);
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? null;
}

function readSection(content: string, sectionId: string): string {
  const header = `## ${sectionId}`;
  const start = content.indexOf(header);
  if (start < 0) {
    throw new Error("Analyzer V2 evidence-extraction prompt section not found.");
  }
  const contentStart = start + header.length;
  const nextHeader = content.indexOf("\n## ", contentStart);
  return content.slice(contentStart, nextHeader >= 0 ? nextHeader : undefined).trim();
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

function coerceProviderOutput(output: unknown): { status: "parsed"; value: unknown } | {
  status: "parse_failure";
  message: string;
} {
  if (typeof output !== "string") {
    return { status: "parsed", value: output };
  }
  try {
    return { status: "parsed", value: parseProviderOutputText(output) };
  } catch {
    return {
      status: "parse_failure",
      message: "json_parse_error",
    };
  }
}

function validateProviderTelemetry(telemetryInput: BoundedEvidenceExtractionProviderTelemetry): string | null {
  if (!isRealRuntimeValue(telemetryInput.providerId)) {
    return "invalid provider telemetry";
  }
  if (!isRealRuntimeValue(telemetryInput.modelId)) {
    return "invalid model telemetry";
  }
  for (const value of [
    telemetryInput.inputTokens,
    telemetryInput.outputTokens,
    telemetryInput.totalTokens,
    telemetryInput.durationMs,
  ]) {
    if (!Number.isFinite(value) || value < 0) {
      return "invalid numeric telemetry";
    }
  }
  return null;
}

function validateAcceptedResultContent(
  result: EvidenceExtractionResult,
  frame: BoundedEvidenceExtractionInputFrame,
): BoundedEvidenceExtractionTaskContractDiagnosticCode | null {
  if (result.status !== "accepted") {
    return null;
  }
  const selectedIdSet = new Set(frame.targetAtomicClaimIds);
  const approvedPackets = new Set(
    frame.sourceContentPackets.map((packet) => `${packet.sourceRecordId}\u0000${packet.contentPacketId}`),
  );
  for (const item of result.evidenceItems) {
    if (!approvedPackets.has(`${item.sourceRecordId}\u0000${item.contentPacketId}`)) {
      return "approved_packet_mismatch";
    }
    if (item.statement.trim().length === 0) {
      return "empty_evidence_statement";
    }
    if (item.targetAtomicClaimIds.length === 0) {
      return "missing_target_atomic_claims";
    }
    for (const claimId of item.targetAtomicClaimIds) {
      if (!selectedIdSet.has(claimId)) {
        return "unselected_target_atomic_claim";
      }
    }
  }
  return null;
}

function applicabilityBlockedResult(
  reason: "task_policy_not_executable" | "input_contract_invalid" | "prompt_not_approved",
  message: string,
): EvidenceApplicabilityResult {
  return {
    schemaVersion: EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
    taskKey: "evidence_applicability",
    status: "blocked",
    applicabilityDecisions: null,
    integrityEvents: [
      event(
        reason === "input_contract_invalid" ? "input_contract_invalid" : "task_policy_blocked",
        "error",
        message,
        ["evidence_applicability"],
      ),
    ],
    blockedReason: reason,
    damagedReason: null,
  };
}

function applicabilityDamagedResult(
  reason: "provider_unavailable" | "schema_validation_failed" | "task_contract_validation_failed",
  message: string,
): EvidenceApplicabilityResult {
  return {
    schemaVersion: EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
    taskKey: "evidence_applicability",
    status: "damaged",
    applicabilityDecisions: null,
    integrityEvents: [
      event(
        reason === "provider_unavailable" ? "provider_unavailable" : "schema_validation_failed",
        "error",
        message,
        ["evidence_applicability"],
      ),
    ],
    blockedReason: null,
    damagedReason: reason,
  };
}

function validateAcceptedApplicabilityContent(
  result: EvidenceApplicabilityResult,
  frame: BoundedEvidenceExtractionInputFrame,
): "accepted" | "content_packet_mismatch" | "missing_decision" | "duplicate_decision" | "unselected_target_atomic_claim" {
  if (result.status !== "accepted") {
    return "accepted";
  }
  const selectedIds = new Set(frame.targetAtomicClaimIds);
  const expectedPairs = new Set(
    frame.sourceContentPackets.map((packet) => `${packet.sourceRecordId}\u0000${packet.contentPacketId}`),
  );
  const observedPairs = new Set<string>();
  for (const decisionEntry of result.applicabilityDecisions) {
    const pair = `${decisionEntry.sourceRecordId}\u0000${decisionEntry.contentPacketId}`;
    if (!expectedPairs.has(pair)) {
      return "content_packet_mismatch";
    }
    if (observedPairs.has(pair)) {
      return "duplicate_decision";
    }
    observedPairs.add(pair);
    for (const claimId of decisionEntry.targetAtomicClaimIds) {
      if (!selectedIds.has(claimId)) {
        return "unselected_target_atomic_claim";
      }
    }
  }
  return observedPairs.size === expectedPairs.size ? "accepted" : "missing_decision";
}

async function executeApplicabilityAdapter(params: {
  readonly gatewayTask: AnalyzerV2GatewayTask;
  readonly modelPolicy: AnalyzerV2TaskModelPolicy;
  readonly renderedPrompt: RenderedEvidenceApplicabilityPrompt;
  readonly inputFrame: BoundedEvidenceExtractionInputFrame;
  readonly cacheDecision: AnalyzerV2CacheDecision;
  readonly providerCall: BoundedEvidenceApplicabilityProviderCall;
}): Promise<{
  readonly result: EvidenceApplicabilityResult;
  readonly summary: BoundedEvidenceApplicabilityPrecheckSummary;
}> {
  if (!canExecuteAnalyzerV2GatewayTask(params.gatewayTask)) {
    const result = applicabilityBlockedResult(
      "task_policy_not_executable",
      "Evidence applicability gateway policy is not executable.",
    );
    return {
      result,
      summary: summarizeApplicabilityResult({
        result,
        source: "runtime_evidence_applicability_task",
        promptContentHash: params.renderedPrompt.promptContentHash,
        renderedPromptHash: sha256Text(params.renderedPrompt.renderedPrompt),
        modelPolicyId: params.modelPolicy.policyId,
        cacheDecisionReason: params.cacheDecision.reason,
      }),
    };
  }

  const maxAttempts = Math.max(1, Math.min(params.modelPolicy.maxCalls, params.modelPolicy.schemaRetryCount + 1));
  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    let providerResponse: BoundedEvidenceApplicabilityProviderCallResponse;
    try {
      providerResponse = await params.providerCall({
        renderedPrompt: params.renderedPrompt.renderedPrompt,
        promptContentHash: params.renderedPrompt.promptContentHash,
        outputSchemaVersion: EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
        attemptNumber,
        maxAttempts,
        modelPolicy: params.modelPolicy,
        inputFrame: params.inputFrame,
      });
    } catch {
      const result = applicabilityDamagedResult(
        "provider_unavailable",
        "Evidence applicability provider was unavailable.",
      );
      return {
        result,
        summary: summarizeApplicabilityResult({
          result,
          source: "runtime_evidence_applicability_task",
          modelCalled: true,
          promptContentHash: params.renderedPrompt.promptContentHash,
          renderedPromptHash: sha256Text(params.renderedPrompt.renderedPrompt),
          modelPolicyId: params.modelPolicy.policyId,
          cacheDecisionReason: params.cacheDecision.reason,
        }),
      };
    }

    const telemetryError = validateProviderTelemetry(providerResponse.telemetry);
    if (telemetryError) {
      const result = applicabilityDamagedResult(
        "provider_unavailable",
        "Evidence applicability provider telemetry was invalid.",
      );
      return {
        result,
        summary: summarizeApplicabilityResult({
          result,
          source: "runtime_evidence_applicability_task",
          modelCalled: true,
          promptContentHash: params.renderedPrompt.promptContentHash,
          renderedPromptHash: sha256Text(params.renderedPrompt.renderedPrompt),
          modelPolicyId: params.modelPolicy.policyId,
          cacheDecisionReason: params.cacheDecision.reason,
        }),
      };
    }

    const parsedOutput = coerceProviderOutput(providerResponse.output);
    if (parsedOutput.status === "parse_failure") {
      const result = applicabilityDamagedResult(
        "schema_validation_failed",
        "Evidence applicability output could not be parsed as JSON.",
      );
      return {
        result,
        summary: summarizeApplicabilityResult({
          result,
          source: "runtime_evidence_applicability_task",
          modelCalled: true,
          promptContentHash: params.renderedPrompt.promptContentHash,
          renderedPromptHash: sha256Text(params.renderedPrompt.renderedPrompt),
          modelPolicyId: params.modelPolicy.policyId,
          providerTelemetry: providerResponse.telemetry,
          cacheDecisionReason: params.cacheDecision.reason,
        }),
      };
    }

    const parsedResult = EvidenceApplicabilityResultSchema.safeParse(parsedOutput.value);
    if (!parsedResult.success) {
      const result = applicabilityDamagedResult(
        "schema_validation_failed",
        "Evidence applicability output failed schema validation.",
      );
      return {
        result,
        summary: summarizeApplicabilityResult({
          result,
          source: "runtime_evidence_applicability_task",
          modelCalled: true,
          promptContentHash: params.renderedPrompt.promptContentHash,
          renderedPromptHash: sha256Text(params.renderedPrompt.renderedPrompt),
          modelPolicyId: params.modelPolicy.policyId,
          providerTelemetry: providerResponse.telemetry,
          cacheDecisionReason: params.cacheDecision.reason,
        }),
      };
    }

    const result = parsedResult.data as EvidenceApplicabilityResult;
    const contentValidation = validateAcceptedApplicabilityContent(result, params.inputFrame);
    if (contentValidation !== "accepted") {
      const damaged = applicabilityDamagedResult(
        "task_contract_validation_failed",
        "Evidence applicability output failed task contract validation.",
      );
      return {
        result: damaged,
        summary: summarizeApplicabilityResult({
          result: damaged,
          source: "runtime_evidence_applicability_task",
          modelCalled: true,
          promptContentHash: params.renderedPrompt.promptContentHash,
          renderedPromptHash: sha256Text(params.renderedPrompt.renderedPrompt),
          modelPolicyId: params.modelPolicy.policyId,
          providerTelemetry: providerResponse.telemetry,
          cacheDecisionReason: params.cacheDecision.reason,
        }),
      };
    }

    return {
      result,
      summary: summarizeApplicabilityResult({
        result,
        source: "runtime_evidence_applicability_task",
        modelCalled: true,
        promptContentHash: params.renderedPrompt.promptContentHash,
        renderedPromptHash: sha256Text(params.renderedPrompt.renderedPrompt),
        modelPolicyId: params.modelPolicy.policyId,
        providerTelemetry: providerResponse.telemetry,
        cacheDecisionReason: params.cacheDecision.reason,
      }),
    };
  }

  const result = applicabilityDamagedResult(
    "schema_validation_failed",
    "Evidence applicability output failed validation.",
  );
  return {
    result,
    summary: summarizeApplicabilityResult({
      result,
      source: "runtime_evidence_applicability_task",
      promptContentHash: params.renderedPrompt.promptContentHash,
      renderedPromptHash: sha256Text(params.renderedPrompt.renderedPrompt),
      modelPolicyId: params.modelPolicy.policyId,
      cacheDecisionReason: params.cacheDecision.reason,
    }),
  };
}

async function executeAdapter(params: {
  readonly gatewayTask: AnalyzerV2GatewayTask;
  readonly modelPolicy: AnalyzerV2TaskModelPolicy;
  readonly renderedPrompt: RenderedBoundedEvidenceExtractionPrompt;
  readonly inputFrame: BoundedEvidenceExtractionInputFrame;
  readonly configSnapshotHash: string;
  readonly cacheDecision: AnalyzerV2CacheDecision;
  readonly providerCall: BoundedEvidenceExtractionProviderCall;
}): Promise<{
  readonly result: EvidenceExtractionResult;
  readonly attempts: readonly BoundedEvidenceExtractionModelAttempt[];
  readonly telemetry: BoundedEvidenceExtractionModelTelemetry;
  readonly damagedReason: BoundedEvidenceExtractionDamagedReason | null;
}> {
  if (!canExecuteAnalyzerV2GatewayTask(params.gatewayTask)) {
    return {
      result: blockedResult("task_policy_not_executable", "Evidence extraction gateway policy is not executable."),
      attempts: [],
      telemetry: telemetry({
        promptContentHash: params.renderedPrompt.promptContentHash,
        renderedPromptHash: sha256Text(params.renderedPrompt.renderedPrompt),
        configSnapshotHash: params.configSnapshotHash,
        modelPolicyId: params.modelPolicy.policyId,
        cacheDecisionReason: params.cacheDecision.reason,
        approvalPointer: BOUNDED_EVIDENCE_EXTRACTION_SOURCE_PACKAGE,
      }),
      damagedReason: null,
    };
  }

  const attempts: BoundedEvidenceExtractionModelAttempt[] = [];
  const maxAttempts = Math.max(1, Math.min(params.modelPolicy.maxCalls, params.modelPolicy.schemaRetryCount + 1));
  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    let providerResponse: BoundedEvidenceExtractionProviderCallResponse;
    try {
      providerResponse = await params.providerCall({
        renderedPrompt: params.renderedPrompt.renderedPrompt,
        promptContentHash: params.renderedPrompt.promptContentHash,
        outputSchemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
        attemptNumber,
        maxAttempts,
        modelPolicy: params.modelPolicy,
        inputFrame: params.inputFrame,
      });
    } catch {
      attempts.push({
        attemptNumber,
        promptContentHash: params.renderedPrompt.promptContentHash,
        status: "provider_failure",
        providerTelemetry: null,
        failureMessage: "provider failure",
        schemaDiagnostics: null,
      });
      return adapterOutcome(params, attempts, damagedResult(
        "provider_unavailable",
        "Evidence extraction provider was unavailable.",
      ), "provider_unavailable");
    }

    const telemetryError = validateProviderTelemetry(providerResponse.telemetry);
    if (telemetryError) {
      attempts.push({
        attemptNumber,
        promptContentHash: params.renderedPrompt.promptContentHash,
        status: "provider_failure",
        providerTelemetry: null,
        failureMessage: telemetryError,
        schemaDiagnostics: null,
      });
      return adapterOutcome(params, attempts, damagedResult(
        "provider_unavailable",
        "Evidence extraction provider telemetry was invalid.",
      ), "provider_unavailable");
    }

    const parsedOutput = coerceProviderOutput(providerResponse.output);
    if (parsedOutput.status === "parse_failure") {
      attempts.push({
        attemptNumber,
        promptContentHash: params.renderedPrompt.promptContentHash,
        status: "parse_failure",
        providerTelemetry: providerResponse.telemetry,
        failureMessage: parsedOutput.message,
        schemaDiagnostics: schemaDiagnostics({
          outputParseStatus: "parse_failure",
          failureCategory: "parse_failure",
          issues: [{ path: [], code: "json_parse_error" }],
        }),
      });
      return adapterOutcome(params, attempts, damagedResult(
        "schema_validation_failed",
        "Evidence extraction output could not be parsed as JSON.",
      ), "parse_failure");
    }

    const parsedResult = EvidenceExtractionResultSchema.safeParse(parsedOutput.value);
    if (!parsedResult.success) {
      const diagnostics = schemaDiagnostics({
        outputParseStatus: "parsed",
        failureCategory: "schema_validation",
        issues: collectSchemaIssueDiagnostics(parsedResult.error.issues),
      });
      attempts.push({
        attemptNumber,
        promptContentHash: params.renderedPrompt.promptContentHash,
        status: "invalid_schema",
        providerTelemetry: providerResponse.telemetry,
        failureMessage: "schema_validation_failed",
        schemaDiagnostics: diagnostics,
      });
      return adapterOutcome(params, attempts, damagedResult(
        "schema_validation_failed",
        "Evidence extraction output failed schema validation.",
      ), "schema_validation_failed");
    }

    const result = parsedResult.data as EvidenceExtractionResult;
    const contentError = validateAcceptedResultContent(result, params.inputFrame);
    if (contentError) {
      attempts.push({
        attemptNumber,
        promptContentHash: params.renderedPrompt.promptContentHash,
        status: "invalid_schema",
        providerTelemetry: providerResponse.telemetry,
        failureMessage: "task_contract_validation_failed",
        schemaDiagnostics: schemaDiagnostics({
          outputParseStatus: "parsed",
          failureCategory: "task_contract_validation",
          issues: [{ path: ["evidenceItems"], code: contentError }],
        }),
      });
      return adapterOutcome(params, attempts, damagedResult(
        "task_contract_validation_failed",
        "Evidence extraction output failed task contract validation.",
      ), "task_contract_validation_failed");
    }

    attempts.push({
      attemptNumber,
      promptContentHash: params.renderedPrompt.promptContentHash,
      status: "accepted",
      providerTelemetry: providerResponse.telemetry,
      failureMessage: null,
      schemaDiagnostics: null,
    });
    return adapterOutcome(params, attempts, result, null);
  }

  return adapterOutcome(params, attempts, damagedResult(
    "schema_validation_failed",
    "Evidence extraction output failed validation.",
  ), "schema_validation_failed");
}

function adapterOutcome(
  params: {
    readonly modelPolicy: AnalyzerV2TaskModelPolicy;
    readonly renderedPrompt: RenderedBoundedEvidenceExtractionPrompt;
    readonly configSnapshotHash: string;
    readonly cacheDecision: AnalyzerV2CacheDecision;
  },
  attempts: readonly BoundedEvidenceExtractionModelAttempt[],
  result: EvidenceExtractionResult,
  damagedReason: BoundedEvidenceExtractionDamagedReason | null,
): {
  readonly result: EvidenceExtractionResult;
  readonly attempts: readonly BoundedEvidenceExtractionModelAttempt[];
  readonly telemetry: BoundedEvidenceExtractionModelTelemetry;
  readonly damagedReason: BoundedEvidenceExtractionDamagedReason | null;
} {
  const providerAttempts = attempts
    .map((attempt) => attempt.providerTelemetry)
    .filter((attempt): attempt is BoundedEvidenceExtractionProviderTelemetry => attempt !== null);
  const lastTelemetry = providerAttempts.at(-1) ?? null;
  return {
    result,
    attempts,
    telemetry: telemetry({
      promptContentHash: params.renderedPrompt.promptContentHash,
      renderedPromptHash: sha256Text(params.renderedPrompt.renderedPrompt),
      configSnapshotHash: params.configSnapshotHash,
      schemaDiagnostics: attempts.at(-1)?.schemaDiagnostics ?? null,
      modelPolicyId: params.modelPolicy.policyId,
      providerId: lastTelemetry?.providerId ?? null,
      modelId: lastTelemetry?.modelId ?? null,
      tokenUsage: {
        inputTokens: providerAttempts.reduce((total, entry) => total + entry.inputTokens, 0),
        outputTokens: providerAttempts.reduce((total, entry) => total + entry.outputTokens, 0),
        totalTokens: providerAttempts.reduce((total, entry) => total + entry.totalTokens, 0),
      },
      durationMs: providerAttempts.reduce((total, entry) => total + entry.durationMs, 0),
      cacheDecisionReason: params.cacheDecision.reason,
      approvalPointer: BOUNDED_EVIDENCE_EXTRACTION_SOURCE_PACKAGE,
    }),
    damagedReason,
  };
}

function buildCacheDecisionInput(params: {
  readonly renderedPromptContentHash: string;
  readonly request: RunBoundedEvidenceExtractionRuntimeRequest;
  readonly packet: BoundedTextExtractionInputPacket;
  readonly selectedAtomicClaimIds: readonly string[];
  readonly modelPolicy: AnalyzerV2TaskModelPolicy;
}): CacheKeyInput {
  return {
    promptProfile: BOUNDED_EVIDENCE_EXTRACTION_PROMPT_PROFILE,
    promptSectionId: BOUNDED_EVIDENCE_EXTRACTION_SECTION_ID,
    promptContentHash: params.renderedPromptContentHash,
    modelTask: params.modelPolicy.modelTask,
    provider: params.request.providerId,
    modelName: params.request.modelId,
    temperature: params.modelPolicy.temperature,
    outputSchemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
    configSnapshotHash: params.request.configSnapshotHash,
    resultSchemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
    inputIdentityHash: sha256Json({
      claimContract: params.request.claimContract,
      selectedAtomicClaimIds: params.selectedAtomicClaimIds,
      packetId: params.packet.packetId,
      packetHash: params.packet.inputTextHash,
    }),
    sourceIdentityHash: params.packet.inputTextHash,
    languageContextHash: sha256Json({ languageCode: params.packet.languageCode }),
    currentDateBucket: params.request.context.currentDate,
    adapterVersion: BOUNDED_EVIDENCE_EXTRACTION_RUNTIME_VERSION,
  };
}

function buildApplicabilityCacheDecisionInput(params: {
  readonly renderedPromptContentHash: string;
  readonly request: RunBoundedEvidenceExtractionRuntimeRequest;
  readonly packet: BoundedTextExtractionInputPacket;
  readonly selectedAtomicClaimIds: readonly string[];
  readonly modelPolicy: AnalyzerV2TaskModelPolicy;
}): CacheKeyInput {
  return {
    promptProfile: BOUNDED_EVIDENCE_EXTRACTION_PROMPT_PROFILE,
    promptSectionId: BOUNDED_EVIDENCE_APPLICABILITY_SECTION_ID,
    promptContentHash: params.renderedPromptContentHash,
    modelTask: params.modelPolicy.modelTask,
    provider: params.request.providerId,
    modelName: params.request.modelId,
    temperature: params.modelPolicy.temperature,
    outputSchemaVersion: EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
    configSnapshotHash: params.request.configSnapshotHash,
    resultSchemaVersion: EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
    inputIdentityHash: sha256Json({
      claimContract: params.request.claimContract,
      selectedAtomicClaimIds: params.selectedAtomicClaimIds,
      packetId: params.packet.packetId,
      packetHash: params.packet.inputTextHash,
      taskKey: "evidence_applicability",
    }),
    sourceIdentityHash: params.packet.inputTextHash,
    languageContextHash: sha256Json({ languageCode: params.packet.languageCode }),
    currentDateBucket: params.request.context.currentDate,
    adapterVersion: BOUNDED_EVIDENCE_APPLICABILITY_RUNTIME_VERSION,
  };
}

async function resolveApplicabilityPrecheck(params: {
  readonly request: RunBoundedEvidenceExtractionRuntimeRequest;
  readonly packet: BoundedTextExtractionInputPacket;
  readonly selectedAtomicClaimIds: readonly string[];
  readonly inputFrame: BoundedEvidenceExtractionInputFrame;
}): Promise<{
  readonly result: EvidenceApplicabilityResult;
  readonly summary: BoundedEvidenceApplicabilityPrecheckSummary;
  readonly blockedReason: BoundedEvidenceExtractionBlockedReason | null;
  readonly damagedReason: BoundedEvidenceExtractionDamagedReason | null;
  readonly promptLoaded: boolean;
  readonly promptRendered: boolean;
  readonly cacheDecisionConstructed: boolean;
}> {
  if (params.request.applicabilityResult) {
    const parsed = EvidenceApplicabilityResultSchema.safeParse(params.request.applicabilityResult);
    const result = parsed.success
      ? parsed.data as EvidenceApplicabilityResult
      : applicabilityDamagedResult(
        "task_contract_validation_failed",
        "Supplied evidence applicability result failed schema validation.",
      );
    const contentValidation = validateAcceptedApplicabilityContent(result, params.inputFrame);
    const resolved = contentValidation === "accepted"
      ? result
      : applicabilityDamagedResult(
        "task_contract_validation_failed",
        "Supplied evidence applicability result failed task contract validation.",
      );
    return {
      result: resolved,
      summary: summarizeApplicabilityResult({
        result: resolved,
        source: "runtime_evidence_applicability_task",
      }),
      blockedReason: resolved.status === "blocked" ? "task_policy_not_executable" : null,
      damagedReason: resolved.status === "damaged" ? "task_contract_validation_failed" : null,
      promptLoaded: false,
      promptRendered: false,
      cacheDecisionConstructed: false,
    };
  }

  if (!params.request.applicabilityProviderCall) {
    const result = buildStructuralApplicabilityResult(params.packet, params.selectedAtomicClaimIds);
    return {
      result,
      summary: summarizeApplicabilityResult({
        result,
        source: "structural_uncertain_fallback",
      }),
      blockedReason: null,
      damagedReason: null,
      promptLoaded: false,
      promptRendered: false,
      cacheDecisionConstructed: false,
    };
  }

  const policyValidation = validateApplicabilityTaskPolicy(params.request.context);
  if (policyValidation.status === "blocked") {
    const result = applicabilityBlockedResult(
      policyValidation.reason === "prompt_or_model_not_approved" ? "prompt_not_approved" : "task_policy_not_executable",
      "Evidence applicability pre-call gate blocked execution.",
    );
    return {
      result,
      summary: summarizeApplicabilityResult({
        result,
        source: "runtime_evidence_applicability_task",
      }),
      blockedReason: policyValidation.reason,
      damagedReason: null,
      promptLoaded: false,
      promptRendered: false,
      cacheDecisionConstructed: false,
    };
  }

  let renderedPrompt: RenderedEvidenceApplicabilityPrompt;
  try {
    renderedPrompt = await loadAndRenderApplicabilityPrompt(buildApplicabilityPromptVariables({
      claimContract: params.request.claimContract,
      taskPolicySnapshot: buildApplicabilityTaskPolicySnapshot({
        gatewayTask: policyValidation.gatewayTask,
        modelPolicy: policyValidation.modelPolicy,
        cachePolicy: policyValidation.cachePolicy,
      }),
      packet: params.packet,
    }));
  } catch {
    const result = applicabilityDamagedResult(
      "task_contract_validation_failed",
      "Evidence applicability prompt render failed.",
    );
    return {
      result,
      summary: summarizeApplicabilityResult({
        result,
        source: "runtime_evidence_applicability_task",
        modelPolicyId: policyValidation.modelPolicy.policyId,
      }),
      blockedReason: null,
      damagedReason: "prompt_render_failed",
      promptLoaded: true,
      promptRendered: false,
      cacheDecisionConstructed: false,
    };
  }

  const cacheDecision = buildNoStoreCacheDecision(
    policyValidation.cachePolicy,
    BOUNDED_EVIDENCE_APPLICABILITY_CACHE_NAMESPACE,
    buildApplicabilityCacheDecisionInput({
      renderedPromptContentHash: renderedPrompt.promptContentHash,
      request: params.request,
      packet: params.packet,
      selectedAtomicClaimIds: params.selectedAtomicClaimIds,
      modelPolicy: policyValidation.modelPolicy,
    }),
  );
  if (cacheDecision.reason !== "no_store_runtime_dispatch_safety" || cacheDecision.canRead || cacheDecision.canWrite) {
    const result = applicabilityBlockedResult(
      "task_policy_not_executable",
      "Evidence applicability cache contract blocked execution.",
    );
    return {
      result,
      summary: summarizeApplicabilityResult({
        result,
        source: "runtime_evidence_applicability_task",
        promptContentHash: renderedPrompt.promptContentHash,
        renderedPromptHash: sha256Text(renderedPrompt.renderedPrompt),
        modelPolicyId: policyValidation.modelPolicy.policyId,
        cacheDecisionReason: cacheDecision.reason,
      }),
      blockedReason: "cache_contract_not_no_store",
      damagedReason: null,
      promptLoaded: true,
      promptRendered: true,
      cacheDecisionConstructed: true,
    };
  }

  const outcome = await executeApplicabilityAdapter({
    gatewayTask: policyValidation.gatewayTask,
    modelPolicy: policyValidation.modelPolicy,
    renderedPrompt,
    inputFrame: params.inputFrame,
    cacheDecision,
    providerCall: params.request.applicabilityProviderCall,
  });
  if (outcome.result.status === "damaged") {
    const fallbackResult = buildStructuralApplicabilityResult(params.packet, params.selectedAtomicClaimIds);
    return {
      result: fallbackResult,
      summary: summarizeApplicabilityResult({
        result: fallbackResult,
        source: "runtime_evidence_applicability_damaged_structural_fallback",
        modelCalled: outcome.summary.modelCalled,
        promptContentHash: outcome.summary.promptContentHash,
        renderedPromptHash: outcome.summary.renderedPromptHash,
        modelPolicyId: outcome.summary.modelPolicyId,
        cacheDecisionReason: outcome.summary.cacheDecisionReason,
      }),
      blockedReason: null,
      damagedReason: null,
      promptLoaded: true,
      promptRendered: true,
      cacheDecisionConstructed: true,
    };
  }
  return {
    result: outcome.result,
    summary: outcome.summary,
    blockedReason: outcome.result.status === "blocked" ? "task_policy_not_executable" : null,
    damagedReason: null,
    promptLoaded: true,
    promptRendered: true,
    cacheDecisionConstructed: true,
  };
}

function blockedDecision(
  request: RunBoundedEvidenceExtractionRuntimeRequest,
  packet: BoundedTextExtractionInputPacket | null,
  reason: BoundedEvidenceExtractionBlockedReason,
  sideEffects: BoundedEvidenceExtractionSideEffects = noSideEffects({
    providerCallbackCreated: request.providerCallbackCreated === true,
    providerSdkLoaded: request.providerSdkLoaded === true,
  }),
  cacheDecision: AnalyzerV2CacheDecision | null = null,
): BoundedEvidenceExtractionDecision {
  return decision({
    request,
    packet,
    status: "blocked_pre_execution",
    blockedReason: reason,
    damagedReason: null,
    extractionResult: blockedResult(
      reason === "prompt_or_model_not_approved" ? "prompt_not_approved" : "task_policy_not_executable",
      "Evidence extraction pre-call gate blocked execution.",
    ),
    executionTelemetry: telemetry({
      configSnapshotHash: request.configSnapshotHash,
      providerId: isRealRuntimeValue(request.providerId) ? request.providerId : null,
      modelId: isRealRuntimeValue(request.modelId) ? request.modelId : null,
      cacheDecisionReason: cacheDecision?.reason ?? null,
      approvalPointer: BOUNDED_EVIDENCE_EXTRACTION_SOURCE_PACKAGE,
    }),
    sideEffects,
  });
}

export async function runBoundedEvidenceExtractionRuntime(
  request: RunBoundedEvidenceExtractionRuntimeRequest,
): Promise<BoundedEvidenceExtractionDecision> {
  const providerFlags = {
    providerCallbackCreated: request.providerCallbackCreated === true,
    providerSdkLoaded: request.providerSdkLoaded === true,
  };
  const w4hValidation = validateW4h(request);
  if (w4hValidation.status === "blocked") {
    return blockedDecision(request, null, w4hValidation.reason, noSideEffects(providerFlags));
  }
  const packet = w4hValidation.packet;
  const w4iFailure = validateW4i(request, packet);
  if (w4iFailure) {
    return blockedDecision(request, packet, w4iFailure, noSideEffects(providerFlags));
  }
  const claimContractValidation = validateClaimContract(request.claimContract, packet);
  if (claimContractValidation.status === "blocked") {
    return blockedDecision(request, packet, claimContractValidation.reason, noSideEffects(providerFlags));
  }
  if (!isRealRuntimeValue(request.configSnapshotHash) || !isRealRuntimeValue(request.providerId) || !isRealRuntimeValue(request.modelId)) {
    return blockedDecision(request, packet, "task_policy_not_executable", noSideEffects(providerFlags));
  }
  const policyValidation = validateTaskPolicy(request.context);
  if (policyValidation.status === "blocked") {
    return blockedDecision(request, packet, policyValidation.reason, noSideEffects(providerFlags));
  }

  const taskPolicySnapshot = buildTaskPolicySnapshot({
    gatewayTask: policyValidation.gatewayTask,
    modelPolicy: policyValidation.modelPolicy,
    cachePolicy: policyValidation.cachePolicy,
    w4iStatus: request.executionReadinessDenial?.status ?? "missing",
  });

  const inputFrame: BoundedEvidenceExtractionInputFrame = {
    packetId: packet.packetId,
    sourceRecordId: packet.sourceMaterialRef,
    contentPacketId: packet.packetId,
    inputTextHash: packet.inputTextHash,
    inputTextByteLength: packet.inputTextByteLength,
    providerId: packet.providerId,
    sourceContentPackets: packet.sourceContentPackets.map((contentPacket) => ({
      sourceRecordId: contentPacket.sourceRecordId,
      contentPacketId: contentPacket.contentPacketId,
      providerId: contentPacket.providerId,
    })),
    targetAtomicClaimIds: claimContractValidation.selectedAtomicClaimIds,
  };

  const applicabilityPrecheck = await resolveApplicabilityPrecheck({
    request,
    packet,
    selectedAtomicClaimIds: claimContractValidation.selectedAtomicClaimIds,
    inputFrame,
  });
  if (applicabilityPrecheck.blockedReason) {
    return blockedDecision(
      request,
      packet,
      applicabilityPrecheck.blockedReason,
      noSideEffects(providerFlags),
    );
  }
  if (applicabilityPrecheck.damagedReason) {
    return decision({
      request,
      packet,
      status: "damaged_execution",
      blockedReason: null,
      damagedReason: applicabilityPrecheck.damagedReason,
      extractionResult: damagedResult(
        applicabilityPrecheck.damagedReason === "provider_unavailable"
          ? "provider_unavailable"
          : "task_contract_validation_failed",
        "Evidence applicability precheck failed before evidence extraction.",
      ),
      applicabilityPrecheck: applicabilityPrecheck.summary,
      executionTelemetry: telemetry({
        configSnapshotHash: request.configSnapshotHash,
        modelPolicyId: policyValidation.modelPolicy.policyId,
        providerId: request.providerId,
        modelId: request.modelId,
        approvalPointer: BOUNDED_EVIDENCE_EXTRACTION_SOURCE_PACKAGE,
      }),
      sideEffects: noSideEffects(providerFlags),
    });
  }

  let renderedPrompt: RenderedBoundedEvidenceExtractionPrompt;
  try {
    renderedPrompt = await loadAndRenderPrompt(buildPromptVariables({
      claimContract: request.claimContract,
      taskPolicySnapshot,
      packet,
      selectedAtomicClaimIds: claimContractValidation.selectedAtomicClaimIds,
      applicabilityResult: applicabilityPrecheck.result,
    }));
  } catch {
    return decision({
      request,
      packet,
      status: "damaged_execution",
      blockedReason: null,
      damagedReason: "prompt_render_failed",
      extractionResult: damagedResult("task_contract_validation_failed", "Evidence extraction prompt render failed."),
      applicabilityPrecheck: applicabilityPrecheck.summary,
      executionTelemetry: telemetry({
        configSnapshotHash: request.configSnapshotHash,
        modelPolicyId: policyValidation.modelPolicy.policyId,
        providerId: request.providerId,
        modelId: request.modelId,
        approvalPointer: BOUNDED_EVIDENCE_EXTRACTION_SOURCE_PACKAGE,
      }),
      sideEffects: noSideEffects({
        ...providerFlags,
        promptLoaded: true,
      }),
    });
  }

  const cacheDecision = buildNoStoreCacheDecision(
    policyValidation.cachePolicy,
    BOUNDED_EVIDENCE_EXTRACTION_CACHE_NAMESPACE,
    buildCacheDecisionInput({
      renderedPromptContentHash: renderedPrompt.promptContentHash,
      request,
      packet,
      selectedAtomicClaimIds: claimContractValidation.selectedAtomicClaimIds,
      modelPolicy: policyValidation.modelPolicy,
    }),
  );
  const postRenderSideEffects = noSideEffects({
    ...providerFlags,
    promptLoaded: true,
    promptRendered: true,
    cacheDecisionConstructed: true,
  });
  if (cacheDecision.reason !== "no_store_runtime_dispatch_safety" || cacheDecision.canRead || cacheDecision.canWrite) {
    return blockedDecision(request, packet, "cache_contract_not_no_store", postRenderSideEffects, cacheDecision);
  }

  const adapterOutcome = await executeAdapter({
    gatewayTask: policyValidation.gatewayTask,
    modelPolicy: policyValidation.modelPolicy,
    renderedPrompt,
    inputFrame,
    configSnapshotHash: request.configSnapshotHash,
    cacheDecision,
    providerCall: request.providerCall,
  });
  const completedSideEffects = noSideEffects({
    ...providerFlags,
    promptLoaded: true,
    promptRendered: true,
    cacheDecisionConstructed: true,
    adapterCalled: true,
    modelCalled: adapterOutcome.attempts.length > 0,
  });

  if (adapterOutcome.result.status === "accepted" && adapterOutcome.result.extractionStatus === "evidence_extracted") {
    return decision({
      request,
      packet,
      status: "hidden_evidence_item_extraction_completed",
      blockedReason: null,
      damagedReason: null,
      extractionResult: adapterOutcome.result,
      applicabilityPrecheck: applicabilityPrecheck.summary,
      executionTelemetry: adapterOutcome.telemetry,
      sideEffects: completedSideEffects,
    });
  }
  if (adapterOutcome.result.status === "accepted" && adapterOutcome.result.extractionStatus === "no_extractable_evidence") {
    return decision({
      request,
      packet,
      status: "hidden_no_extractable_evidence",
      blockedReason: null,
      damagedReason: null,
      extractionResult: adapterOutcome.result,
      applicabilityPrecheck: applicabilityPrecheck.summary,
      executionTelemetry: adapterOutcome.telemetry,
      sideEffects: completedSideEffects,
    });
  }
  if (adapterOutcome.result.status === "blocked") {
    return decision({
      request,
      packet,
      status: "blocked_pre_execution",
      blockedReason: "task_policy_not_executable",
      damagedReason: null,
      extractionResult: adapterOutcome.result,
      applicabilityPrecheck: applicabilityPrecheck.summary,
      executionTelemetry: adapterOutcome.telemetry,
      sideEffects: completedSideEffects,
    });
  }
  return decision({
    request,
    packet,
    status: "damaged_execution",
    blockedReason: null,
    damagedReason: adapterOutcome.damagedReason ?? "task_contract_validation_failed",
    extractionResult: adapterOutcome.result,
    applicabilityPrecheck: applicabilityPrecheck.summary,
    executionTelemetry: adapterOutcome.telemetry,
    sideEffects: completedSideEffects,
  });
}
