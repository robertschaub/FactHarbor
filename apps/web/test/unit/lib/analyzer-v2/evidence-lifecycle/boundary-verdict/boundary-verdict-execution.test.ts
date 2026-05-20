import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION,
  BOUNDED_EVIDENCE_EXTRACTION_RUNTIME_VERSION,
  type BoundedEvidenceExtractionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import { buildBoundedEvidenceItemAdmissionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission";
import { buildEvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import { buildBoundaryVerdictCandidateDecision } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import {
  BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
  BOUNDARY_VERDICT_EXECUTION_MAX_PACKET_BYTES,
  type BoundaryVerdictExecutionInputPacket,
  type BoundaryVerdictExecutionProviderCall,
  runBoundaryVerdictExecutionRuntime,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import { buildInternalAlphaReportStopCandidate } from "@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate";
import {
  runSufficiencyAssessmentRuntime,
  type SufficiencyAssessmentProviderCall,
} from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import { buildSufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import {
  BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION as TASK_BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
  EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
  type BoundaryVerdictExecutionResult,
  type EvidenceSufficiencyResult,
  type ExtractedEvidenceItemContract,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import { buildClaimBoundaryV2RunContext, type PipelineRunContext } from "@/lib/analyzer-v2/run-context";

const INPUT = "Using hydrogen for cars is more efficient than using electricity";
const STATEMENT = "Battery electric cars use electricity more directly than hydrogen cars.";
const SCOPE_TEXT = "passenger vehicle drivetrain efficiency";
const LOCATOR_TEXT = "raw source locator must remain hidden";
const PROVENANCE_TEXT = "raw provenance rationale must remain hidden";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function context(): PipelineRunContext {
  return buildClaimBoundaryV2RunContext({
    runIdHint: "job-v2-w7b-core",
    submitted: {
      kind: "text",
      value: INPUT,
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-20T17:45:00.000Z"),
  });
}

function evidenceItem(overrides: Partial<ExtractedEvidenceItemContract> = {}): ExtractedEvidenceItemContract {
  return {
    evidenceItemId: "EI_W7B_001",
    sourceRecordId: "SOURCE_MATERIAL_REF_W7B",
    contentPacketId: "PACKET_W7B",
    statement: STATEMENT,
    targetAtomicClaimIds: ["AC_001"],
    claimDirection: "opposes",
    evidenceScope: {
      scopeId: "SCOPE_W7B_001",
      method: "comparative efficiency assessment",
      temporalBounds: "current vehicle generation",
      populationOrDomain: SCOPE_TEXT,
      geographicScope: "general passenger-vehicle market",
      limitations: ["does not assess refueling convenience"],
    },
    probativeValue: "medium",
    evidenceStrength: "moderate",
    extractionConfidence: "medium",
    provenance: {
      locator: LOCATOR_TEXT,
      rationale: PROVENANCE_TEXT,
    },
    ...overrides,
  };
}

function w5(overrides: Partial<BoundedEvidenceExtractionDecision> = {}): BoundedEvidenceExtractionDecision {
  const item = evidenceItem();
  const statementHash = sha256Text(item.statement);
  const base: BoundedEvidenceExtractionDecision = {
    decisionVersion: BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION,
    decisionId: "BOUNDED_EVIDENCE_EXTRACTION_W7B_TEST",
    kind: "bounded_evidence_extraction_execution",
    status: "hidden_evidence_item_extraction_completed",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    taskKey: "evidence_extraction",
    promptSectionId: "V2_EVIDENCE_EXTRACTION",
    outputSchemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
    defaultProjection: "hash_length_provenance_only",
    evidenceItemTextReturnedByDefault: false,
    sourceTextReturnedByDefault: false,
    parent: {
      w4hDecisionVersion: "v2.evidence-lifecycle.extraction-input-authorization.x7w4h",
      w4hStatus: "bounded_extraction_input_packet_created_extraction_execution_closed",
      w4hRuntimeOwnership: "owned",
      w4iDecisionVersion: "v2.evidence-lifecycle.execution-readiness-denial.x7w4i",
      w4iStatus: "extraction_input_structurally_eligible_execution_denied",
      w4iRuntimeOwnership: "owned",
      w4iPreCallGate: "merged_by_parity_rechecked_not_deleted",
      parentPacketId: "PACKET_W7B",
      parentPacketHash: "4".repeat(64),
      parentPacketByteLength: 512,
      parentProviderId: "wikimedia_core",
      sourceMaterialRef: "SOURCE_MATERIAL_REF_W7B",
      contentPacketId: "PACKET_W7B",
    },
    extractionResult: {
      schemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
      taskKey: "evidence_extraction",
      status: "accepted",
      extractionStatus: "evidence_extracted",
      rationale: "Hidden extraction accepted one EvidenceItem.",
      evidenceItems: [item],
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    },
    extractionResultHash: "5".repeat(64),
    extractionResultStatus: "accepted",
    extractionStatus: "evidence_extracted",
    evidenceItemCount: 1,
    evidenceItemStatementHashes: [statementHash],
    evidenceItemStatementByteLengths: [byteLength(item.statement)],
    evidenceItemStatementProjections: [{
      evidenceItemId: item.evidenceItemId,
      sourceRecordId: item.sourceRecordId,
      contentPacketId: item.contentPacketId,
      statementHash,
      statementByteLength: byteLength(item.statement),
      statementCharLength: Array.from(item.statement).length,
      targetAtomicClaimIds: item.targetAtomicClaimIds,
      claimDirection: item.claimDirection,
      probativeValue: item.probativeValue,
      evidenceStrength: item.evidenceStrength,
      extractionConfidence: item.extractionConfidence,
      evidenceScopeHash: sha256Text(JSON.stringify(item.evidenceScope)),
      provenanceHash: sha256Text(JSON.stringify(item.provenance)),
    }],
    executionTelemetry: {
      adapterVersion: BOUNDED_EVIDENCE_EXTRACTION_RUNTIME_VERSION,
      promptContentHash: "6".repeat(64),
      renderedPromptHash: "7".repeat(64),
      configSnapshotHash: "config-hash-w5",
      outputSchemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
      schemaDiagnostics: null,
      gatewayTaskId: "evidence_extraction",
      modelPolicyId: "v2.model.evidence_extraction.x7w5",
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      retryCount: 0,
      tokenUsage: {
        inputTokens: 100,
        outputTokens: 80,
        totalTokens: 180,
      },
      durationMs: 20,
      cacheDecision: "no_store_no_read",
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
      approvalPointer: "Docs/WIP/2026-05-19_V2_Slice_X7-W5_First_Bounded_EvidenceItem_Authorization_Review_Package.md",
    },
    sideEffects: {
      promptLoaded: true,
      promptRendered: true,
      adapterCalled: true,
      modelCalled: true,
      cacheDecisionConstructed: true,
      cacheRead: false,
      cacheWrite: false,
      providerCallbackCreated: true,
      providerSdkLoaded: true,
      parserExecuted: false,
      sourceReliabilityCalled: false,
      storageWrite: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
    productExecution: {
      w4hPacketObserved: true,
      w4iEligibilityObserved: true,
      boundedEvidenceExtractionExecuted: true,
      extractionExecutionAuthorized: true,
      llmExtractionCallAuthorized: true,
      evidenceItemGenerated: true,
      parserExecuted: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicProjectionWritten: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
    },
  };

  return { ...base, ...overrides };
}

function sufficiencyOutput(): EvidenceSufficiencyResult {
  return {
    schemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
    taskKey: "evidence_sufficiency",
    status: "accepted",
    sufficiencyAssessment: {
      sufficiencyStatus: "caveated",
      missingEvidenceDimensions: [],
      recommendedNextAction: "caveat_report",
      materialScarcityCandidate: "possible",
      rationale: "Enough bounded evidence exists for internal boundary/verdict review.",
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function sufficiencyProvider(): SufficiencyAssessmentProviderCall {
  return async () => ({
    output: sufficiencyOutput(),
    telemetry: {
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      inputTokens: 90,
      outputTokens: 70,
      totalTokens: 160,
      durationMs: 30,
    },
  });
}

async function parents(w5Decision = w5()) {
  const admission = buildBoundedEvidenceItemAdmissionDecision({
    ledgerId: "LEDGER_W7B_TEST",
    boundedEvidenceExtraction: w5Decision,
  });
  const handoff = buildEvidenceItemHandoffDecision({
    boundedEvidenceExtraction: w5Decision,
    boundedEvidenceItemAdmission: admission,
  });
  const intake = buildSufficiencyIntakeDecision(handoff);
  const assessment = await runSufficiencyAssessmentRuntime({
    context: context(),
    sufficiencyIntake: intake,
    boundedEvidenceExtraction: w5Decision,
    renderedPrompt: "rendered sufficiency prompt",
    promptContentHash: "8".repeat(64),
    configSnapshotHash: "config-hash-w6c",
    providerCall: sufficiencyProvider(),
    providerCallbackCreated: true,
    providerSdkLoaded: true,
  });
  const boundaryVerdict = buildBoundaryVerdictCandidateDecision({
    evidenceItemHandoff: handoff,
    sufficiencyIntake: intake,
    sufficiencyAssessment: assessment,
  });
  const reportStop = buildInternalAlphaReportStopCandidate({
    evidenceItemHandoff: handoff,
    sufficiencyIntake: intake,
    sufficiencyAssessment: assessment,
    boundaryVerdictCandidate: boundaryVerdict,
  });

  return { handoff, intake, assessment, boundaryVerdict, reportStop };
}

function acceptedBoundaryVerdictResult(overrides: Partial<BoundaryVerdictExecutionResult> = {}): BoundaryVerdictExecutionResult {
  const base: BoundaryVerdictExecutionResult = {
    schemaVersion: TASK_BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
    taskKey: "boundary_verdict_execution",
    status: "accepted",
    boundarySetCandidate: {
      boundaries: [{
        boundaryCandidateId: "BVC_001",
        title: "Internal boundary candidate",
        targetAtomicClaimIds: ["AC_001"],
        evidenceItemIds: ["EI_W7B_001"],
        evidenceScopeSummary: "Efficiency evidence for passenger vehicles.",
        rationale: "The cited EvidenceItem addresses the selected AtomicClaim.",
      }],
    },
    verdictSetCandidate: {
      verdictCandidates: [{
        verdictCandidateId: "VC_001",
        boundaryCandidateIds: ["BVC_001"],
        targetAtomicClaimIds: ["AC_001"],
        evidenceItemIds: ["EI_W7B_001"],
        internalVerdictLabelCandidate: "MOSTLY-FALSE",
        internalTruthPercentageCandidate: 15,
        internalConfidenceCandidate: 70,
        rationale: "The available EvidenceItem opposes the claim.",
        caveats: [],
        materialUncertaintySignals: [],
      }],
    },
    warningMaterialityInputs: {
      upstreamSufficiencyStatus: "caveated",
      upstreamRecommendedNextAction: "caveat_report",
      boundaryVerdictIntegrityEventCount: 0,
      candidateMaterialUncertaintySignalCount: 0,
      userVisibleWarningPublication: "closed",
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };

  return { ...base, ...overrides };
}

function providerCall(
  output: unknown,
  capture?: (packet: BoundaryVerdictExecutionInputPacket) => void,
): BoundaryVerdictExecutionProviderCall {
  return async (request) => {
    capture?.(request.inputPacket);
    return {
      output,
      telemetry: {
        providerId: "anthropic",
        modelId: "claude-haiku-4-5-20251001",
        inputTokens: 180,
        outputTokens: 100,
        totalTokens: 280,
        durationMs: 44,
      },
    };
  };
}

describe("boundary/verdict execution runtime", () => {
  it("creates one internal BoundaryVerdictExecutionDecision from W5/W5-F/W6-B/W6-C/W7-A/W8-A lineage", async () => {
    const w5Decision = w5();
    const lineage = await parents(w5Decision);
    let capturedPacket: BoundaryVerdictExecutionInputPacket | null = null;
    const decision = await runBoundaryVerdictExecutionRuntime({
      context: context(),
      boundedEvidenceExtraction: w5Decision,
      evidenceItemHandoff: lineage.handoff,
      sufficiencyIntake: lineage.intake,
      sufficiencyAssessment: lineage.assessment,
      boundaryVerdictCandidate: lineage.boundaryVerdict,
      internalAlphaReportStop: lineage.reportStop,
      renderedPrompt: "rendered boundary verdict prompt",
      promptContentHash: "9".repeat(64),
      configSnapshotHash: "config-hash-w7b",
      providerCall: providerCall(acceptedBoundaryVerdictResult(), (packet) => {
        capturedPacket = packet;
      }),
      providerCallbackCreated: true,
      providerSdkLoaded: true,
    });

    expect(decision).toMatchObject({
      decisionVersion: BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
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
      outputSchemaVersion: TASK_BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
      evidenceItemCount: 1,
      boundaryCandidateCount: 1,
      verdictCandidateCount: 1,
      citedEvidenceItemRefs: ["EI_W7B_001"],
    });
    expect(capturedPacket).toMatchObject({
      parentW5DecisionId: w5Decision.decisionId,
      parentW5FDecisionId: lineage.handoff.decisionId,
      parentW6BDecisionId: lineage.intake.decisionId,
      parentW6CDecisionId: lineage.assessment.decisionId,
      parentW7ADecisionId: lineage.boundaryVerdict.decisionId,
      parentW8ADecisionId: lineage.reportStop.decisionId,
      evidenceItemCount: 1,
      sourceProviderId: "wikimedia_core",
      parentEvidenceExtractionModelId: "claude-haiku-4-5-20251001",
    });
    expect(capturedPacket?.evidenceItems[0]).toMatchObject({
      evidenceItemId: "EI_W7B_001",
      statement: STATEMENT,
      statementHash: sha256Text(STATEMENT),
      statementByteLength: byteLength(STATEMENT),
    });
    expect(decision.sideEffects).toMatchObject({
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
    });
  });

  it("keeps default decision projection free of EvidenceItem text, prompt text, and provider output text", async () => {
    const w5Decision = w5();
    const lineage = await parents(w5Decision);
    const decision = await runBoundaryVerdictExecutionRuntime({
      context: context(),
      boundedEvidenceExtraction: w5Decision,
      evidenceItemHandoff: lineage.handoff,
      sufficiencyIntake: lineage.intake,
      sufficiencyAssessment: lineage.assessment,
      boundaryVerdictCandidate: lineage.boundaryVerdict,
      internalAlphaReportStop: lineage.reportStop,
      renderedPrompt: `rendered boundary verdict prompt ${STATEMENT}`,
      promptContentHash: "9".repeat(64),
      configSnapshotHash: "config-hash-w7b",
      providerCall: providerCall(acceptedBoundaryVerdictResult()),
    });
    const serialized = JSON.stringify(decision);

    expect(serialized).not.toContain(STATEMENT);
    expect(serialized).not.toContain(SCOPE_TEXT);
    expect(serialized).not.toContain(LOCATOR_TEXT);
    expect(serialized).not.toContain(PROVENANCE_TEXT);
    expect(serialized).not.toContain("The available EvidenceItem opposes the claim");
    expect(serialized).not.toContain("rendered boundary verdict prompt");
    expect(decision.redaction).toEqual({
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
    });
  });

  it("fails closed on statement hash drift before provider execution", async () => {
    const w5Decision = w5();
    const lineage = await parents(w5Decision);
    let providerCalls = 0;
    const decision = await runBoundaryVerdictExecutionRuntime({
      context: context(),
      boundedEvidenceExtraction: w5Decision,
      evidenceItemHandoff: {
        ...lineage.handoff,
        evidenceItemStatementHashes: ["a".repeat(64)],
      },
      sufficiencyIntake: lineage.intake,
      sufficiencyAssessment: lineage.assessment,
      boundaryVerdictCandidate: lineage.boundaryVerdict,
      internalAlphaReportStop: lineage.reportStop,
      renderedPrompt: "rendered boundary verdict prompt",
      promptContentHash: "9".repeat(64),
      configSnapshotHash: "config-hash-w7b",
      providerCall: async () => {
        providerCalls += 1;
        return providerCall(acceptedBoundaryVerdictResult())({} as never);
      },
    });

    expect(decision.status).toBe("boundary_verdict_execution_blocked");
    expect(decision.blockedReason).toBe("statement_projection_mismatch");
    expect(decision.sideEffects.modelCalled).toBe(false);
    expect(providerCalls).toBe(0);
  });

  it("requires approved executable gateway/model/cache policy before provider execution", async () => {
    const w5Decision = w5();
    const lineage = await parents(w5Decision);
    const staleContext = {
      ...context(),
      modelPolicy: {
        ...context().modelPolicy,
        gatewayTasks: context().modelPolicy.gatewayTasks.map((task) =>
          task.id === "boundary_verdict_execution"
            ? { ...task, status: "blockedUntilPromptApproved" as const }
            : task
        ),
      },
    };
    let providerCalls = 0;
    const decision = await runBoundaryVerdictExecutionRuntime({
      context: staleContext,
      boundedEvidenceExtraction: w5Decision,
      evidenceItemHandoff: lineage.handoff,
      sufficiencyIntake: lineage.intake,
      sufficiencyAssessment: lineage.assessment,
      boundaryVerdictCandidate: lineage.boundaryVerdict,
      internalAlphaReportStop: lineage.reportStop,
      renderedPrompt: "rendered boundary verdict prompt",
      promptContentHash: "9".repeat(64),
      configSnapshotHash: "config-hash-w7b",
      providerCall: async () => {
        providerCalls += 1;
        return providerCall(acceptedBoundaryVerdictResult())({} as never);
      },
    });

    expect(decision.status).toBe("boundary_verdict_execution_blocked");
    expect(decision.blockedReason).toBe("task_policy_not_executable");
    expect(decision.sideEffects.modelCalled).toBe(false);
    expect(providerCalls).toBe(0);
  });

  it("uses one schema retry and then accepts valid provider output", async () => {
    const w5Decision = w5();
    const lineage = await parents(w5Decision);
    let attempts = 0;
    const decision = await runBoundaryVerdictExecutionRuntime({
      context: context(),
      boundedEvidenceExtraction: w5Decision,
      evidenceItemHandoff: lineage.handoff,
      sufficiencyIntake: lineage.intake,
      sufficiencyAssessment: lineage.assessment,
      boundaryVerdictCandidate: lineage.boundaryVerdict,
      internalAlphaReportStop: lineage.reportStop,
      renderedPrompt: "rendered boundary verdict prompt",
      promptContentHash: "9".repeat(64),
      configSnapshotHash: "config-hash-w7b",
      providerCall: async (request) => {
        attempts += 1;
        if (request.attemptNumber === 1) {
          return providerCall("{not json")(request);
        }
        return providerCall(acceptedBoundaryVerdictResult())(request);
      },
    });

    expect(attempts).toBe(2);
    expect(decision.status).toBe("boundary_verdict_candidates_created_internal");
    expect(decision.executionTelemetry.attemptCount).toBe(2);
    expect(decision.executionTelemetry.schemaRetryCount).toBe(1);
  });

  it("damages provider output that cites unknown EvidenceItems or boundaries", async () => {
    const w5Decision = w5();
    const lineage = await parents(w5Decision);
    const decision = await runBoundaryVerdictExecutionRuntime({
      context: context(),
      boundedEvidenceExtraction: w5Decision,
      evidenceItemHandoff: lineage.handoff,
      sufficiencyIntake: lineage.intake,
      sufficiencyAssessment: lineage.assessment,
      boundaryVerdictCandidate: lineage.boundaryVerdict,
      internalAlphaReportStop: lineage.reportStop,
      renderedPrompt: "rendered boundary verdict prompt",
      promptContentHash: "9".repeat(64),
      configSnapshotHash: "config-hash-w7b",
      providerCall: providerCall(acceptedBoundaryVerdictResult({
        verdictSetCandidate: {
          verdictCandidates: [{
            ...acceptedBoundaryVerdictResult().verdictSetCandidate.verdictCandidates[0],
            evidenceItemIds: ["EI_NOT_IN_PACKET"],
          }],
        },
      })),
    });

    expect(decision.status).toBe("boundary_verdict_execution_damaged");
    expect(decision.damagedReason).toBe("task_contract_validation_failed");
    expect(JSON.stringify(decision)).not.toContain("EI_NOT_IN_PACKET");
  });

  it("fails closed when the bounded input packet exceeds the approved byte cap", async () => {
    const largeStatement = "A".repeat(BOUNDARY_VERDICT_EXECUTION_MAX_PACKET_BYTES);
    const w5Decision = w5({
      extractionResult: {
        ...w5().extractionResult!,
        status: "accepted",
        evidenceItems: [evidenceItem({ statement: largeStatement })],
      },
      evidenceItemStatementHashes: [sha256Text(largeStatement)],
      evidenceItemStatementByteLengths: [byteLength(largeStatement)],
    });
    const lineage = await parents(w5Decision);
    let providerCalls = 0;
    const decision = await runBoundaryVerdictExecutionRuntime({
      context: context(),
      boundedEvidenceExtraction: w5Decision,
      evidenceItemHandoff: lineage.handoff,
      sufficiencyIntake: lineage.intake,
      sufficiencyAssessment: lineage.assessment,
      boundaryVerdictCandidate: lineage.boundaryVerdict,
      internalAlphaReportStop: lineage.reportStop,
      renderedPrompt: "rendered boundary verdict prompt",
      promptContentHash: "9".repeat(64),
      configSnapshotHash: "config-hash-w7b",
      providerCall: async () => {
        providerCalls += 1;
        return providerCall(acceptedBoundaryVerdictResult())({} as never);
      },
    });

    expect(decision.status).toBe("boundary_verdict_execution_blocked");
    expect(decision.blockedReason).toBe("boundary_verdict_input_too_large");
    expect(providerCalls).toBe(0);
  });

  it("does not import W4-I, public, parser, Source Reliability, storage, or provider SDK surfaces", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "src/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.ts"),
      "utf8",
    );

    expect(source).not.toContain("execution-readiness");
    expect(source).not.toContain("artifact-sink");
    expect(source).not.toContain("@/app");
    expect(source).not.toContain("source-reliability");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("reportMarkdown");
    expect(source).not.toContain("sourceText:");
    expect(source).not.toContain("inputText:");
  });
});
