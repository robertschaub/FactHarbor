import {
  type SourceAcquisitionCandidateProviderAttemptRequest,
  type SourceAcquisitionCandidateProviderAttemptResult,
  type SourceAcquisitionCandidateProviderBoundary,
  type SourceAcquisitionHiddenCandidateRecord,
} from "./source-acquisition-candidate-envelope";
import {
  validateSourceAcquisitionNetworkBudgetSnapshot,
  validateSourceAcquisitionNetworkEndpointSnapshot,
  validateSourceAcquisitionNetworkRequestEnvelope,
  type SourceAcquisitionNetworkBudgetSnapshot,
  type SourceAcquisitionNetworkEndpointSnapshot,
  type SourceAcquisitionNetworkHiddenDiagnostic,
  type SourceAcquisitionNetworkRequestEnvelope,
  type SourceAcquisitionNetworkStopReason,
  type SourceAcquisitionNetworkTransportOutcome,
} from "./source-acquisition-network-envelope";
import {
  isSourceAcquisitionNetworkAuthority,
  readSourceAcquisitionNetworkAuthoritySnapshot,
  type SourceAcquisitionNetworkAuthority,
} from "./source-acquisition-network-authority";
import {
  executeSourceAcquisitionNetworkTransport,
  type SourceAcquisitionNetworkCandidateProjectionInput,
  type SourceAcquisitionNetworkLowLevelTransport,
} from "./source-acquisition-network-transport";
import {
  buildSourceCandidatePreviewProjection,
  type SourceCandidatePreviewProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import {
  buildSourceMaterialPageSummaryFetchLocator,
  SOURCE_MATERIAL_PAGE_SUMMARY_DEFAULT_LANGUAGE_CODE,
  type SourceMaterialPageSummaryFetchLocator,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator";
import {
  buildOpenAlexAbstractSourceMaterialRecord,
  OPENALEX_PROVIDER_ID,
  OPENALEX_WORKS_ENDPOINT_ID,
  OPENALEX_WORKS_SELECT_FIELDS,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/openalex-abstract-source-material";
import type {
  SourceMaterialPageSummaryRecord,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material";

type OpenAlexSourceMaterialQueryEntry = {
  readonly queryId: string;
  readonly retrievalPolicyKey: string;
  readonly queryText: string;
};

export type SourceAcquisitionCandidateNetworkProviderFactory = {
  readonly buildProvider: () => SourceAcquisitionCandidateProviderBoundary;
};

export const SOURCE_ACQUISITION_NETWORK_ATTEMPT_TELEMETRY_VERSION =
  "v2.source-acquisition.provider-network-attempt-telemetry.7n3b2-t1";

export type SourceAcquisitionNetworkAttemptTelemetryRecord = {
  readonly telemetryVersion: typeof SOURCE_ACQUISITION_NETWORK_ATTEMPT_TELEMETRY_VERSION;
  readonly visibility: "internal_only";
  readonly providerId: string;
  readonly endpointId: string;
  readonly attemptOrdinal: number;
  readonly structuralStatus: SourceAcquisitionCandidateProviderAttemptResult["structuralStatus"];
  readonly stopReason: SourceAcquisitionNetworkStopReason;
  readonly durationMs: number;
  readonly timeoutMs: number;
  readonly dnsAddressCount: number;
  readonly selectedAddressFamily: SourceAcquisitionNetworkHiddenDiagnostic["selectedAddressFamily"];
  readonly finalAddressValidation: SourceAcquisitionNetworkHiddenDiagnostic["finalAddressValidation"];
  readonly responseStatusCodeCategory: SourceAcquisitionNetworkHiddenDiagnostic["responseStatusCodeCategory"];
  readonly contentTypeState: SourceAcquisitionNetworkHiddenDiagnostic["contentTypeState"];
  readonly transportFailureClass: SourceAcquisitionNetworkHiddenDiagnostic["transportFailureClass"];
  readonly transportFailurePhase: SourceAcquisitionNetworkHiddenDiagnostic["transportFailurePhase"];
  readonly transportErrorShape: SourceAcquisitionNetworkHiddenDiagnostic["transportErrorShape"];
  readonly nodeErrorCodeCategory: SourceAcquisitionNetworkHiddenDiagnostic["nodeErrorCodeCategory"];
  readonly candidateCount: number;
  readonly compressedBytes: number;
  readonly decompressedBytes: number;
  readonly byteCountState: "observed" | "not_reached";
  readonly rawPayloadIncluded: false;
  readonly secretIncluded: false;
  readonly publicPayloadIncluded: false;
  readonly errorTraceIncluded: false;
  readonly cacheKeyConstructed: false;
  readonly sourceReliabilityTouched: false;
};

type FactoryParams = {
  readonly authority: SourceAcquisitionNetworkAuthority;
  readonly endpoints: readonly SourceAcquisitionNetworkEndpointSnapshot[];
  readonly budget: SourceAcquisitionNetworkBudgetSnapshot;
  readonly lowLevelTransport?: SourceAcquisitionNetworkLowLevelTransport;
  readonly attemptTelemetrySink?: (record: SourceAcquisitionNetworkAttemptTelemetryRecord) => void;
  readonly candidatePreviewProjectionSink?: (projection: SourceCandidatePreviewProjection) => void;
  readonly sourceMaterialPageSummaryFetchLocatorSink?: (locator: SourceMaterialPageSummaryFetchLocator) => void;
  readonly sourceMaterialPageSummaryLanguageCode?: string;
};

type FactoryState =
  | {
      readonly status: "ready";
      readonly authority: SourceAcquisitionNetworkAuthority;
      readonly endpoints: readonly SourceAcquisitionNetworkEndpointSnapshot[];
      readonly budget: SourceAcquisitionNetworkBudgetSnapshot;
      readonly lowLevelTransport?: SourceAcquisitionNetworkLowLevelTransport;
    }
  | {
      readonly status: "blocked";
      readonly reason: "authority_invalid" | "endpoint_invalid" | "budget_invalid";
    };

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function providerAttemptId(index: number): string {
  return `ATT_${index}`;
}

function finiteNonNegativeInteger(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}

function byteCountState(outcome: SourceAcquisitionNetworkTransportOutcome): "observed" | "not_reached" {
  return outcome.diagnostic.contentTypeState === "not_reached" ? "not_reached" : "observed";
}

function telemetryFromOutcome(params: {
  readonly endpoint: SourceAcquisitionNetworkEndpointSnapshot;
  readonly attemptOrdinal: number;
  readonly structuralStatus: SourceAcquisitionCandidateProviderAttemptResult["structuralStatus"];
  readonly candidateCount: number;
  readonly timeoutMs: number;
  readonly outcome: SourceAcquisitionNetworkTransportOutcome;
}): SourceAcquisitionNetworkAttemptTelemetryRecord {
  const state = byteCountState(params.outcome);
  return {
    telemetryVersion: SOURCE_ACQUISITION_NETWORK_ATTEMPT_TELEMETRY_VERSION,
    visibility: "internal_only",
    providerId: params.endpoint.providerId,
    endpointId: params.endpoint.endpointId,
    attemptOrdinal: finiteNonNegativeInteger(params.attemptOrdinal),
    structuralStatus: params.structuralStatus,
    stopReason: params.outcome.diagnostic.stopReason,
    durationMs: finiteNonNegativeInteger(params.outcome.diagnostic.durationMs),
    timeoutMs: finiteNonNegativeInteger(params.timeoutMs),
    dnsAddressCount: finiteNonNegativeInteger(params.outcome.diagnostic.dnsAddressCount),
    selectedAddressFamily: params.outcome.diagnostic.selectedAddressFamily,
    finalAddressValidation: params.outcome.diagnostic.finalAddressValidation,
    responseStatusCodeCategory: params.outcome.diagnostic.responseStatusCodeCategory,
    contentTypeState: params.outcome.diagnostic.contentTypeState,
    transportFailureClass: params.outcome.diagnostic.transportFailureClass,
    transportFailurePhase: params.outcome.diagnostic.transportFailurePhase,
    transportErrorShape: params.outcome.diagnostic.transportErrorShape,
    nodeErrorCodeCategory: params.outcome.diagnostic.nodeErrorCodeCategory,
    candidateCount: finiteNonNegativeInteger(params.candidateCount),
    compressedBytes: state === "observed" ? finiteNonNegativeInteger(params.outcome.diagnostic.compressedBytes) : 0,
    decompressedBytes: state === "observed" ? finiteNonNegativeInteger(params.outcome.diagnostic.decompressedBytes) : 0,
    byteCountState: state,
    rawPayloadIncluded: false,
    secretIncluded: false,
    publicPayloadIncluded: false,
    errorTraceIncluded: false,
    cacheKeyConstructed: false,
    sourceReliabilityTouched: false,
  };
}

function emitTelemetry(
  sink: FactoryParams["attemptTelemetrySink"],
  record: SourceAcquisitionNetworkAttemptTelemetryRecord,
): void {
  if (!sink) {
    return;
  }
  try {
    sink(record);
  } catch {
    // Telemetry is observational only and must not affect provider/network behavior.
  }
}

function emitCandidatePreviewProjection(
  sink: FactoryParams["candidatePreviewProjectionSink"],
  projection: SourceCandidatePreviewProjection,
): void {
  if (!sink) {
    return;
  }
  try {
    sink(projection);
  } catch {
    // W3-A preview artifacts are observational only and must not affect provider/network behavior.
  }
}

function emitSourceMaterialPageSummaryFetchLocator(
  sink: FactoryParams["sourceMaterialPageSummaryFetchLocatorSink"],
  locator: SourceMaterialPageSummaryFetchLocator,
): void {
  if (!sink) {
    return;
  }
  try {
    sink(locator);
  } catch {
    // W3-B fetch locators are runtime-only and must not affect provider/network behavior.
  }
}

function failureResult(
  request: SourceAcquisitionCandidateProviderAttemptRequest,
  attemptId: string,
  structuralStatus: Exclude<SourceAcquisitionCandidateProviderAttemptResult["structuralStatus"], "success">,
  durationMs = 0,
): SourceAcquisitionCandidateProviderAttemptResult {
  return {
    queryId: request.queryId,
    providerId: request.allowedProviderIds[0] ?? "provider_unavailable",
    providerAttemptId: attemptId,
    structuralStatus,
    durationMs,
    candidates: [],
    sanitizedProviderTelemetry: {
      rawPayloadIncluded: false,
      secretIncluded: false,
      publicPayloadIncluded: false,
    },
  };
}

function endpointForRequest(
  endpoints: readonly SourceAcquisitionNetworkEndpointSnapshot[],
  request: SourceAcquisitionCandidateProviderAttemptRequest,
): SourceAcquisitionNetworkEndpointSnapshot | null {
  return endpoints.find((endpoint) => request.allowedProviderIds.includes(endpoint.providerId)) ?? null;
}

function requestParameterValue(
  source: SourceAcquisitionNetworkEndpointSnapshot["allowedRequestParameters"][number]["valueSource"],
  request: SourceAcquisitionCandidateProviderAttemptRequest,
): string {
  if (source === "query_text") {
    return request.queryText;
  }
  if (source === "retrieval_policy_key") {
    return request.retrievalPolicyKey;
  }
  if (source === "openalex_minimal_works_select") {
    return OPENALEX_WORKS_SELECT_FIELDS;
  }
  return String(finiteNonNegativeInteger(request.maxCandidateRecords));
}

function buildNetworkRequest(params: {
  readonly endpoint: SourceAcquisitionNetworkEndpointSnapshot;
  readonly request: SourceAcquisitionCandidateProviderAttemptRequest;
  readonly attemptId: string;
}): SourceAcquisitionNetworkRequestEnvelope {
  return {
    version: params.endpoint.version,
    visibility: "internal_only",
    providerId: params.endpoint.providerId,
    endpointId: params.endpoint.endpointId,
    queryId: params.request.queryId,
    retrievalPolicyKey: params.request.retrievalPolicyKey,
    providerAttemptId: params.attemptId,
    requestParameters: params.endpoint.allowedRequestParameters.map((parameter) => ({
      key: parameter.key,
      value: requestParameterValue(parameter.valueSource, params.request),
    })),
    requestHeaders: params.endpoint.allowedRequestHeaders.map((header) => ({ ...header })),
  };
}

function buildOpenAlexNetworkRequest(params: {
  readonly endpoint: SourceAcquisitionNetworkEndpointSnapshot;
  readonly queryEntry: OpenAlexSourceMaterialQueryEntry;
  readonly attemptId: string;
  readonly maxCandidateRecords: number;
}): SourceAcquisitionNetworkRequestEnvelope {
  return {
    version: params.endpoint.version,
    visibility: "internal_only",
    providerId: params.endpoint.providerId,
    endpointId: params.endpoint.endpointId,
    queryId: params.queryEntry.queryId,
    retrievalPolicyKey: params.queryEntry.retrievalPolicyKey,
    providerAttemptId: params.attemptId,
    requestParameters: [
      { key: "search", value: params.queryEntry.queryText },
      { key: "per_page", value: String(params.maxCandidateRecords) },
      { key: "select", value: OPENALEX_WORKS_SELECT_FIELDS },
    ],
    requestHeaders: [
      { key: "accept", valueSource: "application_json" },
      { key: "user-agent", valueSource: "factharbor_internal_agent" },
    ],
  };
}

function hiddenCandidate(params: {
  readonly request: SourceAcquisitionCandidateProviderAttemptRequest;
  readonly endpoint: SourceAcquisitionNetworkEndpointSnapshot;
  readonly attemptId: string;
  readonly rank: number;
}): SourceAcquisitionHiddenCandidateRecord {
  return {
    candidateId: `OPAQUE_SOURCE_CANDIDATE_${params.attemptId}_${params.rank}`,
    queryId: params.request.queryId,
    retrievalPolicyKey: params.request.retrievalPolicyKey,
    providerId: params.endpoint.providerId,
    providerAttemptId: params.attemptId,
    providerRank: params.rank,
    hiddenLocatorId: `HIDDEN_SOURCE_LOCATOR_${params.attemptId}_${params.rank}`,
    hiddenMetadata: {
      semanticUse: "not_semantic_evidence",
      titleState: "not_collected",
      snippetState: "not_collected",
      domainState: "not_collected",
      languageState: "not_collected",
    },
    candidateStructuralStatus: "candidate_acquired",
  };
}

function structuralStatusFromTransport(
  outcome: SourceAcquisitionNetworkTransportOutcome,
): Exclude<SourceAcquisitionCandidateProviderAttemptResult["structuralStatus"], "success"> | "success" {
  if (outcome.status === "success") {
    return "success";
  }
  if (outcome.status === "timed_out") {
    return "timed_out";
  }
  if (outcome.status === "cancelled") {
    return "cancelled";
  }
  if (
    outcome.diagnostic.stopReason === "dns_resolution_failed"
    || outcome.diagnostic.stopReason === "http_status_rejected"
    || outcome.diagnostic.stopReason === "transport_failure"
  ) {
    return "provider_failure";
  }
  return "search_failure";
}

function buildState(params: FactoryParams): FactoryState {
  if (!isSourceAcquisitionNetworkAuthority(params.authority)) {
    return { status: "blocked", reason: "authority_invalid" };
  }
  if (validateSourceAcquisitionNetworkBudgetSnapshot(params.budget).status !== "valid") {
    return { status: "blocked", reason: "budget_invalid" };
  }
  if (
    params.endpoints.length === 0
    || params.endpoints.some((endpoint) =>
      validateSourceAcquisitionNetworkEndpointSnapshot(endpoint).status !== "valid"
      || endpoint.endpointSnapshotHash !== params.budget.endpointSnapshotHash
    )
  ) {
    return { status: "blocked", reason: "endpoint_invalid" };
  }

  const authoritySnapshot = readSourceAcquisitionNetworkAuthoritySnapshot(params.authority);
  if (
    authoritySnapshot.networkBudgetSnapshotHash !== params.budget.networkBudgetSnapshotHash
    || authoritySnapshot.endpointSnapshotHash !== params.budget.endpointSnapshotHash
  ) {
    return { status: "blocked", reason: "authority_invalid" };
  }

  return {
    status: "ready",
    authority: params.authority,
    endpoints: params.endpoints,
    budget: params.budget,
    lowLevelTransport: params.lowLevelTransport,
  };
}

export function buildSourceAcquisitionCandidateNetworkProviderBoundary(
  params: FactoryParams,
): SourceAcquisitionCandidateProviderBoundary {
  const state = buildState(params);
  let attemptCounter = 0;
  const providerQueryCounts = new Map<string, number>();
  const totalStartedAt = Date.now();

  return {
    acquireCandidates: async (
      request: SourceAcquisitionCandidateProviderAttemptRequest,
    ): Promise<SourceAcquisitionCandidateProviderAttemptResult> => {
      attemptCounter += 1;
      const attemptId = providerAttemptId(attemptCounter);
      if (state.status === "blocked") {
        return failureResult(request, attemptId, "provider_failure");
      }
      if (
        !isNonBlankString(request.queryId)
        || !isNonBlankString(request.retrievalPolicyKey)
        || !isNonBlankString(request.queryText)
        || request.maxCandidateRecords > state.budget.maxCandidatesPerQuery
      ) {
        return failureResult(request, attemptId, "search_failure");
      }

      const endpoint = endpointForRequest(state.endpoints, request);
      if (!endpoint) {
        return failureResult(request, attemptId, "provider_failure");
      }
      const providerQueryCount = providerQueryCounts.get(endpoint.providerId) ?? 0;
      const remainingTotalMs = state.budget.totalNetworkTimeoutMs - (Date.now() - totalStartedAt);
      if (
        state.endpoints.length > state.budget.maxProvidersPerRun
        || request.allowedProviderIds.length > state.budget.maxProvidersPerRun
        || providerQueryCount >= state.budget.maxQueriesPerProvider
        || remainingTotalMs <= 0
      ) {
        return failureResult(request, attemptId, "timed_out");
      }

      const networkRequest = buildNetworkRequest({ endpoint, request, attemptId });
      if (validateSourceAcquisitionNetworkRequestEnvelope(networkRequest, endpoint).status !== "valid") {
        return failureResult(request, attemptId, "search_failure");
      }

      providerQueryCounts.set(endpoint.providerId, providerQueryCount + 1);
      const controller = new AbortController();
      const timeoutMs = Math.min(
        endpoint.timeoutMs,
        state.budget.perQueryTimeoutMs,
        request.timeoutMs,
        remainingTotalMs,
      );
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const outcome = await executeSourceAcquisitionNetworkTransport({
        authority: state.authority,
        endpoint,
        budget: state.budget,
        request: networkRequest,
        signal: controller.signal,
        lowLevelTransport: state.lowLevelTransport,
        candidateProjectionHook: params.candidatePreviewProjectionSink || params.sourceMaterialPageSummaryFetchLocatorSink
          ? (projectionInput) => {
              const projection = buildSourceCandidatePreviewProjection({
                providerId: projectionInput.providerId,
                endpointId: projectionInput.endpointId,
                providerAttemptOrdinal: projectionInput.providerAttemptOrdinal,
                providerRank: projectionInput.providerRank,
                candidateOrdinal: projectionInput.candidateOrdinal,
                sourceCandidateRef: projectionInput.sourceCandidateRef,
                candidate: projectionInput.candidate,
              });
              emitCandidatePreviewProjection(params.candidatePreviewProjectionSink, projection);
              const locator = buildSourceMaterialPageSummaryFetchLocator({
                projection,
                candidate: projectionInput.candidate,
                languageCode: params.sourceMaterialPageSummaryLanguageCode
                  ?? SOURCE_MATERIAL_PAGE_SUMMARY_DEFAULT_LANGUAGE_CODE,
              });
              emitSourceMaterialPageSummaryFetchLocator(
                params.sourceMaterialPageSummaryFetchLocatorSink,
                locator,
              );
            }
          : undefined,
      }).finally(() => clearTimeout(timeout));
      const structuralStatus = structuralStatusFromTransport(outcome);
      emitTelemetry(params.attemptTelemetrySink, telemetryFromOutcome({
        endpoint,
        attemptOrdinal: attemptCounter,
        structuralStatus,
        candidateCount: outcome.candidateCount,
        timeoutMs,
        outcome,
      }));
      if (structuralStatus !== "success") {
        return failureResult(
          request,
          attemptId,
          structuralStatus,
          outcome.diagnostic.durationMs,
        );
      }

      const candidateLimit = Math.min(
        outcome.candidateCount,
        request.maxCandidateRecords,
        state.budget.maxCandidatesPerQuery,
      );
      const candidates = Array.from({ length: candidateLimit }, (_, index) => hiddenCandidate({
        request,
        endpoint,
        attemptId,
        rank: index + 1,
      }));

      return {
        queryId: request.queryId,
        providerId: endpoint.providerId,
        providerAttemptId: attemptId,
        structuralStatus: "success",
        durationMs: outcome.diagnostic.durationMs,
        candidates,
        sanitizedProviderTelemetry: {
          rawPayloadIncluded: false,
          secretIncluded: false,
          publicPayloadIncluded: false,
        },
      };
    },
  };
}

export async function collectOpenAlexSourceMaterialRecordsFromNetwork(params: {
  readonly authority: SourceAcquisitionNetworkAuthority;
  readonly endpoint: SourceAcquisitionNetworkEndpointSnapshot;
  readonly budget: SourceAcquisitionNetworkBudgetSnapshot;
  readonly queryEntries: readonly OpenAlexSourceMaterialQueryEntry[];
  readonly lowLevelTransport?: SourceAcquisitionNetworkLowLevelTransport;
  readonly startingAttemptOrdinal: number;
  readonly attemptTelemetrySink: (record: SourceAcquisitionNetworkAttemptTelemetryRecord) => void;
  readonly candidatePreviewProjectionSink?: (projection: SourceCandidatePreviewProjection) => void;
}): Promise<readonly SourceMaterialPageSummaryRecord[]> {
  const records: SourceMaterialPageSummaryRecord[] = [];
  let attemptOrdinal = params.startingAttemptOrdinal;
  const recordLimit = Math.max(0, finiteNonNegativeInteger(params.budget.maxCandidatesPerQuery));
  for (const queryEntry of params.queryEntries) {
    if (records.length >= recordLimit) {
      break;
    }
    attemptOrdinal += 1;
    const attemptId = providerAttemptId(attemptOrdinal);
    const controller = new AbortController();
    const timeoutMs = Math.min(
      params.endpoint.timeoutMs,
      params.budget.perQueryTimeoutMs,
      params.budget.totalNetworkTimeoutMs,
    );
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const projectedCandidates: SourceAcquisitionNetworkCandidateProjectionInput[] = [];
    const outcome = await executeSourceAcquisitionNetworkTransport({
      authority: params.authority,
      endpoint: params.endpoint,
      budget: params.budget,
      request: buildOpenAlexNetworkRequest({
        endpoint: params.endpoint,
        queryEntry,
        attemptId,
        maxCandidateRecords: params.budget.maxCandidatesPerQuery,
      }),
      signal: controller.signal,
      lowLevelTransport: params.lowLevelTransport,
      candidateProjectionHook: (candidate) => {
        projectedCandidates.push(candidate);
      },
    }).finally(() => clearTimeout(timeout));
    params.attemptTelemetrySink(telemetryFromOutcome({
      endpoint: params.endpoint,
      attemptOrdinal,
      structuralStatus: structuralStatusFromTransport(outcome),
      candidateCount: outcome.candidateCount,
      timeoutMs,
      outcome,
    }));
    if (outcome.status !== "success") {
      continue;
    }
    for (const candidateProjection of projectedCandidates) {
      const projection = buildSourceCandidatePreviewProjection({
        providerId: OPENALEX_PROVIDER_ID,
        endpointId: OPENALEX_WORKS_ENDPOINT_ID,
        providerAttemptOrdinal: candidateProjection.providerAttemptOrdinal,
        providerRank: candidateProjection.providerRank,
        candidateOrdinal: candidateProjection.candidateOrdinal,
        sourceCandidateRef: candidateProjection.sourceCandidateRef,
        candidate: candidateProjection.candidate,
      });
      emitCandidatePreviewProjection(params.candidatePreviewProjectionSink, projection);
      if (projection.materializationStatus !== "source_candidate_preview_materialized") {
        continue;
      }
      const recordDecision = buildOpenAlexAbstractSourceMaterialRecord({
        candidate: candidateProjection.candidate,
        candidatePreviewId: projection.candidatePreviewId,
        sourceCandidateRef: candidateProjection.sourceCandidateRef,
        providerAttemptId: candidateProjection.providerAttemptId,
        providerRank: candidateProjection.providerRank,
        diagnostic: {
          responseStatusCategory: "success_2xx",
          contentTypeCategory: "accepted_json",
          compressedBytes: outcome.diagnostic.compressedBytes,
          decompressedBytes: outcome.diagnostic.decompressedBytes,
          durationMs: outcome.diagnostic.durationMs,
          timeoutMs: outcome.diagnostic.timeoutMs,
        },
      });
      if (recordDecision.status === "record_created") {
        records.push(recordDecision.record);
        break;
      }
    }
  }
  return records;
}
