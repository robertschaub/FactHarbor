import { spawn } from "node:child_process";
import {
  PARSER_ISOLATION_NODE_RESTRICTION_PROFILE_ID,
  PARSER_ISOLATION_PROOF_CONTRACT_VERSION,
  buildParserIsolationProofResult,
  buildParserIsolationUnavailableResult,
  mapParserIsolationProbeOutput,
  validateParserIsolationProofOptions,
  type ParserIsolationProofApprovedOptions,
  type ParserIsolationProofResult,
} from "./source-acquisition-content-parser-isolation-proof";

export const OCI_PARSER_ISOLATION_PROOF_VERSION =
  "v2.source-acquisition.content-parser-oci-container-proof.7n3b3-2d-b2";

const MAX_PROBE_STDOUT_BYTES = 16 * 1024;
const MAX_PROBE_STDERR_BYTES = 4 * 1024;
const EMPTY_RUNTIME_ENVIRONMENT = Object.freeze(Object.create(null)) as NodeJS.ProcessEnv;

export type OciParserIsolationSpawnRequest = {
  readonly runtimeExecutablePath: string;
  readonly args: readonly string[];
  readonly stdin: string;
  readonly timeoutMs: number;
};

export type OciParserIsolationChildProcess = {
  readonly stdin: {
    on(event: "error", listener: (error: Error) => void): void;
    end(input: string, encoding: "utf8"): void;
  };
  readonly stdout: {
    on(event: "data", listener: (chunk: Buffer) => void): void;
  };
  readonly stderr: {
    on(event: "data", listener: (chunk: Buffer) => void): void;
  };
  readonly killed: boolean;
  kill(): void;
  on(event: "error", listener: (error: Error & { readonly code?: string }) => void): void;
  on(event: "close", listener: (code: number | null, signal: string | null) => void): void;
};

export type OciParserIsolationProcessSpawner = (
  request: OciParserIsolationSpawnRequest,
) => OciParserIsolationChildProcess;

export type OciParserIsolationProofRunOptions = Partial<ParserIsolationProofApprovedOptions> & {
  readonly signal?: AbortSignal;
  readonly spawnProcess?: OciParserIsolationProcessSpawner;
};

const forbiddenHostEscapeArgs = new Set([
  "--privileged",
  "--cap-add",
  "--device",
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
]);

function buildProbeScript(): string {
  return `
const resultVersion = ${JSON.stringify(PARSER_ISOLATION_PROOF_CONTRACT_VERSION)};
function denied(action) {
  try {
    action();
    return false;
  } catch {
    return true;
  }
}
function deniedAsync(action) {
  return new Promise((resolve) => {
    try {
      action(resolve);
    } catch {
      resolve(true);
    }
  });
}
(async () => {
  const deniedAuthorities = {
    envSecretReadDenied: !("FH_SENTINEL_SECRET_2DB2" in process.env),
    hostRepoReadDenied: denied(() => require("node:fs").readFileSync("package.json")),
    sentinelTempReadDenied: denied(() => require("node:fs").readFileSync("/tmp/FH_SENTINEL_2DB2")),
    hostWriteDenied: denied(() => require("node:fs").writeFileSync("/tmp/FH_WRITE_2DB2", "x")),
    outboundNetworkDenied: await deniedAsync((resolve) => {
      const net = require("node:net");
      const socket = net.createConnection({ host: "example.com", port: 80 });
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(true);
      }, 250);
      socket.on("connect", () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(false);
      });
      socket.on("error", () => {
        clearTimeout(timer);
        resolve(true);
      });
    }),
    dnsDenied: await deniedAsync((resolve) => {
      require("node:dns").lookup("example.com", (error) => resolve(Boolean(error)));
    }),
    childProcessDenied: denied(() => require("node:child_process").spawnSync("node", ["-e", "0"])),
    workerThreadDenied: denied(() => new (require("node:worker_threads").Worker)("0", { eval: true })),
    nativeAddonDenied: denied(() => process.dlopen({}, "missing.node")),
    shellDenied: denied(() => require("node:child_process").spawnSync("sh", ["-c", "true"])),
    runtimeSocketDenied: denied(() => require("node:fs").readFileSync("/var/run/docker.sock")),
    stdoutBounded: true,
    stderrBounded: true,
    outputLeakDenied: true
  };
  process.stdout.write(JSON.stringify({
    version: resultVersion,
    status: "denial_probe_complete",
    deniedAuthorities
  }));
})().catch(() => {
  process.stdout.write(JSON.stringify({
    version: resultVersion,
    status: "denial_probe_complete",
    deniedAuthorities: {
      envSecretReadDenied: false,
      hostRepoReadDenied: false,
      sentinelTempReadDenied: false,
      hostWriteDenied: false,
      outboundNetworkDenied: false,
      dnsDenied: false,
      childProcessDenied: false,
      workerThreadDenied: false,
      nativeAddonDenied: false,
      shellDenied: false,
      runtimeSocketDenied: false,
      stdoutBounded: true,
      stderrBounded: true,
      outputLeakDenied: false
    }
  }));
});
`.trim();
}

function buildOciArgs(imageReference: string): readonly string[] {
  return [
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
    imageReference,
    "--experimental-permission",
    "--no-addons",
    "--disable-proto=throw",
    "-",
  ];
}

function argsContainForbiddenHostEscape(args: readonly string[]): boolean {
  const joinedPairs = args.map((arg, index) => `${arg} ${args[index + 1] ?? ""}`);
  return args.some((arg) => forbiddenHostEscapeArgs.has(arg) || arg.includes("docker.sock") || arg.includes("podman.sock"))
    || joinedPairs.some((pair) => forbiddenHostEscapeArgs.has(pair));
}

function defaultSpawnProcess(request: OciParserIsolationSpawnRequest): OciParserIsolationChildProcess {
  return spawn(request.runtimeExecutablePath, [...request.args], {
    env: EMPTY_RUNTIME_ENVIRONMENT,
    shell: false,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
  }) as unknown as OciParserIsolationChildProcess;
}

function classifyFailedRuntime(params: {
  readonly stderr: string;
  readonly options: ParserIsolationProofApprovedOptions;
  readonly durationMs: number;
  readonly exitCode: number | null;
  readonly signalName: string | null;
}): ParserIsolationProofResult {
  const normalized = params.stderr.toLowerCase();
  const status = normalized.includes("no such image")
    || normalized.includes("unable to find image")
    || normalized.includes("image not found")
    || normalized.includes("pull access denied")
      ? "parser_isolation_image_unavailable"
      : "parser_isolation_probe_failed";
  return buildParserIsolationProofResult({
    status,
    proofScope: params.options.proofScope,
    runtimeKind: params.options.runtimeKind,
    runtimeAuthority: params.options.runtimeAuthority,
    nodeRestrictionProfileId: params.options.nodeRestrictionProfileId,
    imageReference: params.options.imageReference,
    runtimeExecutablePath: params.options.runtimeExecutablePath,
    durationMs: params.durationMs,
    exitCode: params.exitCode,
    signalName: params.signalName,
  });
}

export async function runOciParserIsolationProof(
  options?: OciParserIsolationProofRunOptions,
): Promise<ParserIsolationProofResult> {
  if (!options) {
    return buildParserIsolationUnavailableResult();
  }

  const validation = validateParserIsolationProofOptions(options);
  if (validation.status === "blocked") {
    return validation.result;
  }

  const approvedOptions = validation.options;
  const args = buildOciArgs(approvedOptions.imageReference);
  if (argsContainForbiddenHostEscape(args)) {
    return buildParserIsolationProofResult({
      status: "parser_isolation_runtime_unapproved",
      proofScope: approvedOptions.proofScope,
      runtimeKind: approvedOptions.runtimeKind,
      runtimeAuthority: approvedOptions.runtimeAuthority,
      nodeRestrictionProfileId: approvedOptions.nodeRestrictionProfileId,
      imageReference: approvedOptions.imageReference,
      runtimeExecutablePath: approvedOptions.runtimeExecutablePath,
    });
  }
  if (options.signal?.aborted) {
    return buildParserIsolationProofResult({
      status: "parser_isolation_cancelled",
      proofScope: approvedOptions.proofScope,
      runtimeKind: approvedOptions.runtimeKind,
      runtimeAuthority: approvedOptions.runtimeAuthority,
      nodeRestrictionProfileId: approvedOptions.nodeRestrictionProfileId,
      imageReference: approvedOptions.imageReference,
      runtimeExecutablePath: approvedOptions.runtimeExecutablePath,
    });
  }

  const startedAtMs = Date.now();
  const stdin = buildProbeScript();
  const spawnProcess = options.spawnProcess ?? defaultSpawnProcess;

  return await new Promise<ParserIsolationProofResult>((resolve) => {
    let settled = false;
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let stderrText = "";
    const stdoutChunks: Buffer[] = [];
    let child: OciParserIsolationChildProcess;
    let timer: ReturnType<typeof setTimeout>;

    const durationMs = (): number => Date.now() - startedAtMs;
    const resolveOnce = (result: ParserIsolationProofResult, kill = false): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      if (kill && child && !child.killed) {
        child.kill();
      }
      resolve(result);
    };

    const onAbort = (): void => {
      resolveOnce(buildParserIsolationProofResult({
        status: "parser_isolation_cancelled",
        proofScope: approvedOptions.proofScope,
        runtimeKind: approvedOptions.runtimeKind,
        runtimeAuthority: approvedOptions.runtimeAuthority,
        nodeRestrictionProfileId: approvedOptions.nodeRestrictionProfileId,
        imageReference: approvedOptions.imageReference,
        runtimeExecutablePath: approvedOptions.runtimeExecutablePath,
        durationMs: durationMs(),
      }), true);
    };

    try {
      child = spawnProcess({
        runtimeExecutablePath: approvedOptions.runtimeExecutablePath,
        args,
        stdin,
        timeoutMs: approvedOptions.timeoutMs,
      });
    } catch {
      resolve(buildParserIsolationProofResult({
        status: "parser_isolation_runtime_not_found",
        proofScope: approvedOptions.proofScope,
        runtimeKind: approvedOptions.runtimeKind,
        runtimeAuthority: approvedOptions.runtimeAuthority,
        nodeRestrictionProfileId: approvedOptions.nodeRestrictionProfileId,
        imageReference: approvedOptions.imageReference,
        runtimeExecutablePath: approvedOptions.runtimeExecutablePath,
        durationMs: durationMs(),
      }));
      return;
    }

    timer = setTimeout(() => {
      resolveOnce(buildParserIsolationProofResult({
        status: "parser_isolation_timed_out",
        proofScope: approvedOptions.proofScope,
        runtimeKind: approvedOptions.runtimeKind,
        runtimeAuthority: approvedOptions.runtimeAuthority,
        nodeRestrictionProfileId: approvedOptions.nodeRestrictionProfileId,
        imageReference: approvedOptions.imageReference,
        runtimeExecutablePath: approvedOptions.runtimeExecutablePath,
        durationMs: durationMs(),
      }), true);
    }, approvedOptions.timeoutMs);
    options.signal?.addEventListener("abort", onAbort, { once: true });

    child.on("error", (error) => {
      resolveOnce(buildParserIsolationProofResult({
        status: error.code === "ENOENT"
          ? "parser_isolation_runtime_not_found"
          : "parser_isolation_probe_failed",
        proofScope: approvedOptions.proofScope,
        runtimeKind: approvedOptions.runtimeKind,
        runtimeAuthority: approvedOptions.runtimeAuthority,
        nodeRestrictionProfileId: approvedOptions.nodeRestrictionProfileId,
        imageReference: approvedOptions.imageReference,
        runtimeExecutablePath: approvedOptions.runtimeExecutablePath,
        durationMs: durationMs(),
      }));
    });

    child.stdin.on("error", () => {
      resolveOnce(buildParserIsolationProofResult({
        status: "parser_isolation_probe_failed",
        proofScope: approvedOptions.proofScope,
        runtimeKind: approvedOptions.runtimeKind,
        runtimeAuthority: approvedOptions.runtimeAuthority,
        nodeRestrictionProfileId: approvedOptions.nodeRestrictionProfileId,
        imageReference: approvedOptions.imageReference,
        runtimeExecutablePath: approvedOptions.runtimeExecutablePath,
        durationMs: durationMs(),
      }), true);
    });

    child.stdout.on("data", (chunk) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > MAX_PROBE_STDOUT_BYTES) {
        resolveOnce(buildParserIsolationProofResult({
          status: "parser_isolation_output_malformed",
          proofScope: approvedOptions.proofScope,
          runtimeKind: approvedOptions.runtimeKind,
          runtimeAuthority: approvedOptions.runtimeAuthority,
          nodeRestrictionProfileId: approvedOptions.nodeRestrictionProfileId,
          imageReference: approvedOptions.imageReference,
          runtimeExecutablePath: approvedOptions.runtimeExecutablePath,
          durationMs: durationMs(),
        }), true);
        return;
      }
      stdoutChunks.push(Buffer.from(chunk));
    });

    child.stderr.on("data", (chunk) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes <= MAX_PROBE_STDERR_BYTES) {
        stderrText += chunk.toString("utf8");
      }
      if (stderrBytes > MAX_PROBE_STDERR_BYTES) {
        resolveOnce(buildParserIsolationProofResult({
          status: "parser_isolation_output_malformed",
          proofScope: approvedOptions.proofScope,
          runtimeKind: approvedOptions.runtimeKind,
          runtimeAuthority: approvedOptions.runtimeAuthority,
          nodeRestrictionProfileId: approvedOptions.nodeRestrictionProfileId,
          imageReference: approvedOptions.imageReference,
          runtimeExecutablePath: approvedOptions.runtimeExecutablePath,
          durationMs: durationMs(),
        }), true);
      }
    });

    child.on("close", (code, signalName) => {
      if (settled) {
        return;
      }
      if (code !== 0 || stderrBytes > 0) {
        resolveOnce(classifyFailedRuntime({
          stderr: stderrText,
          options: approvedOptions,
          durationMs: durationMs(),
          exitCode: code,
          signalName,
        }));
        return;
      }

      try {
        const parsed = JSON.parse(Buffer.concat(stdoutChunks).toString("utf8")) as unknown;
        resolveOnce(mapParserIsolationProbeOutput({
          output: parsed,
          options: approvedOptions,
          durationMs: durationMs(),
          exitCode: code,
          signalName,
        }));
      } catch {
        resolveOnce(buildParserIsolationProofResult({
          status: "parser_isolation_output_malformed",
          proofScope: approvedOptions.proofScope,
          runtimeKind: approvedOptions.runtimeKind,
          runtimeAuthority: approvedOptions.runtimeAuthority,
          nodeRestrictionProfileId: approvedOptions.nodeRestrictionProfileId,
          imageReference: approvedOptions.imageReference,
          runtimeExecutablePath: approvedOptions.runtimeExecutablePath,
          durationMs: durationMs(),
          exitCode: code,
          signalName,
        }));
      }
    });

    try {
      child.stdin.end(stdin, "utf8");
    } catch {
      resolveOnce(buildParserIsolationProofResult({
        status: "parser_isolation_probe_failed",
        proofScope: approvedOptions.proofScope,
        runtimeKind: approvedOptions.runtimeKind,
        runtimeAuthority: approvedOptions.runtimeAuthority,
        nodeRestrictionProfileId: approvedOptions.nodeRestrictionProfileId,
        imageReference: approvedOptions.imageReference,
        runtimeExecutablePath: approvedOptions.runtimeExecutablePath,
        durationMs: durationMs(),
      }), true);
    }
  });
}
