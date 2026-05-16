import { describe, expect, it } from "vitest";
import {
  PARSER_ISOLATION_NODE_RESTRICTION_PROFILE_ID,
  PARSER_ISOLATION_PROOF_CONTRACT_VERSION,
  buildParserIsolationUnavailableResult,
  mapParserIsolationProbeOutput,
  validateParserIsolationProofOptions,
  type ParserIsolationDeniedAuthorityMap,
  type ParserIsolationProofApprovedOptions,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof";

const APPROVED_IMAGE =
  "registry.example/fh-node@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const RUNTIME_PATH = "C:\\Program Files\\Podman\\podman.exe";
const IMAGE_APPROVAL_SOURCE =
  "Docs/AGENTS/Handoffs/example-independent-image-approval.md";

function deniedAuthorities(overrides: Partial<ParserIsolationDeniedAuthorityMap> = {}): ParserIsolationDeniedAuthorityMap {
  return {
    childProcessDenied: true,
    dnsDenied: true,
    envSecretReadDenied: true,
    hostRepoReadDenied: true,
    hostWriteDenied: true,
    nativeAddonDenied: true,
    outboundNetworkDenied: true,
    outputLeakDenied: true,
    runtimeSocketDenied: true,
    sentinelTempReadDenied: true,
    shellDenied: true,
    stderrBounded: true,
    stdoutBounded: true,
    workerThreadDenied: true,
    ...overrides,
  };
}

function options(overrides: Partial<ParserIsolationProofApprovedOptions> = {}): ParserIsolationProofApprovedOptions {
  return {
    proofScope: "deployment_candidate",
    runtimeKind: "podman",
    runtimeExecutablePath: RUNTIME_PATH,
    runtimeAuthority: "rootless_oci",
    approvedImageReferences: [APPROVED_IMAGE],
    imageReference: APPROVED_IMAGE,
    imageApprovalSource: IMAGE_APPROVAL_SOURCE,
    nodeRestrictionProfileId: PARSER_ISOLATION_NODE_RESTRICTION_PROFILE_ID,
    timeoutMs: 1_000,
    ...overrides,
  };
}

describe("Analyzer V2 parser isolation proof contract", () => {
  it("builds a structural unavailable result without leaking runtime or source material", () => {
    const result = buildParserIsolationUnavailableResult();
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      version: PARSER_ISOLATION_PROOF_CONTRACT_VERSION,
      visibility: "internal_only",
      status: "parser_isolation_unavailable",
      proofScope: "not_available",
      deniedAuthorities: null,
      rawPayloadIncluded: false,
      parsedTextIncluded: false,
      evidenceItemIncluded: false,
      verdictIncluded: false,
      reportProseIncluded: false,
    });
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("registry.example");
    expect(serialized).not.toContain("Program Files");
  });

  it("requires explicit approved runtime authority, absolute runtime path, and exact image approval", () => {
    expect(validateParserIsolationProofOptions(undefined).result.status).toBe("parser_isolation_unavailable");

    expect(validateParserIsolationProofOptions({
      ...options(),
      runtimeKind: "containerd",
    }).result.status).toBe("parser_isolation_runtime_unapproved");

    expect(validateParserIsolationProofOptions({
      ...options(),
      runtimeExecutablePath: "",
    }).result.status).toBe("parser_isolation_runtime_not_found");

    expect(validateParserIsolationProofOptions({
      ...options(),
      runtimeExecutablePath: "podman",
    }).result.status).toBe("parser_isolation_runtime_unapproved");

    expect(validateParserIsolationProofOptions({
      ...options(),
      imageReference: "registry.example/fh-node:latest",
    }).result.status).toBe("parser_isolation_image_unapproved");

    expect(validateParserIsolationProofOptions({
      ...options(),
      imageReference: "registry.example/fh-node@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    }).result.status).toBe("parser_isolation_image_unapproved");

    const withoutApprovalSource = { ...options() } as Record<string, unknown>;
    delete withoutApprovalSource.imageApprovalSource;
    expect(validateParserIsolationProofOptions(withoutApprovalSource).result.status)
      .toBe("parser_isolation_image_unapproved");

    expect(validateParserIsolationProofOptions({
      ...options(),
      imageApprovalSource: "",
    }).result.status).toBe("parser_isolation_image_unapproved");

    expect(validateParserIsolationProofOptions({
      ...options(),
      imageApprovalSource: APPROVED_IMAGE,
    }).result.status).toBe("parser_isolation_image_unapproved");
  });

  it("rejects local Docker Desktop or unknown/rootful authority as deployment-candidate proof", () => {
    expect(validateParserIsolationProofOptions({
      ...options({
        runtimeKind: "docker",
        runtimeAuthority: "windows_docker_desktop_local",
      }),
    }).result.status).toBe("parser_isolation_runtime_unapproved");

    expect(validateParserIsolationProofOptions({
      ...options({
        runtimeKind: "docker",
        runtimeAuthority: "unknown_or_rootful",
      }),
    }).result.status).toBe("parser_isolation_runtime_unapproved");

    expect(validateParserIsolationProofOptions({
      ...options({
        proofScope: "local_only",
        runtimeKind: "docker",
        runtimeAuthority: "windows_docker_desktop_local",
      }),
    }).status).toBe("valid");
  });

  it("maps all-denied probe output to verified only inside the supplied proof scope", () => {
    const result = mapParserIsolationProbeOutput({
      output: {
        version: PARSER_ISOLATION_PROOF_CONTRACT_VERSION,
        status: "denial_probe_complete",
        deniedAuthorities: deniedAuthorities(),
      },
      options: options(),
      durationMs: 12,
      exitCode: 0,
    });

    expect(result).toMatchObject({
      status: "parser_isolation_verified",
      proofScope: "deployment_candidate",
      runtimeKind: "podman",
      runtimeAuthority: "rootless_oci",
      deniedAuthorities: deniedAuthorities(),
      rawPayloadIncluded: false,
      parsedTextIncluded: false,
      providerJsonIncluded: false,
    });
    expect(JSON.stringify(result)).not.toContain(APPROVED_IMAGE);
    expect(JSON.stringify(result)).not.toContain(RUNTIME_PATH);
  });

  it("fails closed for denial failures, malformed outputs, and leaking outputs", () => {
    expect(mapParserIsolationProbeOutput({
      output: {
        version: PARSER_ISOLATION_PROOF_CONTRACT_VERSION,
        status: "denial_probe_complete",
        deniedAuthorities: deniedAuthorities({ childProcessDenied: false }),
      },
      options: options(),
      durationMs: 1,
      exitCode: 0,
    }).status).toBe("parser_isolation_denial_failed");

    expect(mapParserIsolationProbeOutput({
      output: {
        version: PARSER_ISOLATION_PROOF_CONTRACT_VERSION,
        status: "denial_probe_complete",
        deniedAuthorities: deniedAuthorities(),
        extra: "structural",
      },
      options: options(),
      durationMs: 1,
      exitCode: 0,
    }).status).toBe("parser_isolation_output_malformed");

    expect(mapParserIsolationProbeOutput({
      output: {
        version: PARSER_ISOLATION_PROOF_CONTRACT_VERSION,
        status: "denial_probe_complete",
        deniedAuthorities: deniedAuthorities(),
        note: "https://source.example/sk_secret",
      },
      options: options(),
      durationMs: 1,
      exitCode: 0,
    }).status).toBe("parser_isolation_output_leak");
  });
});
