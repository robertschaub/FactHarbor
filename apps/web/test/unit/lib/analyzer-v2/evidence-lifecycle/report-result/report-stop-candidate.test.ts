import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildBoundaryVerdictCandidateDecision,
  type BoundaryVerdictCandidateDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import type { EvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import {
  buildInternalAlphaReportStopCandidate,
  INTERNAL_ALPHA_REPORT_STOP_DECISION_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate";
import type { SufficiencyAssessmentDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import type { SufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";

const SENTINEL = "NICHT_OFFENTLICHER_REPORT_STOP_TEXT_DARF_NIE_ERSCHEINEN";

function evidenceItemHandoff(
  overrides: Partial<EvidenceItemHandoffDecision> = {},
): EvidenceItemHandoffDecision {
  const base: EvidenceItemHandoffDecision = {
    decisionVersion: "v2.evidence-lifecycle.evidence-item-handoff.x7w5f",
    decisionId: "EVIDENCE_ITEM_HANDOFF_W8A_TEST",
    kind: "evidence_item_handoff",
    handoffStatus: "evidence_items_ready_for_downstream_internal_handoff",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parentW5ArtifactId: "BOUNDED_EVIDENCE_EXTRACTION_W8A_TEST",
    w5eAdmissionStatus: "bounded_evidence_items_admitted_internal_consumption_pending",
    admittedEvidenceItemCount: 1,
    evidenceItemStatementHashes: ["1".repeat(64)],
    evidenceItemStatementByteLengths: [91],
    sourceMaterialLineageHash: "2".repeat(64),
    w4hPacketHash: "3".repeat(64),
    providerId: "wikimedia_core",
    modelId: "claude-haiku-4-5-20251001",
    w4iDisposition: "historical_same_ledger_evidence_merged",
    retiredW4iTrigger: "remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner",
    replacementW4iTrigger: "after_w5f_handoff_route_projection_verified",
    redaction: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
    },
    sideEffects: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
      parserExecuted: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
    },
  };

  return { ...base, ...overrides };
}

function sufficiencyIntake(
  overrides: Partial<SufficiencyIntakeDecision> = {},
): SufficiencyIntakeDecision {
  const base: SufficiencyIntakeDecision = {
    decisionVersion: "v2.evidence-lifecycle.sufficiency-intake.w6b",
    decisionId: "SUFFICIENCY_INTAKE_W8A_TEST",
    kind: "sufficiency_intake",
    intakeStatus: "sufficiency_intake_ready_for_contract_only_assessment",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parentEvidenceItemHandoffDecisionId: "EVIDENCE_ITEM_HANDOFF_W8A_TEST",
    parentEvidenceItemHandoffVersion: "v2.evidence-lifecycle.evidence-item-handoff.x7w5f",
    admittedEvidenceItemCount: 1,
    evidenceItemStatementHashes: ["1".repeat(64)],
    evidenceItemStatementByteLengths: [91],
    sourceMaterialLineageHash: "2".repeat(64),
    w4hPacketHash: "3".repeat(64),
    providerId: "wikimedia_core",
    modelId: "claude-haiku-4-5-20251001",
    lineageHash: "4".repeat(64),
    assessmentExecution: "closed_contract_only",
    redaction: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
      summaryTextReturned: false,
      providerPayloadReturned: false,
    },
    sideEffects: {
      sufficiencyLlmCalled: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
      providerCalled: false,
      parserExecuted: false,
    },
  };

  return { ...base, ...overrides };
}

function sufficiencyAssessment(
  overrides: Partial<SufficiencyAssessmentDecision> = {},
): SufficiencyAssessmentDecision {
  const base: SufficiencyAssessmentDecision = {
    decisionVersion: "v2.evidence-lifecycle.sufficiency-assessment.w6c",
    decisionId: "SUFFICIENCY_ASSESSMENT_W8A_TEST",
    kind: "sufficiency_assessment",
    assessmentStatus: "sufficiency_assessment_completed",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parentSufficiencyIntakeDecisionId: "SUFFICIENCY_INTAKE_W8A_TEST",
    parentSufficiencyIntakeDecisionVersion: "v2.evidence-lifecycle.sufficiency-intake.w6b",
    parentW5DecisionId: "BOUNDED_EVIDENCE_EXTRACTION_W8A_TEST",
    admittedEvidenceItemCount: 1,
    evidenceItemStatementHashes: ["1".repeat(64)],
    evidenceItemStatementByteLengths: [91],
    sourceMaterialLineageHash: "2".repeat(64),
    w4hPacketHash: "3".repeat(64),
    providerId: "wikimedia_core",
    modelId: "claude-haiku-4-5-20251001",
    taskKey: "evidence_sufficiency",
    taskSchemaVersion: "v2.evidence_sufficiency_assessment.0",
    sufficiencyResultStatus: "accepted",
    sufficiencyResultPayloadHash: "5".repeat(64),
    reportStopRecommendation: "continue_to_boundary_formation",
    missingEvidenceDimensionProjections: [],
    redaction: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputPacketReturned: false,
      evidenceScopeTextReturned: false,
      provenanceTextReturned: false,
      promptTextReturned: false,
      renderedPromptTextReturned: false,
      providerPayloadReturned: false,
      sufficiencyResultPayloadReturned: false,
    },
    sideEffects: {
      sufficiencyLlmCalled: true,
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
    executionTelemetry: {
      gatewayTaskId: "evidence_sufficiency",
      promptSectionId: "V2_EVIDENCE_SUFFICIENCY_GATE",
      promptContentHash: "6".repeat(64),
      renderedPromptHash: "7".repeat(64),
      inputPacketHash: "8".repeat(64),
      inputPacketByteLength: 900,
      outputSchemaVersion: "v2.evidence_sufficiency_assessment.0",
      modelPolicyId: "v2.model.evidence_sufficiency.w6c",
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      tokenUsage: {
        inputTokens: 100,
        outputTokens: 70,
        totalTokens: 170,
      },
      durationMs: 42,
      cacheDecision: "no_store_no_read",
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
      cachePolicyId: "v2.semantic.evidence-sufficiency.w6c",
      approvalPointer: "Docs/WIP/2026-05-20_V2_Slice_W6-C_Sufficiency_Assessment_Implementation_Approval_Package.md",
    },
  };

  return { ...base, ...overrides };
}

function boundaryVerdictCandidate(
  overrides: {
    readonly handoff?: Partial<EvidenceItemHandoffDecision>;
    readonly intake?: Partial<SufficiencyIntakeDecision>;
    readonly assessment?: Partial<SufficiencyAssessmentDecision>;
  } = {},
): BoundaryVerdictCandidateDecision {
  return buildBoundaryVerdictCandidateDecision({
    evidenceItemHandoff: evidenceItemHandoff(overrides.handoff),
    sufficiencyIntake: sufficiencyIntake(overrides.intake),
    sufficiencyAssessment: sufficiencyAssessment(overrides.assessment),
  });
}

function build(
  overrides: {
    readonly handoff?: Partial<EvidenceItemHandoffDecision>;
    readonly intake?: Partial<SufficiencyIntakeDecision>;
    readonly assessment?: Partial<SufficiencyAssessmentDecision>;
    readonly boundaryVerdict?: BoundaryVerdictCandidateDecision;
  } = {},
) {
  const handoff = evidenceItemHandoff(overrides.handoff);
  const intake = sufficiencyIntake(overrides.intake);
  const assessment = sufficiencyAssessment(overrides.assessment);

  return buildInternalAlphaReportStopCandidate({
    evidenceItemHandoff: handoff,
    sufficiencyIntake: intake,
    sufficiencyAssessment: assessment,
    boundaryVerdictCandidate: overrides.boundaryVerdict ?? buildBoundaryVerdictCandidateDecision({
      evidenceItemHandoff: handoff,
      sufficiencyIntake: intake,
      sufficiencyAssessment: assessment,
    }),
  });
}

describe("internal Alpha report stop candidate", () => {
  it("creates one internal non-verdict-bearing W8-A report stop owner from accepted W7-A state", () => {
    const decision = build();

    expect(decision).toMatchObject({
      decisionVersion: INTERNAL_ALPHA_REPORT_STOP_DECISION_VERSION,
      kind: "internal_alpha_report_stop_candidate",
      status: "alpha_report_stop_created_not_report_ready",
      blockedReason: null,
      damagedReason: null,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      w4iDependency: "none",
      publicProjection: "closed_precutover_report_damaged",
    });
    expect(decision.reportReadiness).toEqual({
      publicCutoverStatus: "blocked_precutover",
      publicCutoverStatusOwnership: "mirror_only_not_source_of_truth",
      reportQualityStatus: "alpha_candidate_not_report_ready",
      reportCompleteness: "non_verdict_stop_only",
      comparatorReviewReadiness: "not_ready_no_verdict_candidate",
      compatibilityProjection: "ineligible_non_verdict_internal_stop_only",
    });
    expect(decision.evidenceTraceability).toEqual({
      evidenceItemCount: 1,
      evidenceItemStatementHashes: ["1".repeat(64)],
      evidenceItemStatementByteLengths: [91],
      boundaryCandidateCount: 0,
      verdictCandidatePresent: false,
      evidenceItemTextReturned: false,
    });
    expect(decision.sufficiencyAndStopState).toMatchObject({
      sufficiencyResultStatus: "accepted",
      recommendedNextAction: "continue_to_boundary_formation",
      boundaryVerdictCandidateStatus: "boundary_verdict_candidate_ready",
      boundaryVerdictCandidatePopulation: "closed_until_llm_task_approved",
      reportStopReason: "boundary_verdict_execution_closed",
    });
    expect(decision.sideEffects).toEqual({
      reportProseGenerated: false,
      boundaryCandidatesGenerated: false,
      verdictCandidateGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      truthPercentageGenerated: false,
      publicSurfaceWritten: false,
      compatibilityProjectionWritten: false,
      promptLoaded: false,
      promptRendered: false,
      modelCalled: false,
      cacheRead: false,
      cacheWrite: false,
      parserExecuted: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
    });
    expect(decision.balancedRiskMitigationDecision).toEqual({
      namedRisk: "adapter_side_report_semantics_inference_before_llm_boundary_verdict",
      decisionResult: "add",
      owner: "lead_developer",
      netComplexityImpact: "one_internal_stop_owner_no_route_no_runtime_wiring",
      removalOrMergeTrigger: "merge_into_real_internal_report_result_after_w7b_w8b",
    });
  });

  it("creates a non-verdict sufficiency-stop artifact when W7-A stopped before boundary/verdict generation", () => {
    const handoff = evidenceItemHandoff();
    const intake = sufficiencyIntake();
    const assessment = sufficiencyAssessment({
      reportStopRecommendation: "refine_retrieval",
    });
    const boundaryVerdict = buildBoundaryVerdictCandidateDecision({
      evidenceItemHandoff: handoff,
      sufficiencyIntake: intake,
      sufficiencyAssessment: assessment,
    });

    const decision = buildInternalAlphaReportStopCandidate({
      evidenceItemHandoff: handoff,
      sufficiencyIntake: intake,
      sufficiencyAssessment: assessment,
      boundaryVerdictCandidate: boundaryVerdict,
    });

    expect(boundaryVerdict.status).toBe("boundary_verdict_candidate_blocked");
    expect(boundaryVerdict.blockedReason).toBe("sufficiency_stop_refine_retrieval");
    expect(decision.status).toBe("alpha_report_stop_created_not_report_ready");
    expect(decision.sufficiencyAndStopState.reportStopReason).toBe("sufficiency_stop");
    expect(decision.evidenceTraceability.boundaryCandidateCount).toBe(0);
    expect(decision.evidenceTraceability.verdictCandidatePresent).toBe(false);
  });

  it("fails closed on missing, blocked, damaged, mismatched, and side-effect-open parents", () => {
    const missingBoundaryVerdict = buildInternalAlphaReportStopCandidate({
      evidenceItemHandoff: evidenceItemHandoff(),
      sufficiencyIntake: sufficiencyIntake(),
      sufficiencyAssessment: sufficiencyAssessment(),
      boundaryVerdictCandidate: null,
    });
    const blockedAssessment = build({
      assessment: {
        assessmentStatus: "sufficiency_assessment_blocked",
        blockedReason: "task_policy_not_executable",
      },
    });
    const damagedUpstreamBoundary = build({
      intake: {
        parentEvidenceItemHandoffDecisionId: "OTHER_HANDOFF",
      },
    });
    const intakeMismatch = build({
      intake: {
        parentEvidenceItemHandoffDecisionId: "OTHER_HANDOFF",
      },
      boundaryVerdict: boundaryVerdictCandidate(),
    });
    const assessmentMismatch = build({
      assessment: {
        parentSufficiencyIntakeDecisionId: "OTHER_INTAKE",
      },
      boundaryVerdict: boundaryVerdictCandidate(),
    });
    const sideEffectOpen = build({
      handoff: {
        sideEffects: {
          ...evidenceItemHandoff().sideEffects,
          publicSurfaceWritten: true as false,
        },
      },
      boundaryVerdict: boundaryVerdictCandidate(),
    });

    expect(missingBoundaryVerdict.status).toBe("alpha_report_stop_blocked");
    expect(missingBoundaryVerdict.blockedReason).toBe("boundary_verdict_candidate_missing");
    expect(blockedAssessment.status).toBe("alpha_report_stop_blocked");
    expect(blockedAssessment.blockedReason).toBe("sufficiency_assessment_not_completed");
    expect(damagedUpstreamBoundary.status).toBe("alpha_report_stop_blocked");
    expect(damagedUpstreamBoundary.blockedReason).toBe("boundary_verdict_candidate_not_ready_or_approved_stop");
    expect(intakeMismatch.status).toBe("alpha_report_stop_damaged");
    expect(intakeMismatch.damagedReason).toBe("lineage_mismatch");
    expect(assessmentMismatch.status).toBe("alpha_report_stop_damaged");
    expect(assessmentMismatch.damagedReason).toBe("lineage_mismatch");
    expect(sideEffectOpen.status).toBe("alpha_report_stop_blocked");
    expect(sideEffectOpen.blockedReason).toBe("side_effects_not_closed");
  });

  it("damages if an upstream parent unexpectedly carries boundary or verdict candidates", () => {
    const withBoundaryCandidate = build({
      boundaryVerdict: {
        ...boundaryVerdictCandidate(),
        boundaryCandidates: [
          {
            boundaryCandidateId: "BOUNDARY_CANDIDATE_SHOULD_NOT_EXIST",
            evidenceItemIds: ["evidence-item-1"],
            targetAtomicClaimIds: ["ac-1"],
          },
        ],
      } as BoundaryVerdictCandidateDecision,
    });
    const withVerdictCandidate = build({
      boundaryVerdict: {
        ...boundaryVerdictCandidate(),
        verdictCandidate: {
          verdictCandidateId: "VERDICT_CANDIDATE_SHOULD_NOT_EXIST",
          boundaryCandidateIds: ["boundary-1"],
          evidenceItemIds: ["evidence-item-1"],
        },
      } as BoundaryVerdictCandidateDecision,
    });

    expect(withBoundaryCandidate.status).toBe("alpha_report_stop_damaged");
    expect(withBoundaryCandidate.damagedReason).toBe("unexpected_boundary_candidate_present");
    expect(withVerdictCandidate.status).toBe("alpha_report_stop_damaged");
    expect(withVerdictCandidate.damagedReason).toBe("unexpected_verdict_candidate_present");
  });

  it("keeps default projection text-free and does not claim report readiness", () => {
    const parentWithUnsafeText = {
      ...evidenceItemHandoff(),
      statement: SENTINEL,
      sourceText: SENTINEL,
      inputText: SENTINEL,
      summary: SENTINEL,
      hiddenLedgerId: SENTINEL,
      internalStatus: SENTINEL,
      providerPayload: { body: SENTINEL },
      reportMarkdown: SENTINEL,
      truthPercentage: 99,
      confidenceTier: "high",
    } as unknown as EvidenceItemHandoffDecision;

    const decision = buildInternalAlphaReportStopCandidate({
      evidenceItemHandoff: parentWithUnsafeText,
      sufficiencyIntake: sufficiencyIntake(),
      sufficiencyAssessment: sufficiencyAssessment(),
      boundaryVerdictCandidate: boundaryVerdictCandidate(),
    });
    const serialized = JSON.stringify(decision);

    expect(decision.status).toBe("alpha_report_stop_created_not_report_ready");
    expect(decision.redaction).toEqual({
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
      summaryTextReturned: false,
      providerPayloadReturned: false,
      promptTextReturned: false,
      reportProseReturned: false,
      hiddenLedgerReferenceReturned: false,
      internalStateReturned: false,
    });
    expect(serialized).not.toContain(SENTINEL);
    expect(serialized).not.toContain("hiddenLedgerId");
    expect(serialized).not.toContain("internalStatus");
    expect(serialized).not.toContain("\"truthPercentage\":");
    expect(serialized).not.toContain("confidenceTier");
    expect(serialized).not.toContain("reportMarkdown");
  });

  it("uses allowlisted parent fields and has no direct W4-I, product, prompt, provider, or public dependency", () => {
    const source = readFileSync(
      path.resolve(
        process.cwd(),
        "src/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate.ts",
      ),
      "utf8",
    );

    expect(source).not.toContain("...evidenceItemHandoff");
    expect(source).not.toContain("...sufficiencyIntake");
    expect(source).not.toContain("...sufficiencyAssessment");
    expect(source).not.toContain("...boundaryVerdictCandidate");
    expect(source).not.toContain("JSON.stringify(evidenceItemHandoff");
    expect(source).not.toContain("JSON.stringify(sufficiencyIntake");
    expect(source).not.toContain("JSON.stringify(sufficiencyAssessment");
    expect(source).not.toContain("JSON.stringify(boundaryVerdictCandidate");
    expect(source).not.toContain("execution-readiness");
    expect(source).not.toContain("artifact-sink");
    expect(source).not.toContain("prompt-loader");
    expect(source).not.toContain("model-adapter");
    expect(source).not.toContain("gateway/");
    expect(source).not.toContain("@/app");
    expect(source).not.toContain("source-reliability");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("confidenceTier");
    expect(source).not.toContain("reportMarkdown");
    expect(source).not.toContain("sourceText:");
    expect(source).not.toContain("inputText:");
  });
});
