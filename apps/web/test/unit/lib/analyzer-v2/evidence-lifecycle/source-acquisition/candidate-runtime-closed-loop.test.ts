import { describe, expect, it } from "vitest";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import {
  buildSourceAcquisitionCandidateRuntimeAdmissionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-admission";
import {
  buildSourceAcquisitionCandidateRuntimeClosedLoopAuthoritySnapshot,
  runSourceAcquisitionCandidateRuntimeClosedLoop,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-closed-loop";
import type {
  QueryPlanSourceAcquisitionHandoff,
  QueryPlanSourceAcquisitionHandoffDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import type {
  SourceAcquisitionIntakeBoundaryDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary";
import type {
  SourceAcquisitionRequest,
  SourceAcquisitionStartDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types";

const POISON_QUERY_TEXT = "https://example.invalid/source?secret=sk_test_query_text";
const POISON_QUERY_ID = "https://example.invalid/query-id/sk_test_query_id";
const POISON_LANGUAGE_RATIONALE = "language policy contains sk_test_language and https://example.invalid/lang";

function claimContract(): ClaimContract {
  return {
    schemaVersion: "v2.claim_contract.0",
    input: {
      inputType: "text",
      inputValue: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      resolvedInputText: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      detectedLanguage: "de",
      selectedAtomicClaimIds: ["AC_001"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      resolvedInputText: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      detectedLanguage: "de",
      currentDate: "2026-05-17",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "seed-hash",
    },
    atomicClaims: [
      {
        id: "AC_001",
        statement: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz.",
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "One selected assertion.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

function handoff(overrides: Partial<QueryPlanSourceAcquisitionHandoff> = {}): QueryPlanSourceAcquisitionHandoff {
  return {
    handoffVersion: "v2.evidence-lifecycle.query-plan-source-acquisition-handoff.0",
    visibility: "internal_only",
    executionScope: "not_executable",
    sourceAcquisitionStatus: "ready_not_executable",
    selectedAtomicClaimIds: ["AC_001"],
    queryPlanResultSchemaVersion: "v2.evidence_query_planning_result.0",
    queryPlanningStatus: "accepted",
    inspection: {
      inspectionVersion: "v2.evidence-query-planning.inspection.0",
      resultStatus: "accepted",
      selectedAtomicClaimIds: ["AC_001"],
      selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
      queryEntryCount: 1,
      sourceLanguagePolicy: {
        primaryLanguage: "de",
        supplementaryLanguageDecision: "needed",
        rationale: POISON_LANGUAGE_RATIONALE,
      },
      structuralCoverage: {
        selectedAtomicClaimCount: 1,
        queryCoveredClaimCount: 1,
        uncoveredSelectedAtomicClaimIds: [],
        partialCoverage: false,
        coverageJudgment: "structural_only_not_quality_assessment",
      },
      promptProvenance: {
        promptContentHash: "p".repeat(64),
        renderedPromptHash: "r".repeat(64),
        configSnapshotHash: "c".repeat(64),
        cacheDecisionReason: "no_store_runtime_dispatch_safety",
      },
      modelPolicyId: "v2.model.evidence_query_planning.0",
      cacheDecision: {
        namespace: "analyzer-v2:query",
        canRead: false,
        canWrite: false,
        reason: "no_store_runtime_dispatch_safety",
      },
    },
    promptProvenance: {
      promptContentHash: "p".repeat(64),
      renderedPromptHash: "r".repeat(64),
      configSnapshotHash: "c".repeat(64),
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
    },
    modelPolicyId: "v2.model.evidence_query_planning.0",
    cacheProvenance: {
      namespace: "analyzer-v2:query",
      reason: "no_store_runtime_dispatch_safety",
      canRead: false,
      canWrite: false,
    },
    sourceLanguagePolicy: {
      primaryLanguage: "de",
      supplementaryLanguageDecision: "needed",
      rationale: POISON_LANGUAGE_RATIONALE,
    },
    structuralCoverage: {
      selectedAtomicClaimCount: 1,
      queryCoveredClaimCount: 1,
      uncoveredSelectedAtomicClaimIds: [],
      partialCoverage: false,
      coverageJudgment: "structural_only_not_quality_assessment",
    },
    queryEntries: [
      {
        queryId: POISON_QUERY_ID,
        retrievalPolicyKey: "baseline_research",
        queryText: POISON_QUERY_TEXT,
        targetAtomicClaimIds: ["AC_001"],
      },
    ],
    ...overrides,
  };
}

function readyHandoffDecision(
  value: QueryPlanSourceAcquisitionHandoff = handoff(),
): QueryPlanSourceAcquisitionHandoffDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.query-plan-source-acquisition-handoff.0",
    visibility: "internal_only",
    status: "ready_not_executable",
    handoff: value,
    blockedReason: null,
  };
}

function sourceRequest(overrides: Partial<SourceAcquisitionRequest> = {}): SourceAcquisitionRequest {
  return {
    requestVersion: "v2.evidence-lifecycle.source-acquisition-request.0",
    visibility: "internal_only",
    executionScope: "contract_only_no_provider_execution",
    sourceAcquisitionStatus: "ready_not_executable",
    intake: {
      intakeVersion: "v2.evidence-lifecycle.intake.0",
      selectedAtomicClaimIds: ["AC_001"],
      runId: "job-v2-x7w1b-closed-loop",
      currentDate: "2026-05-17",
      detectedLanguage: "de",
    },
    policySnapshot: {
      snapshotVersion: "v2.evidence-lifecycle.task-policy.0",
      source: "static_contract_only",
      policyStatus: "query_planning_hidden_internal_executable",
      plannedTasks: [],
      retrievalPolicyCatalog: [],
      cachePolicy: "no_store_no_read",
      providerExecution: "not_wired",
      promptModelExecution: "query_planning_approved_only",
      publicExposure: "forbidden",
      sourceReliabilityIntegration: "thin_port_pending",
      sourceLanguagePolicy: "source_language_first_query_planning_approved",
    },
    retrievalPolicyCatalog: [
      { policyKey: "baseline_research", status: "planned_not_executable", source: "static_contract_only" },
    ],
    claimContract: claimContract(),
    ...overrides,
  };
}

function readyStartDecision(request = sourceRequest()): SourceAcquisitionStartDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.source-acquisition-request.0",
    visibility: "internal_only",
    status: "source_acquisition_ready_not_executable",
    request,
    blockedReason: null,
    sourceEvidenceLifecycleStatus: "intake_ready",
  };
}

function intakeDecision(
  overrides: Partial<SourceAcquisitionIntakeBoundaryDecision> = {},
): SourceAcquisitionIntakeBoundaryDecision {
  return {
    boundaryVersion: "v2.evidence-lifecycle.source-acquisition-intake-boundary.x7v",
    visibility: "internal_only",
    status: "intake_ready_not_executable",
    blockedReason: null,
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    executionScope: "not_executable",
    selectedAtomicClaimCount: 1,
    queryEntryCount: 1,
    retrievalPolicyCount: 1,
    sourceLanguageSignal: "present",
    executionPosture: {
      sourceExecutionAuthority: "blocked_precutover",
      providerNetworkAuthority: "not_authorized",
      parserAuthority: "not_authorized",
      publicExposure: "forbidden",
    },
    execution: {
      sourceAcquisitionExecuted: false,
      providerNetworkExecuted: false,
      searchFetchCalled: false,
      contentDereferenceCalled: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityCalled: false,
      sourceMaterialCreated: false,
      evidenceCorpusCreated: false,
      reportGenerated: false,
      verdictGenerated: false,
    },
    ...overrides,
  };
}

function readyAdmission(
  handoffDecision = readyHandoffDecision(),
  startDecision = readyStartDecision(),
  intake = intakeDecision(),
) {
  return buildSourceAcquisitionCandidateRuntimeAdmissionDecision({
    handoffDecision,
    sourceAcquisitionStartDecision: startDecision,
    sourceAcquisitionIntakeBoundary: intake,
  });
}

describe("Analyzer V2 Source Acquisition closed candidate-runtime loop", () => {
  it("exercises the runtime through a closed no-IO boundary without leaking query/provider inputs", async () => {
    const handoffDecision = readyHandoffDecision();
    const startDecision = readyStartDecision();
    const intake = intakeDecision();
    const decision = await runSourceAcquisitionCandidateRuntimeClosedLoop({
      handoffDecision,
      sourceAcquisitionStartDecision: startDecision,
      sourceAcquisitionIntakeBoundary: intake,
      candidateRuntimeAdmission: readyAdmission(handoffDecision, startDecision, intake),
    });
    const serialized = JSON.stringify(decision);

    expect(decision).toMatchObject({
      closedLoopVersion: "v2.evidence-lifecycle.source-acquisition-candidate-runtime-closed-loop.x7w1b",
      visibility: "internal_only",
      status: "closed_loop_completed_no_source_candidates",
      blockedReason: null,
      damagedReason: null,
      admissionStatus: "admission_ready_no_runtime_execution",
      runtimeStatus: "completed_structural",
      queryOutcomeSummaries: [
        {
          ordinal: 1,
          closedLoopQueryRef: "CLQ_001",
          status: "failed",
          structuralReason: "provider_failure",
          providerAttemptObserved: true,
          candidateCount: 0,
        },
      ],
      telemetry: {
        candidateRuntimeExercised: true,
        closedProviderBoundaryInvoked: true,
        providerAttemptCount: 1,
        candidateCount: 0,
        totalCandidateCount: 0,
        bytesRead: 0,
        providerNetworkExecuted: false,
        searchFetchCalled: false,
        contentDereferenceCalled: false,
        parserExecuted: false,
        cacheRead: false,
        cacheWrite: false,
        storageWrite: false,
        sourceReliabilityCalled: false,
        sourceMaterialCreated: false,
        evidenceCorpusCreated: false,
        evidenceItemGenerated: false,
        warningGenerated: false,
        reportGenerated: false,
        verdictGenerated: false,
        publicSurfaceWritten: false,
      },
      publicCutoverStatus: "blocked_precutover",
    });
    expect(decision.productClosedLoopAuthorityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(decision.runtimeContractAuthorityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(decision.providerAllowlistSnapshotHash).toMatch(/^[0-9a-f]{64}$/);
    expect(decision.candidateBudgetSnapshotHash).toMatch(/^[0-9a-f]{64}$/);
    for (const forbidden of [
      POISON_QUERY_TEXT,
      POISON_QUERY_ID,
      POISON_LANGUAGE_RATIONALE,
      "Mehr als 235",
      "queryText",
      "queryId",
      "sourceLanguagePolicy",
      "providerAttemptId",
      "SourceAcquisitionCandidateProviderAttemptRequest",
      "https://example.invalid",
      "sk_test",
      "EvidenceItem",
      "reportMarkdown",
      "truthPercentage",
      "confidence",
      "cacheKey",
      "parsedContent",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("blocks before runtime exercise when X7-W1A admission is not ready", async () => {
    const handoffDecision = readyHandoffDecision();
    const startDecision = readyStartDecision();
    const intake = intakeDecision({
      status: "blocked_pre_source_acquisition",
      blockedReason: "source_language_policy_missing",
      sourceLanguageSignal: "unavailable",
    });
    const admission = readyAdmission(handoffDecision, startDecision, intake);
    const decision = await runSourceAcquisitionCandidateRuntimeClosedLoop({
      handoffDecision,
      sourceAcquisitionStartDecision: startDecision,
      sourceAcquisitionIntakeBoundary: intake,
      candidateRuntimeAdmission: admission,
    });

    expect(decision).toMatchObject({
      status: "blocked_pre_closed_candidate_runtime_loop",
      blockedReason: "candidate_runtime_admission_not_ready",
      telemetry: {
        candidateRuntimeExercised: false,
        closedProviderBoundaryInvoked: false,
        providerAttemptCount: 0,
      },
    });
  });

  it("blocks stale product closed-loop authority before runtime exercise", async () => {
    const handoffDecision = readyHandoffDecision();
    const startDecision = readyStartDecision();
    const intake = intakeDecision();
    const staleAuthority = {
      ...buildSourceAcquisitionCandidateRuntimeClosedLoopAuthoritySnapshot(),
      packageCommit: "0000000" as "a0783c0b",
    };

    const decision = await runSourceAcquisitionCandidateRuntimeClosedLoop({
      handoffDecision,
      sourceAcquisitionStartDecision: startDecision,
      sourceAcquisitionIntakeBoundary: intake,
      candidateRuntimeAdmission: readyAdmission(handoffDecision, startDecision, intake),
      closedLoopAuthoritySnapshot: staleAuthority,
    });

    expect(decision).toMatchObject({
      status: "blocked_pre_closed_candidate_runtime_loop",
      blockedReason: "closed_loop_authority_invalid",
      runtimeStatus: null,
      queryOutcomeSummaries: [],
      telemetry: {
        candidateRuntimeExercised: false,
        closedProviderBoundaryInvoked: false,
        providerAttemptCount: 0,
      },
    });
  });
});
