import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateText } from "ai";

import {
  BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION,
  BOUNDED_EVIDENCE_EXTRACTION_RUNTIME_VERSION,
  type BoundedEvidenceExtractionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import { buildBoundedEvidenceItemAdmissionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission";
import { buildEvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import { buildBoundaryVerdictCandidateDecision } from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import { buildInternalAlphaReportStopCandidate } from "@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate";
import {
  runSufficiencyAssessmentRuntime,
  type SufficiencyAssessmentProviderCall,
} from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import { buildSufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import {
  BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
  EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
  type BoundaryVerdictExecutionResult,
  type EvidenceSufficiencyResult,
  type ExtractedEvidenceItemContract,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import {
  buildClaimBoundaryV2RunContext,
  QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
  type PipelineRunContext,
} from "@/lib/analyzer-v2/run-context";
import { runBoundaryVerdictExecutionDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner";
import { markBoundedEvidenceExtractionRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance";
import {
  inspectBoundaryVerdictExecutionRuntimeOwnership,
  isBoundaryVerdictExecutionRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-provenance";
import { markSufficiencyAssessmentRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-provenance";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

const INPUT = "Using hydrogen for cars is more efficient than using electricity";
const STATEMENT = "Battery electric cars use electricity more directly than hydrogen cars.";
const SCOPE_TEXT = "passenger vehicle drivetrain efficiency";
const LOCATOR_TEXT = "raw source locator must remain hidden";
const PROVENANCE_TEXT = "raw provenance rationale must remain hidden";
const LEDGER_ID = "LEDGER_W7B2_TEST";
const PROVIDER_SECRET = "RAW_PROVIDER_SECRET_ERROR";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function context(options: {
  readonly hiddenDirectText?: boolean;
} = {}): PipelineRunContext {
  return buildClaimBoundaryV2RunContext({
    runIdHint: "job-v2-w7b2-owner",
    submitted: {
      kind: "text",
      value: INPUT,
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-20T18:15:00.000Z"),
    queryPlanningRuntimeActivationStatus: options.hiddenDirectText === false
      ? undefined
      : QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
  });
}

function evidenceItem(overrides: Partial<ExtractedEvidenceItemContract> = {}): ExtractedEvidenceItemContract {
  return {
    evidenceItemId: "EI_W7B2_001",
    sourceRecordId: "SOURCE_MATERIAL_REF_W7B2",
    contentPacketId: "PACKET_W7B2",
    statement: STATEMENT,
    targetAtomicClaimIds: ["AC_001"],
    claimDirection: "opposes",
    evidenceScope: {
      scopeId: "SCOPE_W7B2_001",
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
    decisionId: "BOUNDED_EVIDENCE_EXTRACTION_W7B2_TEST",
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
      parentPacketId: "PACKET_W7B2",
      parentPacketHash: "4".repeat(64),
      parentPacketByteLength: 512,
      parentProviderId: "wikimedia_core",
      sourceMaterialRef: "SOURCE_MATERIAL_REF_W7B2",
      contentPacketId: "PACKET_W7B2",
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

  return {
    ...base,
    ...overrides,
  };
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

async function parents(w5Decision = markBoundedEvidenceExtractionRuntimeOwnedDecision(w5())) {
  const admission = buildBoundedEvidenceItemAdmissionDecision({
    ledgerId: LEDGER_ID,
    boundedEvidenceExtraction: w5Decision,
  });
  const handoff = buildEvidenceItemHandoffDecision({
    boundedEvidenceExtraction: w5Decision,
    boundedEvidenceItemAdmission: admission,
  });
  const intake = buildSufficiencyIntakeDecision(handoff);
  const assessment = markSufficiencyAssessmentRuntimeOwnedDecision(await runSufficiencyAssessmentRuntime({
    context: context(),
    sufficiencyIntake: intake,
    boundedEvidenceExtraction: w5Decision,
    renderedPrompt: "rendered sufficiency prompt",
    promptContentHash: "8".repeat(64),
    configSnapshotHash: "config-hash-w6c",
    providerCall: sufficiencyProvider(),
    providerCallbackCreated: true,
    providerSdkLoaded: true,
  }));
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

  return { w5Decision, handoff, intake, assessment, boundaryVerdict, reportStop };
}

function acceptedBoundaryVerdictResult(): BoundaryVerdictExecutionResult {
  return {
    schemaVersion: BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
    taskKey: "boundary_verdict_execution",
    status: "accepted",
    boundarySetCandidate: {
      boundaries: [{
        boundaryCandidateId: "BVC_001",
        title: "Internal boundary candidate",
        targetAtomicClaimIds: ["AC_001"],
        evidenceItemIds: ["EI_W7B2_001"],
        evidenceScopeSummary: "Efficiency evidence for passenger vehicles.",
        rationale: "The cited EvidenceItem addresses the selected AtomicClaim.",
      }],
    },
    verdictSetCandidate: {
      verdictCandidates: [{
        verdictCandidateId: "VC_001",
        boundaryCandidateIds: ["BVC_001"],
        targetAtomicClaimIds: ["AC_001"],
        evidenceItemIds: ["EI_W7B2_001"],
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
}

function generateTextResult(output: BoundaryVerdictExecutionResult): Awaited<ReturnType<typeof generateText>> {
  return {
    text: JSON.stringify(output),
    usage: {
      inputTokens: 180,
      outputTokens: 100,
      totalTokens: 280,
    },
    totalUsage: {
      inputTokens: 180,
      outputTokens: 100,
      totalTokens: 280,
    },
  } as unknown as Awaited<ReturnType<typeof generateText>>;
}

describe("boundary/verdict execution runtime owner", () => {
  beforeEach(() => {
    vi.mocked(generateText).mockReset();
  });

  it("marks successful W7-B decisions as runtime-owned through one mocked provider call", async () => {
    vi.mocked(generateText).mockResolvedValueOnce(generateTextResult(acceptedBoundaryVerdictResult()));
    const lineage = await parents();
    const decision = await runBoundaryVerdictExecutionDecision({
      context: context(),
      boundedEvidenceExtraction: lineage.w5Decision,
      evidenceItemHandoff: lineage.handoff,
      sufficiencyIntake: lineage.intake,
      sufficiencyAssessment: lineage.assessment,
      boundaryVerdictCandidate: lineage.boundaryVerdict,
      internalAlphaReportStop: lineage.reportStop,
    });

    expect(decision.status).toBe("boundary_verdict_candidates_created_internal");
    expect(decision.boundaryCandidateCount).toBe(1);
    expect(decision.verdictCandidateCount).toBe(1);
    expect(decision.sideEffects).toMatchObject({
      boundaryVerdictLlmCalled: true,
      adapterCalled: true,
      modelCalled: true,
      providerCallbackCreated: true,
      providerSdkLoaded: true,
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
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateText).toHaveBeenCalledWith(expect.objectContaining({
      temperature: 0.1,
      maxOutputTokens: 4000,
      timeout: 90000,
      maxRetries: 0,
    }));
    const prompt = String(vi.mocked(generateText).mock.calls[0]?.[0]?.prompt ?? "");
    expect(prompt).toContain(STATEMENT);
    expect(prompt).not.toContain(SCOPE_TEXT);
    expect(prompt).not.toContain(LOCATOR_TEXT);
    expect(prompt).not.toContain(PROVENANCE_TEXT);
    expect(prompt).not.toContain(LEDGER_ID);
    expect(inspectBoundaryVerdictExecutionRuntimeOwnership(decision)).toBe("owned");
  });

  it.each([
    ["W5 runtime ownership", "bounded_evidence_extraction_missing", async () => {
      const unownedW5 = w5();
      const lineage = await parents(markBoundedEvidenceExtractionRuntimeOwnedDecision(w5()));
      return {
        boundedEvidenceExtraction: unownedW5,
        evidenceItemHandoff: lineage.handoff,
        sufficiencyIntake: lineage.intake,
        sufficiencyAssessment: lineage.assessment,
        boundaryVerdictCandidate: lineage.boundaryVerdict,
        internalAlphaReportStop: lineage.reportStop,
      };
    }],
    ["W5-F handoff", "evidence_item_handoff_missing", async () => {
      const lineage = await parents();
      return {
        boundedEvidenceExtraction: lineage.w5Decision,
        evidenceItemHandoff: null,
        sufficiencyIntake: lineage.intake,
        sufficiencyAssessment: lineage.assessment,
        boundaryVerdictCandidate: lineage.boundaryVerdict,
        internalAlphaReportStop: lineage.reportStop,
      };
    }],
    ["W6-B sufficiency intake", "sufficiency_intake_missing", async () => {
      const lineage = await parents();
      return {
        boundedEvidenceExtraction: lineage.w5Decision,
        evidenceItemHandoff: lineage.handoff,
        sufficiencyIntake: null,
        sufficiencyAssessment: lineage.assessment,
        boundaryVerdictCandidate: lineage.boundaryVerdict,
        internalAlphaReportStop: lineage.reportStop,
      };
    }],
    ["W6-C2 sufficiency assessment ownership", "sufficiency_assessment_missing", async () => {
      const lineage = await parents();
      return {
        boundedEvidenceExtraction: lineage.w5Decision,
        evidenceItemHandoff: lineage.handoff,
        sufficiencyIntake: lineage.intake,
        sufficiencyAssessment: { ...lineage.assessment },
        boundaryVerdictCandidate: lineage.boundaryVerdict,
        internalAlphaReportStop: lineage.reportStop,
      };
    }],
    ["W7-A boundary verdict candidate", "boundary_verdict_candidate_missing", async () => {
      const lineage = await parents();
      return {
        boundedEvidenceExtraction: lineage.w5Decision,
        evidenceItemHandoff: lineage.handoff,
        sufficiencyIntake: lineage.intake,
        sufficiencyAssessment: lineage.assessment,
        boundaryVerdictCandidate: null,
        internalAlphaReportStop: lineage.reportStop,
      };
    }],
    ["W8-A internal report stop", "report_stop_candidate_missing", async () => {
      const lineage = await parents();
      return {
        boundedEvidenceExtraction: lineage.w5Decision,
        evidenceItemHandoff: lineage.handoff,
        sufficiencyIntake: lineage.intake,
        sufficiencyAssessment: lineage.assessment,
        boundaryVerdictCandidate: lineage.boundaryVerdict,
        internalAlphaReportStop: null,
      };
    }],
  ])("fails closed before provider execution when %s is unavailable", async (
    _label,
    expectedReason,
    buildInput,
  ) => {
    const input = await buildInput();
    const decision = await runBoundaryVerdictExecutionDecision({
      context: context(),
      ...input,
    });

    expect(decision.status).toBe("boundary_verdict_execution_blocked");
    expect(decision.blockedReason).toBe(expectedReason);
    expect(decision.sideEffects.adapterCalled).toBe(false);
    expect(decision.sideEffects.modelCalled).toBe(false);
    expect(generateText).not.toHaveBeenCalled();
    expect(isBoundaryVerdictExecutionRuntimeOwnedDecision(decision)).toBe(true);
  });

  it("validates hidden direct-text activation before provider execution and sanitizes failure", async () => {
    const lineage = await parents();
    const decision = await runBoundaryVerdictExecutionDecision({
      context: context({ hiddenDirectText: false }),
      boundedEvidenceExtraction: lineage.w5Decision,
      evidenceItemHandoff: lineage.handoff,
      sufficiencyIntake: lineage.intake,
      sufficiencyAssessment: lineage.assessment,
      boundaryVerdictCandidate: lineage.boundaryVerdict,
      internalAlphaReportStop: lineage.reportStop,
    });

    expect(decision.status).toBe("boundary_verdict_execution_damaged");
    expect(decision.damagedReason).toBe("provider_unavailable");
    expect(generateText).not.toHaveBeenCalled();
    expect(JSON.stringify(decision)).not.toContain("BoundaryVerdictExecutionProviderCallError");
    expect(isBoundaryVerdictExecutionRuntimeOwnedDecision(decision)).toBe(true);
  });

  it("sanitizes provider failures without returning raw provider text", async () => {
    vi.mocked(generateText).mockRejectedValueOnce(new Error(`${PROVIDER_SECRET} ${STATEMENT}`));
    const lineage = await parents();
    const decision = await runBoundaryVerdictExecutionDecision({
      context: context(),
      boundedEvidenceExtraction: lineage.w5Decision,
      evidenceItemHandoff: lineage.handoff,
      sufficiencyIntake: lineage.intake,
      sufficiencyAssessment: lineage.assessment,
      boundaryVerdictCandidate: lineage.boundaryVerdict,
      internalAlphaReportStop: lineage.reportStop,
    });
    const serialized = JSON.stringify(decision);

    expect(decision.status).toBe("boundary_verdict_execution_damaged");
    expect(decision.damagedReason).toBe("provider_unavailable");
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(serialized).not.toContain(PROVIDER_SECRET);
    expect(serialized).not.toContain(STATEMENT);
    expect(isBoundaryVerdictExecutionRuntimeOwnedDecision(decision)).toBe(true);
  });

  it("keeps default projections free of source text, provider output, hidden ledger ids, prompt text, and raw errors", async () => {
    vi.mocked(generateText).mockResolvedValueOnce(generateTextResult(acceptedBoundaryVerdictResult()));
    const lineage = await parents();
    const decision = await runBoundaryVerdictExecutionDecision({
      context: context(),
      boundedEvidenceExtraction: lineage.w5Decision,
      evidenceItemHandoff: lineage.handoff,
      sufficiencyIntake: lineage.intake,
      sufficiencyAssessment: lineage.assessment,
      boundaryVerdictCandidate: lineage.boundaryVerdict,
      internalAlphaReportStop: lineage.reportStop,
    });
    const serialized = JSON.stringify(decision);

    expect(serialized).not.toContain(STATEMENT);
    expect(serialized).not.toContain(SCOPE_TEXT);
    expect(serialized).not.toContain(LOCATOR_TEXT);
    expect(serialized).not.toContain(PROVENANCE_TEXT);
    expect(serialized).not.toContain("The available EvidenceItem opposes the claim");
    expect(serialized).not.toContain("Produce a `v2.boundary_verdict_execution.0` object");
    expect(serialized).not.toContain(LEDGER_ID);
    expect(serialized).not.toContain(PROVIDER_SECRET);
    expect(decision.defaultProjection).toBe("hash_length_provenance_only");
    expect(decision.redaction).toMatchObject({
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputPacketReturned: false,
      promptTextReturned: false,
      renderedPromptTextReturned: false,
      providerPayloadReturned: false,
      hiddenLedgerReferenceReturned: false,
      internalStateReturned: false,
    });
  });
});
