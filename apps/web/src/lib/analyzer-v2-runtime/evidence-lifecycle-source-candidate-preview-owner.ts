import type {
  SourceAcquisitionCandidateProviderNetworkLoopDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import {
  SOURCE_CANDIDATE_PREVIEW_MAX_AGGREGATE_TEXT_BYTES,
  SOURCE_CANDIDATE_PREVIEW_MAX_RECORDS_PER_RUN,
  SOURCE_CANDIDATE_PREVIEW_VERSION,
  type SourceCandidatePreviewMaterializationStatus,
  type SourceCandidatePreviewProjection,
  type SourceCandidatePreviewStopReason,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";

export type EvidenceLifecycleSourceCandidatePreviewDecision = {
  readonly previewVersion: typeof SOURCE_CANDIDATE_PREVIEW_VERSION;
  readonly visibility: "internal_admin_only";
  readonly status: SourceCandidatePreviewMaterializationStatus;
  readonly stopReason: SourceCandidatePreviewStopReason;
  readonly candidateProviderNetworkStatus: SourceAcquisitionCandidateProviderNetworkLoopDecision["status"];
  readonly candidateProviderNetworkCandidateCount: number;
  readonly previewRecordCount: number;
  readonly materializedPreviewRecordCount: number;
  readonly partialPreviewRecordCount: number;
  readonly blockedPreviewRecordCount: number;
  readonly aggregatePreviewTextBytes: number;
  readonly previewRecords: readonly SourceCandidatePreviewProjection[];
  readonly sourceMaterial: null;
  readonly extractionInput: null;
  readonly evidenceCorpus: null;
  readonly downstreamGate: "source_candidate_preview_to_source_material_gate_closed";
  readonly publicCutoverStatus: "blocked_precutover";
};

function previewTextBytes(record: SourceCandidatePreviewProjection): number {
  return record.fieldByteLengths.titlePreviewText
    + record.fieldByteLengths.excerptPreviewText
    + record.fieldByteLengths.descriptionPreviewText;
}

function blocked(
  status: SourceCandidatePreviewMaterializationStatus,
  stopReason: SourceCandidatePreviewStopReason,
  networkDecision: SourceAcquisitionCandidateProviderNetworkLoopDecision,
): EvidenceLifecycleSourceCandidatePreviewDecision {
  return {
    previewVersion: SOURCE_CANDIDATE_PREVIEW_VERSION,
    visibility: "internal_admin_only",
    status,
    stopReason,
    candidateProviderNetworkStatus: networkDecision.status,
    candidateProviderNetworkCandidateCount: networkDecision.telemetry.candidateCount,
    previewRecordCount: 0,
    materializedPreviewRecordCount: 0,
    partialPreviewRecordCount: 0,
    blockedPreviewRecordCount: 0,
    aggregatePreviewTextBytes: 0,
    previewRecords: [],
    sourceMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
    downstreamGate: "source_candidate_preview_to_source_material_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  };
}

function boundedRecords(
  previewProjections: readonly SourceCandidatePreviewProjection[],
): {
  readonly records: readonly SourceCandidatePreviewProjection[];
  readonly aggregatePreviewTextBytes: number;
  readonly aggregateCapApplied: boolean;
} {
  const records: SourceCandidatePreviewProjection[] = [];
  let aggregatePreviewTextBytes = 0;
  let aggregateCapApplied = false;
  for (const record of previewProjections.slice(0, SOURCE_CANDIDATE_PREVIEW_MAX_RECORDS_PER_RUN)) {
    const recordBytes = previewTextBytes(record);
    if (aggregatePreviewTextBytes + recordBytes > SOURCE_CANDIDATE_PREVIEW_MAX_AGGREGATE_TEXT_BYTES) {
      aggregateCapApplied = true;
      continue;
    }
    aggregatePreviewTextBytes += recordBytes;
    records.push(record);
  }
  return { records, aggregatePreviewTextBytes, aggregateCapApplied };
}

export function buildEvidenceLifecycleSourceCandidatePreviewDecision(params: {
  readonly networkDecision: SourceAcquisitionCandidateProviderNetworkLoopDecision;
  readonly previewProjections: readonly SourceCandidatePreviewProjection[];
}): EvidenceLifecycleSourceCandidatePreviewDecision {
  if (params.networkDecision.status !== "candidate_provider_network_completed") {
    return blocked(
      "blocked_pre_source_candidate_preview",
      "preview_not_built_pre_source_candidate_preview",
      params.networkDecision,
    );
  }

  const { records, aggregatePreviewTextBytes, aggregateCapApplied } = boundedRecords(params.previewProjections);
  if (params.networkDecision.telemetry.candidateCount > 0 && records.length === 0) {
    return blocked(
      "source_candidate_preview_damaged_structural",
      "source_candidate_preview_structural_failure",
      params.networkDecision,
    );
  }

  const materializedPreviewRecordCount = records.filter((record) =>
    record.materializationStatus === "source_candidate_preview_materialized"
  ).length;
  const partialPreviewRecordCount = records.filter((record) =>
    record.materializationStatus === "source_candidate_preview_partial"
  ).length;
  const blockedPreviewRecordCount = records.length - materializedPreviewRecordCount - partialPreviewRecordCount;
  const status: SourceCandidatePreviewMaterializationStatus =
    blockedPreviewRecordCount === 0 && !aggregateCapApplied
      ? partialPreviewRecordCount > 0
        ? "source_candidate_preview_partial"
        : "source_candidate_preview_materialized"
      : "source_candidate_preview_partial";

  return {
    previewVersion: SOURCE_CANDIDATE_PREVIEW_VERSION,
    visibility: "internal_admin_only",
    status,
    stopReason: aggregateCapApplied ? "aggregate_preview_text_cap_applied" : "not_stopped",
    candidateProviderNetworkStatus: params.networkDecision.status,
    candidateProviderNetworkCandidateCount: params.networkDecision.telemetry.candidateCount,
    previewRecordCount: records.length,
    materializedPreviewRecordCount,
    partialPreviewRecordCount,
    blockedPreviewRecordCount,
    aggregatePreviewTextBytes,
    previewRecords: records,
    sourceMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
    downstreamGate: "source_candidate_preview_to_source_material_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  };
}
