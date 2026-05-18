import type {
  EvidenceLifecycleSourceCandidatePreviewDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";

export const EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.source-candidate-preview-artifact.x7w3a";
export const EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_SERIALIZED_BYTES = 24_576;
export const EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact = {
  readonly artifactVersion: typeof EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_source_candidate_preview_materialization";
  readonly sourceCandidatePreview: EvidenceLifecycleSourceCandidatePreviewDecision;
  readonly productExecution: {
    readonly candidateProviderNetworkObserved: true;
    readonly sourceCandidatePreviewObserved: true;
    readonly searchFetchCalled: true;
    readonly extraHttpCallMade: false;
    readonly contentDereferenceCalled: false;
    readonly parserExecuted: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly storageWrite: false;
    readonly sourceReliabilityCalled: false;
    readonly sourceMaterialCreated: false;
    readonly evidenceCorpusCreated: false;
    readonly evidenceItemGenerated: false;
    readonly warningGenerated: false;
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
    readonly publicSurfaceWritten: false;
  };
  readonly publicCutoverStatus: "blocked_precutover";
};

export type EvidenceLifecycleSourceCandidatePreviewArtifactProjection = {
  readonly context: PipelineRunContext;
  readonly previewDecision: EvidenceLifecycleSourceCandidatePreviewDecision;
};

export type EvidenceLifecycleSourceCandidatePreviewArtifactRecordResult =
  | {
      readonly status: "recorded";
      readonly artifact: EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact;
    }
  | {
      readonly status: "skipped_artifact_oversize";
      readonly artifact: EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact;
    }
  | {
      readonly status: "skipped_invalid_ledger_id";
      readonly artifact: null;
    };

type EvidenceLifecycleSourceCandidatePreviewArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceLifecycleSourceCandidatePreviewArtifactLedgers?:
    Map<string, EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact[]>;
};

function runtimeArtifactLedgers():
  Map<string, EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact[]> {
  const globalLedger = globalThis as EvidenceLifecycleSourceCandidatePreviewArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceLifecycleSourceCandidatePreviewArtifactLedgers ??=
    new Map<string, EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceLifecycleSourceCandidatePreviewArtifactLedgers;
}

function recordsForLedger(ledgerId: string): EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (ledgers.size > EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_LEDGER_COUNT) {
    const oldestLedgerId = ledgers.keys().next().value;
    if (!oldestLedgerId) {
      break;
    }
    ledgers.delete(oldestLedgerId);
  }

  return records;
}

function freezeDeep<T>(value: T): T {
  if (!value || typeof value !== "object") {
    return value;
  }
  for (const child of Object.values(value)) {
    freezeDeep(child);
  }
  return Object.freeze(value);
}

function cloneArtifact(
  artifact: EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact,
): EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact {
  return freezeDeep(
    JSON.parse(JSON.stringify(artifact)) as EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact,
  );
}

function serializedByteLength(artifact: EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0
    && ledgerId.trim() === ledgerId
    && ledgerId.length <= EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_LEDGER_ID_LENGTH;
}

function appendBoundedRecord(
  records: EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact[],
  artifact: EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact,
): void {
  const recordsToDrop =
    records.length - EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneArtifact(artifact));
}

export function buildEvidenceLifecycleSourceCandidatePreviewRuntimeArtifact(
  projection: EvidenceLifecycleSourceCandidatePreviewArtifactProjection,
): EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact {
  return {
    artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: projection.context.observabilityLedger.ledgerId,
    runId: projection.context.runId,
    createdUtc: projection.context.generatedUtc,
    source: "product_v2_orchestrator_after_source_candidate_preview_materialization",
    sourceCandidatePreview: projection.previewDecision,
    productExecution: {
      candidateProviderNetworkObserved: true,
      sourceCandidatePreviewObserved: true,
      searchFetchCalled: true,
      extraHttpCallMade: false,
      contentDereferenceCalled: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      sourceMaterialCreated: false,
      evidenceCorpusCreated: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      publicSurfaceWritten: false,
    },
    publicCutoverStatus: "blocked_precutover",
  };
}

export function recordEvidenceLifecycleSourceCandidatePreviewRuntimeArtifact(
  projection: EvidenceLifecycleSourceCandidatePreviewArtifactProjection,
): EvidenceLifecycleSourceCandidatePreviewArtifactRecordResult {
  if (!ledgerIdIsBounded(projection.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildEvidenceLifecycleSourceCandidatePreviewRuntimeArtifact(projection);
  if (serializedByteLength(artifact) > EVIDENCE_LIFECYCLE_SOURCE_CANDIDATE_PREVIEW_ARTIFACT_MAX_SERIALIZED_BYTES) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceLifecycleSourceCandidatePreviewRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (runtimeArtifactLedgers().get(ledgerId) ?? []).map(cloneArtifact);
}

export function clearEvidenceLifecycleSourceCandidatePreviewRuntimeArtifacts(ledgerId: string): void {
  if (!ledgerIdIsBounded(ledgerId)) {
    return;
  }
  runtimeArtifactLedgers().delete(ledgerId);
}
