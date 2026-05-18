import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import type {
  EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision,
} from "./evidence-lifecycle-source-material-evidence-corpus-readiness-owner";

export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness-artifact.x7w4a";
export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_SERIALIZED_BYTES = 24_576;
export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact = {
  readonly artifactVersion:
    typeof EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_source_material_evidence_corpus_readiness";
  readonly sourceMaterialEvidenceCorpusReadiness: EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision;
  readonly productExecution: {
    readonly sourceMaterialReadinessObserved: boolean;
    readonly sourceMaterialCreated: boolean;
    readonly evidenceCorpusBuildAuthorized: false;
    readonly parserExecuted: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly storageWrite: false;
    readonly sourceReliabilityCalled: false;
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

export type EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessArtifactProjection = {
  readonly context: PipelineRunContext;
  readonly readinessDecision: EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision;
};

export type EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessArtifactRecordResult =
  | {
      readonly status: "recorded";
      readonly artifact: EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact;
    }
  | {
      readonly status: "skipped_artifact_oversize";
      readonly artifact: EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact;
    }
  | {
      readonly status: "skipped_invalid_ledger_id";
      readonly artifact: null;
    };

type EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessArtifactLedgers?:
    Map<string, EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact[]>;
};

function runtimeArtifactLedgers():
  Map<string, EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact[]> {
  const globalLedger = globalThis as EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessArtifactLedgers ??=
    new Map<string, EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessArtifactLedgers;
}

function recordsForLedger(ledgerId: string): EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (
    ledgers.size > EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_LEDGER_COUNT
  ) {
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
  artifact: EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact,
): EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact {
  return freezeDeep(
    JSON.parse(JSON.stringify(artifact)) as EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact,
  );
}

function serializedByteLength(artifact: EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0
    && ledgerId.trim() === ledgerId
    && ledgerId.length <=
      EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_LEDGER_ID_LENGTH;
}

function appendBoundedRecord(
  records: EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact[],
  artifact: EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact,
): void {
  const recordsToDrop =
    records.length -
    EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_RECORDS_PER_LEDGER +
    1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneArtifact(artifact));
}

export function buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact(
  projection: EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessArtifactProjection,
): EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact {
  return {
    artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: projection.context.observabilityLedger.ledgerId,
    runId: projection.context.runId,
    createdUtc: projection.context.generatedUtc,
    source: "product_v2_orchestrator_after_source_material_evidence_corpus_readiness",
    sourceMaterialEvidenceCorpusReadiness: projection.readinessDecision,
    productExecution: {
      sourceMaterialReadinessObserved:
        projection.readinessDecision.productExecution.sourceMaterialReadinessObserved,
      sourceMaterialCreated: projection.readinessDecision.productExecution.sourceMaterialCreated,
      evidenceCorpusBuildAuthorized: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
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

export function recordEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact(
  projection: EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessArtifactProjection,
): EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessArtifactRecordResult {
  if (!ledgerIdIsBounded(projection.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact(projection);
  if (
    serializedByteLength(artifact) >
    EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_EVIDENCE_CORPUS_READINESS_ARTIFACT_MAX_SERIALIZED_BYTES
  ) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (runtimeArtifactLedgers().get(ledgerId) ?? []).map(cloneArtifact);
}

export function clearEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifacts(ledgerId: string): void {
  if (!ledgerIdIsBounded(ledgerId)) {
    return;
  }
  runtimeArtifactLedgers().delete(ledgerId);
}
