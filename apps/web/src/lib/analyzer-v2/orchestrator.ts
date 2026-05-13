import { buildDamagedClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import {
  buildClaimBoundaryV2RunContext,
  type BuildClaimBoundaryV2RunContextOptions,
} from "@/lib/analyzer-v2/run-context";
import type { AnalysisInput } from "@/lib/analyzer/types";

export type RunClaimBoundaryPipelineV2Options = BuildClaimBoundaryV2RunContextOptions;

async function emit(input: AnalysisInput, message: string, progress: number): Promise<void> {
  await Promise.resolve(input.onEvent?.(message, progress));
}

export async function runClaimBoundaryPipelineV2(
  input: AnalysisInput,
  options: RunClaimBoundaryPipelineV2Options = {},
): Promise<{ resultJson: any; reportMarkdown: string }> {
  await emit(input, "Analyzer V2 orchestrator initialized.", 8);

  const context = buildClaimBoundaryV2RunContext(input, options);
  const envelope = buildDamagedClaimBoundaryV2Envelope(context);

  await emit(input, "Analyzer V2 damaged structural envelope generated.", 90);

  return envelope;
}
