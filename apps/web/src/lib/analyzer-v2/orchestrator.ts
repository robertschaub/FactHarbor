import {
  buildClaimUnderstandingStageHandoff,
  claimPreparationEnvelopeDiagnosticsFromHandoff,
} from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import { buildEvidenceLifecycleIntake } from "@/lib/analyzer-v2/evidence-lifecycle/intake";
import { buildEvidenceQueryPlanningPreexecutionObservation } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation";
import { buildEvidenceQueryPlanningInspection } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection";
import { runEvidenceQueryPlanningRuntime } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime";
import { buildQueryPlanSourceAcquisitionHandoff } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import { buildSourceAcquisitionIntakeBoundaryDecision } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary";
import { buildSourceAcquisitionRequest } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request";
import { runClaimUnderstandingRuntimeStage } from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import { buildDamagedClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import {
  buildClaimBoundaryV2RunContext,
  type BuildClaimBoundaryV2RunContextOptions,
  QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID,
} from "@/lib/analyzer-v2/run-context";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import type { ClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import { buildClaimUnderstandingRuntimeActivation } from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-activation";
import { createClaimUnderstandingRuntimeInMemoryArtifactSink } from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";
import { recordEvidenceLifecycleIntakeRuntimeArtifact } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink";
import {
  recordEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink";
import { buildEvidenceQueryPlanningProviderFactory } from "@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory";
import {
  buildEvidenceQueryPlanningProviderRuntimeConfigSnapshot,
  EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_SOURCE_PACKAGE,
} from "@/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract";
import {
  recordEvidenceQueryPlanningRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink";
import {
  recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-intake-artifact-sink";

export type RunClaimBoundaryPipelineV2Options = BuildClaimBoundaryV2RunContextOptions;

function queryPlanningActivationIsOpen(context: ReturnType<typeof buildClaimBoundaryV2RunContext>): boolean {
  const activation = context.queryPlanningRuntimeActivation;
  return activation.status === "enabled_hidden_direct_text"
    && activation.source === "v2_task_policy_snapshot"
    && activation.suppliedBy === "product_owned_activation_authority"
    && activation.freezeLocation === "pipeline_run_context"
    && activation.activationProfileId === QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID
    && activation.approvalPointer.sourcePackage === EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_SOURCE_PACKAGE
    && activation.activationSnapshotHash.trim().length > 0
    && activation.configProfileHash.trim().length > 0
    && activation.hiddenArtifactSink.kind === "v2_evidence_query_planning_runtime_artifact_ledger"
    && activation.hiddenArtifactSink.visibility === "internal_admin_only"
    && activation.hiddenArtifactSink.publicPointerExposure === "forbidden";
}

async function emit(input: ClaimBoundaryV2Ingress, message: string, progress: number): Promise<void> {
  await Promise.resolve(input.emitProgress?.({ message, progress }));
}

export async function runClaimBoundaryPipelineV2(
  input: ClaimBoundaryV2Ingress,
  options: RunClaimBoundaryPipelineV2Options = {},
): Promise<ClaimBoundaryV2Envelope> {
  await emit(input, "Analyzer V2 orchestrator initialized.", 8);

  const context = buildClaimBoundaryV2RunContext(input, options);
  const claimUnderstandingActivation = buildClaimUnderstandingRuntimeActivation(
    context,
    {
      artifactSink: createClaimUnderstandingRuntimeInMemoryArtifactSink(context.observabilityLedger.ledgerId),
    },
  );
  const claimUnderstandingState = await runClaimUnderstandingRuntimeStage(
    input,
    context,
    { activation: claimUnderstandingActivation },
  );
  const claimUnderstandingHandoff = buildClaimUnderstandingStageHandoff(context, claimUnderstandingState);
  const evidenceLifecycleIntake = buildEvidenceLifecycleIntake(context, claimUnderstandingHandoff);
  try {
    recordEvidenceLifecycleIntakeRuntimeArtifact({
      context,
      claimUnderstandingHandoff,
      evidenceLifecycleIntake,
    });
  } catch {
    // X7-J observability must never affect the public damaged/precutover envelope.
  }
  const queryPlanningPreexecutionObservation =
    buildEvidenceQueryPlanningPreexecutionObservation(evidenceLifecycleIntake);
  try {
    recordEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact({
      ledgerId: context.observabilityLedger.ledgerId,
      runId: context.runId,
      createdUtc: context.generatedUtc,
      observation: queryPlanningPreexecutionObservation,
    });
  } catch {
    // X7-O observability must never affect the public damaged/precutover envelope.
  }
  if (
    queryPlanningActivationIsOpen(context)
    && claimUnderstandingHandoff.status === "accepted"
    && queryPlanningPreexecutionObservation.status === "structural_prerequisites_observed_not_executed_precutover"
  ) {
    try {
      const runtimeConfigSnapshot = buildEvidenceQueryPlanningProviderRuntimeConfigSnapshot(context);
      if (runtimeConfigSnapshot) {
        const providerFactory = buildEvidenceQueryPlanningProviderFactory(runtimeConfigSnapshot);
        const selectedAtomicClaimIds = claimUnderstandingHandoff.claimContract.input.selectedAtomicClaimIds;
        const runtimeResult = await runEvidenceQueryPlanningRuntime({
          claimContract: claimUnderstandingHandoff.claimContract,
          selectedAtomicClaimIds,
          currentDate: context.currentDate,
          configSnapshotHash: providerFactory.configSnapshotHash,
          providerId: providerFactory.providerId,
          modelId: providerFactory.modelId,
          providerCall: providerFactory.providerCall,
        });
        const inspection = buildEvidenceQueryPlanningInspection({
          runtimeResult,
          selectedAtomicClaimIds,
          selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
        });
        const sourceAcquisitionHandoff = buildQueryPlanSourceAcquisitionHandoff({
          runtimeResult,
          selectedAtomicClaimIds,
          selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
        });
        recordEvidenceQueryPlanningRuntimeArtifact({
          context,
          runtimeResult,
          inspection,
          sourceAcquisitionHandoff,
        });
        const sourceAcquisitionStartDecision = buildSourceAcquisitionRequest(evidenceLifecycleIntake);
        const sourceAcquisitionIntakeBoundary = buildSourceAcquisitionIntakeBoundaryDecision({
          handoffDecision: sourceAcquisitionHandoff,
          sourceAcquisitionStartDecision,
        });
        recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact({
          context,
          intakeBoundary: sourceAcquisitionIntakeBoundary,
        });
      }
    } catch {
      // X7-S hidden runtime execution must never affect the public damaged/precutover envelope.
    }
  }
  const envelope = buildDamagedClaimBoundaryV2Envelope(
    context,
    claimPreparationEnvelopeDiagnosticsFromHandoff(claimUnderstandingHandoff),
  );

  await emit(input, "Analyzer V2 damaged structural envelope generated.", 90);

  return envelope;
}
