import { isShellOnlyPlaceholderClaimId } from "@/lib/analyzer-v2/claim-understanding/types";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import type { ClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";

export type ClaimUnderstandingDispatchFrameInputSource =
  | "direct_input"
  | "acs_prepared_snapshot";

export type ClaimUnderstandingDispatchFrameBlockedReason =
  | "direct_url_requires_resolved_body"
  | "acs_snapshot_hash_missing"
  | "input_grounding_seed_hash_missing"
  | "resolved_input_text_invalid"
  | "selected_atomic_claim_ids_invalid";

export type ClaimUnderstandingDispatchFrame = {
  analysisInput: string;
  resolvedInputText: string;
  detectedLanguage: string;
  selectedAtomicClaimIds: string[];
  currentDate: string;
  inputSource: ClaimUnderstandingDispatchFrameInputSource;
};

export type ClaimUnderstandingDispatchFrameSideEffects = {
  promptLoaded: false;
  promptRendered: false;
  adapterImported: false;
  adapterCalled: false;
  modelCalled: false;
  inputIdentityHashConstructed: false;
  cacheDecisionConstructed: false;
  cacheRead: false;
  cacheWrite: false;
  providerCallbackCreated: false;
  providerSdkLoaded: false;
};

export type ClaimUnderstandingDispatchFrameResult =
  | {
    status: "ready";
    frame: ClaimUnderstandingDispatchFrame;
    blockedReason: null;
    sideEffects: ClaimUnderstandingDispatchFrameSideEffects;
  }
  | {
    status: "blocked";
    frame: null;
    blockedReason: ClaimUnderstandingDispatchFrameBlockedReason;
    sideEffects: ClaimUnderstandingDispatchFrameSideEffects;
  };

function noDispatchFrameSideEffects(): ClaimUnderstandingDispatchFrameSideEffects {
  return {
    promptLoaded: false,
    promptRendered: false,
    adapterImported: false,
    adapterCalled: false,
    modelCalled: false,
    inputIdentityHashConstructed: false,
    cacheDecisionConstructed: false,
    cacheRead: false,
    cacheWrite: false,
    providerCallbackCreated: false,
    providerSdkLoaded: false,
  };
}

function blocked(
  blockedReason: ClaimUnderstandingDispatchFrameBlockedReason,
): ClaimUnderstandingDispatchFrameResult {
  return {
    status: "blocked",
    frame: null,
    blockedReason,
    sideEffects: noDispatchFrameSideEffects(),
  };
}

function ready(frame: ClaimUnderstandingDispatchFrame): ClaimUnderstandingDispatchFrameResult {
  return {
    status: "ready",
    frame,
    blockedReason: null,
    sideEffects: noDispatchFrameSideEffects(),
  };
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readAcsResolvedInputText(input: ClaimBoundaryV2Ingress): string | null {
  const snapshot = input.preparedSeed?.acsSnapshot;
  if (!isRecord(snapshot)) {
    return null;
  }

  return isNonBlankString(snapshot.resolvedInputText) ? snapshot.resolvedInputText : null;
}

function hasInvalidSelectedClaimIds(selectedAtomicClaimIds: string[]): boolean {
  return selectedAtomicClaimIds.some(
    (claimId) => claimId.trim().length === 0 || isShellOnlyPlaceholderClaimId(claimId.trim()),
  );
}

function requireCanonicalHash(value: unknown): string | null {
  return isNonBlankString(value) ? value : null;
}

function buildDirectTextFrame(
  input: ClaimBoundaryV2Ingress,
  context: ClaimBoundaryV2RunContext,
): ClaimUnderstandingDispatchFrameResult {
  if (hasInvalidSelectedClaimIds(context.selectedAtomicClaimIds)) {
    return blocked("selected_atomic_claim_ids_invalid");
  }

  if (!isNonBlankString(input.submitted.value)) {
    return blocked("resolved_input_text_invalid");
  }

  return ready({
    analysisInput: input.submitted.value,
    resolvedInputText: input.submitted.value,
    detectedLanguage: context.detectedLanguage,
    selectedAtomicClaimIds: [...context.selectedAtomicClaimIds],
    currentDate: context.currentDate,
    inputSource: "direct_input",
  });
}

function buildAcsFrame(
  input: ClaimBoundaryV2Ingress,
  context: ClaimBoundaryV2RunContext,
): ClaimUnderstandingDispatchFrameResult {
  const acsSnapshotHash = requireCanonicalHash(input.preparedSeed?.acsSnapshotHash);
  if (!acsSnapshotHash) {
    return blocked("acs_snapshot_hash_missing");
  }

  const inputGroundingSeedHash = requireCanonicalHash(input.preparedSeed?.inputGroundingSeedHash);
  if (!inputGroundingSeedHash) {
    return blocked("input_grounding_seed_hash_missing");
  }

  const acsResolvedInputText = readAcsResolvedInputText(input);
  if (!acsResolvedInputText || context.resolvedInputText !== acsResolvedInputText) {
    return blocked("resolved_input_text_invalid");
  }

  if (
    context.selectedAtomicClaimIds.length === 0
    || hasInvalidSelectedClaimIds(context.selectedAtomicClaimIds)
  ) {
    return blocked("selected_atomic_claim_ids_invalid");
  }

  return ready({
    analysisInput: input.submitted.value,
    resolvedInputText: context.resolvedInputText,
    detectedLanguage: context.detectedLanguage,
    selectedAtomicClaimIds: [...context.selectedAtomicClaimIds],
    currentDate: context.currentDate,
    inputSource: "acs_prepared_snapshot",
  });
}

export function buildClaimUnderstandingDispatchFrame(
  input: ClaimBoundaryV2Ingress,
  context: ClaimBoundaryV2RunContext,
): ClaimUnderstandingDispatchFrameResult {
  if (input.preparedSeed) {
    return buildAcsFrame(input, context);
  }

  if (input.submitted.kind === "url") {
    return blocked("direct_url_requires_resolved_body");
  }

  return buildDirectTextFrame(input, context);
}
