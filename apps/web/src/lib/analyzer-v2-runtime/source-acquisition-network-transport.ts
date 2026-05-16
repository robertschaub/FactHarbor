import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { domainToASCII } from "node:url";
import { createGunzip } from "node:zlib";
import {
  buildSourceAcquisitionNetworkHiddenDiagnostic,
  readSourceAcquisitionNetworkCandidateArray,
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

export type SourceAcquisitionNetworkTransportRequest = {
  readonly authority: SourceAcquisitionNetworkAuthority;
  readonly endpoint: SourceAcquisitionNetworkEndpointSnapshot;
  readonly budget: SourceAcquisitionNetworkBudgetSnapshot;
  readonly request: SourceAcquisitionNetworkRequestEnvelope;
  readonly signal?: AbortSignal;
  readonly lowLevelTransport?: SourceAcquisitionNetworkLowLevelTransport;
};

const IPV6_MAX = (1n << 128n) - 1n;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function now(transport?: SourceAcquisitionNetworkLowLevelTransport): number {
  return transport?.now?.() ?? Date.now();
}

function duration(start: number, transport?: SourceAcquisitionNetworkLowLevelTransport): number {
  return Math.max(0, now(transport) - start);
}

function diagnostic(params: {
  readonly endpoint: SourceAcquisitionNetworkEndpointSnapshot;
  readonly request: SourceAcquisitionNetworkRequestEnvelope;
  readonly status: SourceAcquisitionNetworkHiddenDiagnostic["status"];
  readonly stopReason: SourceAcquisitionNetworkStopReason;
  readonly startedAt: number;
  readonly transport?: SourceAcquisitionNetworkLowLevelTransport;
  readonly dnsAddressCount?: number;
  readonly finalAddressValidation?: SourceAcquisitionNetworkHiddenDiagnostic["finalAddressValidation"];
  readonly responseStatusCodeCategory?: SourceAcquisitionNetworkHiddenDiagnostic["responseStatusCodeCategory"];
  readonly contentTypeState?: SourceAcquisitionNetworkHiddenDiagnostic["contentTypeState"];
  readonly compressedBytes?: number;
  readonly decompressedBytes?: number;
  readonly redirectDenied?: boolean;
}): SourceAcquisitionNetworkHiddenDiagnostic {
  return buildSourceAcquisitionNetworkHiddenDiagnostic({
    providerId: params.endpoint.providerId,
    endpointId: params.endpoint.endpointId,
    queryId: params.request.queryId,
    providerAttemptId: params.request.providerAttemptId,
    status: params.status,
    stopReason: params.stopReason,
    durationMs: duration(params.startedAt, params.transport),
    timeoutMs: params.endpoint.timeoutMs,
    dnsAddressCount: params.dnsAddressCount,
    finalAddressValidation: params.finalAddressValidation,
    responseStatusCodeCategory: params.responseStatusCodeCategory,
    contentTypeState: params.contentTypeState,
    compressedBytes: params.compressedBytes,
    decompressedBytes: params.decompressedBytes,
    redirectDenied: params.redirectDenied,
  });
}

function blocked(params: {
  readonly endpoint: SourceAcquisitionNetworkEndpointSnapshot;
  readonly request: SourceAcquisitionNetworkRequestEnvelope;
  readonly stopReason: SourceAcquisitionNetworkStopReason;
  readonly startedAt: number;
  readonly transport?: SourceAcquisitionNetworkLowLevelTransport;
  readonly status?: "blocked" | "failed" | "timed_out" | "cancelled";
  readonly dnsAddressCount?: number;
  readonly finalAddressValidation?: SourceAcquisitionNetworkHiddenDiagnostic["finalAddressValidation"];
  readonly responseStatusCodeCategory?: SourceAcquisitionNetworkHiddenDiagnostic["responseStatusCodeCategory"];
  readonly contentTypeState?: SourceAcquisitionNetworkHiddenDiagnostic["contentTypeState"];
  readonly compressedBytes?: number;
  readonly decompressedBytes?: number;
  readonly redirectDenied?: boolean;
}): SourceAcquisitionNetworkTransportOutcome {
  return {
    status: params.status ?? "blocked",
    candidateCount: 0,
    diagnostic: diagnostic({
      endpoint: params.endpoint,
      request: params.request,
      status: params.status ?? "blocked",
      stopReason: params.stopReason,
      startedAt: params.startedAt,
      transport: params.transport,
      dnsAddressCount: params.dnsAddressCount,
      finalAddressValidation: params.finalAddressValidation,
      responseStatusCodeCategory: params.responseStatusCodeCategory,
      contentTypeState: params.contentTypeState,
      compressedBytes: params.compressedBytes,
      decompressedBytes: params.decompressedBytes,
      redirectDenied: params.redirectDenied,
    }),
  };
}

function parseIpv4(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) {
    return null;
  }
  let value = 0;
  for (const part of parts) {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) {
      return null;
    }
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      return null;
    }
    value = (value << 8) + octet;
  }
  return value >>> 0;
}

function ipv4InRange(value: number, base: number, prefixBits: number): boolean {
  const mask = prefixBits === 0 ? 0 : (0xffffffff << (32 - prefixBits)) >>> 0;
  return (value & mask) === (base & mask);
}

function ipv4IsBlocked(address: string): boolean {
  const value = parseIpv4(address);
  if (value === null) {
    return true;
  }
  const ranges: Array<[string, number]> = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ];
  return ranges.some(([base, bits]) => ipv4InRange(value, parseIpv4(base) ?? 0, bits));
}

function ipv4ToHextets(value: string): [string, string] | null {
  const parsed = parseIpv4(value);
  if (parsed === null) {
    return null;
  }
  const high = ((parsed >>> 16) & 0xffff).toString(16);
  const low = (parsed & 0xffff).toString(16);
  return [high, low];
}

function parseIpv6(address: string): bigint | null {
  let normalized = address.toLowerCase();
  if (normalized.includes("%")) {
    normalized = normalized.slice(0, normalized.indexOf("%"));
  }
  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    if (lastColon < 0) {
      return null;
    }
    const hextets = ipv4ToHextets(normalized.slice(lastColon + 1));
    if (!hextets) {
      return null;
    }
    normalized = `${normalized.slice(0, lastColon)}:${hextets[0]}:${hextets[1]}`;
  }

  const compressedParts = normalized.split("::");
  if (compressedParts.length > 2) {
    return null;
  }
  const left = compressedParts[0] ? compressedParts[0].split(":") : [];
  const right = compressedParts.length === 2 && compressedParts[1] ? compressedParts[1].split(":") : [];
  if ([...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/.test(part))) {
    return null;
  }
  const missing = compressedParts.length === 2 ? 8 - left.length - right.length : 0;
  if (missing < 0 || (compressedParts.length === 1 && left.length !== 8)) {
    return null;
  }
  const parts = [
    ...left,
    ...Array.from({ length: missing }, () => "0"),
    ...right,
  ];
  if (parts.length !== 8) {
    return null;
  }

  return parts.reduce((accumulator, part) => (accumulator << 16n) + BigInt(parseInt(part, 16)), 0n);
}

function ipv6InRange(value: bigint, base: bigint, prefixBits: number): boolean {
  if (prefixBits === 0) {
    return true;
  }
  const shift = BigInt(128 - prefixBits);
  const mask = (IPV6_MAX << shift) & IPV6_MAX;
  return (value & mask) === (base & mask);
}

function ipv6IsBlocked(address: string): boolean {
  const lower = address.toLowerCase();
  if (lower.startsWith("::ffff:")) {
    return ipv4IsBlocked(lower.slice("::ffff:".length));
  }
  const value = parseIpv6(address);
  if (value === null) {
    return true;
  }
  const ranges: Array<[string, number]> = [
    ["::", 128],
    ["::1", 128],
    ["::ffff:0:0", 96],
    ["64:ff9b::", 96],
    ["100::", 64],
    ["2001:10::", 28],
    ["2001:db8::", 32],
    ["2002::", 16],
    ["fc00::", 7],
    ["fe80::", 10],
    ["ff00::", 8],
  ];
  return ranges.some(([base, bits]) => {
    const parsedBase = parseIpv6(base);
    return parsedBase !== null && ipv6InRange(value, parsedBase, bits);
  });
}

export function classifySourceAcquisitionNetworkIpAddress(
  address: string,
): "public" | "blocked" | "invalid" {
  const family = isIP(address);
  if (family === 4) {
    return ipv4IsBlocked(address) ? "blocked" : "public";
  }
  if (family === 6) {
    return ipv6IsBlocked(address) ? "blocked" : "public";
  }
  return "invalid";
}

export function normalizeSourceAcquisitionNetworkHostname(hostname: string): string | null {
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

async function defaultResolve(hostname: string): Promise<readonly SourceAcquisitionNetworkResolvedAddress[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => ({
    address: record.address,
    family: record.family === 4 ? 4 : 6,
  }));
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

function requestHeaders(headers: readonly SourceAcquisitionNetworkRequestEnvelope["requestHeaders"][number][]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const header of headers) {
    if (header.key === "accept" && header.valueSource === "application_json") {
      result.accept = "application/json";
    }
    if (header.key === "user-agent" && header.valueSource === "factharbor_internal_agent") {
      result["user-agent"] = "FactHarbor-V2-Internal";
    }
  }
  return result;
}

function pathWithQuery(
  endpoint: SourceAcquisitionNetworkEndpointSnapshot,
  request: SourceAcquisitionNetworkRequestEnvelope,
): string {
  const params = new URLSearchParams();
  for (const parameter of request.requestParameters) {
    params.set(parameter.key, parameter.value);
  }
  const query = params.toString();
  return query.length > 0 ? `${endpoint.path}?${query}` : endpoint.path;
}

async function defaultRequest(
  request: SourceAcquisitionNetworkLowLevelRequest,
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
      lookup: (_hostname, _options, callback) => {
        callback(null, request.lookupAddress.address, request.lookupAddress.family);
      },
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

function withTimeoutAndAbort<T>(params: {
  readonly work: Promise<T>;
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
}): Promise<
  | { readonly status: "ok"; readonly value: T }
  | { readonly status: "timed_out" }
  | { readonly status: "cancelled" }
> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const finish = (
      result:
        | { readonly status: "ok"; readonly value: T }
        | { readonly status: "timed_out" }
        | { readonly status: "cancelled" },
    ) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      params.signal?.removeEventListener("abort", abort);
      resolve(result);
    };
    const abort = () => finish({ status: "cancelled" });
    timeout = setTimeout(() => finish({ status: "timed_out" }), params.timeoutMs);

    if (params.signal?.aborted) {
      abort();
      return;
    }

    params.signal?.addEventListener("abort", abort, { once: true });
    params.work.then(
      (value) => finish({ status: "ok", value }),
      (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeout !== undefined) {
          clearTimeout(timeout);
        }
        params.signal?.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function gunzipWithCap(
  body: Uint8Array,
  decompressedByteCap: number,
  totalByteCap: number,
): Promise<
  | { readonly status: "ok"; readonly body: Buffer }
  | { readonly status: "decompressed_byte_cap_exceeded" | "content_type_rejected" }
> {
  return new Promise((resolve) => {
    const gunzip = createGunzip();
    const chunks: Buffer[] = [];
    let decompressedBytes = 0;
    let settled = false;

    const finish = (
      result:
        | { readonly status: "ok"; readonly body: Buffer }
        | { readonly status: "decompressed_byte_cap_exceeded" | "content_type_rejected" },
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
      if (decompressedBytes > decompressedByteCap || decompressedBytes > totalByteCap) {
        gunzip.destroy();
        finish({ status: "decompressed_byte_cap_exceeded" });
        return;
      }
      chunks.push(buffer);
    });
    gunzip.on("error", () => finish({ status: "content_type_rejected" }));
    gunzip.on("end", () => finish({ status: "ok", body: Buffer.concat(chunks) }));
    gunzip.end(body);
  });
}

async function responseBody(
  response: SourceAcquisitionNetworkLowLevelResponse,
  endpoint: SourceAcquisitionNetworkEndpointSnapshot,
): Promise<{ readonly status: "ok"; readonly body: Uint8Array } | { readonly status: SourceAcquisitionNetworkStopReason }> {
  const encoding = (headerValue(response.headers, "content-encoding") ?? "identity").toLowerCase();
  if (response.body.byteLength > endpoint.compressedByteCap) {
    return { status: "compressed_byte_cap_exceeded" };
  }
  if (encoding === "identity" || encoding === "") {
    if (response.body.byteLength > endpoint.decompressedByteCap || response.body.byteLength > endpoint.totalByteCap) {
      return { status: "response_byte_cap_exceeded" };
    }
    return { status: "ok", body: response.body };
  }
  if (encoding === "gzip" && endpoint.decompressionPolicy === "gzip_allowed") {
    return gunzipWithCap(response.body, endpoint.decompressedByteCap, endpoint.totalByteCap);
  }
  return { status: "content_type_rejected" };
}

function contentTypeAccepted(response: SourceAcquisitionNetworkLowLevelResponse): boolean {
  const contentType = headerValue(response.headers, "content-type")?.toLowerCase() ?? "";
  return contentType === "application/json" || contentType.startsWith("application/json;");
}

function jsonSniffAccepted(body: Uint8Array): boolean {
  const sample = Buffer.from(body.slice(0, 64)).toString("utf8").trimStart();
  return sample.startsWith("{") || sample.startsWith("[");
}

function authorityMatches(
  authority: SourceAcquisitionNetworkAuthority,
  endpoint: SourceAcquisitionNetworkEndpointSnapshot,
  budget: SourceAcquisitionNetworkBudgetSnapshot,
): boolean {
  if (!isSourceAcquisitionNetworkAuthority(authority)) {
    return false;
  }
  const snapshot = readSourceAcquisitionNetworkAuthoritySnapshot(authority);
  return snapshot.endpointSnapshotHash === endpoint.endpointSnapshotHash
    && snapshot.networkBudgetSnapshotHash === budget.networkBudgetSnapshotHash
    && snapshot.candidateRuntimeConfigSnapshotHash === budget.candidateRuntimeConfigSnapshotHash
    && snapshot.candidateRuntimeProviderAllowlistSnapshotHash
      === budget.candidateRuntimeProviderAllowlistSnapshotHash
    && snapshot.candidateRuntimeBudgetSnapshotHash === budget.candidateRuntimeBudgetSnapshotHash;
}

function httpCategory(statusCode: number): SourceAcquisitionNetworkHiddenDiagnostic["responseStatusCodeCategory"] {
  if (statusCode >= 200 && statusCode <= 299) {
    return "success_2xx";
  }
  if (statusCode >= 300 && statusCode <= 399) {
    return "redirect_3xx";
  }
  return "rejected";
}

export async function executeSourceAcquisitionNetworkTransport(
  input: SourceAcquisitionNetworkTransportRequest,
): Promise<SourceAcquisitionNetworkTransportOutcome> {
  const transport = input.lowLevelTransport ?? defaultTransport();
  const startedAt = now(transport);

  if (validateSourceAcquisitionNetworkEndpointSnapshot(input.endpoint).status !== "valid") {
    return blocked({
      endpoint: input.endpoint,
      request: input.request,
      stopReason: "endpoint_invalid",
      startedAt,
      transport,
    });
  }
  if (validateSourceAcquisitionNetworkBudgetSnapshot(input.budget).status !== "valid") {
    return blocked({
      endpoint: input.endpoint,
      request: input.request,
      stopReason: "budget_invalid",
      startedAt,
      transport,
    });
  }
  if (!authorityMatches(input.authority, input.endpoint, input.budget)) {
    return blocked({
      endpoint: input.endpoint,
      request: input.request,
      stopReason: "authority_invalid",
      startedAt,
      transport,
    });
  }
  if (validateSourceAcquisitionNetworkRequestEnvelope(input.request, input.endpoint).status !== "valid") {
    return blocked({
      endpoint: input.endpoint,
      request: input.request,
      stopReason: "request_invalid",
      startedAt,
      transport,
    });
  }

  const normalizedHostname = normalizeSourceAcquisitionNetworkHostname(input.endpoint.canonicalAsciiHostname);
  if (normalizedHostname === null || normalizedHostname !== input.endpoint.canonicalAsciiHostname) {
    return blocked({
      endpoint: input.endpoint,
      request: input.request,
      stopReason: "endpoint_invalid",
      startedAt,
      transport,
    });
  }

  let resolved: readonly SourceAcquisitionNetworkResolvedAddress[];
  try {
    const resolveResult = await withTimeoutAndAbort({
      work: transport.resolve(normalizedHostname),
      timeoutMs: Math.min(input.endpoint.timeoutMs, input.budget.perQueryTimeoutMs),
      signal: input.signal,
    });
    if (resolveResult.status === "timed_out") {
      return blocked({
        endpoint: input.endpoint,
        request: input.request,
        stopReason: "timed_out",
        startedAt,
        transport,
        status: "timed_out",
      });
    }
    if (resolveResult.status === "cancelled") {
      return blocked({
        endpoint: input.endpoint,
        request: input.request,
        stopReason: "cancelled",
        startedAt,
        transport,
        status: "cancelled",
      });
    }
    resolved = resolveResult.value;
  } catch {
    return blocked({
      endpoint: input.endpoint,
      request: input.request,
      stopReason: "dns_resolution_failed",
      startedAt,
      transport,
      status: "failed",
    });
  }

  const publicAddresses = resolved.filter((address) =>
    classifySourceAcquisitionNetworkIpAddress(address.address) === "public"
  );
  if (
    resolved.length === 0
    || publicAddresses.length !== resolved.length
    || !resolved.every((address) => address.family === 4 || address.family === 6)
  ) {
    return blocked({
      endpoint: input.endpoint,
      request: input.request,
      stopReason: "dns_address_blocked",
      startedAt,
      transport,
      dnsAddressCount: resolved.length,
      finalAddressValidation: "blocked_or_mismatched",
    });
  }

  try {
    const response = await transport.request({
      hostname: normalizedHostname,
      port: input.endpoint.port,
      method: input.endpoint.method,
      pathWithQuery: pathWithQuery(input.endpoint, input.request),
      headers: requestHeaders(input.request.requestHeaders),
      timeoutMs: Math.min(input.endpoint.timeoutMs, input.budget.perQueryTimeoutMs),
      maxCompressedBytes: input.endpoint.compressedByteCap,
      lookupAddress: publicAddresses[0],
      signal: input.signal,
    });
    const finalAddressMatches = publicAddresses.some((address) => address.address === response.remoteAddress)
      && classifySourceAcquisitionNetworkIpAddress(response.remoteAddress) === "public";
    if (!finalAddressMatches) {
      return blocked({
        endpoint: input.endpoint,
        request: input.request,
        stopReason: "final_address_mismatch",
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "blocked_or_mismatched",
      });
    }

    const category = httpCategory(response.statusCode);
    if (category === "redirect_3xx" || headerValue(response.headers, "location")) {
      return blocked({
        endpoint: input.endpoint,
        request: input.request,
        stopReason: "redirect_denied",
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: category,
        redirectDenied: true,
      });
    }
    if (category !== "success_2xx") {
      return blocked({
        endpoint: input.endpoint,
        request: input.request,
        stopReason: "http_status_rejected",
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: category,
        status: "failed",
      });
    }
    if (!contentTypeAccepted(response)) {
      return blocked({
        endpoint: input.endpoint,
        request: input.request,
        stopReason: "content_type_rejected",
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: category,
        contentTypeState: "rejected",
      });
    }

    const body = await responseBody(response, input.endpoint);
    if (body.status !== "ok") {
      return blocked({
        endpoint: input.endpoint,
        request: input.request,
        stopReason: body.status,
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: category,
        contentTypeState: "accepted_json",
        compressedBytes: response.body.byteLength,
      });
    }
    if (!jsonSniffAccepted(body.body)) {
      return blocked({
        endpoint: input.endpoint,
        request: input.request,
        stopReason: "content_sniff_rejected",
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: category,
        contentTypeState: "rejected",
        compressedBytes: response.body.byteLength,
        decompressedBytes: body.body.byteLength,
      });
    }

    let json: unknown;
    try {
      json = JSON.parse(Buffer.from(body.body).toString("utf8")) as unknown;
    } catch {
      return blocked({
        endpoint: input.endpoint,
        request: input.request,
        stopReason: "json_parse_failed",
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: category,
        contentTypeState: "accepted_json",
        compressedBytes: response.body.byteLength,
        decompressedBytes: body.body.byteLength,
      });
    }
    const candidateArray = readSourceAcquisitionNetworkCandidateArray(
      json,
      input.endpoint.responseCandidatePointer,
    );
    if (!candidateArray) {
      return blocked({
        endpoint: input.endpoint,
        request: input.request,
        stopReason: "content_sniff_rejected",
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: category,
        contentTypeState: "rejected",
        compressedBytes: response.body.byteLength,
        decompressedBytes: body.body.byteLength,
      });
    }

    return {
      status: "success",
      candidateCount: candidateArray.length,
      diagnostic: diagnostic({
        endpoint: input.endpoint,
        request: input.request,
        status: "success",
        stopReason: "not_stopped",
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: category,
        contentTypeState: "accepted_json",
        compressedBytes: response.body.byteLength,
        decompressedBytes: body.body.byteLength,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (input.signal?.aborted || message === "cancelled") {
      return blocked({
        endpoint: input.endpoint,
        request: input.request,
        stopReason: "cancelled",
        startedAt,
        transport,
        status: "cancelled",
        dnsAddressCount: resolved.length,
      });
    }
    if (message === "timed_out") {
      return blocked({
        endpoint: input.endpoint,
        request: input.request,
        stopReason: "timed_out",
        startedAt,
        transport,
        status: "timed_out",
        dnsAddressCount: resolved.length,
      });
    }
    if (message === "compressed_byte_cap_exceeded") {
      return blocked({
        endpoint: input.endpoint,
        request: input.request,
        stopReason: "compressed_byte_cap_exceeded",
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
      });
    }
    return blocked({
      endpoint: input.endpoint,
      request: input.request,
      stopReason: "transport_failure",
      startedAt,
      transport,
      status: "failed",
      dnsAddressCount: resolved.length,
    });
  }
}
