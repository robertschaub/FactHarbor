import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SOURCE_ACQUISITION_CONTENT_PARSER_RUNNER_PROTOCOL_VERSION =
  "v2.source-acquisition.content-parser-runner-protocol.7n3b3-2d-a";

const WORKER_FILE = "source-acquisition-content-parser-runner.worker.cjs";
const CHECKED_IN_WORKER_PATH = fileURLToPath(new URL(`./${WORKER_FILE}`, import.meta.url));
const MAX_REQUEST_BYTES = 128 * 1024;
const MAX_STDOUT_BYTES = 16 * 1024;
const MAX_STDERR_BYTES = 4 * 1024;
const STRIPPED_WORKER_ENVIRONMENT = Object.freeze(Object.create(null)) as NodeJS.ProcessEnv;

const fixtureControlPacketBindings = new Map<string, {
  readonly byteCount: number;
  readonly byteDigest: string;
  readonly payloadBase64: string;
}>([
  ["OPAQUE_FIXTURE_PACKET_001", {
    byteCount: 30,
    byteDigest: "75a4f9092aa2cc8d9b3b4c33b5828530accfab2511b6fcede6ae5a7836e10156",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW1hdGVyaWFsLWFscGhh",
  }],
  ["OPAQUE_FIXTURE_PACKET_002", {
    byteCount: 29,
    byteDigest: "4f94fbd010b1a009b15eb44dab20e7f9c93ff0aef8a3e0f8888a7f4cac730fdb",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW1hdGVyaWFsLWJldGE=",
  }],
  ["OPAQUE_FIXTURE_PACKET_003", {
    byteCount: 5,
    byteDigest: "a7937b64b8caa58f03721bb6bacf5c78cb235febe0e70b1b84cd99541461a08e",
    payloadBase64: "Zmlyc3Q=",
  }],
  ["OPAQUE_FIXTURE_PACKET_004", {
    byteCount: 6,
    byteDigest: "16367aacb67a4a017c8da8ab95682ccb390863780f7114dda0a0e0c55644c7c4",
    payloadBase64: "c2Vjb25k",
  }],
  ["OPAQUE_FIXTURE_PACKET_005", {
    byteCount: 38,
    byteDigest: "8e3a957335cefe06dc48422417ac1b3131aa7061e24629ec963eee5500318a7f",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW1hdGVyaWFsLW92ZXItYnl0ZS1jYXA=",
  }],
  ["OPAQUE_FIXTURE_PACKET_STDERR", {
    byteCount: 22,
    byteDigest: "9208dbfb5032afdc2a539d00e6c5d126475f1f6ec0f3de0dd4efdbdc41078b8a",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLXN0ZGVycg==",
  }],
  ["OPAQUE_FIXTURE_PACKET_NONZERO", {
    byteCount: 23,
    byteDigest: "0fa6d8aebfc5afad0ee46bbd38d8a7ada16c8de45a9e2637774e728fa7e64828",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW5vbnplcm8=",
  }],
  ["OPAQUE_FIXTURE_PACKET_MALFORMED", {
    byteCount: 25,
    byteDigest: "c00d1a3ccdd960a5c6c7237b03149dd489fd59bfe2b67c90e36b93a5933b8fda",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW1hbGZvcm1lZA==",
  }],
  ["OPAQUE_FIXTURE_PACKET_OVERSIZED_STDOUT", {
    byteCount: 32,
    byteDigest: "157896d45a0b9f6ce70245ff7f9b055a605338d91ca3832745a7d2a5ff0667d2",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW92ZXJzaXplZC1zdGRvdXQ=",
  }],
  ["OPAQUE_FIXTURE_PACKET_OVERSIZED_STDERR", {
    byteCount: 32,
    byteDigest: "88df3c733281aab913b8966cff94cfe4e64d1649407eb3c15bea09186b939fdb",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW92ZXJzaXplZC1zdGRlcnI=",
  }],
  ["OPAQUE_FIXTURE_PACKET_STALL", {
    byteCount: 21,
    byteDigest: "4cf4addedec5a1212b06077caff9fd584b92fdfd44f7cab89d458928ffe5c6b7",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLXN0YWxs",
  }],
  ["OPAQUE_FIXTURE_PACKET_UNICODE", {
    byteCount: 29,
    byteDigest: "0417e12315709e6c6875ef7ae08e090a92c2488adc8dded1cd74b7bf9c011372",
    payloadBase64: "cHJ1ZWZ1bmctbXVsdGlsaW5ndWFsLWNvbnRyb2w=",
  }],
]);

type SourceAcquisitionContentParserRunnerStructuralStatus =
  | "parsed_structural"
  | "request_invalid"
  | "runner_unavailable"
  | "runner_start_failed"
  | "runner_timed_out"
  | "runner_cancelled"
  | "runner_stdout_oversized"
  | "runner_stderr_output"
  | "runner_stderr_oversized"
  | "runner_response_malformed"
  | "runner_failed";

export type SourceAcquisitionContentParserRunnerRequest = {
  readonly parserAttemptId: string;
  readonly parserPolicyId: string;
  readonly contentTypePolicyId: string;
  readonly fixturePacketId: string;
  readonly byteCount: number;
  readonly byteDigest: string;
  readonly bytes: Uint8Array;
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
};

export type SourceAcquisitionContentParserRunnerResponse = {
  readonly version: typeof SOURCE_ACQUISITION_CONTENT_PARSER_RUNNER_PROTOCOL_VERSION;
  readonly status: "parsed_structural";
  readonly parserAttemptId: string;
  readonly observedByteCount: number;
  readonly decodedTextLength: number;
  readonly rawPayloadIncluded: false;
  readonly extractedTextIncluded: false;
  readonly publicPayloadIncluded: false;
  readonly evidenceItemIncluded: false;
  readonly sourceRecordIncluded: false;
  readonly applicabilityIncluded: false;
  readonly probativeValueIncluded: false;
  readonly warningIncluded: false;
  readonly verdictIncluded: false;
  readonly reportProseIncluded: false;
};

export type SourceAcquisitionContentParserRunnerOutcome = {
  readonly status: "success" | "blocked" | "timed_out" | "cancelled";
  readonly structuralStatus: SourceAcquisitionContentParserRunnerStructuralStatus;
  readonly parserAttemptId: string;
  readonly runnerVersion: typeof SOURCE_ACQUISITION_CONTENT_PARSER_RUNNER_PROTOCOL_VERSION | null;
  readonly observedByteCount: number;
  readonly decodedTextLength: number;
  readonly blockedReasons: readonly string[];
  readonly rawPayloadIncluded: false;
  readonly extractedTextIncluded: false;
  readonly publicPayloadIncluded: false;
  readonly evidenceItemIncluded: false;
  readonly sourceRecordIncluded: false;
  readonly applicabilityIncluded: false;
  readonly probativeValueIncluded: false;
  readonly sourceReliabilityTouched: false;
  readonly warningIncluded: false;
  readonly verdictIncluded: false;
  readonly reportProseIncluded: false;
};

function validOpaqueId(value: unknown, prefix: string): value is string {
  return typeof value === "string"
    && value === value.trim()
    && value.startsWith(prefix)
    && /^[A-Z0-9_]{12,96}$/.test(value)
    && !value.includes("://")
    && !value.includes("?")
    && !value.includes("#");
}

function validPolicyId(value: unknown): value is string {
  return typeof value === "string"
    && value === value.trim()
    && value.startsWith("POLICY_")
    && /^[A-Z0-9_]{8,96}$/.test(value)
    && !value.includes("://")
    && !value.includes("?")
    && !value.includes("#");
}

function validSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function workerPath(): string {
  return CHECKED_IN_WORKER_PATH;
}

function outcome(params: {
  readonly status: SourceAcquisitionContentParserRunnerOutcome["status"];
  readonly structuralStatus: SourceAcquisitionContentParserRunnerStructuralStatus;
  readonly parserAttemptId: string;
  readonly runnerVersion?: typeof SOURCE_ACQUISITION_CONTENT_PARSER_RUNNER_PROTOCOL_VERSION | null;
  readonly observedByteCount?: number;
  readonly decodedTextLength?: number;
  readonly blockedReasons?: readonly string[];
}): SourceAcquisitionContentParserRunnerOutcome {
  return {
    status: params.status,
    structuralStatus: params.structuralStatus,
    parserAttemptId: validOpaqueId(params.parserAttemptId, "PARSER_ATT_")
      ? params.parserAttemptId
      : "PARSER_ATT_REDACTED",
    runnerVersion: params.runnerVersion ?? null,
    observedByteCount: params.observedByteCount ?? 0,
    decodedTextLength: params.decodedTextLength ?? 0,
    blockedReasons: params.blockedReasons ?? [],
    rawPayloadIncluded: false,
    extractedTextIncluded: false,
    publicPayloadIncluded: false,
    evidenceItemIncluded: false,
    sourceRecordIncluded: false,
    applicabilityIncluded: false,
    probativeValueIncluded: false,
    sourceReliabilityTouched: false,
    warningIncluded: false,
    verdictIncluded: false,
    reportProseIncluded: false,
  };
}

function requestIsValid(request: SourceAcquisitionContentParserRunnerRequest): boolean {
  const binding = typeof request.fixturePacketId === "string"
    ? fixtureControlPacketBindings.get(request.fixturePacketId)
    : undefined;
  const payloadBase64 = request.bytes instanceof Uint8Array
    ? Buffer.from(request.bytes).toString("base64")
    : null;
  return validOpaqueId(request.parserAttemptId, "PARSER_ATT_")
    && validPolicyId(request.parserPolicyId)
    && validPolicyId(request.contentTypePolicyId)
    && validOpaqueId(request.fixturePacketId, "OPAQUE_FIXTURE_PACKET_")
    && binding !== undefined
    && request.bytes instanceof Uint8Array
    && Number.isInteger(request.byteCount)
    && request.byteCount > 0
    && request.byteCount === request.bytes.byteLength
    && request.byteCount === binding.byteCount
    && request.byteCount <= 64 * 1024
    && validSha256(request.byteDigest)
    && request.byteDigest === binding.byteDigest
    && payloadBase64 === binding.payloadBase64
    && Number.isInteger(request.timeoutMs)
    && request.timeoutMs > 0
    && request.timeoutMs <= 30_000;
}

function responseIsValid(value: unknown): value is SourceAcquisitionContentParserRunnerResponse {
  if (!isRecord(value)) {
    return false;
  }
  const keys = Object.keys(value).sort();
  const expectedKeys = [
    "applicabilityIncluded",
    "decodedTextLength",
    "evidenceItemIncluded",
    "extractedTextIncluded",
    "observedByteCount",
    "parserAttemptId",
    "probativeValueIncluded",
    "publicPayloadIncluded",
    "rawPayloadIncluded",
    "reportProseIncluded",
    "sourceRecordIncluded",
    "status",
    "verdictIncluded",
    "version",
    "warningIncluded",
  ].sort();
  const observedByteCount = value.observedByteCount;
  const decodedTextLength = value.decodedTextLength;
  return keys.length === expectedKeys.length
    && keys.every((key, index) => key === expectedKeys[index])
    && value.version === SOURCE_ACQUISITION_CONTENT_PARSER_RUNNER_PROTOCOL_VERSION
    && value.status === "parsed_structural"
    && validOpaqueId(value.parserAttemptId, "PARSER_ATT_")
    && typeof observedByteCount === "number"
    && Number.isInteger(observedByteCount)
    && observedByteCount >= 0
    && typeof decodedTextLength === "number"
    && Number.isInteger(decodedTextLength)
    && decodedTextLength >= 0
    && value.rawPayloadIncluded === false
    && value.extractedTextIncluded === false
    && value.publicPayloadIncluded === false
    && value.evidenceItemIncluded === false
    && value.sourceRecordIncluded === false
    && value.applicabilityIncluded === false
    && value.probativeValueIncluded === false
    && value.warningIncluded === false
    && value.verdictIncluded === false
    && value.reportProseIncluded === false;
}

export async function executeSourceAcquisitionContentParserRunnerProtocol(
  request: SourceAcquisitionContentParserRunnerRequest,
): Promise<SourceAcquisitionContentParserRunnerOutcome> {
  if (!requestIsValid(request)) {
    return outcome({
      status: "blocked",
      structuralStatus: "request_invalid",
      parserAttemptId: request.parserAttemptId,
      blockedReasons: ["request_invalid"],
    });
  }

  if (request.signal?.aborted) {
    return outcome({
      status: "cancelled",
      structuralStatus: "runner_cancelled",
      parserAttemptId: request.parserAttemptId,
      blockedReasons: ["signal_aborted"],
    });
  }

  const entrypoint = workerPath();
  if (!existsSync(entrypoint)) {
    return outcome({
      status: "blocked",
      structuralStatus: "runner_unavailable",
      parserAttemptId: request.parserAttemptId,
      blockedReasons: ["worker_unavailable"],
    });
  }

  const workerRequest = JSON.stringify({
    version: SOURCE_ACQUISITION_CONTENT_PARSER_RUNNER_PROTOCOL_VERSION,
    parserAttemptId: request.parserAttemptId,
    parserPolicyId: request.parserPolicyId,
    contentTypePolicyId: request.contentTypePolicyId,
    fixturePacketId: request.fixturePacketId,
    byteCount: request.byteCount,
    byteDigest: request.byteDigest,
    payloadBase64: Buffer.from(request.bytes).toString("base64"),
  });
  if (Buffer.byteLength(workerRequest, "utf8") > MAX_REQUEST_BYTES) {
    return outcome({
      status: "blocked",
      structuralStatus: "request_invalid",
      parserAttemptId: request.parserAttemptId,
      blockedReasons: ["request_too_large"],
    });
  }

  return await new Promise<SourceAcquisitionContentParserRunnerOutcome>((resolve) => {
    let resolved = false;
    let closingOutcome: SourceAcquisitionContentParserRunnerOutcome | null = null;
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timer: ReturnType<typeof setTimeout>;
    const stdoutChunks: Buffer[] = [];
    const child = spawn(process.execPath, [entrypoint], {
      env: STRIPPED_WORKER_ENVIRONMENT,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const resolveFinal = (finalOutcome: SourceAcquisitionContentParserRunnerOutcome): void => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", onAbort);
      resolve(finalOutcome);
    };

    const finish = (finalOutcome: SourceAcquisitionContentParserRunnerOutcome, kill = false): void => {
      if (resolved || closingOutcome) {
        return;
      }
      if (!kill) {
        resolveFinal(finalOutcome);
        return;
      }
      closingOutcome = finalOutcome;
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", onAbort);
      if (kill && !child.killed) {
        child.kill();
      }
    };

    timer = setTimeout(() => {
      finish(outcome({
        status: "timed_out",
        structuralStatus: "runner_timed_out",
        parserAttemptId: request.parserAttemptId,
        blockedReasons: ["runner_timed_out"],
      }), true);
    }, request.timeoutMs);

    const onAbort = (): void => {
      finish(outcome({
        status: "cancelled",
        structuralStatus: "runner_cancelled",
        parserAttemptId: request.parserAttemptId,
        blockedReasons: ["signal_aborted"],
      }), true);
    };
    request.signal?.addEventListener("abort", onAbort, { once: true });

    child.on("error", () => {
      finish(outcome({
        status: "blocked",
        structuralStatus: "runner_start_failed",
        parserAttemptId: request.parserAttemptId,
        blockedReasons: ["runner_start_failed"],
      }));
    });

    child.stdin.on("error", () => {
      finish(outcome({
        status: "blocked",
        structuralStatus: "runner_failed",
        parserAttemptId: request.parserAttemptId,
        blockedReasons: ["runner_failed"],
      }), true);
    });

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > MAX_STDOUT_BYTES) {
        finish(outcome({
          status: "blocked",
          structuralStatus: "runner_stdout_oversized",
          parserAttemptId: request.parserAttemptId,
          blockedReasons: ["runner_stdout_oversized"],
        }), true);
        return;
      }
      stdoutChunks.push(Buffer.from(chunk));
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes > MAX_STDERR_BYTES) {
        finish(outcome({
          status: "blocked",
          structuralStatus: "runner_stderr_oversized",
          parserAttemptId: request.parserAttemptId,
          blockedReasons: ["runner_stderr_oversized"],
        }), true);
      }
    });

    child.on("close", (code) => {
      if (closingOutcome) {
        resolveFinal(closingOutcome);
        return;
      }
      if (resolved) {
        return;
      }
      if (code !== 0) {
        finish(outcome({
          status: "blocked",
          structuralStatus: "runner_failed",
          parserAttemptId: request.parserAttemptId,
          blockedReasons: ["runner_failed"],
        }));
        return;
      }
      if (stderrBytes > 0) {
        finish(outcome({
          status: "blocked",
          structuralStatus: "runner_stderr_output",
          parserAttemptId: request.parserAttemptId,
          blockedReasons: ["runner_stderr_output"],
        }));
        return;
      }
      try {
        const parsed = JSON.parse(Buffer.concat(stdoutChunks).toString("utf8")) as unknown;
        if (!responseIsValid(parsed) || parsed.parserAttemptId !== request.parserAttemptId) {
          finish(outcome({
            status: "blocked",
            structuralStatus: "runner_response_malformed",
            parserAttemptId: request.parserAttemptId,
            blockedReasons: ["runner_response_malformed"],
          }));
          return;
        }
        finish(outcome({
          status: "success",
          structuralStatus: "parsed_structural",
          parserAttemptId: request.parserAttemptId,
          runnerVersion: SOURCE_ACQUISITION_CONTENT_PARSER_RUNNER_PROTOCOL_VERSION,
          observedByteCount: parsed.observedByteCount,
          decodedTextLength: parsed.decodedTextLength,
        }));
      } catch {
        finish(outcome({
          status: "blocked",
          structuralStatus: "runner_response_malformed",
          parserAttemptId: request.parserAttemptId,
          blockedReasons: ["runner_response_malformed"],
        }));
      }
    });

    try {
      child.stdin.end(workerRequest, "utf8");
    } catch {
      finish(outcome({
        status: "blocked",
        structuralStatus: "runner_failed",
        parserAttemptId: request.parserAttemptId,
        blockedReasons: ["runner_failed"],
      }), true);
    }
  });
}
