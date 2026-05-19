import { describe, expect, it } from "vitest";
import {
  inspectEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnership,
  isEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision,
  markEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision,
  readEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-provenance";

function decision() {
  return {
    decisionVersion: "v2.evidence-lifecycle.extraction-input-authorization.x7w4h",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "blocked_pre_extraction_input_w4g_not_runtime_owned",
    stopReason: "w4g_not_runtime_owned",
    parent: {
      boundedTextDecisionVersion: null,
      boundedTextStatus: null,
      boundedTextStopReason: null,
      boundedTextRuntimeOwnership: "not_owned",
      boundedTextSidecarVersion: null,
      boundedTextSidecarKind: null,
      boundedTextSidecarId: null,
      linkedEvidenceCorpusId: null,
      sourceMaterialRef: null,
      locatorRef: null,
      candidatePreviewId: null,
      providerId: null,
      sourceMaterialEndpointId: null,
      sourceMaterialKind: null,
      languageCode: null,
      textHash: null,
      textByteLength: null,
      maxTextBytes: null,
    },
    boundedTextSidecarCount: 0,
    extractionInputPacketCount: 0,
    extractionInputPacket: null,
    evidenceCorpus: null,
    evidenceItems: [],
    extractionExecutionAuthorized: false,
    llmExtractionCallAuthorized: false,
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    downstreamGate: "evidence_item_extraction_execution_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      boundedTextSidecarObserved: false,
      boundedExtractionInputPacketCreated: false,
      providerLineagePreserved: false,
      extractionExecutionAuthorized: false,
      llmExtractionCallAuthorized: false,
      evidenceItemGenerated: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
  } as const;
}

describe("bounded extraction-input authorization provenance", () => {
  it("marks only exact runtime-created decisions as owned", () => {
    const owned = markEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(decision());
    const copied = JSON.parse(JSON.stringify(owned));

    expect(inspectEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnership(owned)).toBe("owned");
    expect(readEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(owned)).toBe(owned);
    expect(isEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(owned)).toBe(true);
    expect(inspectEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnership(copied)).toBe("not_owned");
    expect(readEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(copied)).toBeNull();
  });

  it("detects post-mark mutation and rejects malformed structures", () => {
    const owned = markEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(decision());
    (owned as { status: string }).status = "bounded_extraction_input_authorization_damaged_structural";

    expect(inspectEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnership(owned))
      .toBe("mutated_after_provenance");
    expect(readEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(owned)).toBeNull();
    expect(inspectEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnership({
      ...decision(),
      unexpected: true,
    })).toBe("not_owned");
  });
});
