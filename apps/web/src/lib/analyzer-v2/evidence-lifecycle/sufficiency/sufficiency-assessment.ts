import { createHash } from "node:crypto";

import type { BoundedEvidenceExtractionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import {
  type SufficiencyIntakeDecision,
  SUFFICIENCY_INTAKE_DECISION_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import { EvidenceSufficiencyResultSchema } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas";
import {
  EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
  EVIDENCE_TASK_PROMPT_SECTION_IDS,
  type EvidenceSufficiencyAssessment,
  type EvidenceLifecycleTaskBlockedReason,
  type EvidenceLifecycleTaskDamagedReason,
  type EvidenceSufficiencyResult,
  type ExtractedEvidenceItemContract,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import { canExecuteAnalyzerV2GatewayTask } from "@/lib/analyzer-v2/gateway/policy";
import type {
  AnalyzerV2CacheDecision,
  AnalyzerV2CacheDimension,
  AnalyzerV2TaskModelPolicy,
} from "@/lib/analyzer-v2/gateway/types";
import {
  ANALYZER_V2_W6_C_CAPTAIN_APPROVAL,
} from "@/lib/analyzer-v2/gateway/approval-records";
import {
  getPipelineRunGatewayTask,
  getPipelineRunTaskModelPolicy,
  type PipelineRunContext,
} from "@/lib/analyzer-v2/run-context";
import { sha256Json } from "@/lib/analyzer-v2/util";

export const SUFFICIENCY_ASSESSMENT_DECISION_VERSION =
  "v2.evidence-lifecycle.sufficiency-assessment.w6c" as const;
export const SUFFICIENCY_ASSESSMENT_INPUT_PACKET_VERSION =
  "v2.evidence-lifecycle.sufficiency-assessment-input.w6c" as const;
export const SUFFICIENCY_ASSESSMENT_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-20_V2_Slice_W6-C_Sufficiency_Assessment_Implementation_Approval_Package.md" as const;
export const SUFFICIENCY_ASSESSMENT_CACHE_NAMESPACE = "analyzer-v2:v2.semantic.evidence-sufficiency.w6c:evidence_sufficiency" as const;

export type SufficiencyAssessmentStatus =
  | "sufficiency_assessment_completed"
  | "sufficiency_assessment_blocked"
  | "sufficiency_assessment_damaged";

export type SufficiencyAssessmentBlockedReason =
  | "sufficiency_intake_missing"
  | "sufficiency_intake_not_ready"
  | "sufficiency_intake_lineage_missing"
  | "bounded_evidence_extraction_missing"
  | "bounded_evidence_extraction_not_accepted"
  | "lineage_mismatch"
  | "statement_projection_mismatch"
  | "side_effects_not_closed"
  | "prompt_or_model_not_approved"
  | "task_policy_not_executable"
  | "cache_contract_not_no_store"
  | "prompt_render_missing"
  | EvidenceLifecycleTaskBlockedReason;

export type SufficiencyAssessmentDamagedReason =
  | "provider_unavailable"
  | "parse_failure"
  | "schema_validation_failed"
  | "task_contract_validation_failed"
  | "provider_telemetry_invalid"
  | EvidenceLifecycleTaskDamagedReason;

export type SufficiencyAssessmentProviderTelemetry = {
  readonly providerId: string;
  readonly modelId: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly durationMs: number;
};

export type SufficiencyAssessmentProviderCallRequest = {
  readonly renderedPrompt: string;
  readonly promptContentHash: string;
  readonly outputSchemaVersion: typeof EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION;
  readonly modelPolicy: AnalyzerV2TaskModelPolicy;
  readonly inputPacket: SufficiencyAssessmentInputPacket;
};

export type SufficiencyAssessmentProviderCallResponse = {
  readonly output: unknown;
  readonly telemetry: SufficiencyAssessmentProviderTelemetry;
};

export type SufficiencyAssessmentProviderCall = (
  request: SufficiencyAssessmentProviderCallRequest,
) => Promise<SufficiencyAssessmentProviderCallResponse>;

export type SufficiencyAssessmentEvidenceScopeProjection = {
  readonly scopeIdHash: string;
  readonly scopeIdByteLength: number;
  readonly methodHash: string | null;
  readonly methodByteLength: number | null;
  readonly temporalBoundsHash: string | null;
  readonly temporalBoundsByteLength: number | null;
  readonly populationOrDomainHash: string | null;
  readonly populationOrDomainByteLength: number | null;
  readonly geographicScopeHash: string | null;
  readonly geographicScopeByteLength: number | null;
  readonly limitationCount: number;
  readonly limitationHashes: readonly string[];
  readonly limitationByteLengths: readonly number[];
};

export type SufficiencyAssessmentInputPacketItem = {
  readonly evidenceItemId: string;
  readonly statement: string;
  readonly statementHash: string;
  readonly statementByteLength: number;
  readonly targetAtomicClaimIds: readonly string[];
  readonly claimDirection: ExtractedEvidenceItemContract["claimDirection"];
  readonly probativeValue: ExtractedEvidenceItemContract["probativeValue"];
  readonly evidenceStrength: ExtractedEvidenceItemContract["evidenceStrength"];
  readonly extractionConfidence: ExtractedEvidenceItemContract["extractionConfidence"];
  readonly evidenceScope: SufficiencyAssessmentEvidenceScopeProjection;
  readonly provenanceLocatorHash: string;
  readonly provenanceLocatorByteLength: number;
  readonly provenanceRationaleHash: string;
  readonly provenanceRationaleByteLength: number;
};

export type SufficiencyAssessmentInputPacket = {
  readonly packetVersion: typeof SUFFICIENCY_ASSESSMENT_INPUT_PACKET_VERSION;
  readonly packetId: string;
  readonly parentSufficiencyIntakeDecisionId: string;
  readonly parentSufficiencyIntakeDecisionVersion: typeof SUFFICIENCY_INTAKE_DECISION_VERSION;
  readonly parentW5DecisionId: string;
  readonly evidenceItemCount: number;
  readonly evidenceItems: readonly SufficiencyAssessmentInputPacketItem[];
  readonly sourceMaterialLineageHash: string;
  readonly w4hPacketHash: string;
  readonly providerId: string;
  readonly modelId: string;
};

export type SufficiencyAssessmentExecutionTelemetry = {
  readonly gatewayTaskId: "evidence_sufficiency";
  readonly promptSectionId: typeof EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_sufficiency;
  readonly promptContentHash: string | null;
  readonly renderedPromptHash: string | null;
  readonly inputPacketHash: string | null;
  readonly inputPacketByteLength: number | null;
  readonly outputSchemaVersion: typeof EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION;
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
  readonly cachePolicyId: string | null;
  readonly approvalPointer: typeof SUFFICIENCY_ASSESSMENT_SOURCE_PACKAGE;
};

export type SufficiencyAssessmentSideEffects = {
  readonly sufficiencyLlmCalled: boolean;
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

export type SufficiencyAssessmentDecision = {
  readonly decisionVersion: typeof SUFFICIENCY_ASSESSMENT_DECISION_VERSION;
  readonly decisionId: string;
  readonly kind: "sufficiency_assessment";
  readonly assessmentStatus: SufficiencyAssessmentStatus;
  readonly blockedReason: SufficiencyAssessmentBlockedReason | null;
  readonly damagedReason: SufficiencyAssessmentDamagedReason | null;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly defaultProjection: "hash_length_provenance_only";
  readonly parentSufficiencyIntakeDecisionId: string | null;
  readonly parentSufficiencyIntakeDecisionVersion: typeof SUFFICIENCY_INTAKE_DECISION_VERSION | null;
  readonly parentW5DecisionId: string | null;
  readonly admittedEvidenceItemCount: number;
  readonly evidenceItemStatementHashes: readonly string[];
  readonly evidenceItemStatementByteLengths: readonly number[];
  readonly sourceMaterialLineageHash: string | null;
  readonly w4hPacketHash: string | null;
  readonly providerId: string | null;
  readonly modelId: string | null;
  readonly taskKey: "evidence_sufficiency";
  readonly taskSchemaVersion: typeof EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION;
  readonly sufficiencyResultStatus: EvidenceSufficiencyResult["status"] | null;
  readonly sufficiencyResultPayloadHash: string | null;
  readonly reportStopRecommendation: EvidenceSufficiencyAssessment["recommendedNextAction"] | null;
  readonly redaction: {
    readonly evidenceItemTextReturned: false;
    readonly sourceTextReturned: false;
    readonly inputPacketReturned: false;
    readonly evidenceScopeTextReturned: false;
    readonly provenanceTextReturned: false;
    readonly promptTextReturned: false;
    readonly renderedPromptTextReturned: false;
    readonly providerPayloadReturned: false;
    readonly sufficiencyResultPayloadReturned: false;
  };
  readonly sideEffects: SufficiencyAssessmentSideEffects;
  readonly executionTelemetry: SufficiencyAssessmentExecutionTelemetry;
};

export type RunSufficiencyAssessmentRequest = {
  readonly context: PipelineRunContext;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision | null;
  readonly renderedPrompt: string;
  readonly promptContentHash: string;
  readonly configSnapshotHash: string;
  readonly providerCall: SufficiencyAssessmentProviderCall;
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

function textProjection(value: string | null): { readonly hash: string | null; readonly byteLength: number | null } {
  if (typeof value !== "string") {
    return { hash: null, byteLength: null };
  }
  return {
    hash: sha256Text(value),
    byteLength: utf8ByteLength(value),
  };
}

function noSideEffects(
  overrides: Partial<SufficiencyAssessmentSideEffects> = {},
): SufficiencyAssessmentSideEffects {
  return {
    sufficiencyLlmCalled: false,
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
  overrides: Partial<SufficiencyAssessmentExecutionTelemetry> = {},
): SufficiencyAssessmentExecutionTelemetry {
  return {
    gatewayTaskId: "evidence_sufficiency",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_sufficiency,
    promptContentHash: null,
    renderedPromptHash: null,
    inputPacketHash: null,
    inputPacketByteLength: null,
    outputSchemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
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
    cachePolicyId: null,
    approvalPointer: SUFFICIENCY_ASSESSMENT_SOURCE_PACKAGE,
    ...overrides,
  };
}

function isRealValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

function providerTelemetryValid(input: SufficiencyAssessmentProviderTelemetry): boolean {
  return isRealValue(input.providerId)
    && isRealValue(input.modelId)
    && [input.inputTokens, input.outputTokens, input.totalTokens, input.durationMs]
      .every((value) => Number.isFinite(value) && value >= 0);
}

function isApprovedW6CModelPolicy(policy: AnalyzerV2TaskModelPolicy): boolean {
  return policy.policyId === "v2.model.evidence_sufficiency.w6c"
    && policy.gatewayTaskId === "evidence_sufficiency"
    && policy.modelTask === "context_refinement"
    && policy.modelTier === "standard"
    && policy.providerPolicy === "from_config_snapshot"
    && policy.temperature === 0.1
    && policy.maxCalls === 1
    && policy.schemaRetryCount === 0
    && policy.timeoutMs === 90000
    && policy.maxOutputTokens === 3000
    && policy.fallbackBehavior === "none_fail_closed"
    && policy.escalationBehavior === "surface_provider_failure"
    && policy.execution === "blocked_until_prompt_model_cache_approval"
    && policy.approval.status === ANALYZER_V2_W6_C_CAPTAIN_APPROVAL.status
    && policy.approval.reviewer === ANALYZER_V2_W6_C_CAPTAIN_APPROVAL.reviewer
    && policy.approval.approvedAt === ANALYZER_V2_W6_C_CAPTAIN_APPROVAL.approvedAt;
}

function evidenceScopeProjection(
  scope: ExtractedEvidenceItemContract["evidenceScope"],
): SufficiencyAssessmentEvidenceScopeProjection {
  const method = textProjection(scope.method);
  const temporalBounds = textProjection(scope.temporalBounds);
  const populationOrDomain = textProjection(scope.populationOrDomain);
  const geographicScope = textProjection(scope.geographicScope);
  const limitationProjections = scope.limitations.map((limitation) => textProjection(limitation));

  return {
    scopeIdHash: sha256Text(scope.scopeId),
    scopeIdByteLength: utf8ByteLength(scope.scopeId),
    methodHash: method.hash,
    methodByteLength: method.byteLength,
    temporalBoundsHash: temporalBounds.hash,
    temporalBoundsByteLength: temporalBounds.byteLength,
    populationOrDomainHash: populationOrDomain.hash,
    populationOrDomainByteLength: populationOrDomain.byteLength,
    geographicScopeHash: geographicScope.hash,
    geographicScopeByteLength: geographicScope.byteLength,
    limitationCount: scope.limitations.length,
    limitationHashes: limitationProjections.map((projection) => projection.hash).filter(isRealValue),
    limitationByteLengths: limitationProjections.map((projection) => projection.byteLength).filter(
      (value): value is number => typeof value === "number",
    ),
  };
}

function inputPacketItem(item: ExtractedEvidenceItemContract): SufficiencyAssessmentInputPacketItem {
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
    evidenceScope: evidenceScopeProjection(item.evidenceScope),
    provenanceLocatorHash: sha256Text(item.provenance.locator),
    provenanceLocatorByteLength: utf8ByteLength(item.provenance.locator),
    provenanceRationaleHash: sha256Text(item.provenance.rationale),
    provenanceRationaleByteLength: utf8ByteLength(item.provenance.rationale),
  };
}

function blockedDecision(
  request: RunSufficiencyAssessmentRequest,
  reason: SufficiencyAssessmentBlockedReason,
  sideEffects: SufficiencyAssessmentSideEffects = noSideEffects({
    providerCallbackCreated: request.providerCallbackCreated === true,
    providerSdkLoaded: request.providerSdkLoaded === true,
  }),
  telemetryOverrides: Partial<SufficiencyAssessmentExecutionTelemetry> = {},
): SufficiencyAssessmentDecision {
  return decision({
    request,
    status: "sufficiency_assessment_blocked",
    blockedReason: reason,
    damagedReason: null,
    sufficiencyResultStatus: null,
    sufficiencyResultPayloadHash: null,
    reportStopRecommendation: null,
    sideEffects,
    executionTelemetry: telemetry(telemetryOverrides),
  });
}

function damagedDecision(
  request: RunSufficiencyAssessmentRequest,
  reason: SufficiencyAssessmentDamagedReason,
  sideEffects: SufficiencyAssessmentSideEffects,
  telemetryOverrides: Partial<SufficiencyAssessmentExecutionTelemetry>,
  sufficiencyResult: EvidenceSufficiencyResult | null = null,
): SufficiencyAssessmentDecision {
  return decision({
    request,
    status: "sufficiency_assessment_damaged",
    blockedReason: null,
    damagedReason: reason,
    sufficiencyResultStatus: sufficiencyResult?.status ?? null,
    sufficiencyResultPayloadHash: sufficiencyResult ? sha256Json(sufficiencyResult) : null,
    reportStopRecommendation: null,
    sideEffects,
    executionTelemetry: telemetry(telemetryOverrides),
  });
}

function decision(params: {
  readonly request: RunSufficiencyAssessmentRequest;
  readonly status: SufficiencyAssessmentStatus;
  readonly blockedReason: SufficiencyAssessmentBlockedReason | null;
  readonly damagedReason: SufficiencyAssessmentDamagedReason | null;
  readonly sufficiencyResultStatus: EvidenceSufficiencyResult["status"] | null;
  readonly sufficiencyResultPayloadHash: string | null;
  readonly reportStopRecommendation: SufficiencyAssessmentDecision["reportStopRecommendation"];
  readonly sideEffects: SufficiencyAssessmentSideEffects;
  readonly executionTelemetry: SufficiencyAssessmentExecutionTelemetry;
}): SufficiencyAssessmentDecision {
  const intake = params.request.sufficiencyIntake;
  const parentW5 = params.request.boundedEvidenceExtraction;
  const accepted = params.status === "sufficiency_assessment_completed";
  const decisionHash = sha256Json({
    parentSufficiencyIntakeDecisionId: intake?.decisionId ?? null,
    parentW5DecisionId: parentW5?.decisionId ?? null,
    assessmentStatus: params.status,
    blockedReason: params.blockedReason,
    damagedReason: params.damagedReason,
    sufficiencyResultStatus: params.sufficiencyResultStatus,
    sufficiencyResultPayloadHash: params.sufficiencyResultPayloadHash,
  });

  return {
    decisionVersion: SUFFICIENCY_ASSESSMENT_DECISION_VERSION,
    decisionId: `SUFFICIENCY_ASSESSMENT_${decisionHash.slice(0, 24).toUpperCase()}`,
    kind: "sufficiency_assessment",
    assessmentStatus: params.status,
    blockedReason: params.blockedReason,
    damagedReason: params.damagedReason,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parentSufficiencyIntakeDecisionId: intake?.decisionId ?? null,
    parentSufficiencyIntakeDecisionVersion: intake?.decisionVersion === SUFFICIENCY_INTAKE_DECISION_VERSION
      ? SUFFICIENCY_INTAKE_DECISION_VERSION
      : null,
    parentW5DecisionId: parentW5?.decisionId ?? null,
    admittedEvidenceItemCount: accepted ? intake?.admittedEvidenceItemCount ?? 0 : 0,
    evidenceItemStatementHashes: accepted ? intake?.evidenceItemStatementHashes ?? [] : [],
    evidenceItemStatementByteLengths: accepted ? intake?.evidenceItemStatementByteLengths ?? [] : [],
    sourceMaterialLineageHash: intake?.sourceMaterialLineageHash ?? null,
    w4hPacketHash: intake?.w4hPacketHash ?? null,
    providerId: intake?.providerId ?? null,
    modelId: intake?.modelId ?? null,
    taskKey: "evidence_sufficiency",
    taskSchemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
    sufficiencyResultStatus: params.sufficiencyResultStatus,
    sufficiencyResultPayloadHash: params.sufficiencyResultPayloadHash,
    reportStopRecommendation: params.reportStopRecommendation,
    redaction: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputPacketReturned: false,
      evidenceScopeTextReturned: false,
      provenanceTextReturned: false,
      promptTextReturned: false,
      renderedPromptTextReturned: false,
      providerPayloadReturned: false,
      sufficiencyResultPayloadReturned: false,
    },
    sideEffects: params.sideEffects,
    executionTelemetry: params.executionTelemetry,
  };
}

function validateParents(
  intake: SufficiencyIntakeDecision | null,
  w5: BoundedEvidenceExtractionDecision | null,
): SufficiencyAssessmentBlockedReason | null {
  if (!intake) {
    return "sufficiency_intake_missing";
  }
  if (
    intake.decisionVersion !== SUFFICIENCY_INTAKE_DECISION_VERSION ||
    intake.kind !== "sufficiency_intake" ||
    intake.intakeStatus !== "sufficiency_intake_ready_for_contract_only_assessment" ||
    intake.assessmentExecution !== "closed_contract_only"
  ) {
    return "sufficiency_intake_not_ready";
  }
  if (
    !intake.parentEvidenceItemHandoffDecisionId ||
    !intake.lineageHash ||
    !intake.sourceMaterialLineageHash ||
    !intake.w4hPacketHash ||
    !intake.providerId ||
    !intake.modelId ||
    intake.evidenceItemStatementHashes.length === 0 ||
    intake.evidenceItemStatementByteLengths.length === 0
  ) {
    return "sufficiency_intake_lineage_missing";
  }
  if (!w5) {
    return "bounded_evidence_extraction_missing";
  }
  if (
    w5.status !== "hidden_evidence_item_extraction_completed" ||
    w5.extractionResultStatus !== "accepted" ||
    w5.extractionStatus !== "evidence_extracted" ||
    w5.extractionResult?.status !== "accepted"
  ) {
    return "bounded_evidence_extraction_not_accepted";
  }
  if (
    w5.sideEffects.parserExecuted !== false ||
    w5.sideEffects.cacheRead !== false ||
    w5.sideEffects.cacheWrite !== false ||
    w5.sideEffects.reportGenerated !== false ||
    w5.sideEffects.verdictGenerated !== false ||
    w5.sideEffects.warningGenerated !== false ||
    w5.sideEffects.confidenceGenerated !== false ||
    w5.sideEffects.publicSurfaceWritten !== false ||
    w5.sideEffects.sourceReliabilityCalled !== false ||
    w5.sideEffects.storageWrite !== false ||
    w5.productExecution.parserExecuted !== false ||
    w5.productExecution.cacheRead !== false ||
    w5.productExecution.cacheWrite !== false ||
    w5.productExecution.sourceReliabilityRead !== false ||
    w5.productExecution.sourceReliabilityWrite !== false ||
    w5.productExecution.storageWrite !== false ||
    w5.productExecution.reportGenerated !== false ||
    w5.productExecution.verdictGenerated !== false ||
    w5.productExecution.warningGenerated !== false ||
    w5.productExecution.confidenceGenerated !== false ||
    w5.productExecution.publicProjectionWritten !== false
  ) {
    return "side_effects_not_closed";
  }
  if (
    !w5.parent.sourceMaterialRef ||
    sha256Text(w5.parent.sourceMaterialRef) !== intake.sourceMaterialLineageHash ||
    w5.parent.parentPacketHash !== intake.w4hPacketHash ||
    w5.parent.parentProviderId !== intake.providerId ||
    w5.executionTelemetry.modelId !== intake.modelId
  ) {
    return "lineage_mismatch";
  }
  if (
    w5.evidenceItemCount !== intake.admittedEvidenceItemCount ||
    w5.extractionResult.evidenceItems.length !== intake.admittedEvidenceItemCount ||
    w5.evidenceItemStatementHashes.length !== intake.admittedEvidenceItemCount ||
    w5.evidenceItemStatementByteLengths.length !== intake.admittedEvidenceItemCount
  ) {
    return "statement_projection_mismatch";
  }
  for (let index = 0; index < w5.extractionResult.evidenceItems.length; index += 1) {
    const item = w5.extractionResult.evidenceItems[index]!;
    const hash = sha256Text(item.statement);
    const byteLength = utf8ByteLength(item.statement);
    if (
      hash !== intake.evidenceItemStatementHashes[index] ||
      byteLength !== intake.evidenceItemStatementByteLengths[index] ||
      hash !== w5.evidenceItemStatementHashes[index] ||
      byteLength !== w5.evidenceItemStatementByteLengths[index]
    ) {
      return "statement_projection_mismatch";
    }
  }
  return null;
}

function buildInputPacket(
  intake: SufficiencyIntakeDecision,
  w5: BoundedEvidenceExtractionDecision,
): SufficiencyAssessmentInputPacket {
  const evidenceItems = w5.extractionResult?.status === "accepted"
    ? w5.extractionResult.evidenceItems.map(inputPacketItem)
    : [];
  const base = {
    packetVersion: SUFFICIENCY_ASSESSMENT_INPUT_PACKET_VERSION,
    parentSufficiencyIntakeDecisionId: intake.decisionId,
    parentSufficiencyIntakeDecisionVersion: SUFFICIENCY_INTAKE_DECISION_VERSION,
    parentW5DecisionId: w5.decisionId,
    evidenceItemCount: evidenceItems.length,
    evidenceItems,
    sourceMaterialLineageHash: intake.sourceMaterialLineageHash!,
    w4hPacketHash: intake.w4hPacketHash!,
    providerId: intake.providerId!,
    modelId: intake.modelId!,
  };
  return {
    ...base,
    packetId: `SUFFICIENCY_ASSESSMENT_INPUT_${sha256Json(base).slice(0, 24).toUpperCase()}`,
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
  readonly inputPacket: SufficiencyAssessmentInputPacket;
  readonly promptContentHash: string;
  readonly configSnapshotHash: string;
}): AnalyzerV2CacheDecision {
  const task = getPipelineRunGatewayTask(params.context, "evidence_sufficiency");
  const policy = task.cachePolicy;
  const input: CacheKeyInput = {
    promptProfile: "claimboundary-v2",
    promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_sufficiency,
    promptContentHash: params.promptContentHash,
    modelTask: params.modelPolicy.modelTask,
    provider: params.inputPacket.providerId,
    modelName: params.inputPacket.modelId,
    temperature: params.modelPolicy.temperature,
    outputSchemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
    configSnapshotHash: params.configSnapshotHash,
    resultSchemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
    inputIdentityHash: sha256Json({
      packetId: params.inputPacket.packetId,
      packetHash: sha256Json(params.inputPacket),
      sourceMaterialLineageHash: params.inputPacket.sourceMaterialLineageHash,
    }),
    sourceIdentityHash: params.inputPacket.sourceMaterialLineageHash,
    currentDateBucket: params.context.currentDate,
    adapterVersion: SUFFICIENCY_ASSESSMENT_DECISION_VERSION,
  };
  const missingDimensions = (policy?.requiredDimensions ?? []).filter(
    (dimension) => !hasCacheDimensionValue(input, dimension),
  );

  return {
    namespace: SUFFICIENCY_ASSESSMENT_CACHE_NAMESPACE,
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

export async function runSufficiencyAssessmentRuntime(
  request: RunSufficiencyAssessmentRequest,
): Promise<SufficiencyAssessmentDecision> {
  const parentValidation = validateParents(request.sufficiencyIntake, request.boundedEvidenceExtraction);
  if (parentValidation) {
    return blockedDecision(request, parentValidation);
  }
  if (!isRealValue(request.renderedPrompt) || !isRealValue(request.promptContentHash)) {
    return blockedDecision(request, "prompt_render_missing");
  }

  const intake = request.sufficiencyIntake!;
  const w5 = request.boundedEvidenceExtraction!;
  const gatewayTask = getPipelineRunGatewayTask(request.context, "evidence_sufficiency");
  const modelPolicy = getPipelineRunTaskModelPolicy(request.context, "evidence_sufficiency");
  const preparedSideEffects = noSideEffects({
    providerCallbackCreated: request.providerCallbackCreated === true,
    providerSdkLoaded: request.providerSdkLoaded === true,
    promptLoaded: true,
    promptRendered: true,
  });
  if (!modelPolicy || !isApprovedW6CModelPolicy(modelPolicy)) {
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

  const inputPacket = buildInputPacket(intake, w5);
  const inputPacketHash = sha256Json(inputPacket);
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
    inputPacketByteLength: utf8ByteLength(JSON.stringify(inputPacket)),
    modelPolicyId: modelPolicy.policyId,
    cacheDecisionReason: cacheDecision.reason,
    cachePolicyId: gatewayTask.cachePolicy?.policyId ?? null,
  };
  if (cacheDecision.reason !== "no_store_runtime_dispatch_safety" || cacheDecision.canRead || cacheDecision.canWrite) {
    return blockedDecision(request, "cache_contract_not_no_store", postCacheSideEffects, baseTelemetry);
  }

  let providerResponse: SufficiencyAssessmentProviderCallResponse;
  try {
    providerResponse = await request.providerCall({
      renderedPrompt: request.renderedPrompt,
      promptContentHash: request.promptContentHash,
      outputSchemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
      modelPolicy,
      inputPacket,
    });
  } catch {
    return damagedDecision(request, "provider_unavailable", noSideEffects({
      ...postCacheSideEffects,
      adapterCalled: true,
      sufficiencyLlmCalled: true,
    }), baseTelemetry);
  }

  const calledSideEffects = noSideEffects({
    ...postCacheSideEffects,
    adapterCalled: true,
    modelCalled: true,
    sufficiencyLlmCalled: true,
  });
  if (!providerTelemetryValid(providerResponse.telemetry)) {
    return damagedDecision(request, "provider_telemetry_invalid", calledSideEffects, baseTelemetry);
  }
  const completedTelemetry = {
    ...baseTelemetry,
    providerId: providerResponse.telemetry.providerId,
    modelId: providerResponse.telemetry.modelId,
    tokenUsage: {
      inputTokens: providerResponse.telemetry.inputTokens,
      outputTokens: providerResponse.telemetry.outputTokens,
      totalTokens: providerResponse.telemetry.totalTokens,
    },
    durationMs: providerResponse.telemetry.durationMs,
  };
  const parsedOutput = coerceProviderOutput(providerResponse.output);
  if (parsedOutput.status === "parse_failure") {
    return damagedDecision(request, "parse_failure", calledSideEffects, completedTelemetry);
  }

  const parsedResult = EvidenceSufficiencyResultSchema.safeParse(parsedOutput.value);
  if (!parsedResult.success) {
    return damagedDecision(request, "schema_validation_failed", calledSideEffects, completedTelemetry);
  }

  const result = parsedResult.data as EvidenceSufficiencyResult;
  if (result.status === "blocked") {
    return decision({
      request,
      status: "sufficiency_assessment_blocked",
      blockedReason: result.blockedReason,
      damagedReason: null,
      sufficiencyResultStatus: result.status,
      sufficiencyResultPayloadHash: sha256Json(result),
      reportStopRecommendation: null,
      sideEffects: calledSideEffects,
      executionTelemetry: telemetry(completedTelemetry),
    });
  }
  if (result.status === "damaged") {
    return damagedDecision(request, result.damagedReason, calledSideEffects, completedTelemetry, result);
  }

  return decision({
    request,
    status: "sufficiency_assessment_completed",
    blockedReason: null,
    damagedReason: null,
    sufficiencyResultStatus: result.status,
    sufficiencyResultPayloadHash: sha256Json(result),
    reportStopRecommendation: result.sufficiencyAssessment.recommendedNextAction,
    sideEffects: calledSideEffects,
    executionTelemetry: telemetry(completedTelemetry),
  });
}
