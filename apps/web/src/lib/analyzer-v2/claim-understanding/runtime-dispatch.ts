import type {
  ClaimUnderstandingDispatchReadinessResult,
  ClaimUnderstandingDispatchReadinessSideEffects,
} from "@/lib/analyzer-v2/claim-understanding/dispatch-readiness-contract";

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
