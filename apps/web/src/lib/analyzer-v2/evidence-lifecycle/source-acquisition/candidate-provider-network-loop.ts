import type {
  SourceAcquisitionCandidateBudgetSnapshot,
  SourceAcquisitionCandidateProviderAllowlistSnapshot,
  SourceAcquisitionCandidateRuntimeDecision,
  SourceAcquisitionCandidateRunRequest,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope";
import {
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT,
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH,
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope";
import {
  createSourceAcquisitionCandidateRuntimeAuthority,
  executeSourceAcquisitionCandidateRuntime,
  readSourceAcquisitionCandidateRuntimeAuthoritySnapshot,
  type SourceAcquisitionCandidateRuntimeAuthority,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime";
import {
  createSourceAcquisitionRuntimeAuthority,
  type SourceAcquisitionRuntimeAuthoritySnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority";
import {
  createSourceAcquisitionNetworkAuthority,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-authority";
import {
  SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT,
  SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
  sourceAcquisitionNetworkApproval,
  validateSourceAcquisitionNetworkBudgetSnapshot,
  validateSourceAcquisitionNetworkEndpointSnapshot,
  type SourceAcquisitionNetworkBudgetSnapshot,
  type SourceAcquisitionNetworkEndpointSnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-envelope";
import {
  buildSourceAcquisitionCandidateNetworkProviderBoundary,
  collectOpenAlexSourceMaterialRecordsFromNetwork,
  type SourceAcquisitionNetworkAttemptTelemetryRecord,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-factory";
import {
  type SourceCandidatePreviewProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import type {
  SourceMaterialPageSummaryFetchLocator,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator";
import type {
  SourceMaterialPageSummaryRecord,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material";
import { sha256Json } from "@/lib/analyzer-v2/util";
import {
  EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope";
import {
  buildSourceAcquisitionCandidateRuntimeClosedLoopAuthoritySnapshot,
  type SourceAcquisitionCandidateRuntimeClosedLoopDecision,
} from "./candidate-runtime-closed-loop";
import type {
  SourceAcquisitionIntakeBoundaryDecision,
} from "./intake-boundary";
import type {
  QueryPlanSourceAcquisitionHandoff,
  QueryPlanSourceAcquisitionHandoffDecision,
} from "./query-plan-handoff";
import type {
  SourceAcquisitionRequest,
  SourceAcquisitionStartDecision,
} from "./types";

export const SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_VERSION =
  "v2.evidence-lifecycle.source-acquisition-candidate-provider-network-loop.x7w2";
export const SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-17_V2_Slice_X7-W2_Product_Internal_Candidate_Provider_Network_Source_Package.md";
export const SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_PACKAGE_COMMIT = "c01d14b3";

const SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION_LITERAL = "v2.source-acquisition.runtime-authority.7n3a";
const SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH_LITERAL =
  "Docs/WIP/2026-05-16_V2_Slice_7N3A_Source_IO_Authority_Boundary_Package.md";
const WIKIMEDIA_PROVIDER_ID = "wikimedia_core";
const WIKIMEDIA_ENDPOINT_ID = "ep_wikimedia_core_page_search";
const WIKIMEDIA_HOSTNAME = "api.wikimedia.org";
const WIKIMEDIA_SEARCH_PATH = "/core/v1/wikipedia/en/search/page";
const OPENALEX_PROVIDER_ID = "openalex";
const OPENALEX_WORKS_ENDPOINT_ID = "ep_openalex_works_search";
const OPENALEX_HOSTNAME = "api.openalex.org";
const OPENALEX_WORKS_PATH = "/works";

export const SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES = 6;
export const SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_CANDIDATES_PER_QUERY = 3;
export const SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_PROVIDER_TIMEOUT_MS = 3000;
export const SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_TOTAL_TIMEOUT_MS = 18000;
export const SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_BYTE_CAP = 32_768;

const reviewedQueryPlanningMaxQueryEntries: typeof SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES =
  EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES;
void reviewedQueryPlanningMaxQueryEntries;

export type SourceAcquisitionCandidateProviderNetworkAuthoritySnapshot = {
  readonly authorityVersion: typeof SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_VERSION;
  readonly status: "approved_x7w2_product_candidate_provider_network";
  readonly approvedBy: "captain_deputy_review_team";
  readonly sourcePackage: typeof SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_SOURCE_PACKAGE;
  readonly packageCommit: typeof SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_PACKAGE_COMMIT;
  readonly approvedScope: "product_internal_candidate_provider_network_one_endpoint";
  readonly visibility: "internal_only";
  readonly providerId: typeof WIKIMEDIA_PROVIDER_ID;
  readonly endpointId: typeof WIKIMEDIA_ENDPOINT_ID;
  readonly endpointSnapshotHash: string;
  readonly networkBudgetSnapshotHash: string;
  readonly providerAllowlistSnapshotHash: string;
  readonly candidateBudgetSnapshotHash: string;
  readonly providerNetworkImplementationCommit: typeof SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT;
  readonly capabilityScope: {
    readonly candidateProviderNetwork: "approved_wikimedia_core_search_only";
    readonly providerSdk: false;
    readonly arbitraryUrlDereference: false;
    readonly contentDereference: false;
    readonly parser: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly durableStorage: false;
    readonly sourceReliability: false;
    readonly sourceMaterial: false;
    readonly evidenceCorpus: false;
    readonly evidenceItem: false;
    readonly warning: false;
    readonly report: false;
    readonly verdict: false;
    readonly confidence: false;
    readonly publicExposure: false;
    readonly liveJobs: false;
    readonly acsPreparedSnapshot: false;
    readonly directUrl: false;
  };
  readonly authoritySnapshotHash: string;
};

export type SourceAcquisitionCandidateProviderNetworkBlockedReason =
  | "candidate_runtime_closed_loop_not_completed"
  | "query_plan_handoff_not_ready"
  | "source_acquisition_request_not_ready"
  | "source_acquisition_intake_not_ready"
  | "query_count_exceeds_w2_cap"
  | "w2_authority_invalid"
  | "provider_allowlist_invalid"
  | "candidate_budget_invalid"
  | "runtime_contract_authority_invalid"
  | "network_endpoint_invalid"
  | "network_budget_invalid"
  | "network_authority_invalid"
  | "candidate_runtime_blocked";

export type SourceAcquisitionCandidateProviderNetworkDamagedReason =
  | "candidate_runtime_damaged"
  | "candidate_runtime_query_coverage_invalid"
  | "candidate_runtime_threw"
  | "provider_network_not_observed";

export type SourceAcquisitionCandidateProviderNetworkQuerySummary = {
  readonly ordinal: number;
  readonly candidateProviderNetworkQueryRef: string;
  readonly status: "attempted" | "failed" | "timed_out" | "cancelled" | "blocked" | "skipped_with_structural_reason";
  readonly structuralReason: string;
  readonly providerAttemptObserved: boolean;
  readonly candidateCount: number;
};

export type SourceAcquisitionCandidateProviderNetworkTelemetry = {
  readonly candidateRuntimeExercised: boolean;
  readonly candidateProviderBoundaryInvoked: boolean;
  readonly providerNetworkBoundaryInvoked: boolean;
  readonly providerAttemptCount: number;
  readonly networkAttemptCount: number;
  readonly candidateCount: number;
  readonly totalCandidateCount: number;
  readonly structurallyDroppedCandidateCount: number;
  readonly totalDurationMs: number;
  readonly totalCompressedBytes: number;
  readonly totalDecompressedBytes: number;
  readonly totalBytes: number;
  readonly fixedDollarCost: 0;
  readonly costReason: "no_paid_api_no_credentials";
  readonly providerNetworkExecuted: boolean;
  readonly searchFetchCalled: boolean;
  readonly contentDereferenceCalled: false;
  readonly parserExecuted: false;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly storageWrite: false;
  readonly sourceReliabilityCalled: false;
  readonly sourceMaterialCreated: false;
  readonly evidenceCorpusCreated: false;
  readonly evidenceItemGenerated: false;
  readonly warningGenerated: false;
  readonly reportGenerated: false;
  readonly verdictGenerated: false;
  readonly publicSurfaceWritten: false;
  readonly networkAttempts: readonly SourceAcquisitionCandidateProviderNetworkAttemptTelemetryRecord[];
};

export type SourceAcquisitionCandidateProviderNetworkAttemptTelemetryRecord = Pick<
  SourceAcquisitionNetworkAttemptTelemetryRecord,
  | "telemetryVersion"
  | "visibility"
  | "providerId"
  | "endpointId"
  | "attemptOrdinal"
  | "structuralStatus"
  | "stopReason"
  | "durationMs"
  | "timeoutMs"
  | "dnsAddressCount"
  | "selectedAddressFamily"
  | "finalAddressValidation"
  | "responseStatusCodeCategory"
  | "contentTypeState"
  | "transportFailureClass"
  | "transportFailurePhase"
  | "transportErrorShape"
  | "nodeErrorCodeCategory"
  | "candidateCount"
  | "compressedBytes"
  | "decompressedBytes"
  | "byteCountState"
  | "rawPayloadIncluded"
  | "secretIncluded"
  | "publicPayloadIncluded"
  | "errorTraceIncluded"
>;

export type SourceAcquisitionCandidateProviderNetworkLoopDecision = {
  readonly networkLoopVersion: typeof SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_VERSION;
  readonly visibility: "internal_only";
  readonly status:
    | "candidate_provider_network_completed"
    | "blocked_pre_candidate_provider_network"
    | "candidate_provider_network_damaged_structural";
  readonly blockedReason: SourceAcquisitionCandidateProviderNetworkBlockedReason | null;
  readonly damagedReason: SourceAcquisitionCandidateProviderNetworkDamagedReason | null;
  readonly closedLoopStatus: SourceAcquisitionCandidateRuntimeClosedLoopDecision["status"];
  readonly handoffStatus: QueryPlanSourceAcquisitionHandoffDecision["status"];
  readonly requestStatus: SourceAcquisitionStartDecision["status"];
  readonly intakeStatus: SourceAcquisitionIntakeBoundaryDecision["status"];
  readonly selectedAtomicClaimCount: number;
  readonly queryEntryCount: number;
  readonly retrievalPolicyCount: number;
  readonly sourceLanguageSignal: SourceAcquisitionIntakeBoundaryDecision["sourceLanguageSignal"];
  readonly productNetworkAuthorityHash: string | null;
  readonly runtimeContractAuthorityHash: string | null;
  readonly endpointSnapshotHash: string | null;
  readonly networkBudgetSnapshotHash: string | null;
  readonly providerAllowlistSnapshotHash: string | null;
  readonly candidateBudgetSnapshotHash: string | null;
  readonly runtimeStatus: SourceAcquisitionCandidateRuntimeDecision["status"] | null;
  readonly queryOutcomeSummaries: readonly SourceAcquisitionCandidateProviderNetworkQuerySummary[];
  readonly telemetry: SourceAcquisitionCandidateProviderNetworkTelemetry;
  readonly downstreamGate: "candidate_to_source_material_gate_closed";
  readonly publicCutoverStatus: "blocked_precutover";
};

type LowLevelTransportOption = Parameters<
  typeof buildSourceAcquisitionCandidateNetworkProviderBoundary
>[0]["lowLevelTransport"];

function noExecutionTelemetry(
  networkAttempts: readonly SourceAcquisitionCandidateProviderNetworkAttemptTelemetryRecord[] = [],
): SourceAcquisitionCandidateProviderNetworkTelemetry {
  const candidateCount = networkAttempts.reduce((sum, record) => sum + record.candidateCount, 0);
  const durationMs = networkAttempts.reduce((sum, record) => sum + record.durationMs, 0);
  const compressedBytes = networkAttempts.reduce((sum, record) => sum + record.compressedBytes, 0);
  const decompressedBytes = networkAttempts.reduce((sum, record) => sum + record.decompressedBytes, 0);
  return {
    candidateRuntimeExercised: networkAttempts.length > 0,
    candidateProviderBoundaryInvoked: networkAttempts.length > 0,
    providerNetworkBoundaryInvoked: networkAttempts.length > 0,
    providerAttemptCount: networkAttempts.length,
    networkAttemptCount: networkAttempts.length,
    candidateCount,
    totalCandidateCount: candidateCount,
    structurallyDroppedCandidateCount: 0,
    totalDurationMs: durationMs,
    totalCompressedBytes: compressedBytes,
    totalDecompressedBytes: decompressedBytes,
    totalBytes: compressedBytes + decompressedBytes,
    fixedDollarCost: 0,
    costReason: "no_paid_api_no_credentials",
    providerNetworkExecuted: networkAttempts.length > 0,
    searchFetchCalled: networkAttempts.length > 0,
    contentDereferenceCalled: false,
    parserExecuted: false,
    cacheRead: false,
    cacheWrite: false,
    storageWrite: false,
    sourceReliabilityCalled: false,
    sourceMaterialCreated: false,
    evidenceCorpusCreated: false,
    evidenceItemGenerated: false,
    warningGenerated: false,
    reportGenerated: false,
    verdictGenerated: false,
    publicSurfaceWritten: false,
    networkAttempts,
  };
}

function sanitizeNetworkAttempt(
  record: SourceAcquisitionNetworkAttemptTelemetryRecord,
): SourceAcquisitionCandidateProviderNetworkAttemptTelemetryRecord {
  return {
    telemetryVersion: record.telemetryVersion,
    visibility: record.visibility,
    providerId: record.providerId,
    endpointId: record.endpointId,
    attemptOrdinal: record.attemptOrdinal,
    structuralStatus: record.structuralStatus,
    stopReason: record.stopReason,
    durationMs: record.durationMs,
    timeoutMs: record.timeoutMs,
    dnsAddressCount: record.dnsAddressCount,
    selectedAddressFamily: record.selectedAddressFamily,
    finalAddressValidation: record.finalAddressValidation,
    responseStatusCodeCategory: record.responseStatusCodeCategory,
    contentTypeState: record.contentTypeState,
    transportFailureClass: record.transportFailureClass,
    transportFailurePhase: record.transportFailurePhase,
    transportErrorShape: record.transportErrorShape,
    nodeErrorCodeCategory: record.nodeErrorCodeCategory,
    candidateCount: record.candidateCount,
    compressedBytes: record.compressedBytes,
    decompressedBytes: record.decompressedBytes,
    byteCountState: record.byteCountState,
    rawPayloadIncluded: false,
    secretIncluded: false,
    publicPayloadIncluded: false,
    errorTraceIncluded: false,
  };
}

function sanitizeNetworkAttempts(
  records: readonly SourceAcquisitionNetworkAttemptTelemetryRecord[],
): readonly SourceAcquisitionCandidateProviderNetworkAttemptTelemetryRecord[] {
  return records.map(sanitizeNetworkAttempt);
}

function telemetryFromRuntime(params: {
  readonly runtimeDecision: SourceAcquisitionCandidateRuntimeDecision;
  readonly networkAttempts: readonly SourceAcquisitionNetworkAttemptTelemetryRecord[];
}): SourceAcquisitionCandidateProviderNetworkTelemetry {
  const rawCandidateCount = params.networkAttempts.reduce((sum, record) => sum + record.candidateCount, 0);
  const materializedCandidateCount = params.runtimeDecision.candidates.length;
  const durationMs = params.networkAttempts.reduce((sum, record) => sum + record.durationMs, 0);
  const compressedBytes = params.networkAttempts.reduce((sum, record) => sum + record.compressedBytes, 0);
  const decompressedBytes = params.networkAttempts.reduce((sum, record) => sum + record.decompressedBytes, 0);
  const sanitizedNetworkAttempts = sanitizeNetworkAttempts(params.networkAttempts);
  return {
    ...noExecutionTelemetry(sanitizedNetworkAttempts),
    candidateRuntimeExercised: true,
    candidateProviderBoundaryInvoked: params.networkAttempts.length > 0,
    providerNetworkBoundaryInvoked: params.networkAttempts.length > 0,
    providerAttemptCount: params.networkAttempts.length,
    networkAttemptCount: params.networkAttempts.length,
    candidateCount: materializedCandidateCount,
    totalCandidateCount: rawCandidateCount,
    structurallyDroppedCandidateCount: Math.max(0, rawCandidateCount - materializedCandidateCount),
    totalDurationMs: durationMs,
    totalCompressedBytes: compressedBytes,
    totalDecompressedBytes: decompressedBytes,
    totalBytes: compressedBytes + decompressedBytes,
    providerNetworkExecuted: params.networkAttempts.length > 0,
    searchFetchCalled: params.networkAttempts.length > 0,
  };
}

function hashWithoutKey(value: object, key: string): string {
  const clone = { ...(value as Record<string, unknown>) };
  delete clone[key];
  return sha256Json(clone);
}

function requiredKeysMatch(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function blocked(params: {
  readonly reason: SourceAcquisitionCandidateProviderNetworkBlockedReason;
  readonly closedLoopStatus: SourceAcquisitionCandidateRuntimeClosedLoopDecision["status"];
  readonly handoffStatus: QueryPlanSourceAcquisitionHandoffDecision["status"];
  readonly requestStatus: SourceAcquisitionStartDecision["status"];
  readonly intakeStatus: SourceAcquisitionIntakeBoundaryDecision["status"];
  readonly selectedAtomicClaimCount?: number;
  readonly queryEntryCount?: number;
  readonly retrievalPolicyCount?: number;
  readonly sourceLanguageSignal?: SourceAcquisitionIntakeBoundaryDecision["sourceLanguageSignal"];
  readonly productNetworkAuthorityHash?: string | null;
  readonly endpointSnapshotHash?: string | null;
  readonly networkBudgetSnapshotHash?: string | null;
  readonly providerAllowlistSnapshotHash?: string | null;
  readonly candidateBudgetSnapshotHash?: string | null;
}): SourceAcquisitionCandidateProviderNetworkLoopDecision {
  return {
    networkLoopVersion: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_VERSION,
    visibility: "internal_only",
    status: "blocked_pre_candidate_provider_network",
    blockedReason: params.reason,
    damagedReason: null,
    closedLoopStatus: params.closedLoopStatus,
    handoffStatus: params.handoffStatus,
    requestStatus: params.requestStatus,
    intakeStatus: params.intakeStatus,
    selectedAtomicClaimCount: params.selectedAtomicClaimCount ?? 0,
    queryEntryCount: params.queryEntryCount ?? 0,
    retrievalPolicyCount: params.retrievalPolicyCount ?? 0,
    sourceLanguageSignal: params.sourceLanguageSignal ?? "unavailable",
    productNetworkAuthorityHash: params.productNetworkAuthorityHash ?? null,
    runtimeContractAuthorityHash: null,
    endpointSnapshotHash: params.endpointSnapshotHash ?? null,
    networkBudgetSnapshotHash: params.networkBudgetSnapshotHash ?? null,
    providerAllowlistSnapshotHash: params.providerAllowlistSnapshotHash ?? null,
    candidateBudgetSnapshotHash: params.candidateBudgetSnapshotHash ?? null,
    runtimeStatus: null,
    queryOutcomeSummaries: [],
    telemetry: noExecutionTelemetry(),
    downstreamGate: "candidate_to_source_material_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  };
}

function damaged(params: {
  readonly reason: SourceAcquisitionCandidateProviderNetworkDamagedReason;
  readonly closedLoopStatus: SourceAcquisitionCandidateRuntimeClosedLoopDecision["status"];
  readonly handoffStatus: QueryPlanSourceAcquisitionHandoffDecision["status"];
  readonly requestStatus: SourceAcquisitionStartDecision["status"];
  readonly intakeStatus: SourceAcquisitionIntakeBoundaryDecision["status"];
  readonly selectedAtomicClaimCount: number;
  readonly queryEntryCount: number;
  readonly retrievalPolicyCount: number;
  readonly sourceLanguageSignal: SourceAcquisitionIntakeBoundaryDecision["sourceLanguageSignal"];
  readonly productNetworkAuthorityHash: string;
  readonly runtimeContractAuthorityHash: string | null;
  readonly endpointSnapshotHash: string;
  readonly networkBudgetSnapshotHash: string;
  readonly providerAllowlistSnapshotHash: string;
  readonly candidateBudgetSnapshotHash: string;
  readonly runtimeStatus: SourceAcquisitionCandidateRuntimeDecision["status"] | null;
  readonly queryOutcomeSummaries?: readonly SourceAcquisitionCandidateProviderNetworkQuerySummary[];
  readonly networkAttempts?: readonly SourceAcquisitionNetworkAttemptTelemetryRecord[];
}): SourceAcquisitionCandidateProviderNetworkLoopDecision {
  return {
    networkLoopVersion: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_VERSION,
    visibility: "internal_only",
    status: "candidate_provider_network_damaged_structural",
    blockedReason: null,
    damagedReason: params.reason,
    closedLoopStatus: params.closedLoopStatus,
    handoffStatus: params.handoffStatus,
    requestStatus: params.requestStatus,
    intakeStatus: params.intakeStatus,
    selectedAtomicClaimCount: params.selectedAtomicClaimCount,
    queryEntryCount: params.queryEntryCount,
    retrievalPolicyCount: params.retrievalPolicyCount,
    sourceLanguageSignal: params.sourceLanguageSignal,
    productNetworkAuthorityHash: params.productNetworkAuthorityHash,
    runtimeContractAuthorityHash: params.runtimeContractAuthorityHash,
    endpointSnapshotHash: params.endpointSnapshotHash,
    networkBudgetSnapshotHash: params.networkBudgetSnapshotHash,
    providerAllowlistSnapshotHash: params.providerAllowlistSnapshotHash,
    candidateBudgetSnapshotHash: params.candidateBudgetSnapshotHash,
    runtimeStatus: params.runtimeStatus,
    queryOutcomeSummaries: params.queryOutcomeSummaries ?? [],
    telemetry: noExecutionTelemetry(sanitizeNetworkAttempts(params.networkAttempts ?? [])),
    downstreamGate: "candidate_to_source_material_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  };
}

export function buildSourceAcquisitionCandidateProviderNetworkEndpointSnapshot():
  SourceAcquisitionNetworkEndpointSnapshot {
  const base = {
    version: SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
    approval: sourceAcquisitionNetworkApproval(),
    providerId: WIKIMEDIA_PROVIDER_ID,
    endpointId: WIKIMEDIA_ENDPOINT_ID,
    canonicalAsciiHostname: WIKIMEDIA_HOSTNAME,
    protocol: "https",
    port: 443,
    path: WIKIMEDIA_SEARCH_PATH,
    method: "GET",
    allowedRequestParameters: [
      { key: "q", valueSource: "query_text" },
      { key: "limit", valueSource: "max_candidate_records" },
    ],
    allowedRequestHeaders: [
      { key: "accept", valueSource: "application_json" },
      { key: "user-agent", valueSource: "factharbor_internal_agent" },
    ],
    credentialsState: "not_required",
    redirectPolicy: "deny",
    proxyPolicy: "none",
    responseContentTypePolicy: {
      allowedContentTypes: ["application/json"],
    },
    responseSniffPolicy: "json_object_or_array",
    responseCandidatePointer: {
      kind: "object_array_field",
      fieldName: "pages",
    },
    decompressionPolicy: "identity_only",
    compressedByteCap: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_BYTE_CAP,
    decompressedByteCap: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_BYTE_CAP,
    totalByteCap: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_BYTE_CAP,
    timeoutMs: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_PROVIDER_TIMEOUT_MS,
    noCache: true,
    noStorage: true,
    noSourceReliability: true,
    noProduct: true,
    noPublic: true,
  } as const;

  return {
    ...base,
    endpointSnapshotHash: sha256Json(base),
  };
}

export function buildOpenAlexWorksSourceMaterialEndpointSnapshot():
  SourceAcquisitionNetworkEndpointSnapshot {
  const base = {
    version: SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
    approval: sourceAcquisitionNetworkApproval(),
    providerId: OPENALEX_PROVIDER_ID,
    endpointId: OPENALEX_WORKS_ENDPOINT_ID,
    canonicalAsciiHostname: OPENALEX_HOSTNAME,
    protocol: "https",
    port: 443,
    path: OPENALEX_WORKS_PATH,
    method: "GET",
    allowedRequestParameters: [
      { key: "search", valueSource: "query_text" },
      { key: "per_page", valueSource: "max_candidate_records" },
      { key: "select", valueSource: "openalex_minimal_works_select" },
    ],
    allowedRequestHeaders: [
      { key: "accept", valueSource: "application_json" },
      { key: "user-agent", valueSource: "factharbor_internal_agent" },
    ],
    credentialsState: "not_required",
    redirectPolicy: "deny",
    proxyPolicy: "none",
    responseContentTypePolicy: {
      allowedContentTypes: ["application/json"],
    },
    responseSniffPolicy: "json_object_or_array",
    responseCandidatePointer: {
      kind: "object_array_field",
      fieldName: "results",
    },
    decompressionPolicy: "gzip_allowed",
    compressedByteCap: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_BYTE_CAP,
    decompressedByteCap: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_BYTE_CAP,
    totalByteCap: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_BYTE_CAP,
    timeoutMs: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_PROVIDER_TIMEOUT_MS,
    noCache: true,
    noStorage: true,
    noSourceReliability: true,
    noProduct: true,
    noPublic: true,
  } as const;

  return {
    ...base,
    endpointSnapshotHash: sha256Json(base),
  };
}

function endpointSnapshotIsExact(snapshot: SourceAcquisitionNetworkEndpointSnapshot): boolean {
  const expected = buildSourceAcquisitionCandidateProviderNetworkEndpointSnapshot();
  return validateSourceAcquisitionNetworkEndpointSnapshot(snapshot).status === "valid"
    && JSON.stringify(snapshot) === JSON.stringify(expected)
    && snapshot.endpointSnapshotHash === hashWithoutKey(snapshot, "endpointSnapshotHash");
}

function candidateRuntimeApproval() {
  return {
    status: "approved_7n3b1_candidate_runtime",
    approvedBy: "deputy_review_team",
    packagePath: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH,
    packageCommit: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT,
    approvedScope: "hidden_candidate_runtime_shell_only",
  } as const;
}

export function buildSourceAcquisitionCandidateProviderNetworkAllowlistSnapshot(params: {
  readonly endpointSnapshotHash: string;
}): SourceAcquisitionCandidateProviderAllowlistSnapshot {
  const base = {
    version: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
    approval: candidateRuntimeApproval(),
    configSnapshotHash: sha256Json({
      sourcePackage: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_SOURCE_PACKAGE,
      packageCommit: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_PACKAGE_COMMIT,
      authorityStatus: "approved_x7w2_product_candidate_provider_network",
      providerNetworkImplementationCommit: SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT,
      endpointSnapshotHash: params.endpointSnapshotHash,
      providerId: WIKIMEDIA_PROVIDER_ID,
      endpointKind: "candidate_search_api_future",
      maxQueries: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
      timeoutMs: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_PROVIDER_TIMEOUT_MS,
      credentialsState: "not_required_for_approved_network_provider",
      disabledProviders: [{ providerId: "openalex", disabledReason: "credentials_missing" }],
      noCache: true,
      noStorage: true,
      noSourceReliability: true,
      noProduct: true,
      noPublic: true,
    }),
    allowedProviders: [
      {
        providerId: WIKIMEDIA_PROVIDER_ID,
        endpointKind: "candidate_search_api_future",
        maxQueries: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
        timeoutMs: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_PROVIDER_TIMEOUT_MS,
        credentialsState: "not_required_for_approved_network_provider",
      },
    ],
    disabledProviders: [
      {
        providerId: "openalex",
        disabledReason: "credentials_missing",
      },
    ],
    noCache: true,
    noStorage: true,
    noSourceReliability: true,
    noProduct: true,
    noPublic: true,
  } as const;

  return {
    ...base,
    providerAllowlistSnapshotHash: sha256Json(base),
  };
}

function buildOpenAlexSourceMaterialProviderAllowlistSnapshot(params: {
  readonly endpointSnapshotHash: string;
}): SourceAcquisitionCandidateProviderAllowlistSnapshot {
  const base = {
    version: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
    approval: candidateRuntimeApproval(),
    configSnapshotHash: sha256Json({
      sourcePackage: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_SOURCE_PACKAGE,
      packageCommit: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_PACKAGE_COMMIT,
      authorityStatus: "approved_w6f1_openalex_source_material_diversity",
      providerNetworkImplementationCommit: SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT,
      endpointSnapshotHash: params.endpointSnapshotHash,
      providerId: OPENALEX_PROVIDER_ID,
      endpointKind: "candidate_search_api_future",
      maxQueries: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
      timeoutMs: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_PROVIDER_TIMEOUT_MS,
      credentialsState: "not_required_for_approved_network_provider",
      noCache: true,
      noStorage: true,
      noSourceReliability: true,
      noProduct: true,
      noPublic: true,
    }),
    allowedProviders: [
      {
        providerId: OPENALEX_PROVIDER_ID,
        endpointKind: "candidate_search_api_future",
        maxQueries: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
        timeoutMs: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_PROVIDER_TIMEOUT_MS,
        credentialsState: "not_required_for_approved_network_provider",
      },
    ],
    disabledProviders: [],
    noCache: true,
    noStorage: true,
    noSourceReliability: true,
    noProduct: true,
    noPublic: true,
  } as const;

  return {
    ...base,
    providerAllowlistSnapshotHash: sha256Json(base),
  };
}

function providerAllowlistSnapshotIsExact(
  snapshot: SourceAcquisitionCandidateProviderAllowlistSnapshot,
  endpointSnapshotHash: string,
): boolean {
  const expected = buildSourceAcquisitionCandidateProviderNetworkAllowlistSnapshot({ endpointSnapshotHash });
  return JSON.stringify(snapshot) === JSON.stringify(expected)
    && snapshot.providerAllowlistSnapshotHash === hashWithoutKey(snapshot, "providerAllowlistSnapshotHash");
}

function buildHandoffIdentity(
  handoff: QueryPlanSourceAcquisitionHandoff,
): SourceAcquisitionCandidateBudgetSnapshot["handoffIdentity"] {
  return {
    handoffVersion: handoff.handoffVersion,
    selectedAtomicClaimIds: [...handoff.selectedAtomicClaimIds],
    queryIds: handoff.queryEntries.map((queryEntry) => queryEntry.queryId),
    queryEntryCount: handoff.queryEntries.length,
    promptContentHash: handoff.promptProvenance.promptContentHash,
    renderedPromptHash: handoff.promptProvenance.renderedPromptHash,
    modelPolicyId: handoff.modelPolicyId,
    cacheNamespace: handoff.cacheProvenance.namespace,
    cacheReason: handoff.cacheProvenance.reason,
    cacheCanRead: false,
    cacheCanWrite: false,
    sourceLanguagePolicy: handoff.sourceLanguagePolicy,
  };
}

function buildSourceRequestIdentity(
  request: SourceAcquisitionRequest,
): SourceAcquisitionCandidateBudgetSnapshot["sourceRequestIdentity"] {
  return {
    requestVersion: request.requestVersion,
    selectedAtomicClaimIds: [...request.intake.selectedAtomicClaimIds],
    runId: request.intake.runId,
    currentDate: request.intake.currentDate,
    detectedLanguage: request.intake.detectedLanguage,
  };
}

export function buildSourceAcquisitionCandidateProviderNetworkCandidateBudgetSnapshot(params: {
  readonly handoff: QueryPlanSourceAcquisitionHandoff;
  readonly request: SourceAcquisitionRequest;
}): SourceAcquisitionCandidateBudgetSnapshot {
  const base = {
    version: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
    source: "v2_7n3b1_candidate_runtime",
    approval: candidateRuntimeApproval(),
    handoffIdentity: buildHandoffIdentity(params.handoff),
    sourceRequestIdentity: buildSourceRequestIdentity(params.request),
    queryEntryCount: params.handoff.queryEntries.length,
    maxAttemptsPerQuery: 1,
    maxCandidateRecordsPerQuery: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_CANDIDATES_PER_QUERY,
    providerTimeoutMs: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_PROVIDER_TIMEOUT_MS,
    totalCandidateAcquisitionTimeoutMs: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_TOTAL_TIMEOUT_MS,
    cancellationState: "not_requested",
    retryPolicy: "none",
    partialExecutionSemantics: "structural_query_outcome_per_query",
  } as const;

  return {
    ...base,
    budgetSnapshotHash: sha256Json(base),
  };
}

function candidateBudgetSnapshotIsExact(
  snapshot: SourceAcquisitionCandidateBudgetSnapshot,
  handoff: QueryPlanSourceAcquisitionHandoff,
  request: SourceAcquisitionRequest,
): boolean {
  const expected = buildSourceAcquisitionCandidateProviderNetworkCandidateBudgetSnapshot({ handoff, request });
  return JSON.stringify(snapshot) === JSON.stringify(expected)
    && snapshot.budgetSnapshotHash === hashWithoutKey(snapshot, "budgetSnapshotHash");
}

function buildParentAuthoritySnapshot(params: {
  readonly providerAllowlist: SourceAcquisitionCandidateProviderAllowlistSnapshot;
  readonly budget: SourceAcquisitionCandidateBudgetSnapshot;
}): SourceAcquisitionRuntimeAuthoritySnapshot {
  return {
    kind: "source_acquisition_runtime_authority_7n3a",
    source: "v2_7n3a_source_io_authority_boundary_package",
    authorityVersion: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_VERSION_LITERAL,
    packagePath: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH_LITERAL,
    approval: {
      status: "approved_7n3a_authority_contract_only",
      approvedBy: "deputy_review_team",
      packagePath: SOURCE_ACQUISITION_RUNTIME_AUTHORITY_PACKAGE_PATH_LITERAL,
      packageCommit: "8b4035cc",
      approvedScope: "authority_boundary_contracts_only",
    },
    visibility: "internal_only",
    configSnapshot: {
      source: "v2_task_policy_snapshot",
      freezeLocation: "runtime_owner_contract",
      configSnapshotHash: params.providerAllowlist.configSnapshotHash,
      providerAllowlistSnapshotHash: params.providerAllowlist.providerAllowlistSnapshotHash,
      budgetSnapshotHash: params.budget.budgetSnapshotHash,
      executionState: "not_executable_authority_contract_only",
    },
    capabilityScope: {
      concreteProviderIo: false,
      providerSdk: false,
      searchFetch: false,
      network: false,
      parser: false,
      urlDereference: false,
      cacheRead: false,
      cacheWrite: false,
      durableStorage: false,
      sourceReliability: false,
      productRuntime: false,
      publicExposure: false,
      liveJobs: false,
      acsPreparedSnapshot: false,
      directUrl: false,
      evidenceCorpusPopulation: false,
      semanticInterpretation: false,
    },
    futureGate: "requires_7n3b_concrete_io_gate",
  };
}

function buildRuntimeContractAuthorityHash(params: {
  readonly providerAllowlist: SourceAcquisitionCandidateProviderAllowlistSnapshot;
  readonly budget: SourceAcquisitionCandidateBudgetSnapshot;
}): {
  readonly authority: SourceAcquisitionCandidateRuntimeAuthority;
  readonly hash: string;
  readonly candidateAuthority: SourceAcquisitionCandidateRuntimeAuthority;
} {
  const parentAuthority = createSourceAcquisitionRuntimeAuthority(buildParentAuthoritySnapshot(params));
  const candidateAuthority = createSourceAcquisitionCandidateRuntimeAuthority({
    parentAuthority,
    configSnapshotHash: params.providerAllowlist.configSnapshotHash,
    providerAllowlistSnapshotHash: params.providerAllowlist.providerAllowlistSnapshotHash,
    budgetSnapshotHash: params.budget.budgetSnapshotHash,
  });
  return {
    authority: candidateAuthority,
    candidateAuthority,
    hash: sha256Json(readSourceAcquisitionCandidateRuntimeAuthoritySnapshot(candidateAuthority)),
  };
}

export function buildSourceAcquisitionCandidateProviderNetworkBudgetSnapshot(params: {
  readonly endpointSnapshot: SourceAcquisitionNetworkEndpointSnapshot;
  readonly providerAllowlist: SourceAcquisitionCandidateProviderAllowlistSnapshot;
  readonly candidateBudget: SourceAcquisitionCandidateBudgetSnapshot;
}): SourceAcquisitionNetworkBudgetSnapshot {
  const base = {
    version: SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
    approval: sourceAcquisitionNetworkApproval(),
    endpointSnapshotHash: params.endpointSnapshot.endpointSnapshotHash,
    candidateRuntimeConfigSnapshotHash: params.providerAllowlist.configSnapshotHash,
    candidateRuntimeProviderAllowlistSnapshotHash: params.providerAllowlist.providerAllowlistSnapshotHash,
    candidateRuntimeBudgetSnapshotHash: params.candidateBudget.budgetSnapshotHash,
    maxProvidersPerRun: 1,
    maxQueriesPerProvider: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
    maxAttemptsPerQuery: 1,
    maxCandidatesPerQuery: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_CANDIDATES_PER_QUERY,
    perQueryTimeoutMs: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_PROVIDER_TIMEOUT_MS,
    totalNetworkTimeoutMs: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_TOTAL_TIMEOUT_MS,
    retryPolicy: "none",
    noCache: true,
    noStorage: true,
    noSourceReliability: true,
    noProduct: true,
    noPublic: true,
  } as const;

  return {
    ...base,
    networkBudgetSnapshotHash: sha256Json(base),
  };
}

function networkBudgetSnapshotIsExact(
  snapshot: SourceAcquisitionNetworkBudgetSnapshot,
  endpointSnapshot: SourceAcquisitionNetworkEndpointSnapshot,
  providerAllowlist: SourceAcquisitionCandidateProviderAllowlistSnapshot,
  candidateBudget: SourceAcquisitionCandidateBudgetSnapshot,
): boolean {
  const expected = buildSourceAcquisitionCandidateProviderNetworkBudgetSnapshot({
    endpointSnapshot,
    providerAllowlist,
    candidateBudget,
  });
  return validateSourceAcquisitionNetworkBudgetSnapshot(snapshot).status === "valid"
    && JSON.stringify(snapshot) === JSON.stringify(expected)
    && snapshot.networkBudgetSnapshotHash === hashWithoutKey(snapshot, "networkBudgetSnapshotHash");
}

export function buildSourceAcquisitionCandidateProviderNetworkAuthoritySnapshot(params: {
  readonly endpointSnapshotHash: string;
  readonly networkBudgetSnapshotHash: string;
  readonly providerAllowlistSnapshotHash: string;
  readonly candidateBudgetSnapshotHash: string;
}): SourceAcquisitionCandidateProviderNetworkAuthoritySnapshot {
  const base = {
    authorityVersion: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_VERSION,
    status: "approved_x7w2_product_candidate_provider_network",
    approvedBy: "captain_deputy_review_team",
    sourcePackage: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_SOURCE_PACKAGE,
    packageCommit: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_PACKAGE_COMMIT,
    approvedScope: "product_internal_candidate_provider_network_one_endpoint",
    visibility: "internal_only",
    providerId: WIKIMEDIA_PROVIDER_ID,
    endpointId: WIKIMEDIA_ENDPOINT_ID,
    endpointSnapshotHash: params.endpointSnapshotHash,
    networkBudgetSnapshotHash: params.networkBudgetSnapshotHash,
    providerAllowlistSnapshotHash: params.providerAllowlistSnapshotHash,
    candidateBudgetSnapshotHash: params.candidateBudgetSnapshotHash,
    providerNetworkImplementationCommit: SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT,
    capabilityScope: {
      candidateProviderNetwork: "approved_wikimedia_core_search_only",
      providerSdk: false,
      arbitraryUrlDereference: false,
      contentDereference: false,
      parser: false,
      cacheRead: false,
      cacheWrite: false,
      durableStorage: false,
      sourceReliability: false,
      sourceMaterial: false,
      evidenceCorpus: false,
      evidenceItem: false,
      warning: false,
      report: false,
      verdict: false,
      confidence: false,
      publicExposure: false,
      liveJobs: false,
      acsPreparedSnapshot: false,
      directUrl: false,
    },
  } as const;

  return {
    ...base,
    authoritySnapshotHash: sha256Json(base),
  };
}

function w2AuthoritySnapshotIsValid(params: {
  readonly snapshot: SourceAcquisitionCandidateProviderNetworkAuthoritySnapshot;
  readonly endpointSnapshotHash: string;
  readonly networkBudgetSnapshotHash: string;
  readonly providerAllowlistSnapshotHash: string;
  readonly candidateBudgetSnapshotHash: string;
}): boolean {
  const snapshot = params.snapshot;
  if (
    snapshot.endpointSnapshotHash !== params.endpointSnapshotHash
    || snapshot.networkBudgetSnapshotHash !== params.networkBudgetSnapshotHash
    || snapshot.providerAllowlistSnapshotHash !== params.providerAllowlistSnapshotHash
    || snapshot.candidateBudgetSnapshotHash !== params.candidateBudgetSnapshotHash
  ) {
    return false;
  }

  return w2AuthoritySnapshotHasExactShape(snapshot);
}

function w2AuthoritySnapshotHasExactShape(
  snapshot: SourceAcquisitionCandidateProviderNetworkAuthoritySnapshot,
): boolean {
  if (!requiredKeysMatch(snapshot as unknown as Record<string, unknown>, [
    "approvedBy",
    "approvedScope",
    "authoritySnapshotHash",
    "authorityVersion",
    "candidateBudgetSnapshotHash",
    "capabilityScope",
    "endpointId",
    "endpointSnapshotHash",
    "networkBudgetSnapshotHash",
    "packageCommit",
    "providerAllowlistSnapshotHash",
    "providerId",
    "providerNetworkImplementationCommit",
    "sourcePackage",
    "status",
    "visibility",
  ])) {
    return false;
  }
  const expected = buildSourceAcquisitionCandidateProviderNetworkAuthoritySnapshot({
    endpointSnapshotHash: snapshot.endpointSnapshotHash,
    networkBudgetSnapshotHash: snapshot.networkBudgetSnapshotHash,
    providerAllowlistSnapshotHash: snapshot.providerAllowlistSnapshotHash,
    candidateBudgetSnapshotHash: snapshot.candidateBudgetSnapshotHash,
  });
  return JSON.stringify(snapshot) === JSON.stringify(expected)
    && snapshot.authoritySnapshotHash === hashWithoutKey(snapshot, "authoritySnapshotHash");
}

function readyHandoff(
  decision: QueryPlanSourceAcquisitionHandoffDecision,
): QueryPlanSourceAcquisitionHandoff | null {
  return decision.status === "ready_not_executable" ? decision.handoff : null;
}

function readyRequest(
  decision: SourceAcquisitionStartDecision,
): SourceAcquisitionRequest | null {
  return decision.status === "source_acquisition_ready_not_executable" ? decision.request : null;
}

function networkQueryRef(index: number): string {
  return `W2Q_${String(index + 1).padStart(3, "0")}`;
}

function summarizeRuntimeDecision(
  decision: SourceAcquisitionCandidateRuntimeDecision,
): readonly SourceAcquisitionCandidateProviderNetworkQuerySummary[] {
  return decision.queryOutcomes.map((outcome, index) => ({
    ordinal: index + 1,
    candidateProviderNetworkQueryRef: networkQueryRef(index),
    status: outcome.status,
    structuralReason: outcome.structuralReason,
    providerAttemptObserved: outcome.providerAttemptId !== null,
    candidateCount: outcome.candidateCount,
  }));
}

function runtimeDecisionHasCompletedCoverage(
  decision: SourceAcquisitionCandidateRuntimeDecision,
  handoff: QueryPlanSourceAcquisitionHandoff,
): boolean {
  const expectedQueryCount = handoff.queryEntries.length;
  return decision.status === "completed_structural"
    && decision.queryOutcomes.length === expectedQueryCount
    && decision.queryOutcomes.every((outcome, index) =>
      outcome.status === "attempted"
      && outcome.structuralReason === "not_stopped"
      && outcome.providerAttemptId !== null
      && outcome.queryId === handoff.queryEntries[index]?.queryId
    );
}

function w1bPrerequisiteIsValid(
  closedLoop: SourceAcquisitionCandidateRuntimeClosedLoopDecision,
): boolean {
  const expected = buildSourceAcquisitionCandidateRuntimeClosedLoopAuthoritySnapshot();
  return closedLoop.status === "closed_loop_completed_no_source_candidates"
    && closedLoop.productClosedLoopAuthorityHash === expected.authoritySnapshotHash
    && closedLoop.telemetry.candidateRuntimeExercised === true
    && closedLoop.telemetry.providerNetworkExecuted === false
    && closedLoop.telemetry.sourceMaterialCreated === false
    && closedLoop.telemetry.evidenceCorpusCreated === false
    && closedLoop.publicCutoverStatus === "blocked_precutover";
}

export async function runSourceAcquisitionCandidateProviderNetworkLoop(params: {
  readonly handoffDecision: QueryPlanSourceAcquisitionHandoffDecision;
  readonly sourceAcquisitionStartDecision: SourceAcquisitionStartDecision;
  readonly sourceAcquisitionIntakeBoundary: SourceAcquisitionIntakeBoundaryDecision;
  readonly candidateRuntimeClosedLoop: SourceAcquisitionCandidateRuntimeClosedLoopDecision;
  readonly w2AuthoritySnapshot?: SourceAcquisitionCandidateProviderNetworkAuthoritySnapshot;
  readonly providerAllowlistSnapshot?: SourceAcquisitionCandidateProviderAllowlistSnapshot;
  readonly candidateBudgetSnapshot?: SourceAcquisitionCandidateBudgetSnapshot;
  readonly endpointSnapshot?: SourceAcquisitionNetworkEndpointSnapshot;
  readonly networkBudgetSnapshot?: SourceAcquisitionNetworkBudgetSnapshot;
  readonly lowLevelTransport?: LowLevelTransportOption;
  readonly candidatePreviewProjectionSink?: (projection: SourceCandidatePreviewProjection) => void;
  readonly sourceMaterialPageSummaryFetchLocatorSink?: (locator: SourceMaterialPageSummaryFetchLocator) => void;
  readonly openAlexSourceMaterialRecordSink?: (record: SourceMaterialPageSummaryRecord) => void;
}): Promise<SourceAcquisitionCandidateProviderNetworkLoopDecision> {
  const closedLoopStatus = params.candidateRuntimeClosedLoop.status;
  const handoffStatus = params.handoffDecision.status;
  const requestStatus = params.sourceAcquisitionStartDecision.status;
  const intakeStatus = params.sourceAcquisitionIntakeBoundary.status;

  if (!w1bPrerequisiteIsValid(params.candidateRuntimeClosedLoop)) {
    return blocked({
      reason: "candidate_runtime_closed_loop_not_completed",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
    });
  }

  const handoff = readyHandoff(params.handoffDecision);
  if (!handoff) {
    return blocked({
      reason: "query_plan_handoff_not_ready",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
    });
  }

  const request = readyRequest(params.sourceAcquisitionStartDecision);
  if (!request) {
    return blocked({
      reason: "source_acquisition_request_not_ready",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
    });
  }

  if (intakeStatus !== "intake_ready_not_executable") {
    return blocked({
      reason: "source_acquisition_intake_not_ready",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
    });
  }

  if (handoff.queryEntries.length > SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES) {
    return blocked({
      reason: "query_count_exceeds_w2_cap",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
    });
  }

  const endpointSnapshot = params.endpointSnapshot
    ?? buildSourceAcquisitionCandidateProviderNetworkEndpointSnapshot();
  if (!endpointSnapshotIsExact(endpointSnapshot)) {
    return blocked({
      reason: "network_endpoint_invalid",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
    });
  }

  const providerAllowlist = params.providerAllowlistSnapshot
    ?? buildSourceAcquisitionCandidateProviderNetworkAllowlistSnapshot({
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
    });
  if (!providerAllowlistSnapshotIsExact(providerAllowlist, endpointSnapshot.endpointSnapshotHash)) {
    return blocked({
      reason: "provider_allowlist_invalid",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
    });
  }

  const candidateBudget = params.candidateBudgetSnapshot
    ?? buildSourceAcquisitionCandidateProviderNetworkCandidateBudgetSnapshot({ handoff, request });
  if (!candidateBudgetSnapshotIsExact(candidateBudget, handoff, request)) {
    return blocked({
      reason: "candidate_budget_invalid",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
    });
  }

  const networkBudget = params.networkBudgetSnapshot
    ?? buildSourceAcquisitionCandidateProviderNetworkBudgetSnapshot({
      endpointSnapshot,
      providerAllowlist,
      candidateBudget,
    });
  if (!networkBudgetSnapshotIsExact(networkBudget, endpointSnapshot, providerAllowlist, candidateBudget)) {
    return blocked({
      reason: "network_budget_invalid",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
      networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
    });
  }

  const authoritySnapshot = params.w2AuthoritySnapshot
    ?? buildSourceAcquisitionCandidateProviderNetworkAuthoritySnapshot({
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
      networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
    });
  const productNetworkAuthorityHash = authoritySnapshot.authoritySnapshotHash;
  if (!w2AuthoritySnapshotIsValid({
    snapshot: authoritySnapshot,
    endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
    networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
    providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
    candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
  })) {
    return blocked({
      reason: "w2_authority_invalid",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productNetworkAuthorityHash,
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
      networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
    });
  }

  let runtimeContract: ReturnType<typeof buildRuntimeContractAuthorityHash>;
  try {
    runtimeContract = buildRuntimeContractAuthorityHash({ providerAllowlist, budget: candidateBudget });
  } catch {
    return blocked({
      reason: "runtime_contract_authority_invalid",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productNetworkAuthorityHash,
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
      networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
    });
  }

  let networkAuthority: ReturnType<typeof createSourceAcquisitionNetworkAuthority>;
  try {
    networkAuthority = createSourceAcquisitionNetworkAuthority({
      candidateAuthority: runtimeContract.candidateAuthority,
      endpointSnapshot,
      budgetSnapshot: networkBudget,
    });
  } catch {
    return blocked({
      reason: "network_authority_invalid",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productNetworkAuthorityHash,
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
      networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
    });
  }

  const networkAttempts: SourceAcquisitionNetworkAttemptTelemetryRecord[] = [];
  let runtimeDecision: SourceAcquisitionCandidateRuntimeDecision;
  try {
    const providerBoundary = buildSourceAcquisitionCandidateNetworkProviderBoundary({
      authority: networkAuthority,
      endpoints: [endpointSnapshot],
      budget: networkBudget,
      lowLevelTransport: params.lowLevelTransport,
      attemptTelemetrySink: (record) => networkAttempts.push(record),
      candidatePreviewProjectionSink: params.candidatePreviewProjectionSink,
      sourceMaterialPageSummaryFetchLocatorSink: params.sourceMaterialPageSummaryFetchLocatorSink,
      sourceMaterialPageSummaryLanguageCode: "en",
    });
    const runRequest: SourceAcquisitionCandidateRunRequest = {
      candidateRunId: `X7W2_NETWORK_${sha256Json({
        productNetworkAuthorityHash,
        budgetSnapshotHash: candidateBudget.budgetSnapshotHash,
        networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
      }).slice(0, 16).toUpperCase()}`,
      visibility: "internal_only",
      authority: runtimeContract.authority,
      handoffDecision: params.handoffDecision,
      sourceAcquisitionStartDecision: params.sourceAcquisitionStartDecision,
      providerAllowlist,
      budget: candidateBudget,
      providerBoundary,
    };
    runtimeDecision = await executeSourceAcquisitionCandidateRuntime(runRequest);
  } catch {
    return damaged({
      reason: "candidate_runtime_threw",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productNetworkAuthorityHash,
      runtimeContractAuthorityHash: runtimeContract.hash,
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
      networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
      runtimeStatus: null,
      networkAttempts,
    });
  }

  const queryOutcomeSummaries = summarizeRuntimeDecision(runtimeDecision);
  if (runtimeDecision.status === "blocked") {
    return blocked({
      reason: "candidate_runtime_blocked",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productNetworkAuthorityHash,
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
      networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
    });
  }

  if (runtimeDecision.status === "damaged_structural") {
    return damaged({
      reason: "candidate_runtime_damaged",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productNetworkAuthorityHash,
      runtimeContractAuthorityHash: runtimeContract.hash,
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
      networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
      runtimeStatus: runtimeDecision.status,
      queryOutcomeSummaries,
      networkAttempts,
    });
  }

  if (networkAttempts.length === 0) {
    return damaged({
      reason: "provider_network_not_observed",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productNetworkAuthorityHash,
      runtimeContractAuthorityHash: runtimeContract.hash,
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
      networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
      runtimeStatus: runtimeDecision.status,
      queryOutcomeSummaries,
      networkAttempts,
    });
  }

  if (!runtimeDecisionHasCompletedCoverage(runtimeDecision, handoff)) {
    return damaged({
      reason: "candidate_runtime_query_coverage_invalid",
      closedLoopStatus,
      handoffStatus,
      requestStatus,
      intakeStatus,
      selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
      queryEntryCount: handoff.queryEntries.length,
      retrievalPolicyCount: request.retrievalPolicyCatalog.length,
      sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
      productNetworkAuthorityHash,
      runtimeContractAuthorityHash: runtimeContract.hash,
      endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
      networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
      runtimeStatus: runtimeDecision.status,
      queryOutcomeSummaries,
      networkAttempts,
    });
  }

  if (params.openAlexSourceMaterialRecordSink) {
    try {
      const endpoint = buildOpenAlexWorksSourceMaterialEndpointSnapshot();
      const openAlexProviderAllowlist = buildOpenAlexSourceMaterialProviderAllowlistSnapshot({
        endpointSnapshotHash: endpoint.endpointSnapshotHash,
      });
      const openAlexRuntimeContract = buildRuntimeContractAuthorityHash({
        providerAllowlist: openAlexProviderAllowlist,
        budget: candidateBudget,
      });
      const budget = buildSourceAcquisitionCandidateProviderNetworkBudgetSnapshot({
        endpointSnapshot: endpoint,
        providerAllowlist: openAlexProviderAllowlist,
        candidateBudget,
      });
      const authority = createSourceAcquisitionNetworkAuthority({
        candidateAuthority: openAlexRuntimeContract.candidateAuthority,
        endpointSnapshot: endpoint,
        budgetSnapshot: budget,
      });
      const openAlexRecords = await collectOpenAlexSourceMaterialRecordsFromNetwork({
        authority,
        endpoint,
        budget,
        queryEntries: handoff.queryEntries,
        lowLevelTransport: params.lowLevelTransport,
        startingAttemptOrdinal: networkAttempts.length,
        attemptTelemetrySink: (record) => networkAttempts.push(record),
        candidatePreviewProjectionSink: params.candidatePreviewProjectionSink,
      });
      for (const record of openAlexRecords) {
        params.openAlexSourceMaterialRecordSink(record);
      }
    } catch {
      // OpenAlex source-material diversity is additive for W6-F1 and must not corrupt the completed Wikimedia path.
    }
  }

  return {
    networkLoopVersion: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_LOOP_VERSION,
    visibility: "internal_only",
    status: "candidate_provider_network_completed",
    blockedReason: null,
    damagedReason: null,
    closedLoopStatus,
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    intakeStatus: "intake_ready_not_executable",
    selectedAtomicClaimCount: handoff.selectedAtomicClaimIds.length,
    queryEntryCount: handoff.queryEntries.length,
    retrievalPolicyCount: request.retrievalPolicyCatalog.length,
    sourceLanguageSignal: params.sourceAcquisitionIntakeBoundary.sourceLanguageSignal,
    productNetworkAuthorityHash,
    runtimeContractAuthorityHash: runtimeContract.hash,
    endpointSnapshotHash: endpointSnapshot.endpointSnapshotHash,
    networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
    providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
    candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
    runtimeStatus: runtimeDecision.status,
    queryOutcomeSummaries,
    telemetry: telemetryFromRuntime({ runtimeDecision, networkAttempts }),
    downstreamGate: "candidate_to_source_material_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  };
}
