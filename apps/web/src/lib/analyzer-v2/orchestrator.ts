import {
  buildClaimUnderstandingStageHandoff,
  claimPreparationEnvelopeDiagnosticsFromHandoff,
} from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import { buildEvidenceLifecycleIntake } from "@/lib/analyzer-v2/evidence-lifecycle/intake";
import { buildEvidenceQueryPlanningPreexecutionObservation } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation";
import { runClaimUnderstandingRuntimeStage } from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import { buildDamagedClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import {
  buildClaimBoundaryV2RunContext,
  type BuildClaimBoundaryV2RunContextOptions,
} from "@/lib/analyzer-v2/run-context";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import type { ClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import { buildClaimUnderstandingRuntimeActivation } from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-activation";
import { createClaimUnderstandingRuntimeInMemoryArtifactSink } from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";
import { recordEvidenceLifecycleIntakeRuntimeArtifact } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink";
import {
  recordEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink";

export type RunClaimBoundaryPipelineV2Options = BuildClaimBoundaryV2RunContextOptions;

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
  const envelope = buildDamagedClaimBoundaryV2Envelope(
    context,
    claimPreparationEnvelopeDiagnosticsFromHandoff(claimUnderstandingHandoff),
  );

  await emit(input, "Analyzer V2 damaged structural envelope generated.", 90);

  return envelope;
}
