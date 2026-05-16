import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SOURCE_ACQUISITION_CONTENT_PARSER_RUNNER_PROTOCOL_VERSION,
  executeSourceAcquisitionContentParserRunnerProtocol,
} from "@/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol";

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function digest(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

const fixtureMaterialById: Record<string, string> = {
  OPAQUE_FIXTURE_PACKET_001: "fixture-control-material-alpha",
  OPAQUE_FIXTURE_PACKET_002: "fixture-control-material-beta",
  OPAQUE_FIXTURE_PACKET_STDERR: "fixture-control-stderr",
  OPAQUE_FIXTURE_PACKET_NONZERO: "fixture-control-nonzero",
  OPAQUE_FIXTURE_PACKET_MALFORMED: "fixture-control-malformed",
  OPAQUE_FIXTURE_PACKET_OVERSIZED_STDOUT: "fixture-control-oversized-stdout",
  OPAQUE_FIXTURE_PACKET_OVERSIZED_STDERR: "fixture-control-oversized-stderr",
  OPAQUE_FIXTURE_PACKET_STALL: "fixture-control-stall",
  OPAQUE_FIXTURE_PACKET_UNICODE: "pruefung-multilingual-control",
};

function request(overrides: Partial<Parameters<typeof executeSourceAcquisitionContentParserRunnerProtocol>[0]> = {}) {
  const fixturePacketId = overrides.fixturePacketId ?? "OPAQUE_FIXTURE_PACKET_001";
  const currentBytes = bytes(fixtureMaterialById[fixturePacketId] ?? "fixture-control-material-alpha");
  return {
    parserAttemptId: "PARSER_ATT_001",
    parserPolicyId: "POLICY_PARSER_FIXTURE_001",
    contentTypePolicyId: "POLICY_CONTENT_TYPE_TEXT_001",
    fixturePacketId,
    byteCount: currentBytes.byteLength,
    byteDigest: digest(currentBytes),
    bytes: currentBytes,
    timeoutMs: 5_000,
    ...overrides,
  };
}

describe("Analyzer V2 source-acquisition content parser runner protocol", () => {
  it("runs the checked-in worker with stripped environment and returns structural metadata only", async () => {
    const sentinel = "FH_SENTINEL_SECRET_2DA_SHOULD_NOT_LEAK";
    const previous = process.env.FH_SENTINEL_SECRET_2DA;
    process.env.FH_SENTINEL_SECRET_2DA = sentinel;
    try {
      const outcome = await executeSourceAcquisitionContentParserRunnerProtocol(request());
      const serialized = JSON.stringify(outcome);

      expect(outcome).toMatchObject({
        status: "success",
        structuralStatus: "parsed_structural",
        runnerVersion: SOURCE_ACQUISITION_CONTENT_PARSER_RUNNER_PROTOCOL_VERSION,
        observedByteCount: bytes("fixture-control-material-alpha").byteLength,
        decodedTextLength: "fixture-control-material-alpha".length,
        rawPayloadIncluded: false,
        extractedTextIncluded: false,
        evidenceItemIncluded: false,
        warningIncluded: false,
        verdictIncluded: false,
        reportProseIncluded: false,
      });
      expect(serialized).not.toContain("fixture-control-material-alpha");
      expect(serialized).not.toContain(sentinel);
      expect(serialized).not.toContain("payloadBase64");
      expect(serialized).not.toContain("https://");
    } finally {
      if (previous === undefined) {
        delete process.env.FH_SENTINEL_SECRET_2DA;
      } else {
        process.env.FH_SENTINEL_SECRET_2DA = previous;
      }
    }
  });

  it("does not resolve the worker from the caller current working directory", async () => {
    const originalCwd = process.cwd();
    const tempRoot = mkdtempSync(path.join(tmpdir(), "fh-v2-parser-runner-cwd-"));
    const fakeWorkerDir = path.join(tempRoot, "src", "lib", "analyzer-v2-runtime");
    mkdirSync(fakeWorkerDir, { recursive: true });
    writeFileSync(
      path.join(fakeWorkerDir, "source-acquisition-content-parser-runner.worker.cjs"),
      "process.stdout.write(JSON.stringify({version:'forged-cwd-worker'}));",
      "utf8",
    );

    try {
      process.chdir(tempRoot);
      const outcome = await executeSourceAcquisitionContentParserRunnerProtocol(request());
      expect(outcome).toMatchObject({
        status: "success",
        structuralStatus: "parsed_structural",
        runnerVersion: SOURCE_ACQUISITION_CONTENT_PARSER_RUNNER_PROTOCOL_VERSION,
      });
      expect(JSON.stringify(outcome)).not.toContain("forged-cwd-worker");
    } finally {
      process.chdir(originalCwd);
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("fails closed for arbitrary bytes, digest mismatches, unapproved ids, and pre-aborted signals", async () => {
    const unapprovedId = await executeSourceAcquisitionContentParserRunnerProtocol(request({
      fixturePacketId: "https://source.example/packet",
    }));
    expect(unapprovedId).toMatchObject({
      status: "blocked",
      structuralStatus: "request_invalid",
      observedByteCount: 0,
      decodedTextLength: 0,
    });

    const arbitraryBytes = bytes("real fetched bytes https://source.example/sk_secret");
    const arbitrary = await executeSourceAcquisitionContentParserRunnerProtocol(request({
      byteCount: arbitraryBytes.byteLength,
      byteDigest: digest(arbitraryBytes),
      bytes: arbitraryBytes,
    }));
    expect(arbitrary).toMatchObject({
      status: "blocked",
      structuralStatus: "request_invalid",
    });
    expect(JSON.stringify(arbitrary)).not.toContain("source.example");

    await expect(executeSourceAcquisitionContentParserRunnerProtocol(request({
      byteDigest: "0".repeat(64),
    }))).resolves.toMatchObject({
      status: "blocked",
      structuralStatus: "request_invalid",
    });

    const controller = new AbortController();
    controller.abort();
    const cancelled = await executeSourceAcquisitionContentParserRunnerProtocol(request({
      signal: controller.signal,
    }));
    expect(cancelled).toMatchObject({
      status: "cancelled",
      structuralStatus: "runner_cancelled",
      blockedReasons: ["signal_aborted"],
    });
  });

  it("maps child-process terminal failures to sanitized structural outcomes", async () => {
    await expect(executeSourceAcquisitionContentParserRunnerProtocol(request({
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_STDERR",
    }))).resolves.toMatchObject({
      status: "blocked",
      structuralStatus: "runner_stderr_output",
      blockedReasons: ["runner_stderr_output"],
    });

    await expect(executeSourceAcquisitionContentParserRunnerProtocol(request({
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_NONZERO",
    }))).resolves.toMatchObject({
      status: "blocked",
      structuralStatus: "runner_failed",
      blockedReasons: ["runner_failed"],
    });

    await expect(executeSourceAcquisitionContentParserRunnerProtocol(request({
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_MALFORMED",
    }))).resolves.toMatchObject({
      status: "blocked",
      structuralStatus: "runner_response_malformed",
      blockedReasons: ["runner_response_malformed"],
    });

    await expect(executeSourceAcquisitionContentParserRunnerProtocol(request({
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_OVERSIZED_STDOUT",
    }))).resolves.toMatchObject({
      status: "blocked",
      structuralStatus: "runner_stdout_oversized",
      blockedReasons: ["runner_stdout_oversized"],
    });

    await expect(executeSourceAcquisitionContentParserRunnerProtocol(request({
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_OVERSIZED_STDERR",
    }))).resolves.toMatchObject({
      status: "blocked",
      structuralStatus: "runner_stderr_oversized",
      blockedReasons: ["runner_stderr_oversized"],
    });
  });

  it("terminates child processes on post-spawn timeout and cancellation", async () => {
    await expect(executeSourceAcquisitionContentParserRunnerProtocol(request({
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_STALL",
      timeoutMs: 25,
    }))).resolves.toMatchObject({
      status: "timed_out",
      structuralStatus: "runner_timed_out",
      blockedReasons: ["runner_timed_out"],
    });

    const controller = new AbortController();
    const cancelled = executeSourceAcquisitionContentParserRunnerProtocol(request({
      fixturePacketId: "OPAQUE_FIXTURE_PACKET_STALL",
      timeoutMs: 5_000,
      signal: controller.signal,
    }));
    setTimeout(() => controller.abort(), 25);
    await expect(cancelled).resolves.toMatchObject({
      status: "cancelled",
      structuralStatus: "runner_cancelled",
      blockedReasons: ["signal_aborted"],
    });
  });

  it("keeps the CommonJS worker free of imports, env access, dynamic execution, and unapproved process members", () => {
    const workerPath = path.join(
      process.cwd(),
      "src",
      "lib",
      "analyzer-v2-runtime",
      "source-acquisition-content-parser-runner.worker.cjs",
    );
    const source = readFileSync(workerPath, "utf8");
    expect(source.length).toBeGreaterThan(0);
    const forbiddenSnippets = [
      "require(",
      "module.require",
      "import(",
      "eval(",
      "Function(",
      "process.env",
      "process.argv",
      "process.cwd",
      "node:fs",
      "node:http",
      "node:https",
      "undici",
      "child_process",
      "worker_threads",
      "node:vm",
      "@/lib/analyzer",
      "source-acquisition-content-transport",
      "sourceReliability",
      "claimboundary.prompt",
    ];

    for (const forbidden of forbiddenSnippets) {
      expect(source).not.toContain(forbidden);
    }
    for (const processMember of source.matchAll(/process\.([a-zA-Z0-9_]+)/g)) {
      expect(["stdin", "stdout", "stderr", "exitCode", "exit"]).toContain(processMember[1]);
    }
  });
});
