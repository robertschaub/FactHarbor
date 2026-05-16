import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import {
  PARSER_ISOLATION_NODE_RESTRICTION_PROFILE_ID,
  PARSER_ISOLATION_PROOF_CONTRACT_VERSION,
  type ParserIsolationDeniedAuthorityMap,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof";
import {
  runOciParserIsolationProof,
  type OciParserIsolationChildProcess,
  type OciParserIsolationProcessSpawner,
  type OciParserIsolationSpawnRequest,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof";

const APPROVED_IMAGE =
  "registry.example/fh-node@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const RUNTIME_PATH = "C:\\Program Files\\Podman\\podman.exe";

class FakeChild implements OciParserIsolationChildProcess {
  private readonly events = new EventEmitter();
  private readonly stdoutEvents = new EventEmitter();
  private readonly stderrEvents = new EventEmitter();
  private readonly stdinEvents = new EventEmitter();
  public killed = false;
  public stdinPayload = "";
  public onStdinEnd: (() => void) | null = null;
  public readonly stdin = {
    on: (event: "error", listener: (error: Error) => void): void => {
      this.stdinEvents.on(event, listener);
    },
    end: (input: string, _encoding: "utf8"): void => {
      this.stdinPayload = input;
      this.onStdinEnd?.();
    },
  };
  public readonly stdout = {
    on: (event: "data", listener: (chunk: Buffer) => void): void => {
      this.stdoutEvents.on(event, listener);
    },
  };
  public readonly stderr = {
    on: (event: "data", listener: (chunk: Buffer) => void): void => {
      this.stderrEvents.on(event, listener);
    },
  };

  public kill(): void {
    this.killed = true;
  }

  public on(event: "error", listener: (error: Error & { readonly code?: string }) => void): void;
  public on(event: "close", listener: (code: number | null, signal: string | null) => void): void;
  public on(event: "error" | "close", listener: ((error: Error & { readonly code?: string }) => void) | ((code: number | null, signal: string | null) => void)): void {
    this.events.on(event, listener);
  }

  public emitStdout(value: unknown): void {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    this.stdoutEvents.emit("data", Buffer.from(text, "utf8"));
  }

  public emitStderr(value: string): void {
    this.stderrEvents.emit("data", Buffer.from(value, "utf8"));
  }

  public close(code: number | null = 0, signal: string | null = null): void {
    this.events.emit("close", code, signal);
  }

  public error(error: Error & { readonly code?: string }): void {
    this.events.emit("error", error);
  }
}

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

function successOutput(overrides: Partial<ParserIsolationDeniedAuthorityMap> = {}) {
  return {
    version: PARSER_ISOLATION_PROOF_CONTRACT_VERSION,
    status: "denial_probe_complete",
    deniedAuthorities: deniedAuthorities(overrides),
  };
}

function options(overrides: Parameters<typeof runOciParserIsolationProof>[0] = {}) {
  return {
    proofScope: "deployment_candidate" as const,
    runtimeKind: "podman" as const,
    runtimeExecutablePath: RUNTIME_PATH,
    runtimeAuthority: "rootless_oci" as const,
    approvedImageReferences: [APPROVED_IMAGE],
    imageReference: APPROVED_IMAGE,
    nodeRestrictionProfileId: PARSER_ISOLATION_NODE_RESTRICTION_PROFILE_ID,
    timeoutMs: 1_000,
    ...overrides,
  };
}

function scriptedSpawner(
  script: (child: FakeChild, request: OciParserIsolationSpawnRequest) => void,
): {
  readonly calls: OciParserIsolationSpawnRequest[];
  readonly children: FakeChild[];
  readonly spawnProcess: OciParserIsolationProcessSpawner;
} {
  const calls: OciParserIsolationSpawnRequest[] = [];
  const children: FakeChild[] = [];
  return {
    calls,
    children,
    spawnProcess: (request) => {
      const child = new FakeChild();
      calls.push(request);
      children.push(child);
      script(child, request);
      return child;
    },
  };
}

function runtimeKindFromExecutablePath(value: string): "podman" | "docker" | null {
  const normalized = value.toLowerCase();
  if (normalized.includes("podman")) {
    return "podman";
  }
  if (normalized.includes("docker")) {
    return "docker";
  }
  return null;
}

describe("Analyzer V2 OCI parser isolation proof", () => {
  it("fails closed locally when no explicit runtime and image approval is supplied", async () => {
    await expect(runOciParserIsolationProof()).resolves.toMatchObject({
      status: "parser_isolation_unavailable",
      proofScope: "not_available",
    });
  });

  it("builds the reviewed OCI command without host escape flags and maps all-denied output to verified", async () => {
    const spawner = scriptedSpawner((child) => {
      child.onStdinEnd = () => {
        child.emitStdout(successOutput());
        child.close(0);
      };
    });
    const result = await runOciParserIsolationProof(options({ spawnProcess: spawner.spawnProcess }));

    expect(result).toMatchObject({
      status: "parser_isolation_verified",
      proofScope: "deployment_candidate",
      runtimeKind: "podman",
      runtimeAuthority: "rootless_oci",
    });
    expect(spawner.calls).toHaveLength(1);
    expect(spawner.calls[0].runtimeExecutablePath).toBe(RUNTIME_PATH);
    expect(spawner.calls[0].args).toEqual([
      "run",
      "--rm",
      "-i",
      "--network",
      "none",
      "--read-only",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--pids-limit",
      "16",
      "--memory",
      "128m",
      "--cpus",
      "0.5",
      "--user",
      "65534:65534",
      "--pull",
      "never",
      "--entrypoint",
      "node",
      APPROVED_IMAGE,
      "--experimental-permission",
      "--no-addons",
      "--disable-proto=throw",
      "-",
    ]);
    const args = spawner.calls[0].args;
    const argPairs = args.map((arg, index) => `${arg} ${args[index + 1] ?? ""}`);
    for (const forbidden of [
      "--privileged",
      "--cap-add",
      "--device",
      "--mount",
      "--volume",
      "-v",
      "--env",
      "-e",
      "--env-file",
      "--dns",
      "--add-host",
      "seccomp=unconfined",
      "apparmor=unconfined",
      "docker.sock",
      "podman.sock",
    ]) {
      expect(args).not.toContain(forbidden);
    }
    for (const forbiddenPair of [
      "--network host",
      "--network=host",
      "--pid host",
      "--pid=host",
      "--ipc host",
      "--ipc=host",
      "--uts host",
      "--uts=host",
      "--userns host",
      "--userns=host",
    ]) {
      expect(argPairs).not.toContain(forbiddenPair);
    }
    expect(spawner.calls[0].stdin).toContain("denial_probe_complete");
    expect(spawner.calls[0].stdin).not.toContain("http://source.example");
  });

  it("rejects unapproved runtime, image, and deployment authority before spawning", async () => {
    const spawner = scriptedSpawner((child) => {
      child.onStdinEnd = () => child.close(0);
    });

    await expect(runOciParserIsolationProof(options({
      runtimeKind: "containerd" as "podman",
      spawnProcess: spawner.spawnProcess,
    }))).resolves.toMatchObject({ status: "parser_isolation_runtime_unapproved" });
    await expect(runOciParserIsolationProof(options({
      runtimeExecutablePath: "podman",
      spawnProcess: spawner.spawnProcess,
    }))).resolves.toMatchObject({ status: "parser_isolation_runtime_unapproved" });
    await expect(runOciParserIsolationProof(options({
      imageReference: "registry.example/fh-node:latest",
      spawnProcess: spawner.spawnProcess,
    }))).resolves.toMatchObject({ status: "parser_isolation_image_unapproved" });
    await expect(runOciParserIsolationProof(options({
      imageReference: "registry.example/fh-node@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      spawnProcess: spawner.spawnProcess,
    }))).resolves.toMatchObject({ status: "parser_isolation_image_unapproved" });
    await expect(runOciParserIsolationProof(options({
      runtimeKind: "docker",
      runtimeAuthority: "windows_docker_desktop_local",
      spawnProcess: spawner.spawnProcess,
    }))).resolves.toMatchObject({ status: "parser_isolation_runtime_unapproved" });

    expect(spawner.calls).toHaveLength(0);
  });

  it("maps missing runtime, unavailable image, unsupported Node flags, and denial failures to blocked statuses", async () => {
    const missing = scriptedSpawner((child) => {
      const error = new Error("not found") as Error & { readonly code?: string };
      Object.defineProperty(error, "code", { value: "ENOENT" });
      child.onStdinEnd = () => child.error(error);
    });
    await expect(runOciParserIsolationProof(options({ spawnProcess: missing.spawnProcess })))
      .resolves.toMatchObject({ status: "parser_isolation_runtime_not_found" });

    const unavailableImage = scriptedSpawner((child) => {
      child.onStdinEnd = () => {
        child.emitStderr("Error: no such image");
        child.close(1);
      };
    });
    await expect(runOciParserIsolationProof(options({ spawnProcess: unavailableImage.spawnProcess })))
      .resolves.toMatchObject({ status: "parser_isolation_image_unavailable" });

    const unsupportedNodeFlags = scriptedSpawner((child) => {
      child.onStdinEnd = () => {
        child.emitStderr("node: bad option: --experimental-permission");
        child.close(9);
      };
    });
    await expect(runOciParserIsolationProof(options({ spawnProcess: unsupportedNodeFlags.spawnProcess })))
      .resolves.toMatchObject({ status: "parser_isolation_probe_failed" });

    const denialFailure = scriptedSpawner((child) => {
      child.onStdinEnd = () => {
        child.emitStdout(successOutput({ childProcessDenied: false }));
        child.close(0);
      };
    });
    await expect(runOciParserIsolationProof(options({ spawnProcess: denialFailure.spawnProcess })))
      .resolves.toMatchObject({ status: "parser_isolation_denial_failed" });
  });

  it("fails closed for malformed, oversized, and leaking probe output", async () => {
    const malformed = scriptedSpawner((child) => {
      child.onStdinEnd = () => {
        child.emitStdout({ ...successOutput(), extra: "structural" });
        child.close(0);
      };
    });
    await expect(runOciParserIsolationProof(options({ spawnProcess: malformed.spawnProcess })))
      .resolves.toMatchObject({ status: "parser_isolation_output_malformed" });

    const leak = scriptedSpawner((child) => {
      child.onStdinEnd = () => {
        child.emitStdout({ ...successOutput(), note: "https://source.example/sk_secret" });
        child.close(0);
      };
    });
    await expect(runOciParserIsolationProof(options({ spawnProcess: leak.spawnProcess })))
      .resolves.toMatchObject({ status: "parser_isolation_output_leak" });

    const oversized = scriptedSpawner((child) => {
      child.onStdinEnd = () => {
        child.emitStdout("x".repeat(20 * 1024));
        child.close(0);
      };
    });
    await expect(runOciParserIsolationProof(options({ spawnProcess: oversized.spawnProcess })))
      .resolves.toMatchObject({ status: "parser_isolation_output_malformed" });
  });

  it("kills the runtime process on timeout and cancellation", async () => {
    const timeoutSpawner = scriptedSpawner(() => undefined);
    await expect(runOciParserIsolationProof(options({
      timeoutMs: 5,
      spawnProcess: timeoutSpawner.spawnProcess,
    }))).resolves.toMatchObject({ status: "parser_isolation_timed_out" });
    expect(timeoutSpawner.children[0].killed).toBe(true);

    const controller = new AbortController();
    const cancelSpawner = scriptedSpawner(() => undefined);
    const pending = runOciParserIsolationProof(options({
      signal: controller.signal,
      spawnProcess: cancelSpawner.spawnProcess,
    }));
    controller.abort();
    await expect(pending).resolves.toMatchObject({ status: "parser_isolation_cancelled" });
    expect(cancelSpawner.children[0].killed).toBe(true);
  });

  it("keeps positive sandbox proof gated by explicit env in test code only", async () => {
    const proofMode = process.env.FH_ANALYZER_V2_PARSER_SANDBOX_PROOF;
    const runtimeExecutablePath = process.env.FH_ANALYZER_V2_PARSER_SANDBOX_RUNTIME;
    const imageReference = process.env.FH_ANALYZER_V2_PARSER_SANDBOX_IMAGE;
    const hasPositiveVerifierEnv = Boolean(proofMode && runtimeExecutablePath && imageReference);

    if (!hasPositiveVerifierEnv) {
      await expect(runOciParserIsolationProof()).resolves.toMatchObject({
        status: "parser_isolation_unavailable",
      });
      return;
    }

    expect(proofMode).toBe("oci_container");
    const runtimeKind = runtimeKindFromExecutablePath(runtimeExecutablePath ?? "");
    expect(runtimeKind).not.toBeNull();

    const result = await runOciParserIsolationProof({
      proofScope: "deployment_candidate",
      runtimeKind: runtimeKind ?? "podman",
      runtimeExecutablePath: runtimeExecutablePath ?? "",
      runtimeAuthority: "rootless_oci",
      approvedImageReferences: [imageReference ?? ""],
      imageReference: imageReference ?? "",
      nodeRestrictionProfileId: PARSER_ISOLATION_NODE_RESTRICTION_PROFILE_ID,
      timeoutMs: 30_000,
    });

    expect(result.status).toBe("parser_isolation_verified");
    expect(result.proofScope).toBe("deployment_candidate");
    expect(result.runtimeAuthority).toBe("rootless_oci");
    expect(result.deniedAuthorities).not.toBeNull();
    expect(Object.values(result.deniedAuthorities ?? {}).every((value) => value === true)).toBe(true);
  });
});
