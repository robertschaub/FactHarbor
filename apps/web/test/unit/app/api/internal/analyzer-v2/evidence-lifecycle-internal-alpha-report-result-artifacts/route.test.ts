import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import type { BoundaryVerdictExecutionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import type { BoundaryVerdictCandidateDecision } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import type { BoundedEvidenceExtractionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import type { EvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import type { InternalAlphaReportStopCandidate } from "@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate";
import type { SufficiencyAssessmentDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import type { SufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  markBoundaryVerdictExecutionRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-provenance";
import {
  INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_VERSION,
  clearInternalAlphaReportResultRuntimeArtifacts,
  recordInternalAlphaReportResultRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink";

const originalEnv = { ...process.env };
const STATEMENT = "Battery electric cars use electricity more directly than hydrogen cars.";
const SECRET_TEXT = "W8B_ROUTE_SECRET_TEXT_MUST_NOT_LEAK";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function context(runId = "job-v2-w8b-route") {
  return buildClaimBoundaryV2RunContext({
    runIdHint: runId,
    submitted: { kind: "text", value: "Using hydrogen for cars is more efficient than using electricity" },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-20T21:10:00.000Z"),
  });
}

function routeUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts${query}`;
}

function parents() {
  return {
    boundedEvidenceExtraction: {
      decisionVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.x7w5",
      decisionId: "BOUNDED_EVIDENCE_EXTRACTION_W8B_ROUTE",
      kind: "bounded_evidence_extraction_execution",
      status: "hidden_evidence_item_extraction_completed",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      extractionResultStatus: "accepted",
      extractionStatus: "evidence_extracted",
      extractionResult: { status: "accepted", evidenceItems: [{ evidenceItemId: "EI_W8B_ROUTE", statement: STATEMENT }] },
    } as unknown as BoundedEvidenceExtractionDecision,
    evidenceItemHandoff: {
      decisionVersion: "v2.evidence-lifecycle.evidence-item-handoff.x7w5f",
      decisionId: "EVIDENCE_ITEM_HANDOFF_W8B_ROUTE",
      kind: "evidence_item_handoff",
      handoffStatus: "evidence_items_ready_for_downstream_internal_handoff",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      admittedEvidenceItemCount: 1,
      evidenceItemStatementHashes: [sha256Text(STATEMENT)],
      evidenceItemStatementByteLengths: [Buffer.byteLength(STATEMENT, "utf8")],
      sourceMaterialLineageHash: "1".repeat(64),
      w4hPacketHash: "2".repeat(64),
      providerId: "wikimedia_core",
      modelId: "claude-haiku-4-5-20251001",
    } as EvidenceItemHandoffDecision,
    sufficiencyIntake: {
      decisionVersion: "v2.evidence-lifecycle.sufficiency-intake.w6b",
      decisionId: "SUFFICIENCY_INTAKE_W8B_ROUTE",
      kind: "sufficiency_intake",
      intakeStatus: "sufficiency_intake_ready_for_contract_only_assessment",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      parentEvidenceItemHandoffDecisionId: "EVIDENCE_ITEM_HANDOFF_W8B_ROUTE",
    } as SufficiencyIntakeDecision,
    sufficiencyAssessment: {
      decisionVersion: "v2.evidence-lifecycle.sufficiency-assessment.w6c",
      decisionId: "SUFFICIENCY_ASSESSMENT_W8B_ROUTE",
      kind: "sufficiency_assessment",
      assessmentStatus: "sufficiency_assessment_completed",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      parentSufficiencyIntakeDecisionId: "SUFFICIENCY_INTAKE_W8B_ROUTE",
      parentW5DecisionId: "BOUNDED_EVIDENCE_EXTRACTION_W8B_ROUTE",
      sufficiencyResultStatus: "accepted",
      reportStopRecommendation: "continue_to_boundary_formation",
    } as SufficiencyAssessmentDecision,
    boundaryVerdictCandidate: {
      decisionVersion: "v2.evidence-lifecycle.boundary-verdict-candidate.w7a",
      decisionId: "BOUNDARY_VERDICT_CANDIDATE_W8B_ROUTE",
      kind: "boundary_verdict_candidate_contract",
      status: "boundary_verdict_candidate_ready",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      candidatePopulation: "closed_until_llm_task_approved",
      inputLineage: {
        evidenceItemHandoffDecisionId: "EVIDENCE_ITEM_HANDOFF_W8B_ROUTE",
        sufficiencyIntakeDecisionId: "SUFFICIENCY_INTAKE_W8B_ROUTE",
        sufficiencyAssessmentDecisionId: "SUFFICIENCY_ASSESSMENT_W8B_ROUTE",
      },
    } as BoundaryVerdictCandidateDecision,
    internalAlphaReportStop: {
      decisionVersion: "v2.evidence-lifecycle.internal-alpha-report-stop.w8a",
      decisionId: "INTERNAL_ALPHA_REPORT_STOP_W8B_ROUTE",
      kind: "internal_alpha_report_stop_candidate",
      status: "alpha_report_stop_created_not_report_ready",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      inputLineage: {
        evidenceItemHandoffDecisionId: "EVIDENCE_ITEM_HANDOFF_W8B_ROUTE",
        sufficiencyIntakeDecisionId: "SUFFICIENCY_INTAKE_W8B_ROUTE",
        sufficiencyAssessmentDecisionId: "SUFFICIENCY_ASSESSMENT_W8B_ROUTE",
        boundaryVerdictCandidateDecisionId: "BOUNDARY_VERDICT_CANDIDATE_W8B_ROUTE",
      },
    } as InternalAlphaReportStopCandidate,
  };
}

function boundaryVerdictExecution(): BoundaryVerdictExecutionDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.boundary-verdict-execution.w7b",
    decisionId: "BOUNDARY_VERDICT_EXECUTION_W8B_ROUTE",
    kind: "boundary_verdict_execution",
    status: "boundary_verdict_candidates_created_internal",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    taskKey: "boundary_verdict_execution",
    promptSectionId: "V2_BOUNDARY_VERDICT_EXECUTION",
    outputSchemaVersion: "v2.boundary_verdict_execution.0",
    inputPacketHash: "3".repeat(64),
    inputPacketByteLength: 1024,
    evidenceItemCount: 1,
    boundaryCandidateCount: 1,
    verdictCandidateCount: 1,
    citedEvidenceItemRefs: ["EI_W8B_ROUTE"],
    resultPayloadHash: "4".repeat(64),
    warningMaterialityInputs: {
      warningPublication: "closed",
      userVisibleWarningCount: 0,
      upstreamSufficiencyStatus: "accepted",
      upstreamRecommendedNextAction: "continue_to_boundary_formation",
      boundaryVerdictIntegrityEventCount: 1,
      candidateMaterialUncertaintySignalCount: 0,
    },
    executionTelemetry: {
      gatewayTaskId: "boundary_verdict_execution",
      promptSectionId: "V2_BOUNDARY_VERDICT_EXECUTION",
      promptContentHash: "5".repeat(64),
      renderedPromptHash: "6".repeat(64),
      inputPacketHash: "3".repeat(64),
      inputPacketByteLength: 1024,
      outputSchemaVersion: "v2.boundary_verdict_execution.0",
      modelPolicyId: "v2.model.boundary_verdict_execution.w7b",
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      attemptCount: 1,
      schemaRetryCount: 0,
      tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      durationMs: 25,
      cacheDecision: "no_store_no_read",
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
      cachePolicyId: "v2.semantic.boundary-verdict-execution.w7b",
      approvalPointer: "Docs/WIP/2026-05-20_V2_Slice_W7-B_Boundary_Verdict_LLM_Execution_Approval_Package.md",
    },
    redaction: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputPacketReturned: false,
      promptTextReturned: false,
      renderedPromptTextReturned: false,
      providerPayloadReturned: false,
      boundaryCandidateTextReturned: false,
      verdictCandidateTextReturned: false,
      warningMaterialityTextReturned: false,
      hiddenLedgerReferenceReturned: false,
      internalStateReturned: false,
    },
    sideEffects: {
      boundaryVerdictLlmCalled: true,
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
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
    w7aMergeTrigger: "merge_w7a_after_w7b_verifier_stable_and_fail_closed_parity_covered",
    combinedCallQualityTrigger:
      "compare_first_successful_benchmark_family_candidate_against_best_available_boundary_comparator",
    approvalPointer: "Docs/WIP/2026-05-20_V2_Slice_W7-B_Boundary_Verdict_LLM_Execution_Approval_Package.md",
  } as BoundaryVerdictExecutionDecision;
}

function seedArtifact(runId = "job-v2-w8b-route") {
  const runContext = context(runId);
  clearInternalAlphaReportResultRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
  recordInternalAlphaReportResultRuntimeArtifact({
    context: runContext,
    ...parents(),
    boundaryVerdictExecution: markBoundaryVerdictExecutionRuntimeOwnedDecision(boundaryVerdictExecution()),
  });
  return runContext.observabilityLedger.ledgerId;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal Alpha report-result artifact route", () => {
  it("returns no-store internal default projection without raw ledger ids or text", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route"
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
      sinkKind: "v2_evidence_lifecycle_internal_alpha_report_result_artifact_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      defaultProjection: "admin_structured_candidate_no_source_text",
      ledgerIdReturned: false,
      artifactCount: 1,
    });
    expect(body.artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: INTERNAL_ALPHA_REPORT_RESULT_ARTIFACT_VERSION,
        internalAlphaReportResult: expect.objectContaining({
          status: "internal_alpha_report_result_candidate_created",
          evidenceTraceability: expect.objectContaining({
            citedEvidenceItemRefsReturned: false,
            citedEvidenceItemRefCount: 1,
          }),
          upstreamStopAttribution: expect.objectContaining({
            firstIncompleteStage: "none",
            firstIncompleteReason: null,
            parentStatuses: expect.objectContaining({
              sufficiencyAssessment: expect.objectContaining({
                assessmentStatus: "sufficiency_assessment_completed",
                sufficiencyResultStatus: "accepted",
              }),
              boundaryVerdictExecution: expect.objectContaining({
                status: "boundary_verdict_candidates_created_internal",
                citedEvidenceItemRefCount: 1,
              }),
            }),
          }),
        }),
      }),
    ]);
    expect(serialized).not.toContain(ledgerId);
    expect(serialized).not.toContain("BOUNDARY_VERDICT_EXECUTION_W8B_ROUTE");
    expect(serialized).not.toContain("EI_W8B_ROUTE");
    expect(serialized).not.toContain(STATEMENT);
    expect(serialized).not.toContain(SECRET_TEXT);
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("\"truthPercentage\":");
  });

  it("requires admin auth and rejects malformed ledger queries", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route"
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
      routeUrl("?jobId=job-v2-w8b-route"),
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
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route"
    );

    const response = await GET(new Request(
      routeUrl("?ledgerId=missing-w8b-ledger"),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain("missing-w8b-ledger");
    expect(body).toEqual({
      ok: false,
      error: "Not found",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    });
  });
});
