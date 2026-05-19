import { describe, expect, it } from "vitest";

import type { BoundedEvidenceExtractionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import {
  clearBoundedEvidenceExtractionRuntimeArtifacts,
  readBoundedEvidenceExtractionRuntimeArtifactDefaultProjections,
  readBoundedEvidenceExtractionRuntimeArtifacts,
  recordBoundedEvidenceExtractionRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink";
import { markBoundedEvidenceExtractionRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance";

const SOURCE_TEXT = "Internal bounded source packet text that must not appear in the route projection.";
const STATEMENT_TEXT = "Internal extracted EvidenceItem statement text that must be redacted by default.";
const RAW_SCHEMA_FAILURE_TEXT = "RAW_SCHEMA_FAILURE_TEXT_MUST_NOT_APPEAR";
const RAW_DIAGNOSTIC_VALUE = "RAW_DIAGNOSTIC_VALUE_MUST_NOT_APPEAR";

function context(ledgerId: string): PipelineRunContext {
  return {
    runId: `RUN_${ledgerId}`,
    inputType: "text",
    inputValue: "Using hydrogen for cars is more efficient than using electricity",
    resolvedInputText: "Using hydrogen for cars is more efficient than using electricity",
    detectedLanguage: "en",
    selectedAtomicClaimIds: ["AC_001"],
    generatedUtc: "2026-05-19T18:10:00.000Z",
    currentDate: "2026-05-19",
    configSnapshot: { source: "not_loaded_pre_provider_wiring_gate", configSnapshotHash: null, pipelineConfigHash: null, searchConfigHash: null, calcConfigHash: null },
    promptProfile: { source: "gateway_policy_snapshot", profile: "claimboundary-v2", sectionIds: ["V2_EVIDENCE_EXTRACTION"] },
    modelPolicy: { source: "static_precutover_registry", snapshotHash: "MODEL_POLICY_HASH", gatewayTasks: [], taskModelPolicies: [] },
    observabilityLedger: { ledgerId, status: "runtime_activation_ready" },
    claimUnderstandingRuntimeActivation: null,
    queryPlanningRuntimeActivation: null,
  } as unknown as PipelineRunContext;
}

function decision(): BoundedEvidenceExtractionDecision {
  return markBoundedEvidenceExtractionRuntimeOwnedDecision({
    decisionVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.x7w5",
    decisionId: "BOUNDED_EVIDENCE_EXTRACTION_TEST",
    kind: "bounded_evidence_extraction_execution",
    status: "hidden_evidence_item_extraction_completed",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    taskKey: "evidence_extraction",
    promptSectionId: "V2_EVIDENCE_EXTRACTION",
    outputSchemaVersion: "v2.evidence_extraction_result.0",
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
      parentPacketId: "BOUNDED_EXTRACTION_INPUT_TEST",
      parentPacketHash: "0".repeat(64),
      parentPacketByteLength: Buffer.byteLength(SOURCE_TEXT, "utf8"),
      parentProviderId: "wikimedia_core",
      sourceMaterialRef: "SOURCE_MATERIAL_PAGE_SUMMARY_TEST",
      contentPacketId: "BOUNDED_EXTRACTION_INPUT_TEST",
    },
    extractionResult: {
      schemaVersion: "v2.evidence_extraction_result.0",
      taskKey: "evidence_extraction",
      status: "accepted",
      extractionStatus: "evidence_extracted",
      rationale: "Internal rationale",
      evidenceItems: [{
        evidenceItemId: "EI_W5_001",
        sourceRecordId: "SOURCE_MATERIAL_PAGE_SUMMARY_TEST",
        contentPacketId: "BOUNDED_EXTRACTION_INPUT_TEST",
        statement: STATEMENT_TEXT,
        targetAtomicClaimIds: ["AC_001"],
        claimDirection: "opposes",
        evidenceScope: {
          scopeId: "SCOPE_W5_001",
          method: null,
          temporalBounds: null,
          populationOrDomain: null,
          geographicScope: null,
          limitations: [],
        },
        probativeValue: "medium",
        evidenceStrength: "moderate",
        extractionConfidence: "medium",
        provenance: {
          locator: "bounded_source",
          rationale: "Internal provenance",
        },
      }],
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    },
    extractionResultHash: "1".repeat(64),
    extractionResultStatus: "accepted",
    extractionStatus: "evidence_extracted",
    evidenceItemCount: 1,
    evidenceItemStatementHashes: ["2".repeat(64)],
    evidenceItemStatementByteLengths: [Buffer.byteLength(STATEMENT_TEXT, "utf8")],
    evidenceItemStatementProjections: [{
      evidenceItemId: "EI_W5_001",
      sourceRecordId: "SOURCE_MATERIAL_PAGE_SUMMARY_TEST",
      contentPacketId: "BOUNDED_EXTRACTION_INPUT_TEST",
      statementHash: "2".repeat(64),
      statementByteLength: Buffer.byteLength(STATEMENT_TEXT, "utf8"),
      statementCharLength: Array.from(STATEMENT_TEXT).length,
      targetAtomicClaimIds: ["AC_001"],
      claimDirection: "opposes",
      probativeValue: "medium",
      evidenceStrength: "moderate",
      extractionConfidence: "medium",
      evidenceScopeHash: "3".repeat(64),
      provenanceHash: "4".repeat(64),
    }],
    executionTelemetry: {
      adapterVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.runtime.x7w5",
      promptContentHash: "5".repeat(64),
      renderedPromptHash: "6".repeat(64),
      configSnapshotHash: "config-hash",
      outputSchemaVersion: "v2.evidence_extraction_result.0",
      schemaDiagnostics: null,
      gatewayTaskId: "evidence_extraction",
      modelPolicyId: "v2.model.evidence_extraction.x7w5",
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      retryCount: 0,
      tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      durationMs: 10,
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
  });
}

describe("bounded evidence extraction artifact sink", () => {
  it("records runtime-owned artifacts and redacts text by default", () => {
    const ledgerId = `ledger-w5-${Date.now()}`;
    clearBoundedEvidenceExtractionRuntimeArtifacts(ledgerId);
    const artifact = recordBoundedEvidenceExtractionRuntimeArtifact({
      context: context(ledgerId),
      boundedEvidenceExtraction: decision(),
    });

    expect(artifact).not.toBeNull();
    expect(readBoundedEvidenceExtractionRuntimeArtifacts(ledgerId)).toHaveLength(1);
    const projections = readBoundedEvidenceExtractionRuntimeArtifactDefaultProjections(ledgerId);
    const serialized = JSON.stringify(projections);

    expect(projections).toHaveLength(1);
    expect(projections[0]?.defaultProjection).toBe("hash_length_provenance_only");
    expect(projections[0]?.boundedEvidenceExtraction.extractionResult).toBeNull();
    expect(projections[0]?.boundedEvidenceExtraction.executionTelemetry.schemaDiagnostics).toBeNull();
    expect(projections[0]?.boundedEvidenceExtraction.evidenceItemTextReturnedByDefault).toBe(false);
    expect(serialized).not.toContain(STATEMENT_TEXT);
    expect(serialized).not.toContain(SOURCE_TEXT);
    expect(serialized).not.toContain('"statement":');
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("truthPercentage");
  });

  it("rejects invalid ledger ids and unowned decisions", () => {
    const unowned = { ...decision(), decisionId: "COPY" };

    expect(recordBoundedEvidenceExtractionRuntimeArtifact({
      context: context("../bad"),
      boundedEvidenceExtraction: decision(),
    })).toBeNull();
    expect(recordBoundedEvidenceExtractionRuntimeArtifact({
      context: context(`ledger-w5-unowned-${Date.now()}`),
      boundedEvidenceExtraction: unowned,
    })).toBeNull();
  });

  it("keeps schema-failure diagnostics bounded and text-free in default projections", () => {
    const ledgerId = `ledger-w5-schema-${Date.now()}`;
    clearBoundedEvidenceExtractionRuntimeArtifacts(ledgerId);
    const damagedDecision = markBoundedEvidenceExtractionRuntimeOwnedDecision({
      ...decision(),
      status: "damaged_execution",
      damagedReason: "schema_validation_failed",
      extractionResult: null,
      extractionResultHash: null,
      extractionResultStatus: null,
      extractionStatus: null,
      evidenceItemCount: 0,
      evidenceItemStatementHashes: [],
      evidenceItemStatementByteLengths: [],
      evidenceItemStatementProjections: [],
      executionTelemetry: {
        ...decision().executionTelemetry,
        schemaDiagnostics: {
          diagnosticVersion: RAW_DIAGNOSTIC_VALUE,
          contractName: RAW_SCHEMA_FAILURE_TEXT,
          contractVersion: `${RAW_DIAGNOSTIC_VALUE}-version`,
          outputParseStatus: RAW_DIAGNOSTIC_VALUE,
          failureCategory: RAW_DIAGNOSTIC_VALUE,
          issueCount: 9_999,
          issues: Array.from({ length: 12 }, (_, index) => ({
            path: ["evidenceItems", index, RAW_DIAGNOSTIC_VALUE, "evidenceScope"],
            code: index === 0 ? "invalid_type" : RAW_DIAGNOSTIC_VALUE,
          })),
          rawProviderOutputReturned: true,
          rawSchemaMessagesReturned: true,
          providerCompletionTextReturned: true,
          sourceTextReturned: true,
          inputTextReturned: true,
          evidenceItemTextReturned: true,
          promptTextReturned: true,
          stackTraceReturned: true,
          removalTrigger: RAW_DIAGNOSTIC_VALUE,
        } as unknown as NonNullable<BoundedEvidenceExtractionDecision["executionTelemetry"]["schemaDiagnostics"]>,
      },
    });
    recordBoundedEvidenceExtractionRuntimeArtifact({
      context: context(ledgerId),
      boundedEvidenceExtraction: damagedDecision,
    });

    const projection = readBoundedEvidenceExtractionRuntimeArtifactDefaultProjections(ledgerId)[0];
    const serialized = JSON.stringify(projection);

    expect(projection?.boundedEvidenceExtraction.executionTelemetry.schemaDiagnostics).toMatchObject({
      contractName: "EvidenceExtractionResultSchema",
      contractVersion: "v2.evidence_extraction_result.0",
      outputParseStatus: "not_attempted",
      failureCategory: "none",
      issueCount: 8,
      rawProviderOutputReturned: false,
      rawSchemaMessagesReturned: false,
      providerCompletionTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
      evidenceItemTextReturned: false,
      promptTextReturned: false,
      stackTraceReturned: false,
    });
    const diagnostics = projection?.boundedEvidenceExtraction.executionTelemetry.schemaDiagnostics;
    expect(diagnostics?.issueCount).toBe(diagnostics?.issues.length);
    expect(diagnostics?.issues[0]).toEqual({
      path: ["evidenceItems", "0", "[non_structural]", "evidenceScope"],
      code: "invalid_type",
    });
    expect(serialized).toContain("evidenceScope");
    expect(serialized).not.toContain(RAW_DIAGNOSTIC_VALUE);
    expect(serialized).not.toContain(RAW_SCHEMA_FAILURE_TEXT);
    expect(serialized).not.toContain(SOURCE_TEXT);
    expect(serialized).not.toContain(STATEMENT_TEXT);
    expect(serialized).not.toContain("Error:");
  });
});
