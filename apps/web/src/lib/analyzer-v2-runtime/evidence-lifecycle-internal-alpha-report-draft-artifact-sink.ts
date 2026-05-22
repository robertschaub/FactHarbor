import {
  buildInternalAlphaReportDraftDecision,
  INTERNAL_ALPHA_REPORT_DRAFT_DECISION_VERSION,
  type InternalAlphaReportDraftDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-draft";
import type {
  InternalAlphaReportResultCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result";
import type {
  BoundaryVerdictExecutionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import { sha256Json } from "@/lib/analyzer-v2/util";

export const INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.internal-alpha-report-draft-artifact.w8g" as const;
export const INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_SERIALIZED_BYTES = 65_536;
export const INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type InternalAlphaReportDraftRuntimeArtifact = {
  readonly artifactVersion: typeof INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_internal_alpha_report_result";
  readonly defaultProjection: "hash_length_provenance_only";
  readonly explicitInspectionProjection: "authenticated_admin_can_request_draft_markdown";
  readonly decisionHash: string;
  readonly internalAlphaReportDraft: InternalAlphaReportDraftDecision;
};

export type InternalAlphaReportDraftRuntimeArtifactDefaultProjection = {
  readonly artifactVersion: typeof INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly source: "product_v2_orchestrator_after_internal_alpha_report_result";
  readonly defaultProjection: "hash_length_provenance_only";
  readonly explicitInspectionProjection: "authenticated_admin_can_request_draft_markdown";
  readonly ledgerIdReturned: false;
  readonly ledgerIdHash: string;
  readonly runIdReturned: false;
  readonly runIdHash: string;
  readonly createdUtc: string;
  readonly decisionHash: string;
  readonly internalAlphaReportDraft: {
    readonly decisionVersion: typeof INTERNAL_ALPHA_REPORT_DRAFT_DECISION_VERSION;
    readonly decisionIdReturned: false;
    readonly decisionIdHash: string;
    readonly kind: InternalAlphaReportDraftDecision["kind"];
    readonly status: InternalAlphaReportDraftDecision["status"];
    readonly blockedReason: InternalAlphaReportDraftDecision["blockedReason"];
    readonly damagedReason: InternalAlphaReportDraftDecision["damagedReason"];
    readonly visibility: "internal_admin_only";
    readonly publicPointerExposure: "forbidden";
    readonly publicCutoverStatus: "blocked_precutover";
    readonly defaultProjection: "hash_length_provenance_only";
    readonly parent: InternalAlphaReportDraftDecision["parent"];
    readonly draftMarkdownReturned: false;
    readonly draftMarkdownHash: string | null;
    readonly draftMarkdownByteLength: number;
    readonly boundaryDraftCount: number;
    readonly verdictDraftCount: number;
    readonly citedEvidenceItemRefCount: number;
    readonly citedEvidenceItemRefHashes: readonly string[];
    readonly reportReviewReadiness: InternalAlphaReportDraftDecision["reportReviewReadiness"];
    readonly redaction: InternalAlphaReportDraftDecision["redaction"];
    readonly sideEffects: InternalAlphaReportDraftDecision["sideEffects"];
    readonly retirementTrigger: InternalAlphaReportDraftDecision["retirementTrigger"];
    readonly approvalPointer: InternalAlphaReportDraftDecision["approvalPointer"];
  };
};

export type InternalAlphaReportDraftRuntimeArtifactInspectionProjection =
  Omit<InternalAlphaReportDraftRuntimeArtifactDefaultProjection, "internalAlphaReportDraft"> & {
    readonly inspectionProjection: "explicit_authenticated_admin_draft_markdown";
    readonly internalAlphaReportDraft:
      Omit<
        InternalAlphaReportDraftRuntimeArtifactDefaultProjection["internalAlphaReportDraft"],
        "draftMarkdownReturned"
      > & {
      readonly draftMarkdownReturned: true;
      readonly draftMarkdown: string | null;
    };
  };

export type InternalAlphaReportDraftArtifactRecordResult =
  | {
      readonly status: "recorded";
      readonly artifact: InternalAlphaReportDraftRuntimeArtifact;
    }
  | {
      readonly status: "skipped_artifact_oversize";
      readonly artifact: InternalAlphaReportDraftRuntimeArtifact;
    }
  | {
      readonly status: "skipped_invalid_ledger_id";
      readonly artifact: null;
    };

type ArtifactLedger = Map<string, InternalAlphaReportDraftRuntimeArtifact[]>;
type InternalAlphaReportDraftArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2InternalAlphaReportDraftArtifactLedgers?: ArtifactLedger;
};

function ledger(): ArtifactLedger {
  const globalLedger = globalThis as InternalAlphaReportDraftArtifactLedgerGlobal;
  globalLedger.__factHarborV2InternalAlphaReportDraftArtifactLedgers ??=
    new Map<string, InternalAlphaReportDraftRuntimeArtifact[]>();
  return globalLedger.__factHarborV2InternalAlphaReportDraftArtifactLedgers;
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

function recordsForLedger(ledgerId: string): InternalAlphaReportDraftRuntimeArtifact[] {
  const store = ledger();
  const existing = store.get(ledgerId);
  if (existing) {
    store.delete(ledgerId);
    store.set(ledgerId, existing);
    return existing;
  }

  const records: InternalAlphaReportDraftRuntimeArtifact[] = [];
  store.set(ledgerId, records);
  while (store.size > INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_LEDGER_COUNT) {
    const oldestLedgerId = store.keys().next().value;
    if (!oldestLedgerId) {
      break;
    }
    store.delete(oldestLedgerId);
  }
  return records;
}

function appendBoundedRecord(
  records: InternalAlphaReportDraftRuntimeArtifact[],
  artifact: InternalAlphaReportDraftRuntimeArtifact,
): void {
  const recordsToDrop = records.length - INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneJson(artifact));
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0 &&
    ledgerId.trim() === ledgerId &&
    ledgerId.length <= INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_LEDGER_ID_LENGTH &&
    /^[A-Za-z0-9:._-]+$/.test(ledgerId);
}

function serializedByteLength(artifact: InternalAlphaReportDraftRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

export function buildInternalAlphaReportDraftRuntimeArtifact(input: {
  readonly context: PipelineRunContext;
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
}): InternalAlphaReportDraftRuntimeArtifact {
  const internalAlphaReportDraft = buildInternalAlphaReportDraftDecision({
    internalAlphaReportResult: input.internalAlphaReportResult,
    boundaryVerdictExecution: input.boundaryVerdictExecution,
  });

  return {
    artifactVersion: INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: input.context.observabilityLedger.ledgerId,
    runId: input.context.runId,
    createdUtc: input.context.generatedUtc,
    source: "product_v2_orchestrator_after_internal_alpha_report_result",
    defaultProjection: "hash_length_provenance_only",
    explicitInspectionProjection: "authenticated_admin_can_request_draft_markdown",
    decisionHash: sha256Json(internalAlphaReportDraft),
    internalAlphaReportDraft,
  };
}

export function recordInternalAlphaReportDraftRuntimeArtifact(input: {
  readonly context: PipelineRunContext;
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
}): InternalAlphaReportDraftArtifactRecordResult {
  if (!ledgerIdIsBounded(input.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildInternalAlphaReportDraftRuntimeArtifact(input);
  if (serializedByteLength(artifact) > INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_MAX_SERIALIZED_BYTES) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readInternalAlphaReportDraftRuntimeArtifacts(
  ledgerId: string,
): readonly InternalAlphaReportDraftRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (ledger().get(ledgerId) ?? []).map(cloneJson);
}

export function readInternalAlphaReportDraftRuntimeArtifactDefaultProjections(
  ledgerId: string,
): readonly InternalAlphaReportDraftRuntimeArtifactDefaultProjection[] {
  return readInternalAlphaReportDraftRuntimeArtifacts(ledgerId).map(
    redactInternalAlphaReportDraftRuntimeArtifact,
  );
}

export function readInternalAlphaReportDraftRuntimeArtifactInspectionProjections(
  ledgerId: string,
): readonly InternalAlphaReportDraftRuntimeArtifactInspectionProjection[] {
  return readInternalAlphaReportDraftRuntimeArtifacts(ledgerId).map((artifact) => {
    const projection = redactInternalAlphaReportDraftRuntimeArtifact(artifact);
    return cloneJson({
      ...projection,
      inspectionProjection: "explicit_authenticated_admin_draft_markdown" as const,
      internalAlphaReportDraft: {
        ...projection.internalAlphaReportDraft,
        draftMarkdownReturned: true as const,
        draftMarkdown: artifact.internalAlphaReportDraft.draftMarkdown,
      },
    });
  });
}

export function clearInternalAlphaReportDraftRuntimeArtifacts(ledgerId?: string): void {
  const store = ledger();
  if (ledgerId) {
    store.delete(ledgerId);
    return;
  }
  store.clear();
}

export function redactInternalAlphaReportDraftRuntimeArtifact(
  artifact: InternalAlphaReportDraftRuntimeArtifact,
): InternalAlphaReportDraftRuntimeArtifactDefaultProjection {
  const draft = artifact.internalAlphaReportDraft;
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
    internalAlphaReportDraft: {
      decisionVersion: draft.decisionVersion,
      decisionIdReturned: false,
      decisionIdHash: sha256Json({ decisionId: draft.decisionId }),
      kind: draft.kind,
      status: draft.status,
      blockedReason: draft.blockedReason,
      damagedReason: draft.damagedReason,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: draft.defaultProjection,
      parent: draft.parent,
      draftMarkdownReturned: false,
      draftMarkdownHash: draft.draftMarkdownHash,
      draftMarkdownByteLength: draft.draftMarkdownByteLength,
      boundaryDraftCount: draft.boundaryDraftCount,
      verdictDraftCount: draft.verdictDraftCount,
      citedEvidenceItemRefCount: draft.citedEvidenceItemRefCount,
      citedEvidenceItemRefHashes: draft.citedEvidenceItemRefHashes,
      reportReviewReadiness: draft.reportReviewReadiness,
      redaction: draft.redaction,
      sideEffects: draft.sideEffects,
      retirementTrigger: draft.retirementTrigger,
      approvalPointer: draft.approvalPointer,
    },
  });
}
