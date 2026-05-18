export const SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION =
  "v2.source-acquisition.provider-network.7n3b2";
export const SOURCE_ACQUISITION_NETWORK_PACKAGE_PATH =
  "Docs/WIP/2026-05-16_V2_Slice_7N3B2_Candidate_Provider_Network_Source_Package.md";
export const SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT = "54b8af1a";

export type SourceAcquisitionNetworkApproval = {
  readonly status: "approved_7n3b2_candidate_provider_network";
  readonly approvedBy: "deputy_review_team";
  readonly packagePath: typeof SOURCE_ACQUISITION_NETWORK_PACKAGE_PATH;
  readonly packageCommit: typeof SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT;
  readonly approvedScope: "candidate_provider_network_only_sdk_free";
};

export type SourceAcquisitionNetworkRequestParameter = {
  readonly key: string;
  readonly valueSource: "query_text" | "retrieval_policy_key" | "max_candidate_records";
};

export type SourceAcquisitionNetworkRequestHeader = {
  readonly key: "accept" | "user-agent";
  readonly valueSource: "application_json" | "factharbor_internal_agent";
};

export type SourceAcquisitionNetworkEndpointSnapshot = {
  readonly version: typeof SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION;
  readonly approval: SourceAcquisitionNetworkApproval;
  readonly endpointSnapshotHash: string;
  readonly providerId: string;
  readonly endpointId: string;
  readonly canonicalAsciiHostname: string;
  readonly protocol: "https";
  readonly port: number;
  readonly path: string;
  readonly method: "GET";
  readonly allowedRequestParameters: readonly SourceAcquisitionNetworkRequestParameter[];
  readonly allowedRequestHeaders: readonly SourceAcquisitionNetworkRequestHeader[];
  readonly credentialsState: "not_required" | "present_without_secret";
  readonly redirectPolicy: "deny";
  readonly proxyPolicy: "none";
  readonly responseContentTypePolicy: {
    readonly allowedContentTypes: readonly ["application/json"];
  };
  readonly responseSniffPolicy: "json_object_or_array";
  readonly responseCandidatePointer:
    | {
        readonly kind: "top_level_array";
      }
    | {
        readonly kind: "object_array_field";
        readonly fieldName: string;
      };
  readonly decompressionPolicy: "identity_only" | "gzip_allowed";
  readonly compressedByteCap: number;
  readonly decompressedByteCap: number;
  readonly totalByteCap: number;
  readonly timeoutMs: number;
  readonly noCache: true;
  readonly noStorage: true;
  readonly noSourceReliability: true;
  readonly noProduct: true;
  readonly noPublic: true;
};

export type SourceAcquisitionNetworkBudgetSnapshot = {
  readonly version: typeof SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION;
  readonly approval: SourceAcquisitionNetworkApproval;
  readonly networkBudgetSnapshotHash: string;
  readonly endpointSnapshotHash: string;
  readonly candidateRuntimeConfigSnapshotHash: string;
  readonly candidateRuntimeProviderAllowlistSnapshotHash: string;
  readonly candidateRuntimeBudgetSnapshotHash: string;
  readonly maxProvidersPerRun: number;
  readonly maxQueriesPerProvider: number;
  readonly maxAttemptsPerQuery: 1;
  readonly maxCandidatesPerQuery: number;
  readonly perQueryTimeoutMs: number;
  readonly totalNetworkTimeoutMs: number;
  readonly retryPolicy: "none";
  readonly noCache: true;
  readonly noStorage: true;
  readonly noSourceReliability: true;
  readonly noProduct: true;
  readonly noPublic: true;
};

export type SourceAcquisitionNetworkRequestEnvelope = {
  readonly version: typeof SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION;
  readonly visibility: "internal_only";
  readonly providerId: string;
  readonly endpointId: string;
  readonly queryId: string;
  readonly retrievalPolicyKey: string;
  readonly providerAttemptId: string;
  readonly requestParameters: readonly {
    readonly key: string;
    readonly value: string;
  }[];
  readonly requestHeaders: readonly SourceAcquisitionNetworkRequestHeader[];
};

export type SourceAcquisitionNetworkStopReason =
  | "not_stopped"
  | "authority_invalid"
  | "endpoint_invalid"
  | "budget_invalid"
  | "request_invalid"
  | "dns_resolution_failed"
  | "dns_address_blocked"
  | "final_address_mismatch"
  | "redirect_denied"
  | "http_status_rejected"
  | "content_type_rejected"
  | "content_sniff_rejected"
  | "compressed_byte_cap_exceeded"
  | "decompressed_byte_cap_exceeded"
  | "response_byte_cap_exceeded"
  | "json_parse_failed"
  | "timed_out"
  | "cancelled"
  | "transport_failure";

export type SourceAcquisitionNetworkSelectedAddressFamily =
  | "not_reached"
  | "ipv4"
  | "ipv6";

export type SourceAcquisitionNetworkTransportFailureClass =
  | "not_applicable"
  | "dns_resolution_failure"
  | "connection_reset"
  | "connection_refused"
  | "network_unreachable"
  | "host_unreachable"
  | "socket_timeout"
  | "tls_failure"
  | "address_family_failure"
  | "address_validation_failure"
  | "unknown_transport_failure";

export type SourceAcquisitionNetworkTransportFailurePhase =
  | "not_applicable"
  | "dns_resolution"
  | "address_selection"
  | "socket_connect"
  | "tls_handshake"
  | "request_write"
  | "response_wait"
  | "response_stream"
  | "unknown_phase";

export type SourceAcquisitionNetworkTransportErrorShape =
  | "not_applicable"
  | "node_error_code_present"
  | "node_error_code_absent"
  | "synthetic_timeout_marker"
  | "synthetic_cancel_marker"
  | "non_error_throwable";

export type SourceAcquisitionNetworkNodeErrorCodeCategory =
  | "none"
  | "dns_not_found"
  | "dns_temporary_failure"
  | "connection_refused"
  | "connection_reset"
  | "connection_timeout"
  | "network_unreachable"
  | "host_unreachable"
  | "address_family_failure"
  | "address_validation_failure"
  | "operation_canceled"
  | "tls_certificate"
  | "tls_protocol"
  | "http_parser"
  | "other_known"
  | "unknown_absent";

export type SourceAcquisitionNetworkHiddenDiagnostic = {
  readonly version: typeof SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION;
  readonly visibility: "internal_only";
  readonly providerId: string;
  readonly endpointId: string;
  readonly queryId: string;
  readonly providerAttemptId: string;
  readonly status: "success" | "blocked" | "failed" | "timed_out" | "cancelled";
  readonly stopReason: SourceAcquisitionNetworkStopReason;
  readonly durationMs: number;
  readonly timeoutMs: number;
  readonly dnsAddressCount: number;
  readonly selectedAddressFamily: SourceAcquisitionNetworkSelectedAddressFamily;
  readonly finalAddressValidation:
    | "not_reached"
    | "matched_validated_public_address"
    | "blocked_or_mismatched";
  readonly responseStatusCodeCategory: "not_reached" | "success_2xx" | "redirect_3xx" | "rejected";
  readonly contentTypeState: "not_reached" | "accepted_json" | "rejected";
  readonly transportFailureClass: SourceAcquisitionNetworkTransportFailureClass;
  readonly transportFailurePhase: SourceAcquisitionNetworkTransportFailurePhase;
  readonly transportErrorShape: SourceAcquisitionNetworkTransportErrorShape;
  readonly nodeErrorCodeCategory: SourceAcquisitionNetworkNodeErrorCodeCategory;
  readonly compressedBytes: number;
  readonly decompressedBytes: number;
  readonly redirectDenied: boolean;
  readonly rawPayloadIncluded: false;
  readonly secretIncluded: false;
  readonly publicPayloadIncluded: false;
  readonly errorTraceIncluded: false;
  readonly cacheKeyConstructed: false;
  readonly sourceReliabilityTouched: false;
};

export type SourceAcquisitionNetworkTransportOutcome =
  | {
      readonly status: "success";
      readonly candidateCount: number;
      readonly diagnostic: SourceAcquisitionNetworkHiddenDiagnostic;
    }
  | {
      readonly status: "blocked" | "failed" | "timed_out" | "cancelled";
      readonly candidateCount: 0;
      readonly diagnostic: SourceAcquisitionNetworkHiddenDiagnostic;
    };

export type SourceAcquisitionNetworkValidationResult =
  | {
      readonly status: "valid";
      readonly blockedReasons: readonly [];
    }
  | {
      readonly status: "blocked";
      readonly blockedReasons: readonly string[];
    };

const forbiddenPlaceholderValues = new Set(["", "placeholder", "todo", "unknown"]);
const forbiddenStructuralFragments = [
  "://",
  "\\",
  "?",
  "#",
  "key",
  "secret",
  "token",
  "password",
  "credential",
  "bearer",
  "sk_",
];
const forbiddenEndpointFields = [
  "rawUrl",
  "url",
  "endpointUrl",
  "queryStringTemplate",
  "secret",
  "bearerToken",
  "apiKey",
  "rawRequestBody",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function valuesAreUnique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function hashValueIsValid(value: unknown): value is string {
  return isNonBlankString(value)
    && value === value.trim()
    && !forbiddenPlaceholderValues.has(value.toLowerCase());
}

function structuralKeyIsValid(value: unknown): value is string {
  if (!isNonBlankString(value) || value !== value.trim()) {
    return false;
  }

  return /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value)
    && !forbiddenPlaceholderValues.has(value.toLowerCase())
    && !forbiddenStructuralFragments.some((fragment) => value.includes(fragment));
}

function providerIdIsValid(value: unknown): value is string {
  return structuralKeyIsValid(value) && value === value.toLowerCase() && !value.includes("-");
}

function endpointIdIsValid(value: unknown): value is string {
  return isNonBlankString(value)
    && value === value.trim()
    && /^ep_[a-z0-9_]{1,63}$/.test(value)
    && !forbiddenStructuralFragments.some((fragment) => value.includes(fragment));
}

function providerAttemptIdIsValid(value: unknown): value is string {
  return isNonBlankString(value)
    && value === value.trim()
    && /^ATT_[0-9]+$/.test(value);
}

function hostnameIsCanonicalAscii(value: unknown): value is string {
  if (!isNonBlankString(value) || value !== value.trim() || value !== value.toLowerCase()) {
    return false;
  }
  if (value.endsWith(".") || value.includes("..") || value.includes("_") || value.includes(":")) {
    return false;
  }
  if (!/^[a-z0-9.-]+$/.test(value)) {
    return false;
  }
  if (["localhost", "metadata.google.internal"].includes(value)) {
    return false;
  }
  const labels = value.split(".");
  return labels.length >= 2
    && labels.every((label) => label.length > 0 && label.length <= 63 && !label.startsWith("-") && !label.endsWith("-"));
}

function pathIsFixedSafe(value: unknown): value is string {
  return isNonBlankString(value)
    && value === value.trim()
    && value.startsWith("/")
    && !value.includes("://")
    && !value.includes("..")
    && !value.includes("?")
    && !value.includes("#")
    && /^[\x21-\x7e]+$/.test(value);
}

function approval(): SourceAcquisitionNetworkApproval {
  return {
    status: "approved_7n3b2_candidate_provider_network",
    approvedBy: "deputy_review_team",
    packagePath: SOURCE_ACQUISITION_NETWORK_PACKAGE_PATH,
    packageCommit: SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT,
    approvedScope: "candidate_provider_network_only_sdk_free",
  };
}

function approvalIsValid(value: SourceAcquisitionNetworkApproval): boolean {
  return isRecord(value)
    && hasExactKeys(value, [
      "approvedBy",
      "approvedScope",
      "packageCommit",
      "packagePath",
      "status",
    ])
    && value.status === "approved_7n3b2_candidate_provider_network"
    && value.approvedBy === "deputy_review_team"
    && value.packagePath === SOURCE_ACQUISITION_NETWORK_PACKAGE_PATH
    && value.packageCommit === SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT
    && value.approvedScope === "candidate_provider_network_only_sdk_free";
}

function requestParametersAreValid(
  parameters: readonly SourceAcquisitionNetworkRequestParameter[],
): boolean {
  return parameters.length > 0
    && valuesAreUnique(parameters.map((parameter) => parameter.key))
    && parameters.every((parameter) =>
      isRecord(parameter)
      && hasExactKeys(parameter, ["key", "valueSource"])
      && structuralKeyIsValid(parameter.key)
      && ["query_text", "retrieval_policy_key", "max_candidate_records"].includes(parameter.valueSource)
    );
}

function requestHeadersAreValid(headers: readonly SourceAcquisitionNetworkRequestHeader[]): boolean {
  return valuesAreUnique(headers.map((header) => header.key))
    && headers.every((header) =>
      isRecord(header)
      && hasExactKeys(header, ["key", "valueSource"])
      && ["accept", "user-agent"].includes(header.key)
      && ["application_json", "factharbor_internal_agent"].includes(header.valueSource)
    );
}

function responseCandidatePointerIsValid(
  value: SourceAcquisitionNetworkEndpointSnapshot["responseCandidatePointer"],
): boolean {
  if (!isRecord(value)) {
    return false;
  }
  if (value.kind === "top_level_array") {
    return hasExactKeys(value, ["kind"]);
  }
  return value.kind === "object_array_field"
    && hasExactKeys(value, ["fieldName", "kind"])
    && structuralKeyIsValid(value.fieldName);
}

function boundaryFlagsAreClosed(value: {
  readonly noCache: boolean;
  readonly noStorage: boolean;
  readonly noSourceReliability: boolean;
  readonly noProduct: boolean;
  readonly noPublic: boolean;
}): boolean {
  return value.noCache === true
    && value.noStorage === true
    && value.noSourceReliability === true
    && value.noProduct === true
    && value.noPublic === true;
}

function containsForbiddenEndpointFields(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return forbiddenEndpointFields.some((field) => keys.includes(field));
}

export function sourceAcquisitionNetworkApproval(): SourceAcquisitionNetworkApproval {
  return approval();
}

export function validateSourceAcquisitionNetworkEndpointSnapshot(
  snapshot: SourceAcquisitionNetworkEndpointSnapshot,
): SourceAcquisitionNetworkValidationResult {
  const blockedReasons: string[] = [];

  if (!isRecord(snapshot)) {
    return { status: "blocked", blockedReasons: ["snapshot_not_record"] };
  }

  if (
    !hasExactKeys(snapshot, [
      "allowedRequestHeaders",
      "allowedRequestParameters",
      "approval",
      "canonicalAsciiHostname",
      "compressedByteCap",
      "credentialsState",
      "decompressedByteCap",
      "decompressionPolicy",
      "endpointId",
      "endpointSnapshotHash",
      "method",
      "noCache",
      "noProduct",
      "noPublic",
      "noSourceReliability",
      "noStorage",
      "path",
      "port",
      "protocol",
      "providerId",
      "proxyPolicy",
      "redirectPolicy",
      "responseCandidatePointer",
      "responseContentTypePolicy",
      "responseSniffPolicy",
      "timeoutMs",
      "totalByteCap",
      "version",
    ])
    || containsForbiddenEndpointFields(snapshot)
  ) {
    blockedReasons.push("endpoint_shape_invalid");
  }

  if (snapshot.version !== SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION || !approvalIsValid(snapshot.approval)) {
    blockedReasons.push("approval_invalid");
  }

  if (!hashValueIsValid(snapshot.endpointSnapshotHash)) {
    blockedReasons.push("endpoint_hash_invalid");
  }

  if (!providerIdIsValid(snapshot.providerId) || !endpointIdIsValid(snapshot.endpointId)) {
    blockedReasons.push("provider_or_endpoint_id_invalid");
  }

  if (!hostnameIsCanonicalAscii(snapshot.canonicalAsciiHostname)) {
    blockedReasons.push("hostname_invalid");
  }

  if (
    snapshot.protocol !== "https"
    || !positiveInteger(snapshot.port)
    || snapshot.port > 65535
    || !pathIsFixedSafe(snapshot.path)
    || snapshot.method !== "GET"
  ) {
    blockedReasons.push("network_target_invalid");
  }

  if (
    !Array.isArray(snapshot.allowedRequestParameters)
    || !requestParametersAreValid(snapshot.allowedRequestParameters)
    || !Array.isArray(snapshot.allowedRequestHeaders)
    || !requestHeadersAreValid(snapshot.allowedRequestHeaders)
  ) {
    blockedReasons.push("request_policy_invalid");
  }

  if (
    !["not_required", "present_without_secret"].includes(snapshot.credentialsState)
    || snapshot.redirectPolicy !== "deny"
    || snapshot.proxyPolicy !== "none"
  ) {
    blockedReasons.push("credential_or_redirect_policy_invalid");
  }

  const allowedContentTypes = isRecord(snapshot.responseContentTypePolicy)
    ? snapshot.responseContentTypePolicy.allowedContentTypes
    : null;
  if (
    !isRecord(snapshot.responseContentTypePolicy)
    || !hasExactKeys(snapshot.responseContentTypePolicy, ["allowedContentTypes"])
    || !Array.isArray(allowedContentTypes)
    || allowedContentTypes.length !== 1
    || allowedContentTypes[0] !== "application/json"
    || snapshot.responseSniffPolicy !== "json_object_or_array"
    || !responseCandidatePointerIsValid(snapshot.responseCandidatePointer)
  ) {
    blockedReasons.push("response_policy_invalid");
  }

  if (
    !["identity_only", "gzip_allowed"].includes(snapshot.decompressionPolicy)
    || !positiveInteger(snapshot.compressedByteCap)
    || !positiveInteger(snapshot.decompressedByteCap)
    || !positiveInteger(snapshot.totalByteCap)
    || !positiveInteger(snapshot.timeoutMs)
    || snapshot.compressedByteCap > snapshot.totalByteCap
    || snapshot.decompressedByteCap > snapshot.totalByteCap
  ) {
    blockedReasons.push("response_limits_invalid");
  }

  if (!boundaryFlagsAreClosed(snapshot)) {
    blockedReasons.push("boundary_flags_invalid");
  }

  return blockedReasons.length === 0
    ? { status: "valid", blockedReasons: [] }
    : { status: "blocked", blockedReasons };
}

export function validateSourceAcquisitionNetworkBudgetSnapshot(
  snapshot: SourceAcquisitionNetworkBudgetSnapshot,
): SourceAcquisitionNetworkValidationResult {
  const blockedReasons: string[] = [];

  if (!isRecord(snapshot)) {
    return { status: "blocked", blockedReasons: ["snapshot_not_record"] };
  }

  if (!hasExactKeys(snapshot, [
    "approval",
    "candidateRuntimeBudgetSnapshotHash",
    "candidateRuntimeConfigSnapshotHash",
    "candidateRuntimeProviderAllowlistSnapshotHash",
    "endpointSnapshotHash",
    "maxAttemptsPerQuery",
    "maxCandidatesPerQuery",
    "maxProvidersPerRun",
    "maxQueriesPerProvider",
    "networkBudgetSnapshotHash",
    "noCache",
    "noProduct",
    "noPublic",
    "noSourceReliability",
    "noStorage",
    "perQueryTimeoutMs",
    "retryPolicy",
    "totalNetworkTimeoutMs",
    "version",
  ])) {
    blockedReasons.push("budget_shape_invalid");
  }

  if (snapshot.version !== SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION || !approvalIsValid(snapshot.approval)) {
    blockedReasons.push("approval_invalid");
  }

  for (const hash of [
    snapshot.networkBudgetSnapshotHash,
    snapshot.endpointSnapshotHash,
    snapshot.candidateRuntimeConfigSnapshotHash,
    snapshot.candidateRuntimeProviderAllowlistSnapshotHash,
    snapshot.candidateRuntimeBudgetSnapshotHash,
  ]) {
    if (!hashValueIsValid(hash)) {
      blockedReasons.push("budget_hash_invalid");
      break;
    }
  }

  if (
    !positiveInteger(snapshot.maxProvidersPerRun)
    || !positiveInteger(snapshot.maxQueriesPerProvider)
    || snapshot.maxAttemptsPerQuery !== 1
    || !nonNegativeInteger(snapshot.maxCandidatesPerQuery)
    || !positiveInteger(snapshot.perQueryTimeoutMs)
    || !positiveInteger(snapshot.totalNetworkTimeoutMs)
    || snapshot.retryPolicy !== "none"
    || snapshot.perQueryTimeoutMs * snapshot.maxQueriesPerProvider > snapshot.totalNetworkTimeoutMs
  ) {
    blockedReasons.push("budget_limits_invalid");
  }

  if (!boundaryFlagsAreClosed(snapshot)) {
    blockedReasons.push("boundary_flags_invalid");
  }

  return blockedReasons.length === 0
    ? { status: "valid", blockedReasons: [] }
    : { status: "blocked", blockedReasons };
}

export function validateSourceAcquisitionNetworkRequestEnvelope(
  request: SourceAcquisitionNetworkRequestEnvelope,
  endpoint: SourceAcquisitionNetworkEndpointSnapshot,
): SourceAcquisitionNetworkValidationResult {
  const blockedReasons: string[] = [];

  if (!isRecord(request)) {
    return { status: "blocked", blockedReasons: ["request_not_record"] };
  }

  if (!hasExactKeys(request, [
    "endpointId",
    "providerAttemptId",
    "providerId",
    "queryId",
    "requestHeaders",
    "requestParameters",
    "retrievalPolicyKey",
    "version",
    "visibility",
  ])) {
    blockedReasons.push("request_shape_invalid");
  }

  if (
    request.version !== SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION
    || request.visibility !== "internal_only"
    || request.providerId !== endpoint.providerId
    || request.endpointId !== endpoint.endpointId
    || !structuralKeyIsValid(request.queryId)
    || !structuralKeyIsValid(request.retrievalPolicyKey)
    || !providerAttemptIdIsValid(request.providerAttemptId)
  ) {
    blockedReasons.push("request_identity_invalid");
  }

  const allowedParameterKeys = endpoint.allowedRequestParameters.map((parameter) => parameter.key);
  const requestParameterKeys = Array.isArray(request.requestParameters)
    ? request.requestParameters.map((parameter) => parameter.key)
    : [];
  if (
    !Array.isArray(request.requestParameters)
    || !valuesAreUnique(requestParameterKeys)
    || requestParameterKeys.some((key) => !allowedParameterKeys.includes(key))
    || request.requestParameters.some((parameter) =>
      !isRecord(parameter)
      || !hasExactKeys(parameter, ["key", "value"])
      || !structuralKeyIsValid(parameter.key)
      || !isNonBlankString(parameter.value)
    )
  ) {
    blockedReasons.push("request_parameters_invalid");
  }

  const allowedHeaderKeys = endpoint.allowedRequestHeaders.map((header) => header.key);
  if (
    !Array.isArray(request.requestHeaders)
    || !requestHeadersAreValid(request.requestHeaders)
    || request.requestHeaders.some((header) => !allowedHeaderKeys.includes(header.key))
  ) {
    blockedReasons.push("request_headers_invalid");
  }

  return blockedReasons.length === 0
    ? { status: "valid", blockedReasons: [] }
    : { status: "blocked", blockedReasons };
}

export function readSourceAcquisitionNetworkCandidateArray(
  json: unknown,
  pointer: SourceAcquisitionNetworkEndpointSnapshot["responseCandidatePointer"],
): readonly unknown[] | null {
  if (pointer.kind === "top_level_array") {
    return Array.isArray(json) ? json : null;
  }
  if (!isRecord(json)) {
    return null;
  }
  const value = json[pointer.fieldName];
  return Array.isArray(value) ? value : null;
}

export function buildSourceAcquisitionNetworkHiddenDiagnostic(params: {
  readonly providerId: string;
  readonly endpointId: string;
  readonly queryId: string;
  readonly providerAttemptId: string;
  readonly status: SourceAcquisitionNetworkHiddenDiagnostic["status"];
  readonly stopReason: SourceAcquisitionNetworkStopReason;
  readonly durationMs: number;
  readonly timeoutMs: number;
  readonly dnsAddressCount?: number;
  readonly selectedAddressFamily?: SourceAcquisitionNetworkSelectedAddressFamily;
  readonly finalAddressValidation?: SourceAcquisitionNetworkHiddenDiagnostic["finalAddressValidation"];
  readonly responseStatusCodeCategory?: SourceAcquisitionNetworkHiddenDiagnostic["responseStatusCodeCategory"];
  readonly contentTypeState?: SourceAcquisitionNetworkHiddenDiagnostic["contentTypeState"];
  readonly transportFailureClass?: SourceAcquisitionNetworkTransportFailureClass;
  readonly transportFailurePhase?: SourceAcquisitionNetworkTransportFailurePhase;
  readonly transportErrorShape?: SourceAcquisitionNetworkTransportErrorShape;
  readonly nodeErrorCodeCategory?: SourceAcquisitionNetworkNodeErrorCodeCategory;
  readonly compressedBytes?: number;
  readonly decompressedBytes?: number;
  readonly redirectDenied?: boolean;
}): SourceAcquisitionNetworkHiddenDiagnostic {
  return {
    version: SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION,
    visibility: "internal_only",
    providerId: params.providerId,
    endpointId: params.endpointId,
    queryId: params.queryId,
    providerAttemptId: params.providerAttemptId,
    status: params.status,
    stopReason: params.stopReason,
    durationMs: Math.max(0, Math.trunc(params.durationMs)),
    timeoutMs: params.timeoutMs,
    dnsAddressCount: params.dnsAddressCount ?? 0,
    selectedAddressFamily: params.selectedAddressFamily ?? "not_reached",
    finalAddressValidation: params.finalAddressValidation ?? "not_reached",
    responseStatusCodeCategory: params.responseStatusCodeCategory ?? "not_reached",
    contentTypeState: params.contentTypeState ?? "not_reached",
    transportFailureClass: params.transportFailureClass ?? "not_applicable",
    transportFailurePhase: params.transportFailurePhase ?? "not_applicable",
    transportErrorShape: params.transportErrorShape ?? "not_applicable",
    nodeErrorCodeCategory: params.nodeErrorCodeCategory ?? "none",
    compressedBytes: params.compressedBytes ?? 0,
    decompressedBytes: params.decompressedBytes ?? 0,
    redirectDenied: params.redirectDenied ?? false,
    rawPayloadIncluded: false,
    secretIncluded: false,
    publicPayloadIncluded: false,
    errorTraceIncluded: false,
    cacheKeyConstructed: false,
    sourceReliabilityTouched: false,
  };
}
