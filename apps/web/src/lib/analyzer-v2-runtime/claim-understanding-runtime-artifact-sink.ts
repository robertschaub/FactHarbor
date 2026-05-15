import type { ClaimUnderstandingProviderTelemetry } from "@/lib/analyzer-v2/claim-understanding/model-adapter";
import type {
  AnalyzerV2CacheDecision,
  AnalyzerV2GatewayTaskId,
  AnalyzerV2GatewayTaskStatus,
} from "@/lib/analyzer-v2/gateway/types";

export const CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_SINK_VERSION =
  "v2.claim-understanding.runtime-artifact-sink.1";
export const CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_MAX_LEDGER_COUNT = 64;
export const CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_MAX_RECORDS_PER_LEDGER = 16;

export type ClaimUnderstandingRuntimeArtifactAttemptDiagnostic = {
  attemptNumber: number;
  status: "accepted" | "invalid_schema" | "parse_failure" | "provider_failure";
  promptContentHash: string;
  providerTelemetry: ClaimUnderstandingProviderTelemetry | null;
  failureMessage: string | null;
};

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
  adapterAttemptDiagnostics: readonly ClaimUnderstandingRuntimeArtifactAttemptDiagnostic[];
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

type RuntimeArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2ClaimUnderstandingRuntimeArtifactLedgers?: Map<string, ClaimUnderstandingRuntimeArtifact[]>;
};

function runtimeArtifactLedgers(): Map<string, ClaimUnderstandingRuntimeArtifact[]> {
  const globalLedger = globalThis as RuntimeArtifactLedgerGlobal;
  globalLedger.__factHarborV2ClaimUnderstandingRuntimeArtifactLedgers ??=
    new Map<string, ClaimUnderstandingRuntimeArtifact[]>();
  return globalLedger.__factHarborV2ClaimUnderstandingRuntimeArtifactLedgers;
}

function recordsForLedger(ledgerId: string): ClaimUnderstandingRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: ClaimUnderstandingRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (ledgers.size > CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_MAX_LEDGER_COUNT) {
    const oldestLedgerId = ledgers.keys().next().value;
    if (!oldestLedgerId) {
      break;
    }
    ledgers.delete(oldestLedgerId);
  }

  return records;
}

function appendBoundedRecord(
  records: ClaimUnderstandingRuntimeArtifact[],
  artifact: ClaimUnderstandingRuntimeArtifact,
): void {
  const recordsToDrop =
    records.length - CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(artifact);
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
      appendBoundedRecord(records, artifact);
    },
  };
}

export function readClaimUnderstandingRuntimeArtifacts(
  ledgerId: string,
): readonly ClaimUnderstandingRuntimeArtifact[] {
  return [...(runtimeArtifactLedgers().get(ledgerId) ?? [])];
}

export function clearClaimUnderstandingRuntimeArtifacts(ledgerId: string): void {
  runtimeArtifactLedgers().delete(ledgerId);
}
