import { afterEach, describe, expect, it } from "vitest";

import {
  AGGREGATION_NARRATIVE_SCHEMA_VERSION,
  type AggregationNarrativeResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/aggregation-narrative-contract";
import {
  INTERNAL_REPORT_WRITER_DECISION_VERSION,
  type InternalReportWriterDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  clearInternalReportWriterRuntimeArtifacts,
  INTERNAL_REPORT_WRITER_ARTIFACT_VERSION,
  recordInternalReportWriterRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-report-writer-artifact-sink";

const originalEnv = { ...process.env };
const SECRET_REPORT_MARKDOWN = "# Internal Report\n\nThis report prose is available only by explicit inspection.\n";

function routeUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-internal-report-writer-artifacts${query}`;
}

function context(runIdHint = "job-v2-hj18-route") {
  return buildClaimBoundaryV2RunContext({
    runIdHint,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-22T07:10:00.000Z"),
  });
}

function aggregationNarrativeResult(): AggregationNarrativeResult {
  return {
    schemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
    taskKey: "aggregation_narrative",
    status: "accepted",
    reportTitle: "Internal Report",
    executiveSummary: "Internal summary.",
    verdictSections: [{
      verdictCandidateId: "V1",
      boundaryCandidateIds: ["B1"],
      evidenceItemIds: ["EI_SECRET_HJ18_ROUTE"],
      verdictLabel: "FALSE",
      truthPercentage: 15,
      confidence: 72,
      narrative: "Internal verdict narrative.",
      caveats: ["Internal only."],
      materialUncertaintySignals: ["Limited corpus."],
    }],
    boundarySections: [{
      boundaryCandidateId: "B1",
      title: "Boundary",
      evidenceItemIds: ["EI_SECRET_HJ18_ROUTE"],
      narrative: "Internal boundary narrative.",
    }],
    limitations: ["Internal only."],
    citationMap: [{
      evidenceItemId: "EI_SECRET_HJ18_ROUTE",
      usedFor: "Internal report citation.",
    }],
    reportMarkdown: SECRET_REPORT_MARKDOWN,
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function decision(): InternalReportWriterDecision {
  return {
    decisionVersion: INTERNAL_REPORT_WRITER_DECISION_VERSION,
    decisionId: "INTERNAL_REPORT_WRITER_HJ18_ROUTE",
    kind: "internal_report_writer",
    status: "internal_report_writer_draft_created",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    taskKey: "aggregation_narrative",
    promptSectionId: "V2_AGGREGATION_NARRATIVE",
    outputSchemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
    parent: {
      internalAlphaReportResultVersion: "v2.evidence-lifecycle.internal-alpha-report-result.w8b",
      internalAlphaReportResultStatus: "internal_alpha_report_result_candidate_created",
      internalAlphaReportResultDecisionHash: "a".repeat(64),
      boundaryVerdictExecutionStatus: "boundary_verdict_candidates_created_internal",
      boundaryVerdictExecutionDecisionHash: "b".repeat(64),
      boundaryVerdictExecutionResultPayloadHash: "c".repeat(64),
      boundaryVerdictExecutionReviewPayloadHash: "d".repeat(64),
    },
    inputPacketHash: "e".repeat(64),
    inputPacketByteLength: 512,
    aggregationNarrativeResult: aggregationNarrativeResult(),
    aggregationNarrativeResultHash: "f".repeat(64),
    aggregationNarrativeResultStatus: "accepted",
    reportMarkdown: SECRET_REPORT_MARKDOWN,
    reportMarkdownHash: "1".repeat(64),
    reportMarkdownByteLength: Buffer.byteLength(SECRET_REPORT_MARKDOWN, "utf8"),
    verdictSectionCount: 1,
    boundarySectionCount: 1,
    citedEvidenceItemRefCount: 1,
    citedEvidenceItemRefHashes: ["2".repeat(64)],
    reportReviewReadiness: "ready_for_internal_report_review",
    redaction: {
      reportMarkdownReturnedByDefault: false,
      sourceTextReturned: false,
      evidenceItemTextReturned: false,
      inputTextReturned: false,
      promptTextReturned: false,
      providerPayloadReturned: false,
      hiddenLedgerReferenceReturned: false,
      publicVerdictReturned: false,
      publicTruthPercentageReturned: false,
      publicConfidenceReturned: false,
      publicWarningReturned: false,
    },
    executionTelemetry: {
      gatewayTaskId: "aggregation_narrative",
      promptSectionId: "V2_AGGREGATION_NARRATIVE",
      promptContentHash: "3".repeat(64),
      renderedPromptHash: "4".repeat(64),
      inputPacketHash: "e".repeat(64),
      inputPacketByteLength: 512,
      outputSchemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
      schemaDiagnostics: null,
      modelPolicyId: "v2.model.aggregation_narrative.hj18",
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      attemptCount: 1,
      schemaRetryCount: 0,
      tokenUsage: { inputTokens: 100, outputTokens: 80, totalTokens: 180 },
      durationMs: 1200,
      cacheDecision: "no_store_no_read",
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
      cachePolicyId: "v2.semantic.aggregation-narrative.hj18",
      approvalPointer: "Docs/WIP/2026-05-22_V2_HighJump_HJ18_Internal_Report_Writer.md",
    },
    sideEffects: {
      reportProseLlmCalled: true,
      promptLoaded: true,
      promptRendered: true,
      adapterCalled: true,
      modelCalled: true,
      providerCallbackCreated: true,
      providerSdkLoaded: true,
      cacheDecisionConstructed: true,
      cacheRead: false,
      cacheWrite: false,
      parserExecuted: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
      publicReportGenerated: false,
      publicSurfaceWritten: false,
      compatibilityProjectionWritten: false,
      verdictPublished: false,
      warningPublished: false,
      confidencePublished: false,
      truthPercentagePublished: false,
    },
    w8gMergeTrigger:
      "merge_w8g_after_hj18_report_writer_review_accepts_output_shape_and_fail_closed_parity",
    approvalPointer: "Docs/WIP/2026-05-22_V2_HighJump_HJ18_Internal_Report_Writer.md",
  };
}

function seedArtifact(runIdHint = "job-v2-hj18-route"): string {
  const runContext = context(runIdHint);
  clearInternalReportWriterRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
  recordInternalReportWriterRuntimeArtifact({
    context: runContext,
    decision: decision(),
  });
  return runContext.observabilityLedger.ledgerId;
}

afterEach(() => {
  process.env = { ...originalEnv };
  clearInternalReportWriterRuntimeArtifacts();
});

describe("Analyzer V2 internal report writer artifact route", () => {
  it("returns no-store default projection without report markdown or raw ids", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-internal-report-writer-artifacts/route"
    );

    const response = await GET(new Request(
      routeUrl(`?ledgerId=${encodeURIComponent(ledgerId)}`),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      sinkKind: "v2_evidence_lifecycle_internal_report_writer_artifact_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      defaultProjection: "hash_length_provenance_only",
      ledgerIdReturned: false,
      reportMarkdownReturned: false,
      artifactCount: 1,
    });
    expect(body.artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: INTERNAL_REPORT_WRITER_ARTIFACT_VERSION,
        internalReportWriter: expect.objectContaining({
          status: "internal_report_writer_draft_created",
          reportMarkdownReturned: false,
          verdictSectionCount: 1,
          boundarySectionCount: 1,
          citedEvidenceItemRefCount: 1,
        }),
      }),
    ]);
    expect(serialized).not.toContain(ledgerId);
    expect(serialized).not.toContain("INTERNAL_REPORT_WRITER_HJ18_ROUTE");
    expect(serialized).not.toContain("EI_SECRET_HJ18_ROUTE");
    expect(serialized).not.toContain(SECRET_REPORT_MARKDOWN);
    expect(serialized).not.toContain("\"reportMarkdown\":");
    expect(serialized).not.toContain("\"truthPercentage\":");
  });

  it("returns report markdown only behind the explicit authenticated inspection flag", async () => {
    const ledgerId = seedArtifact("job-v2-hj18-route-inspect");
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-internal-report-writer-artifacts/route"
    );

    const response = await GET(new Request(
      routeUrl(`?ledgerId=${encodeURIComponent(ledgerId)}&inspectReportText=true`),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      defaultProjection: "explicit_authenticated_admin_report_markdown",
      reportMarkdownReturned: true,
    });
    expect(body.artifacts[0].internalReportWriter).toMatchObject({
      reportMarkdownReturned: true,
    });
    expect(body.artifacts[0].internalReportWriter.reportMarkdown).toContain(SECRET_REPORT_MARKDOWN);
  });

  it("requires admin auth and rejects malformed ledger or inspection queries", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-internal-report-writer-artifacts/route"
    );

    for (const request of [
      new Request(routeUrl("?ledgerId=ledger")),
      new Request(routeUrl("?ledgerId=ledger"), { headers: { "x-admin-key": "wrong-key" } }),
    ]) {
      const response = await GET(request);
      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
    }

    const headers = { "x-admin-key": "test-admin-key" };
    for (const url of [
      routeUrl(""),
      routeUrl("?ledgerId=%20"),
      routeUrl("?ledgerId=bad/ledger"),
      routeUrl(`?ledgerId=${"x".repeat(257)}`),
      routeUrl("?ledgerId=a&ledgerId=b"),
      routeUrl("?ledgerId=ledger&inspectReportText=false"),
      routeUrl("?ledgerId=ledger&inspectReportText=true&inspectReportText=true"),
      routeUrl("?jobId=job-v2-hj18-route"),
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
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-internal-report-writer-artifacts/route"
    );

    const response = await GET(new Request(
      routeUrl("?ledgerId=missing-hj18-ledger"),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain("missing-hj18-ledger");
    expect(body).toEqual({
      ok: false,
      error: "Not found",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    });
  });
});
