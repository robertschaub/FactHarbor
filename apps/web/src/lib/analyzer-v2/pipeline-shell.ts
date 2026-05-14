import {
  runClaimBoundaryPipelineV2,
  type RunClaimBoundaryPipelineV2Options,
} from "@/lib/analyzer-v2/orchestrator";
import { normalizeClaimBoundaryV2IngressFromRunner } from "@/lib/analyzer-v2/runner-ingress";

export type RunClaimBoundaryV2ShellOptions = RunClaimBoundaryPipelineV2Options;

export async function runClaimBoundaryV2Shell(
  input: unknown,
  options: RunClaimBoundaryV2ShellOptions = {},
): Promise<{ resultJson: any; reportMarkdown: string }> {
  return runClaimBoundaryPipelineV2(normalizeClaimBoundaryV2IngressFromRunner(input), options);
}
