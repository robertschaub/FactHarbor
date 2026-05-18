import type {
  EvidenceLifecycleSourceMaterialPageSummaryDecision,
} from "./evidence-lifecycle-source-material-page-summary-owner";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";

export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.source-material.page-summary-artifact.x7w3b";
export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_SERIALIZED_BYTES = 24_576;
export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact = {
  readonly artifactVersion: typeof EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_source_material_page_summary";
  readonly sourceMaterialPageSummary: EvidenceLifecycleSourceMaterialPageSummaryDecision;
  readonly productExecution: {
    readonly candidateProviderNetworkObserved: boolean;
    readonly sourceCandidatePreviewObserved: boolean;
    readonly pageSummaryFetchObserved: boolean;
    readonly extraHttpCallMade: boolean;
    readonly contentDereferenceCalled: boolean;
    readonly parserExecuted: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly storageWrite: false;
    readonly sourceReliabilityCalled: false;
    readonly sourceMaterialCreated: boolean;
    readonly evidenceCorpusCreated: false;
    readonly evidenceItemGenerated: false;
    readonly warningGenerated: false;
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
    readonly confidenceGenerated: false;
    readonly publicSurfaceWritten: false;
  };
  readonly publicCutoverStatus: "blocked_precutover";
};

export type EvidenceLifecycleSourceMaterialPageSummaryArtifactProjection = {
  readonly context: PipelineRunContext;
  readonly decision: EvidenceLifecycleSourceMaterialPageSummaryDecision;
};

export type EvidenceLifecycleSourceMaterialPageSummaryArtifactRecordResult =
  | {
      readonly status: "recorded";
      readonly artifact: EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact;
    }
  | {
      readonly status: "skipped_artifact_oversize";
      readonly artifact: EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact;
    }
  | {
      readonly status: "skipped_invalid_ledger_id";
      readonly artifact: null;
    };

type EvidenceLifecycleSourceMaterialPageSummaryArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceLifecycleSourceMaterialPageSummaryArtifactLedgers?:
    Map<string, EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact[]>;
};

function runtimeArtifactLedgers():
  Map<string, EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact[]> {
  const globalLedger = globalThis as EvidenceLifecycleSourceMaterialPageSummaryArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceLifecycleSourceMaterialPageSummaryArtifactLedgers ??=
    new Map<string, EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceLifecycleSourceMaterialPageSummaryArtifactLedgers;
}

function recordsForLedger(ledgerId: string): EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (ledgers.size > EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_LEDGER_COUNT) {
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
  artifact: EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact,
): EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact {
  return freezeDeep(
    JSON.parse(JSON.stringify(artifact)) as EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact,
  );
}

function serializedByteLength(artifact: EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0
    && ledgerId.trim() === ledgerId
    && ledgerId.length <= EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_LEDGER_ID_LENGTH;
}

function appendBoundedRecord(
  records: EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact[],
  artifact: EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact,
): void {
  const recordsToDrop =
    records.length - EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneArtifact(artifact));
}

export function buildEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact(
  projection: EvidenceLifecycleSourceMaterialPageSummaryArtifactProjection,
): EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact {
  return {
    artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: projection.context.observabilityLedger.ledgerId,
    runId: projection.context.runId,
    createdUtc: projection.context.generatedUtc,
    source: "product_v2_orchestrator_after_source_material_page_summary",
    sourceMaterialPageSummary: projection.decision,
    productExecution: {
      candidateProviderNetworkObserved: projection.decision.productExecution.candidateProviderNetworkObserved,
      sourceCandidatePreviewObserved: projection.decision.productExecution.sourceCandidatePreviewObserved,
      pageSummaryFetchObserved: projection.decision.attemptedFetchCount > 0,
      extraHttpCallMade: projection.decision.productExecution.extraHttpCallMade,
      contentDereferenceCalled: projection.decision.productExecution.contentDereferenceCalled,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      sourceMaterialCreated: projection.decision.sourceMaterialRecordCount > 0,
      evidenceCorpusCreated: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
    publicCutoverStatus: "blocked_precutover",
  };
}

export function recordEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact(
  projection: EvidenceLifecycleSourceMaterialPageSummaryArtifactProjection,
): EvidenceLifecycleSourceMaterialPageSummaryArtifactRecordResult {
  if (!ledgerIdIsBounded(projection.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact(projection);
  if (serializedByteLength(artifact) > EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_ARTIFACT_MAX_SERIALIZED_BYTES) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (runtimeArtifactLedgers().get(ledgerId) ?? []).map(cloneArtifact);
}

export function clearEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifacts(ledgerId: string): void {
  if (!ledgerIdIsBounded(ledgerId)) {
    return;
  }
  runtimeArtifactLedgers().delete(ledgerId);
}
