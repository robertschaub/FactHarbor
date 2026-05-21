import { describe, expect, it } from "vitest";
import {
  inspectEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnership,
  isEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision,
  markEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision,
  readEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-provenance";

function decision() {
  return {
    decisionVersion: "v2.evidence-lifecycle.evidence-corpus-bounded-text-authorization.x7w4g",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "blocked_pre_bounded_corpus_text_w3b_not_runtime_owned",
    stopReason: "w3b_not_runtime_owned",
    parent: {
      sourceMaterialVersion: null,
      sourceMaterialStatus: null,
      sourceMaterialStopReason: null,
      sourceMaterialRuntimeOwnership: "not_owned",
      admissionDecisionVersion: null,
      admissionStatus: null,
      admissionStopReason: null,
      admissionRuntimeOwnership: "not_owned",
      shellDecisionVersion: null,
      shellStatus: null,
      shellStopReason: null,
      shellRuntimeOwnership: "not_owned",
      extractionDenialDecisionVersion: null,
      extractionDenialStatus: null,
      extractionDenialStopReason: null,
    },
    sourceMaterialRecordCount: 0,
    boundedTextSidecarCount: 0,
    boundedTextSidecar: null,
    boundedTextSidecars: [],
    evidenceCorpus: null,
    extractionInput: null,
    evidenceItems: [],
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    downstreamGate: "evidence_item_extraction_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      boundedCorpusTextAuthorized: false,
      boundedTextSidecarCreated: false,
      sourceMaterialRuntimeOwned: false,
      corpusAdmissionObserved: false,
      evidenceCorpusShellObserved: false,
      extractionReadinessDenialObserved: false,
      sourceTextAuthorized: false,
      extractionInputCreated: false,
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

describe("EvidenceCorpus bounded-text authorization provenance", () => {
  it("marks only exact runtime-created decisions as owned", () => {
    const owned = markEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(decision());
    const copied = JSON.parse(JSON.stringify(owned));

    expect(inspectEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnership(owned)).toBe("owned");
    expect(readEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(owned)).toBe(owned);
    expect(isEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(owned)).toBe(true);
    expect(inspectEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnership(copied)).toBe("not_owned");
    expect(readEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(copied)).toBeNull();
  });

  it("detects post-mark mutation and rejects malformed structures", () => {
    const owned = markEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(decision());
    (owned as { status: string }).status = "bounded_corpus_text_authorization_damaged_structural";

    expect(inspectEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnership(owned))
      .toBe("mutated_after_provenance");
    expect(readEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(owned)).toBeNull();
    expect(inspectEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnership({
      ...decision(),
      unexpected: true,
    })).toBe("not_owned");
  });
});
