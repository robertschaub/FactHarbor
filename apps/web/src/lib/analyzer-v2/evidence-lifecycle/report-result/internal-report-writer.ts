import { createHash } from "node:crypto";

import type {
  BoundaryVerdictExecutionDecision,
  BoundaryVerdictExecutionInternalReviewPayload,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import type {
  AggregationNarrativeResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/aggregation-narrative-contract";
import {
  AGGREGATION_NARRATIVE_PROMPT_SECTION_ID,
  AGGREGATION_NARRATIVE_SCHEMA_VERSION,
  AggregationNarrativeResultSchema,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/aggregation-narrative-contract";
import {
  INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
  type InternalAlphaReportResultCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result";
import { ANALYZER_V2_HJ19_CAPTAIN_APPROVAL } from "@/lib/analyzer-v2/gateway/approval-records";
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

export const INTERNAL_REPORT_WRITER_DECISION_VERSION =
  "v2.evidence-lifecycle.internal-report-writer.hj18" as const;
export const INTERNAL_REPORT_WRITER_INPUT_PACKET_VERSION =
  "v2.evidence-lifecycle.internal-report-writer-input.hj18" as const;
export const INTERNAL_REPORT_WRITER_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-22_V2_HighJump_HJ19_Report_Writer_Output_Budget_Repair.md" as const;
export const INTERNAL_REPORT_WRITER_CACHE_NAMESPACE =
  "analyzer-v2:v2.semantic.aggregation-narrative.hj19:aggregation_narrative" as const;
export const INTERNAL_REPORT_WRITER_MAX_INPUT_PACKET_BYTES = 80_000 as const;
export const INTERNAL_REPORT_WRITER_MAX_REPORT_MARKDOWN_BYTES = 32_768 as const;
export const INTERNAL_REPORT_WRITER_SCHEMA_DIAGNOSTICS_REMOVAL_TRIGGER =
  "fold_into_stable_report_writer_telemetry_after_hj18_report_review_accepts_output_shape" as const;

const INTERNAL_REPORT_WRITER_MAX_SCHEMA_DIAGNOSTIC_ISSUES = 8;
const INTERNAL_REPORT_WRITER_MAX_SCHEMA_PATH_SEGMENTS = 8;
const INTERNAL_REPORT_WRITER_MAX_SCHEMA_PATH_SEGMENT_LENGTH = 64;
const INTERNAL_REPORT_WRITER_MAX_SCHEMA_CODE_LENGTH = 80;

type AcceptedAggregationNarrativeResult = Extract<AggregationNarrativeResult, { readonly status: "accepted" }>;

export type InternalReportWriterStatus =
  | "internal_report_writer_draft_created"
  | "internal_report_writer_blocked"
  | "internal_report_writer_damaged";

export type InternalReportWriterBlockedReason =
  | "internal_alpha_report_result_missing"
  | "internal_alpha_report_result_not_created"
  | "boundary_verdict_execution_missing"
  | "boundary_verdict_execution_not_accepted"
  | "boundary_verdict_review_payload_missing"
  | "lineage_mismatch"
  | "prompt_or_model_not_approved"
  | "task_policy_not_executable"
  | "cache_contract_not_no_store"
  | "prompt_render_missing"
  | "input_packet_too_large";

export type InternalReportWriterDamagedReason =
  | "provider_unavailable"
  | "provider_telemetry_invalid"
  | "parse_failure"
  | "schema_validation_failed"
  | "task_contract_validation_failed"
  | "unsupported_citation_id"
  | "verdict_value_mismatch"
  | "boundary_reference_mismatch"
  | "report_markdown_too_large";

export type AggregationNarrativeInputPacket = {
  readonly packetVersion: typeof INTERNAL_REPORT_WRITER_INPUT_PACKET_VERSION;
  readonly packetId: string;
  readonly parentInternalAlphaReportResultDecisionId: string;
  readonly parentBoundaryVerdictExecutionDecisionId: string;
  readonly parentBoundaryVerdictExecutionResultPayloadHash: string;
  readonly parentBoundaryVerdictExecutionReviewPayloadHash: string;
  readonly publicCutoverStatus: "blocked_precutover";
  readonly defaultProjection: "hash_length_provenance_only";
  readonly reportQualityStatus: InternalAlphaReportResultCandidate["reportReadiness"]["reportQualityStatus"];
  readonly boundarySetCandidate: BoundaryVerdictExecutionInternalReviewPayload["boundarySetCandidate"];
  readonly verdictSetCandidate: BoundaryVerdictExecutionInternalReviewPayload["verdictSetCandidate"];
  readonly warningMaterialityInputs: BoundaryVerdictExecutionInternalReviewPayload["warningMaterialityInputs"];
  readonly citedEvidenceItemIds: readonly string[];
  readonly integrityEventCount: number;
  readonly guardrails: {
    readonly preserveVerdictValuesExactly: true;
    readonly preserveCitationIdsExactly: true;
    readonly publicProjectionAllowed: false;
    readonly sourceTextAvailable: false;
    readonly evidenceItemTextAvailable: false;
    readonly warningPublication: "closed";
  };
};

export type InternalReportWriterProviderTelemetry = {
  readonly providerId: string;
  readonly modelId: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly durationMs: number;
};

export type InternalReportWriterProviderCallRequest = {
  readonly renderedPrompt: string;
  readonly promptContentHash: string;
  readonly outputSchemaVersion: typeof AGGREGATION_NARRATIVE_SCHEMA_VERSION;
  readonly attemptNumber: number;
  readonly maxAttempts: number;
  readonly modelPolicy: AnalyzerV2TaskModelPolicy;
  readonly inputPacket: AggregationNarrativeInputPacket;
};

export type InternalReportWriterProviderCallResponse = {
  readonly output: unknown;
  readonly telemetry: InternalReportWriterProviderTelemetry;
};

export type InternalReportWriterProviderCall = (
  request: InternalReportWriterProviderCallRequest,
) => Promise<InternalReportWriterProviderCallResponse>;

export type InternalReportWriterSchemaDiagnosticIssue = {
  readonly path: readonly string[];
  readonly code: string;
};

export type InternalReportWriterSchemaDiagnostics = {
  readonly diagnosticVersion: "v2.evidence-lifecycle.internal-report-writer.schema-diagnostics.hj18";
  readonly contractName: "AggregationNarrativeResultSchema";
  readonly contractVersion: typeof AGGREGATION_NARRATIVE_SCHEMA_VERSION;
  readonly outputParseStatus: "not_attempted" | "parse_failure" | "parsed";
  readonly failureCategory:
    | "none"
    | "parse_failure"
    | "schema_validation"
    | "task_contract_validation";
  readonly issueCount: number;
  readonly issues: readonly InternalReportWriterSchemaDiagnosticIssue[];
  readonly rawProviderOutputReturned: false;
  readonly rawSchemaMessagesReturned: false;
  readonly providerCompletionTextReturned: false;
  readonly sourceTextReturned: false;
  readonly inputTextReturned: false;
  readonly evidenceItemTextReturned: false;
  readonly promptTextReturned: false;
  readonly stackTraceReturned: false;
  readonly removalTrigger: typeof INTERNAL_REPORT_WRITER_SCHEMA_DIAGNOSTICS_REMOVAL_TRIGGER;
};

export type InternalReportWriterModelAttempt = {
  readonly attemptNumber: number;
  readonly promptContentHash: string;
  readonly status: "accepted" | "invalid_schema" | "parse_failure" | "provider_failure";
  readonly providerTelemetry: InternalReportWriterProviderTelemetry | null;
  readonly failureCode: string | null;
  readonly schemaDiagnostics: InternalReportWriterSchemaDiagnostics | null;
};

export type InternalReportWriterTelemetry = {
  readonly gatewayTaskId: "aggregation_narrative";
  readonly promptSectionId: typeof AGGREGATION_NARRATIVE_PROMPT_SECTION_ID;
  readonly promptContentHash: string | null;
  readonly renderedPromptHash: string | null;
  readonly inputPacketHash: string | null;
  readonly inputPacketByteLength: number | null;
  readonly outputSchemaVersion: typeof AGGREGATION_NARRATIVE_SCHEMA_VERSION;
  readonly schemaDiagnostics: InternalReportWriterSchemaDiagnostics | null;
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
  readonly approvalPointer: typeof INTERNAL_REPORT_WRITER_SOURCE_PACKAGE;
};

export type InternalReportWriterSideEffects = {
  readonly reportProseLlmCalled: boolean;
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
  readonly publicReportGenerated: false;
  readonly publicSurfaceWritten: false;
  readonly compatibilityProjectionWritten: false;
  readonly verdictPublished: false;
  readonly warningPublished: false;
  readonly confidencePublished: false;
  readonly truthPercentagePublished: false;
};

export type InternalReportWriterDecision = {
  readonly decisionVersion: typeof INTERNAL_REPORT_WRITER_DECISION_VERSION;
  readonly decisionId: string;
  readonly kind: "internal_report_writer";
  readonly status: InternalReportWriterStatus;
  readonly blockedReason: InternalReportWriterBlockedReason | null;
  readonly damagedReason: InternalReportWriterDamagedReason | null;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly defaultProjection: "hash_length_provenance_only";
  readonly taskKey: "aggregation_narrative";
  readonly promptSectionId: typeof AGGREGATION_NARRATIVE_PROMPT_SECTION_ID;
  readonly outputSchemaVersion: typeof AGGREGATION_NARRATIVE_SCHEMA_VERSION;
  readonly parent: {
    readonly internalAlphaReportResultVersion: typeof INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION | null;
    readonly internalAlphaReportResultStatus: InternalAlphaReportResultCandidate["status"] | null;
    readonly internalAlphaReportResultDecisionHash: string | null;
    readonly boundaryVerdictExecutionStatus: BoundaryVerdictExecutionDecision["status"] | null;
    readonly boundaryVerdictExecutionDecisionHash: string | null;
    readonly boundaryVerdictExecutionResultPayloadHash: string | null;
    readonly boundaryVerdictExecutionReviewPayloadHash: string | null;
  };
  readonly inputPacketHash: string | null;
  readonly inputPacketByteLength: number | null;
  readonly aggregationNarrativeResult: AggregationNarrativeResult | null;
  readonly aggregationNarrativeResultHash: string | null;
  readonly aggregationNarrativeResultStatus: AggregationNarrativeResult["status"] | null;
  readonly reportMarkdown: string | null;
  readonly reportMarkdownHash: string | null;
  readonly reportMarkdownByteLength: number;
  readonly verdictSectionCount: number;
  readonly boundarySectionCount: number;
  readonly citedEvidenceItemRefCount: number;
  readonly citedEvidenceItemRefHashes: readonly string[];
  readonly reportReviewReadiness:
    | "ready_for_internal_report_review"
    | "blocked_before_internal_report_review"
    | "damaged_before_internal_report_review";
  readonly redaction: {
    readonly reportMarkdownReturnedByDefault: false;
    readonly sourceTextReturned: false;
    readonly evidenceItemTextReturned: false;
    readonly inputTextReturned: false;
    readonly promptTextReturned: false;
    readonly providerPayloadReturned: false;
    readonly hiddenLedgerReferenceReturned: false;
    readonly publicVerdictReturned: false;
    readonly publicTruthPercentageReturned: false;
    readonly publicConfidenceReturned: false;
    readonly publicWarningReturned: false;
  };
  readonly executionTelemetry: InternalReportWriterTelemetry;
  readonly sideEffects: InternalReportWriterSideEffects;
  readonly w8gMergeTrigger:
    "merge_w8g_after_hj18_report_writer_review_accepts_output_shape_and_fail_closed_parity";
  readonly approvalPointer: typeof INTERNAL_REPORT_WRITER_SOURCE_PACKAGE;
};

export type RunInternalReportWriterRuntimeRequest = {
  readonly context: PipelineRunContext;
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
  readonly renderedPrompt: string;
  readonly promptContentHash: string;
  readonly configSnapshotHash: string;
  readonly providerCall: InternalReportWriterProviderCall;
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

function sorted(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  const normalizedLeft = sorted(left);
  const normalizedRight = sorted(right);
  return normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function parentProjection(input: {
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
}): InternalReportWriterDecision["parent"] {
  return {
    internalAlphaReportResultVersion: input.internalAlphaReportResult?.decisionVersion ?? null,
    internalAlphaReportResultStatus: input.internalAlphaReportResult?.status ?? null,
    internalAlphaReportResultDecisionHash: input.internalAlphaReportResult
      ? sha256Json({
        decisionVersion: input.internalAlphaReportResult.decisionVersion,
        decisionId: input.internalAlphaReportResult.decisionId,
        status: input.internalAlphaReportResult.status,
      })
      : null,
    boundaryVerdictExecutionStatus: input.boundaryVerdictExecution?.status ?? null,
    boundaryVerdictExecutionDecisionHash: input.boundaryVerdictExecution
      ? sha256Json({
        decisionVersion: input.boundaryVerdictExecution.decisionVersion,
        decisionId: input.boundaryVerdictExecution.decisionId,
        status: input.boundaryVerdictExecution.status,
      })
      : null,
    boundaryVerdictExecutionResultPayloadHash: input.boundaryVerdictExecution?.resultPayloadHash ?? null,
    boundaryVerdictExecutionReviewPayloadHash:
      input.boundaryVerdictExecution?.internalReviewPayload?.payloadHash ?? null,
  };
}

function noSideEffects(
  overrides: Partial<InternalReportWriterSideEffects> = {},
): InternalReportWriterSideEffects {
  return {
    reportProseLlmCalled: false,
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
    publicReportGenerated: false,
    publicSurfaceWritten: false,
    compatibilityProjectionWritten: false,
    verdictPublished: false,
    warningPublished: false,
    confidencePublished: false,
    truthPercentagePublished: false,
    ...overrides,
  };
}

function telemetry(
  overrides: Partial<InternalReportWriterTelemetry> = {},
): InternalReportWriterTelemetry {
  return {
    gatewayTaskId: "aggregation_narrative",
    promptSectionId: AGGREGATION_NARRATIVE_PROMPT_SECTION_ID,
    promptContentHash: null,
    renderedPromptHash: null,
    inputPacketHash: null,
    inputPacketByteLength: null,
    outputSchemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
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
    approvalPointer: INTERNAL_REPORT_WRITER_SOURCE_PACKAGE,
    ...overrides,
  };
}

function redaction(): InternalReportWriterDecision["redaction"] {
  return {
    reportMarkdownReturnedByDefault: false,
    sourceTextReturned: false,
    evidenceItemTextReturned: false,
    inputTextReturned: false,
    promptTextReturned: false,
    providerPayloadReturned: false,
    hiddenLedgerReferenceReturned: false,
    publicVerdictReturned: false,
    publicTruthPercentageReturned: false,
    publicConfidenceReturned: false,
    publicWarningReturned: false,
  };
}

function blockedAggregationResult(reason: "task_policy_not_executable" | "prompt_not_approved" | "input_contract_invalid"): AggregationNarrativeResult {
  return {
    schemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
    taskKey: "aggregation_narrative",
    status: "blocked",
    reportTitle: null,
    executiveSummary: null,
    verdictSections: null,
    boundarySections: null,
    limitations: null,
    citationMap: null,
    reportMarkdown: null,
    integrityEvents: [{
      type: reason === "prompt_not_approved" ? "prompt_not_approved" : "input_contract_invalid",
      severity: "info",
      message: "Internal report writer pre-call gate blocked execution.",
      references: [],
    }],
    blockedReason: reason,
    damagedReason: null,
  };
}

function damagedAggregationResult(reason: "schema_validation_failed" | "provider_unavailable" | "task_contract_validation_failed"): AggregationNarrativeResult {
  return {
    schemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
    taskKey: "aggregation_narrative",
    status: "damaged",
    reportTitle: null,
    executiveSummary: null,
    verdictSections: null,
    boundarySections: null,
    limitations: null,
    citationMap: null,
    reportMarkdown: null,
    integrityEvents: [{
      type: reason === "provider_unavailable" ? "provider_unavailable" : "task_contract_validation_failed",
      severity: "error",
      message: "Internal report writer execution did not produce a valid report draft.",
      references: [],
    }],
    blockedReason: null,
    damagedReason: reason,
  };
}

function decision(params: {
  readonly request: RunInternalReportWriterRuntimeRequest;
  readonly status: InternalReportWriterStatus;
  readonly blockedReason: InternalReportWriterBlockedReason | null;
  readonly damagedReason: InternalReportWriterDamagedReason | null;
  readonly inputPacket: AggregationNarrativeInputPacket | null;
  readonly result: AggregationNarrativeResult | null;
  readonly sideEffects: InternalReportWriterSideEffects;
  readonly executionTelemetry: InternalReportWriterTelemetry;
}): InternalReportWriterDecision {
  const accepted = params.result?.status === "accepted" ? params.result : null;
  const reportMarkdown = accepted?.reportMarkdown ?? null;
  const reportMarkdownByteLength = reportMarkdown ? utf8ByteLength(reportMarkdown) : 0;
  const citedEvidenceItemRefs = accepted
    ? sorted([
      ...accepted.verdictSections.flatMap((section) => section.evidenceItemIds),
      ...accepted.boundarySections.flatMap((section) => section.evidenceItemIds),
      ...accepted.citationMap.map((entry) => entry.evidenceItemId),
    ])
    : [];
  const inputPacketHash = params.inputPacket ? sha256Json(params.inputPacket) : null;
  const inputPacketByteLength = params.inputPacket ? utf8ByteLength(JSON.stringify(params.inputPacket)) : null;
  const aggregationNarrativeResultHash = params.result ? sha256Json(params.result) : null;
  const readiness = params.status === "internal_report_writer_draft_created"
    ? "ready_for_internal_report_review"
    : params.status === "internal_report_writer_blocked"
      ? "blocked_before_internal_report_review"
      : "damaged_before_internal_report_review";
  const decisionHash = sha256Json({
    status: params.status,
    blockedReason: params.blockedReason,
    damagedReason: params.damagedReason,
    inputPacketHash,
    aggregationNarrativeResultHash,
    reportMarkdownHash: reportMarkdown ? sha256Text(reportMarkdown) : null,
  });

  return {
    decisionVersion: INTERNAL_REPORT_WRITER_DECISION_VERSION,
    decisionId: `INTERNAL_REPORT_WRITER_${decisionHash.slice(0, 24).toUpperCase()}`,
    kind: "internal_report_writer",
    status: params.status,
    blockedReason: params.blockedReason,
    damagedReason: params.damagedReason,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    taskKey: "aggregation_narrative",
    promptSectionId: AGGREGATION_NARRATIVE_PROMPT_SECTION_ID,
    outputSchemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
    parent: parentProjection(params.request),
    inputPacketHash,
    inputPacketByteLength,
    aggregationNarrativeResult: params.result,
    aggregationNarrativeResultHash,
    aggregationNarrativeResultStatus: params.result?.status ?? null,
    reportMarkdown,
    reportMarkdownHash: reportMarkdown ? sha256Text(reportMarkdown) : null,
    reportMarkdownByteLength,
    verdictSectionCount: accepted?.verdictSections.length ?? 0,
    boundarySectionCount: accepted?.boundarySections.length ?? 0,
    citedEvidenceItemRefCount: citedEvidenceItemRefs.length,
    citedEvidenceItemRefHashes: citedEvidenceItemRefs.map(sha256Text),
    reportReviewReadiness: readiness,
    redaction: redaction(),
    executionTelemetry: params.executionTelemetry,
    sideEffects: params.sideEffects,
    w8gMergeTrigger:
      "merge_w8g_after_hj18_report_writer_review_accepts_output_shape_and_fail_closed_parity",
    approvalPointer: INTERNAL_REPORT_WRITER_SOURCE_PACKAGE,
  };
}

function buildInputPacketResult(input: {
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
}): { readonly status: "accepted"; readonly inputPacket: AggregationNarrativeInputPacket } | {
  readonly status: "blocked";
  readonly reason: InternalReportWriterBlockedReason;
} {
  if (!input.internalAlphaReportResult) {
    return { status: "blocked", reason: "internal_alpha_report_result_missing" };
  }
  if (input.internalAlphaReportResult.status !== "internal_alpha_report_result_candidate_created") {
    return { status: "blocked", reason: "internal_alpha_report_result_not_created" };
  }
  if (!input.boundaryVerdictExecution) {
    return { status: "blocked", reason: "boundary_verdict_execution_missing" };
  }
  if (input.boundaryVerdictExecution.status !== "boundary_verdict_candidates_created_internal") {
    return { status: "blocked", reason: "boundary_verdict_execution_not_accepted" };
  }
  const payload = input.boundaryVerdictExecution.internalReviewPayload;
  if (!payload) {
    return { status: "blocked", reason: "boundary_verdict_review_payload_missing" };
  }
  if (
    input.internalAlphaReportResult.inputLineage.boundaryVerdictExecutionDecisionId !==
      input.boundaryVerdictExecution.decisionId ||
    input.internalAlphaReportResult.boundaryVerdictSummary.resultPayloadHash !==
      input.boundaryVerdictExecution.resultPayloadHash
  ) {
    return { status: "blocked", reason: "lineage_mismatch" };
  }

  const base = {
    packetVersion: INTERNAL_REPORT_WRITER_INPUT_PACKET_VERSION,
    parentInternalAlphaReportResultDecisionId: input.internalAlphaReportResult.decisionId,
    parentBoundaryVerdictExecutionDecisionId: input.boundaryVerdictExecution.decisionId,
    parentBoundaryVerdictExecutionResultPayloadHash: input.boundaryVerdictExecution.resultPayloadHash!,
    parentBoundaryVerdictExecutionReviewPayloadHash: payload.payloadHash,
    publicCutoverStatus: "blocked_precutover" as const,
    defaultProjection: "hash_length_provenance_only" as const,
    reportQualityStatus: input.internalAlphaReportResult.reportReadiness.reportQualityStatus,
    boundarySetCandidate: payload.boundarySetCandidate,
    verdictSetCandidate: payload.verdictSetCandidate,
    warningMaterialityInputs: payload.warningMaterialityInputs,
    citedEvidenceItemIds: sorted([
      ...payload.boundarySetCandidate.boundaries.flatMap((boundary) => boundary.evidenceItemIds),
      ...payload.verdictSetCandidate.verdictCandidates.flatMap((verdict) => verdict.evidenceItemIds),
    ]),
    integrityEventCount: payload.integrityEventCount,
    guardrails: {
      preserveVerdictValuesExactly: true as const,
      preserveCitationIdsExactly: true as const,
      publicProjectionAllowed: false as const,
      sourceTextAvailable: false as const,
      evidenceItemTextAvailable: false as const,
      warningPublication: "closed" as const,
    },
  };

  return {
    status: "accepted",
    inputPacket: {
      ...base,
      packetId: `AGGREGATION_NARRATIVE_INPUT_${sha256Json(base).slice(0, 24).toUpperCase()}`,
    },
  };
}

export function buildAggregationNarrativeInputPacket(input: {
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
}): AggregationNarrativeInputPacket | null {
  const result = buildInputPacketResult(input);
  return result.status === "accepted" ? result.inputPacket : null;
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

function providerTelemetryValid(telemetryInput: InternalReportWriterProviderTelemetry): boolean {
  if (!isRealValue(telemetryInput.providerId) || !isRealValue(telemetryInput.modelId)) {
    return false;
  }
  return [
    telemetryInput.inputTokens,
    telemetryInput.outputTokens,
    telemetryInput.totalTokens,
    telemetryInput.durationMs,
  ].every((value) => Number.isFinite(value) && value >= 0);
}

function boundedDiagnosticCode(value: string): string {
  return value
    .replace(/[^A-Za-z0-9_.-]/g, "_")
    .slice(0, INTERNAL_REPORT_WRITER_MAX_SCHEMA_CODE_LENGTH) || "unknown";
}

function boundedDiagnosticPathSegment(value: string): string {
  return value.slice(0, INTERNAL_REPORT_WRITER_MAX_SCHEMA_PATH_SEGMENT_LENGTH);
}

function sanitizeSchemaPathSegment(segment: unknown): string {
  if (typeof segment === "string" && /^[A-Za-z0-9_-]+$/.test(segment)) {
    return boundedDiagnosticPathSegment(segment);
  }
  if (typeof segment === "number" && Number.isInteger(segment) && segment >= 0) {
    return String(segment);
  }
  return "field";
}

function collectSchemaIssueDiagnostics(
  issues: readonly { readonly path: readonly (string | number)[]; readonly code: string }[],
): InternalReportWriterSchemaDiagnosticIssue[] {
  return issues.slice(0, INTERNAL_REPORT_WRITER_MAX_SCHEMA_DIAGNOSTIC_ISSUES).map((issue) => ({
    path: issue.path
      .slice(0, INTERNAL_REPORT_WRITER_MAX_SCHEMA_PATH_SEGMENTS)
      .map(sanitizeSchemaPathSegment),
    code: boundedDiagnosticCode(issue.code),
  }));
}

function schemaDiagnostics(params: {
  readonly outputParseStatus: InternalReportWriterSchemaDiagnostics["outputParseStatus"];
  readonly failureCategory: InternalReportWriterSchemaDiagnostics["failureCategory"];
  readonly issues: readonly InternalReportWriterSchemaDiagnosticIssue[];
}): InternalReportWriterSchemaDiagnostics {
  return {
    diagnosticVersion: "v2.evidence-lifecycle.internal-report-writer.schema-diagnostics.hj18",
    contractName: "AggregationNarrativeResultSchema",
    contractVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
    outputParseStatus: params.outputParseStatus,
    failureCategory: params.failureCategory,
    issueCount: params.issues.length,
    issues: params.issues,
    rawProviderOutputReturned: false,
    rawSchemaMessagesReturned: false,
    providerCompletionTextReturned: false,
    sourceTextReturned: false,
    inputTextReturned: false,
    evidenceItemTextReturned: false,
    promptTextReturned: false,
    stackTraceReturned: false,
    removalTrigger: INTERNAL_REPORT_WRITER_SCHEMA_DIAGNOSTICS_REMOVAL_TRIGGER,
  };
}

function isApprovedHJ19ModelPolicy(policy: AnalyzerV2TaskModelPolicy): boolean {
  return policy.policyId === "v2.model.aggregation_narrative.hj19" &&
    policy.gatewayTaskId === "aggregation_narrative" &&
    policy.modelTask === "report" &&
    policy.modelTier === "standard" &&
    policy.providerPolicy === "from_config_snapshot" &&
    policy.temperature === 0.1 &&
    policy.maxCalls === 1 &&
    policy.schemaRetryCount === 0 &&
    policy.timeoutMs === 90000 &&
    policy.maxOutputTokens === 8000 &&
    policy.fallbackBehavior === "none_fail_closed" &&
    policy.escalationBehavior === "surface_provider_failure" &&
    policy.execution === "blocked_until_prompt_model_cache_approval" &&
    policy.approval.status === ANALYZER_V2_HJ19_CAPTAIN_APPROVAL.status &&
    policy.approval.reviewer === ANALYZER_V2_HJ19_CAPTAIN_APPROVAL.reviewer &&
    policy.approval.approvedAt === ANALYZER_V2_HJ19_CAPTAIN_APPROVAL.approvedAt;
}

function buildNoStoreCacheDecision(input: CacheKeyInput): AnalyzerV2CacheDecision {
  return {
    namespace: INTERNAL_REPORT_WRITER_CACHE_NAMESPACE,
    canRead: false,
    canWrite: false,
    reason: "no_store_runtime_dispatch_safety",
    missingDimensions: [],
    keyParts: Object.entries(input)
      .filter((entry): entry is [AnalyzerV2CacheDimension, string | number] =>
        typeof entry[1] === "string" || typeof entry[1] === "number")
      .map(([dimension, value]) => ({ dimension, value: String(value) })),
  };
}

function buildCacheDecisionInput(params: {
  readonly request: RunInternalReportWriterRuntimeRequest;
  readonly inputPacket: AggregationNarrativeInputPacket;
  readonly modelPolicy: AnalyzerV2TaskModelPolicy;
}): CacheKeyInput {
  return {
    promptProfile: "claimboundary-v2",
    promptSectionId: AGGREGATION_NARRATIVE_PROMPT_SECTION_ID,
    promptContentHash: params.request.promptContentHash,
    modelTask: params.modelPolicy.modelTask,
    provider: "anthropic",
    modelName: params.request.context.queryPlanningRuntimeActivation.provider.modelId,
    temperature: params.modelPolicy.temperature,
    outputSchemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
    configSnapshotHash: params.request.configSnapshotHash,
    resultSchemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
    inputIdentityHash: sha256Json({
      inputPacketId: params.inputPacket.packetId,
      parentInternalAlphaReportResultDecisionId: params.inputPacket.parentInternalAlphaReportResultDecisionId,
      parentBoundaryVerdictExecutionDecisionId: params.inputPacket.parentBoundaryVerdictExecutionDecisionId,
    }),
    sourceIdentityHash: params.inputPacket.parentBoundaryVerdictExecutionResultPayloadHash,
    currentDateBucket: params.request.context.currentDate,
    adapterVersion: INTERNAL_REPORT_WRITER_DECISION_VERSION,
  };
}

function validateAcceptedResultContent(
  result: AggregationNarrativeResult,
  inputPacket: AggregationNarrativeInputPacket,
): InternalReportWriterDamagedReason | null {
  if (result.status !== "accepted") {
    return null;
  }
  if (utf8ByteLength(result.reportMarkdown) > INTERNAL_REPORT_WRITER_MAX_REPORT_MARKDOWN_BYTES) {
    return "report_markdown_too_large";
  }
  const knownEvidenceIds = new Set(inputPacket.citedEvidenceItemIds);
  const parentVerdicts = new Map(
    inputPacket.verdictSetCandidate.verdictCandidates.map((verdict) => [verdict.verdictCandidateId, verdict]),
  );
  const parentBoundaries = new Map(
    inputPacket.boundarySetCandidate.boundaries.map((boundary) => [boundary.boundaryCandidateId, boundary]),
  );
  if (!sameSet(result.verdictSections.map((section) => section.verdictCandidateId), [...parentVerdicts.keys()])) {
    return "verdict_value_mismatch";
  }
  if (!sameSet(result.boundarySections.map((section) => section.boundaryCandidateId), [...parentBoundaries.keys()])) {
    return "boundary_reference_mismatch";
  }
  for (const section of result.verdictSections) {
    const parent = parentVerdicts.get(section.verdictCandidateId);
    if (!parent) {
      return "verdict_value_mismatch";
    }
    if (
      section.verdictLabel !== parent.internalVerdictLabelCandidate ||
      section.truthPercentage !== parent.internalTruthPercentageCandidate ||
      section.confidence !== parent.internalConfidenceCandidate ||
      !sameSet(section.boundaryCandidateIds, parent.boundaryCandidateIds) ||
      !sameSet(section.evidenceItemIds, parent.evidenceItemIds)
    ) {
      return "verdict_value_mismatch";
    }
    for (const evidenceItemId of section.evidenceItemIds) {
      if (!knownEvidenceIds.has(evidenceItemId)) {
        return "unsupported_citation_id";
      }
    }
  }
  for (const section of result.boundarySections) {
    const parent = parentBoundaries.get(section.boundaryCandidateId);
    if (!parent || !sameSet(section.evidenceItemIds, parent.evidenceItemIds)) {
      return "boundary_reference_mismatch";
    }
    for (const evidenceItemId of section.evidenceItemIds) {
      if (!knownEvidenceIds.has(evidenceItemId)) {
        return "unsupported_citation_id";
      }
    }
  }
  for (const citation of result.citationMap) {
    if (!knownEvidenceIds.has(citation.evidenceItemId)) {
      return "unsupported_citation_id";
    }
  }
  return null;
}

function telemetryFromAttempts(params: {
  readonly attempts: readonly InternalReportWriterModelAttempt[];
  readonly modelPolicy: AnalyzerV2TaskModelPolicy;
  readonly request: RunInternalReportWriterRuntimeRequest;
  readonly inputPacketHash: string;
  readonly inputPacketByteLength: number;
  readonly cacheDecision: AnalyzerV2CacheDecision;
  readonly cachePolicyId: string | null;
}): InternalReportWriterTelemetry {
  const providerAttempts = params.attempts
    .map((attempt) => attempt.providerTelemetry)
    .filter((attempt): attempt is InternalReportWriterProviderTelemetry => attempt !== null);
  const lastTelemetry = providerAttempts.at(-1) ?? null;
  return telemetry({
    promptContentHash: params.request.promptContentHash,
    renderedPromptHash: sha256Text(params.request.renderedPrompt),
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

export async function runInternalReportWriterRuntime(
  request: RunInternalReportWriterRuntimeRequest,
): Promise<InternalReportWriterDecision> {
  const providerFlags = {
    providerCallbackCreated: request.providerCallbackCreated === true,
    providerSdkLoaded: request.providerSdkLoaded === true,
  };
  const inputPacketResult = buildInputPacketResult(request);
  if (inputPacketResult.status === "blocked") {
    return decision({
      request,
      status: "internal_report_writer_blocked",
      blockedReason: inputPacketResult.reason,
      damagedReason: null,
      inputPacket: null,
      result: blockedAggregationResult("input_contract_invalid"),
      sideEffects: noSideEffects(providerFlags),
      executionTelemetry: telemetry(),
    });
  }
  const inputPacket = inputPacketResult.inputPacket;
  const inputPacketByteLength = utf8ByteLength(JSON.stringify(inputPacket));
  const inputPacketHash = sha256Json(inputPacket);
  if (inputPacketByteLength > INTERNAL_REPORT_WRITER_MAX_INPUT_PACKET_BYTES) {
    return decision({
      request,
      status: "internal_report_writer_blocked",
      blockedReason: "input_packet_too_large",
      damagedReason: null,
      inputPacket,
      result: blockedAggregationResult("input_contract_invalid"),
      sideEffects: noSideEffects(providerFlags),
      executionTelemetry: telemetry({ inputPacketHash, inputPacketByteLength }),
    });
  }
  if (!isRealValue(request.renderedPrompt) || !isRealValue(request.promptContentHash)) {
    return decision({
      request,
      status: "internal_report_writer_blocked",
      blockedReason: "prompt_render_missing",
      damagedReason: null,
      inputPacket,
      result: blockedAggregationResult("prompt_not_approved"),
      sideEffects: noSideEffects(providerFlags),
      executionTelemetry: telemetry({ inputPacketHash, inputPacketByteLength }),
    });
  }

  const gatewayTask = getPipelineRunGatewayTask(request.context, "aggregation_narrative");
  const modelPolicy = getPipelineRunTaskModelPolicy(request.context, "aggregation_narrative");
  const preparedSideEffects = noSideEffects({
    ...providerFlags,
    promptLoaded: true,
    promptRendered: true,
  });
  const baseTelemetry = {
    promptContentHash: request.promptContentHash,
    renderedPromptHash: sha256Text(request.renderedPrompt),
    inputPacketHash,
    inputPacketByteLength,
    modelPolicyId: modelPolicy?.policyId ?? null,
    cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
  };
  if (!modelPolicy || !isApprovedHJ19ModelPolicy(modelPolicy)) {
    return decision({
      request,
      status: "internal_report_writer_blocked",
      blockedReason: "prompt_or_model_not_approved",
      damagedReason: null,
      inputPacket,
      result: blockedAggregationResult("prompt_not_approved"),
      sideEffects: preparedSideEffects,
      executionTelemetry: telemetry(baseTelemetry),
    });
  }
  if (!canExecuteAnalyzerV2GatewayTask(gatewayTask)) {
    return decision({
      request,
      status: "internal_report_writer_blocked",
      blockedReason: "task_policy_not_executable",
      damagedReason: null,
      inputPacket,
      result: blockedAggregationResult("task_policy_not_executable"),
      sideEffects: preparedSideEffects,
      executionTelemetry: telemetry(baseTelemetry),
    });
  }

  const cacheDecision = buildNoStoreCacheDecision(buildCacheDecisionInput({
    request,
    inputPacket,
    modelPolicy,
  }));
  const postCacheSideEffects = noSideEffects({
    ...preparedSideEffects,
    cacheDecisionConstructed: true,
  });
  if (cacheDecision.reason !== "no_store_runtime_dispatch_safety" || cacheDecision.canRead || cacheDecision.canWrite) {
    return decision({
      request,
      status: "internal_report_writer_blocked",
      blockedReason: "cache_contract_not_no_store",
      damagedReason: null,
      inputPacket,
      result: blockedAggregationResult("task_policy_not_executable"),
      sideEffects: postCacheSideEffects,
      executionTelemetry: telemetry({
        ...baseTelemetry,
        cacheDecisionReason: cacheDecision.reason,
      }),
    });
  }

  const attempts: InternalReportWriterModelAttempt[] = [];
  const maxAttempts = Math.max(1, Math.min(modelPolicy.maxCalls, modelPolicy.schemaRetryCount + 1));
  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    let providerResponse: InternalReportWriterProviderCallResponse;
    try {
      providerResponse = await request.providerCall({
        renderedPrompt: request.renderedPrompt,
        promptContentHash: request.promptContentHash,
        outputSchemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
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
      return decision({
        request,
        status: "internal_report_writer_damaged",
        blockedReason: null,
        damagedReason: "provider_unavailable",
        inputPacket,
        result: damagedAggregationResult("provider_unavailable"),
        sideEffects: noSideEffects({
          ...postCacheSideEffects,
          adapterCalled: true,
          reportProseLlmCalled: true,
        }),
        executionTelemetry: telemetryFromAttempts({
          attempts,
          modelPolicy,
          request,
          inputPacketHash,
          inputPacketByteLength,
          cacheDecision,
          cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
        }),
      });
    }

    const calledSideEffects = noSideEffects({
      ...postCacheSideEffects,
      adapterCalled: true,
      modelCalled: true,
      reportProseLlmCalled: true,
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
      return decision({
        request,
        status: "internal_report_writer_damaged",
        blockedReason: null,
        damagedReason: "provider_telemetry_invalid",
        inputPacket,
        result: damagedAggregationResult("provider_unavailable"),
        sideEffects: calledSideEffects,
        executionTelemetry: telemetryFromAttempts({
          attempts,
          modelPolicy,
          request,
          inputPacketHash,
          inputPacketByteLength,
          cacheDecision,
          cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
        }),
      });
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
      return decision({
        request,
        status: "internal_report_writer_damaged",
        blockedReason: null,
        damagedReason: "parse_failure",
        inputPacket,
        result: damagedAggregationResult("schema_validation_failed"),
        sideEffects: calledSideEffects,
        executionTelemetry: telemetryFromAttempts({
          attempts,
          modelPolicy,
          request,
          inputPacketHash,
          inputPacketByteLength,
          cacheDecision,
          cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
        }),
      });
    }

    const parsedResult = AggregationNarrativeResultSchema.safeParse(parsedOutput.value);
    if (!parsedResult.success) {
      attempts.push({
        attemptNumber,
        promptContentHash: request.promptContentHash,
        status: "invalid_schema",
        providerTelemetry: providerResponse.telemetry,
        failureCode: "schema_validation_failed",
        schemaDiagnostics: schemaDiagnostics({
          outputParseStatus: "parsed",
          failureCategory: "schema_validation",
          issues: collectSchemaIssueDiagnostics(parsedResult.error.issues),
        }),
      });
      return decision({
        request,
        status: "internal_report_writer_damaged",
        blockedReason: null,
        damagedReason: "schema_validation_failed",
        inputPacket,
        result: damagedAggregationResult("schema_validation_failed"),
        sideEffects: calledSideEffects,
        executionTelemetry: telemetryFromAttempts({
          attempts,
          modelPolicy,
          request,
          inputPacketHash,
          inputPacketByteLength,
          cacheDecision,
          cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
        }),
      });
    }

    const result = parsedResult.data as AggregationNarrativeResult;
    const contentError = validateAcceptedResultContent(result, inputPacket);
    if (contentError) {
      attempts.push({
        attemptNumber,
        promptContentHash: request.promptContentHash,
        status: "invalid_schema",
        providerTelemetry: providerResponse.telemetry,
        failureCode: contentError,
        schemaDiagnostics: schemaDiagnostics({
          outputParseStatus: "parsed",
          failureCategory: "task_contract_validation",
          issues: [{ path: ["aggregationNarrativeResult"], code: contentError }],
        }),
      });
      return decision({
        request,
        status: "internal_report_writer_damaged",
        blockedReason: null,
        damagedReason: contentError,
        inputPacket,
        result: damagedAggregationResult("task_contract_validation_failed"),
        sideEffects: calledSideEffects,
        executionTelemetry: telemetryFromAttempts({
          attempts,
          modelPolicy,
          request,
          inputPacketHash,
          inputPacketByteLength,
          cacheDecision,
          cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
        }),
      });
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
        status: "internal_report_writer_blocked",
        blockedReason: result.blockedReason === "prompt_not_approved"
          ? "prompt_or_model_not_approved"
          : "task_policy_not_executable",
        damagedReason: null,
        inputPacket,
        result,
        sideEffects: calledSideEffects,
        executionTelemetry: telemetryFromAttempts({
          attempts,
          modelPolicy,
          request,
          inputPacketHash,
          inputPacketByteLength,
          cacheDecision,
          cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
        }),
      });
    }
    if (result.status === "damaged") {
      return decision({
        request,
        status: "internal_report_writer_damaged",
        blockedReason: null,
        damagedReason: result.damagedReason === "provider_unavailable"
          ? "provider_unavailable"
          : "task_contract_validation_failed",
        inputPacket,
        result,
        sideEffects: calledSideEffects,
        executionTelemetry: telemetryFromAttempts({
          attempts,
          modelPolicy,
          request,
          inputPacketHash,
          inputPacketByteLength,
          cacheDecision,
          cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
        }),
      });
    }
    return decision({
      request,
      status: "internal_report_writer_draft_created",
      blockedReason: null,
      damagedReason: null,
      inputPacket,
      result: result as AcceptedAggregationNarrativeResult,
      sideEffects: calledSideEffects,
      executionTelemetry: telemetryFromAttempts({
        attempts,
        modelPolicy,
        request,
        inputPacketHash,
        inputPacketByteLength,
        cacheDecision,
        cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
      }),
    });
  }

  return decision({
    request,
    status: "internal_report_writer_damaged",
    blockedReason: null,
    damagedReason: "schema_validation_failed",
    inputPacket,
    result: damagedAggregationResult("schema_validation_failed"),
    sideEffects: noSideEffects({
      ...postCacheSideEffects,
      adapterCalled: true,
      reportProseLlmCalled: true,
    }),
    executionTelemetry: telemetry(baseTelemetry),
  });
}
