import type { ClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import type { HiddenV2IntegrationHarnessResult } from "@/lib/analyzer-v2/hidden-integration-harness";
import {
  executeSourceAcquisitionCandidateRuntime,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime";
import type {
  SourceAcquisitionCandidateRunRequest,
  SourceAcquisitionCandidateRuntimeDecision,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope";
import {
  markHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness-provenance";

export const ANALYZER_V2_HIDDEN_DIRECT_TEXT_CANDIDATE_ACQUISITION_HARNESS_VERSION =
  "v2.hidden-direct-text-candidate-acquisition-harness.x6";

export type HiddenDirectTextCandidateAcquisitionHarnessBlockedReason =
  | "x5_not_completed"
  | "source_acquisition_not_ready"
  | "candidate_allowlist_not_test_injected"
  | "candidate_runtime_blocked"
  | "candidate_runtime_damaged";

export type HiddenDirectTextCandidateAcquisitionHarnessRequest = {
  readonly x5Integration: HiddenV2IntegrationHarnessResult;
  readonly candidateAcquisition: Pick<
    SourceAcquisitionCandidateRunRequest,
    "candidateRunId" | "authority" | "providerAllowlist" | "budget" | "providerBoundary"
  >;
};

type HiddenDirectTextCandidateAcquisitionHarnessBase = {
  readonly harnessVersion: typeof ANALYZER_V2_HIDDEN_DIRECT_TEXT_CANDIDATE_ACQUISITION_HARNESS_VERSION;
  readonly visibility: "internal_only";
  readonly publicEnvelope: ClaimBoundaryV2Envelope;
  readonly x5Integration: HiddenV2IntegrationHarnessResult;
  readonly candidateAcquisitionRuntime: SourceAcquisitionCandidateRuntimeDecision | null;
};

export type HiddenDirectTextCandidateAcquisitionHarnessResult =
  | (HiddenDirectTextCandidateAcquisitionHarnessBase & {
      readonly status: "completed";
      readonly blockedReason: null;
      readonly candidateAcquisitionRuntime: Extract<SourceAcquisitionCandidateRuntimeDecision, {
        readonly status: "completed_structural";
      }>;
    })
  | (HiddenDirectTextCandidateAcquisitionHarnessBase & {
      readonly status: "blocked";
      readonly blockedReason: HiddenDirectTextCandidateAcquisitionHarnessBlockedReason;
    });

function blocked(
  request: HiddenDirectTextCandidateAcquisitionHarnessRequest,
  blockedReason: HiddenDirectTextCandidateAcquisitionHarnessBlockedReason,
  candidateAcquisitionRuntime: SourceAcquisitionCandidateRuntimeDecision | null = null,
): HiddenDirectTextCandidateAcquisitionHarnessResult {
  return markHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult({
    harnessVersion: ANALYZER_V2_HIDDEN_DIRECT_TEXT_CANDIDATE_ACQUISITION_HARNESS_VERSION,
    visibility: "internal_only",
    status: "blocked",
    blockedReason,
    publicEnvelope: request.x5Integration.publicEnvelope,
    x5Integration: request.x5Integration,
    candidateAcquisitionRuntime,
  });
}

function allowlistIsTestInjectedOnly(
  request: HiddenDirectTextCandidateAcquisitionHarnessRequest,
): boolean {
  const allowedProviders = request.candidateAcquisition.providerAllowlist.allowedProviders;
  return Array.isArray(allowedProviders)
    && allowedProviders.length > 0
    && allowedProviders.every((provider) =>
      provider.endpointKind === "test_injected_candidate_boundary"
    );
}

function sourceAcquisitionIsReady(
  x5Integration: HiddenV2IntegrationHarnessResult,
): x5Integration is Extract<HiddenV2IntegrationHarnessResult, { readonly status: "completed" }> {
  return x5Integration.status === "completed"
    && x5Integration.queryPlanSourceAcquisitionHandoff?.status === "ready_not_executable"
    && x5Integration.sourceAcquisitionStart?.status === "source_acquisition_ready_not_executable";
}

export async function runHiddenDirectTextCandidateAcquisitionHarness(
  request: HiddenDirectTextCandidateAcquisitionHarnessRequest,
): Promise<HiddenDirectTextCandidateAcquisitionHarnessResult> {
  if (request.x5Integration.status !== "completed") {
    return blocked(request, "x5_not_completed");
  }

  if (!sourceAcquisitionIsReady(request.x5Integration)) {
    return blocked(request, "source_acquisition_not_ready");
  }

  if (!allowlistIsTestInjectedOnly(request)) {
    return blocked(request, "candidate_allowlist_not_test_injected");
  }

  const candidateAcquisitionRuntime = await executeSourceAcquisitionCandidateRuntime({
    candidateRunId: request.candidateAcquisition.candidateRunId,
    visibility: "internal_only",
    authority: request.candidateAcquisition.authority,
    handoffDecision: request.x5Integration.queryPlanSourceAcquisitionHandoff,
    sourceAcquisitionStartDecision: request.x5Integration.sourceAcquisitionStart,
    providerAllowlist: request.candidateAcquisition.providerAllowlist,
    budget: request.candidateAcquisition.budget,
    providerBoundary: request.candidateAcquisition.providerBoundary,
  });

  if (candidateAcquisitionRuntime.status === "blocked") {
    return blocked(request, "candidate_runtime_blocked", candidateAcquisitionRuntime);
  }

  if (candidateAcquisitionRuntime.status === "damaged_structural") {
    return blocked(request, "candidate_runtime_damaged", candidateAcquisitionRuntime);
  }

  return markHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult({
    harnessVersion: ANALYZER_V2_HIDDEN_DIRECT_TEXT_CANDIDATE_ACQUISITION_HARNESS_VERSION,
    visibility: "internal_only",
    status: "completed",
    blockedReason: null,
    publicEnvelope: request.x5Integration.publicEnvelope,
    x5Integration: request.x5Integration,
    candidateAcquisitionRuntime,
  });
}
