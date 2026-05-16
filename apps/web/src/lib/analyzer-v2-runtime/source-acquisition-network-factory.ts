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
  type SourceAcquisitionNetworkRequestEnvelope,
  type SourceAcquisitionNetworkTransportOutcome,
} from "./source-acquisition-network-envelope";
import {
  isSourceAcquisitionNetworkAuthority,
  readSourceAcquisitionNetworkAuthoritySnapshot,
  type SourceAcquisitionNetworkAuthority,
} from "./source-acquisition-network-authority";
import {
  executeSourceAcquisitionNetworkTransport,
  type SourceAcquisitionNetworkLowLevelTransport,
} from "./source-acquisition-network-transport";

export type SourceAcquisitionCandidateNetworkProviderFactory = {
  readonly buildProvider: () => SourceAcquisitionCandidateProviderBoundary;
};

type FactoryParams = {
  readonly authority: SourceAcquisitionNetworkAuthority;
  readonly endpoints: readonly SourceAcquisitionNetworkEndpointSnapshot[];
  readonly budget: SourceAcquisitionNetworkBudgetSnapshot;
  readonly lowLevelTransport?: SourceAcquisitionNetworkLowLevelTransport;
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
  return source === "query_text" ? request.queryText : request.retrievalPolicyKey;
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
      }).finally(() => clearTimeout(timeout));
      const structuralStatus = structuralStatusFromTransport(outcome);
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
