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
import { buildSufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import {
  EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
  type EvidenceSufficiencyResult,
  type ExtractedEvidenceItemContract,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import {
  buildClaimBoundaryV2RunContext,
  QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
  type PipelineRunContext,
} from "@/lib/analyzer-v2/run-context";
import { runSufficiencyAssessmentDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-owner";
import { markBoundedEvidenceExtractionRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance";
import {
  inspectSufficiencyAssessmentRuntimeOwnership,
  isSufficiencyAssessmentRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-provenance";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

const INPUT = "Using hydrogen for cars is more efficient than using electricity";
const STATEMENT = "Hydrogen cars require energy conversion steps, while battery electric cars use electricity more directly.";

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
    runIdHint: "job-v2-w6c2-owner",
    submitted: {
      kind: "text",
      value: INPUT,
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-20T16:45:00.000Z"),
    queryPlanningRuntimeActivationStatus: options.hiddenDirectText === false
      ? undefined
      : QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
  });
}

function evidenceItem(): ExtractedEvidenceItemContract {
  return {
    evidenceItemId: "EI_W6C2_001",
    sourceRecordId: "SOURCE_MATERIAL_REF_W6C2",
    contentPacketId: "PACKET_W6C2",
    statement: STATEMENT,
    targetAtomicClaimIds: ["AC_001"],
    claimDirection: "opposes",
    evidenceScope: {
      scopeId: "SCOPE_W6C2_001",
      method: "comparative pathway efficiency review",
      temporalBounds: "current vehicle generation",
      populationOrDomain: "passenger cars with public-road use",
      geographicScope: "general passenger-vehicle market",
      limitations: ["limited to energy efficiency, not refueling convenience"],
    },
    probativeValue: "medium",
    evidenceStrength: "moderate",
    extractionConfidence: "medium",
    provenance: {
      locator: "bounded source locator",
      rationale: "bounded provenance rationale",
    },
  };
}

function w5(overrides: Partial<BoundedEvidenceExtractionDecision> = {}): BoundedEvidenceExtractionDecision {
  const item = evidenceItem();
  const statementHash = sha256Text(item.statement);
  const base: BoundedEvidenceExtractionDecision = {
    decisionVersion: BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION,
    decisionId: "BOUNDED_EVIDENCE_EXTRACTION_W6C2_TEST",
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
      parentPacketId: "PACKET_W6C2",
      parentPacketHash: "4".repeat(64),
      parentPacketByteLength: 512,
      parentProviderId: "wikimedia_core",
      sourceMaterialRef: "SOURCE_MATERIAL_REF_W6C2",
      contentPacketId: "PACKET_W6C2",
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

function intakeFrom(w5Decision: BoundedEvidenceExtractionDecision) {
  const admission = buildBoundedEvidenceItemAdmissionDecision({
    ledgerId: "LEDGER_W6C2_TEST",
    boundedEvidenceExtraction: w5Decision,
  });
  return buildSufficiencyIntakeDecision(buildEvidenceItemHandoffDecision({
    boundedEvidenceExtraction: w5Decision,
    boundedEvidenceItemAdmission: admission,
  }));
}

function acceptedSufficiencyResult(): EvidenceSufficiencyResult {
  return {
    schemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
    taskKey: "evidence_sufficiency",
    status: "accepted",
    sufficiencyAssessment: {
      sufficiencyStatus: "caveated",
      missingEvidenceDimensions: [{
        dimension: "method_quality",
        materiality: "minor",
        rationale: "Provider rationale stays behind the result payload hash.",
      }],
      recommendedNextAction: "caveat_report",
      materialScarcityCandidate: "possible",
      rationale: "Sufficiency rationale stays behind the result payload hash.",
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function generateTextResult(output: EvidenceSufficiencyResult): Awaited<ReturnType<typeof generateText>> {
  return {
    text: JSON.stringify(output),
    usage: {
      inputTokens: 90,
      outputTokens: 70,
      totalTokens: 160,
    },
    totalUsage: {
      inputTokens: 90,
      outputTokens: 70,
      totalTokens: 160,
    },
  } as unknown as Awaited<ReturnType<typeof generateText>>;
}

describe("sufficiency assessment runtime owner", () => {
  beforeEach(() => {
    vi.mocked(generateText).mockReset();
  });

  it("fails closed before provider execution when the W5 parent is not runtime-owned", async () => {
    const w5Decision = w5();
    const decision = await runSufficiencyAssessmentDecision({
      context: context(),
      sufficiencyIntake: intakeFrom(w5Decision),
      boundedEvidenceExtraction: w5Decision,
    });

    expect(decision.assessmentStatus).toBe("sufficiency_assessment_blocked");
    expect(decision.blockedReason).toBe("bounded_evidence_extraction_missing");
    expect(decision.sideEffects.adapterCalled).toBe(false);
    expect(decision.sideEffects.modelCalled).toBe(false);
    expect(generateText).not.toHaveBeenCalled();
    expect(isSufficiencyAssessmentRuntimeOwnedDecision(decision)).toBe(true);
  });

  it("marks successful W6-C decisions as runtime-owned without a real provider call", async () => {
    vi.mocked(generateText).mockResolvedValueOnce(generateTextResult(acceptedSufficiencyResult()));
    const w5Decision = markBoundedEvidenceExtractionRuntimeOwnedDecision(w5());
    const decision = await runSufficiencyAssessmentDecision({
      context: context(),
      sufficiencyIntake: intakeFrom(w5Decision),
      boundedEvidenceExtraction: w5Decision,
    });

    expect(decision.assessmentStatus).toBe("sufficiency_assessment_completed");
    expect(decision.sufficiencyResultStatus).toBe("accepted");
    expect(decision.reportStopRecommendation).toBe("caveat_report");
    expect(decision.sideEffects).toMatchObject({
      sufficiencyLlmCalled: true,
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
      maxOutputTokens: 3000,
      timeout: 90000,
      maxRetries: 0,
    }));
    const prompt = String(vi.mocked(generateText).mock.calls[0]?.[0]?.prompt ?? "");
    expect(prompt).toContain(STATEMENT);
    expect(prompt).not.toContain("comparative pathway efficiency review");
    expect(prompt).not.toContain("current vehicle generation");
    expect(prompt).not.toContain("passenger cars with public-road use");
    expect(prompt).not.toContain("limited to energy efficiency");
    expect(prompt).not.toContain("bounded source locator");
    expect(prompt).not.toContain("bounded provenance rationale");
    expect(inspectSufficiencyAssessmentRuntimeOwnership(decision)).toBe("owned");
  });

  it("validates hidden direct-text activation before provider execution and sanitizes provider errors", async () => {
    const w5Decision = markBoundedEvidenceExtractionRuntimeOwnedDecision(w5());
    const decision = await runSufficiencyAssessmentDecision({
      context: context({ hiddenDirectText: false }),
      sufficiencyIntake: intakeFrom(w5Decision),
      boundedEvidenceExtraction: w5Decision,
    });

    expect(decision.assessmentStatus).toBe("sufficiency_assessment_damaged");
    expect(decision.damagedReason).toBe("provider_unavailable");
    expect(generateText).not.toHaveBeenCalled();
    expect(JSON.stringify(decision)).not.toContain("SufficiencyAssessmentProviderCallError");
    expect(isSufficiencyAssessmentRuntimeOwnedDecision(decision)).toBe(true);
  });

});
