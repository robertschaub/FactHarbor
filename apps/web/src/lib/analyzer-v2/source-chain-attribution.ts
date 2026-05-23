export const SOURCE_CHAIN_ATTRIBUTION_VERSION =
  "v2.highjump.source-chain-attribution.hj73";

const MAX_SOURCE_MATERIAL_REFS = 16;

type StructuralRecord = Record<string, unknown>;

export type SourceChainAttributionLossPointCandidate =
  | "query_planning"
  | "candidate_provider_network"
  | "source_material"
  | "extraction_input"
  | "w5_extraction"
  | "internal_report_writer"
  | "unknown";

export type SourceChainAttributionInput = {
  readonly runId: string;
  readonly createdUtc: string;
  readonly publicCutoverStatus: "blocked_precutover";
  readonly claimUnderstandingStatus?: string | null;
  readonly selectedAtomicClaimCount?: number | null;
  readonly queryPlanningInspection?: unknown;
  readonly candidateProviderNetwork?: unknown;
  readonly sourceCandidatePreview?: unknown;
  readonly sourceMaterialPageSummary?: unknown;
  readonly boundedTextAuthorization?: unknown;
  readonly extractionInputAuthorization?: unknown;
  readonly executionReadinessDenial?: unknown;
  readonly boundedEvidenceExtraction?: unknown;
  readonly internalReportWriter?: unknown;
};

export type SourceChainAttributionSourceMaterialRef = {
  readonly ordinal: number;
  readonly sourceMaterialRef: string | null;
  readonly providerId: string | null;
  readonly sourceMaterialKind: string | null;
  readonly textHash: string | null;
  readonly textByteLength: number | null;
  readonly textCharLength: number | null;
  readonly truncationApplied: boolean | null;
};

export type SourceChainAttributionSnapshot = {
  readonly version: typeof SOURCE_CHAIN_ATTRIBUTION_VERSION;
  readonly visibility: "internal_admin_only";
  readonly defaultProjection: "redacted_hash_length_provenance_only";
  readonly runId: string;
  readonly createdUtc: string;
  readonly publicCutoverStatus: "blocked_precutover";
  readonly stages: {
    readonly claimUnderstanding: {
      readonly status: string | null;
      readonly selectedAtomicClaimCount: number | null;
    };
    readonly queryPlanning: {
      readonly status: string | null;
      readonly runtimeStatus: string | null;
      readonly resultStatus: string | null;
      readonly queryEntryCount: number | null;
    };
    readonly candidateProviderNetwork: {
      readonly status: string | null;
      readonly providerAttemptCount: number | null;
      readonly candidateCount: number | null;
      readonly totalCandidateCount: number | null;
      readonly totalBytes: number | null;
    };
    readonly sourceCandidatePreview: {
      readonly status: string | null;
      readonly previewRecordCount: number | null;
    };
    readonly sourceMaterial: {
      readonly status: string | null;
      readonly recordCount: number | null;
      readonly materializedPreviewRecordCount: number | null;
      readonly attemptedFetchCount: number | null;
      readonly fetchDiagnosticCount: number | null;
      readonly totalBoundedTextBytes: number;
      readonly truncationCount: number;
      readonly sourceMaterialKindCounts: Readonly<Record<string, number>>;
      readonly providerIdCounts: Readonly<Record<string, number>>;
    };
    readonly w4: {
      readonly boundedTextStatus: string | null;
      readonly boundedTextSidecarCount: number | null;
      readonly extractionInputStatus: string | null;
      readonly extractionInputPacketCount: number | null;
      readonly executionReadinessStatus: string | null;
    };
    readonly w5: {
      readonly executionStatus: string | null;
      readonly extractionStatus: string | null;
      readonly evidenceItemCount: number | null;
      readonly sourceContentPacketCount: number | null;
      readonly parentPacketByteLength: number | null;
    };
    readonly reportWriter: {
      readonly status: string | null;
      readonly citedEvidenceItemRefCount: number | null;
      readonly reportMarkdownHash: string | null;
      readonly reportMarkdownByteLength: number | null;
    };
  };
  readonly sourceMaterialRefs: readonly SourceChainAttributionSourceMaterialRef[];
  readonly redaction: {
    readonly sourceTextReturned: false;
    readonly snippetsReturned: false;
    readonly summariesReturned: false;
    readonly titlesReturned: false;
    readonly urlsReturned: false;
    readonly pageKeysReturned: false;
    readonly providerPayloadsReturned: false;
    readonly rawQueryTextReturned: false;
    readonly promptTextReturned: false;
    readonly hiddenLedgerIdsReturned: false;
    readonly stackTracesReturned: false;
    readonly modelOutputReturned: false;
  };
  readonly lossPointCandidate: SourceChainAttributionLossPointCandidate;
};

function asRecord(value: unknown): StructuralRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as StructuralRecord
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNonNegativeNumber(value: unknown): number | null {
  return Number.isFinite(value) && Number(value) >= 0 ? Number(value) : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function recordArray(value: unknown): readonly StructuralRecord[] {
  return Array.isArray(value)
    ? value.map(asRecord).filter((record): record is StructuralRecord => record !== null)
    : [];
}

function countBy(records: readonly StructuralRecord[], key: string): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const record of records) {
    const value = readString(record[key]);
    if (!value) {
      continue;
    }
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function sumNumber(records: readonly StructuralRecord[], key: string): number {
  return records.reduce((total, record) => total + (readNonNegativeNumber(record[key]) ?? 0), 0);
}

function queryPlanningStage(inspectionInput: unknown): SourceChainAttributionSnapshot["stages"]["queryPlanning"] {
  const inspection = asRecord(inspectionInput);
  const summary = asRecord(inspection?.summary);
  return {
    status: readString(inspection?.status),
    runtimeStatus: readString(summary?.runtimeStatus),
    resultStatus: readString(summary?.resultStatus),
    queryEntryCount: readNonNegativeNumber(summary?.queryEntryCount),
  };
}

function candidateProviderNetworkStage(
  candidateProviderNetworkInput: unknown,
): SourceChainAttributionSnapshot["stages"]["candidateProviderNetwork"] {
  const decision = asRecord(candidateProviderNetworkInput);
  const telemetry = asRecord(decision?.telemetry);
  return {
    status: readString(decision?.status),
    providerAttemptCount: readNonNegativeNumber(telemetry?.providerAttemptCount),
    candidateCount: readNonNegativeNumber(telemetry?.candidateCount),
    totalCandidateCount: readNonNegativeNumber(telemetry?.totalCandidateCount),
    totalBytes: readNonNegativeNumber(telemetry?.totalBytes),
  };
}

function sourceCandidatePreviewStage(
  sourceCandidatePreviewInput: unknown,
): SourceChainAttributionSnapshot["stages"]["sourceCandidatePreview"] {
  const decision = asRecord(sourceCandidatePreviewInput);
  return {
    status: readString(decision?.status),
    previewRecordCount: readNonNegativeNumber(decision?.previewRecordCount),
  };
}

function sourceMaterialRecords(sourceMaterialPageSummaryInput: unknown): readonly StructuralRecord[] {
  const sourceMaterial = asRecord(sourceMaterialPageSummaryInput);
  return recordArray(sourceMaterial?.sourceMaterialRecords);
}

function sourceMaterialStage(
  sourceMaterialPageSummaryInput: unknown,
): SourceChainAttributionSnapshot["stages"]["sourceMaterial"] {
  const decision = asRecord(sourceMaterialPageSummaryInput);
  const records = sourceMaterialRecords(sourceMaterialPageSummaryInput);
  return {
    status: readString(decision?.status),
    recordCount: readNonNegativeNumber(decision?.sourceMaterialRecordCount),
    materializedPreviewRecordCount: readNonNegativeNumber(decision?.materializedPreviewRecordCount),
    attemptedFetchCount: readNonNegativeNumber(decision?.attemptedFetchCount),
    fetchDiagnosticCount: readNonNegativeNumber(decision?.fetchDiagnosticCount),
    totalBoundedTextBytes: sumNumber(records, "sourceMaterialTextByteLength"),
    truncationCount: records.filter((record) => record.truncationApplied === true).length,
    sourceMaterialKindCounts: countBy(records, "sourceMaterialKind"),
    providerIdCounts: countBy(records, "providerId"),
  };
}

function sourceMaterialRefs(
  sourceMaterialPageSummaryInput: unknown,
): readonly SourceChainAttributionSourceMaterialRef[] {
  return sourceMaterialRecords(sourceMaterialPageSummaryInput)
    .slice(0, MAX_SOURCE_MATERIAL_REFS)
    .map((record, index) => ({
      ordinal: index + 1,
      sourceMaterialRef: readString(record.sourceMaterialId),
      providerId: readString(record.providerId),
      sourceMaterialKind: readString(record.sourceMaterialKind),
      textHash: readString(record.sourceMaterialTextHash),
      textByteLength: readNonNegativeNumber(record.sourceMaterialTextByteLength),
      textCharLength: readNonNegativeNumber(record.sourceMaterialTextCharLength),
      truncationApplied: readBoolean(record.truncationApplied),
    }));
}

function w4Stage(input: SourceChainAttributionInput): SourceChainAttributionSnapshot["stages"]["w4"] {
  const boundedText = asRecord(input.boundedTextAuthorization);
  const extractionInput = asRecord(input.extractionInputAuthorization);
  const executionReadiness = asRecord(input.executionReadinessDenial);
  return {
    boundedTextStatus: readString(boundedText?.status),
    boundedTextSidecarCount: readNonNegativeNumber(boundedText?.boundedTextSidecarCount),
    extractionInputStatus: readString(extractionInput?.status),
    extractionInputPacketCount: readNonNegativeNumber(extractionInput?.extractionInputPacketCount),
    executionReadinessStatus: readString(executionReadiness?.status),
  };
}

function w5Stage(
  boundedEvidenceExtractionInput: unknown,
): SourceChainAttributionSnapshot["stages"]["w5"] {
  const decision = asRecord(boundedEvidenceExtractionInput);
  const parent = asRecord(decision?.parent);
  return {
    executionStatus: readString(decision?.status),
    extractionStatus: readString(decision?.extractionStatus),
    evidenceItemCount: readNonNegativeNumber(decision?.evidenceItemCount),
    sourceContentPacketCount: Array.isArray(parent?.sourceContentPackets) ? parent.sourceContentPackets.length : null,
    parentPacketByteLength: readNonNegativeNumber(parent?.parentPacketByteLength),
  };
}

function reportWriterStage(
  internalReportWriterInput: unknown,
): SourceChainAttributionSnapshot["stages"]["reportWriter"] {
  const decision = asRecord(internalReportWriterInput);
  return {
    status: readString(decision?.status),
    citedEvidenceItemRefCount: readNonNegativeNumber(decision?.citedEvidenceItemRefCount),
    reportMarkdownHash: readString(decision?.reportMarkdownHash),
    reportMarkdownByteLength: readNonNegativeNumber(decision?.reportMarkdownByteLength),
  };
}

function determineLossPoint(stages: SourceChainAttributionSnapshot["stages"]): SourceChainAttributionLossPointCandidate {
  if (
    stages.queryPlanning.status !== "inspected" ||
    stages.queryPlanning.resultStatus !== "accepted" ||
    (stages.queryPlanning.queryEntryCount ?? 0) === 0
  ) {
    return "query_planning";
  }
  if (
    !stages.candidateProviderNetwork.status ||
    (stages.candidateProviderNetwork.totalCandidateCount ?? 0) === 0
  ) {
    return "candidate_provider_network";
  }
  if (
    !stages.sourceMaterial.status ||
    (stages.sourceMaterial.recordCount ?? 0) === 0
  ) {
    return "source_material";
  }
  if (
    !stages.w4.extractionInputStatus ||
    (stages.w4.extractionInputPacketCount ?? 0) === 0
  ) {
    return "extraction_input";
  }
  if (
    !stages.w5.executionStatus ||
    (stages.w5.evidenceItemCount ?? 0) === 0
  ) {
    return "w5_extraction";
  }
  if (
    stages.reportWriter.status &&
    stages.reportWriter.status !== "internal_report_writer_draft_created"
  ) {
    return "internal_report_writer";
  }
  return "unknown";
}

export function buildSourceChainAttributionSnapshot(
  input: SourceChainAttributionInput,
): SourceChainAttributionSnapshot {
  const stages: SourceChainAttributionSnapshot["stages"] = {
    claimUnderstanding: {
      status: input.claimUnderstandingStatus ?? null,
      selectedAtomicClaimCount: input.selectedAtomicClaimCount ?? null,
    },
    queryPlanning: queryPlanningStage(input.queryPlanningInspection),
    candidateProviderNetwork: candidateProviderNetworkStage(input.candidateProviderNetwork),
    sourceCandidatePreview: sourceCandidatePreviewStage(input.sourceCandidatePreview),
    sourceMaterial: sourceMaterialStage(input.sourceMaterialPageSummary),
    w4: w4Stage(input),
    w5: w5Stage(input.boundedEvidenceExtraction),
    reportWriter: reportWriterStage(input.internalReportWriter),
  };

  return {
    version: SOURCE_CHAIN_ATTRIBUTION_VERSION,
    visibility: "internal_admin_only",
    defaultProjection: "redacted_hash_length_provenance_only",
    runId: input.runId,
    createdUtc: input.createdUtc,
    publicCutoverStatus: input.publicCutoverStatus,
    stages,
    sourceMaterialRefs: sourceMaterialRefs(input.sourceMaterialPageSummary),
    redaction: {
      sourceTextReturned: false,
      snippetsReturned: false,
      summariesReturned: false,
      titlesReturned: false,
      urlsReturned: false,
      pageKeysReturned: false,
      providerPayloadsReturned: false,
      rawQueryTextReturned: false,
      promptTextReturned: false,
      hiddenLedgerIdsReturned: false,
      stackTracesReturned: false,
      modelOutputReturned: false,
    },
    lossPointCandidate: determineLossPoint(stages),
  };
}
