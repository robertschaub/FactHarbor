import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { EvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import {
  buildBoundaryVerdictCandidateDecision,
  BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION,
  type BoundaryVerdictCandidateDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import type { SufficiencyAssessmentDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import type { SufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";

const SENTINEL = "NICHT_OFFENTLICHER_BEWEISTEXT_DARF_NIE_ERSCHEINEN";

function evidenceItemHandoff(
  overrides: Partial<EvidenceItemHandoffDecision> = {},
): EvidenceItemHandoffDecision {
  const base: EvidenceItemHandoffDecision = {
    decisionVersion: "v2.evidence-lifecycle.evidence-item-handoff.x7w5f",
    decisionId: "EVIDENCE_ITEM_HANDOFF_W7A_TEST",
    kind: "evidence_item_handoff",
    handoffStatus: "evidence_items_ready_for_downstream_internal_handoff",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parentW5ArtifactId: "BOUNDED_EVIDENCE_EXTRACTION_W7A_TEST",
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
    decisionId: "SUFFICIENCY_INTAKE_W7A_TEST",
    kind: "sufficiency_intake",
    intakeStatus: "sufficiency_intake_ready_for_contract_only_assessment",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parentEvidenceItemHandoffDecisionId: "EVIDENCE_ITEM_HANDOFF_W7A_TEST",
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
    decisionId: "SUFFICIENCY_ASSESSMENT_W7A_TEST",
    kind: "sufficiency_assessment",
    assessmentStatus: "sufficiency_assessment_completed",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parentSufficiencyIntakeDecisionId: "SUFFICIENCY_INTAKE_W7A_TEST",
    parentSufficiencyIntakeDecisionVersion: "v2.evidence-lifecycle.sufficiency-intake.w6b",
    parentW5DecisionId: "BOUNDED_EVIDENCE_EXTRACTION_W7A_TEST",
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

function build(
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

describe("boundary/verdict candidate contract", () => {
  it("creates a contract-only non-semantic W7-A scaffold from accepted W6-C sufficiency", () => {
    const decision = build();

    expect(decision).toMatchObject({
      decisionVersion: BOUNDARY_VERDICT_CANDIDATE_DECISION_VERSION,
      kind: "boundary_verdict_candidate_contract",
      contractMode: "contract_only_non_semantic",
      status: "boundary_verdict_candidate_ready",
      blockedReason: null,
      damagedReason: null,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      candidatePopulation: "closed_until_llm_task_approved",
      w4iDependency: "none",
      w8aReadiness: "ready_for_internal_alpha_report_contract",
    });
    expect(decision.inputLineage).toMatchObject({
      evidenceItemHandoffDecisionId: "EVIDENCE_ITEM_HANDOFF_W7A_TEST",
      sufficiencyIntakeDecisionId: "SUFFICIENCY_INTAKE_W7A_TEST",
      sufficiencyAssessmentDecisionId: "SUFFICIENCY_ASSESSMENT_W7A_TEST",
    });
    expect(decision.sufficiencyGate).toEqual({
      sufficiencyResultStatus: "accepted",
      recommendedNextAction: "continue_to_boundary_formation",
      stopReason: null,
      nonVerdictStopArtifact: false,
    });
    expect(decision.boundaryCandidates).toEqual([]);
    expect(decision.verdictCandidate).toBeNull();
  });

  it("stops before verdict/report candidates when W6-C recommends retrieval refinement or damage", () => {
    const refine = build({
      assessment: {
        reportStopRecommendation: "refine_retrieval",
      },
    });
    const damage = build({
      assessment: {
        reportStopRecommendation: "damage_report",
      },
    });

    expect(refine.status).toBe("boundary_verdict_candidate_blocked");
    expect(refine.blockedReason).toBe("sufficiency_stop_refine_retrieval");
    expect(refine.sufficiencyGate.nonVerdictStopArtifact).toBe(true);
    expect(refine.boundaryCandidates).toEqual([]);
    expect(refine.verdictCandidate).toBeNull();

    expect(damage.status).toBe("boundary_verdict_candidate_blocked");
    expect(damage.blockedReason).toBe("sufficiency_stop_damage_report");
    expect(damage.sufficiencyGate.nonVerdictStopArtifact).toBe(true);
    expect(damage.w8aReadiness).toBe("blocked_before_report_contract");
  });

  it("fails closed on missing, blocked, damaged, and mismatched parents", () => {
    const missingAssessment = buildBoundaryVerdictCandidateDecision({
      evidenceItemHandoff: evidenceItemHandoff(),
      sufficiencyIntake: sufficiencyIntake(),
      sufficiencyAssessment: null,
    });
    const blockedAssessment = build({
      assessment: {
        assessmentStatus: "sufficiency_assessment_blocked",
        blockedReason: "task_policy_not_executable",
      },
    });
    const intakeMismatch = build({
      intake: {
        parentEvidenceItemHandoffDecisionId: "OTHER_HANDOFF",
      },
    });
    const assessmentMismatch = build({
      assessment: {
        parentSufficiencyIntakeDecisionId: "OTHER_INTAKE",
      },
    });
    const sideEffectOpen = build({
      assessment: {
        sideEffects: {
          ...sufficiencyAssessment().sideEffects,
          verdictGenerated: true as false,
        },
      },
    });

    expect(missingAssessment.status).toBe("boundary_verdict_candidate_blocked");
    expect(missingAssessment.blockedReason).toBe("sufficiency_assessment_missing");
    expect(blockedAssessment.status).toBe("boundary_verdict_candidate_blocked");
    expect(blockedAssessment.blockedReason).toBe("sufficiency_assessment_not_completed");
    expect(intakeMismatch.status).toBe("boundary_verdict_candidate_damaged");
    expect(intakeMismatch.damagedReason).toBe("lineage_projection_mismatch");
    expect(assessmentMismatch.status).toBe("boundary_verdict_candidate_damaged");
    expect(assessmentMismatch.damagedReason).toBe("lineage_projection_mismatch");
    expect(sideEffectOpen.status).toBe("boundary_verdict_candidate_blocked");
    expect(sideEffectOpen.blockedReason).toBe("side_effects_not_closed");
  });

  it("keeps default projection text-free and never returns semantic candidates in contract-only mode", () => {
    const parentWithUnsafeText = {
      ...evidenceItemHandoff(),
      statement: SENTINEL,
      sourceText: SENTINEL,
      inputText: SENTINEL,
      summary: SENTINEL,
      hiddenLedgerId: SENTINEL,
      internalStatus: SENTINEL,
      providerPayload: { body: SENTINEL },
    } as unknown as EvidenceItemHandoffDecision;
    const decision = buildBoundaryVerdictCandidateDecision({
      evidenceItemHandoff: parentWithUnsafeText,
      sufficiencyIntake: sufficiencyIntake(),
      sufficiencyAssessment: sufficiencyAssessment(),
    });
    const serialized = JSON.stringify(decision);

    expect(decision.status).toBe("boundary_verdict_candidate_ready");
    expect(decision.boundaryCandidates).toEqual([]);
    expect(decision.verdictCandidate).toBeNull();
    expect(decision.redaction).toEqual({
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
      summaryTextReturned: false,
      providerPayloadReturned: false,
      promptTextReturned: false,
      hiddenLedgerReferenceReturned: false,
      internalStateReturned: false,
    });
    expect(serialized).not.toContain(SENTINEL);
    expect(serialized).not.toContain("hiddenLedgerId");
    expect(serialized).not.toContain("internalStatus");
    expect(serialized).not.toContain("truthPercentage");
    expect(serialized).not.toContain("confidenceTier");
  });

  it("uses allowlisted parent fields and has no direct W4-I, product, prompt, provider, or public dependency", () => {
    const source = readFileSync(
      path.resolve(
        process.cwd(),
        "src/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate.ts",
      ),
      "utf8",
    );

    expect(source).not.toContain("...evidenceItemHandoff");
    expect(source).not.toContain("...sufficiencyIntake");
    expect(source).not.toContain("...sufficiencyAssessment");
    expect(source).not.toContain("JSON.stringify(evidenceItemHandoff");
    expect(source).not.toContain("JSON.stringify(sufficiencyIntake");
    expect(source).not.toContain("JSON.stringify(sufficiencyAssessment");
    expect(source).not.toContain("execution-readiness");
    expect(source).not.toContain("artifact-sink");
    expect(source).not.toContain("prompt-loader");
    expect(source).not.toContain("model-adapter");
    expect(source).not.toContain("gateway/");
    expect(source).not.toContain("@/app");
    expect(source).not.toContain("source-reliability");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("truthPercentage");
    expect(source).not.toContain("reportMarkdown");
  });
});
