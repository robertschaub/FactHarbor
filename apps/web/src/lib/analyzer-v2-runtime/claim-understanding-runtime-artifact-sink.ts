import type { ClaimUnderstandingProviderTelemetry } from "@/lib/analyzer-v2/claim-understanding/model-adapter";
import type {
  AnalyzerV2CacheDecision,
  AnalyzerV2GatewayTaskId,
  AnalyzerV2GatewayTaskStatus,
} from "@/lib/analyzer-v2/gateway/types";

export const CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_SINK_VERSION =
  "v2.claim-understanding.runtime-artifact-sink.0";

export type ClaimUnderstandingRuntimeArtifact = {
  artifactVersion: typeof CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_SINK_VERSION;
  artifactId: string;
  ledgerId: string;
  visibility: "internal_admin_only";
  publicPointerExposure: "forbidden";
  runId: string;
  inputSource: "direct_input";
  executionStatus: "blocked" | "completed";
  gatewayTaskId: AnalyzerV2GatewayTaskId;
  gatewayTaskStatus: AnalyzerV2GatewayTaskStatus | "not_constructed";
  activationSnapshotHash: string;
  configSnapshotHash: string | null;
  promptContentHash: string | null;
  renderedPromptHash: string | null;
  providerTelemetry: ClaimUnderstandingProviderTelemetry | null;
  schemaOutcome: {
    status: "accepted" | "blocked" | "damaged" | "not_attempted";
    blockedReason: string | null;
    damagedReason: string | null;
  };
  failureState: {
    blockedReason: string | null;
    failureMessage: string | null;
  };
  cacheDecision: Pick<AnalyzerV2CacheDecision, "reason" | "canRead" | "canWrite"> | null;
  warningMateriality: "admin_only_internal";
};

export type ClaimUnderstandingRuntimeArtifactSink = {
  sinkKind: "v2_observability_ledger";
  ledgerId: string;
  visibility: "internal_admin_only";
  publicPointerExposure: "forbidden";
  record: (artifact: ClaimUnderstandingRuntimeArtifact) => void | Promise<void>;
};

export type ClaimUnderstandingRuntimeInMemoryArtifactSink =
  ClaimUnderstandingRuntimeArtifactSink & {
    readonly records: readonly ClaimUnderstandingRuntimeArtifact[];
  };

const globalRuntimeArtifacts = new Map<string, ClaimUnderstandingRuntimeArtifact[]>();

function recordsForLedger(ledgerId: string): ClaimUnderstandingRuntimeArtifact[] {
  const existing = globalRuntimeArtifacts.get(ledgerId);
  if (existing) {
    return existing;
  }

  const records: ClaimUnderstandingRuntimeArtifact[] = [];
  globalRuntimeArtifacts.set(ledgerId, records);
  return records;
}

export function createClaimUnderstandingRuntimeInMemoryArtifactSink(
  ledgerId: string,
): ClaimUnderstandingRuntimeInMemoryArtifactSink {
  const records = recordsForLedger(ledgerId);

  return {
    sinkKind: "v2_observability_ledger",
    ledgerId,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    records,
    record: (artifact) => {
      records.push(artifact);
    },
  };
}

export function readClaimUnderstandingRuntimeArtifacts(
  ledgerId: string,
): readonly ClaimUnderstandingRuntimeArtifact[] {
  return [...recordsForLedger(ledgerId)];
}

export function clearClaimUnderstandingRuntimeArtifacts(ledgerId: string): void {
  recordsForLedger(ledgerId).length = 0;
}
