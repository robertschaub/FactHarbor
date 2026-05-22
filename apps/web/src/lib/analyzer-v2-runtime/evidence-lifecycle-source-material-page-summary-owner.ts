import type {
  SourceAcquisitionCandidateProviderNetworkLoopDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import type {
  EvidenceLifecycleSourceCandidatePreviewDecision,
} from "./evidence-lifecycle-source-candidate-preview-owner";
import {
  SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
  SOURCE_CANDIDATE_PREVIEW_SERPER_PROVIDER_ID,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import {
  SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID,
  SOURCE_MATERIAL_PAGE_SUMMARY_MAX_FETCHES_PER_RUN,
  SOURCE_MATERIAL_PAGE_SUMMARY_FETCH_LOCATOR_VERSION,
  type SourceMaterialPageSummaryFetchLocator,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator";
import {
  SOURCE_MATERIAL_KIND_OPENALEX_WORK_ABSTRACT,
  SOURCE_MATERIAL_KIND_PROVIDER_SEARCH_RESULT_PREVIEW,
  SOURCE_MATERIAL_PAGE_SUMMARY_VERSION,
  buildSourceMaterialPageSummaryRecord,
  buildSourceMaterialSearchPreviewRecord,
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

const SOURCE_MATERIAL_SEARCH_PREVIEW_MAX_RECORDS_PER_RUN = 3;
const SOURCE_MATERIAL_SEARCH_PREVIEW_MAX_AGGREGATE_TEXT_BYTES = 2_048;

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

function matchingMaterializedPreviewRecords(
  previewDecision: EvidenceLifecycleSourceCandidatePreviewDecision,
): Map<string, EvidenceLifecycleSourceCandidatePreviewDecision["previewRecords"][number]> {
  return new Map(previewDecision.previewRecords
    .filter((record) => record.materializationStatus === "source_candidate_preview_materialized")
    .map((record) => [record.candidatePreviewId, record]));
}

function locatorDedupeKey(locator: SourceMaterialPageSummaryFetchLocator): string | null {
  if (!locator.pageKeyHash) {
    return null;
  }
  return `${locator.providerId}:${locator.pageKeyHash}`;
}

function eligibleLocators(
  previewDecision: EvidenceLifecycleSourceCandidatePreviewDecision,
  locators: readonly SourceMaterialPageSummaryFetchLocator[],
  maxFetches = SOURCE_MATERIAL_PAGE_SUMMARY_MAX_FETCHES_PER_RUN,
): readonly SourceMaterialPageSummaryFetchLocator[] {
  const acceptedPreviewRecords = matchingMaterializedPreviewRecords(previewDecision);
  const eligible: {
    readonly locator: SourceMaterialPageSummaryFetchLocator;
    readonly providerAttemptOrdinal: number;
    readonly candidateOrdinal: number;
    readonly locatorOrdinal: number;
  }[] = [];
  const seen = new Set<string>();
  for (const [locatorOrdinal, locator] of locators.entries()) {
    const dedupeKey = locatorDedupeKey(locator);
    const previewRecord = acceptedPreviewRecords.get(locator.candidatePreviewId);
    if (
      locator.eligibility !== "eligible_for_w3b_fetch"
      || locator.locatorRef === null
      || locator.encodedTitlePathSegment === null
      || previewRecord === undefined
      || dedupeKey === null
      || seen.has(dedupeKey)
    ) {
      continue;
    }
    seen.add(dedupeKey);
    eligible.push({
      locator,
      providerAttemptOrdinal: previewRecord.providerAttemptOrdinal,
      candidateOrdinal: previewRecord.candidateOrdinal,
      locatorOrdinal,
    });
  }

  const ordered = [...eligible].sort((left, right) =>
    left.providerAttemptOrdinal - right.providerAttemptOrdinal
    || left.candidateOrdinal - right.candidateOrdinal
    || left.locatorOrdinal - right.locatorOrdinal
  );
  const selected: typeof ordered = [];
  const selectedKeys = new Set<string>();
  const firstByProviderAttempt = new Map<number, (typeof ordered)[number]>();
  for (const item of ordered) {
    if (!firstByProviderAttempt.has(item.providerAttemptOrdinal)) {
      firstByProviderAttempt.set(item.providerAttemptOrdinal, item);
    }
  }
  for (const item of firstByProviderAttempt.values()) {
    selected.push(item);
    selectedKeys.add(item.locator.candidatePreviewId);
    if (selected.length >= maxFetches) {
      break;
    }
  }
  for (const item of ordered) {
    if (selected.length >= maxFetches) {
      break;
    }
    if (selectedKeys.has(item.locator.candidatePreviewId)) {
      continue;
    }
    selected.push(item);
    selectedKeys.add(item.locator.candidatePreviewId);
  }
  return selected.map((item) => item.locator);
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

function selectedOpenAlexRecords(
  records: readonly SourceMaterialPageSummaryRecord[],
  maxRecords = SOURCE_MATERIAL_PAGE_SUMMARY_MAX_FETCHES_PER_RUN,
): readonly SourceMaterialPageSummaryRecord[] {
  const selected: SourceMaterialPageSummaryRecord[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    if (
      record.providerId === "openalex"
      && record.sourceMaterialKind === SOURCE_MATERIAL_KIND_OPENALEX_WORK_ABSTRACT
      && record.sourceMaterialTextByteLength > 0
      && record.sourceMaterialTextByteLength <= 4_096
      && !seen.has(record.sourceMaterialTextHash)
    ) {
      selected.push(record);
      seen.add(record.sourceMaterialTextHash);
      if (selected.length >= maxRecords) {
        break;
      }
    }
  }
  return selected;
}

function selectedSearchPreviewRecords(
  previewDecision: EvidenceLifecycleSourceCandidatePreviewDecision,
  locators: readonly SourceMaterialPageSummaryFetchLocator[],
  maxRecords = SOURCE_MATERIAL_SEARCH_PREVIEW_MAX_RECORDS_PER_RUN,
): readonly SourceMaterialPageSummaryRecord[] {
  const acceptedPreviewRecords = matchingMaterializedPreviewRecords(previewDecision);
  const selected: SourceMaterialPageSummaryRecord[] = [];
  const seen = new Set<string>();
  let aggregateTextBytes = 0;
  for (const locator of locators) {
    const previewRecord = acceptedPreviewRecords.get(locator.candidatePreviewId);
    if (
      previewRecord === undefined
      || previewRecord.providerId !== SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID
      || previewRecord.locatorRef !== locator.locatorRef
    ) {
      continue;
    }
    const recordDecision = buildSourceMaterialSearchPreviewRecord({
      previewRecord,
      languageCode: locator.languageCode,
    });
    if (recordDecision.status !== "record_created") {
      continue;
    }
    const record = recordDecision.record;
    if (
      seen.has(record.sourceMaterialTextHash)
      || aggregateTextBytes + record.sourceMaterialTextByteLength >
        SOURCE_MATERIAL_SEARCH_PREVIEW_MAX_AGGREGATE_TEXT_BYTES
    ) {
      continue;
    }
    selected.push(record);
    seen.add(record.sourceMaterialTextHash);
    aggregateTextBytes += record.sourceMaterialTextByteLength;
    if (selected.length >= maxRecords) {
      break;
    }
  }
  return selected;
}

function selectedProvidedSearchPreviewRecords(
  records: readonly SourceMaterialPageSummaryRecord[],
  maxRecords = SOURCE_MATERIAL_SEARCH_PREVIEW_MAX_RECORDS_PER_RUN,
): readonly SourceMaterialPageSummaryRecord[] {
  const selected: SourceMaterialPageSummaryRecord[] = [];
  const seen = new Set<string>();
  let aggregateTextBytes = 0;
  for (const record of records) {
    if (
      record.providerId !== SOURCE_CANDIDATE_PREVIEW_SERPER_PROVIDER_ID
      || record.sourceMaterialKind !== SOURCE_MATERIAL_KIND_PROVIDER_SEARCH_RESULT_PREVIEW
      || record.sourceMaterialTextByteLength <= 0
      || record.sourceMaterialTextByteLength > 4_096
      || seen.has(record.sourceMaterialTextHash)
      || aggregateTextBytes + record.sourceMaterialTextByteLength >
        SOURCE_MATERIAL_SEARCH_PREVIEW_MAX_AGGREGATE_TEXT_BYTES
    ) {
      continue;
    }
    selected.push(record);
    seen.add(record.sourceMaterialTextHash);
    aggregateTextBytes += record.sourceMaterialTextByteLength;
    if (selected.length >= maxRecords) {
      break;
    }
  }
  return selected;
}

function mergedSourceMaterialRecords(params: {
  readonly openAlexRecords: readonly SourceMaterialPageSummaryRecord[];
  readonly webSearchPreviewRecords?: readonly SourceMaterialPageSummaryRecord[];
  readonly searchPreviewRecords?: readonly SourceMaterialPageSummaryRecord[];
  readonly wikimediaRecords: readonly SourceMaterialPageSummaryRecord[];
}): readonly SourceMaterialPageSummaryRecord[] {
  const openAlexRecords = selectedOpenAlexRecords(params.openAlexRecords);
  const strongRecordCount = openAlexRecords.length + params.wikimediaRecords.length;
  const webSearchPreviewRecords = selectedProvidedSearchPreviewRecords(params.webSearchPreviewRecords ?? []);
  const searchPreviewRecords = strongRecordCount > 0 ? params.searchPreviewRecords ?? [] : [];
  const merged: SourceMaterialPageSummaryRecord[] = [];
  const seen = new Set<string>();
  for (const record of [
    ...openAlexRecords,
    ...webSearchPreviewRecords,
    ...searchPreviewRecords,
    ...params.wikimediaRecords,
  ]) {
    if (seen.has(record.sourceMaterialTextHash)) {
      continue;
    }
    seen.add(record.sourceMaterialTextHash);
    merged.push(record);
    if (merged.length >= SOURCE_MATERIAL_PAGE_SUMMARY_MAX_FETCHES_PER_RUN) {
      break;
    }
  }
  return merged;
}

export async function runEvidenceLifecycleSourceMaterialPageSummaryDecision(params: {
  readonly networkDecision: SourceAcquisitionCandidateProviderNetworkLoopDecision;
  readonly previewDecision: EvidenceLifecycleSourceCandidatePreviewDecision;
  readonly fetchLocators: readonly SourceMaterialPageSummaryFetchLocator[];
  readonly lowLevelTransport?: SourceAcquisitionNetworkLowLevelTransport;
  readonly openAlexSourceMaterialRecords?: readonly SourceMaterialPageSummaryRecord[];
  readonly webSearchPreviewSourceMaterialRecords?: readonly SourceMaterialPageSummaryRecord[];
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

    const openAlexRecords = selectedOpenAlexRecords(params.openAlexSourceMaterialRecords ?? []);
    const wikimediaFetchBudget = Math.max(
      0,
      SOURCE_MATERIAL_PAGE_SUMMARY_MAX_FETCHES_PER_RUN - openAlexRecords.length,
    );
    const locators = eligibleLocators(params.previewDecision, params.fetchLocators, wikimediaFetchBudget);
    const searchPreviewRecords = selectedSearchPreviewRecords(params.previewDecision, locators);
    if (locators.length === 0) {
      const openAlexOnlyRecords = mergedSourceMaterialRecords({
        openAlexRecords: params.openAlexSourceMaterialRecords ?? [],
        webSearchPreviewRecords: params.webSearchPreviewSourceMaterialRecords ?? [],
        searchPreviewRecords: [],
        wikimediaRecords: [],
      });
      if (openAlexOnlyRecords.length > 0) {
        return baseDecision({
          status: "source_material_page_summary_completed",
          stopReason: "not_stopped",
          networkDecision: params.networkDecision,
          previewDecision: params.previewDecision,
          records: openAlexOnlyRecords,
          diagnostics: [],
          extraHttpCallMade: false,
        });
      }
      return baseDecision({
        status: "blocked_pre_source_material_page_summary",
        stopReason: "eligible_fetch_locator_missing",
        networkDecision: params.networkDecision,
        previewDecision: params.previewDecision,
      });
    }

    const diagnostics: EvidenceLifecycleSourceMaterialPageSummaryFetchDiagnostic[] = [];
    const records: SourceMaterialPageSummaryRecord[] = [];
    let firstRecordStopReason: SourceMaterialPageSummaryBodyStatus | null = null;
    for (const [index, locator] of locators.entries()) {
      const attemptOrdinal = index + 1;
      const transportOutcome = await executeEvidenceLifecycleSourceMaterialPageSummaryTransport({
        locator,
        attemptOrdinal,
        lowLevelTransport: params.lowLevelTransport,
      });
      diagnostics.push(transportOutcome.diagnostic);
      if (transportOutcome.status !== "success") {
        const mergedRecords = mergedSourceMaterialRecords({
          openAlexRecords: params.openAlexSourceMaterialRecords ?? [],
          webSearchPreviewRecords: params.webSearchPreviewSourceMaterialRecords ?? [],
          searchPreviewRecords,
          wikimediaRecords: records,
        });
        if (mergedRecords.length > 0) {
          return baseDecision({
            status: "source_material_page_summary_completed",
            stopReason: "not_stopped",
            networkDecision: params.networkDecision,
            previewDecision: params.previewDecision,
            attemptedFetchCount: diagnostics.length,
            records: mergedRecords,
            diagnostics,
            extraHttpCallMade: true,
          });
        }
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
        firstRecordStopReason ??= recordDecision.bodyStatus;
        continue;
      }
      records.push(recordDecision.record);
    }

    const mergedRecords = mergedSourceMaterialRecords({
      openAlexRecords: params.openAlexSourceMaterialRecords ?? [],
      webSearchPreviewRecords: params.webSearchPreviewSourceMaterialRecords ?? [],
      searchPreviewRecords,
      wikimediaRecords: records,
    });
    if (mergedRecords.length === 0) {
      return baseDecision({
        status: "source_material_page_summary_failed_structural",
        stopReason: firstRecordStopReason ?? "source_material_extract_missing",
        networkDecision: params.networkDecision,
        previewDecision: params.previewDecision,
        attemptedFetchCount: diagnostics.length,
        records,
        diagnostics,
        extraHttpCallMade: true,
      });
    }
    return baseDecision({
      status: "source_material_page_summary_completed",
      stopReason: "not_stopped",
      networkDecision: params.networkDecision,
      previewDecision: params.previewDecision,
      attemptedFetchCount: diagnostics.length,
      records: mergedRecords,
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
