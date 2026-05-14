import {
  runClaimBoundaryPipelineV2,
  type RunClaimBoundaryPipelineV2Options,
} from "@/lib/analyzer-v2/orchestrator";
import { normalizeClaimBoundaryV2IngressFromRunner } from "@/lib/analyzer-v2/runner-ingress";
import type { ClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";

export type RunClaimBoundaryV2ShellOptions = RunClaimBoundaryPipelineV2Options;

export async function runClaimBoundaryV2Shell(
  input: unknown,
  options: RunClaimBoundaryV2ShellOptions = {},
): Promise<ClaimBoundaryV2Envelope> {
  return runClaimBoundaryPipelineV2(normalizeClaimBoundaryV2IngressFromRunner(input), options);
}
