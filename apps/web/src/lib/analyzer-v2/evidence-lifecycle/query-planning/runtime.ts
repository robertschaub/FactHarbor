import { createHash } from "node:crypto";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import {
  buildEvidenceQueryPlanningInputEnvelope,
  EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES,
  type EvidenceQueryPlanningAcceptedInputEnvelope,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope";
import { loadAndRenderEvidenceQueryPlanningPrompt } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader";
import {
  executeEvidenceQueryPlanningModelAdapter,
  type EvidenceQueryPlanningModelAdapterOutcome,
  type EvidenceQueryPlanningProviderCall,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter";
import {
  EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
  type EvidenceLifecycleTaskEvent,
  type EvidenceQueryPlanningResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import { ANALYZER_V2_EVIDENCE_QUERY_PLANNING_CACHE_POLICY } from "@/lib/analyzer-v2/gateway/cache-policy-registry";
import { ANALYZER_V2_7L1_CAPTAIN_APPROVAL } from "@/lib/analyzer-v2/gateway/approval-records";
import { getAnalyzerV2TaskModelPolicy } from "@/lib/analyzer-v2/gateway/model-policy-registry";
import {
  canExecuteAnalyzerV2GatewayTask,
  getAnalyzerV2GatewayTask,
} from "@/lib/analyzer-v2/gateway/policy";
import type {
  AnalyzerV2CacheDecision,
  AnalyzerV2CacheDimension,
  AnalyzerV2CachePolicy,
  AnalyzerV2GatewayTask,
  AnalyzerV2TaskModelPolicy,
} from "@/lib/analyzer-v2/gateway/types";
import { sha256Json } from "@/lib/analyzer-v2/util";

export const EVIDENCE_QUERY_PLANNING_RUNTIME_VERSION =
  "v2.evidence-query-planning.runtime.0";
export const EVIDENCE_QUERY_PLANNING_CACHE_NAMESPACE = [
  "analyzer-v2",
  ANALYZER_V2_EVIDENCE_QUERY_PLANNING_CACHE_POLICY.policyId,
  "evidence_query_planning",
].join(":");

export type EvidenceQueryPlanningRuntimeSideEffects = {
  promptLoaded: boolean;
  promptRendered: boolean;
  adapterCalled: boolean;
  modelCalled: boolean;
  cacheDecisionConstructed: boolean;
  cacheRead: false;
  cacheWrite: false;
  providerCallbackCreated: false;
  providerSdkLoaded: false;
  searchFetchCalled: false;
  sourceReliabilityCalled: false;
  publicSurfaceWritten: false;
};

export type EvidenceQueryPlanningRuntimeBlockedReason =
  | "input_contract_invalid"
  | "gateway_policy_not_executable"
  | "model_policy_missing"
  | "model_policy_not_approved_for_7L1"
  | "prompt_render_failed"
  | "cache_contract_not_no_store";

export type EvidenceQueryPlanningRuntimeResult =
  | {
    runtimeVersion: typeof EVIDENCE_QUERY_PLANNING_RUNTIME_VERSION;
    visibility: "internal_only";
    status: "blocked";
    result: EvidenceQueryPlanningResult;
    blockedReason: EvidenceQueryPlanningRuntimeBlockedReason;
    promptProvenance: null;
    cacheDecision: AnalyzerV2CacheDecision | null;
    adapterOutcome: null;
    sideEffects: EvidenceQueryPlanningRuntimeSideEffects;
  }
  | {
    runtimeVersion: typeof EVIDENCE_QUERY_PLANNING_RUNTIME_VERSION;
    visibility: "internal_only";
    status: "completed";
    result: EvidenceQueryPlanningResult;
    blockedReason: null;
    promptProvenance: {
      promptContentHash: string;
      renderedPromptHash: string;
      configSnapshotHash: string;
      cacheDecisionReason: AnalyzerV2CacheDecision["reason"];
    };
    cacheDecision: AnalyzerV2CacheDecision;
    adapterOutcome: EvidenceQueryPlanningModelAdapterOutcome;
    sideEffects: EvidenceQueryPlanningRuntimeSideEffects;
  };

export type RunEvidenceQueryPlanningRuntimeRequest = {
  claimContract: ClaimContract;
  selectedAtomicClaimIds: readonly string[];
  currentDate: string;
  configSnapshotHash: string;
  providerId: string;
  modelId: string;
  providerCall: EvidenceQueryPlanningProviderCall;
};

type CacheKeyInput = Partial<Record<AnalyzerV2CacheDimension, string | number>>;

const FORBIDDEN_RUNTIME_VALUES = new Set(["placeholder", "todo", "unknown", "und"]);

function noSideEffects(
  overrides: Partial<EvidenceQueryPlanningRuntimeSideEffects> = {},
): EvidenceQueryPlanningRuntimeSideEffects {
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
    searchFetchCalled: false,
    sourceReliabilityCalled: false,
    publicSurfaceWritten: false,
    ...overrides,
  };
}

function event(
  type: EvidenceLifecycleTaskEvent["type"],
  severity: EvidenceLifecycleTaskEvent["severity"],
  message: string,
  references: string[],
): EvidenceLifecycleTaskEvent {
  return { type, severity, message, references };
}

function blockedResult(
  blockedReason: "task_policy_not_executable" | "input_contract_invalid",
  message: string,
): EvidenceQueryPlanningResult {
  return {
    schemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
    taskKey: "evidence_query_planning",
    status: "blocked",
    queryPlan: null,
    integrityEvents: [
      event(
        blockedReason === "task_policy_not_executable" ? "task_policy_blocked" : "input_contract_invalid",
        "error",
        message,
        ["evidence_query_planning"],
      ),
    ],
    blockedReason,
    damagedReason: null,
  };
}

function damagedResult(message: string): EvidenceQueryPlanningResult {
  return {
    schemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
    taskKey: "evidence_query_planning",
    status: "damaged",
    queryPlan: null,
    integrityEvents: [
      event("task_contract_validation_failed", "error", message, ["evidence_query_planning"]),
    ],
    blockedReason: null,
    damagedReason: "task_contract_validation_failed",
  };
}

function runtimeBlocked(
  blockedReason: EvidenceQueryPlanningRuntimeBlockedReason,
  result: EvidenceQueryPlanningResult,
  sideEffects: EvidenceQueryPlanningRuntimeSideEffects,
  cacheDecision: AnalyzerV2CacheDecision | null = null,
): EvidenceQueryPlanningRuntimeResult {
  return {
    runtimeVersion: EVIDENCE_QUERY_PLANNING_RUNTIME_VERSION,
    visibility: "internal_only",
    status: "blocked",
    result,
    blockedReason,
    promptProvenance: null,
    cacheDecision,
    adapterOutcome: null,
    sideEffects,
  };
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

function buildEvidenceQueryPlanningNoStoreCacheDecision(
  input: CacheKeyInput,
): AnalyzerV2CacheDecision {
  const missingDimensions = ANALYZER_V2_EVIDENCE_QUERY_PLANNING_CACHE_POLICY.requiredDimensions.filter(
    (dimension) => !hasCacheDimensionValue(input, dimension),
  );

  if (missingDimensions.length > 0) {
    return {
      namespace: EVIDENCE_QUERY_PLANNING_CACHE_NAMESPACE,
      canRead: false,
      canWrite: false,
      reason: "no_store_until_execution_approved",
      missingDimensions,
      keyParts: [],
    };
  }

  return {
    namespace: EVIDENCE_QUERY_PLANNING_CACHE_NAMESPACE,
    canRead: false,
    canWrite: false,
    reason: "no_store_runtime_dispatch_safety",
    missingDimensions: [],
    keyParts: buildCacheKeyParts(ANALYZER_V2_EVIDENCE_QUERY_PLANNING_CACHE_POLICY, input),
  };
}

function buildRenderedPromptHash(renderedPrompt: string): string {
  return createHash("sha256").update(renderedPrompt, "utf8").digest("hex");
}

function isRealRuntimeValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return value.trim().length > 0 && !FORBIDDEN_RUNTIME_VALUES.has(normalized);
}

function validateRuntimeProviderSnapshot(request: RunEvidenceQueryPlanningRuntimeRequest): string | null {
  for (const [fieldName, value] of [
    ["configSnapshotHash", request.configSnapshotHash],
    ["providerId", request.providerId],
    ["modelId", request.modelId],
  ] as const) {
    if (!isRealRuntimeValue(value)) {
      return `Evidence query planning requires real ${fieldName}.`;
    }
  }
  return null;
}

function isApproved7L1ModelPolicy(policy: AnalyzerV2TaskModelPolicy): boolean {
  // Intentionally exact for 7L-1: future policy changes must update this
  // validator and its tests so prompt/model execution remains fail-closed.
  return policy.policyId === "v2.model.evidence_query_planning.0"
    && policy.gatewayTaskId === "evidence_query_planning"
    && policy.modelTask === "understand"
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
    && policy.approval.status === ANALYZER_V2_7L1_CAPTAIN_APPROVAL.status
    && policy.approval.reviewer === ANALYZER_V2_7L1_CAPTAIN_APPROVAL.reviewer
    && policy.approval.approvedAt === ANALYZER_V2_7L1_CAPTAIN_APPROVAL.approvedAt;
}

function buildTaskPolicySnapshot(params: {
  gatewayTask: AnalyzerV2GatewayTask;
  modelPolicy: AnalyzerV2TaskModelPolicy;
  cachePolicy: AnalyzerV2CachePolicy;
}): Record<string, unknown> {
  return {
    gatewayTask: params.gatewayTask,
    modelPolicy: params.modelPolicy,
    cachePolicy: params.cachePolicy,
    maxQueryEntries: EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES,
  };
}

function buildCacheDecisionInput(params: {
  envelope: EvidenceQueryPlanningAcceptedInputEnvelope;
  renderedPromptContentHash: string;
  request: RunEvidenceQueryPlanningRuntimeRequest;
  modelPolicy: AnalyzerV2TaskModelPolicy;
}): CacheKeyInput {
  return {
    promptProfile: "claimboundary-v2",
    promptSectionId: "V2_EVIDENCE_QUERY_PLANNING",
    promptContentHash: params.renderedPromptContentHash,
    modelTask: params.modelPolicy.modelTask,
    provider: params.request.providerId,
    modelName: params.request.modelId,
    temperature: params.modelPolicy.temperature,
    outputSchemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
    configSnapshotHash: params.request.configSnapshotHash,
    resultSchemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
    inputIdentityHash: sha256Json({
      claimContractHash: params.envelope.claimContractHash,
      selectedAtomicClaimIds: params.envelope.selectedAtomicClaimIds,
      currentDate: params.request.currentDate,
    }),
    languageContextHash: sha256Json({
      sourceLanguage: params.envelope.sourceLanguage,
    }),
    currentDateBucket: params.request.currentDate,
    adapterVersion: "v2.evidence-query-planning.runtime.0",
  };
}

export async function runEvidenceQueryPlanningRuntime(
  request: RunEvidenceQueryPlanningRuntimeRequest,
): Promise<EvidenceQueryPlanningRuntimeResult> {
  const gatewayTask = getAnalyzerV2GatewayTask("evidence_query_planning");
  const modelPolicy = getAnalyzerV2TaskModelPolicy("evidence_query_planning");
  const cachePolicy = gatewayTask.cachePolicy ?? ANALYZER_V2_EVIDENCE_QUERY_PLANNING_CACHE_POLICY;

  if (!modelPolicy) {
    return runtimeBlocked(
      "model_policy_missing",
      blockedResult("task_policy_not_executable", "Evidence query-planning model policy is missing."),
      noSideEffects(),
    );
  }

  if (!isApproved7L1ModelPolicy(modelPolicy)) {
    return runtimeBlocked(
      "model_policy_not_approved_for_7L1",
      blockedResult(
        "task_policy_not_executable",
        "Evidence query-planning 7L-1 requires the exact approved one-call/no-retry model policy.",
      ),
      noSideEffects(),
    );
  }

  if (!canExecuteAnalyzerV2GatewayTask(gatewayTask)) {
    return runtimeBlocked(
      "gateway_policy_not_executable",
      blockedResult(
        "task_policy_not_executable",
        "Evidence query-planning gateway policy is not executable.",
      ),
      noSideEffects(),
    );
  }

  const inputEnvelope = buildEvidenceQueryPlanningInputEnvelope({
    claimContract: request.claimContract,
    selectedAtomicClaimIds: request.selectedAtomicClaimIds,
    currentDate: request.currentDate,
    taskPolicySnapshot: buildTaskPolicySnapshot({ gatewayTask, modelPolicy, cachePolicy }),
  });
  if (inputEnvelope.status === "blocked") {
    return runtimeBlocked(
      "input_contract_invalid",
      blockedResult("input_contract_invalid", inputEnvelope.message),
      noSideEffects(),
    );
  }

  const providerSnapshotError = validateRuntimeProviderSnapshot(request);
  if (providerSnapshotError) {
    return runtimeBlocked(
      "gateway_policy_not_executable",
      blockedResult("task_policy_not_executable", providerSnapshotError),
      noSideEffects(),
    );
  }

  let renderedPrompt: Awaited<ReturnType<typeof loadAndRenderEvidenceQueryPlanningPrompt>>;
  try {
    renderedPrompt = await loadAndRenderEvidenceQueryPlanningPrompt({
      variables: inputEnvelope.promptPackets,
    });
  } catch (error) {
    return runtimeBlocked(
      "prompt_render_failed",
      damagedResult(error instanceof Error ? error.message : "Evidence query-planning prompt render failed."),
      noSideEffects(),
    );
  }

  const cacheDecision = buildEvidenceQueryPlanningNoStoreCacheDecision(
    buildCacheDecisionInput({
      envelope: inputEnvelope,
      renderedPromptContentHash: renderedPrompt.promptContentHash,
      request,
      modelPolicy,
    }),
  );
  const postRenderSideEffects = noSideEffects({
    promptLoaded: true,
    promptRendered: true,
    cacheDecisionConstructed: true,
  });

  if (
    cacheDecision.reason !== "no_store_runtime_dispatch_safety"
    || cacheDecision.canRead
    || cacheDecision.canWrite
  ) {
    return runtimeBlocked(
      "cache_contract_not_no_store",
      damagedResult("Evidence query-planning cache decision was not no-store/no-read."),
      postRenderSideEffects,
      cacheDecision,
    );
  }

  const adapterOutcome = await executeEvidenceQueryPlanningModelAdapter({
    gatewayTask,
    modelPolicy,
    renderedPrompt,
    inputFrame: {
      sourceLanguage: inputEnvelope.sourceLanguage,
      selectedAtomicClaimIds: inputEnvelope.selectedAtomicClaimIds,
      currentDate: request.currentDate,
    },
    configSnapshotHash: request.configSnapshotHash,
    cacheDecision,
    providerCall: request.providerCall,
  });

  const completedSideEffects = noSideEffects({
    promptLoaded: true,
    promptRendered: true,
    adapterCalled: true,
    modelCalled: adapterOutcome.attempts.length > 0,
    cacheDecisionConstructed: true,
  });

  if (adapterOutcome.executionStatus === "blocked_by_gateway") {
    return runtimeBlocked(
      "gateway_policy_not_executable",
      blockedResult("task_policy_not_executable", "Evidence query-planning model adapter blocked on gateway policy."),
      completedSideEffects,
      cacheDecision,
    );
  }

  return {
    runtimeVersion: EVIDENCE_QUERY_PLANNING_RUNTIME_VERSION,
    visibility: "internal_only",
    status: "completed",
    result: adapterOutcome.result,
    blockedReason: null,
    promptProvenance: {
      promptContentHash: renderedPrompt.promptContentHash,
      renderedPromptHash: buildRenderedPromptHash(renderedPrompt.renderedPrompt),
      configSnapshotHash: request.configSnapshotHash,
      cacheDecisionReason: cacheDecision.reason,
    },
    cacheDecision,
    adapterOutcome,
    sideEffects: completedSideEffects,
  };
}
