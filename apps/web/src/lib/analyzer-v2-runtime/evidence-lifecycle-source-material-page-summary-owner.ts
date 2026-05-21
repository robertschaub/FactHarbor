import type {
  SourceAcquisitionCandidateProviderNetworkLoopDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import type {
  EvidenceLifecycleSourceCandidatePreviewDecision,
} from "./evidence-lifecycle-source-candidate-preview-owner";
import {
  SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID,
  SOURCE_MATERIAL_PAGE_SUMMARY_MAX_FETCHES_PER_RUN,
  SOURCE_MATERIAL_PAGE_SUMMARY_FETCH_LOCATOR_VERSION,
  type SourceMaterialPageSummaryFetchLocator,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator";
import {
  SOURCE_MATERIAL_PAGE_SUMMARY_VERSION,
  buildSourceMaterialPageSummaryRecord,
  type SourceMaterialPageSummaryBodyStatus,
  type SourceMaterialPageSummaryRecord,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material";
import {
  executeEvidenceLifecycleSourceMaterialPageSummaryTransport,
  type EvidenceLifecycleSourceMaterialPageSummaryFetchDiagnostic,
  type EvidenceLifecycleSourceMaterialPageSummaryStopReason as TransportStopReason,
  type SourceAcquisitionNetworkLowLevelTransport,
} from "./evidence-lifecycle-source-material-page-summary-transport";
import {
  markEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision,
} from "./evidence-lifecycle-source-material-page-summary-provenance";

export type EvidenceLifecycleSourceMaterialPageSummaryStatus =
  | "source_material_page_summary_completed"
  | "blocked_pre_source_material_page_summary"
  | "source_material_page_summary_failed_structural"
  | "source_material_page_summary_timed_out"
  | "source_material_page_summary_cancelled"
  | "source_material_page_summary_damaged_structural";

export type EvidenceLifecycleSourceMaterialPageSummaryStopReason =
  | TransportStopReason
  | SourceMaterialPageSummaryBodyStatus
  | "candidate_provider_network_not_completed"
  | "source_candidate_preview_not_ready"
  | "materialized_preview_missing"
  | "eligible_fetch_locator_missing"
  | "fetch_locator_stale_or_not_runtime_owned"
  | "source_material_structural_exception";

export type EvidenceLifecycleSourceMaterialPageSummaryDecision = {
  readonly sourceMaterialVersion: typeof SOURCE_MATERIAL_PAGE_SUMMARY_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly status: EvidenceLifecycleSourceMaterialPageSummaryStatus;
  readonly stopReason: EvidenceLifecycleSourceMaterialPageSummaryStopReason;
  readonly candidateProviderNetworkStatus: SourceAcquisitionCandidateProviderNetworkLoopDecision["status"];
  readonly sourceCandidatePreviewStatus: EvidenceLifecycleSourceCandidatePreviewDecision["status"];
  readonly sourceCandidatePreviewRecordCount: number;
  readonly materializedPreviewRecordCount: number;
  readonly attemptedFetchCount: number;
  readonly sourceMaterialRecordCount: number;
  readonly fetchDiagnosticCount: number;
  readonly sourceMaterialRecords: readonly SourceMaterialPageSummaryRecord[];
  readonly fetchDiagnostics: readonly EvidenceLifecycleSourceMaterialPageSummaryFetchDiagnostic[];
  readonly sourceMaterialEndpointId: typeof SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID;
  readonly locatorVersion: typeof SOURCE_MATERIAL_PAGE_SUMMARY_FETCH_LOCATOR_VERSION;
  readonly extractionInput: null;
  readonly evidenceCorpus: null;
  readonly evidenceItems: readonly [];
  readonly productExecution: {
    readonly candidateProviderNetworkObserved: boolean;
    readonly sourceCandidatePreviewObserved: boolean;
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
  readonly downstreamGate: "source_material_to_evidence_corpus_gate_closed";
  readonly publicCutoverStatus: "blocked_precutover";
};

function noExecutionProductExecution(overrides: {
  readonly networkObserved?: boolean;
  readonly previewObserved?: boolean;
  readonly extraHttpCallMade?: boolean;
  readonly sourceMaterialCreated?: boolean;
} = {}): EvidenceLifecycleSourceMaterialPageSummaryDecision["productExecution"] {
  return {
    candidateProviderNetworkObserved: overrides.networkObserved ?? false,
    sourceCandidatePreviewObserved: overrides.previewObserved ?? false,
    extraHttpCallMade: overrides.extraHttpCallMade ?? false,
    contentDereferenceCalled: overrides.extraHttpCallMade ?? false,
    parserExecuted: false,
    cacheRead: false,
    cacheWrite: false,
    storageWrite: false,
    sourceReliabilityCalled: false,
    sourceMaterialCreated: overrides.sourceMaterialCreated ?? false,
    evidenceCorpusCreated: false,
    evidenceItemGenerated: false,
    warningGenerated: false,
    reportGenerated: false,
    verdictGenerated: false,
    confidenceGenerated: false,
    publicSurfaceWritten: false,
  };
}

function baseDecision(params: {
  readonly status: EvidenceLifecycleSourceMaterialPageSummaryStatus;
  readonly stopReason: EvidenceLifecycleSourceMaterialPageSummaryStopReason;
  readonly networkDecision: SourceAcquisitionCandidateProviderNetworkLoopDecision;
  readonly previewDecision: EvidenceLifecycleSourceCandidatePreviewDecision;
  readonly attemptedFetchCount?: number;
  readonly records?: readonly SourceMaterialPageSummaryRecord[];
  readonly diagnostics?: readonly EvidenceLifecycleSourceMaterialPageSummaryFetchDiagnostic[];
  readonly extraHttpCallMade?: boolean;
}): EvidenceLifecycleSourceMaterialPageSummaryDecision {
  const records = params.records ?? [];
  const diagnostics = params.diagnostics ?? [];
  return markEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision({
    sourceMaterialVersion: SOURCE_MATERIAL_PAGE_SUMMARY_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: params.status,
    stopReason: params.stopReason,
    candidateProviderNetworkStatus: params.networkDecision.status,
    sourceCandidatePreviewStatus: params.previewDecision.status,
    sourceCandidatePreviewRecordCount: params.previewDecision.previewRecordCount,
    materializedPreviewRecordCount: params.previewDecision.materializedPreviewRecordCount,
    attemptedFetchCount: params.attemptedFetchCount ?? 0,
    sourceMaterialRecordCount: records.length,
    fetchDiagnosticCount: diagnostics.length,
    sourceMaterialRecords: records,
    fetchDiagnostics: diagnostics,
    sourceMaterialEndpointId: SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID,
    locatorVersion: SOURCE_MATERIAL_PAGE_SUMMARY_FETCH_LOCATOR_VERSION,
    extractionInput: null,
    evidenceCorpus: null,
    evidenceItems: [],
    productExecution: noExecutionProductExecution({
      networkObserved: params.networkDecision.status === "candidate_provider_network_completed",
      previewObserved: params.previewDecision.previewRecordCount > 0,
      extraHttpCallMade: params.extraHttpCallMade ?? false,
      sourceMaterialCreated: records.length > 0,
    }),
    downstreamGate: "source_material_to_evidence_corpus_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  });
}

function matchingMaterializedPreviewIds(
  previewDecision: EvidenceLifecycleSourceCandidatePreviewDecision,
): Set<string> {
  return new Set(previewDecision.previewRecords
    .filter((record) => record.materializationStatus === "source_candidate_preview_materialized")
    .map((record) => record.candidatePreviewId));
}

function locatorDedupeKey(locator: SourceMaterialPageSummaryFetchLocator): string | null {
  if (!locator.locatorRef || !locator.pageKeyHash) {
    return null;
  }
  return `${locator.providerId}:${locator.locatorRef}:${locator.pageKeyHash}`;
}

function eligibleLocators(
  previewDecision: EvidenceLifecycleSourceCandidatePreviewDecision,
  locators: readonly SourceMaterialPageSummaryFetchLocator[],
): readonly SourceMaterialPageSummaryFetchLocator[] {
  const acceptedPreviewIds = matchingMaterializedPreviewIds(previewDecision);
  const selected: SourceMaterialPageSummaryFetchLocator[] = [];
  const seen = new Set<string>();
  for (const locator of locators) {
    const dedupeKey = locatorDedupeKey(locator);
    if (
      locator.eligibility !== "eligible_for_w3b_fetch"
      || locator.locatorRef === null
      || locator.encodedTitlePathSegment === null
      || !acceptedPreviewIds.has(locator.candidatePreviewId)
      || dedupeKey === null
      || seen.has(dedupeKey)
    ) {
      continue;
    }
    seen.add(dedupeKey);
    selected.push(locator);
    if (selected.length >= SOURCE_MATERIAL_PAGE_SUMMARY_MAX_FETCHES_PER_RUN) {
      break;
    }
  }
  return selected;
}

function statusFromTransportStatus(
  status: EvidenceLifecycleSourceMaterialPageSummaryFetchDiagnostic["status"],
): EvidenceLifecycleSourceMaterialPageSummaryStatus {
  if (status === "timed_out") {
    return "source_material_page_summary_timed_out";
  }
  if (status === "cancelled") {
    return "source_material_page_summary_cancelled";
  }
  return "source_material_page_summary_failed_structural";
}

export async function runEvidenceLifecycleSourceMaterialPageSummaryDecision(params: {
  readonly networkDecision: SourceAcquisitionCandidateProviderNetworkLoopDecision;
  readonly previewDecision: EvidenceLifecycleSourceCandidatePreviewDecision;
  readonly fetchLocators: readonly SourceMaterialPageSummaryFetchLocator[];
  readonly lowLevelTransport?: SourceAcquisitionNetworkLowLevelTransport;
}): Promise<EvidenceLifecycleSourceMaterialPageSummaryDecision> {
  try {
    if (params.networkDecision.status !== "candidate_provider_network_completed") {
      return baseDecision({
        status: "blocked_pre_source_material_page_summary",
        stopReason: "candidate_provider_network_not_completed",
        networkDecision: params.networkDecision,
        previewDecision: params.previewDecision,
      });
    }

    if (
      params.previewDecision.previewRecordCount === 0
      || (
        params.previewDecision.status !== "source_candidate_preview_materialized"
        && params.previewDecision.status !== "source_candidate_preview_partial"
      )
    ) {
      return baseDecision({
        status: "blocked_pre_source_material_page_summary",
        stopReason: "source_candidate_preview_not_ready",
        networkDecision: params.networkDecision,
        previewDecision: params.previewDecision,
      });
    }

    if (params.previewDecision.materializedPreviewRecordCount === 0) {
      return baseDecision({
        status: "blocked_pre_source_material_page_summary",
        stopReason: "materialized_preview_missing",
        networkDecision: params.networkDecision,
        previewDecision: params.previewDecision,
      });
    }

    const locators = eligibleLocators(params.previewDecision, params.fetchLocators);
    if (locators.length === 0) {
      return baseDecision({
        status: "blocked_pre_source_material_page_summary",
        stopReason: "eligible_fetch_locator_missing",
        networkDecision: params.networkDecision,
        previewDecision: params.previewDecision,
      });
    }

    const diagnostics: EvidenceLifecycleSourceMaterialPageSummaryFetchDiagnostic[] = [];
    const records: SourceMaterialPageSummaryRecord[] = [];
    for (const [index, locator] of locators.entries()) {
      const attemptOrdinal = index + 1;
      const transportOutcome = await executeEvidenceLifecycleSourceMaterialPageSummaryTransport({
        locator,
        attemptOrdinal,
        lowLevelTransport: params.lowLevelTransport,
      });
      diagnostics.push(transportOutcome.diagnostic);
      if (transportOutcome.status !== "success") {
        return baseDecision({
          status: statusFromTransportStatus(transportOutcome.diagnostic.status),
          stopReason: transportOutcome.diagnostic.stopReason,
          networkDecision: params.networkDecision,
          previewDecision: params.previewDecision,
          attemptedFetchCount: diagnostics.length,
          records,
          diagnostics,
          extraHttpCallMade: true,
        });
      }

      const recordDecision = buildSourceMaterialPageSummaryRecord({
        locator,
        responseJson: transportOutcome.json,
        diagnostic: transportOutcome.diagnostic,
      });
      if (recordDecision.status !== "record_created") {
        return baseDecision({
          status: "source_material_page_summary_failed_structural",
          stopReason: recordDecision.bodyStatus,
          networkDecision: params.networkDecision,
          previewDecision: params.previewDecision,
          attemptedFetchCount: diagnostics.length,
          records,
          diagnostics,
          extraHttpCallMade: true,
        });
      }
      records.push(recordDecision.record);
    }

    return baseDecision({
      status: "source_material_page_summary_completed",
      stopReason: "not_stopped",
      networkDecision: params.networkDecision,
      previewDecision: params.previewDecision,
      attemptedFetchCount: diagnostics.length,
      records,
      diagnostics,
      extraHttpCallMade: true,
    });
  } catch {
    return baseDecision({
      status: "source_material_page_summary_damaged_structural",
      stopReason: "source_material_structural_exception",
      networkDecision: params.networkDecision,
      previewDecision: params.previewDecision,
    });
  }
}
