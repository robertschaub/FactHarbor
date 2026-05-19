import { afterEach, describe, expect, it } from "vitest";

import type { BoundedEvidenceExtractionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  clearBoundedEvidenceExtractionRuntimeArtifacts,
  recordBoundedEvidenceExtractionRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink";
import { markBoundedEvidenceExtractionRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance";

const originalEnv = { ...process.env };
const INPUT = "Using hydrogen for cars is more efficient than using electricity";
const FORBIDDEN_TEXT = "Hidden extraction route text must not appear by default.";

function context(runId = "job-v2-w5-route") {
  return buildClaimBoundaryV2RunContext({
    runIdHint: runId,
    submitted: {
      kind: "text",
      value: INPUT,
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-19T18:20:00.000Z"),
  });
}

function decision(): BoundedEvidenceExtractionDecision {
  return markBoundedEvidenceExtractionRuntimeOwnedDecision({
    decisionVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.x7w5",
    decisionId: "BOUNDED_EVIDENCE_EXTRACTION_ROUTE_TEST",
    kind: "bounded_evidence_extraction_execution",
    status: "hidden_evidence_item_extraction_completed",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    taskKey: "evidence_extraction",
    promptSectionId: "V2_EVIDENCE_EXTRACTION",
    outputSchemaVersion: "v2.evidence_extraction_result.0",
    defaultProjection: "hash_length_provenance_only",
    evidenceItemTextReturnedByDefault: false,
    sourceTextReturnedByDefault: false,
    parent: {
      w4hDecisionVersion: "v2.evidence-lifecycle.extraction-input-authorization.x7w4h",
      w4hStatus: "bounded_extraction_input_packet_created_extraction_execution_closed",
      w4hRuntimeOwnership: "owned",
      w4iDecisionVersion: "v2.evidence-lifecycle.execution-readiness-denial.x7w4i",
      w4iStatus: "extraction_input_structurally_eligible_execution_denied",
      w4iRuntimeOwnership: "owned",
      w4iPreCallGate: "merged_by_parity_rechecked_not_deleted",
      parentPacketId: "BOUNDED_EXTRACTION_INPUT_ROUTE",
      parentPacketHash: "0".repeat(64),
      parentPacketByteLength: Buffer.byteLength(FORBIDDEN_TEXT, "utf8"),
      parentProviderId: "wikimedia_core",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_ROUTE",
      contentPacketId: "BOUNDED_EXTRACTION_INPUT_ROUTE",
    },
    extractionResult: {
      schemaVersion: "v2.evidence_extraction_result.0",
      taskKey: "evidence_extraction",
      status: "accepted",
      extractionStatus: "evidence_extracted",
      rationale: FORBIDDEN_TEXT,
      evidenceItems: [{
        evidenceItemId: "EI_ROUTE",
        sourceRecordId: "SOURCE_MATERIAL_PAGE_SUMMARY_ROUTE",
        contentPacketId: "BOUNDED_EXTRACTION_INPUT_ROUTE",
        statement: FORBIDDEN_TEXT,
        targetAtomicClaimIds: ["AC_001"],
        claimDirection: "opposes",
        evidenceScope: {
          scopeId: "SCOPE_ROUTE",
          method: null,
          temporalBounds: null,
          populationOrDomain: null,
          geographicScope: null,
          limitations: [],
        },
        probativeValue: "medium",
        evidenceStrength: "moderate",
        extractionConfidence: "medium",
        provenance: {
          locator: "bounded_source",
          rationale: FORBIDDEN_TEXT,
        },
      }],
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    },
    extractionResultHash: "1".repeat(64),
    extractionResultStatus: "accepted",
    extractionStatus: "evidence_extracted",
    evidenceItemCount: 1,
    evidenceItemStatementHashes: ["2".repeat(64)],
    evidenceItemStatementByteLengths: [Buffer.byteLength(FORBIDDEN_TEXT, "utf8")],
    evidenceItemStatementProjections: [{
      evidenceItemId: "EI_ROUTE",
      sourceRecordId: "SOURCE_MATERIAL_PAGE_SUMMARY_ROUTE",
      contentPacketId: "BOUNDED_EXTRACTION_INPUT_ROUTE",
      statementHash: "2".repeat(64),
      statementByteLength: Buffer.byteLength(FORBIDDEN_TEXT, "utf8"),
      statementCharLength: Array.from(FORBIDDEN_TEXT).length,
      targetAtomicClaimIds: ["AC_001"],
      claimDirection: "opposes",
      probativeValue: "medium",
      evidenceStrength: "moderate",
      extractionConfidence: "medium",
      evidenceScopeHash: "3".repeat(64),
      provenanceHash: "4".repeat(64),
    }],
    executionTelemetry: {
      adapterVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.runtime.x7w5",
      promptContentHash: "5".repeat(64),
      renderedPromptHash: "6".repeat(64),
      configSnapshotHash: "config-hash",
      outputSchemaVersion: "v2.evidence_extraction_result.0",
      gatewayTaskId: "evidence_extraction",
      modelPolicyId: "v2.model.evidence_extraction.x7w5",
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      retryCount: 0,
      tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      durationMs: 10,
      cacheDecision: "no_store_no_read",
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
      approvalPointer: "Docs/WIP/2026-05-19_V2_Slice_X7-W5_First_Bounded_EvidenceItem_Authorization_Review_Package.md",
    },
    sideEffects: {
      promptLoaded: true,
      promptRendered: true,
      adapterCalled: true,
      modelCalled: true,
      cacheDecisionConstructed: true,
      cacheRead: false,
      cacheWrite: false,
      providerCallbackCreated: true,
      providerSdkLoaded: true,
      parserExecuted: false,
      sourceReliabilityCalled: false,
      storageWrite: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
    productExecution: {
      w4hPacketObserved: true,
      w4iEligibilityObserved: true,
      boundedEvidenceExtractionExecuted: true,
      extractionExecutionAuthorized: true,
      llmExtractionCallAuthorized: true,
      evidenceItemGenerated: true,
      parserExecuted: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicProjectionWritten: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
    },
  });
}

function seedArtifact(runId = "job-v2-w5-route") {
  const runContext = context(runId);
  clearBoundedEvidenceExtractionRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
  recordBoundedEvidenceExtractionRuntimeArtifact({
    context: runContext,
    boundedEvidenceExtraction: decision(),
  });
  return runContext.observabilityLedger.ledgerId;
}

function artifactUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts${query}`;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal bounded evidence extraction artifact route", () => {
  it("returns hash/length/provenance-only default artifacts for an authenticated ledger read", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route"
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
      sinkKind: "v2_evidence_lifecycle_bounded_evidence_extraction_artifact_ledger",
      defaultProjection: "hash_length_provenance_only",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      ledgerId,
      artifactCount: 1,
    });
    expect(body.artifacts[0].inputTextReturned).toBe(false);
    expect(body.artifacts[0].evidenceItemTextReturned).toBe(false);
    expect(body.artifacts[0].boundedEvidenceExtraction.extractionResult).toBeNull();
    expect(serialized).not.toContain(FORBIDDEN_TEXT);
    expect(serialized).not.toContain('"statement":');
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("truthPercentage");
  });

  it("requires admin authentication and rejects malformed ledger queries", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route"
    );

    const unauthenticated = await GET(new Request(artifactUrl("?ledgerId=ledger-ok")));
    const malformed = await GET(new Request(
      artifactUrl("?ledgerId=ledger-ok&includeText=true"),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const missing = await GET(new Request(
      artifactUrl("?ledgerId=ledger-missing"),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));

    expect(unauthenticated.status).toBe(401);
    expect(malformed.status).toBe(400);
    expect(missing.status).toBe(404);
    expect(JSON.stringify(await unauthenticated.json())).not.toContain(FORBIDDEN_TEXT);
    expect(JSON.stringify(await malformed.json())).not.toContain(FORBIDDEN_TEXT);
    expect(JSON.stringify(await missing.json())).not.toContain(FORBIDDEN_TEXT);
  });
});
