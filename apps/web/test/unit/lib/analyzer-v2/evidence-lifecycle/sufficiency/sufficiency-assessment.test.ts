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
import {
  runSufficiencyAssessmentRuntime,
  SUFFICIENCY_ASSESSMENT_DECISION_VERSION,
  type SufficiencyAssessmentInputPacket,
  type SufficiencyAssessmentProviderCall,
} from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import { buildSufficiencyIntakeDecision } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import {
  EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
  type EvidenceSufficiencyResult,
  type ExtractedEvidenceItemContract,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import { buildClaimBoundaryV2RunContext, type PipelineRunContext } from "@/lib/analyzer-v2/run-context";

const INPUT = "Using hydrogen for cars is more efficient than using electricity";
const STATEMENT = "Hydrogen cars require energy conversion steps, while battery electric cars use electricity more directly.";
const SCOPE_TEXT = "passenger cars with public-road use";
const LOCATOR_TEXT = "raw bounded page locator must stay hashed";
const PROVENANCE_TEXT = "raw provenance rationale must stay hashed";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function context(): PipelineRunContext {
  return buildClaimBoundaryV2RunContext({
    runIdHint: "job-v2-w6c-core",
    submitted: {
      kind: "text",
      value: INPUT,
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-20T15:30:00.000Z"),
  });
}

function evidenceItem(overrides: Partial<ExtractedEvidenceItemContract> = {}): ExtractedEvidenceItemContract {
  return {
    evidenceItemId: "EI_W6C_001",
    sourceRecordId: "SOURCE_MATERIAL_REF_W6C",
    contentPacketId: "PACKET_W6C",
    statement: STATEMENT,
    targetAtomicClaimIds: ["AC_001"],
    claimDirection: "opposes",
    evidenceScope: {
      scopeId: "SCOPE_W6C_001",
      method: "comparative pathway efficiency review",
      temporalBounds: "current vehicle generation",
      populationOrDomain: SCOPE_TEXT,
      geographicScope: "general passenger-vehicle market",
      limitations: ["limited to energy efficiency, not refueling convenience"],
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
    decisionId: "BOUNDED_EVIDENCE_EXTRACTION_W6C_TEST",
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
      parentPacketId: "PACKET_W6C",
      parentPacketHash: "4".repeat(64),
      parentPacketByteLength: 512,
      parentProviderId: "wikimedia_core",
      sourceMaterialRef: "SOURCE_MATERIAL_REF_W6C",
      contentPacketId: "PACKET_W6C",
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

function intakeFrom(w5Decision = w5()) {
  const admission = buildBoundedEvidenceItemAdmissionDecision({
    ledgerId: "LEDGER_W6C_TEST",
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
        rationale: "Provider rationale text must only be represented by payload hash.",
      }],
      recommendedNextAction: "caveat_report",
      materialScarcityCandidate: "possible",
      rationale: "Provider sufficiency rationale must not enter the decision projection.",
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function providerCall(
  output: unknown,
  capture?: (packet: SufficiencyAssessmentInputPacket) => void,
): SufficiencyAssessmentProviderCall {
  return async (request) => {
    capture?.(request.inputPacket);
    return {
      output,
      telemetry: {
        providerId: "anthropic",
        modelId: "claude-haiku-4-5-20251001",
        inputTokens: 90,
        outputTokens: 70,
        totalTokens: 160,
        durationMs: 30,
      },
    };
  };
}

describe("sufficiency assessment runtime", () => {
  it("creates one internal sufficiency input packet from matching W6-B intake and W5 EvidenceItems", async () => {
    let capturedPacket: SufficiencyAssessmentInputPacket | null = null;
    const w5Decision = w5();
    const decision = await runSufficiencyAssessmentRuntime({
      context: context(),
      sufficiencyIntake: intakeFrom(w5Decision),
      boundedEvidenceExtraction: w5Decision,
      renderedPrompt: "rendered sufficiency prompt",
      promptContentHash: "8".repeat(64),
      configSnapshotHash: "config-hash-w6c",
      providerCall: providerCall(acceptedSufficiencyResult(), (packet) => {
        capturedPacket = packet;
      }),
      providerCallbackCreated: true,
      providerSdkLoaded: true,
    });

    expect(decision).toMatchObject({
      decisionVersion: SUFFICIENCY_ASSESSMENT_DECISION_VERSION,
      kind: "sufficiency_assessment",
      assessmentStatus: "sufficiency_assessment_completed",
      blockedReason: null,
      damagedReason: null,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      taskKey: "evidence_sufficiency",
      taskSchemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
      sufficiencyResultStatus: "accepted",
      reportStopRecommendation: "caveat_report",
    });
    expect(capturedPacket).toMatchObject({
      parentW5DecisionId: w5Decision.decisionId,
      evidenceItemCount: 1,
      evidenceItems: [{
        evidenceItemId: "EI_W6C_001",
        statement: STATEMENT,
        statementHash: sha256Text(STATEMENT),
        statementByteLength: byteLength(STATEMENT),
        targetAtomicClaimIds: ["AC_001"],
        claimDirection: "opposes",
        probativeValue: "medium",
        evidenceStrength: "moderate",
        extractionConfidence: "medium",
      }],
      sourceMaterialLineageHash: sha256Text("SOURCE_MATERIAL_REF_W6C"),
      w4hPacketHash: "4".repeat(64),
      providerId: "wikimedia_core",
      modelId: "claude-haiku-4-5-20251001",
    });
    expect(decision.sideEffects).toMatchObject({
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
    });
    expect(decision.executionTelemetry.schemaDiagnostics).toBeNull();
  });

  it("keeps default projection text-free while admitting statements only to the provider input packet", async () => {
    let capturedPacket: SufficiencyAssessmentInputPacket | null = null;
    const w5Decision = w5();
    const decision = await runSufficiencyAssessmentRuntime({
      context: context(),
      sufficiencyIntake: intakeFrom(w5Decision),
      boundedEvidenceExtraction: w5Decision,
      renderedPrompt: "rendered sufficiency prompt",
      promptContentHash: "8".repeat(64),
      configSnapshotHash: "config-hash-w6c",
      providerCall: providerCall(acceptedSufficiencyResult(), (packet) => {
        capturedPacket = packet;
      }),
    });
    const serializedDecision = JSON.stringify(decision);
    const serializedPacket = JSON.stringify(capturedPacket);

    expect(serializedPacket).toContain(STATEMENT);
    expect(serializedPacket).not.toContain(SCOPE_TEXT);
    expect(serializedPacket).not.toContain(LOCATOR_TEXT);
    expect(serializedPacket).not.toContain(PROVENANCE_TEXT);
    expect(serializedDecision).not.toContain(STATEMENT);
    expect(serializedDecision).not.toContain(SCOPE_TEXT);
    expect(serializedDecision).not.toContain(LOCATOR_TEXT);
    expect(serializedDecision).not.toContain(PROVENANCE_TEXT);
    expect(serializedDecision).not.toContain("Provider sufficiency rationale");
    expect(decision.redaction).toEqual({
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputPacketReturned: false,
      evidenceScopeTextReturned: false,
      provenanceTextReturned: false,
      promptTextReturned: false,
      renderedPromptTextReturned: false,
      providerPayloadReturned: false,
      sufficiencyResultPayloadReturned: false,
    });
  });

  it("fails closed on statement, provider, model, and source lineage mismatches before provider call", async () => {
    const w5Decision = w5();
    const intake = intakeFrom(w5Decision);
    let providerCalls = 0;
    const neverCallProvider: SufficiencyAssessmentProviderCall = async () => {
      providerCalls += 1;
      return providerCall(acceptedSufficiencyResult())({
        renderedPrompt: "",
        promptContentHash: "",
        outputSchemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
        modelPolicy: context().modelPolicy.taskModelPolicies[0]!,
        inputPacket: {} as SufficiencyAssessmentInputPacket,
      });
    };
    const base = {
      context: context(),
      boundedEvidenceExtraction: w5Decision,
      renderedPrompt: "rendered sufficiency prompt",
      promptContentHash: "8".repeat(64),
      configSnapshotHash: "config-hash-w6c",
      providerCall: neverCallProvider,
    };

    const statementMismatch = await runSufficiencyAssessmentRuntime({
      ...base,
      sufficiencyIntake: {
        ...intake,
        evidenceItemStatementHashes: ["9".repeat(64)],
      },
    });
    const providerMismatch = await runSufficiencyAssessmentRuntime({
      ...base,
      sufficiencyIntake: {
        ...intake,
        providerId: "other_source_provider",
      },
    });
    const modelMismatch = await runSufficiencyAssessmentRuntime({
      ...base,
      sufficiencyIntake: {
        ...intake,
        modelId: "other-model",
      },
    });
    const sourceMismatch = await runSufficiencyAssessmentRuntime({
      ...base,
      sufficiencyIntake: {
        ...intake,
        sourceMaterialLineageHash: "a".repeat(64),
      },
    });

    expect(statementMismatch.blockedReason).toBe("statement_projection_mismatch");
    expect(providerMismatch.blockedReason).toBe("lineage_mismatch");
    expect(modelMismatch.blockedReason).toBe("lineage_mismatch");
    expect(sourceMismatch.blockedReason).toBe("lineage_mismatch");
    expect(providerCalls).toBe(0);
  });

  it("requires executable gateway/model/cache approval before calling the provider", async () => {
    const w5Decision = w5();
    const staleContext = {
      ...context(),
      modelPolicy: {
        ...context().modelPolicy,
        gatewayTasks: context().modelPolicy.gatewayTasks.map((task) =>
          task.id === "evidence_sufficiency"
            ? { ...task, status: "blockedUntilPromptApproved" as const }
            : task
        ),
      },
    };
    let providerCalls = 0;
    const decision = await runSufficiencyAssessmentRuntime({
      context: staleContext,
      sufficiencyIntake: intakeFrom(w5Decision),
      boundedEvidenceExtraction: w5Decision,
      renderedPrompt: "rendered sufficiency prompt",
      promptContentHash: "8".repeat(64),
      configSnapshotHash: "config-hash-w6c",
      providerCall: async () => {
        providerCalls += 1;
        return providerCall(acceptedSufficiencyResult())({} as never);
      },
    });

    expect(decision.assessmentStatus).toBe("sufficiency_assessment_blocked");
    expect(decision.blockedReason).toBe("task_policy_not_executable");
    expect(decision.sideEffects.modelCalled).toBe(false);
    expect(providerCalls).toBe(0);
  });

  it("parses accepted provider output and fails closed with bounded diagnostics on blocked, damaged, and malformed output", async () => {
    const w5Decision = w5();
    const request = {
      context: context(),
      sufficiencyIntake: intakeFrom(w5Decision),
      boundedEvidenceExtraction: w5Decision,
      renderedPrompt: "rendered sufficiency prompt",
      promptContentHash: "8".repeat(64),
      configSnapshotHash: "config-hash-w6c",
    };
    const blocked: EvidenceSufficiencyResult = {
      schemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
      taskKey: "evidence_sufficiency",
      status: "blocked",
      sufficiencyAssessment: null,
      integrityEvents: [{
        type: "task_policy_blocked",
        severity: "info",
        message: "blocked",
        references: ["policy"],
      }],
      blockedReason: "task_policy_not_executable",
      damagedReason: null,
    };
    const damaged: EvidenceSufficiencyResult = {
      schemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
      taskKey: "evidence_sufficiency",
      status: "damaged",
      sufficiencyAssessment: null,
      integrityEvents: [{
        type: "schema_validation_failed",
        severity: "error",
        message: "damaged",
        references: ["schema"],
      }],
      blockedReason: null,
      damagedReason: "schema_validation_failed",
    };

    const accepted = await runSufficiencyAssessmentRuntime({
      ...request,
      providerCall: providerCall(JSON.stringify(acceptedSufficiencyResult())),
    });
    const blockedDecision = await runSufficiencyAssessmentRuntime({
      ...request,
      providerCall: providerCall(blocked),
    });
    const damagedDecision = await runSufficiencyAssessmentRuntime({
      ...request,
      providerCall: providerCall(damaged),
    });
    const malformed = await runSufficiencyAssessmentRuntime({
      ...request,
      providerCall: providerCall("{not json"),
    });
    const invalidSchema = await runSufficiencyAssessmentRuntime({
      ...request,
      providerCall: providerCall({
        schemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
        taskKey: "evidence_sufficiency",
        status: "accepted",
        sufficiencyAssessment: {
          sufficiencyStatus: "caveated",
          missingEvidenceDimensions: [{
            dimension: "method_quality",
            materiality: "minor",
            rationale: "raw schema message must not be returned",
          }],
          recommendedNextAction: "caveat_report",
          materialScarcityCandidate: "possible",
          extraUnsafeField: STATEMENT,
        },
        integrityEvents: [{
          eventType: "schema_validation_failed",
          severity: "error",
          message: STATEMENT,
        }],
        blockedReason: null,
        damagedReason: null,
      }),
    });

    expect(accepted.assessmentStatus).toBe("sufficiency_assessment_completed");
    expect(accepted.sufficiencyResultPayloadHash).toEqual(expect.any(String));
    expect(accepted.executionTelemetry.schemaDiagnostics).toBeNull();
    expect(blockedDecision.assessmentStatus).toBe("sufficiency_assessment_blocked");
    expect(blockedDecision.blockedReason).toBe("task_policy_not_executable");
    expect(damagedDecision.assessmentStatus).toBe("sufficiency_assessment_damaged");
    expect(damagedDecision.damagedReason).toBe("schema_validation_failed");
    expect(malformed.assessmentStatus).toBe("sufficiency_assessment_damaged");
    expect(malformed.damagedReason).toBe("parse_failure");
    expect(JSON.stringify(malformed)).not.toContain("{not json");
    expect(malformed.executionTelemetry.schemaDiagnostics).toMatchObject({
      contractName: "EvidenceSufficiencyResultSchema",
      outputParseStatus: "parse_failure",
      failureCategory: "parse_failure",
      issueCount: 1,
      issues: [{ path: [], code: "json_parse_error" }],
      rawProviderOutputReturned: false,
      rawSchemaMessagesReturned: false,
      providerCompletionTextReturned: false,
      evidenceItemTextReturned: false,
      promptTextReturned: false,
      stackTraceReturned: false,
    });
    expect(invalidSchema.assessmentStatus).toBe("sufficiency_assessment_damaged");
    expect(invalidSchema.damagedReason).toBe("schema_validation_failed");
    expect(invalidSchema.executionTelemetry.schemaDiagnostics).toMatchObject({
      contractName: "EvidenceSufficiencyResultSchema",
      outputParseStatus: "parsed",
      failureCategory: "schema_validation",
      rawProviderOutputReturned: false,
      rawSchemaMessagesReturned: false,
      providerCompletionTextReturned: false,
      evidenceItemTextReturned: false,
      promptTextReturned: false,
      stackTraceReturned: false,
    });
    expect(invalidSchema.executionTelemetry.schemaDiagnostics?.issueCount).toBeGreaterThan(0);
    const serializedDiagnostics = JSON.stringify(invalidSchema.executionTelemetry.schemaDiagnostics);
    expect(serializedDiagnostics).not.toContain(STATEMENT);
    expect(serializedDiagnostics).not.toContain("raw schema message must not be returned");
    expect(serializedDiagnostics).not.toContain("message");
    expect(serializedDiagnostics).not.toContain("expected");
    expect(serializedDiagnostics).not.toContain("received");
  });

  it("does not import W4-I, public, parser, Source Reliability, storage, or provider surfaces", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "src/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.ts"),
      "utf8",
    );

    expect(source).not.toContain("execution-readiness");
    expect(source).not.toContain("artifact-sink");
    expect(source).not.toContain("source-reliability");
    expect(source).not.toContain("/app/");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("truthPercentage");
    expect(source).not.toContain("reportMarkdown");
    expect(source).not.toContain("sourceText:");
    expect(source).not.toContain("inputText:");
  });
});
