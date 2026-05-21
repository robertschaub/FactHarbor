import { afterEach, describe, expect, it } from "vitest";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  clearEvidenceLifecycleExtractionInputRuntimeArtifacts,
  recordEvidenceLifecycleExtractionInputRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-artifact-sink";
import type {
  EvidenceLifecycleExtractionInputAuthorizationDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner";

const originalEnv = { ...process.env };
const TEXT = "Route-visible extraction input text must not appear in the default route projection.";

function context(runId = "job-v2-x7w4h-route") {
  return buildClaimBoundaryV2RunContext({
    runIdHint: runId,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-19T13:20:00.000Z"),
  });
}

function authorization(): EvidenceLifecycleExtractionInputAuthorizationDecision {
  const textByteLength = Buffer.byteLength(TEXT, "utf8");
  return {
    decisionVersion: "v2.evidence-lifecycle.extraction-input-authorization.x7w4h",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "bounded_extraction_input_packet_created_extraction_execution_closed",
    stopReason: "not_stopped",
    parent: {
      boundedTextDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-bounded-text-authorization.x7w4g",
      boundedTextStatus: "bounded_corpus_text_sidecar_created_extraction_gate_closed",
      boundedTextStopReason: "not_stopped",
      boundedTextRuntimeOwnership: "owned",
      boundedTextSidecarVersion: "v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g",
      boundedTextSidecarKind: "bounded_text_sidecar",
      boundedTextSidecarId: "EVIDENCE_CORPUS_BOUNDED_TEXT_0123456789ABCDEF",
      linkedEvidenceCorpusId: "EVIDENCE_CORPUS_SHELL_0123456789ABCDEF",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      providerId: "wikimedia_core",
      sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      languageCode: "en",
      textHash: "0".repeat(64),
      textByteLength,
      maxTextBytes: 4096,
    },
    boundedTextSidecarCount: 1,
    extractionInputPacketCount: 1,
    extractionInputPacket: {
      packetVersion: "v2.evidence-lifecycle.extraction-input.bounded-text-packet.x7w4h",
      packetId: "BOUNDED_EXTRACTION_INPUT_0123456789ABCDEF",
      kind: "bounded_text_extraction_input_packet",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      source: "w4g_bounded_text_sidecar",
      parentDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-bounded-text-authorization.x7w4g",
      parentStatus: "bounded_corpus_text_sidecar_created_extraction_gate_closed",
      parentSidecarVersion: "v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g",
      parentSidecarId: "EVIDENCE_CORPUS_BOUNDED_TEXT_0123456789ABCDEF",
      linkedEvidenceCorpusId: "EVIDENCE_CORPUS_SHELL_0123456789ABCDEF",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
      sourceMaterialRefs: ["SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF"],
      locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
      locatorRefs: ["OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456"],
      candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      candidatePreviewIds: ["SOURCE_CANDIDATE_PREVIEW_1_1"],
      providerId: "wikimedia_core",
      providerIds: ["wikimedia_core"],
      sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
      sourceMaterialEndpointIds: ["ep_wikimedia_project_page_summary"],
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      sourceMaterialKinds: ["wikimedia_page_summary_extract_text"],
      languageCode: "en",
      languageCodes: ["en"],
      inputText: TEXT,
      inputTextHash: "0".repeat(64),
      inputTextByteLength: textByteLength,
      inputTextCharLength: Array.from(TEXT).length,
      maxInputTextBytes: 12288,
      truncationApplied: false,
      sourceMaterialTextHash: "0".repeat(64),
      sourceMaterialTextHashes: ["0".repeat(64)],
      sourceMaterialTextByteLength: textByteLength,
      sourceMaterialTextByteLengths: [textByteLength],
      sourceMaterialTextCharLength: Array.from(TEXT).length,
      sourceContentPackets: [{
        sourceRecordId: "SOURCE_MATERIAL_PAGE_SUMMARY_0123456789ABCDEF",
        contentPacketId: "BOUNDED_EXTRACTION_CONTENT_0000000000000000",
        providerId: "wikimedia_core",
        sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
        sourceMaterialKind: "wikimedia_page_summary_extract_text",
        languageCode: "en",
        contentText: TEXT,
        contentTextHash: "0".repeat(64),
        contentTextByteLength: textByteLength,
        contentTextCharLength: Array.from(TEXT).length,
        maxContentTextBytes: 4096,
        provenance: {
          locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
          candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
        },
      }],
      extractionExecutionAuthorized: false,
      llmExtractionCallAuthorized: false,
      parserExecuted: false,
      semanticExtractionAuthorized: false,
      evidenceItemExtractionAuthorized: false,
      evidenceItems: [],
      publicCutoverStatus: "blocked_precutover",
    },
    evidenceCorpus: null,
    evidenceItems: [],
    extractionExecutionAuthorized: false,
    llmExtractionCallAuthorized: false,
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    downstreamGate: "evidence_item_extraction_execution_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      boundedTextSidecarObserved: true,
      boundedExtractionInputPacketCreated: true,
      providerLineagePreserved: true,
      extractionExecutionAuthorized: false,
      llmExtractionCallAuthorized: false,
      evidenceItemGenerated: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
  };
}

function seedArtifact(runId = "job-v2-x7w4h-route") {
  const runContext = context(runId);
  clearEvidenceLifecycleExtractionInputRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
  recordEvidenceLifecycleExtractionInputRuntimeArtifact({
    context: runContext,
    extractionInputAuthorization: authorization(),
  });
  return runContext.observabilityLedger.ledgerId;
}

function artifactUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-extraction-input-artifacts${query}`;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal extraction-input artifact route", () => {
  it("returns hash/length/provenance-only default artifacts for an authenticated ledger read", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-extraction-input-artifacts/route"
    );

    const response = await GET(new Request(
      artifactUrl(`?ledgerId=${encodeURIComponent(ledgerId)}`),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      sinkKind: "v2_evidence_lifecycle_extraction_input_artifact_ledger",
      defaultProjection: "hash_length_provenance_only",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      ledgerId,
      artifactCount: 1,
    });
    const packet = body.artifacts[0].extractionInputAuthorization.extractionInputPacket;
    expect(packet).toMatchObject({
      providerId: "wikimedia_core",
      inputTextHash: "0".repeat(64),
      inputTextByteLength: Buffer.byteLength(TEXT, "utf8"),
      sourceMaterialTextHash: "0".repeat(64),
      textAccess: "redacted_default_hash_length_provenance_only",
      inputTextReturned: false,
      extractionExecutionAuthorized: false,
      evidenceItemExtractionAuthorized: false,
    });
    expect(Object.prototype.hasOwnProperty.call(packet, "inputText")).toBe(false);
    expect(serialized).not.toContain(TEXT);
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("truthPercentage");
  });

  it("requires admin authentication and rejects malformed ledger queries", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-extraction-input-artifacts/route"
    );

    for (const request of [
      new Request(artifactUrl("?ledgerId=ledger")),
      new Request(artifactUrl("?ledgerId=ledger"), { headers: { "x-admin-key": "wrong-key" } }),
    ]) {
      const response = await GET(request);
      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
    }

    const headers = { "x-admin-key": "test-admin-key" };
    for (const url of [
      artifactUrl(""),
      artifactUrl("?ledgerId=%20"),
      artifactUrl("?ledgerId=bad/ledger"),
      artifactUrl(`?ledgerId=${"x".repeat(257)}`),
      artifactUrl("?ledgerId=a&ledgerId=b"),
      artifactUrl("?ledgerId=ledger&includeText=true"),
    ]) {
      const response = await GET(new Request(url, { headers }));
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({ ok: false, error: "Missing or invalid ledgerId" });
    }
  });

  it("returns bounded not-found without echoing the requested ledger id", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-extraction-input-artifacts/route"
    );

    const response = await GET(new Request(
      artifactUrl("?ledgerId=missing-x7w4h-ledger"),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain("missing-x7w4h-ledger");
    expect(body).toEqual({
      ok: false,
      error: "Not found",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    });
  });
});
