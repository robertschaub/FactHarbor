import type { ClaimUnderstandingStageHandoff } from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import { claimPreparationEnvelopeDiagnosticsFromHandoff } from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import { buildEvidenceLifecycleIntake } from "@/lib/analyzer-v2/evidence-lifecycle/intake";
import {
  buildEvidenceQueryPlanningInspection,
  type QueryPlanInspectionResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection";
import {
  runEvidenceQueryPlanningRuntime,
  type EvidenceQueryPlanningRuntimeResult,
  type RunEvidenceQueryPlanningRuntimeRequest,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime";
import { buildQueryPlanSourceAcquisitionHandoff } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import type { QueryPlanSourceAcquisitionHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import { buildSourceAcquisitionRequest } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request";
import type { SourceAcquisitionStartDecision } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types";
import type { EvidenceLifecycleStartDecision } from "@/lib/analyzer-v2/evidence-lifecycle/types";
import { buildDamagedClaimBoundaryV2Envelope, type ClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";

export const ANALYZER_V2_HIDDEN_INTEGRATION_HARNESS_VERSION =
  "v2.hidden-integration-harness.x5";

export type HiddenV2IntegrationHarnessBlockedReason =
  | "claim_understanding_not_accepted"
  | "evidence_lifecycle_intake_blocked"
  | "query_planning_runtime_blocked"
  | "query_planning_result_not_accepted"
  | "query_plan_inspection_blocked"
  | "source_acquisition_handoff_blocked"
  | "source_acquisition_request_blocked";

export type HiddenV2IntegrationHarnessRequest = {
  context: PipelineRunContext;
  claimUnderstandingHandoff: ClaimUnderstandingStageHandoff;
  queryPlanning: Pick<
    RunEvidenceQueryPlanningRuntimeRequest,
    "configSnapshotHash" | "providerId" | "modelId" | "providerCall"
  >;
};

type HiddenV2IntegrationHarnessBase = {
  harnessVersion: typeof ANALYZER_V2_HIDDEN_INTEGRATION_HARNESS_VERSION;
  visibility: "internal_only";
  publicEnvelope: ClaimBoundaryV2Envelope;
  claimUnderstandingHandoff: ClaimUnderstandingStageHandoff;
  evidenceLifecycleStart: EvidenceLifecycleStartDecision;
  queryPlanningRuntime: EvidenceQueryPlanningRuntimeResult | null;
  queryPlanInspection: QueryPlanInspectionResult | null;
  queryPlanSourceAcquisitionHandoff: QueryPlanSourceAcquisitionHandoffDecision | null;
  sourceAcquisitionStart: SourceAcquisitionStartDecision | null;
};

export type HiddenV2IntegrationHarnessResult =
  | (HiddenV2IntegrationHarnessBase & {
    status: "completed";
    blockedReason: null;
    sourceAcquisitionStart: Extract<SourceAcquisitionStartDecision, {
      status: "source_acquisition_ready_not_executable";
    }>;
    queryPlanSourceAcquisitionHandoff: Extract<QueryPlanSourceAcquisitionHandoffDecision, {
      status: "ready_not_executable";
    }>;
  })
  | (HiddenV2IntegrationHarnessBase & {
    status: "blocked";
    blockedReason: HiddenV2IntegrationHarnessBlockedReason;
  });

function buildPublicEnvelope(
  context: PipelineRunContext,
  handoff: ClaimUnderstandingStageHandoff,
): ClaimBoundaryV2Envelope {
  return buildDamagedClaimBoundaryV2Envelope(
    context,
    claimPreparationEnvelopeDiagnosticsFromHandoff(handoff),
  );
}

function blocked(
  request: HiddenV2IntegrationHarnessRequest,
  evidenceLifecycleStart: EvidenceLifecycleStartDecision,
  blockedReason: HiddenV2IntegrationHarnessBlockedReason,
  partial: Partial<Pick<
    HiddenV2IntegrationHarnessBase,
    | "queryPlanningRuntime"
    | "queryPlanInspection"
    | "queryPlanSourceAcquisitionHandoff"
    | "sourceAcquisitionStart"
  >> = {},
): HiddenV2IntegrationHarnessResult {
  return {
    harnessVersion: ANALYZER_V2_HIDDEN_INTEGRATION_HARNESS_VERSION,
    visibility: "internal_only",
    status: "blocked",
    blockedReason,
    publicEnvelope: buildPublicEnvelope(request.context, request.claimUnderstandingHandoff),
    claimUnderstandingHandoff: request.claimUnderstandingHandoff,
    evidenceLifecycleStart,
    queryPlanningRuntime: partial.queryPlanningRuntime ?? null,
    queryPlanInspection: partial.queryPlanInspection ?? null,
    queryPlanSourceAcquisitionHandoff: partial.queryPlanSourceAcquisitionHandoff ?? null,
    sourceAcquisitionStart: partial.sourceAcquisitionStart ?? null,
  };
}

export async function runHiddenV2IntegrationHarness(
  request: HiddenV2IntegrationHarnessRequest,
): Promise<HiddenV2IntegrationHarnessResult> {
  const evidenceLifecycleStart = buildEvidenceLifecycleIntake(
    request.context,
    request.claimUnderstandingHandoff,
  );

  if (request.claimUnderstandingHandoff.status !== "accepted") {
    return blocked(request, evidenceLifecycleStart, "claim_understanding_not_accepted");
  }

  if (evidenceLifecycleStart.status !== "intake_ready") {
    return blocked(request, evidenceLifecycleStart, "evidence_lifecycle_intake_blocked");
  }

  const selectedAtomicClaimIds = [
    ...evidenceLifecycleStart.intake.claimContract.input.selectedAtomicClaimIds,
  ];
  const queryPlanningRuntime = await runEvidenceQueryPlanningRuntime({
    claimContract: evidenceLifecycleStart.intake.claimContract,
    selectedAtomicClaimIds,
    currentDate: evidenceLifecycleStart.intake.pipelineRunContext.currentDate,
    configSnapshotHash: request.queryPlanning.configSnapshotHash,
    providerId: request.queryPlanning.providerId,
    modelId: request.queryPlanning.modelId,
    providerCall: request.queryPlanning.providerCall,
  });
  const queryPlanInspection = buildEvidenceQueryPlanningInspection({
    runtimeResult: queryPlanningRuntime,
    selectedAtomicClaimIds,
    selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
  });
  const queryPlanSourceAcquisitionHandoff = buildQueryPlanSourceAcquisitionHandoff({
    runtimeResult: queryPlanningRuntime,
    selectedAtomicClaimIds,
    selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
  });

  if (queryPlanningRuntime.status !== "completed") {
    return blocked(request, evidenceLifecycleStart, "query_planning_runtime_blocked", {
      queryPlanningRuntime,
      queryPlanInspection,
      queryPlanSourceAcquisitionHandoff,
    });
  }

  if (queryPlanningRuntime.result.status !== "accepted") {
    return blocked(request, evidenceLifecycleStart, "query_planning_result_not_accepted", {
      queryPlanningRuntime,
      queryPlanInspection,
      queryPlanSourceAcquisitionHandoff,
    });
  }

  if (queryPlanInspection.status !== "inspected") {
    return blocked(request, evidenceLifecycleStart, "query_plan_inspection_blocked", {
      queryPlanningRuntime,
      queryPlanInspection,
      queryPlanSourceAcquisitionHandoff,
    });
  }

  if (queryPlanSourceAcquisitionHandoff.status !== "ready_not_executable") {
    return blocked(request, evidenceLifecycleStart, "source_acquisition_handoff_blocked", {
      queryPlanningRuntime,
      queryPlanInspection,
      queryPlanSourceAcquisitionHandoff,
    });
  }

  const sourceAcquisitionStart = buildSourceAcquisitionRequest(evidenceLifecycleStart);
  if (sourceAcquisitionStart.status !== "source_acquisition_ready_not_executable") {
    return blocked(request, evidenceLifecycleStart, "source_acquisition_request_blocked", {
      queryPlanningRuntime,
      queryPlanInspection,
      queryPlanSourceAcquisitionHandoff,
      sourceAcquisitionStart,
    });
  }

  return {
    harnessVersion: ANALYZER_V2_HIDDEN_INTEGRATION_HARNESS_VERSION,
    visibility: "internal_only",
    status: "completed",
    blockedReason: null,
    publicEnvelope: buildPublicEnvelope(request.context, request.claimUnderstandingHandoff),
    claimUnderstandingHandoff: request.claimUnderstandingHandoff,
    evidenceLifecycleStart,
    queryPlanningRuntime,
    queryPlanInspection,
    queryPlanSourceAcquisitionHandoff,
    sourceAcquisitionStart,
  };
}
