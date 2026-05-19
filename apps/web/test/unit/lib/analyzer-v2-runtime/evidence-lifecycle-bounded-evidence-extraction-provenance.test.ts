import { describe, expect, it } from "vitest";

import type { BoundedEvidenceExtractionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import {
  inspectBoundedEvidenceExtractionRuntimeOwnership,
  isBoundedEvidenceExtractionRuntimeOwnedDecision,
  markBoundedEvidenceExtractionRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance";

function decision(): BoundedEvidenceExtractionDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.x7w5",
    decisionId: "BOUNDED_EVIDENCE_EXTRACTION_TEST",
    kind: "bounded_evidence_extraction_execution",
    status: "blocked_pre_execution",
    blockedReason: "w4h_decision_missing",
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
      w4hDecisionVersion: null,
      w4hStatus: null,
      w4hRuntimeOwnership: "not_owned",
      w4iDecisionVersion: null,
      w4iStatus: null,
      w4iRuntimeOwnership: "not_owned",
      w4iPreCallGate: "not_reached",
      parentPacketId: null,
      parentPacketHash: null,
      parentPacketByteLength: null,
      parentProviderId: null,
      sourceMaterialRef: null,
      contentPacketId: null,
    },
    extractionResult: null,
    extractionResultHash: null,
    extractionResultStatus: null,
    extractionStatus: null,
    evidenceItemCount: 0,
    evidenceItemStatementHashes: [],
    evidenceItemStatementByteLengths: [],
    evidenceItemStatementProjections: [],
    executionTelemetry: {
      adapterVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.runtime.x7w5",
      promptContentHash: null,
      renderedPromptHash: null,
      configSnapshotHash: null,
      outputSchemaVersion: "v2.evidence_extraction_result.0",
      schemaDiagnostics: null,
      gatewayTaskId: "evidence_extraction",
      modelPolicyId: null,
      providerId: null,
      modelId: null,
      retryCount: 0,
      tokenUsage: {
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
      },
      durationMs: null,
      cacheDecision: "no_store_no_read",
      cacheDecisionReason: null,
      approvalPointer: null,
    },
    sideEffects: {
      promptLoaded: false,
      promptRendered: false,
      adapterCalled: false,
      modelCalled: false,
      cacheDecisionConstructed: false,
      cacheRead: false,
      cacheWrite: false,
      providerCallbackCreated: false,
      providerSdkLoaded: false,
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
      w4hPacketObserved: false,
      w4iEligibilityObserved: false,
      boundedEvidenceExtractionExecuted: false,
      extractionExecutionAuthorized: false,
      llmExtractionCallAuthorized: false,
      evidenceItemGenerated: false,
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
}

describe("bounded evidence extraction provenance", () => {
  it("marks exact W5 decisions as runtime-owned", () => {
    const owned = markBoundedEvidenceExtractionRuntimeOwnedDecision(decision());

    expect(inspectBoundedEvidenceExtractionRuntimeOwnership(owned)).toBe("owned");
    expect(isBoundedEvidenceExtractionRuntimeOwnedDecision(owned)).toBe(true);
  });

  it("rejects copied or mutated decisions", () => {
    const owned = markBoundedEvidenceExtractionRuntimeOwnedDecision(decision());
    const copied = JSON.parse(JSON.stringify(owned));
    (owned as unknown as { productExecution: { publicProjectionWritten: boolean } })
      .productExecution.publicProjectionWritten = true;

    expect(inspectBoundedEvidenceExtractionRuntimeOwnership(copied)).toBe("not_owned");
    expect(inspectBoundedEvidenceExtractionRuntimeOwnership(owned)).toBe("mutated_after_provenance");
  });
});
