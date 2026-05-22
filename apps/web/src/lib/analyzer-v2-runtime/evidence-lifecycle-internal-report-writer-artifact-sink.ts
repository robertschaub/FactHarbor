import type {
  BoundaryVerdictExecutionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import type {
  InternalAlphaReportResultCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result";
import {
  INTERNAL_REPORT_WRITER_DECISION_VERSION,
  type InternalReportWriterDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import { sha256Json } from "@/lib/analyzer-v2/util";

export const INTERNAL_REPORT_WRITER_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.internal-report-writer-artifact.hj18" as const;
export const INTERNAL_REPORT_WRITER_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const INTERNAL_REPORT_WRITER_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const INTERNAL_REPORT_WRITER_ARTIFACT_MAX_SERIALIZED_BYTES = 65_536;
export const INTERNAL_REPORT_WRITER_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type InternalReportWriterRuntimeArtifact = {
  readonly artifactVersion: typeof INTERNAL_REPORT_WRITER_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_internal_alpha_report_draft";
  readonly defaultProjection: "hash_length_provenance_only";
  readonly explicitInspectionProjection: "authenticated_admin_can_request_report_markdown";
  readonly decisionHash: string;
  readonly internalReportWriter: InternalReportWriterDecision;
};

export type InternalReportWriterRuntimeArtifactDefaultProjection = {
  readonly artifactVersion: typeof INTERNAL_REPORT_WRITER_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly source: "product_v2_orchestrator_after_internal_alpha_report_draft";
  readonly defaultProjection: "hash_length_provenance_only";
  readonly explicitInspectionProjection: "authenticated_admin_can_request_report_markdown";
  readonly ledgerIdReturned: false;
  readonly ledgerIdHash: string;
  readonly runIdReturned: false;
  readonly runIdHash: string;
  readonly createdUtc: string;
  readonly decisionHash: string;
  readonly internalReportWriter: {
    readonly decisionVersion: typeof INTERNAL_REPORT_WRITER_DECISION_VERSION;
    readonly decisionIdReturned: false;
    readonly decisionIdHash: string;
    readonly kind: InternalReportWriterDecision["kind"];
    readonly status: InternalReportWriterDecision["status"];
    readonly blockedReason: InternalReportWriterDecision["blockedReason"];
    readonly damagedReason: InternalReportWriterDecision["damagedReason"];
    readonly visibility: "internal_admin_only";
    readonly publicPointerExposure: "forbidden";
    readonly publicCutoverStatus: "blocked_precutover";
    readonly defaultProjection: "hash_length_provenance_only";
    readonly parent: InternalReportWriterDecision["parent"];
    readonly inputPacketHash: string | null;
    readonly inputPacketByteLength: number | null;
    readonly aggregationNarrativeResultHash: string | null;
    readonly aggregationNarrativeResultStatus: InternalReportWriterDecision["aggregationNarrativeResultStatus"];
    readonly reportMarkdownReturned: false;
    readonly reportMarkdownHash: string | null;
    readonly reportMarkdownByteLength: number;
    readonly verdictSectionCount: number;
    readonly boundarySectionCount: number;
    readonly citedEvidenceItemRefCount: number;
    readonly citedEvidenceItemRefHashes: readonly string[];
    readonly reportReviewReadiness: InternalReportWriterDecision["reportReviewReadiness"];
    readonly redaction: InternalReportWriterDecision["redaction"];
    readonly executionTelemetry: InternalReportWriterDecision["executionTelemetry"];
    readonly sideEffects: InternalReportWriterDecision["sideEffects"];
    readonly w8gMergeTrigger: InternalReportWriterDecision["w8gMergeTrigger"];
    readonly approvalPointer: InternalReportWriterDecision["approvalPointer"];
  };
};

export type InternalReportWriterRuntimeArtifactInspectionProjection =
  Omit<InternalReportWriterRuntimeArtifactDefaultProjection, "internalReportWriter"> & {
    readonly inspectionProjection: "explicit_authenticated_admin_report_markdown";
    readonly internalReportWriter:
      Omit<
        InternalReportWriterRuntimeArtifactDefaultProjection["internalReportWriter"],
        "reportMarkdownReturned"
      > & {
      readonly reportMarkdownReturned: true;
      readonly reportMarkdown: string | null;
    };
  };

export type InternalReportWriterArtifactRecordResult =
  | {
      readonly status: "recorded";
      readonly artifact: InternalReportWriterRuntimeArtifact;
    }
  | {
      readonly status: "skipped_artifact_oversize";
      readonly artifact: InternalReportWriterRuntimeArtifact;
    }
  | {
      readonly status: "skipped_invalid_ledger_id";
      readonly artifact: null;
    };

type ArtifactLedger = Map<string, InternalReportWriterRuntimeArtifact[]>;
type InternalReportWriterArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2InternalReportWriterArtifactLedgers?: ArtifactLedger;
};

function ledger(): ArtifactLedger {
  const globalLedger = globalThis as InternalReportWriterArtifactLedgerGlobal;
  globalLedger.__factHarborV2InternalReportWriterArtifactLedgers ??=
    new Map<string, InternalReportWriterRuntimeArtifact[]>();
  return globalLedger.__factHarborV2InternalReportWriterArtifactLedgers;
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

function cloneJson<T>(value: T): T {
  return freezeDeep(JSON.parse(JSON.stringify(value)) as T);
}

function recordsForLedger(ledgerId: string): InternalReportWriterRuntimeArtifact[] {
  const store = ledger();
  const existing = store.get(ledgerId);
  if (existing) {
    store.delete(ledgerId);
    store.set(ledgerId, existing);
    return existing;
  }

  const records: InternalReportWriterRuntimeArtifact[] = [];
  store.set(ledgerId, records);
  while (store.size > INTERNAL_REPORT_WRITER_ARTIFACT_MAX_LEDGER_COUNT) {
    const oldestLedgerId = store.keys().next().value;
    if (!oldestLedgerId) {
      break;
    }
    store.delete(oldestLedgerId);
  }
  return records;
}

function appendBoundedRecord(
  records: InternalReportWriterRuntimeArtifact[],
  artifact: InternalReportWriterRuntimeArtifact,
): void {
  const recordsToDrop = records.length - INTERNAL_REPORT_WRITER_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneJson(artifact));
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0 &&
    ledgerId.trim() === ledgerId &&
    ledgerId.length <= INTERNAL_REPORT_WRITER_ARTIFACT_MAX_LEDGER_ID_LENGTH &&
    /^[A-Za-z0-9:._-]+$/.test(ledgerId);
}

function serializedByteLength(artifact: InternalReportWriterRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

export function buildInternalReportWriterRuntimeArtifact(input: {
  readonly context: PipelineRunContext;
  readonly decision: InternalReportWriterDecision;
}): InternalReportWriterRuntimeArtifact {
  return {
    artifactVersion: INTERNAL_REPORT_WRITER_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: input.context.observabilityLedger.ledgerId,
    runId: input.context.runId,
    createdUtc: input.context.generatedUtc,
    source: "product_v2_orchestrator_after_internal_alpha_report_draft",
    defaultProjection: "hash_length_provenance_only",
    explicitInspectionProjection: "authenticated_admin_can_request_report_markdown",
    decisionHash: sha256Json(input.decision),
    internalReportWriter: input.decision,
  };
}

export async function runAndRecordInternalReportWriterRuntimeArtifact(input: {
  readonly context: PipelineRunContext;
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
  readonly runInternalReportWriterDecision: (params: {
    readonly context: PipelineRunContext;
    readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
    readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
  }) => Promise<InternalReportWriterDecision>;
}): Promise<InternalReportWriterArtifactRecordResult> {
  if (!ledgerIdIsBounded(input.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const decision = await input.runInternalReportWriterDecision({
    context: input.context,
    internalAlphaReportResult: input.internalAlphaReportResult,
    boundaryVerdictExecution: input.boundaryVerdictExecution,
  });
  const artifact = buildInternalReportWriterRuntimeArtifact({
    context: input.context,
    decision,
  });
  if (serializedByteLength(artifact) > INTERNAL_REPORT_WRITER_ARTIFACT_MAX_SERIALIZED_BYTES) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function recordInternalReportWriterRuntimeArtifact(input: {
  readonly context: PipelineRunContext;
  readonly decision: InternalReportWriterDecision;
}): InternalReportWriterArtifactRecordResult {
  if (!ledgerIdIsBounded(input.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildInternalReportWriterRuntimeArtifact(input);
  if (serializedByteLength(artifact) > INTERNAL_REPORT_WRITER_ARTIFACT_MAX_SERIALIZED_BYTES) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readInternalReportWriterRuntimeArtifacts(
  ledgerId: string,
): readonly InternalReportWriterRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (ledger().get(ledgerId) ?? []).map(cloneJson);
}

export function readInternalReportWriterRuntimeArtifactDefaultProjections(
  ledgerId: string,
): readonly InternalReportWriterRuntimeArtifactDefaultProjection[] {
  return readInternalReportWriterRuntimeArtifacts(ledgerId).map(redactInternalReportWriterRuntimeArtifact);
}

export function readInternalReportWriterRuntimeArtifactInspectionProjections(
  ledgerId: string,
): readonly InternalReportWriterRuntimeArtifactInspectionProjection[] {
  return readInternalReportWriterRuntimeArtifacts(ledgerId).map((artifact) => {
    const projection = redactInternalReportWriterRuntimeArtifact(artifact);
    return cloneJson({
      ...projection,
      inspectionProjection: "explicit_authenticated_admin_report_markdown" as const,
      internalReportWriter: {
        ...projection.internalReportWriter,
        reportMarkdownReturned: true as const,
        reportMarkdown: artifact.internalReportWriter.reportMarkdown,
      },
    });
  });
}

export function clearInternalReportWriterRuntimeArtifacts(ledgerId?: string): void {
  const store = ledger();
  if (ledgerId) {
    store.delete(ledgerId);
    return;
  }
  store.clear();
}

export function redactInternalReportWriterRuntimeArtifact(
  artifact: InternalReportWriterRuntimeArtifact,
): InternalReportWriterRuntimeArtifactDefaultProjection {
  const decision = artifact.internalReportWriter;
  return cloneJson({
    artifactVersion: artifact.artifactVersion,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    source: artifact.source,
    defaultProjection: "hash_length_provenance_only",
    explicitInspectionProjection: artifact.explicitInspectionProjection,
    ledgerIdReturned: false,
    ledgerIdHash: sha256Json({ ledgerId: artifact.ledgerId }),
    runIdReturned: false,
    runIdHash: sha256Json({ runId: artifact.runId }),
    createdUtc: artifact.createdUtc,
    decisionHash: artifact.decisionHash,
    internalReportWriter: {
      decisionVersion: decision.decisionVersion,
      decisionIdReturned: false,
      decisionIdHash: sha256Json({ decisionId: decision.decisionId }),
      kind: decision.kind,
      status: decision.status,
      blockedReason: decision.blockedReason,
      damagedReason: decision.damagedReason,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: decision.defaultProjection,
      parent: decision.parent,
      inputPacketHash: decision.inputPacketHash,
      inputPacketByteLength: decision.inputPacketByteLength,
      aggregationNarrativeResultHash: decision.aggregationNarrativeResultHash,
      aggregationNarrativeResultStatus: decision.aggregationNarrativeResultStatus,
      reportMarkdownReturned: false,
      reportMarkdownHash: decision.reportMarkdownHash,
      reportMarkdownByteLength: decision.reportMarkdownByteLength,
      verdictSectionCount: decision.verdictSectionCount,
      boundarySectionCount: decision.boundarySectionCount,
      citedEvidenceItemRefCount: decision.citedEvidenceItemRefCount,
      citedEvidenceItemRefHashes: decision.citedEvidenceItemRefHashes,
      reportReviewReadiness: decision.reportReviewReadiness,
      redaction: decision.redaction,
      executionTelemetry: decision.executionTelemetry,
      sideEffects: decision.sideEffects,
      w8gMergeTrigger: decision.w8gMergeTrigger,
      approvalPointer: decision.approvalPointer,
    },
  });
}
