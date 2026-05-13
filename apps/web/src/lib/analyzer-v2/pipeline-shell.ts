import type { AnalysisInput } from "@/lib/analyzer/types";
import { runClaimBoundaryPipelineV2 } from "@/lib/analyzer-v2/orchestrator";

export async function runClaimBoundaryV2Shell(
  input: AnalysisInput,
): Promise<{ resultJson: any; reportMarkdown: string }> {
  return runClaimBoundaryPipelineV2(input);
}
