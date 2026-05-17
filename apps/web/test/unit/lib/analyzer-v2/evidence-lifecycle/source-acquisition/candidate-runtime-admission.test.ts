import { describe, expect, it } from "vitest";
import {
  buildSourceAcquisitionCandidateBudgetSnapshot,
  buildSourceAcquisitionCandidateProviderAllowlistSnapshot,
  buildSourceAcquisitionCandidateRuntimeAdmissionAuthoritySnapshot,
  buildSourceAcquisitionCandidateRuntimeAdmissionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-admission";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
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
        rationale: "German remains primary.",
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
      rationale: "German remains primary.",
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
        queryId: "EQ_001",
        retrievalPolicyKey: "baseline_research",
        queryText: "Asylbereich Schweiz Statistik",
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
      runId: "job-v2-x7w1a-admission",
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

describe("Analyzer V2 Source Acquisition candidate-runtime admission", () => {
  it("admits the product route after X7-V while keeping candidate runtime execution closed", () => {
    const decision = buildSourceAcquisitionCandidateRuntimeAdmissionDecision({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
    });
    const serialized = JSON.stringify(decision);

    expect(decision).toMatchObject({
      admissionVersion: "v2.evidence-lifecycle.source-acquisition-candidate-runtime-admission.x7w1a",
      visibility: "internal_only",
      status: "admission_ready_no_runtime_execution",
      blockedReason: null,
      handoffStatus: "ready_not_executable",
      requestStatus: "source_acquisition_ready_not_executable",
      intakeStatus: "intake_ready_not_executable",
      admissionScope: "admission_only_no_runtime_execution",
      selectedAtomicClaimCount: 1,
      queryEntryCount: 1,
      retrievalPolicyCount: 1,
      sourceLanguageSignal: "present",
      candidateRuntimePosture: {
        productAdmissionAuthority: "approved_x7w1a_admission_only",
        candidateRuntimeAuthority: "not_authorized",
        candidateProviderAuthority: "not_authorized",
        sourceExecutionAuthority: "blocked_precutover",
        publicExposure: "forbidden",
      },
      telemetry: {
        admittedQueryCount: 1,
        providerAttemptCount: 0,
        candidateCount: 0,
        totalCandidateCount: 0,
        bytesRead: 0,
        candidateRuntimeExecuted: false,
        candidateProviderInvoked: false,
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
        reportGenerated: false,
        verdictGenerated: false,
        publicSurfaceWritten: false,
      },
      publicCutoverStatus: "blocked_precutover",
    });
    expect(decision.admissionAuthoritySnapshotHash).toMatch(/^[0-9a-f]{64}$/);
    expect(decision.providerAllowlistSnapshotHash).toMatch(/^[0-9a-f]{64}$/);
    expect(decision.candidateBudgetSnapshotHash).toMatch(/^[0-9a-f]{64}$/);
    for (const forbidden of [
      "Asylbereich Schweiz Statistik",
      "Mehr als 235",
      "queryText",
      "EvidenceItem",
      "reportMarkdown",
      "truthPercentage",
      "confidence",
      "cacheKey",
      "parsedContent",
      "https://example.invalid",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("blocks when X7-V intake has not reached intake-ready", () => {
    const decision = buildSourceAcquisitionCandidateRuntimeAdmissionDecision({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision({
        status: "blocked_pre_source_acquisition",
        blockedReason: "source_language_policy_missing",
        sourceLanguageSignal: "unavailable",
      }),
    });

    expect(decision).toMatchObject({
      status: "blocked_pre_candidate_runtime_admission",
      blockedReason: "source_acquisition_intake_not_ready",
      telemetry: {
        providerAttemptCount: 0,
        candidateRuntimeExecuted: false,
        candidateProviderInvoked: false,
        providerNetworkExecuted: false,
        searchFetchCalled: false,
      },
    });
  });

  it("blocks stale product admission authority snapshots", () => {
    const authority = {
      ...buildSourceAcquisitionCandidateRuntimeAdmissionAuthoritySnapshot(),
      packageCommit: "0000000" as "14b930f6",
    };

    const decision = buildSourceAcquisitionCandidateRuntimeAdmissionDecision({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
      admissionAuthoritySnapshot: authority,
    });

    expect(decision).toMatchObject({
      status: "blocked_pre_candidate_runtime_admission",
      blockedReason: "admission_authority_invalid",
      providerAllowlistSnapshotHash: null,
      candidateBudgetSnapshotHash: null,
    });
  });

  it("blocks mismatched provider allowlist and budget snapshots", () => {
    const authority = buildSourceAcquisitionCandidateRuntimeAdmissionAuthoritySnapshot();
    const allowlist = {
      ...buildSourceAcquisitionCandidateProviderAllowlistSnapshot({
        queryEntryCount: 1,
        admissionAuthoritySnapshotHash: authority.authoritySnapshotHash,
      }),
      providerAllowlistSnapshotHash: "stale",
    };
    const budget = {
      ...buildSourceAcquisitionCandidateBudgetSnapshot({
        handoff: handoff(),
        request: sourceRequest(),
      }),
      budgetSnapshotHash: "stale",
    };

    expect(buildSourceAcquisitionCandidateRuntimeAdmissionDecision({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
      admissionAuthoritySnapshot: authority,
      providerAllowlistSnapshot: allowlist,
    })).toMatchObject({
      status: "blocked_pre_candidate_runtime_admission",
      blockedReason: "provider_allowlist_invalid",
    });

    expect(buildSourceAcquisitionCandidateRuntimeAdmissionDecision({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
      admissionAuthoritySnapshot: authority,
      candidateBudgetSnapshot: budget,
    })).toMatchObject({
      status: "blocked_pre_candidate_runtime_admission",
      blockedReason: "candidate_budget_invalid",
    });
  });
});
