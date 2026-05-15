import {
  runClaimUnderstandingRuntimeStage,
  type ClaimUnderstandingRuntimeState,
} from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import {
  buildDamagedClaimBoundaryV2Envelope,
  type ClaimPreparationEnvelopeDiagnostic,
} from "@/lib/analyzer-v2/result-envelope";
import {
  buildClaimBoundaryV2RunContext,
  type BuildClaimBoundaryV2RunContextOptions,
  type ClaimBoundaryV2RunContext,
} from "@/lib/analyzer-v2/run-context";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import type { ClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import { buildClaimUnderstandingRuntimeActivation } from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-activation";
import { createClaimUnderstandingRuntimeInMemoryArtifactSink } from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";

export type RunClaimBoundaryPipelineV2Options = BuildClaimBoundaryV2RunContextOptions;

async function emit(input: ClaimBoundaryV2Ingress, message: string, progress: number): Promise<void> {
  await Promise.resolve(input.emitProgress?.({ message, progress }));
}

function blockCategoryForClaimPreparation(
  state: ClaimUnderstandingRuntimeState,
): ClaimPreparationEnvelopeDiagnostic["blockCategory"] {
  if (state.status === "accepted") {
    return "none";
  }
  if (state.inputSource === "acs_prepared_snapshot") {
    return "input_contract";
  }
  if (state.blockedReason === "gateway_policy_not_executable") {
    return "policy_gate_closed";
  }
  return "stage_scope";
}

function buildClaimPreparationEnvelopeDiagnostics(
  context: ClaimBoundaryV2RunContext,
  state: ClaimUnderstandingRuntimeState,
): ClaimPreparationEnvelopeDiagnostic[] {
  const events = state.result?.integrityEvents ?? [];
  if (events.length === 0) {
    return [];
  }

  return events.map((event) => ({
    inputSource: state.inputSource,
    preparationStatus: state.status,
    eventType: event.type,
    eventSeverity: event.severity,
    claimIds: event.claimIds.length > 0 ? event.claimIds : context.selectedAtomicClaimIds,
    acsMigrationStatus: state.result?.status === "accepted"
      ? state.result.claimContract.acsMigration?.status ?? null
      : null,
    blockCategory: blockCategoryForClaimPreparation(state),
  }));
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
  const envelope = buildDamagedClaimBoundaryV2Envelope(
    context,
    buildClaimPreparationEnvelopeDiagnostics(context, claimUnderstandingState),
  );

  await emit(input, "Analyzer V2 damaged structural envelope generated.", 90);

  return envelope;
}
