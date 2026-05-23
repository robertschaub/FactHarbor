import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import {
  BOUNDED_EVIDENCE_EXTRACTION_SOURCE_PACKAGE,
  runBoundedEvidenceExtractionRuntime,
  type BoundedEvidenceApplicabilityProviderCall,
  type BoundedEvidenceExtractionProviderCall,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import type {
  BoundedExtractionInputAuthorizationDecision,
  BoundedTextExtractionInputPacket,
} from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";
import {
  BOUNDED_EXTRACTION_INPUT_AGGREGATE_MAX_TEXT_BYTES,
} from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";
import type {
  EvidenceLifecycleExecutionReadinessDenialDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial";
import {
  EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
  EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  type EvidenceApplicabilityResult,
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
    sourceMaterialRefs: [`SOURCE_MATERIAL_PAGE_SUMMARY_${hash.slice(0, 16).toUpperCase()}`],
    locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
    locatorRefs: ["OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456"],
    candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
    candidatePreviewIds: ["SOURCE_CANDIDATE_PREVIEW_1_1"],
    providerId: "wikimedia_core",
    providerIds: ["wikimedia_core"],
    sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
    sourceMaterialEndpointIds: ["ep_wikimedia_project_page_summary"],
    sourceMaterialKind: "wikimedia_page_summary_extract_text",
    sourceMaterialKinds: ["wikimedia_page_summary_extract_text"],
    languageCode: "en",
    languageCodes: ["en"],
    inputText: text,
    inputTextHash: hash,
    inputTextByteLength: Buffer.byteLength(text, "utf8"),
    inputTextCharLength: Array.from(text).length,
    maxInputTextBytes: BOUNDED_EXTRACTION_INPUT_AGGREGATE_MAX_TEXT_BYTES,
    truncationApplied: false,
    sourceMaterialTextHash: hash,
    sourceMaterialTextHashes: [hash],
    sourceMaterialTextByteLength: Buffer.byteLength(text, "utf8"),
    sourceMaterialTextByteLengths: [Buffer.byteLength(text, "utf8")],
    sourceMaterialTextCharLength: Array.from(text).length,
    sourceContentPackets: [{
      sourceRecordId: `SOURCE_MATERIAL_PAGE_SUMMARY_${hash.slice(0, 16).toUpperCase()}`,
      contentPacketId: `BOUNDED_EXTRACTION_CONTENT_${hash.slice(0, 16).toUpperCase()}`,
      providerId: "wikimedia_core",
      sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
      sourceMaterialKind: "wikimedia_page_summary_extract_text",
      languageCode: "en",
      contentText: text,
      contentTextHash: hash,
      contentTextByteLength: Buffer.byteLength(text, "utf8"),
      contentTextCharLength: Array.from(text).length,
      maxContentTextBytes: 4096,
      provenance: {
        locatorRef: "OPAQUE_SOURCE_LOCATOR_1_1_ABCDEF123456",
        candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
      },
    }],
    extractionExecutionAuthorized: false,
    llmExtractionCallAuthorized: false,
    parserExecuted: false,
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    evidenceItems: [],
    publicCutoverStatus: "blocked_precutover",
  };
}

function mixedProviderPacket(): BoundedTextExtractionInputPacket {
  const openAlexText = "OpenAlex abstract notes hydrogen conversion losses.";
  const wikimediaText = "Wikimedia page summary notes battery electric cars use electricity directly.";
  const aggregateText = [openAlexText, wikimediaText].join("\n\n");
  const aggregateHash = sha256Text(aggregateText);
  const openAlexHash = sha256Text(openAlexText);
  const wikimediaHash = sha256Text(wikimediaText);
  const base = packet(aggregateText);
  return {
    ...base,
    packetId: `BOUNDED_EXTRACTION_INPUT_${aggregateHash.slice(0, 16).toUpperCase()}`,
    parentSidecarId: `EVIDENCE_CORPUS_BOUNDED_TEXT_${openAlexHash.slice(0, 16).toUpperCase()}`,
    sourceMaterialRef: `AGGREGATE_SOURCE_MATERIAL_${aggregateHash.slice(0, 16).toUpperCase()}`,
    sourceMaterialRefs: [
      `SOURCE_MATERIAL_OPENALEX_${openAlexHash.slice(0, 16).toUpperCase()}`,
      `SOURCE_MATERIAL_PAGE_SUMMARY_${wikimediaHash.slice(0, 16).toUpperCase()}`,
    ],
    locatorRef: "OPAQUE_OPENALEX_WORK_0123456789ABCDEF",
    locatorRefs: [
      "OPAQUE_OPENALEX_WORK_0123456789ABCDEF",
      "OPAQUE_SOURCE_LOCATOR_2_1_ABCDEF123456",
    ],
    candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_5_3",
    candidatePreviewIds: ["SOURCE_CANDIDATE_PREVIEW_5_3", "SOURCE_CANDIDATE_PREVIEW_2_1"],
    providerId: "openalex",
    providerIds: ["openalex", "wikimedia_core"],
    sourceMaterialEndpointId: "ep_openalex_works_search",
    sourceMaterialEndpointIds: ["ep_openalex_works_search", "ep_wikimedia_project_page_summary"],
    sourceMaterialKind: "openalex_work_abstract_text",
    sourceMaterialKinds: ["openalex_work_abstract_text", "wikimedia_page_summary_extract_text"],
    inputText: aggregateText,
    inputTextHash: aggregateHash,
    inputTextByteLength: Buffer.byteLength(aggregateText, "utf8"),
    inputTextCharLength: Array.from(aggregateText).length,
    sourceMaterialTextHash: aggregateHash,
    sourceMaterialTextHashes: [openAlexHash, wikimediaHash],
    sourceMaterialTextByteLength: Buffer.byteLength(aggregateText, "utf8"),
    sourceMaterialTextByteLengths: [
      Buffer.byteLength(openAlexText, "utf8"),
      Buffer.byteLength(wikimediaText, "utf8"),
    ],
    sourceMaterialTextCharLength: Array.from(aggregateText).length,
    sourceContentPackets: [
      {
        sourceRecordId: `SOURCE_MATERIAL_OPENALEX_${openAlexHash.slice(0, 16).toUpperCase()}`,
        contentPacketId: `BOUNDED_EXTRACTION_CONTENT_${aggregateHash.slice(0, 12).toUpperCase()}_01`,
        providerId: "openalex",
        sourceMaterialEndpointId: "ep_openalex_works_search",
        sourceMaterialKind: "openalex_work_abstract_text",
        languageCode: "en",
        contentText: openAlexText,
        contentTextHash: openAlexHash,
        contentTextByteLength: Buffer.byteLength(openAlexText, "utf8"),
        contentTextCharLength: Array.from(openAlexText).length,
        maxContentTextBytes: 4096,
        provenance: {
          locatorRef: "OPAQUE_OPENALEX_WORK_0123456789ABCDEF",
          candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_5_3",
        },
      },
      {
        sourceRecordId: `SOURCE_MATERIAL_PAGE_SUMMARY_${wikimediaHash.slice(0, 16).toUpperCase()}`,
        contentPacketId: `BOUNDED_EXTRACTION_CONTENT_${aggregateHash.slice(0, 12).toUpperCase()}_02`,
        providerId: "wikimedia_core",
        sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
        sourceMaterialKind: "wikimedia_page_summary_extract_text",
        languageCode: "en",
        contentText: wikimediaText,
        contentTextHash: wikimediaHash,
        contentTextByteLength: Buffer.byteLength(wikimediaText, "utf8"),
        contentTextCharLength: Array.from(wikimediaText).length,
        maxContentTextBytes: 4096,
        provenance: {
          locatorRef: "OPAQUE_SOURCE_LOCATOR_2_1_ABCDEF123456",
          candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_2_1",
        },
      },
    ],
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
      maxInputTextBytes: BOUNDED_EXTRACTION_INPUT_AGGREGATE_MAX_TEXT_BYTES,
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
  const contentPacket = inputPacket.sourceContentPackets[0]!;
  return {
    schemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
    taskKey: "evidence_extraction",
    status: "accepted",
    extractionStatus: "evidence_extracted",
    rationale: "The bounded packet contains an extractable efficiency comparison.",
    evidenceItems: [{
      evidenceItemId: "EI_W5_001",
      sourceRecordId: contentPacket.sourceRecordId,
      contentPacketId: contentPacket.contentPacketId,
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

function applicabilityResult(
  inputPacket = packet(),
  applicability: "applicable" | "not_applicable" | "uncertain" = "applicable",
): EvidenceApplicabilityResult {
  return {
    schemaVersion: EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
    taskKey: "evidence_applicability",
    status: "accepted",
    applicabilityDecisions: inputPacket.sourceContentPackets.map((contentPacket) => ({
      sourceRecordId: contentPacket.sourceRecordId,
      contentPacketId: contentPacket.contentPacketId,
      targetAtomicClaimIds: ["AC_001"],
      applicability,
      rationale: "The bounded packet is judged against the selected claim target frame.",
      missingDimensions: applicability === "not_applicable" ? ["direct_evidence"] : [],
    })),
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

function applicabilityProviderCall(output: unknown): BoundedEvidenceApplicabilityProviderCall {
  return async () => ({
    output,
    telemetry: {
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      inputTokens: 90,
      outputTokens: 35,
      totalTokens: 125,
      durationMs: 20,
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
      contentPacketId: inputPacket.sourceContentPackets[0]?.contentPacketId,
      targetAtomicClaimIds: ["AC_001"],
    });
    expect(JSON.stringify(result.evidenceItemStatementProjections)).not.toContain("Hydrogen cars require");
  });

  it("runs evidence applicability before W5 and passes differentiated decisions into extraction", async () => {
    const inputPacket = mixedProviderPacket();
    const applicability = applicabilityResult(inputPacket, "not_applicable");
    let extractionPrompt = "";
    const extractionProvider: BoundedEvidenceExtractionProviderCall = async (request) => {
      extractionPrompt = request.renderedPrompt;
      return {
        output: evidenceExtractedResult(inputPacket),
        telemetry: {
          providerId: "anthropic",
          modelId: "claude-haiku-4-5-20251001",
          inputTokens: 120,
          outputTokens: 80,
          totalTokens: 200,
          durationMs: 25,
        },
      };
    };

    const result = await runBoundedEvidenceExtractionRuntime({
      context: context(),
      claimContract: claimContract(),
      extractionInputAuthorization: w4h(inputPacket),
      extractionInputRuntimeOwnership: "owned",
      executionReadinessDenial: w4i(inputPacket),
      executionReadinessRuntimeOwnership: "owned",
      applicabilityProviderCall: applicabilityProviderCall(applicability),
      providerCall: extractionProvider,
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      configSnapshotHash: "config-hash-w5",
      providerCallbackCreated: true,
      providerSdkLoaded: true,
    });

    expect(result.status).toBe("hidden_evidence_item_extraction_completed");
    expect(result.applicabilityPrecheck).toMatchObject({
      source: "runtime_evidence_applicability_task",
      resultStatus: "accepted",
      decisionCount: 2,
      applicableCount: 0,
      notApplicableCount: 2,
      uncertainCount: 0,
      modelCalled: true,
      resultReturnedByDefault: false,
      sourceTextReturnedByDefault: false,
    });
    expect(extractionPrompt).toContain("\"taskKey\":\"evidence_applicability\"");
    expect(extractionPrompt).toContain("\"applicability\":\"not_applicable\"");
    expect(extractionPrompt).not.toContain("structural-only applicability context");
  });

  it("falls back to structural applicability when the applicability task returns an incomplete content-packet decision set", async () => {
    const inputPacket = mixedProviderPacket();
    let extractionCalled = false;
    let extractionPrompt = "";
    const incompleteApplicability = {
      ...applicabilityResult(inputPacket, "applicable"),
      applicabilityDecisions: applicabilityResult(inputPacket, "applicable").applicabilityDecisions.slice(0, 1),
    } satisfies EvidenceApplicabilityResult;
    const result = await runBoundedEvidenceExtractionRuntime({
      context: context(),
      claimContract: claimContract(),
      extractionInputAuthorization: w4h(inputPacket),
      extractionInputRuntimeOwnership: "owned",
      executionReadinessDenial: w4i(inputPacket),
      executionReadinessRuntimeOwnership: "owned",
      applicabilityProviderCall: applicabilityProviderCall(incompleteApplicability),
      providerCall: async (request) => {
        extractionCalled = true;
        extractionPrompt = request.renderedPrompt;
        return {
          output: evidenceExtractedResult(inputPacket),
          telemetry: {
            providerId: "anthropic",
            modelId: "claude-haiku-4-5-20251001",
            inputTokens: 120,
            outputTokens: 80,
            totalTokens: 200,
            durationMs: 25,
          },
        };
      },
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      configSnapshotHash: "config-hash-w5",
    });

    expect(result.status).toBe("hidden_evidence_item_extraction_completed");
    expect(result.damagedReason).toBe(null);
    expect(result.applicabilityPrecheck).toMatchObject({
      source: "runtime_evidence_applicability_damaged_structural_fallback",
      resultStatus: "accepted",
      decisionCount: 2,
      uncertainCount: 2,
      modelCalled: true,
    });
    expect(extractionCalled).toBe(true);
    expect(extractionPrompt).toContain("\"applicability\":\"uncertain\"");
    expect(JSON.stringify(result)).not.toContain(inputPacket.sourceContentPackets[0]?.contentText);
  });

  it("accepts EvidenceItems copied from any approved multi-provider source content packet", async () => {
    const inputPacket = mixedProviderPacket();
    const secondContentPacket = inputPacket.sourceContentPackets[1]!;
    const output = evidenceExtractedResult(inputPacket);
    const result = await runBoundedEvidenceExtractionRuntime({
      context: context(),
      claimContract: claimContract(),
      extractionInputAuthorization: w4h(inputPacket),
      extractionInputRuntimeOwnership: "owned",
      executionReadinessDenial: w4i(inputPacket),
      executionReadinessRuntimeOwnership: "owned",
      providerCall: providerCall({
        ...output,
        evidenceItems: [{
          ...output.evidenceItems[0]!,
          sourceRecordId: secondContentPacket.sourceRecordId,
          contentPacketId: secondContentPacket.contentPacketId,
        }],
      }),
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      configSnapshotHash: "config-hash-w5",
      providerCallbackCreated: true,
      providerSdkLoaded: true,
    });

    expect(result.status).toBe("hidden_evidence_item_extraction_completed");
    expect(result.evidenceItemStatementProjections[0]).toMatchObject({
      sourceRecordId: secondContentPacket.sourceRecordId,
      contentPacketId: secondContentPacket.contentPacketId,
    });
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
    expect(result.executionTelemetry.schemaDiagnostics).toBeNull();
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
    expect(result.executionTelemetry.schemaDiagnostics).toMatchObject({
      contractName: "EvidenceExtractionResultSchema",
      contractVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
      outputParseStatus: "parse_failure",
      failureCategory: "parse_failure",
      rawProviderOutputReturned: false,
      rawSchemaMessagesReturned: false,
    });
    expect(result.evidenceItemCount).toBe(0);
    expect(result.productExecution.publicProjectionWritten).toBe(false);
    expect(JSON.stringify(result.executionTelemetry.schemaDiagnostics)).not.toContain("{not json");
  });

  it("records bounded schema path diagnostics without retaining raw provider text", async () => {
    const inputPacket = packet();
    const rawProviderStatement = "RAW_PROVIDER_STATEMENT_LEAK_SENTINEL";
    const schemaInvalidOutput = {
      schemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
      taskKey: "evidence_extraction",
      status: "accepted",
      extractionStatus: "evidence_extracted",
      rationale: "Provider returned a structurally invalid evidence item.",
      evidenceItems: Array.from({ length: 12 }, (_, index) => ({
        evidenceItemId: `EI_W5_BAD_${index}`,
        sourceRecordId: inputPacket.sourceMaterialRef,
        contentPacketId: inputPacket.sourceContentPackets[0]?.contentPacketId,
        statement: rawProviderStatement,
        targetAtomicClaimIds: ["AC_001"],
        claimDirection: "opposes",
        probativeValue: "medium",
        evidenceStrength: "moderate",
        extractionConfidence: "medium",
        provenance: {
          locator: "bounded_page_summary_extract",
          rationale: rawProviderStatement,
        },
      })),
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    };

    const result = await runBoundedEvidenceExtractionRuntime({
      context: context(),
      claimContract: claimContract(),
      extractionInputAuthorization: w4h(inputPacket),
      extractionInputRuntimeOwnership: "owned",
      executionReadinessDenial: w4i(inputPacket),
      executionReadinessRuntimeOwnership: "owned",
      providerCall: providerCall(schemaInvalidOutput),
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      configSnapshotHash: "config-hash-w5",
    });
    const serializedDiagnostics = JSON.stringify(result.executionTelemetry.schemaDiagnostics);

    expect(result.status).toBe("damaged_execution");
    expect(result.damagedReason).toBe("schema_validation_failed");
    expect(result.executionTelemetry.schemaDiagnostics).toMatchObject({
      contractName: "EvidenceExtractionResultSchema",
      contractVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
      outputParseStatus: "parsed",
      failureCategory: "schema_validation",
      rawProviderOutputReturned: false,
      providerCompletionTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
      evidenceItemTextReturned: false,
      promptTextReturned: false,
      stackTraceReturned: false,
    });
    expect(result.executionTelemetry.schemaDiagnostics?.issueCount).toBe(
      result.executionTelemetry.schemaDiagnostics?.issues.length,
    );
    expect(result.executionTelemetry.schemaDiagnostics?.issueCount).toBeLessThanOrEqual(8);
    expect(serializedDiagnostics).toContain("evidenceItems");
    expect(serializedDiagnostics).not.toContain(rawProviderStatement);
    expect(serializedDiagnostics).not.toContain("Provider returned");
    expect(serializedDiagnostics).not.toContain("Invalid");
    expect(JSON.stringify(result)).not.toContain(rawProviderStatement);
  });

  it("uses structural task-contract diagnostic codes without prose or raw received values", async () => {
    const inputPacket = packet();
    const rawOutsideSourceRecordId = "RAW_OUTSIDE_SOURCE_RECORD_ID_MUST_NOT_APPEAR";
    const validOutput = evidenceExtractedResult(inputPacket);
    const contractInvalidOutput: EvidenceExtractionResult = {
      ...validOutput,
      evidenceItems: [{
        ...validOutput.evidenceItems[0]!,
        sourceRecordId: rawOutsideSourceRecordId,
      }],
    };

    const result = await runBoundedEvidenceExtractionRuntime({
      context: context(),
      claimContract: claimContract(),
      extractionInputAuthorization: w4h(inputPacket),
      extractionInputRuntimeOwnership: "owned",
      executionReadinessDenial: w4i(inputPacket),
      executionReadinessRuntimeOwnership: "owned",
      providerCall: providerCall(contractInvalidOutput),
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      configSnapshotHash: "config-hash-w5",
    });
    const serializedDiagnostics = JSON.stringify(result.executionTelemetry.schemaDiagnostics);

    expect(result.status).toBe("damaged_execution");
    expect(result.damagedReason).toBe("task_contract_validation_failed");
    expect(result.executionTelemetry.schemaDiagnostics).toMatchObject({
      outputParseStatus: "parsed",
      failureCategory: "task_contract_validation",
      issueCount: 1,
      issues: [{ path: ["evidenceItems"], code: "approved_packet_mismatch" }],
    });
    expect(serializedDiagnostics).not.toContain("Evidence extraction returned");
    expect(serializedDiagnostics).not.toContain(rawOutsideSourceRecordId);
  });
});
