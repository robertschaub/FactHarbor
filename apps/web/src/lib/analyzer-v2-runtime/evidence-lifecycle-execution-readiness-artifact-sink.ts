import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import {
  EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_ARTIFACT_VERSION,
  type EvidenceLifecycleExecutionReadinessDenialDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial";
import {
  isEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision,
  type EvidenceLifecycleExecutionReadinessRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-provenance";
import { sha256Json } from "@/lib/analyzer-v2/util";

export const EVIDENCE_LIFECYCLE_EXECUTION_READINESS_ARTIFACT_MAX_SERIALIZED_BYTES =
  32768 as const;

const MAX_RECORDS_PER_LEDGER = 4;
const MAX_LEDGER_COUNT = 256;
export const EVIDENCE_LIFECYCLE_EXECUTION_READINESS_ARTIFACT_MAX_LEDGER_ID_LENGTH =
  256 as const;

export interface EvidenceLifecycleExecutionReadinessRuntimeArtifact {
  readonly artifactVersion: typeof EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_ARTIFACT_VERSION;
  readonly source: "product_v2_orchestrator_after_execution_readiness_denial";
  readonly ledgerId: string;
  readonly runId: string;
  readonly contextGeneratedUtc: string;
  readonly decisionHash: string;
  readonly defaultProjection: "hash_length_provenance_only";
  readonly inputTextReturned: false;
  readonly executionReadinessDenial: EvidenceLifecycleExecutionReadinessRuntimeOwnedDecision;
}

export type EvidenceLifecycleExecutionReadinessRuntimeArtifactDefaultProjection =
  Omit<EvidenceLifecycleExecutionReadinessRuntimeArtifact, "executionReadinessDenial"> & {
    readonly executionReadinessDenial: EvidenceLifecycleExecutionReadinessDenialDecision;
  };

type ArtifactLedger = Map<string, EvidenceLifecycleExecutionReadinessRuntimeArtifact[]>;

type EvidenceLifecycleExecutionReadinessArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceLifecycleExecutionReadinessArtifactLedgers?: ArtifactLedger;
};

function ledger(): ArtifactLedger {
  const globalLedger = globalThis as EvidenceLifecycleExecutionReadinessArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceLifecycleExecutionReadinessArtifactLedgers ??=
    new Map<string, EvidenceLifecycleExecutionReadinessRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceLifecycleExecutionReadinessArtifactLedgers;
}

export function recordEvidenceLifecycleExecutionReadinessRuntimeArtifact(input: {
  readonly context: PipelineRunContext;
  readonly executionReadinessDenial: EvidenceLifecycleExecutionReadinessDenialDecision;
}): EvidenceLifecycleExecutionReadinessRuntimeArtifact | null {
  if (!isValidLedgerId(input.context.observabilityLedger.ledgerId)) {
    return null;
  }
  if (!isEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(input.executionReadinessDenial)) {
    return null;
  }

  const artifact: EvidenceLifecycleExecutionReadinessRuntimeArtifact = {
    artifactVersion: EVIDENCE_LIFECYCLE_EXECUTION_READINESS_DENIAL_ARTIFACT_VERSION,
    source: "product_v2_orchestrator_after_execution_readiness_denial",
    ledgerId: input.context.observabilityLedger.ledgerId,
    runId: input.context.runId,
    contextGeneratedUtc: input.context.generatedUtc,
    decisionHash: sha256Json(input.executionReadinessDenial),
    defaultProjection: "hash_length_provenance_only",
    inputTextReturned: false,
    executionReadinessDenial: input.executionReadinessDenial,
  };

  if (!isWithinSerializedLimit(artifact)) {
    return null;
  }

  const store = ledger();
  while (store.size >= MAX_LEDGER_COUNT) {
    const oldest = store.keys().next().value as string | undefined;
    if (!oldest) {
      break;
    }
    store.delete(oldest);
  }

  const records = store.get(artifact.ledgerId) ?? [];
  const next = [...records, artifact].slice(-MAX_RECORDS_PER_LEDGER);
  store.set(artifact.ledgerId, next);
  return artifact;
}

export function readEvidenceLifecycleExecutionReadinessRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceLifecycleExecutionReadinessRuntimeArtifact[] {
  if (!isValidLedgerId(ledgerId)) {
    return [];
  }
  return [...(ledger().get(ledgerId) ?? [])];
}

export function readEvidenceLifecycleExecutionReadinessRuntimeArtifactDefaultProjections(
  ledgerId: string,
): readonly EvidenceLifecycleExecutionReadinessRuntimeArtifactDefaultProjection[] {
  return readEvidenceLifecycleExecutionReadinessRuntimeArtifacts(ledgerId).map(
    redactEvidenceLifecycleExecutionReadinessRuntimeArtifact,
  );
}

export function clearEvidenceLifecycleExecutionReadinessRuntimeArtifacts(
  ledgerId?: string,
): void {
  const store = ledger();
  if (ledgerId) {
    store.delete(ledgerId);
    return;
  }
  store.clear();
}

export function redactEvidenceLifecycleExecutionReadinessRuntimeArtifact(
  artifact: EvidenceLifecycleExecutionReadinessRuntimeArtifact,
): EvidenceLifecycleExecutionReadinessRuntimeArtifactDefaultProjection {
  return {
    ...artifact,
    defaultProjection: "hash_length_provenance_only",
    inputTextReturned: false,
    executionReadinessDenial: artifact.executionReadinessDenial,
  };
}

function isValidLedgerId(value: string): boolean {
  return value.length > 0
    && value.length <= EVIDENCE_LIFECYCLE_EXECUTION_READINESS_ARTIFACT_MAX_LEDGER_ID_LENGTH
    && /^[A-Za-z0-9:._-]+$/.test(value);
}

function isWithinSerializedLimit(value: unknown): boolean {
  return Buffer.byteLength(JSON.stringify(value), "utf8")
    <= EVIDENCE_LIFECYCLE_EXECUTION_READINESS_ARTIFACT_MAX_SERIALIZED_BYTES;
}
