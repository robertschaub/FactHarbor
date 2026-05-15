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
import { buildSourceAcquisitionRequest } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request";
import type { SourceAcquisitionStartDecision } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types";
import { buildEvidenceCorpusPreExecutionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision";
import { buildClaimBoundaryV2RunContext, type PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";

function buildContext(input: string, detectedLanguage = "en"): PipelineRunContext {
  const ingress: ClaimBoundaryV2Ingress = {
    runIdHint: `job-v2-evidence-corpus-${detectedLanguage}`,
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

function readySourceDecision(statement: string, detectedLanguage = "en"): SourceAcquisitionStartDecision {
  const context = buildContext(statement, detectedLanguage);
  const intakeDecision = buildEvidenceLifecycleIntake(
    context,
    acceptedHandoff(claimContract(statement, detectedLanguage)),
  );

  return buildSourceAcquisitionRequest(intakeDecision);
}

function comparable(decision: ReturnType<typeof buildEvidenceCorpusPreExecutionDecision>) {
  return {
    executionScope: decision.executionScope,
    status: decision.status,
    notBuiltReason: decision.notBuiltReason,
    blockedReason: decision.blockedReason,
    evidenceCorpus: decision.evidenceCorpus,
    taskPolicySnapshot: decision.taskPolicySnapshot,
    retrievalPolicyCatalog: decision.retrievalPolicyCatalog,
  };
}

function objectKeys(value: unknown): string[] {
  return value && typeof value === "object" ? Object.keys(value) : [];
}

describe("analyzer-v2 Evidence Lifecycle evidence-corpus build decision", () => {
  it("creates a not-built pre-execution decision from ready source acquisition", () => {
    const sourceDecision = readySourceDecision("Using hydrogen for cars is more efficient than using electricity");

    const corpusDecision = buildEvidenceCorpusPreExecutionDecision(sourceDecision);

    expect(corpusDecision).toMatchObject({
      decisionVersion: "v2.evidence-lifecycle.evidence-corpus-build-decision.0",
      visibility: "internal_only",
      executionScope: "contract_only_no_corpus_execution",
      status: "not_built_pre_execution",
      notBuiltReason: "source_acquisition_not_executable",
      blockedReason: null,
      evidenceCorpus: null,
      sourceAcquisition: {
        decisionVersion: "v2.evidence-lifecycle.source-acquisition-request.0",
        decisionStatus: "source_acquisition_ready_not_executable",
        requestVersion: "v2.evidence-lifecycle.source-acquisition-request.0",
        requestStatus: "ready_not_executable",
        upstreamBlockedReason: null,
        sourceEvidenceLifecycleStatus: "intake_ready",
      },
    });
    expect(corpusDecision.claimContract).toBe(sourceDecision.request?.claimContract);
    expect(corpusDecision.taskPolicySnapshot).toBe(sourceDecision.request?.policySnapshot);
    expect(corpusDecision.retrievalPolicyCatalog).toBe(sourceDecision.request?.retrievalPolicyCatalog);
  });

  it("fails closed for blocked source-acquisition decisions", () => {
    const sourceDecision: SourceAcquisitionStartDecision = {
      decisionVersion: "v2.evidence-lifecycle.source-acquisition-request.0",
      visibility: "internal_only",
      status: "blocked",
      request: null,
      blockedReason: "evidence_lifecycle_blocked",
      sourceEvidenceLifecycleStatus: "blocked",
    };

    expect(buildEvidenceCorpusPreExecutionDecision(sourceDecision)).toEqual({
      decisionVersion: "v2.evidence-lifecycle.evidence-corpus-build-decision.0",
      visibility: "internal_only",
      executionScope: "contract_only_no_corpus_execution",
      status: "blocked_pre_execution",
      notBuiltReason: null,
      blockedReason: "source_acquisition_blocked",
      evidenceCorpus: null,
      claimContract: null,
      taskPolicySnapshot: null,
      retrievalPolicyCatalog: null,
      sourceAcquisition: {
        decisionVersion: "v2.evidence-lifecycle.source-acquisition-request.0",
        decisionStatus: "blocked",
        requestVersion: null,
        requestStatus: null,
        upstreamBlockedReason: "evidence_lifecycle_blocked",
        sourceEvidenceLifecycleStatus: "blocked",
      },
    });
  });

  it("fails closed for malformed ready source-acquisition decisions", () => {
    const ready = readySourceDecision("Plastic recycling is pointless");
    const readyRequest = (ready as Extract<SourceAcquisitionStartDecision, {
      status: "source_acquisition_ready_not_executable";
    }>).request;

    const cases: Array<[SourceAcquisitionStartDecision, string]> = [
      [
        { ...ready, request: null } as unknown as SourceAcquisitionStartDecision,
        "source_acquisition_request_missing",
      ],
      [
        {
          ...ready,
          request: { ...readyRequest, claimContract: null },
        } as unknown as SourceAcquisitionStartDecision,
        "claim_contract_missing",
      ],
      [
        {
          ...ready,
          request: { ...readyRequest, policySnapshot: null },
        } as unknown as SourceAcquisitionStartDecision,
        "task_policy_provenance_missing",
      ],
      [
        {
          ...ready,
          request: { ...readyRequest, retrievalPolicyCatalog: [] },
        } as unknown as SourceAcquisitionStartDecision,
        "retrieval_policy_catalog_missing",
      ],
    ];

    for (const [sourceDecision, blockedReason] of cases) {
      expect(buildEvidenceCorpusPreExecutionDecision(sourceDecision)).toMatchObject({
        status: "blocked_pre_execution",
        notBuiltReason: null,
        blockedReason,
        evidenceCorpus: null,
        claimContract: null,
        taskPolicySnapshot: null,
        retrievalPolicyCatalog: null,
      });
    }
  });

  it("does not fabricate evidence, source, warning, sufficiency, or public report fields", () => {
    const corpusDecision = buildEvidenceCorpusPreExecutionDecision(
      readySourceDecision("Using hydrogen for cars is more efficient than using electricity"),
    );

    expect(objectKeys(corpusDecision)).not.toEqual(expect.arrayContaining([
      "sources",
      "evidenceItems",
      "warnings",
      "qualityGates",
      "sufficiency",
      "sufficiencyStatus",
      "sourceReliability",
      "reportMarkdown",
      "compatibilityView",
      "publicResult",
    ]));
    expect(corpusDecision.evidenceCorpus).toBeNull();
  });

  it("keeps pre-execution status independent of claim wording and detected language", () => {
    const hydrogen = buildEvidenceCorpusPreExecutionDecision(
      readySourceDecision("Using hydrogen for cars is more efficient than using electricity", "en"),
    );
    const asylum = buildEvidenceCorpusPreExecutionDecision(
      readySourceDecision("Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz", "de"),
    );

    expect(comparable(hydrogen)).toEqual(comparable(asylum));
  });
});
