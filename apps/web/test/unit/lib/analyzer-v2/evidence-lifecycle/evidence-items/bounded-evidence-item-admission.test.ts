import { describe, expect, it } from "vitest";

import {
  buildBoundedEvidenceItemAdmissionDecision,
  BOUNDED_EVIDENCE_ITEM_ADMISSION_DEFAULT_PROJECTION_MAX_TOP_LEVEL_FIELDS,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission";
import type { BoundedEvidenceExtractionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import { markBoundedEvidenceExtractionRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance";

const STATEMENT = "Hydrogen cars require substantially more energy across the full pathway.";
const LEDGER_ID = "job-v2-w5e:precutover-observability";

function decision(
  overrides: Partial<BoundedEvidenceExtractionDecision> = {},
): BoundedEvidenceExtractionDecision {
  const base: BoundedEvidenceExtractionDecision = {
    decisionVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.x7w5",
    decisionId: "BOUNDED_EVIDENCE_EXTRACTION_W5E_TEST",
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
      parentPacketId: "PACKET_W5E",
      parentPacketHash: "0".repeat(64),
      parentPacketByteLength: 128,
      parentProviderId: "wikimedia_core",
      sourceMaterialRef: "SOURCE_MATERIAL_W5E",
      contentPacketId: "PACKET_W5E",
    },
    extractionResult: {
      schemaVersion: "v2.evidence_extraction_result.0",
      taskKey: "evidence_extraction",
      status: "accepted",
      extractionStatus: "evidence_extracted",
      rationale: "Internal rationale",
      evidenceItems: [{
        evidenceItemId: "EI_W5E",
        sourceRecordId: "SOURCE_MATERIAL_W5E",
        contentPacketId: "PACKET_W5E",
        statement: STATEMENT,
        targetAtomicClaimIds: ["AC_001"],
        claimDirection: "opposes",
        evidenceScope: {
          scopeId: "SCOPE_W5E",
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
    evidenceItemStatementByteLengths: [Buffer.byteLength(STATEMENT, "utf8")],
    evidenceItemStatementProjections: [{
      evidenceItemId: "EI_W5E",
      sourceRecordId: "SOURCE_MATERIAL_W5E",
      contentPacketId: "PACKET_W5E",
      statementHash: "2".repeat(64),
      statementByteLength: Buffer.byteLength(STATEMENT, "utf8"),
      statementCharLength: Array.from(STATEMENT).length,
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
  };

  return markBoundedEvidenceExtractionRuntimeOwnedDecision({
    ...base,
    ...overrides,
  });
}

describe("bounded EvidenceItem admission", () => {
  it("admits accepted W5 EvidenceItems with hash/length/provenance-only projection", () => {
    const admission = buildBoundedEvidenceItemAdmissionDecision({
      ledgerId: LEDGER_ID,
      boundedEvidenceExtraction: decision(),
    });
    const serialized = JSON.stringify(admission);

    expect(admission.admissionStatus).toBe(
      "bounded_evidence_items_admitted_internal_consumption_pending",
    );
    expect(admission.admittedEvidenceItemCount).toBe(1);
    expect(admission.w4iEligibilityStatus).toBe(
      "extraction_input_structurally_eligible_execution_denied",
    );
    expect(admission.providerId).toBe("wikimedia_core");
    expect(admission.redaction).toEqual({
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
    });
    expect(Object.keys(admission)).toHaveLength(
      BOUNDED_EVIDENCE_ITEM_ADMISSION_DEFAULT_PROJECTION_MAX_TOP_LEVEL_FIELDS,
    );
    expect(serialized).not.toContain(STATEMENT);
    expect(serialized).not.toContain('"statement":');
  });

  it("fails closed on non-accepted W5 results and zero EvidenceItems", () => {
    const damaged = buildBoundedEvidenceItemAdmissionDecision({
      ledgerId: LEDGER_ID,
      boundedEvidenceExtraction: decision({
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
      }),
    });
    const zero = buildBoundedEvidenceItemAdmissionDecision({
      ledgerId: LEDGER_ID,
      boundedEvidenceExtraction: decision({
        evidenceItemCount: 0,
        evidenceItemStatementHashes: [],
        evidenceItemStatementByteLengths: [],
        evidenceItemStatementProjections: [],
        extractionResult: {
          ...decision().extractionResult!,
          evidenceItems: [],
        },
      }),
    });

    expect(damaged.admissionStatus).toBe("evidence_item_admission_blocked");
    expect(damaged.blockedReason).toBe("w5_result_not_accepted");
    expect(zero.admissionStatus).toBe("evidence_item_admission_blocked");
    expect(zero.blockedReason).toBe("evidence_item_count_not_positive");
  });

  it("fails closed when W5 retry count is nonzero", () => {
    const base = decision();
    const retried = buildBoundedEvidenceItemAdmissionDecision({
      ledgerId: LEDGER_ID,
      boundedEvidenceExtraction: decision({
        executionTelemetry: {
          ...base.executionTelemetry,
          retryCount: 1 as 0,
        },
      }),
    });

    expect(retried.admissionStatus).toBe("evidence_item_admission_blocked");
    expect(retried.blockedReason).toBe("w5_result_not_accepted");
  });

  it("fails closed on W4-H, W4-I, and lineage drift", () => {
    const w4h = buildBoundedEvidenceItemAdmissionDecision({
      ledgerId: LEDGER_ID,
      boundedEvidenceExtraction: decision({
        parent: {
          ...decision().parent,
          w4hStatus: "blocked",
        },
      }),
    });
    const w4i = buildBoundedEvidenceItemAdmissionDecision({
      ledgerId: LEDGER_ID,
      boundedEvidenceExtraction: decision({
        parent: {
          ...decision().parent,
          w4iStatus: "blocked",
        },
      }),
    });
    const lineage = buildBoundedEvidenceItemAdmissionDecision({
      ledgerId: LEDGER_ID,
      boundedEvidenceExtraction: decision({
        parent: {
          ...decision().parent,
          parentProviderId: null,
        },
      }),
    });

    expect(w4h.blockedReason).toBe("w4h_parent_not_closed_packet");
    expect(w4i.blockedReason).toBe("w4i_parent_not_eligible_denial");
    expect(lineage.blockedReason).toBe("lineage_mismatch");
  });

  it("fails closed when W5 EvidenceItem lineage disagrees with the parent snapshot", () => {
    const base = decision();
    const sourceMaterialDrift = buildBoundedEvidenceItemAdmissionDecision({
      ledgerId: LEDGER_ID,
      boundedEvidenceExtraction: decision({
        extractionResult: {
          ...base.extractionResult!,
          evidenceItems: [{
            ...base.extractionResult!.evidenceItems[0]!,
            sourceRecordId: "OTHER_SOURCE_MATERIAL",
          }],
        },
      }),
    });
    const contentPacketDrift = buildBoundedEvidenceItemAdmissionDecision({
      ledgerId: LEDGER_ID,
      boundedEvidenceExtraction: decision({
        evidenceItemStatementProjections: [{
          ...base.evidenceItemStatementProjections[0]!,
          contentPacketId: "OTHER_PACKET",
        }],
      }),
    });

    expect(sourceMaterialDrift.admissionStatus).toBe("evidence_item_admission_blocked");
    expect(sourceMaterialDrift.blockedReason).toBe("lineage_mismatch");
    expect(contentPacketDrift.admissionStatus).toBe("evidence_item_admission_blocked");
    expect(contentPacketDrift.blockedReason).toBe("lineage_mismatch");
  });

  it("fails closed on missing EvidenceItem provenance", () => {
    const base = decision();
    const malformed = buildBoundedEvidenceItemAdmissionDecision({
      ledgerId: LEDGER_ID,
      boundedEvidenceExtraction: decision({
        extractionResult: {
          ...base.extractionResult!,
          evidenceItems: [{
            ...base.extractionResult!.evidenceItems[0]!,
            provenance: {
              locator: "",
              rationale: "Internal provenance",
            },
          }],
        },
      }),
    });

    expect(malformed.admissionStatus).toBe("evidence_item_admission_damaged");
    expect(malformed.damagedReason).toBe("missing_evidence_item_provenance");
  });
});
