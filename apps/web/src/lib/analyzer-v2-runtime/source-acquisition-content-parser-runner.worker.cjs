const VERSION = "v2.source-acquisition.content-parser-runner-protocol.7n3b3-2d-a";
const MAX_INPUT_BYTES = 128 * 1024;
const FIXTURE_CONTROL_PACKETS = {
  OPAQUE_FIXTURE_PACKET_001: {
    byteCount: 30,
    byteDigest: "75a4f9092aa2cc8d9b3b4c33b5828530accfab2511b6fcede6ae5a7836e10156",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW1hdGVyaWFsLWFscGhh",
    mode: "parsed",
  },
  OPAQUE_FIXTURE_PACKET_002: {
    byteCount: 29,
    byteDigest: "4f94fbd010b1a009b15eb44dab20e7f9c93ff0aef8a3e0f8888a7f4cac730fdb",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW1hdGVyaWFsLWJldGE=",
    mode: "parsed",
  },
  OPAQUE_FIXTURE_PACKET_003: {
    byteCount: 5,
    byteDigest: "a7937b64b8caa58f03721bb6bacf5c78cb235febe0e70b1b84cd99541461a08e",
    payloadBase64: "Zmlyc3Q=",
    mode: "parsed",
  },
  OPAQUE_FIXTURE_PACKET_004: {
    byteCount: 6,
    byteDigest: "16367aacb67a4a017c8da8ab95682ccb390863780f7114dda0a0e0c55644c7c4",
    payloadBase64: "c2Vjb25k",
    mode: "parsed",
  },
  OPAQUE_FIXTURE_PACKET_005: {
    byteCount: 38,
    byteDigest: "8e3a957335cefe06dc48422417ac1b3131aa7061e24629ec963eee5500318a7f",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW1hdGVyaWFsLW92ZXItYnl0ZS1jYXA=",
    mode: "parsed",
  },
  OPAQUE_FIXTURE_PACKET_STDERR: {
    byteCount: 22,
    byteDigest: "9208dbfb5032afdc2a539d00e6c5d126475f1f6ec0f3de0dd4efdbdc41078b8a",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLXN0ZGVycg==",
    mode: "stderr",
  },
  OPAQUE_FIXTURE_PACKET_NONZERO: {
    byteCount: 23,
    byteDigest: "0fa6d8aebfc5afad0ee46bbd38d8a7ada16c8de45a9e2637774e728fa7e64828",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW5vbnplcm8=",
    mode: "nonzero",
  },
  OPAQUE_FIXTURE_PACKET_MALFORMED: {
    byteCount: 25,
    byteDigest: "c00d1a3ccdd960a5c6c7237b03149dd489fd59bfe2b67c90e36b93a5933b8fda",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW1hbGZvcm1lZA==",
    mode: "malformed",
  },
  OPAQUE_FIXTURE_PACKET_OVERSIZED_STDOUT: {
    byteCount: 32,
    byteDigest: "157896d45a0b9f6ce70245ff7f9b055a605338d91ca3832745a7d2a5ff0667d2",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW92ZXJzaXplZC1zdGRvdXQ=",
    mode: "oversized_stdout",
  },
  OPAQUE_FIXTURE_PACKET_OVERSIZED_STDERR: {
    byteCount: 32,
    byteDigest: "88df3c733281aab913b8966cff94cfe4e64d1649407eb3c15bea09186b939fdb",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLW92ZXJzaXplZC1zdGRlcnI=",
    mode: "oversized_stderr",
  },
  OPAQUE_FIXTURE_PACKET_STALL: {
    byteCount: 21,
    byteDigest: "4cf4addedec5a1212b06077caff9fd584b92fdfd44f7cab89d458928ffe5c6b7",
    payloadBase64: "Zml4dHVyZS1jb250cm9sLXN0YWxs",
    mode: "stall",
  },
  OPAQUE_FIXTURE_PACKET_UNICODE: {
    byteCount: 29,
    byteDigest: "0417e12315709e6c6875ef7ae08e090a92c2488adc8dded1cd74b7bf9c011372",
    payloadBase64: "cHJ1ZWZ1bmctbXVsdGlsaW5ndWFsLWNvbnRyb2w=",
    mode: "parsed",
  },
};

let input = "";
let oversized = false;

function validOpaqueId(value, prefix) {
  return typeof value === "string"
    && value === value.trim()
    && value.startsWith(prefix)
    && /^[A-Z0-9_]{12,96}$/.test(value)
    && !value.includes("://")
    && !value.includes("?")
    && !value.includes("#");
}

function validPolicyId(value) {
  return typeof value === "string"
    && value === value.trim()
    && value.startsWith("POLICY_")
    && /^[A-Z0-9_]{8,96}$/.test(value)
    && !value.includes("://")
    && !value.includes("?")
    && !value.includes("#");
}

function validSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function write(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function blocked(parserAttemptId) {
  write({
    version: VERSION,
    status: "parsed_structural",
    parserAttemptId: validOpaqueId(parserAttemptId, "PARSER_ATT_") ? parserAttemptId : "PARSER_ATT_REDACTED",
    observedByteCount: 0,
    decodedTextLength: 0,
    rawPayloadIncluded: false,
    extractedTextIncluded: false,
    publicPayloadIncluded: false,
    evidenceItemIncluded: false,
    sourceRecordIncluded: false,
    applicabilityIncluded: false,
    probativeValueIncluded: false,
    warningIncluded: false,
    verdictIncluded: false,
    reportProseIncluded: false,
  });
}

function parsed(parserAttemptId, bytes) {
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  write({
    version: VERSION,
    status: "parsed_structural",
    parserAttemptId,
    observedByteCount: bytes.byteLength,
    decodedTextLength: decoded.length,
    rawPayloadIncluded: false,
    extractedTextIncluded: false,
    publicPayloadIncluded: false,
    evidenceItemIncluded: false,
    sourceRecordIncluded: false,
    applicabilityIncluded: false,
    probativeValueIncluded: false,
    warningIncluded: false,
    verdictIncluded: false,
    reportProseIncluded: false,
  });
}

function parseRequest(value) {
  if (
    !isRecord(value)
    || value.version !== VERSION
    || !validOpaqueId(value.parserAttemptId, "PARSER_ATT_")
    || !validPolicyId(value.parserPolicyId)
    || !validPolicyId(value.contentTypePolicyId)
    || !validOpaqueId(value.fixturePacketId, "OPAQUE_FIXTURE_PACKET_")
    || !Number.isInteger(value.byteCount)
    || value.byteCount <= 0
    || value.byteCount > 64 * 1024
    || !validSha256(value.byteDigest)
    || typeof value.payloadBase64 !== "string"
    || value.payloadBase64.length > MAX_INPUT_BYTES
  ) {
    return null;
  }
  const binding = FIXTURE_CONTROL_PACKETS[value.fixturePacketId];
  if (
    !binding
    || value.byteCount !== binding.byteCount
    || value.byteDigest !== binding.byteDigest
    || value.payloadBase64 !== binding.payloadBase64
  ) {
    return null;
  }
  const bytes = Buffer.from(value.payloadBase64, "base64");
  if (bytes.byteLength !== binding.byteCount) {
    return null;
  }
  return {
    parserAttemptId: value.parserAttemptId,
    mode: binding.mode,
    bytes,
  };
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
  if (Buffer.byteLength(input, "utf8") > MAX_INPUT_BYTES) {
    oversized = true;
    process.stdin.destroy();
  }
});

process.stdin.on("end", () => {
  try {
    if (oversized) {
      blocked("PARSER_ATT_REDACTED");
      return;
    }
    const request = parseRequest(JSON.parse(input));
    if (!request) {
      blocked("PARSER_ATT_REDACTED");
      return;
    }
    if (request.mode === "stderr") {
      process.stderr.write("runner_stderr_output\n");
      parsed(request.parserAttemptId, request.bytes);
      return;
    }
    if (request.mode === "nonzero") {
      process.exitCode = 23;
      return;
    }
    if (request.mode === "malformed") {
      process.stdout.write("{malformed");
      return;
    }
    if (request.mode === "oversized_stdout") {
      process.stdout.write("x".repeat(17 * 1024));
      return;
    }
    if (request.mode === "oversized_stderr") {
      process.stderr.write("x".repeat(5 * 1024));
      return;
    }
    if (request.mode === "stall") {
      setTimeout(() => parsed(request.parserAttemptId, request.bytes), 60 * 1000);
      return;
    }
    parsed(request.parserAttemptId, request.bytes);
  } catch {
    blocked("PARSER_ATT_REDACTED");
  }
});

process.stdin.on("error", () => {
  blocked("PARSER_ATT_REDACTED");
});
