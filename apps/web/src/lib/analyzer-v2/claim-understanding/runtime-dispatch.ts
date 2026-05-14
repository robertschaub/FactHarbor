import { createHash } from "node:crypto";
import {
  loadAndRenderClaimUnderstandingGate1Prompt,
  type ClaimUnderstandingPromptVariable,
} from "@/lib/analyzer-v2/claim-understanding/prompt-loader";
import type {
  ClaimUnderstandingDispatchReadinessResult,
  ClaimUnderstandingDispatchReadinessSideEffects,
} from "@/lib/analyzer-v2/claim-understanding/dispatch-readiness-contract";
import {
  executeClaimUnderstandingModelAdapter,
  type ClaimUnderstandingModelAdapterOutcome,
  type ClaimUnderstandingProviderCall,
} from "@/lib/analyzer-v2/claim-understanding/model-adapter";
import { buildAnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecision } from "@/lib/analyzer-v2/gateway/cache-governance";
import { getAnalyzerV2GatewayTask } from "@/lib/analyzer-v2/gateway/policy";
import type {
  AnalyzerV2CacheDecision,
  AnalyzerV2GatewayTask,
  AnalyzerV2PolicyApproval,
} from "@/lib/analyzer-v2/gateway/types";

export const CLAIM_UNDERSTANDING_RUNTIME_DISPATCH_OWNER_CONTRACT_VERSION =
  "v2.claim-understanding.runtime-dispatch-owner.0";

export type ClaimUnderstandingRuntimeDispatchOwnerContract = {
  ownerId: "claim_understanding_runtime_dispatch_owner";
  ownerModule: "claim_understanding_runtime_dispatch";
  runtimeMode: "contract_only";
  readiness: ClaimUnderstandingDispatchReadinessResult;
  productReachability: "not_wired" | "wired_to_product";
  promptRenderingState: "not_rendered" | "rendered";
  cachePosture: {
    cacheDecisionState: "not_constructed" | "constructed";
    canRead: boolean;
    canWrite: boolean;
    cacheIoImported: boolean;
  };
  providerBoundary: {
    providerCallbackState: "not_created" | "created";
    providerSdkState: "not_imported" | "imported";
  };
  publicSurfaceState: "internal_only" | "public_exposed";
  directUrlDispatchState: "blocked_by_dispatch_frame" | "allowed";
};

export type ClaimUnderstandingRuntimeDispatchOwnerSideEffects =
  ClaimUnderstandingDispatchReadinessSideEffects;

export type ClaimUnderstandingRuntimeDispatchOwnerBlockedReason =
  | "readiness_contract_not_satisfied"
  | "runtime_owner_identity_invalid"
  | "runtime_mode_not_contract_only"
  | "product_reachability_enabled"
  | "prompt_rendering_not_deferred"
  | "cache_posture_not_no_io"
  | "provider_boundary_not_deferred"
  | "public_surface_exposed"
  | "direct_url_dispatch_not_blocked";

export type ClaimUnderstandingRuntimeDispatchOwnerResult =
  | {
    status: "owner_contract_satisfied";
    contractVersion: typeof CLAIM_UNDERSTANDING_RUNTIME_DISPATCH_OWNER_CONTRACT_VERSION;
    ownerContract: ClaimUnderstandingRuntimeDispatchOwnerContract;
    blockedReasons: [];
    sideEffects: ClaimUnderstandingRuntimeDispatchOwnerSideEffects;
  }
  | {
    status: "blocked";
    contractVersion: typeof CLAIM_UNDERSTANDING_RUNTIME_DISPATCH_OWNER_CONTRACT_VERSION;
    ownerContract: ClaimUnderstandingRuntimeDispatchOwnerContract;
    blockedReasons: ClaimUnderstandingRuntimeDispatchOwnerBlockedReason[];
    sideEffects: ClaimUnderstandingRuntimeDispatchOwnerSideEffects;
  };

export type ClaimUnderstandingRuntimeDispatchPostRenderProvenance = {
  promptContentHash: string;
  renderedPromptHash: string;
  configSnapshotHash: string;
  cacheDecisionReason: AnalyzerV2CacheDecision["reason"];
};

export type ClaimUnderstandingRuntimeDispatchExecutionSideEffects = {
  promptLoaded: boolean;
  promptRendered: boolean;
  adapterImported: true;
  adapterCalled: boolean;
  modelCalled: boolean;
  promptHashConstructed: boolean;
  configHashConstructed: false;
  inputIdentityHashConstructed: false;
  cacheDecisionConstructed: boolean;
  cacheRead: false;
  cacheWrite: false;
  providerCallbackCreated: false;
  providerSdkLoaded: false;
  approvalMutated: false;
  productDispatchWired: false;
};

export type ClaimUnderstandingRuntimeDispatchBlockedReason =
  | "readiness_contract_not_satisfied"
  | "direct_text_readiness_required"
  | "prompt_render_failed"
  | "cache_contract_not_no_store";

export type ClaimUnderstandingRuntimeDispatchRequest = {
  readiness: ClaimUnderstandingDispatchReadinessResult;
  providerCall: ClaimUnderstandingProviderCall;
};

export type ClaimUnderstandingRuntimeDispatchResult =
  | {
    status: "completed";
    readiness: Extract<ClaimUnderstandingDispatchReadinessResult, { status: "contract_satisfied" }>;
    promptProvenance: ClaimUnderstandingRuntimeDispatchPostRenderProvenance;
    cacheDecision: AnalyzerV2CacheDecision;
    adapterOutcome: ClaimUnderstandingModelAdapterOutcome;
    blockedReason: null;
    failureMessage: null;
    sideEffects: ClaimUnderstandingRuntimeDispatchExecutionSideEffects;
  }
  | {
    status: "blocked";
    readiness: ClaimUnderstandingDispatchReadinessResult;
    promptProvenance: null;
    cacheDecision: AnalyzerV2CacheDecision | null;
    adapterOutcome: null;
    blockedReason: ClaimUnderstandingRuntimeDispatchBlockedReason;
    failureMessage: string | null;
    sideEffects: ClaimUnderstandingRuntimeDispatchExecutionSideEffects;
  };

function noRuntimeDispatchOwnerSideEffects(): ClaimUnderstandingRuntimeDispatchOwnerSideEffects {
  return {
    promptLoaded: false,
    promptRendered: false,
    adapterImported: false,
    adapterCalled: false,
    modelCalled: false,
    promptHashConstructed: false,
    configHashConstructed: false,
    inputIdentityHashConstructed: false,
    cacheDecisionConstructed: false,
    cacheRead: false,
    cacheWrite: false,
    providerCallbackCreated: false,
    providerSdkLoaded: false,
    approvalMutated: false,
    productDispatchWired: false,
  };
}

function noRuntimeDispatchExecutionSideEffects(
  overrides: Partial<ClaimUnderstandingRuntimeDispatchExecutionSideEffects> = {},
): ClaimUnderstandingRuntimeDispatchExecutionSideEffects {
  return {
    promptLoaded: false,
    promptRendered: false,
    adapterImported: true,
    adapterCalled: false,
    modelCalled: false,
    promptHashConstructed: false,
    configHashConstructed: false,
    inputIdentityHashConstructed: false,
    cacheDecisionConstructed: false,
    cacheRead: false,
    cacheWrite: false,
    providerCallbackCreated: false,
    providerSdkLoaded: false,
    approvalMutated: false,
    productDispatchWired: false,
    ...overrides,
  };
}

function runtimeDispatchBlocked(
  readiness: ClaimUnderstandingDispatchReadinessResult,
  blockedReason: ClaimUnderstandingRuntimeDispatchBlockedReason,
  failureMessage: string | null,
  sideEffects: ClaimUnderstandingRuntimeDispatchExecutionSideEffects,
  cacheDecision: AnalyzerV2CacheDecision | null = null,
): ClaimUnderstandingRuntimeDispatchResult {
  return {
    status: "blocked",
    readiness,
    promptProvenance: null,
    cacheDecision,
    adapterOutcome: null,
    blockedReason,
    failureMessage,
    sideEffects,
  };
}

function addReason(
  reasons: ClaimUnderstandingRuntimeDispatchOwnerBlockedReason[],
  reason: ClaimUnderstandingRuntimeDispatchOwnerBlockedReason,
): void {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

function collectOwnerReasons(
  ownerContract: ClaimUnderstandingRuntimeDispatchOwnerContract,
): ClaimUnderstandingRuntimeDispatchOwnerBlockedReason[] {
  const reasons: ClaimUnderstandingRuntimeDispatchOwnerBlockedReason[] = [];

  if (ownerContract.readiness.status !== "contract_satisfied") {
    addReason(reasons, "readiness_contract_not_satisfied");
  }

  if (
    ownerContract.ownerId !== "claim_understanding_runtime_dispatch_owner"
    || ownerContract.ownerModule !== "claim_understanding_runtime_dispatch"
  ) {
    addReason(reasons, "runtime_owner_identity_invalid");
  }

  if (ownerContract.runtimeMode !== "contract_only") {
    addReason(reasons, "runtime_mode_not_contract_only");
  }

  if (ownerContract.productReachability !== "not_wired") {
    addReason(reasons, "product_reachability_enabled");
  }

  if (ownerContract.promptRenderingState !== "not_rendered") {
    addReason(reasons, "prompt_rendering_not_deferred");
  }

  if (
    ownerContract.cachePosture.cacheDecisionState !== "not_constructed"
    || ownerContract.cachePosture.canRead
    || ownerContract.cachePosture.canWrite
    || ownerContract.cachePosture.cacheIoImported
  ) {
    addReason(reasons, "cache_posture_not_no_io");
  }

  if (
    ownerContract.providerBoundary.providerCallbackState !== "not_created"
    || ownerContract.providerBoundary.providerSdkState !== "not_imported"
  ) {
    addReason(reasons, "provider_boundary_not_deferred");
  }

  if (ownerContract.publicSurfaceState !== "internal_only") {
    addReason(reasons, "public_surface_exposed");
  }

  if (ownerContract.directUrlDispatchState !== "blocked_by_dispatch_frame") {
    addReason(reasons, "direct_url_dispatch_not_blocked");
  }

  return reasons;
}

function isDirectTextReadiness(
  readiness: ClaimUnderstandingDispatchReadinessResult,
): readiness is Extract<ClaimUnderstandingDispatchReadinessResult, { status: "contract_satisfied" }> {
  return readiness.status === "contract_satisfied"
    && readiness.frame.inputSource === "direct_input"
    && readiness.provenancePacket.inputSource === "direct_input"
    && readiness.provenancePacket.submittedKind === "text"
    && readiness.provenancePacket.acsSnapshotHash === null;
}

function buildClaimUnderstandingRuntimeDispatchPromptVariables(
  readiness: Extract<ClaimUnderstandingDispatchReadinessResult, { status: "contract_satisfied" }>,
): Record<ClaimUnderstandingPromptVariable, string> {
  const frame = readiness.frame;
  const inputGroundingSeed = {
    source: "direct_input",
    inputType: "text",
    inputValue: frame.analysisInput,
    resolvedInputText: frame.resolvedInputText,
    detectedLanguage: frame.detectedLanguage,
    currentDate: frame.currentDate,
    acsSnapshotHash: null,
    inputGroundingSeedHash: readiness.provenancePacket.inputGroundingSeedHash,
  };

  return {
    currentDate: frame.currentDate,
    analysisInput: frame.analysisInput,
    acsSnapshotJson: "null",
    inputGroundingSeedJson: JSON.stringify(inputGroundingSeed),
  };
}

function buildRenderedPromptHash(renderedPrompt: string): string {
  return createHash("sha256").update(renderedPrompt, "utf8").digest("hex");
}

function buildClaimUnderstandingRuntimeDispatchCacheDecision(
  readiness: Extract<ClaimUnderstandingDispatchReadinessResult, { status: "contract_satisfied" }>,
  promptContentHash: string,
): AnalyzerV2CacheDecision {
  const provenance = readiness.provenancePacket;
  return buildAnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecision({
    promptProfile: provenance.promptProfile,
    promptSectionId: provenance.promptSectionId,
    promptContentHash,
    modelTask: provenance.modelTask,
    provider: provenance.provider,
    modelName: provenance.modelName,
    temperature: provenance.temperature,
    outputSchemaVersion: provenance.outputSchemaVersion,
    configSnapshotHash: provenance.configSnapshotHash,
    resultSchemaVersion: provenance.resultSchemaVersion,
    inputIdentityHash: provenance.inputIdentityHash,
    currentDateBucket: provenance.currentDateBucket,
    claimUnderstandingInputSource: "direct_input",
    inputGroundingSeedHash: provenance.inputGroundingSeedHash,
  });
}

function buildClaimUnderstandingRuntimeDispatchExecutableGatewayTask(
  readiness: Extract<ClaimUnderstandingDispatchReadinessResult, { status: "contract_satisfied" }>,
): AnalyzerV2GatewayTask {
  const base = getAnalyzerV2GatewayTask("claim_understanding_gate1");
  const approval: AnalyzerV2PolicyApproval = {
    status: "approved",
    reviewer: readiness.approvalSnapshot.approvedBy,
    approvedAt: readiness.approvalSnapshot.approvedAt,
  };

  if (!base.promptPolicy || !base.modelPolicy || !base.cachePolicy) {
    throw new Error("Analyzer V2 runtime dispatch requires prompt, model, and cache policy metadata.");
  }

  return {
    ...base,
    status: "executable",
    promptPolicy: {
      ...base.promptPolicy,
      approval,
    },
    modelPolicy: {
      ...base.modelPolicy,
      approval,
    },
    cachePolicy: {
      ...base.cachePolicy,
      approval,
    },
  };
}

export function validateClaimUnderstandingRuntimeDispatchOwnerContract(
  ownerContract: ClaimUnderstandingRuntimeDispatchOwnerContract,
): ClaimUnderstandingRuntimeDispatchOwnerResult {
  const blockedReasons = collectOwnerReasons(ownerContract);

  if (blockedReasons.length > 0) {
    return {
      status: "blocked",
      contractVersion: CLAIM_UNDERSTANDING_RUNTIME_DISPATCH_OWNER_CONTRACT_VERSION,
      ownerContract,
      blockedReasons,
      sideEffects: noRuntimeDispatchOwnerSideEffects(),
    };
  }

  return {
    status: "owner_contract_satisfied",
    contractVersion: CLAIM_UNDERSTANDING_RUNTIME_DISPATCH_OWNER_CONTRACT_VERSION,
    ownerContract,
    blockedReasons: [],
    sideEffects: noRuntimeDispatchOwnerSideEffects(),
  };
}

export async function executeClaimUnderstandingRuntimeDispatch(
  request: ClaimUnderstandingRuntimeDispatchRequest,
): Promise<ClaimUnderstandingRuntimeDispatchResult> {
  if (request.readiness.status !== "contract_satisfied") {
    return runtimeDispatchBlocked(
      request.readiness,
      "readiness_contract_not_satisfied",
      null,
      noRuntimeDispatchExecutionSideEffects(),
    );
  }

  if (!isDirectTextReadiness(request.readiness)) {
    return runtimeDispatchBlocked(
      request.readiness,
      "direct_text_readiness_required",
      null,
      noRuntimeDispatchExecutionSideEffects(),
    );
  }

  let renderedPrompt: Awaited<ReturnType<typeof loadAndRenderClaimUnderstandingGate1Prompt>>;
  try {
    renderedPrompt = await loadAndRenderClaimUnderstandingGate1Prompt({
      profile: request.readiness.provenancePacket.promptProfile,
      sectionId: request.readiness.provenancePacket.promptSectionId,
      variables: buildClaimUnderstandingRuntimeDispatchPromptVariables(request.readiness),
    });
  } catch (error) {
    return runtimeDispatchBlocked(
      request.readiness,
      "prompt_render_failed",
      error instanceof Error ? error.message : "prompt render failed",
      noRuntimeDispatchExecutionSideEffects(),
    );
  }

  const cacheDecision = buildClaimUnderstandingRuntimeDispatchCacheDecision(
    request.readiness,
    renderedPrompt.promptContentHash,
  );
  const postRenderSideEffects = noRuntimeDispatchExecutionSideEffects({
    promptLoaded: true,
    promptRendered: true,
    promptHashConstructed: true,
    cacheDecisionConstructed: true,
  });

  if (
    cacheDecision.reason !== "no_store_runtime_dispatch_safety"
    || cacheDecision.canRead
    || cacheDecision.canWrite
  ) {
    return runtimeDispatchBlocked(
      request.readiness,
      "cache_contract_not_no_store",
      null,
      postRenderSideEffects,
      cacheDecision,
    );
  }

  const adapterOutcome = await executeClaimUnderstandingModelAdapter({
    gatewayTask: buildClaimUnderstandingRuntimeDispatchExecutableGatewayTask(request.readiness),
    renderedPrompt,
    inputFrame: {
      analysisInput: request.readiness.frame.analysisInput,
      resolvedInputText: request.readiness.frame.resolvedInputText,
      detectedLanguage: request.readiness.frame.detectedLanguage,
    },
    configSnapshotHash: request.readiness.provenancePacket.configSnapshotHash,
    cacheDecision,
    providerCall: request.providerCall,
  });

  return {
    status: "completed",
    readiness: request.readiness,
    promptProvenance: {
      promptContentHash: renderedPrompt.promptContentHash,
      renderedPromptHash: buildRenderedPromptHash(renderedPrompt.renderedPrompt),
      configSnapshotHash: request.readiness.provenancePacket.configSnapshotHash,
      cacheDecisionReason: cacheDecision.reason,
    },
    cacheDecision,
    adapterOutcome,
    blockedReason: null,
    failureMessage: null,
    sideEffects: noRuntimeDispatchExecutionSideEffects({
      promptLoaded: true,
      promptRendered: true,
      promptHashConstructed: true,
      cacheDecisionConstructed: true,
      adapterCalled: true,
      modelCalled: adapterOutcome.attempts.length > 0,
    }),
  };
}
