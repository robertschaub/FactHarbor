import { describe, expect, it } from "vitest";
import {
  CLAIM_UNDERSTANDING_STAGE_HANDOFF_VERSION,
  type ClaimUnderstandingStageHandoff,
} from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import { CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION } from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  type ClaimContract,
} from "@/lib/analyzer-v2/claim-understanding/types";
import { buildEvidenceLifecycleIntake } from "@/lib/analyzer-v2/evidence-lifecycle/intake";
import type { EvidenceLifecycleStartDecision } from "@/lib/analyzer-v2/evidence-lifecycle/types";
import { buildSourceAcquisitionRequest } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request";
import {
  buildStaticEvidenceTaskPolicySnapshot,
  readStaticEvidenceRetrievalPolicyCatalog,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy";
import { buildClaimBoundaryV2RunContext, type PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";

function buildContext(input: string, detectedLanguage = "en"): PipelineRunContext {
  const ingress: ClaimBoundaryV2Ingress = {
    runIdHint: `job-v2-source-acquisition-${detectedLanguage}`,
    submitted: {
      kind: "text",
      value: input,
    },
    preparedSeed: {
      acsSnapshot: {
        resolvedInputText: input,
        preparedUnderstanding: {
          detectedInputType: "text",
          detectedLanguage,
          atomicClaims: [
            {
              id: "AC_DIRECT_01",
              statement: input,
            },
          ],
        },
      },
      acsSnapshotHash: `acs-${detectedLanguage}`,
      inputGroundingSeedHash: `grounding-${detectedLanguage}`,
    },
    selectedAtomicClaimIds: ["AC_DIRECT_01"],
  };

  return buildClaimBoundaryV2RunContext(ingress, {
    now: () => new Date("2026-05-15T11:00:00.000Z"),
  });
}

function claimContract(statement: string, detectedLanguage = "en"): ClaimContract {
  return {
    schemaVersion: CLAIM_CONTRACT_V2_SCHEMA_VERSION,
    input: {
      inputType: "text",
      inputValue: statement,
      resolvedInputText: statement,
      detectedLanguage,
      selectedAtomicClaimIds: ["AC_DIRECT_01"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: statement,
      resolvedInputText: statement,
      detectedLanguage,
      currentDate: "2026-05-15",
      acsSnapshotHash: null,
      inputGroundingSeedHash: `direct-input-grounding-${detectedLanguage}`,
    },
    atomicClaims: [
      {
        id: "AC_DIRECT_01",
        statement,
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "Claim Understanding accepted the direct input.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

function acceptedHandoff(contract: ClaimContract): Extract<ClaimUnderstandingStageHandoff, { status: "accepted" }> {
  return {
    handoffVersion: CLAIM_UNDERSTANDING_STAGE_HANDOFF_VERSION,
    visibility: "internal_only",
    runtimeStageVersion: CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION,
    runtimeStatus: "runtime_dispatch_completed",
    inputSource: "direct_input",
    selectedAtomicClaimIds: contract.input.selectedAtomicClaimIds,
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "executable",
    cacheEligibility: "runtime_no_store",
    integrityEventSummaries: [],
    status: "accepted",
    claimContract: contract,
    blockedReason: null,
    damagedReason: null,
    downstreamStart: {
      evidenceLifecycleStatus: "blocked_precutover",
      reason: "public_cutover_not_approved",
    },
  };
}

function readyDecision(statement: string, detectedLanguage = "en"): EvidenceLifecycleStartDecision {
  const context = buildContext(statement, detectedLanguage);
  return buildEvidenceLifecycleIntake(context, acceptedHandoff(claimContract(statement, detectedLanguage)));
}

function policyComparable(decision: ReturnType<typeof buildSourceAcquisitionRequest>) {
  return {
    policySnapshot: decision.request?.policySnapshot,
    retrievalPolicyCatalog: decision.request?.retrievalPolicyCatalog,
  };
}

describe("analyzer-v2 Evidence Lifecycle source-acquisition request", () => {
  it("creates a non-executable source-acquisition request from ready intake", () => {
    const statement = "Using hydrogen for cars is more efficient than using electricity";
    const claim = claimContract(statement);
    const decision = buildEvidenceLifecycleIntake(buildContext(statement), acceptedHandoff(claim));

    const sourceDecision = buildSourceAcquisitionRequest(decision);

    expect(sourceDecision).toMatchObject({
      decisionVersion: "v2.evidence-lifecycle.source-acquisition-request.0",
      visibility: "internal_only",
      status: "source_acquisition_ready_not_executable",
      blockedReason: null,
      sourceEvidenceLifecycleStatus: "intake_ready",
      request: {
        requestVersion: "v2.evidence-lifecycle.source-acquisition-request.0",
        visibility: "internal_only",
        executionScope: "contract_only_no_provider_execution",
        sourceAcquisitionStatus: "ready_not_executable",
        intake: {
          intakeVersion: "v2.evidence-lifecycle.intake.0",
          selectedAtomicClaimIds: ["AC_DIRECT_01"],
          runId: "job-v2-source-acquisition-en",
          currentDate: "2026-05-15",
          detectedLanguage: "en",
        },
      },
    });
    expect(sourceDecision.request?.claimContract).toBe(claim);
  });

  it("keeps the policy snapshot static with only approved hidden execution tasks executable", () => {
    const sourceDecision = buildSourceAcquisitionRequest(readyDecision("Plastic recycling is pointless"));

    expect(sourceDecision.request?.policySnapshot).toEqual({
      snapshotVersion: "v2.evidence-lifecycle.task-policy.0",
      source: "static_contract_only",
      policyStatus: "query_planning_applicability_and_evidence_extraction_hidden_internal_executable",
      plannedTasks: [
        {
          taskKey: "evidence_query_planning",
          status: "hidden_internal_executable",
          promptSectionId: "V2_EVIDENCE_QUERY_PLANNING",
          outputSchemaVersion: "v2.evidence_query_planning_result.0",
          promptApprovalStatus: "approved",
          modelPolicyStatus: "approved",
          executionAuthority: "gateway_executable_hidden_internal",
        },
        {
          taskKey: "evidence_applicability",
          status: "hidden_internal_executable",
          promptSectionId: "V2_EVIDENCE_APPLICABILITY",
          outputSchemaVersion: "v2.evidence_applicability_result.0",
          promptApprovalStatus: "approved",
          modelPolicyStatus: "approved",
          executionAuthority: "gateway_executable_hidden_internal",
        },
        {
          taskKey: "evidence_extraction",
          status: "hidden_internal_executable",
          promptSectionId: "V2_EVIDENCE_EXTRACTION",
          outputSchemaVersion: "v2.evidence_extraction_result.0",
          promptApprovalStatus: "approved",
          modelPolicyStatus: "approved",
          executionAuthority: "gateway_executable_hidden_internal",
        },
        {
          taskKey: "evidence_sufficiency",
          status: "symbolic_not_executable",
          promptSectionId: "V2_EVIDENCE_SUFFICIENCY_GATE",
          outputSchemaVersion: "v2.evidence_sufficiency_assessment.0",
          promptApprovalStatus: "missing",
          modelPolicyStatus: "not_approved",
          executionAuthority: "not_executable",
        },
      ],
      retrievalPolicyCatalog: [
        { policyKey: "baseline_research", status: "planned_not_executable", source: "static_contract_only" },
        { policyKey: "primary_source_refinement", status: "planned_not_executable", source: "static_contract_only" },
        { policyKey: "contradiction_search", status: "planned_not_executable", source: "static_contract_only" },
        { policyKey: "supplementary_language_lane", status: "planned_not_executable", source: "static_contract_only" },
        { policyKey: "evidence_scarcity_handling", status: "planned_not_executable", source: "static_contract_only" },
      ],
      cachePolicy: "no_store_no_read",
      providerExecution: "query_planning_applicability_and_bounded_evidence_extraction_wired_hidden_internal",
      promptModelExecution: "query_planning_applicability_and_bounded_evidence_extraction_approved_only",
      publicExposure: "forbidden",
      sourceReliabilityIntegration: "thin_port_pending",
      sourceLanguagePolicy: "source_language_first_query_planning_approved",
    });
  });

  it("fails closed for blocked Evidence Lifecycle decisions", () => {
    const blockedDecision: EvidenceLifecycleStartDecision = {
      decisionVersion: "v2.evidence-lifecycle.intake.0",
      visibility: "internal_only",
      status: "blocked",
      intake: null,
      blockedReason: "claim_understanding_blocked",
      sourceHandoffStatus: "blocked",
      sourceBlockedReason: "no_valid_claim",
      sourceDamagedReason: null,
    };

    expect(buildSourceAcquisitionRequest(blockedDecision)).toEqual({
      decisionVersion: "v2.evidence-lifecycle.source-acquisition-request.0",
      visibility: "internal_only",
      status: "blocked",
      request: null,
      blockedReason: "evidence_lifecycle_blocked",
      sourceEvidenceLifecycleStatus: "blocked",
    });
  });

  it("fails closed for malformed ready decisions", () => {
    const missingIntake = {
      ...readyDecision("Plastic recycling is pointless"),
      intake: null,
    } as unknown as EvidenceLifecycleStartDecision;
    const missingClaimContract = {
      ...readyDecision("Plastic recycling is pointless"),
      intake: {
        ...(readyDecision("Plastic recycling is pointless") as Extract<EvidenceLifecycleStartDecision, { status: "intake_ready" }>).intake,
        claimContract: null,
      },
    } as unknown as EvidenceLifecycleStartDecision;

    expect(buildSourceAcquisitionRequest(missingIntake)).toMatchObject({
      status: "blocked",
      request: null,
      blockedReason: "evidence_lifecycle_intake_missing",
    });
    expect(buildSourceAcquisitionRequest(missingClaimContract)).toMatchObject({
      status: "blocked",
      request: null,
      blockedReason: "claim_contract_missing",
    });
  });

  it("keeps policy catalog independent of claim wording", () => {
    const left = buildSourceAcquisitionRequest(readyDecision("Plastic recycling is pointless"));
    const right = buildSourceAcquisitionRequest(
      readyDecision("Using hydrogen for cars is more efficient than using electricity"),
    );

    expect(policyComparable(left)).toEqual(policyComparable(right));
  });

  it("keeps policy catalog independent of detected language", () => {
    const english = buildSourceAcquisitionRequest(
      readyDecision("Using hydrogen for cars is more efficient than using electricity", "en"),
    );
    const german = buildSourceAcquisitionRequest(
      readyDecision("Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz", "de"),
    );

    expect(policyComparable(english)).toEqual(policyComparable(german));
    expect(english.request?.intake.detectedLanguage).toBe("en");
    expect(german.request?.intake.detectedLanguage).toBe("de");
  });

  it("uses the shared task-policy snapshot shape", () => {
    const sourceDecision = buildSourceAcquisitionRequest(readyDecision("Plastic recycling is pointless"));

    expect(sourceDecision.request?.policySnapshot).toEqual(buildStaticEvidenceTaskPolicySnapshot());
    expect(sourceDecision.request?.retrievalPolicyCatalog).toEqual(readStaticEvidenceRetrievalPolicyCatalog());
  });
});
