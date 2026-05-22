import { afterEach, describe, expect, it } from "vitest";

import {
  BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
  BOUNDARY_VERDICT_EXECUTION_INTERNAL_REVIEW_PAYLOAD_VERSION,
  type BoundaryVerdictExecutionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import {
  INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
  type InternalAlphaReportResultCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_VERSION,
  clearInternalAlphaReportDraftRuntimeArtifacts,
  recordInternalAlphaReportDraftRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-draft-artifact-sink";

const originalEnv = { ...process.env };
const RESULT_HASH = "a".repeat(64);
const PAYLOAD_HASH = "b".repeat(64);
const SECRET_DRAFT_TEXT = "The cited evidence opposes the efficiency claim.";

function routeUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-draft-artifacts${query}`;
}

function context(runIdHint = "job-v2-w8g-route") {
  return buildClaimBoundaryV2RunContext({
    runIdHint,
    submitted: {
      kind: "text",
      value: "Using hydrogen for cars is more efficient than using electricity",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-22T00:45:00.000Z"),
  });
}

function reportResult(
  overrides: Partial<InternalAlphaReportResultCandidate> = {},
): InternalAlphaReportResultCandidate {
  return {
    decisionVersion: INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
    decisionId: "INTERNAL_ALPHA_REPORT_RESULT_W8G_ROUTE",
    status: "internal_alpha_report_result_candidate_created",
    inputLineage: {
      boundaryVerdictExecutionDecisionId: "BOUNDARY_VERDICT_EXECUTION_W8G_ROUTE",
    },
    boundaryVerdictSummary: {
      resultPayloadHash: RESULT_HASH,
    },
    ...overrides,
  } as InternalAlphaReportResultCandidate;
}

function boundaryVerdictExecution(
  overrides: Partial<BoundaryVerdictExecutionDecision> = {},
): BoundaryVerdictExecutionDecision {
  return {
    decisionVersion: BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
    decisionId: "BOUNDARY_VERDICT_EXECUTION_W8G_ROUTE",
    status: "boundary_verdict_candidates_created_internal",
    resultPayloadHash: RESULT_HASH,
    internalReviewPayload: {
      payloadVersion: BOUNDARY_VERDICT_EXECUTION_INTERNAL_REVIEW_PAYLOAD_VERSION,
      source: "validated_boundary_verdict_execution_result",
      boundarySetCandidate: {
        boundaries: [{
          boundaryCandidateId: "B1",
          title: "Efficiency comparison boundary",
          targetAtomicClaimIds: ["AC_001"],
          evidenceItemIds: ["EI_SECRET_W8G_ROUTE"],
          evidenceScopeSummary: "Vehicle efficiency evidence.",
          rationale: "The boundary groups the efficiency evidence for internal review.",
        }],
      },
      verdictSetCandidate: {
        verdictCandidates: [{
          verdictCandidateId: "V1",
          boundaryCandidateIds: ["B1"],
          targetAtomicClaimIds: ["AC_001"],
          evidenceItemIds: ["EI_SECRET_W8G_ROUTE"],
          internalVerdictLabelCandidate: "MOSTLY-FALSE",
          internalTruthPercentageCandidate: 15,
          internalConfidenceCandidate: 70,
          rationale: SECRET_DRAFT_TEXT,
          caveats: ["Internal Alpha draft; not public."],
          materialUncertaintySignals: ["Evidence portfolio remains limited."],
        }],
      },
      warningMaterialityInputs: {
        upstreamSufficiencyStatus: "caveated",
        upstreamRecommendedNextAction: "caveat_report",
        boundaryVerdictIntegrityEventCount: 0,
        candidateMaterialUncertaintySignalCount: 1,
        userVisibleWarningPublication: "closed",
      },
      integrityEventCount: 0,
      payloadByteLength: 1024,
      payloadHash: PAYLOAD_HASH,
      defaultProjectionReturned: false,
      sourceTextReturned: false,
      evidenceItemTextReturned: false,
      promptTextReturned: false,
      providerPayloadReturned: false,
    },
    ...overrides,
  } as BoundaryVerdictExecutionDecision;
}

function seedArtifact(runIdHint = "job-v2-w8g-route") {
  const runContext = context(runIdHint);
  clearInternalAlphaReportDraftRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
  recordInternalAlphaReportDraftRuntimeArtifact({
    context: runContext,
    internalAlphaReportResult: reportResult(),
    boundaryVerdictExecution: boundaryVerdictExecution(),
  });
  return runContext.observabilityLedger.ledgerId;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal Alpha report draft artifact route", () => {
  it("returns no-store default projection without draft text or raw ids", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-draft-artifacts/route"
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
      sinkKind: "v2_evidence_lifecycle_internal_alpha_report_draft_artifact_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      defaultProjection: "hash_length_provenance_only",
      ledgerIdReturned: false,
      draftMarkdownReturned: false,
      artifactCount: 1,
    });
    expect(body.artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: INTERNAL_ALPHA_REPORT_DRAFT_ARTIFACT_VERSION,
        internalAlphaReportDraft: expect.objectContaining({
          status: "internal_alpha_report_draft_created",
          draftMarkdownReturned: false,
          boundaryDraftCount: 1,
          verdictDraftCount: 1,
          citedEvidenceItemRefCount: 1,
        }),
      }),
    ]);
    expect(serialized).not.toContain(ledgerId);
    expect(serialized).not.toContain("BOUNDARY_VERDICT_EXECUTION_W8G_ROUTE");
    expect(serialized).not.toContain("EI_SECRET_W8G_ROUTE");
    expect(serialized).not.toContain(SECRET_DRAFT_TEXT);
    expect(serialized).not.toContain("\"draftMarkdown\":");
    expect(serialized).not.toContain("\"truthPercentage\":");
  });

  it("returns draft markdown only behind the explicit authenticated inspection flag", async () => {
    const ledgerId = seedArtifact("job-v2-w8g-route-inspect");
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-draft-artifacts/route"
    );

    const response = await GET(new Request(
      routeUrl(`?ledgerId=${encodeURIComponent(ledgerId)}&inspectDraftText=true`),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      defaultProjection: "explicit_authenticated_admin_draft_markdown",
      draftMarkdownReturned: true,
    });
    expect(body.artifacts[0].internalAlphaReportDraft).toMatchObject({
      draftMarkdownReturned: true,
    });
    expect(body.artifacts[0].internalAlphaReportDraft.draftMarkdown).toContain(SECRET_DRAFT_TEXT);
  });

  it("requires admin auth and rejects malformed ledger or inspection queries", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-draft-artifacts/route"
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
      routeUrl("?ledgerId=ledger&inspectDraftText=false"),
      routeUrl("?ledgerId=ledger&inspectDraftText=true&inspectDraftText=true"),
      routeUrl("?jobId=job-v2-w8g-route"),
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
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-draft-artifacts/route"
    );

    const response = await GET(new Request(
      routeUrl("?ledgerId=missing-w8g-ledger"),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain("missing-w8g-ledger");
    expect(body).toEqual({
      ok: false,
      error: "Not found",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    });
  });
});
