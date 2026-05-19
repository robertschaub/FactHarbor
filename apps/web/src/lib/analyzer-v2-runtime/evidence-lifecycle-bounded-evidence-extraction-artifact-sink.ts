import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import {
  BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_VERSION,
  type BoundedEvidenceExtractionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import { sha256Json } from "@/lib/analyzer-v2/util";
import {
  isBoundedEvidenceExtractionRuntimeOwnedDecision,
  type BoundedEvidenceExtractionRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance";

export const BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_SERIALIZED_BYTES = 32_768 as const;
export const BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256 as const;

export type BoundedEvidenceExtractionRuntimeArtifact = {
  readonly artifactVersion: typeof BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_VERSION;
  readonly source: "product_v2_orchestrator_after_bounded_evidence_extraction";
  readonly ledgerId: string;
  readonly runId: string;
  readonly contextGeneratedUtc: string;
  readonly decisionHash: string;
  readonly defaultProjection: "hash_length_provenance_only";
  readonly inputTextReturned: false;
  readonly evidenceItemTextReturned: false;
  readonly sourceTextReturned: false;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionRuntimeOwnedDecision;
};

export type BoundedEvidenceExtractionItemDefaultProjection = Pick<
  BoundedEvidenceExtractionDecision["evidenceItemStatementProjections"][number],
  | "evidenceItemId"
  | "sourceRecordId"
  | "contentPacketId"
  | "statementHash"
  | "statementByteLength"
  | "statementCharLength"
  | "evidenceScopeHash"
  | "provenanceHash"
>;

export type BoundedEvidenceExtractionDecisionDefaultProjection =
  Omit<BoundedEvidenceExtractionDecision, "extractionResult" | "evidenceItemStatementProjections"> & {
    readonly extractionResult: null;
    readonly evidenceItemStatementProjections: readonly BoundedEvidenceExtractionItemDefaultProjection[];
    readonly evidenceItemTextAccess: "redacted_default_hash_length_provenance_only";
    readonly sourceTextAccess: "redacted_default_hash_length_provenance_only";
  };

export type BoundedEvidenceExtractionRuntimeArtifactDefaultProjection =
  Omit<BoundedEvidenceExtractionRuntimeArtifact, "boundedEvidenceExtraction"> & {
    readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecisionDefaultProjection;
  };

type ArtifactLedger = Map<string, BoundedEvidenceExtractionRuntimeArtifact[]>;

type BoundedEvidenceExtractionArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2BoundedEvidenceExtractionArtifactLedgers?: ArtifactLedger;
};

function ledger(): ArtifactLedger {
  const globalLedger = globalThis as BoundedEvidenceExtractionArtifactLedgerGlobal;
  globalLedger.__factHarborV2BoundedEvidenceExtractionArtifactLedgers ??=
    new Map<string, BoundedEvidenceExtractionRuntimeArtifact[]>();
  return globalLedger.__factHarborV2BoundedEvidenceExtractionArtifactLedgers;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function recordBoundedEvidenceExtractionRuntimeArtifact(input: {
  readonly context: PipelineRunContext;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision;
}): BoundedEvidenceExtractionRuntimeArtifact | null {
  if (!isValidLedgerId(input.context.observabilityLedger.ledgerId)) {
    return null;
  }
  if (!isBoundedEvidenceExtractionRuntimeOwnedDecision(input.boundedEvidenceExtraction)) {
    return null;
  }

  const artifact: BoundedEvidenceExtractionRuntimeArtifact = {
    artifactVersion: BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_VERSION,
    source: "product_v2_orchestrator_after_bounded_evidence_extraction",
    ledgerId: input.context.observabilityLedger.ledgerId,
    runId: input.context.runId,
    contextGeneratedUtc: input.context.generatedUtc,
    decisionHash: sha256Json(input.boundedEvidenceExtraction),
    defaultProjection: "hash_length_provenance_only",
    inputTextReturned: false,
    evidenceItemTextReturned: false,
    sourceTextReturned: false,
    boundedEvidenceExtraction: input.boundedEvidenceExtraction,
  };

  if (!isWithinSerializedLimit(artifact)) {
    return null;
  }

  const store = ledger();
  while (store.size >= BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_LEDGER_COUNT) {
    const oldest = store.keys().next().value as string | undefined;
    if (!oldest) {
      break;
    }
    store.delete(oldest);
  }
  const records = store.get(artifact.ledgerId) ?? [];
  store.set(artifact.ledgerId, [...records, cloneJson(artifact)].slice(-BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_RECORDS_PER_LEDGER));
  return artifact;
}

export function readBoundedEvidenceExtractionRuntimeArtifacts(
  ledgerId: string,
): readonly BoundedEvidenceExtractionRuntimeArtifact[] {
  if (!isValidLedgerId(ledgerId)) {
    return [];
  }
  return (ledger().get(ledgerId) ?? []).map(cloneJson);
}

export function readBoundedEvidenceExtractionRuntimeArtifactDefaultProjections(
  ledgerId: string,
): readonly BoundedEvidenceExtractionRuntimeArtifactDefaultProjection[] {
  return readBoundedEvidenceExtractionRuntimeArtifacts(ledgerId).map(
    redactBoundedEvidenceExtractionRuntimeArtifact,
  );
}

export function clearBoundedEvidenceExtractionRuntimeArtifacts(ledgerId?: string): void {
  const store = ledger();
  if (ledgerId) {
    store.delete(ledgerId);
    return;
  }
  store.clear();
}

export function redactBoundedEvidenceExtractionRuntimeArtifact(
  artifact: BoundedEvidenceExtractionRuntimeArtifact,
): BoundedEvidenceExtractionRuntimeArtifactDefaultProjection {
  const decision = artifact.boundedEvidenceExtraction;
  return cloneJson({
    ...artifact,
    inputTextReturned: false,
    evidenceItemTextReturned: false,
    sourceTextReturned: false,
    boundedEvidenceExtraction: {
      ...decision,
      extractionResult: null,
      evidenceItemStatementProjections: decision.evidenceItemStatementProjections.map(
        redactEvidenceItemStatementProjection,
      ),
      evidenceItemTextReturnedByDefault: false,
      sourceTextReturnedByDefault: false,
      evidenceItemTextAccess: "redacted_default_hash_length_provenance_only",
      sourceTextAccess: "redacted_default_hash_length_provenance_only",
    },
  });
}

function redactEvidenceItemStatementProjection(
  projection: BoundedEvidenceExtractionDecision["evidenceItemStatementProjections"][number],
): BoundedEvidenceExtractionItemDefaultProjection {
  return {
    evidenceItemId: projection.evidenceItemId,
    sourceRecordId: projection.sourceRecordId,
    contentPacketId: projection.contentPacketId,
    statementHash: projection.statementHash,
    statementByteLength: projection.statementByteLength,
    statementCharLength: projection.statementCharLength,
    evidenceScopeHash: projection.evidenceScopeHash,
    provenanceHash: projection.provenanceHash,
  };
}

function isValidLedgerId(value: string): boolean {
  return value.length > 0 &&
    value.length <= BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_LEDGER_ID_LENGTH &&
    value.trim() === value &&
    /^[A-Za-z0-9:._-]+$/.test(value);
}

function isWithinSerializedLimit(value: unknown): boolean {
  return Buffer.byteLength(JSON.stringify(value), "utf8")
    <= BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_SERIALIZED_BYTES;
}
