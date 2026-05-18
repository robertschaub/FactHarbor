import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { domainToASCII } from "node:url";
import { createGunzip } from "node:zlib";
import {
  SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID,
  type SourceMaterialPageSummaryFetchLocator,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator";
import {
  type SourceMaterialPageSummaryContentTypeCategory,
  type SourceMaterialPageSummaryResponseStatusCategory,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material";

export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_TRANSPORT_VERSION =
  "v2.evidence-lifecycle.source-material.page-summary-transport.x7w3b";
export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_TRANSPORT_TIMEOUT_MS = 1_500;
export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_COMPRESSED_BYTE_CAP = 8_192;
export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_DECOMPRESSED_BYTE_CAP = 16_384;
export const EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_TOTAL_BYTE_CAP = 16_384;

export type EvidenceLifecycleSourceMaterialPageSummaryTransportStatus =
  | "success"
  | "blocked"
  | "failed"
  | "timed_out"
  | "cancelled";

export type EvidenceLifecycleSourceMaterialPageSummaryStopReason =
  | "not_stopped"
  | "locator_ineligible"
  | "dns_resolution_failed"
  | "dns_address_blocked"
  | "final_address_mismatch"
  | "redirect_denied"
  | "http_status_rejected"
  | "content_type_rejected"
  | "compressed_byte_cap_exceeded"
  | "decompressed_byte_cap_exceeded"
  | "response_byte_cap_exceeded"
  | "json_parse_failed"
  | "timed_out"
  | "cancelled"
  | "transport_failure";

export type EvidenceLifecycleSourceMaterialPageSummarySelectedAddressFamily =
  | "not_reached"
  | "ipv4"
  | "ipv6";

export type EvidenceLifecycleSourceMaterialPageSummaryByteCapState =
  | "not_reached"
  | "within_cap"
  | "compressed_cap_exceeded"
  | "decompressed_cap_exceeded";

export type EvidenceLifecycleSourceMaterialPageSummaryFetchDiagnostic = {
  readonly diagnosticVersion: typeof EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_TRANSPORT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly attemptOrdinal: number;
  readonly locatorRef: string | null;
  readonly sourceMaterialRef: string | null;
  readonly providerId: "wikimedia_core";
  readonly endpointId: typeof SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID;
  readonly status: EvidenceLifecycleSourceMaterialPageSummaryTransportStatus;
  readonly stopReason: EvidenceLifecycleSourceMaterialPageSummaryStopReason;
  readonly durationMs: number;
  readonly timeoutMs: number;
  readonly dnsAddressCount: number;
  readonly selectedAddressFamily: EvidenceLifecycleSourceMaterialPageSummarySelectedAddressFamily;
  readonly finalAddressValidation: "not_reached" | "matched_validated_public_address" | "blocked_or_mismatched";
  readonly responseStatusCategory: SourceMaterialPageSummaryResponseStatusCategory;
  readonly contentTypeCategory: SourceMaterialPageSummaryContentTypeCategory;
  readonly compressedBytes: number;
  readonly decompressedBytes: number;
  readonly byteCapState: EvidenceLifecycleSourceMaterialPageSummaryByteCapState;
  readonly truncationApplied: false;
  readonly rawPayloadIncluded: false;
  readonly secretIncluded: false;
  readonly publicPayloadIncluded: false;
  readonly errorTraceIncluded: false;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly storageWrite: false;
  readonly sourceReliabilityTouched: false;
};

export type EvidenceLifecycleSourceMaterialPageSummaryTransportOutcome =
  | {
      readonly status: "success";
      readonly json: unknown;
      readonly diagnostic: EvidenceLifecycleSourceMaterialPageSummaryFetchDiagnostic;
    }
  | {
      readonly status: Exclude<EvidenceLifecycleSourceMaterialPageSummaryTransportStatus, "success">;
      readonly json: null;
      readonly diagnostic: EvidenceLifecycleSourceMaterialPageSummaryFetchDiagnostic;
    };

export type EvidenceLifecycleSourceMaterialPageSummaryTransportRequest = {
  readonly locator: SourceMaterialPageSummaryFetchLocator;
  readonly attemptOrdinal?: number;
  readonly timeoutMs?: number;
  readonly compressedByteCap?: number;
  readonly decompressedByteCap?: number;
  readonly totalByteCap?: number;
  readonly signal?: AbortSignal;
  readonly lowLevelTransport?: SourceAcquisitionNetworkLowLevelTransport;
};

export type SourceAcquisitionNetworkResolvedAddress = {
  readonly address: string;
  readonly family: 4 | 6;
};

export type SourceAcquisitionNetworkLowLevelRequest = {
  readonly hostname: string;
  readonly port: number;
  readonly method: "GET";
  readonly pathWithQuery: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly maxCompressedBytes: number;
  readonly lookupAddress: SourceAcquisitionNetworkResolvedAddress;
  readonly signal?: AbortSignal;
};

export type SourceAcquisitionNetworkLowLevelResponse = {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly remoteAddress: string;
  readonly body: Uint8Array;
};

export type SourceAcquisitionNetworkLowLevelTransport = {
  readonly resolve: (hostname: string) => Promise<readonly SourceAcquisitionNetworkResolvedAddress[]>;
  readonly request: (
    request: SourceAcquisitionNetworkLowLevelRequest,
  ) => Promise<SourceAcquisitionNetworkLowLevelResponse>;
  readonly now?: () => number;
};

function now(transport: SourceAcquisitionNetworkLowLevelTransport): number {
  return transport.now?.() ?? Date.now();
}

function durationMs(startedAt: number, transport: SourceAcquisitionNetworkLowLevelTransport): number {
  return Math.max(0, Math.trunc(now(transport) - startedAt));
}

function selectedAddressFamily(
  address: SourceAcquisitionNetworkResolvedAddress | null,
): EvidenceLifecycleSourceMaterialPageSummarySelectedAddressFamily {
  if (!address) {
    return "not_reached";
  }
  return address.family === 4 ? "ipv4" : "ipv6";
}

function diagnostic(params: {
  readonly locator: SourceMaterialPageSummaryFetchLocator;
  readonly attemptOrdinal: number;
  readonly status: EvidenceLifecycleSourceMaterialPageSummaryTransportStatus;
  readonly stopReason: EvidenceLifecycleSourceMaterialPageSummaryStopReason;
  readonly startedAt: number;
  readonly transport: SourceAcquisitionNetworkLowLevelTransport;
  readonly timeoutMs: number;
  readonly dnsAddressCount?: number;
  readonly selectedAddress?: SourceAcquisitionNetworkResolvedAddress | null;
  readonly finalAddressValidation?: EvidenceLifecycleSourceMaterialPageSummaryFetchDiagnostic["finalAddressValidation"];
  readonly responseStatusCategory?: SourceMaterialPageSummaryResponseStatusCategory;
  readonly contentTypeCategory?: SourceMaterialPageSummaryContentTypeCategory;
  readonly compressedBytes?: number;
  readonly decompressedBytes?: number;
  readonly byteCapState?: EvidenceLifecycleSourceMaterialPageSummaryByteCapState;
}): EvidenceLifecycleSourceMaterialPageSummaryFetchDiagnostic {
  return {
    diagnosticVersion: EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_TRANSPORT_VERSION,
    visibility: "internal_admin_only",
    attemptOrdinal: params.attemptOrdinal,
    locatorRef: params.locator.locatorRef,
    sourceMaterialRef: null,
    providerId: "wikimedia_core",
    endpointId: SOURCE_MATERIAL_PAGE_SUMMARY_ENDPOINT_ID,
    status: params.status,
    stopReason: params.stopReason,
    durationMs: durationMs(params.startedAt, params.transport),
    timeoutMs: params.timeoutMs,
    dnsAddressCount: params.dnsAddressCount ?? 0,
    selectedAddressFamily: selectedAddressFamily(params.selectedAddress ?? null),
    finalAddressValidation: params.finalAddressValidation ?? "not_reached",
    responseStatusCategory: params.responseStatusCategory ?? "not_reached",
    contentTypeCategory: params.contentTypeCategory ?? "not_reached",
    compressedBytes: Math.max(0, Math.trunc(params.compressedBytes ?? 0)),
    decompressedBytes: Math.max(0, Math.trunc(params.decompressedBytes ?? 0)),
    byteCapState: params.byteCapState ?? "not_reached",
    truncationApplied: false,
    rawPayloadIncluded: false,
    secretIncluded: false,
    publicPayloadIncluded: false,
    errorTraceIncluded: false,
    cacheRead: false,
    cacheWrite: false,
    storageWrite: false,
    sourceReliabilityTouched: false,
  };
}

function failure(params: Parameters<typeof diagnostic>[0]):
  EvidenceLifecycleSourceMaterialPageSummaryTransportOutcome {
  return {
    status: params.status === "success" ? "failed" : params.status,
    json: null,
    diagnostic: diagnostic(params),
  };
}

async function defaultResolve(hostname: string): Promise<readonly SourceAcquisitionNetworkResolvedAddress[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => ({
    address: record.address,
    family: record.family === 4 ? 4 : 6,
  }));
}

function normalizeW3BHostname(hostname: string): string | null {
  const normalized = domainToASCII(hostname.trim().toLowerCase());
  if (
    normalized.length === 0
    || normalized.endsWith(".")
    || normalized.includes("..")
    || normalized.includes("_")
    || normalized.includes(":")
    || !/^[a-z0-9.-]+$/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function ipv4IsBlocked(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 0 || b === 168))
    || (a === 198 && (b === 18 || b === 19 || b === 51))
    || (a === 203 && b === 0)
    || a >= 224;
}

function ipv6IsBlocked(address: string): boolean {
  const lower = address.toLowerCase();
  return lower === "::"
    || lower === "::1"
    || lower.startsWith("::ffff:")
    || lower.startsWith("fc")
    || lower.startsWith("fd")
    || lower.startsWith("fe80")
    || lower.startsWith("ff")
    || lower.startsWith("2001:db8");
}

function classifyW3BIpAddress(address: string): "public" | "blocked" | "invalid" {
  const family = isIP(address);
  if (family === 4) {
    return ipv4IsBlocked(address) ? "blocked" : "public";
  }
  if (family === 6) {
    return ipv6IsBlocked(address) ? "blocked" : "public";
  }
  return "invalid";
}

function defaultRequest(
  request: Parameters<SourceAcquisitionNetworkLowLevelTransport["request"]>[0],
): Promise<SourceAcquisitionNetworkLowLevelResponse> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let compressedBytes = 0;
    let settled = false;
    const req = httpsRequest({
      protocol: "https:",
      hostname: request.hostname,
      servername: request.hostname,
      port: request.port,
      method: request.method,
      path: request.pathWithQuery,
      headers: request.headers,
      timeout: request.timeoutMs,
      agent: false,
    }, (response) => {
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        compressedBytes += buffer.byteLength;
        if (compressedBytes > request.maxCompressedBytes) {
          req.destroy(new Error("compressed_byte_cap_exceeded"));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve({
          statusCode: response.statusCode ?? 0,
          headers: response.headers,
          remoteAddress: response.socket.remoteAddress ?? "",
          body: Buffer.concat(chunks),
        });
      });
    });

    const abort = () => req.destroy(new Error("cancelled"));
    if (request.signal?.aborted) {
      abort();
    } else {
      request.signal?.addEventListener("abort", abort, { once: true });
    }
    req.on("timeout", () => req.destroy(new Error("timed_out")));
    req.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      request.signal?.removeEventListener("abort", abort);
      reject(error);
    });
    req.on("close", () => {
      request.signal?.removeEventListener("abort", abort);
    });
    req.end();
  });
}

function defaultTransport(): SourceAcquisitionNetworkLowLevelTransport {
  return {
    resolve: defaultResolve,
    request: defaultRequest,
  };
}

function headerValue(
  headers: Readonly<Record<string, string | readonly string[] | undefined>>,
  key: string,
): string | undefined {
  const value = headers[key] ?? headers[key.toLowerCase()];
  if (typeof value === "string") {
    return value;
  }
  return Array.isArray(value) ? value[0] : undefined;
}

function httpCategory(statusCode: number): SourceMaterialPageSummaryResponseStatusCategory {
  if (statusCode >= 200 && statusCode <= 299) {
    return "success_2xx";
  }
  if (statusCode >= 300 && statusCode <= 399) {
    return "redirect_3xx";
  }
  return "rejected";
}

function contentTypeAccepted(response: SourceAcquisitionNetworkLowLevelResponse): boolean {
  const contentType = headerValue(response.headers, "content-type")?.toLowerCase() ?? "";
  return contentType === "application/json" || contentType.startsWith("application/json;");
}

function requestPath(locator: SourceMaterialPageSummaryFetchLocator): string | null {
  if (!locator.encodedTitlePathSegment || locator.encodedTitlePathSegment.length === 0) {
    return null;
  }
  return `/api/rest_v1/page/summary/${locator.encodedTitlePathSegment}`;
}

function requestHeaders(): Readonly<Record<string, string>> {
  return {
    accept: "application/json",
    "user-agent": "FactHarbor-V2-Internal-SourceMaterial/1.0",
  };
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : "";
}

function stopReasonFromRequestError(error: unknown): EvidenceLifecycleSourceMaterialPageSummaryStopReason {
  const message = errorMessage(error);
  if (message === "compressed_byte_cap_exceeded") {
    return "compressed_byte_cap_exceeded";
  }
  if (message === "timed_out") {
    return "timed_out";
  }
  if (message === "cancelled") {
    return "cancelled";
  }
  return "transport_failure";
}

function statusFromStopReason(
  stopReason: EvidenceLifecycleSourceMaterialPageSummaryStopReason,
): EvidenceLifecycleSourceMaterialPageSummaryTransportStatus {
  if (stopReason === "timed_out") {
    return "timed_out";
  }
  if (stopReason === "cancelled") {
    return "cancelled";
  }
  if (
    stopReason === "locator_ineligible"
    || stopReason === "dns_resolution_failed"
    || stopReason === "dns_address_blocked"
    || stopReason === "final_address_mismatch"
  ) {
    return "blocked";
  }
  return "failed";
}

function decodeBody(params: {
  readonly response: SourceAcquisitionNetworkLowLevelResponse;
  readonly decompressedByteCap: number;
  readonly totalByteCap: number;
}): Promise<
  | { readonly status: "ok"; readonly body: Uint8Array; readonly decompressedBytes: number }
  | { readonly status: "decompressed_byte_cap_exceeded" | "response_byte_cap_exceeded" | "content_type_rejected" }
> {
  const encoding = (headerValue(params.response.headers, "content-encoding") ?? "identity").toLowerCase();
  if (encoding === "identity" || encoding === "") {
    if (
      params.response.body.byteLength > params.decompressedByteCap
      || params.response.body.byteLength > params.totalByteCap
    ) {
      return Promise.resolve({ status: "response_byte_cap_exceeded" });
    }
    return Promise.resolve({
      status: "ok",
      body: params.response.body,
      decompressedBytes: params.response.body.byteLength,
    });
  }
  if (encoding !== "gzip") {
    return Promise.resolve({ status: "content_type_rejected" });
  }
  return new Promise((resolve) => {
    const gunzip = createGunzip();
    const chunks: Buffer[] = [];
    let decompressedBytes = 0;
    let settled = false;
    const finish = (
      result:
        | { readonly status: "ok"; readonly body: Uint8Array; readonly decompressedBytes: number }
        | { readonly status: "decompressed_byte_cap_exceeded" | "response_byte_cap_exceeded" | "content_type_rejected" },
    ) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };
    gunzip.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      decompressedBytes += buffer.byteLength;
      if (decompressedBytes > params.decompressedByteCap || decompressedBytes > params.totalByteCap) {
        gunzip.destroy();
        finish({ status: "decompressed_byte_cap_exceeded" });
        return;
      }
      chunks.push(buffer);
    });
    gunzip.on("error", () => finish({ status: "content_type_rejected" }));
    gunzip.on("end", () => finish({ status: "ok", body: Buffer.concat(chunks), decompressedBytes }));
    gunzip.end(params.response.body);
  });
}

export async function executeEvidenceLifecycleSourceMaterialPageSummaryTransport(
  input: EvidenceLifecycleSourceMaterialPageSummaryTransportRequest,
): Promise<EvidenceLifecycleSourceMaterialPageSummaryTransportOutcome> {
  const transport = input.lowLevelTransport ?? defaultTransport();
  const startedAt = now(transport);
  const attemptOrdinal = input.attemptOrdinal ?? 1;
  const timeoutMs = input.timeoutMs ?? EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_TRANSPORT_TIMEOUT_MS;
  const compressedByteCap =
    input.compressedByteCap ?? EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_COMPRESSED_BYTE_CAP;
  const decompressedByteCap =
    input.decompressedByteCap ?? EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_DECOMPRESSED_BYTE_CAP;
  const totalByteCap = input.totalByteCap ?? EVIDENCE_LIFECYCLE_SOURCE_MATERIAL_PAGE_SUMMARY_TOTAL_BYTE_CAP;

  if (input.locator.eligibility !== "eligible_for_w3b_fetch") {
    return failure({
      locator: input.locator,
      attemptOrdinal,
      status: "blocked",
      stopReason: "locator_ineligible",
      startedAt,
      transport,
      timeoutMs,
    });
  }

  const hostname = `${input.locator.languageCode}.wikipedia.org`;
  const normalizedHostname = normalizeW3BHostname(hostname);
  const pathWithQuery = requestPath(input.locator);
  if (!normalizedHostname || normalizedHostname !== hostname || !pathWithQuery) {
    return failure({
      locator: input.locator,
      attemptOrdinal,
      status: "blocked",
      stopReason: "locator_ineligible",
      startedAt,
      transport,
      timeoutMs,
    });
  }

  let resolved: readonly SourceAcquisitionNetworkResolvedAddress[];
  try {
    resolved = await transport.resolve(normalizedHostname);
  } catch {
    return failure({
      locator: input.locator,
      attemptOrdinal,
      status: "blocked",
      stopReason: "dns_resolution_failed",
      startedAt,
      transport,
      timeoutMs,
    });
  }

  const publicAddresses = resolved.filter((address) =>
    classifyW3BIpAddress(address.address) === "public"
  );
  if (
    resolved.length === 0
    || publicAddresses.length !== resolved.length
    || !resolved.every((address) => address.family === 4 || address.family === 6)
  ) {
    return failure({
      locator: input.locator,
      attemptOrdinal,
      status: "blocked",
      stopReason: "dns_address_blocked",
      startedAt,
      transport,
      timeoutMs,
      dnsAddressCount: resolved.length,
      finalAddressValidation: "blocked_or_mismatched",
    });
  }
  const selectedAddress = publicAddresses[0];

  let response: SourceAcquisitionNetworkLowLevelResponse;
  try {
    response = await transport.request({
      hostname: normalizedHostname,
      port: 443,
      method: "GET",
      pathWithQuery,
      headers: requestHeaders(),
      timeoutMs,
      maxCompressedBytes: compressedByteCap,
      lookupAddress: selectedAddress,
      signal: input.signal,
    });
  } catch (error) {
    const stopReason = stopReasonFromRequestError(error);
    return failure({
      locator: input.locator,
      attemptOrdinal,
      status: statusFromStopReason(stopReason),
      stopReason,
      startedAt,
      transport,
      timeoutMs,
      dnsAddressCount: resolved.length,
      selectedAddress,
      compressedBytes: stopReason === "compressed_byte_cap_exceeded" ? compressedByteCap + 1 : 0,
      byteCapState: stopReason === "compressed_byte_cap_exceeded" ? "compressed_cap_exceeded" : "not_reached",
    });
  }

  const finalAddressMatches = publicAddresses.some((address) => address.address === response.remoteAddress)
    && classifyW3BIpAddress(response.remoteAddress) === "public";
  if (!finalAddressMatches) {
    return failure({
      locator: input.locator,
      attemptOrdinal,
      status: "blocked",
      stopReason: "final_address_mismatch",
      startedAt,
      transport,
      timeoutMs,
      dnsAddressCount: resolved.length,
      selectedAddress,
      finalAddressValidation: "blocked_or_mismatched",
    });
  }

  const responseStatusCategory = httpCategory(response.statusCode);
  if (responseStatusCategory === "redirect_3xx" || headerValue(response.headers, "location")) {
    return failure({
      locator: input.locator,
      attemptOrdinal,
      status: "failed",
      stopReason: "redirect_denied",
      startedAt,
      transport,
      timeoutMs,
      dnsAddressCount: resolved.length,
      selectedAddress,
      finalAddressValidation: "matched_validated_public_address",
      responseStatusCategory,
    });
  }
  if (responseStatusCategory !== "success_2xx") {
    return failure({
      locator: input.locator,
      attemptOrdinal,
      status: "failed",
      stopReason: "http_status_rejected",
      startedAt,
      transport,
      timeoutMs,
      dnsAddressCount: resolved.length,
      selectedAddress,
      finalAddressValidation: "matched_validated_public_address",
      responseStatusCategory,
    });
  }
  if (response.body.byteLength > compressedByteCap) {
    return failure({
      locator: input.locator,
      attemptOrdinal,
      status: "failed",
      stopReason: "compressed_byte_cap_exceeded",
      startedAt,
      transport,
      timeoutMs,
      dnsAddressCount: resolved.length,
      selectedAddress,
      finalAddressValidation: "matched_validated_public_address",
      responseStatusCategory,
      compressedBytes: response.body.byteLength,
      byteCapState: "compressed_cap_exceeded",
    });
  }
  if (!contentTypeAccepted(response)) {
    return failure({
      locator: input.locator,
      attemptOrdinal,
      status: "failed",
      stopReason: "content_type_rejected",
      startedAt,
      transport,
      timeoutMs,
      dnsAddressCount: resolved.length,
      selectedAddress,
      finalAddressValidation: "matched_validated_public_address",
      responseStatusCategory,
      contentTypeCategory: "rejected",
      compressedBytes: response.body.byteLength,
      byteCapState: "within_cap",
    });
  }

  const body = await decodeBody({ response, decompressedByteCap, totalByteCap });
  if (body.status !== "ok") {
    return failure({
      locator: input.locator,
      attemptOrdinal,
      status: "failed",
      stopReason: body.status,
      startedAt,
      transport,
      timeoutMs,
      dnsAddressCount: resolved.length,
      selectedAddress,
      finalAddressValidation: "matched_validated_public_address",
      responseStatusCategory,
      contentTypeCategory: "accepted_json",
      compressedBytes: response.body.byteLength,
      byteCapState: body.status === "decompressed_byte_cap_exceeded"
        ? "decompressed_cap_exceeded"
        : "compressed_cap_exceeded",
    });
  }

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(body.body).toString("utf8"));
  } catch {
    return failure({
      locator: input.locator,
      attemptOrdinal,
      status: "failed",
      stopReason: "json_parse_failed",
      startedAt,
      transport,
      timeoutMs,
      dnsAddressCount: resolved.length,
      selectedAddress,
      finalAddressValidation: "matched_validated_public_address",
      responseStatusCategory,
      contentTypeCategory: "accepted_json",
      compressedBytes: response.body.byteLength,
      decompressedBytes: body.decompressedBytes,
      byteCapState: "within_cap",
    });
  }

  return {
    status: "success",
    json,
    diagnostic: diagnostic({
      locator: input.locator,
      attemptOrdinal,
      status: "success",
      stopReason: "not_stopped",
      startedAt,
      transport,
      timeoutMs,
      dnsAddressCount: resolved.length,
      selectedAddress,
      finalAddressValidation: "matched_validated_public_address",
      responseStatusCategory,
      contentTypeCategory: "accepted_json",
      compressedBytes: response.body.byteLength,
      decompressedBytes: body.decompressedBytes,
      byteCapState: "within_cap",
    }),
  };
}
