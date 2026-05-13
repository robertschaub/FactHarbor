import { runClaimBoundaryPipelineV2 } from "@/lib/analyzer-v2/orchestrator";
import { normalizeClaimBoundaryV2IngressFromRunner } from "@/lib/analyzer-v2/runner-ingress";

export async function runClaimBoundaryV2Shell(
  input: unknown,
): Promise<{ resultJson: any; reportMarkdown: string }> {
  return runClaimBoundaryPipelineV2(normalizeClaimBoundaryV2IngressFromRunner(input));
}
