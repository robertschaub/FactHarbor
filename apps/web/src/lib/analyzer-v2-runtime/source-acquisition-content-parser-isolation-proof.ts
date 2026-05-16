import { createHash } from "node:crypto";

export const PARSER_ISOLATION_PROOF_CONTRACT_VERSION =
  "v2.source-acquisition.content-parser-isolation-proof.7n3b3-2d-b2";
export const PARSER_ISOLATION_NODE_RESTRICTION_PROFILE_ID =
  "node_permission_no_addons_v1";

export type ParserIsolationProofScope = "local_only" | "deployment_candidate";
export type ParserIsolationRuntimeKind = "podman" | "docker";
export type ParserIsolationRuntimeAuthority =
  | "rootless_oci"
  | "windows_docker_desktop_local"
  | "unknown_or_rootful";

export type ParserIsolationProofStatus =
  | "parser_isolation_verified"
  | "parser_isolation_unavailable"
  | "parser_isolation_runtime_unapproved"
  | "parser_isolation_runtime_not_found"
  | "parser_isolation_image_unapproved"
  | "parser_isolation_image_unavailable"
  | "parser_isolation_probe_failed"
  | "parser_isolation_denial_failed"
  | "parser_isolation_output_malformed"
  | "parser_isolation_output_leak"
  | "parser_isolation_timed_out"
  | "parser_isolation_cancelled";

export type ParserIsolationDeniedAuthorityMap = {
  readonly envSecretReadDenied: boolean;
  readonly hostRepoReadDenied: boolean;
  readonly sentinelTempReadDenied: boolean;
  readonly hostWriteDenied: boolean;
  readonly outboundNetworkDenied: boolean;
  readonly dnsDenied: boolean;
  readonly childProcessDenied: boolean;
  readonly workerThreadDenied: boolean;
  readonly nativeAddonDenied: boolean;
  readonly shellDenied: boolean;
  readonly runtimeSocketDenied: boolean;
  readonly stdoutBounded: boolean;
  readonly stderrBounded: boolean;
  readonly outputLeakDenied: boolean;
};

export type ParserIsolationProofApprovedOptions = {
  readonly proofScope: ParserIsolationProofScope;
  readonly runtimeKind: ParserIsolationRuntimeKind;
  readonly runtimeExecutablePath: string;
  readonly runtimeAuthority: ParserIsolationRuntimeAuthority;
  readonly approvedImageReferences: readonly string[];
  readonly imageReference: string;
  readonly nodeRestrictionProfileId: typeof PARSER_ISOLATION_NODE_RESTRICTION_PROFILE_ID;
  readonly timeoutMs: number;
};

export type ParserIsolationProofResult = {
  readonly version: typeof PARSER_ISOLATION_PROOF_CONTRACT_VERSION;
  readonly visibility: "internal_only";
  readonly status: ParserIsolationProofStatus;
  readonly proofScope: ParserIsolationProofScope | "not_available";
  readonly runtimeKind: ParserIsolationRuntimeKind | "not_available";
  readonly runtimeAuthority: ParserIsolationRuntimeAuthority | "not_available";
  readonly nodeRestrictionProfileId: typeof PARSER_ISOLATION_NODE_RESTRICTION_PROFILE_ID | "not_available";
  readonly imageReferenceHash: string | null;
  readonly runtimeExecutableHash: string | null;
  readonly deniedAuthorities: ParserIsolationDeniedAuthorityMap | null;
  readonly stopReason: ParserIsolationProofStatus;
  readonly durationMs: number;
  readonly exitCode: number | null;
  readonly signalName: string | null;
  readonly rawPayloadIncluded: false;
  readonly parsedTextIncluded: false;
  readonly sourceIdentifierIncluded: false;
  readonly providerJsonIncluded: false;
  readonly evidenceItemIncluded: false;
  readonly warningIncluded: false;
  readonly verdictIncluded: false;
  readonly confidenceIncluded: false;
  readonly reportProseIncluded: false;
  readonly promptModelTelemetryIncluded: false;
  readonly v1IdentifierIncluded: false;
};

export type ParserIsolationProofOptionsValidation =
  | {
      readonly status: "valid";
      readonly options: ParserIsolationProofApprovedOptions;
    }
  | {
      readonly status: "blocked";
      readonly result: ParserIsolationProofResult;
    };

const deniedAuthorityKeys: readonly (keyof ParserIsolationDeniedAuthorityMap)[] = [
  "childProcessDenied",
  "dnsDenied",
  "envSecretReadDenied",
  "hostRepoReadDenied",
  "hostWriteDenied",
  "nativeAddonDenied",
  "outboundNetworkDenied",
  "outputLeakDenied",
  "runtimeSocketDenied",
  "sentinelTempReadDenied",
  "shellDenied",
  "stderrBounded",
  "stdoutBounded",
  "workerThreadDenied",
];

const resultKeys = [
  "confidenceIncluded",
  "deniedAuthorities",
  "durationMs",
  "evidenceItemIncluded",
  "exitCode",
  "imageReferenceHash",
  "nodeRestrictionProfileId",
  "parsedTextIncluded",
  "promptModelTelemetryIncluded",
  "proofScope",
  "providerJsonIncluded",
  "rawPayloadIncluded",
  "reportProseIncluded",
  "runtimeAuthority",
  "runtimeExecutableHash",
  "runtimeKind",
  "signalName",
  "sourceIdentifierIncluded",
  "status",
  "stopReason",
  "v1IdentifierIncluded",
  "verdictIncluded",
  "version",
  "visibility",
  "warningIncluded",
].sort();

const forbiddenSerializedFragments = [
  "://",
  "\\",
  "secret",
  "token",
  "password",
  "credential",
  "bearer",
  "sk_",
  "providerjson",
  "rawpayload",
  "parsedtext",
  "sourceidentifier",
  "evidenceitem",
  "verdict",
  "confidence",
  "reportprose",
  "promptmodel",
  "claimboundary",
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

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function proofScope(value: unknown): value is ParserIsolationProofScope {
  return value === "local_only" || value === "deployment_candidate";
}

function runtimeKind(value: unknown): value is ParserIsolationRuntimeKind {
  return value === "podman" || value === "docker";
}

function runtimeAuthority(value: unknown): value is ParserIsolationRuntimeAuthority {
  return value === "rootless_oci"
    || value === "windows_docker_desktop_local"
    || value === "unknown_or_rootful";
}

function digestPinnedImageReference(value: unknown): value is string {
  return typeof value === "string"
    && value === value.trim()
    && /^[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(value)
    && !serializedHasForbiddenLeak(value);
}

function runtimeExecutablePathIsAbsolute(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith("/");
}

function serializedHasForbiddenLeak(value: unknown): boolean {
  if (typeof value === "string") {
    return stringHasForbiddenLeak(value);
  }
  if (Array.isArray(value)) {
    return value.some(serializedHasForbiddenLeak);
  }
  if (isRecord(value)) {
    return Object.values(value).some(serializedHasForbiddenLeak);
  }
  return false;
}

function stringHasForbiddenLeak(value: string): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return forbiddenSerializedFragments.some((fragment) => normalized.includes(fragment));
}

function blankDeniedAuthorities(): ParserIsolationDeniedAuthorityMap {
  return {
    childProcessDenied: false,
    dnsDenied: false,
    envSecretReadDenied: false,
    hostRepoReadDenied: false,
    hostWriteDenied: false,
    nativeAddonDenied: false,
    outboundNetworkDenied: false,
    outputLeakDenied: false,
    runtimeSocketDenied: false,
    sentinelTempReadDenied: false,
    shellDenied: false,
    stderrBounded: false,
    stdoutBounded: false,
    workerThreadDenied: false,
  };
}

export function buildParserIsolationProofResult(params: {
  readonly status: ParserIsolationProofStatus;
  readonly proofScope?: ParserIsolationProofResult["proofScope"];
  readonly runtimeKind?: ParserIsolationProofResult["runtimeKind"];
  readonly runtimeAuthority?: ParserIsolationProofResult["runtimeAuthority"];
  readonly nodeRestrictionProfileId?: ParserIsolationProofResult["nodeRestrictionProfileId"];
  readonly imageReference?: string | null;
  readonly runtimeExecutablePath?: string | null;
  readonly deniedAuthorities?: ParserIsolationDeniedAuthorityMap | null;
  readonly durationMs?: number;
  readonly exitCode?: number | null;
  readonly signalName?: string | null;
}): ParserIsolationProofResult {
  const result: ParserIsolationProofResult = {
    version: PARSER_ISOLATION_PROOF_CONTRACT_VERSION,
    visibility: "internal_only",
    status: params.status,
    proofScope: params.proofScope ?? "not_available",
    runtimeKind: params.runtimeKind ?? "not_available",
    runtimeAuthority: params.runtimeAuthority ?? "not_available",
    nodeRestrictionProfileId: params.nodeRestrictionProfileId ?? "not_available",
    imageReferenceHash: params.imageReference ? sha256(params.imageReference) : null,
    runtimeExecutableHash: params.runtimeExecutablePath ? sha256(params.runtimeExecutablePath) : null,
    deniedAuthorities: params.deniedAuthorities ?? null,
    stopReason: params.status,
    durationMs: Math.max(0, Math.trunc(params.durationMs ?? 0)),
    exitCode: params.exitCode ?? null,
    signalName: params.signalName ?? null,
    rawPayloadIncluded: false,
    parsedTextIncluded: false,
    sourceIdentifierIncluded: false,
    providerJsonIncluded: false,
    evidenceItemIncluded: false,
    warningIncluded: false,
    verdictIncluded: false,
    confidenceIncluded: false,
    reportProseIncluded: false,
    promptModelTelemetryIncluded: false,
    v1IdentifierIncluded: false,
  };

  if (!hasExactKeys(result as unknown as Record<string, unknown>, resultKeys)) {
    throw new Error("Invalid parser isolation proof result shape.");
  }
  return result;
}

export function buildParserIsolationUnavailableResult(): ParserIsolationProofResult {
  return buildParserIsolationProofResult({
    status: "parser_isolation_unavailable",
    deniedAuthorities: null,
  });
}

export function validateParserIsolationProofOptions(
  value: unknown,
): ParserIsolationProofOptionsValidation {
  if (!isRecord(value)) {
    return { status: "blocked", result: buildParserIsolationUnavailableResult() };
  }
  if (!runtimeKind(value.runtimeKind) || !runtimeAuthority(value.runtimeAuthority) || !proofScope(value.proofScope)) {
    return {
      status: "blocked",
      result: buildParserIsolationProofResult({
        status: "parser_isolation_runtime_unapproved",
      }),
    };
  }
  if (typeof value.runtimeExecutablePath !== "string" || value.runtimeExecutablePath.trim().length === 0) {
    return {
      status: "blocked",
      result: buildParserIsolationProofResult({
        status: "parser_isolation_runtime_not_found",
        proofScope: value.proofScope,
        runtimeKind: value.runtimeKind,
        runtimeAuthority: value.runtimeAuthority,
      }),
    };
  }
  if (!runtimeExecutablePathIsAbsolute(value.runtimeExecutablePath)) {
    return {
      status: "blocked",
      result: buildParserIsolationProofResult({
        status: "parser_isolation_runtime_unapproved",
        proofScope: value.proofScope,
        runtimeKind: value.runtimeKind,
        runtimeAuthority: value.runtimeAuthority,
      }),
    };
  }
  if (
    value.proofScope === "deployment_candidate"
    && value.runtimeAuthority !== "rootless_oci"
  ) {
    return {
      status: "blocked",
      result: buildParserIsolationProofResult({
        status: "parser_isolation_runtime_unapproved",
        proofScope: value.proofScope,
        runtimeKind: value.runtimeKind,
        runtimeAuthority: value.runtimeAuthority,
      }),
    };
  }
  if (
    !digestPinnedImageReference(value.imageReference)
    || !Array.isArray(value.approvedImageReferences)
    || !value.approvedImageReferences.every(digestPinnedImageReference)
    || !value.approvedImageReferences.includes(value.imageReference)
  ) {
    return {
      status: "blocked",
      result: buildParserIsolationProofResult({
        status: "parser_isolation_image_unapproved",
        proofScope: value.proofScope,
        runtimeKind: value.runtimeKind,
        runtimeAuthority: value.runtimeAuthority,
        runtimeExecutablePath: value.runtimeExecutablePath,
      }),
    };
  }
  if (
    value.nodeRestrictionProfileId !== PARSER_ISOLATION_NODE_RESTRICTION_PROFILE_ID
    || !positiveInteger(value.timeoutMs)
    || value.timeoutMs > 30_000
  ) {
    return {
      status: "blocked",
      result: buildParserIsolationProofResult({
        status: "parser_isolation_runtime_unapproved",
        proofScope: value.proofScope,
        runtimeKind: value.runtimeKind,
        runtimeAuthority: value.runtimeAuthority,
        imageReference: value.imageReference,
        runtimeExecutablePath: value.runtimeExecutablePath,
      }),
    };
  }

  return {
    status: "valid",
    options: {
      proofScope: value.proofScope,
      runtimeKind: value.runtimeKind,
      runtimeExecutablePath: value.runtimeExecutablePath,
      runtimeAuthority: value.runtimeAuthority,
      approvedImageReferences: [...value.approvedImageReferences],
      imageReference: value.imageReference,
      nodeRestrictionProfileId: value.nodeRestrictionProfileId,
      timeoutMs: value.timeoutMs,
    },
  };
}

export function mapParserIsolationProbeOutput(params: {
  readonly output: unknown;
  readonly options: ParserIsolationProofApprovedOptions;
  readonly durationMs: number;
  readonly exitCode: number | null;
  readonly signalName?: string | null;
}): ParserIsolationProofResult {
  if (serializedHasForbiddenLeak(params.output)) {
    return buildParserIsolationProofResult({
      status: "parser_isolation_output_leak",
      proofScope: params.options.proofScope,
      runtimeKind: params.options.runtimeKind,
      runtimeAuthority: params.options.runtimeAuthority,
      nodeRestrictionProfileId: params.options.nodeRestrictionProfileId,
      imageReference: params.options.imageReference,
      runtimeExecutablePath: params.options.runtimeExecutablePath,
      durationMs: params.durationMs,
      exitCode: params.exitCode,
      signalName: params.signalName ?? null,
    });
  }
  if (!isRecord(params.output) || !hasExactKeys(params.output, ["deniedAuthorities", "status", "version"])) {
    return buildParserIsolationProofResult({
      status: "parser_isolation_output_malformed",
      proofScope: params.options.proofScope,
      runtimeKind: params.options.runtimeKind,
      runtimeAuthority: params.options.runtimeAuthority,
      nodeRestrictionProfileId: params.options.nodeRestrictionProfileId,
      imageReference: params.options.imageReference,
      runtimeExecutablePath: params.options.runtimeExecutablePath,
      durationMs: params.durationMs,
      exitCode: params.exitCode,
      signalName: params.signalName ?? null,
    });
  }
  if (
    params.output.version !== PARSER_ISOLATION_PROOF_CONTRACT_VERSION
    || params.output.status !== "denial_probe_complete"
    || !isRecord(params.output.deniedAuthorities)
    || !hasExactKeys(params.output.deniedAuthorities, deniedAuthorityKeys)
  ) {
    return buildParserIsolationProofResult({
      status: "parser_isolation_output_malformed",
      proofScope: params.options.proofScope,
      runtimeKind: params.options.runtimeKind,
      runtimeAuthority: params.options.runtimeAuthority,
      nodeRestrictionProfileId: params.options.nodeRestrictionProfileId,
      imageReference: params.options.imageReference,
      runtimeExecutablePath: params.options.runtimeExecutablePath,
      durationMs: params.durationMs,
      exitCode: params.exitCode,
      signalName: params.signalName ?? null,
    });
  }

  const deniedAuthorities = params.output.deniedAuthorities as ParserIsolationDeniedAuthorityMap;
  if (deniedAuthorityKeys.some((key) => deniedAuthorities[key] !== true)) {
    return buildParserIsolationProofResult({
      status: "parser_isolation_denial_failed",
      proofScope: params.options.proofScope,
      runtimeKind: params.options.runtimeKind,
      runtimeAuthority: params.options.runtimeAuthority,
      nodeRestrictionProfileId: params.options.nodeRestrictionProfileId,
      imageReference: params.options.imageReference,
      runtimeExecutablePath: params.options.runtimeExecutablePath,
      deniedAuthorities: { ...blankDeniedAuthorities(), ...deniedAuthorities },
      durationMs: params.durationMs,
      exitCode: params.exitCode,
      signalName: params.signalName ?? null,
    });
  }

  return buildParserIsolationProofResult({
    status: "parser_isolation_verified",
    proofScope: params.options.proofScope,
    runtimeKind: params.options.runtimeKind,
    runtimeAuthority: params.options.runtimeAuthority,
    nodeRestrictionProfileId: params.options.nodeRestrictionProfileId,
    imageReference: params.options.imageReference,
    runtimeExecutablePath: params.options.runtimeExecutablePath,
    deniedAuthorities,
    durationMs: params.durationMs,
    exitCode: params.exitCode,
    signalName: params.signalName ?? null,
  });
}
