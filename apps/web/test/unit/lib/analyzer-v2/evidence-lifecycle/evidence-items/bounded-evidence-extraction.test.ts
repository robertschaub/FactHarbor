import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import {
  BOUNDED_EVIDENCE_EXTRACTION_SOURCE_PACKAGE,
  runBoundedEvidenceExtractionRuntime,
  type BoundedEvidenceExtractionProviderCall,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import type {
  BoundedExtractionInputAuthorizationDecision,
  BoundedTextExtractionInputPacket,
} from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";
import type {
  EvidenceLifecycleExecutionReadinessDenialDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial";
import {
  EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  type EvidenceExtractionResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import {
  buildClaimBoundaryV2RunContext,
  QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
} from "@/lib/analyzer-v2/run-context";

const INPUT = "Using hydrogen for cars is more efficient than using electricity";
const SOURCE_TEXT = "Hydrogen fuel cell cars convert electricity to hydrogen and back to electricity, while battery electric cars use electricity more directly.";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function context() {
  return buildClaimBoundaryV2RunContext({
    runIdHint: "job-v2-w5-core",
    submitted: {
      kind: "text",
      value: INPUT,
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-19T17:30:00.000Z"),
    queryPlanningRuntimeActivationStatus: QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
  });
}

function claimContract(): ClaimContract {
  return {
    schemaVersion: "v2.claim_contract.0",
    input: {
      inputType: "text",
      inputValue: INPUT,
      resolvedInputText: INPUT,
      detectedLanguage: "en",
      selectedAtomicClaimIds: ["AC_001"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: INPUT,
      resolvedInputText: INPUT,
      detectedLanguage: "en",
      currentDate: "2026-05-19",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "seed-hash",
    },
    atomicClaims: [{
      id: "AC_001",
      statement: INPUT,
      selected: true,
      source: "v2_claim_understanding",
      gate1Status: {
        status: "passed",
        source: "v2_claim_understanding",
        summary: "accepted",
        reasons: [],
      },
      integrityEvents: [],
    }],
    integrityEvents: [],
    acsMigration: null,
  };
}

function packet(text = SOURCE_TEXT): BoundedTextExtractionInputPacket {
  const hash = sha256Text(text);
  return {
    packetVersion: "v2.evidence-lifecycle.extraction-input.bounded-text-packet.x7w4h",
    packetId: `BOUNDED_EXTRACTION_INPUT_${hash.slice(0, 16).toUpperCase()}`,
    kind: "bounded_text_extraction_input_packet",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    source: "w4g_bounded_text_sidecar",
    parentDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-bounded-text-authorization.x7w4g",
    parentStatus: "bounded_corpus_text_sidecar_created_extraction_gate_closed",
    parentSidecarVersion: "v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g",
    parentSidecarId: `EVIDENCE_CORPUS_BOUNDED_TEXT_${hash.slice(0, 16).toUpperCase()}`,
    linkedEvidenceCorpusId: `EVIDENCE_CORPUS_SHELL_${hash.slice(0, 16).toUpperCase()}`,
    sourceMaterialRef: `SOURCE_MATERIAL_PAGE_SUMMARY_${hash.slice(0, 16).toUpperCase()}`,
    locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
    candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
    providerId: "wikimedia_core",
    sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
    sourceMaterialKind: "wikimedia_page_summary_extract_text",
    languageCode: "en",
    inputText: text,
    inputTextHash: hash,
    inputTextByteLength: Buffer.byteLength(text, "utf8"),
    inputTextCharLength: Array.from(text).length,
    maxInputTextBytes: 4096,
    truncationApplied: false,
    sourceMaterialTextHash: hash,
    sourceMaterialTextByteLength: Buffer.byteLength(text, "utf8"),
    sourceMaterialTextCharLength: Array.from(text).length,
    extractionExecutionAuthorized: false,
    llmExtractionCallAuthorized: false,
    parserExecuted: false,
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    evidenceItems: [],
    publicCutoverStatus: "blocked_precutover",
  };
}

function w4h(inputPacket = packet()): BoundedExtractionInputAuthorizationDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.extraction-input-authorization.x7w4h",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status: "bounded_extraction_input_packet_created_extraction_execution_closed",
    stopReason: "not_stopped",
    parent: {
      boundedTextDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-bounded-text-authorization.x7w4g",
      boundedTextStatus: "bounded_corpus_text_sidecar_created_extraction_gate_closed",
      boundedTextStopReason: "not_stopped",
      boundedTextRuntimeOwnership: "owned",
      boundedTextSidecarVersion: "v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g",
      boundedTextSidecarKind: "bounded_text_sidecar",
      boundedTextSidecarId: inputPacket.parentSidecarId,
      linkedEvidenceCorpusId: inputPacket.linkedEvidenceCorpusId,
      sourceMaterialRef: inputPacket.sourceMaterialRef,
      locatorRef: inputPacket.locatorRef,
      candidatePreviewId: inputPacket.candidatePreviewId,
      providerId: inputPacket.providerId,
      sourceMaterialEndpointId: inputPacket.sourceMaterialEndpointId,
      sourceMaterialKind: inputPacket.sourceMaterialKind,
      languageCode: inputPacket.languageCode,
      textHash: inputPacket.inputTextHash,
      textByteLength: inputPacket.inputTextByteLength,
      maxTextBytes: 4096,
    },
    boundedTextSidecarCount: 1,
    extractionInputPacketCount: 1,
    extractionInputPacket: inputPacket,
    evidenceCorpus: null,
    evidenceItems: [],
    extractionExecutionAuthorized: false,
    llmExtractionCallAuthorized: false,
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    downstreamGate: "evidence_item_extraction_execution_gate_closed",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      boundedTextSidecarObserved: true,
      boundedExtractionInputPacketCreated: true,
      providerLineagePreserved: true,
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
  };
}

function w4i(inputPacket = packet()): EvidenceLifecycleExecutionReadinessDenialDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.execution-readiness-denial.x7w4i",
    decisionId: `EXECUTION_READINESS_DENIAL_${inputPacket.inputTextHash.slice(0, 24).toUpperCase()}`,
    kind: "evidence_lifecycle_execution_readiness_denial",
    status: "extraction_input_structurally_eligible_execution_denied",
    stopCondition: "extraction_execution_not_authorized_in_x7w4i",
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    adminDefaultProjection: "hash_length_provenance_only",
    inputTextReturnedByDefault: false,
    structuralEligibility: "eligible_but_execution_denied",
    executionGateStatus: "closed_pre_execution",
    deniedAuthority: "x7w4i_no_extraction_execution_authority",
    parent: {
      authorizationDecisionVersion: "v2.evidence-lifecycle.extraction-input-authorization.x7w4h",
      authorizationStatus: "bounded_extraction_input_packet_created_extraction_execution_closed",
      authorizationDecisionId: null,
      authorizationVisibility: "internal_admin_only",
      packetVersion: inputPacket.packetVersion,
      packetKind: inputPacket.kind,
      packetId: inputPacket.packetId,
      providerId: inputPacket.providerId,
      sourceMaterialRef: inputPacket.sourceMaterialRef,
      sidecarHash: inputPacket.inputTextHash,
      sidecarByteLength: inputPacket.inputTextByteLength,
      runtimeOwnership: "owned",
    },
    packetObservation: {
      packetCount: 1,
      inputTextHash: inputPacket.inputTextHash,
      inputTextByteLength: inputPacket.inputTextByteLength,
      inputTextCharLength: inputPacket.inputTextCharLength,
      maxInputTextBytes: 4096,
      sourceMaterialTextHash: inputPacket.sourceMaterialTextHash,
      sourceMaterialTextByteLength: inputPacket.sourceMaterialTextByteLength,
      sourceMaterialEndpointId: inputPacket.sourceMaterialEndpointId,
      languageCode: inputPacket.languageCode,
      locatorRef: inputPacket.locatorRef,
      candidatePreviewId: inputPacket.candidatePreviewId,
    },
    productExecution: {
      w4hPacketObserved: true,
      executionReadinessDecisionCreated: true,
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
    },
    evidenceItems: [],
    parserOutput: null,
    reportOutput: null,
  };
}

function evidenceExtractedResult(inputPacket = packet()): EvidenceExtractionResult {
  return {
    schemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
    taskKey: "evidence_extraction",
    status: "accepted",
    extractionStatus: "evidence_extracted",
    rationale: "The bounded packet contains an extractable efficiency comparison.",
    evidenceItems: [{
      evidenceItemId: "EI_W5_001",
      sourceRecordId: inputPacket.sourceMaterialRef,
      contentPacketId: inputPacket.packetId,
      statement: "Hydrogen cars require energy conversion steps, while battery electric cars use electricity more directly.",
      targetAtomicClaimIds: ["AC_001"],
      claimDirection: "opposes",
      evidenceScope: {
        scopeId: "SCOPE_W5_001",
        method: null,
        temporalBounds: null,
        populationOrDomain: "passenger cars",
        geographicScope: null,
        limitations: [],
      },
      probativeValue: "medium",
      evidenceStrength: "moderate",
      extractionConfidence: "medium",
      provenance: {
        locator: "bounded_page_summary_extract",
        rationale: "The statement is extracted from the bounded packet.",
      },
    }],
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function providerCall(output: unknown): BoundedEvidenceExtractionProviderCall {
  return async () => ({
    output,
    telemetry: {
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      inputTokens: 120,
      outputTokens: 80,
      totalTokens: 200,
      durationMs: 25,
    },
  });
}

describe("bounded evidence extraction runtime", () => {
  it("produces a hidden EvidenceItem result from runtime-owned W4-H plus W4-I state", async () => {
    const inputPacket = packet();
    const result = await runBoundedEvidenceExtractionRuntime({
      context: context(),
      claimContract: claimContract(),
      extractionInputAuthorization: w4h(inputPacket),
      extractionInputRuntimeOwnership: "owned",
      executionReadinessDenial: w4i(inputPacket),
      executionReadinessRuntimeOwnership: "owned",
      providerCall: providerCall(evidenceExtractedResult(inputPacket)),
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      configSnapshotHash: "config-hash-w5",
      providerCallbackCreated: true,
      providerSdkLoaded: true,
    });

    expect(result.status).toBe("hidden_evidence_item_extraction_completed");
    expect(result.evidenceItemCount).toBe(1);
    expect(result.productExecution.evidenceItemGenerated).toBe(true);
    expect(result.parent.w4iPreCallGate).toBe("merged_by_parity_rechecked_not_deleted");
    expect(result.executionTelemetry.approvalPointer).toBe(BOUNDED_EVIDENCE_EXTRACTION_SOURCE_PACKAGE);
    expect(result.sideEffects).toMatchObject({
      promptLoaded: true,
      promptRendered: true,
      adapterCalled: true,
      modelCalled: true,
      cacheRead: false,
      cacheWrite: false,
      publicSurfaceWritten: false,
    });
    expect(result.evidenceItemStatementProjections[0]).toMatchObject({
      evidenceItemId: "EI_W5_001",
      sourceRecordId: inputPacket.sourceMaterialRef,
      contentPacketId: inputPacket.packetId,
      targetAtomicClaimIds: ["AC_001"],
    });
    expect(JSON.stringify(result.evidenceItemStatementProjections)).not.toContain("Hydrogen cars require");
  });

  it("keeps an accepted no-extractable outcome honest without fabricating EvidenceItems", async () => {
    const noEvidence: EvidenceExtractionResult = {
      schemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
      taskKey: "evidence_extraction",
      status: "accepted",
      extractionStatus: "no_extractable_evidence",
      rationale: "No bounded evidence item can be extracted.",
      evidenceItems: [],
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    };
    const inputPacket = packet();
    const result = await runBoundedEvidenceExtractionRuntime({
      context: context(),
      claimContract: claimContract(),
      extractionInputAuthorization: w4h(inputPacket),
      extractionInputRuntimeOwnership: "owned",
      executionReadinessDenial: w4i(inputPacket),
      executionReadinessRuntimeOwnership: "owned",
      providerCall: providerCall(noEvidence),
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      configSnapshotHash: "config-hash-w5",
      providerCallbackCreated: true,
      providerSdkLoaded: true,
    });

    expect(result.status).toBe("hidden_no_extractable_evidence");
    expect(result.evidenceItemCount).toBe(0);
    expect(result.productExecution.evidenceItemGenerated).toBe(false);
  });

  it("fails closed on W4-I provider lineage drift before calling the provider", async () => {
    const inputPacket = packet();
    const driftedReadiness = {
      ...w4i(inputPacket),
      parent: {
        ...w4i(inputPacket).parent,
        providerId: "wikimedia",
      },
    };
    const result = await runBoundedEvidenceExtractionRuntime({
      context: context(),
      claimContract: claimContract(),
      extractionInputAuthorization: w4h(inputPacket),
      extractionInputRuntimeOwnership: "owned",
      executionReadinessDenial: driftedReadiness,
      executionReadinessRuntimeOwnership: "owned",
      providerCall: providerCall(evidenceExtractedResult(inputPacket)),
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      configSnapshotHash: "config-hash-w5",
    });

    expect(result.status).toBe("blocked_pre_execution");
    expect(result.blockedReason).toBe("provider_id_mismatch");
    expect(result.sideEffects.adapterCalled).toBe(false);
    expect(result.productExecution.evidenceItemGenerated).toBe(false);
  });

  it("maps malformed provider JSON to a hidden damaged outcome", async () => {
    const inputPacket = packet();
    const result = await runBoundedEvidenceExtractionRuntime({
      context: context(),
      claimContract: claimContract(),
      extractionInputAuthorization: w4h(inputPacket),
      extractionInputRuntimeOwnership: "owned",
      executionReadinessDenial: w4i(inputPacket),
      executionReadinessRuntimeOwnership: "owned",
      providerCall: providerCall("{not json"),
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      configSnapshotHash: "config-hash-w5",
    });

    expect(result.status).toBe("damaged_execution");
    expect(result.damagedReason).toBe("parse_failure");
    expect(result.evidenceItemCount).toBe(0);
    expect(result.productExecution.publicProjectionWritten).toBe(false);
  });
});
