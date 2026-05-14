import {
  runClaimUnderstandingRuntimeStage,
} from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import { buildDamagedClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import {
  buildClaimBoundaryV2RunContext,
  type BuildClaimBoundaryV2RunContextOptions,
} from "@/lib/analyzer-v2/run-context";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import type { ClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";

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
  const claimUnderstandingState = await runClaimUnderstandingRuntimeStage(
    input,
    context,
  );
  void claimUnderstandingState;
  const envelope = buildDamagedClaimBoundaryV2Envelope(context);

  await emit(input, "Analyzer V2 damaged structural envelope generated.", 90);

  return envelope;
}
