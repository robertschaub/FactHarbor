import { createHmac } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { domainToASCII } from "node:url";
import { createGunzip } from "node:zlib";
import {
  buildSourceAcquisitionContentHiddenDiagnostic,
  validateSourceAcquisitionContentBudgetSnapshot,
  validateSourceAcquisitionContentRequestBinding,
  validateSourceAcquisitionContentTargetEnvelope,
  type SourceAcquisitionContentBudgetSnapshot,
  type SourceAcquisitionContentHiddenDiagnostic,
  type SourceAcquisitionContentOpaqueReference,
  type SourceAcquisitionContentStopReason,
  type SourceAcquisitionContentTargetEnvelope,
  type SourceAcquisitionContentTransportOutcome,
} from "./source-acquisition-content-envelope";
import {
  isSourceAcquisitionContentDereferenceAuthority,
  readSourceAcquisitionContentAuthoritySnapshot,
  type SourceAcquisitionContentDereferenceAuthority,
} from "./source-acquisition-content-authority";

export type SourceAcquisitionContentResolvedAddress = {
  readonly address: string;
  readonly family: 4 | 6;
};

export type SourceAcquisitionContentEphemeralTarget = {
  readonly canonicalHostname: string;
  readonly port: number;
  readonly method: "GET";
  readonly pathWithQuery: string;
  readonly requestHeaders: Readonly<Record<"accept" | "user-agent", string>>;
  readonly fetchAttemptId: string;
};

type SourceAcquisitionContentEphemeralTargetBinding = {
  readonly contentTargetId: string;
  readonly parentCandidateId: string;
  readonly parentProviderAttemptId: string;
  readonly providerId: string;
  readonly endpointContentPolicyId: string;
  readonly opaqueRuntimeLocatorId: string;
  readonly providerNetworkAuthoritySnapshotHash: string;
  readonly contentAuthoritySnapshotHash: string;
  readonly contentTargetSnapshotHash: string;
  readonly canonicalSchemePolicyId: string;
  readonly canonicalHostnameReference: SourceAcquisitionContentOpaqueReference;
  readonly fixedPathReference: SourceAcquisitionContentOpaqueReference;
  readonly queryReference: SourceAcquisitionContentOpaqueReference;
  readonly bytePolicyId: string;
  readonly timeoutPolicyId: string;
};

export type SourceAcquisitionContentLowLevelRequest = {
  readonly hostname: string;
  readonly port: number;
  readonly method: "GET";
  readonly pathWithQuery: string;
  readonly headers: Readonly<Record<"accept" | "user-agent", string>>;
  readonly timeoutMs: number;
  readonly maxCompressedBytes: number;
  readonly lookupAddress: SourceAcquisitionContentResolvedAddress;
  readonly finalAddressValidationRequiredBeforeRequestEmission: true;
  readonly signal?: AbortSignal;
};

export type SourceAcquisitionContentLowLevelResponse = {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly remoteAddress: string;
  readonly body: Uint8Array;
};

export type SourceAcquisitionContentLowLevelTransport = {
  readonly resolve: (hostname: string) => Promise<readonly SourceAcquisitionContentResolvedAddress[]>;
  readonly request: (
    request: SourceAcquisitionContentLowLevelRequest,
  ) => Promise<SourceAcquisitionContentLowLevelResponse>;
  readonly now?: () => number;
};

export type SourceAcquisitionContentTransportRequest = {
  readonly authority: SourceAcquisitionContentDereferenceAuthority;
  readonly target: SourceAcquisitionContentTargetEnvelope;
  readonly budget: SourceAcquisitionContentBudgetSnapshot;
  readonly executionTarget: SourceAcquisitionContentEphemeralTarget;
  readonly signal?: AbortSignal;
  readonly lowLevelTransport?: SourceAcquisitionContentLowLevelTransport;
};

const IPV6_MAX = (1n << 128n) - 1n;
const ephemeralTargetBindings = new WeakMap<object, SourceAcquisitionContentEphemeralTargetBinding>();

function now(transport?: SourceAcquisitionContentLowLevelTransport): number {
  return transport?.now?.() ?? Date.now();
}

function duration(startedAt: number, transport?: SourceAcquisitionContentLowLevelTransport): number {
  return Math.max(0, now(transport) - startedAt);
}

function diagnostic(params: {
  readonly target: SourceAcquisitionContentTargetEnvelope;
  readonly budget: SourceAcquisitionContentBudgetSnapshot;
  readonly executionTarget: SourceAcquisitionContentEphemeralTarget;
  readonly status: SourceAcquisitionContentHiddenDiagnostic["status"];
  readonly stopReason: SourceAcquisitionContentStopReason;
  readonly startedAt: number;
  readonly transport?: SourceAcquisitionContentLowLevelTransport;
  readonly contentTypeState?: SourceAcquisitionContentHiddenDiagnostic["contentTypeState"];
  readonly declaredByteCount?: number | null;
  readonly observedByteCount?: number;
  readonly decompressedByteCount?: number;
  readonly dnsAddressCount?: number;
  readonly finalAddressValidation?: SourceAcquisitionContentHiddenDiagnostic["finalAddressValidation"];
  readonly responseStatusCodeCategory?: SourceAcquisitionContentHiddenDiagnostic["responseStatusCodeCategory"];
  readonly redirectDenied?: boolean;
}): SourceAcquisitionContentHiddenDiagnostic {
  return buildSourceAcquisitionContentHiddenDiagnostic({
    target: params.target,
    budget: params.budget,
    fetchAttemptId: params.executionTarget.fetchAttemptId,
    status: params.status,
    stopReason: params.stopReason,
    durationMs: duration(params.startedAt, params.transport),
    timeoutMs: params.budget.perFetchTimeoutMs,
    contentTypeState: params.contentTypeState,
    declaredByteCount: params.declaredByteCount,
    observedByteCount: params.observedByteCount,
    decompressedByteCount: params.decompressedByteCount,
    dnsAddressCount: params.dnsAddressCount,
    finalAddressValidation: params.finalAddressValidation,
    responseStatusCodeCategory: params.responseStatusCodeCategory,
    redirectDenied: params.redirectDenied,
  });
}

function blocked(params: {
  readonly target: SourceAcquisitionContentTargetEnvelope;
  readonly budget: SourceAcquisitionContentBudgetSnapshot;
  readonly executionTarget: SourceAcquisitionContentEphemeralTarget;
  readonly stopReason: SourceAcquisitionContentStopReason;
  readonly startedAt: number;
  readonly transport?: SourceAcquisitionContentLowLevelTransport;
  readonly status?: "blocked" | "failed" | "timed_out" | "cancelled";
  readonly contentTypeState?: SourceAcquisitionContentHiddenDiagnostic["contentTypeState"];
  readonly declaredByteCount?: number | null;
  readonly observedByteCount?: number;
  readonly decompressedByteCount?: number;
  readonly dnsAddressCount?: number;
  readonly finalAddressValidation?: SourceAcquisitionContentHiddenDiagnostic["finalAddressValidation"];
  readonly responseStatusCodeCategory?: SourceAcquisitionContentHiddenDiagnostic["responseStatusCodeCategory"];
  readonly redirectDenied?: boolean;
}): SourceAcquisitionContentTransportOutcome {
  return {
    status: params.status ?? "blocked",
    diagnostic: diagnostic({
      target: params.target,
      budget: params.budget,
      executionTarget: params.executionTarget,
      status: params.status ?? "blocked",
      stopReason: params.stopReason,
      startedAt: params.startedAt,
      transport: params.transport,
      contentTypeState: params.contentTypeState,
      declaredByteCount: params.declaredByteCount,
      observedByteCount: params.observedByteCount,
      decompressedByteCount: params.decompressedByteCount,
      dnsAddressCount: params.dnsAddressCount,
      finalAddressValidation: params.finalAddressValidation,
      responseStatusCodeCategory: params.responseStatusCodeCategory,
      redirectDenied: params.redirectDenied,
    }),
  };
}

function cloneOpaqueReference(
  reference: SourceAcquisitionContentOpaqueReference,
): SourceAcquisitionContentOpaqueReference {
  return reference.kind === "keyed_hmac"
    ? {
        kind: reference.kind,
        algorithm: reference.algorithm,
        keyId: reference.keyId,
        value: reference.value,
      }
    : {
        kind: reference.kind,
        value: reference.value,
      };
}

function opaqueReferenceEquals(
  left: SourceAcquisitionContentOpaqueReference,
  right: SourceAcquisitionContentOpaqueReference,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "keyed_hmac" && right.kind === "keyed_hmac") {
    return left.algorithm === right.algorithm
      && left.keyId === right.keyId
      && left.value === right.value;
  }
  return left.kind === "policy_id" && right.kind === "policy_id" && left.value === right.value;
}

function bindingFromTarget(
  target: SourceAcquisitionContentTargetEnvelope,
): SourceAcquisitionContentEphemeralTargetBinding {
  return {
    contentTargetId: target.contentTargetId,
    parentCandidateId: target.parentCandidateId,
    parentProviderAttemptId: target.parentProviderAttemptId,
    providerId: target.providerId,
    endpointContentPolicyId: target.endpointContentPolicyId,
    opaqueRuntimeLocatorId: target.opaqueRuntimeLocatorId,
    providerNetworkAuthoritySnapshotHash: target.providerNetworkAuthoritySnapshotHash,
    contentAuthoritySnapshotHash: target.contentAuthoritySnapshotHash,
    contentTargetSnapshotHash: target.contentTargetSnapshotHash,
    canonicalSchemePolicyId: target.canonicalSchemePolicyId,
    canonicalHostnameReference: cloneOpaqueReference(target.canonicalHostnameReference),
    fixedPathReference: cloneOpaqueReference(target.fixedPathReference),
    queryReference: cloneOpaqueReference(target.queryReference),
    bytePolicyId: target.bytePolicyId,
    timeoutPolicyId: target.timeoutPolicyId,
  };
}

function bindingMatchesTarget(
  binding: SourceAcquisitionContentEphemeralTargetBinding,
  target: SourceAcquisitionContentTargetEnvelope,
): boolean {
  return binding.contentTargetId === target.contentTargetId
    && binding.parentCandidateId === target.parentCandidateId
    && binding.parentProviderAttemptId === target.parentProviderAttemptId
    && binding.providerId === target.providerId
    && binding.endpointContentPolicyId === target.endpointContentPolicyId
    && binding.opaqueRuntimeLocatorId === target.opaqueRuntimeLocatorId
    && binding.providerNetworkAuthoritySnapshotHash === target.providerNetworkAuthoritySnapshotHash
    && binding.contentAuthoritySnapshotHash === target.contentAuthoritySnapshotHash
    && binding.contentTargetSnapshotHash === target.contentTargetSnapshotHash
    && binding.canonicalSchemePolicyId === target.canonicalSchemePolicyId
    && opaqueReferenceEquals(binding.canonicalHostnameReference, target.canonicalHostnameReference)
    && opaqueReferenceEquals(binding.fixedPathReference, target.fixedPathReference)
    && opaqueReferenceEquals(binding.queryReference, target.queryReference)
    && binding.bytePolicyId === target.bytePolicyId
    && binding.timeoutPolicyId === target.timeoutPolicyId;
}

function hmacReferenceForValue(params: {
  readonly value: string;
  readonly keyId: string;
  readonly keyMaterial: string;
}): string {
  return `HMAC_SHA256_${createHmac("sha256", params.keyMaterial)
    .update(params.value, "utf8")
    .digest("hex")
    .toUpperCase()}`;
}

function hmacReferenceMatchesValue(params: {
  readonly reference: SourceAcquisitionContentOpaqueReference;
  readonly value: string;
  readonly keyId: string;
  readonly keyMaterial: string;
}): boolean {
  return params.reference.kind === "keyed_hmac"
    && params.reference.algorithm === "hmac_sha256"
    && params.reference.keyId === params.keyId
    && params.reference.value === hmacReferenceForValue({
      value: params.value,
      keyId: params.keyId,
      keyMaterial: params.keyMaterial,
    });
}

function splitPathAndQuery(pathWithQuery: string): { readonly path: string; readonly query: string } | null {
  const queryStart = pathWithQuery.indexOf("?");
  if (queryStart < 0) {
    return { path: pathWithQuery, query: "" };
  }
  const pathPart = pathWithQuery.slice(0, queryStart);
  const queryPart = pathWithQuery.slice(queryStart + 1);
  return pathPart.length > 0 ? { path: pathPart, query: queryPart } : null;
}

function executionTargetMatchesOpaqueReferences(params: {
  readonly target: SourceAcquisitionContentTargetEnvelope;
  readonly executionTarget: SourceAcquisitionContentEphemeralTarget;
  readonly keyId: string;
  readonly keyMaterial: string;
}): boolean {
  const pathParts = splitPathAndQuery(params.executionTarget.pathWithQuery);
  return pathParts !== null
    && hmacReferenceMatchesValue({
      reference: params.target.canonicalHostnameReference,
      value: params.executionTarget.canonicalHostname,
      keyId: params.keyId,
      keyMaterial: params.keyMaterial,
    })
    && hmacReferenceMatchesValue({
      reference: params.target.fixedPathReference,
      value: pathParts.path,
      keyId: params.keyId,
      keyMaterial: params.keyMaterial,
    })
    && hmacReferenceMatchesValue({
      reference: params.target.queryReference,
      value: pathParts.query,
      keyId: params.keyId,
      keyMaterial: params.keyMaterial,
    });
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
  return [
    ((parsed >>> 16) & 0xffff).toString(16),
    (parsed & 0xffff).toString(16),
  ];
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
    return true;
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

export function classifySourceAcquisitionContentIpAddress(
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

export function normalizeSourceAcquisitionContentHostname(hostname: string): string | null {
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

export function createSourceAcquisitionContentEphemeralTarget(params: {
  readonly target: SourceAcquisitionContentTargetEnvelope;
  readonly policyBindingKey: {
    readonly keyId: string;
    readonly keyMaterial: string;
  };
  readonly canonicalHostname: string;
  readonly port: number;
  readonly method: "GET";
  readonly pathWithQuery: string;
  readonly requestHeaders: Readonly<Record<"accept" | "user-agent", string>>;
  readonly fetchAttemptId: string;
}): SourceAcquisitionContentEphemeralTarget {
  if (validateSourceAcquisitionContentTargetEnvelope(params.target).status !== "valid") {
    throw new Error("Invalid V2 source-acquisition content target envelope.");
  }

  const executionTarget: SourceAcquisitionContentEphemeralTarget = Object.freeze({
    canonicalHostname: params.canonicalHostname,
    port: params.port,
    method: params.method,
    pathWithQuery: params.pathWithQuery,
    requestHeaders: Object.freeze({ ...params.requestHeaders }),
    fetchAttemptId: params.fetchAttemptId,
  });

  if (!executionTargetShapeIsValid(executionTarget)) {
    throw new Error("Invalid V2 source-acquisition ephemeral content target.");
  }
  if (
    !executionTargetMatchesOpaqueReferences({
      target: params.target,
      executionTarget,
      keyId: params.policyBindingKey.keyId,
      keyMaterial: params.policyBindingKey.keyMaterial,
    })
  ) {
    throw new Error("V2 source-acquisition ephemeral content target does not match approved opaque references.");
  }
  if (
    executionTarget.requestHeaders.accept !== params.target.contentTypePolicy.allowedContentTypes.join(", ")
    || executionTarget.requestHeaders["user-agent"] !== "FactHarbor-V2-Internal"
  ) {
    throw new Error("V2 source-acquisition ephemeral content headers do not match approved content policy.");
  }

  ephemeralTargetBindings.set(executionTarget, bindingFromTarget(params.target));
  return executionTarget;
}

async function defaultResolve(hostname: string): Promise<readonly SourceAcquisitionContentResolvedAddress[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => ({
    address: record.address,
    family: record.family === 4 ? 4 : 6,
  }));
}

function defaultRequest(
  request: SourceAcquisitionContentLowLevelRequest,
): Promise<SourceAcquisitionContentLowLevelResponse> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let compressedBytes = 0;
    let settled = false;
    let requestReleased = false;

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
    const releaseRequestAfterAddressValidation = (remoteAddress: string | undefined) => {
      if (requestReleased) {
        return;
      }
      if (
        remoteAddress !== request.lookupAddress.address
        || classifySourceAcquisitionContentIpAddress(remoteAddress ?? "") !== "public"
      ) {
        req.destroy(new Error("final_address_mismatch"));
        return;
      }
      requestReleased = true;
      req.end();
    };

    req.on("socket", (socket) => {
      socket.once("secureConnect", () => {
        releaseRequestAfterAddressValidation(socket.remoteAddress);
      });
    });
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
  });
}

function defaultTransport(): SourceAcquisitionContentLowLevelTransport {
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

function contentLength(headers: Readonly<Record<string, string | readonly string[] | undefined>>): number | null {
  const value = headerValue(headers, "content-length");
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

type SourceAcquisitionContentAllowedContentType =
  SourceAcquisitionContentTargetEnvelope["contentTypePolicy"]["allowedContentTypes"][number];
type SourceAcquisitionContentSniffedType = SourceAcquisitionContentAllowedContentType | "unknown";

function declaredContentType(
  response: SourceAcquisitionContentLowLevelResponse,
  target: SourceAcquisitionContentTargetEnvelope,
): SourceAcquisitionContentAllowedContentType | null {
  const contentType = (headerValue(response.headers, "content-type") ?? "").toLowerCase();
  return target.contentTypePolicy.allowedContentTypes.find((allowed) =>
    contentType === allowed || contentType.startsWith(`${allowed};`)
  ) ?? null;
}

function sniffContentType(body: Uint8Array): SourceAcquisitionContentSniffedType {
  const prefix = Buffer.from(body.subarray(0, 512));
  if (prefix.byteLength >= 5 && prefix.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  if (prefix.includes(0)) {
    return "unknown";
  }

  const textPrefix = prefix.toString("utf8").replace(/^\uFEFF/, "").trimStart().toLowerCase();
  if (
    textPrefix.startsWith("<!doctype html")
    || textPrefix.startsWith("<html")
    || textPrefix.startsWith("<head")
    || textPrefix.startsWith("<body")
  ) {
    return "text/html";
  }
  if (textPrefix.startsWith("{") || textPrefix.startsWith("[")) {
    return "application/json";
  }
  if ([...prefix].every((byte) => byte >= 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d)) {
    return "text/plain";
  }
  return "unknown";
}

function sniffMatchesDeclared(
  declaredType: SourceAcquisitionContentAllowedContentType,
  body: Uint8Array,
): boolean {
  return sniffContentType(body) === declaredType;
}

function httpCategory(statusCode: number): SourceAcquisitionContentHiddenDiagnostic["responseStatusCodeCategory"] {
  if (statusCode >= 200 && statusCode <= 299) {
    return "success_2xx";
  }
  if (statusCode >= 300 && statusCode <= 399) {
    return "redirect_3xx";
  }
  return "rejected";
}

function gunzipWithCap(
  body: Uint8Array,
  decompressedByteCap: number,
  declaredType: SourceAcquisitionContentAllowedContentType,
): Promise<
  | { readonly status: "ok"; readonly decompressedBytes: number }
  | { readonly status: "decompressed_byte_cap_exceeded" | "content_type_rejected" }
> {
  return new Promise((resolve) => {
    const gunzip = createGunzip();
    let decompressedBytes = 0;
    let sniffPrefix = Buffer.alloc(0);
    let settled = false;

    const finish = (
      result:
        | { readonly status: "ok"; readonly decompressedBytes: number }
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
      if (sniffPrefix.byteLength < 512) {
        const remaining = 512 - sniffPrefix.byteLength;
        sniffPrefix = Buffer.concat([sniffPrefix, buffer.subarray(0, remaining)]);
      }
      if (decompressedBytes > decompressedByteCap) {
        gunzip.destroy();
        finish({ status: "decompressed_byte_cap_exceeded" });
      }
    });
    gunzip.on("error", () => finish({ status: "content_type_rejected" }));
    gunzip.on("end", () => {
      finish(sniffMatchesDeclared(declaredType, sniffPrefix)
        ? { status: "ok", decompressedBytes }
        : { status: "content_type_rejected" });
    });
    gunzip.end(body);
  });
}

async function bodyByteState(params: {
  readonly response: SourceAcquisitionContentLowLevelResponse;
  readonly target: SourceAcquisitionContentTargetEnvelope;
  readonly budget: SourceAcquisitionContentBudgetSnapshot;
  readonly declaredType: SourceAcquisitionContentAllowedContentType;
}): Promise<
  | { readonly status: "ok"; readonly observedBytes: number; readonly decompressedBytes: number }
  | { readonly status: SourceAcquisitionContentStopReason; readonly observedBytes: number; readonly decompressedBytes: number }
> {
  const observedBytes = params.response.body.byteLength;
  if (observedBytes > params.budget.streamingByteCap) {
    return { status: "streaming_byte_cap_exceeded", observedBytes, decompressedBytes: 0 };
  }
  if (observedBytes > params.budget.compressedByteCap) {
    return { status: "compressed_byte_cap_exceeded", observedBytes, decompressedBytes: 0 };
  }

  const encoding = (headerValue(params.response.headers, "content-encoding") ?? "identity").toLowerCase();
  if (encoding === "identity" || encoding === "") {
    if (observedBytes > params.budget.decompressedByteCap) {
      return { status: "decompressed_byte_cap_exceeded", observedBytes, decompressedBytes: observedBytes };
    }
    if (!sniffMatchesDeclared(params.declaredType, params.response.body)) {
      return { status: "content_type_rejected", observedBytes, decompressedBytes: observedBytes };
    }
    return { status: "ok", observedBytes, decompressedBytes: observedBytes };
  }
  if (encoding === "gzip" && params.target.decompressionPolicy === "gzip_allowed") {
    const decompressed = await gunzipWithCap(
      params.response.body,
      params.budget.decompressedByteCap,
      params.declaredType,
    );
    if (decompressed.status !== "ok") {
      return { status: decompressed.status, observedBytes, decompressedBytes: 0 };
    }
    return { status: "ok", observedBytes, decompressedBytes: decompressed.decompressedBytes };
  }
  return { status: "content_type_rejected", observedBytes, decompressedBytes: 0 };
}

function authorityMatches(
  authority: SourceAcquisitionContentDereferenceAuthority,
  target: SourceAcquisitionContentTargetEnvelope,
  budget: SourceAcquisitionContentBudgetSnapshot,
): boolean {
  if (!isSourceAcquisitionContentDereferenceAuthority(authority)) {
    return false;
  }
  const snapshot = readSourceAcquisitionContentAuthoritySnapshot(authority);
  return snapshot.providerNetworkAuthoritySnapshotHash === target.providerNetworkAuthoritySnapshotHash
    && snapshot.contentAuthoritySnapshotHash === target.contentAuthoritySnapshotHash
    && snapshot.contentTargetSnapshotHash === target.contentTargetSnapshotHash
    && snapshot.contentBudgetSnapshotHash === budget.contentBudgetSnapshotHash
    && snapshot.contentTargetSnapshotHash === budget.contentTargetSnapshotHash
    && snapshot.providerNetworkAuthoritySnapshotHash === budget.providerNetworkAuthoritySnapshotHash
    && snapshot.contentAuthoritySnapshotHash === budget.contentAuthoritySnapshotHash;
}

function executionTargetShapeIsValid(executionTarget: SourceAcquisitionContentEphemeralTarget): boolean {
  if (
    !executionTarget.fetchAttemptId.startsWith("ATT_")
    || !/^[A-Z0-9_]+$/.test(executionTarget.fetchAttemptId)
    || executionTarget.method !== "GET"
    || !Number.isInteger(executionTarget.port)
    || executionTarget.port <= 0
    || executionTarget.port > 65535
    || !executionTarget.pathWithQuery.startsWith("/")
    || executionTarget.pathWithQuery.includes("://")
    || executionTarget.pathWithQuery.includes("\\")
    || executionTarget.pathWithQuery.includes("#")
  ) {
    return false;
  }

  const normalizedHostname = normalizeSourceAcquisitionContentHostname(executionTarget.canonicalHostname);
  return normalizedHostname !== null
    && normalizedHostname === executionTarget.canonicalHostname
    && Object.keys(executionTarget.requestHeaders).sort().join("|") === "accept|user-agent"
    && executionTarget.requestHeaders.accept.trim().length > 0
    && executionTarget.requestHeaders["user-agent"].trim().length > 0
    && !JSON.stringify(executionTarget.requestHeaders).toLowerCase().includes("authorization");
}

function executionTargetIsValid(
  target: SourceAcquisitionContentTargetEnvelope,
  executionTarget: SourceAcquisitionContentEphemeralTarget,
): boolean {
  const binding = ephemeralTargetBindings.get(executionTarget);
  return binding !== undefined
    && executionTargetShapeIsValid(executionTarget)
    && bindingMatchesTarget(binding, target);
}

export async function executeSourceAcquisitionContentTransport(
  input: SourceAcquisitionContentTransportRequest,
): Promise<SourceAcquisitionContentTransportOutcome> {
  const transport = input.lowLevelTransport ?? defaultTransport();
  const startedAt = now(transport);

  if (validateSourceAcquisitionContentTargetEnvelope(input.target).status !== "valid") {
    return blocked({
      target: input.target,
      budget: input.budget,
      executionTarget: input.executionTarget,
      stopReason: "target_invalid",
      startedAt,
      transport,
    });
  }
  if (validateSourceAcquisitionContentBudgetSnapshot(input.budget).status !== "valid") {
    return blocked({
      target: input.target,
      budget: input.budget,
      executionTarget: input.executionTarget,
      stopReason: "budget_invalid",
      startedAt,
      transport,
    });
  }
  if (validateSourceAcquisitionContentRequestBinding({
    target: input.target,
    budget: input.budget,
  }).status !== "valid") {
    return blocked({
      target: input.target,
      budget: input.budget,
      executionTarget: input.executionTarget,
      stopReason: "request_invalid",
      startedAt,
      transport,
    });
  }
  if (!authorityMatches(input.authority, input.target, input.budget)) {
    return blocked({
      target: input.target,
      budget: input.budget,
      executionTarget: input.executionTarget,
      stopReason: "authority_invalid",
      startedAt,
      transport,
    });
  }
  if (!executionTargetIsValid(input.target, input.executionTarget)) {
    return blocked({
      target: input.target,
      budget: input.budget,
      executionTarget: input.executionTarget,
      stopReason: "request_invalid",
      startedAt,
      transport,
    });
  }

  const normalizedHostname = normalizeSourceAcquisitionContentHostname(input.executionTarget.canonicalHostname);
  if (normalizedHostname === null || normalizedHostname !== input.executionTarget.canonicalHostname) {
    return blocked({
      target: input.target,
      budget: input.budget,
      executionTarget: input.executionTarget,
      stopReason: "request_invalid",
      startedAt,
      transport,
    });
  }

  let resolved: readonly SourceAcquisitionContentResolvedAddress[];
  try {
    const resolveResult = await withTimeoutAndAbort({
      work: transport.resolve(normalizedHostname),
      timeoutMs: input.budget.perFetchTimeoutMs,
      signal: input.signal,
    });
    if (resolveResult.status === "timed_out") {
      return blocked({
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
        stopReason: "timed_out",
        startedAt,
        transport,
        status: "timed_out",
      });
    }
    if (resolveResult.status === "cancelled") {
      return blocked({
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
        stopReason: "cancelled",
        startedAt,
        transport,
        status: "cancelled",
      });
    }
    resolved = resolveResult.value;
  } catch {
    return blocked({
      target: input.target,
      budget: input.budget,
      executionTarget: input.executionTarget,
      stopReason: "dns_resolution_failed",
      startedAt,
      transport,
      status: "failed",
    });
  }

  const publicAddresses = resolved.filter((address) =>
    classifySourceAcquisitionContentIpAddress(address.address) === "public"
  );
  if (
    resolved.length === 0
    || publicAddresses.length !== resolved.length
    || !resolved.every((address) => address.family === 4 || address.family === 6)
  ) {
    return blocked({
      target: input.target,
      budget: input.budget,
      executionTarget: input.executionTarget,
      stopReason: "dns_address_blocked",
      startedAt,
      transport,
      dnsAddressCount: resolved.length,
      finalAddressValidation: "blocked_or_mismatched",
    });
  }

  try {
    const requestResult = await withTimeoutAndAbort({
      work: transport.request({
        hostname: normalizedHostname,
        port: input.executionTarget.port,
        method: input.executionTarget.method,
        pathWithQuery: input.executionTarget.pathWithQuery,
        headers: input.executionTarget.requestHeaders,
        timeoutMs: input.budget.perFetchTimeoutMs,
        maxCompressedBytes: input.budget.compressedByteCap,
        lookupAddress: publicAddresses[0],
        finalAddressValidationRequiredBeforeRequestEmission: true,
        signal: input.signal,
      }),
      timeoutMs: input.budget.perFetchTimeoutMs,
      signal: input.signal,
    });
    if (requestResult.status === "timed_out") {
      return blocked({
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
        stopReason: "timed_out",
        startedAt,
        transport,
        status: "timed_out",
        dnsAddressCount: resolved.length,
      });
    }
    if (requestResult.status === "cancelled") {
      return blocked({
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
        stopReason: "cancelled",
        startedAt,
        transport,
        status: "cancelled",
        dnsAddressCount: resolved.length,
      });
    }
    const response = requestResult.value;
    const finalAddressMatches = publicAddresses.some((address) => address.address === response.remoteAddress)
      && classifySourceAcquisitionContentIpAddress(response.remoteAddress) === "public";
    if (!finalAddressMatches) {
      return blocked({
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
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
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
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
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
        stopReason: "http_status_rejected",
        startedAt,
        transport,
        status: "failed",
        dnsAddressCount: resolved.length,
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: category,
      });
    }
    const declaredType = declaredContentType(response, input.target);
    if (declaredType === null) {
      return blocked({
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
        stopReason: "content_type_rejected",
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: category,
        contentTypeState: "rejected",
      });
    }

    const declaredByteCount = contentLength(response.headers);
    if (declaredByteCount !== null && declaredByteCount > input.budget.declaredByteCap) {
      return blocked({
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
        stopReason: "declared_byte_cap_exceeded",
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: category,
        contentTypeState: "accepted",
        declaredByteCount,
      });
    }

    const bodyState = await bodyByteState({
      response,
      target: input.target,
      budget: input.budget,
      declaredType,
    });
    if (bodyState.status !== "ok") {
      return blocked({
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
        stopReason: bodyState.status,
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: category,
        contentTypeState: bodyState.status === "content_type_rejected" ? "rejected" : "accepted",
        declaredByteCount,
        observedByteCount: bodyState.observedBytes,
        decompressedByteCount: bodyState.decompressedBytes,
      });
    }

    return {
      status: "success",
      diagnostic: diagnostic({
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
        status: "success",
        stopReason: "not_stopped",
        startedAt,
        transport,
        contentTypeState: "accepted",
        declaredByteCount,
        observedByteCount: bodyState.observedBytes,
        decompressedByteCount: bodyState.decompressedBytes,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: category,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (input.signal?.aborted || message === "cancelled") {
      return blocked({
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
        stopReason: "cancelled",
        startedAt,
        transport,
        status: "cancelled",
        dnsAddressCount: resolved.length,
      });
    }
    if (message === "timed_out") {
      return blocked({
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
        stopReason: "timed_out",
        startedAt,
        transport,
        status: "timed_out",
        dnsAddressCount: resolved.length,
      });
    }
    if (message === "compressed_byte_cap_exceeded") {
      return blocked({
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
        stopReason: "compressed_byte_cap_exceeded",
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
      });
    }
    if (message === "final_address_mismatch") {
      return blocked({
        target: input.target,
        budget: input.budget,
        executionTarget: input.executionTarget,
        stopReason: "final_address_mismatch",
        startedAt,
        transport,
        dnsAddressCount: resolved.length,
        finalAddressValidation: "blocked_or_mismatched",
      });
    }
    return blocked({
      target: input.target,
      budget: input.budget,
      executionTarget: input.executionTarget,
      stopReason: "transport_failure",
      startedAt,
      transport,
      status: "failed",
      dnsAddressCount: resolved.length,
    });
  }
}
