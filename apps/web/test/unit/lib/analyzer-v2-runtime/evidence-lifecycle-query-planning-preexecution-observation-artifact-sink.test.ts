import { describe, expect, it } from "vitest";
import {
  EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_LEDGER_COUNT,
  EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_RECORDS_PER_LEDGER,
  EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_VERSION,
  buildEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact,
  clearEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts,
  readEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts,
  recordEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink";
import type {
  EvidenceQueryPlanningPreexecutionObservation,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation";

function acceptedObservation(
  overrides: Partial<EvidenceQueryPlanningPreexecutionObservation> = {},
): EvidenceQueryPlanningPreexecutionObservation {
  return {
    observationVersion: "v2.evidence-query-planning.preexecution-observation.x7o",
    visibility: "internal_only",
    status: "structural_prerequisites_observed_not_executed_precutover",
    blockedReason: null,
    sourceIntakeStatus: "intake_ready",
    inputScope: "direct_text_claim_contract",
    selectedAtomicClaimCount: 2,
    sourceLanguageSignal: "present",
    taskPolicy: {
      queryPlanningPolicySignal: "hidden_task_policy_observed_not_invoked",
      productExecutionAuthority: "product_invocation_blocked_precutover",
    },
    execution: {
      queryPlanningExecuted: false,
      promptLoaded: false,
      promptRendered: false,
      modelCalled: false,
      providerCallbackCreated: false,
      providerSearchFetchCalled: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityCalled: false,
    },
    ...overrides,
  };
}

function recordFor(
  ledgerId = "job-v2-x7o-artifact:precutover-observability",
  observation = acceptedObservation(),
) {
  return recordEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact({
    ledgerId,
    runId: ledgerId.replace(":precutover-observability", ""),
    createdUtc: "2026-05-17T03:00:00.000Z",
    observation,
  });
}

describe("Analyzer V2 Query Planning pre-execution observation artifact sink", () => {
  it("projects structural observation state into a sanitized internal-only artifact", () => {
    const ledgerId = "job-v2-x7o-artifact:precutover-observability";
    clearEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId);

    const result = recordFor(ledgerId);
    const artifact = readEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId)[0];
    const serialized = JSON.stringify(artifact);

    expect(result.status).toBe("recorded");
    expect(artifact).toMatchObject({
      artifactVersion: EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_VERSION,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      ledgerId,
      runId: "job-v2-x7o-artifact",
      source: "product_v2_orchestrator_after_evidence_lifecycle_intake",
      preexecutionObservation: {
        observationVersion: "v2.evidence-query-planning.preexecution-observation.x7o",
        status: "structural_prerequisites_observed_not_executed_precutover",
        blockedReason: null,
        sourceIntakeStatus: "intake_ready",
        inputScope: "direct_text_claim_contract",
        selectedAtomicClaimCount: 2,
        sourceLanguageSignal: "present",
      },
      productExecution: {
        queryPlanningRuntimeInvoked: false,
        promptLoaded: false,
        promptRendered: false,
        modelCalled: false,
        providerCallbackCreated: false,
        providerSearchFetchCalled: false,
        sourceAcquisitionExecuted: false,
        parserExecuted: false,
        evidenceCorpusCreated: false,
        reportGenerated: false,
        verdictGenerated: false,
      },
      publicCutoverStatus: "blocked_precutover",
    });

    for (const forbidden of [
      "Using hydrogen for cars is more efficient than using electricity",
      "x7o-claim-text-sentinel",
      "AC_X7O_SENTINEL",
      "x7o-language-sentinel",
      "configSnapshot",
      "promptProfile",
      "modelPolicy",
      "gatewayTaskId",
      "gatewayTaskStatus",
      "promptSectionId",
      "anthropic",
      "claude",
      "cacheKey",
      "storagePath",
      "FH_ADMIN_KEY",
      "https://example.test/x7o-source",
      "sourceMaterial",
      "parsedContent",
      "hiddenProvenance",
      "promptPackets",
      "claimContractHash",
      "batchInputEnvelope",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("records blocked observations without changing execution flags", () => {
    const ledgerId = "job-v2-x7o-blocked:precutover-observability";
    clearEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId);

    recordFor(ledgerId, acceptedObservation({
      status: "blocked_pre_query_planning",
      blockedReason: "language_signal_unavailable",
      selectedAtomicClaimCount: 1,
      sourceLanguageSignal: "unavailable",
      taskPolicy: {
        queryPlanningPolicySignal: "not_observed_execution_gate_required",
        productExecutionAuthority: "product_invocation_blocked_precutover",
      },
    }));

    expect(readEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId)[0])
      .toMatchObject({
        preexecutionObservation: {
          status: "blocked_pre_query_planning",
          blockedReason: "language_signal_unavailable",
          sourceLanguageSignal: "unavailable",
        },
        productExecution: {
          queryPlanningRuntimeInvoked: false,
          promptLoaded: false,
          promptRendered: false,
          modelCalled: false,
          providerCallbackCreated: false,
          providerSearchFetchCalled: false,
          sourceAcquisitionExecuted: false,
          parserExecuted: false,
          evidenceCorpusCreated: false,
          reportGenerated: false,
          verdictGenerated: false,
        },
      });
  });

  it("defensively copies artifacts on write and read", () => {
    const ledgerId = "job-v2-x7o-defensive-copy:precutover-observability";
    clearEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId);

    const result = recordFor(ledgerId);
    if (result.status !== "recorded") {
      throw new Error("expected artifact to be recorded");
    }
    (result.artifact.preexecutionObservation as { selectedAtomicClaimCount: number })
      .selectedAtomicClaimCount = 99;
    const firstRead = readEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId)[0];

    expect(Object.isFrozen(firstRead.preexecutionObservation)).toBe(true);
    expect(readEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId)[0]
      ?.preexecutionObservation.selectedAtomicClaimCount).toBe(2);
  });

  it("keeps records per ledger and global ledgers bounded", () => {
    const ledgerId = "job-v2-x7o-bounded-ledger:precutover-observability";
    clearEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId);

    for (let index = 0; index <= EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_RECORDS_PER_LEDGER; index += 1) {
      recordFor(ledgerId);
    }

    expect(readEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId)).toHaveLength(
      EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_RECORDS_PER_LEDGER,
    );

    const baseRunId = "job-v2-x7o-bounded-store";
    for (let index = 0; index <= EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_LEDGER_COUNT; index += 1) {
      const boundedLedgerId = `${baseRunId}-${index}:precutover-observability`;
      clearEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(boundedLedgerId);
      recordFor(boundedLedgerId);
    }

    expect(readEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(`${baseRunId}-0:precutover-observability`))
      .toEqual([]);
    expect(readEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(
      `${baseRunId}-${EVIDENCE_QUERY_PLANNING_PREEXECUTION_OBSERVATION_ARTIFACT_MAX_LEDGER_COUNT}:precutover-observability`,
    )).toHaveLength(1);
  });

  it("skips oversize artifacts without storing them", () => {
    const runId = `job-v2-x7o-${"x".repeat(17_000)}`;
    const ledgerId = `${runId}:precutover-observability`;

    const result = recordFor(ledgerId);

    expect(result.status).toBe("skipped_artifact_oversize");
    expect(readEvidenceQueryPlanningPreexecutionObservationRuntimeArtifacts(ledgerId)).toEqual([]);
  });

  it("builds artifacts by allow-list projection from explicit fields", () => {
    const artifact = buildEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact({
      ledgerId: "job-v2-x7o-allow-list:precutover-observability",
      runId: "job-v2-x7o-allow-list",
      createdUtc: "2026-05-17T03:00:00.000Z",
      observation: acceptedObservation(),
    });

    expect(Object.keys(artifact).sort()).toEqual([
      "artifactVersion",
      "createdUtc",
      "ledgerId",
      "preexecutionObservation",
      "productExecution",
      "publicCutoverStatus",
      "publicPointerExposure",
      "runId",
      "source",
      "visibility",
    ]);
    expect(Object.keys(artifact.preexecutionObservation).sort()).toEqual([
      "blockedReason",
      "inputScope",
      "observationVersion",
      "selectedAtomicClaimCount",
      "sourceIntakeStatus",
      "sourceLanguageSignal",
      "status",
    ]);
  });
});
