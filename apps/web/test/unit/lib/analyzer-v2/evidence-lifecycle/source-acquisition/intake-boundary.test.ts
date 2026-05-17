import { describe, expect, it } from "vitest";
import {
  buildSourceAcquisitionIntakeBoundaryDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary";
import type {
  QueryPlanSourceAcquisitionHandoff,
  QueryPlanSourceAcquisitionHandoffDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import type {
  SourceAcquisitionRequest,
  SourceAcquisitionStartDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";

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
      runId: "job-v2-x7v-intake",
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

describe("Analyzer V2 Source Acquisition intake boundary", () => {
  it("accepts a ready Query Planning handoff and Source Acquisition request as intake-ready but non-executable", () => {
    const decision = buildSourceAcquisitionIntakeBoundaryDecision({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
    });

    expect(decision).toMatchObject({
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
    });
    expect(JSON.stringify(decision)).not.toContain("Asylbereich Schweiz Statistik");
    expect(JSON.stringify(decision)).not.toContain("Mehr als 235");
  });

  it("blocks when Query Planning did not produce a ready handoff", () => {
    const decision = buildSourceAcquisitionIntakeBoundaryDecision({
      handoffDecision: {
        decisionVersion: "v2.evidence-lifecycle.query-plan-source-acquisition-handoff.0",
        visibility: "internal_only",
        status: "blocked",
        handoff: null,
        blockedReason: "query_planning_not_accepted",
      },
      sourceAcquisitionStartDecision: readyStartDecision(),
    });

    expect(decision).toMatchObject({
      status: "blocked_pre_source_acquisition",
      blockedReason: "query_plan_handoff_not_ready",
      queryEntryCount: 0,
      sourceLanguageSignal: "unavailable",
    });
  });

  it("blocks when Source Acquisition request is not ready", () => {
    const decision = buildSourceAcquisitionIntakeBoundaryDecision({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: {
        decisionVersion: "v2.evidence-lifecycle.source-acquisition-request.0",
        visibility: "internal_only",
        status: "blocked",
        request: null,
        blockedReason: "evidence_lifecycle_blocked",
        sourceEvidenceLifecycleStatus: "blocked",
      },
    });

    expect(decision).toMatchObject({
      status: "blocked_pre_source_acquisition",
      blockedReason: "source_acquisition_request_blocked",
      selectedAtomicClaimCount: 1,
      queryEntryCount: 1,
      sourceLanguageSignal: "present",
    });
  });

  it("blocks mismatched selected AtomicClaim ids without inferring a replacement set", () => {
    const decision = buildSourceAcquisitionIntakeBoundaryDecision({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(sourceRequest({
        intake: {
          ...sourceRequest().intake,
          selectedAtomicClaimIds: ["AC_002"],
        },
      })),
    });

    expect(decision).toMatchObject({
      status: "blocked_pre_source_acquisition",
      blockedReason: "selected_claim_ids_mismatch",
      selectedAtomicClaimCount: 1,
      queryEntryCount: 1,
    });
  });
});
