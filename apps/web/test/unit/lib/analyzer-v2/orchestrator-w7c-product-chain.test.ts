import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import type { ClaimUnderstandingRuntimeState } from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import {
  BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_VERSION,
  BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION,
  BOUNDED_EVIDENCE_EXTRACTION_RUNTIME_VERSION,
  type BoundedEvidenceExtractionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import { buildBoundedEvidenceItemAdmissionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission";
import * as evidenceItemHandoffModule from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import * as sufficiencyIntakeModule from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import * as boundaryVerdictCandidateModule from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import * as reportStopCandidateModule from "@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate";
import type {
  BoundaryVerdictExecutionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import {
  EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  EVIDENCE_TASK_PROMPT_SECTION_IDS,
  type EvidenceQueryPlanningResult,
  type ExtractedEvidenceItemContract,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import {
  SUFFICIENCY_ASSESSMENT_DECISION_VERSION,
  type SufficiencyAssessmentDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import { SUFFICIENCY_INTAKE_DECISION_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import {
  markBoundedEvidenceExtractionRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance";

const INPUT = "Using hydrogen for cars is more efficient than using electricity";
const LEDGER_ID = "job-v2-w7c-chain:precutover-observability";
const STATEMENT =
  "Battery electric cars use electricity more directly than hydrogen cars.";

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
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
      currentDate: "2026-05-20",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "seed-hash",
    },
    atomicClaims: [
      {
        id: "AC_001",
        statement: INPUT,
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "One selected assertion.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

function acceptedClaimUnderstandingState(): ClaimUnderstandingRuntimeState {
  return {
    stageVersion: "v2.claim-understanding.runtime-stage.0",
    visibility: "internal_only",
    inputSource: "direct_input",
    status: "runtime_dispatch_completed",
    result: {
      schemaVersion: "v2.claim_understanding_result.0",
      status: "accepted",
      claimContract: claimContract(),
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    },
    blockedReason: null,
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "executable",
    runtimeDispatchStatus: "completed",
    runtimeDispatchBlockedReason: null,
    cacheEligibility: "runtime_no_store",
    sideEffects: {
      promptLoaded: true,
      promptRendered: true,
      adapterCalled: true,
      modelCalled: true,
      cacheDecisionConstructed: true,
      cacheRead: false,
      cacheWrite: false,
      providerCallbackCreated: false,
    },
  };
}

function acceptedQueryPlanningResult(): EvidenceQueryPlanningResult {
  return {
    schemaVersion: "v2.evidence_query_planning_result.0",
    taskKey: "evidence_query_planning",
    status: "accepted",
    queryPlan: {
      queryPlanId: "EQP_W7C",
      sourceLanguagePolicy: {
        primaryLanguage: "en",
        supplementaryLanguageDecision: "not_needed",
        rationale: "Single-language test fixture.",
      },
      queries: [
        {
          queryId: "EQ_W7C_001",
          retrievalPolicyKey: "baseline_research",
          queryText: "hydrogen cars electricity efficiency",
          targetAtomicClaimIds: ["AC_001"],
          rationale: "Bounded test query.",
        },
      ],
    },
    integrityEvents: [],
    blockedReason: null,
    damagedReason: null,
  };
}

function evidenceItem(): ExtractedEvidenceItemContract {
  return {
    evidenceItemId: "EI_W7C_001",
    sourceRecordId: "SOURCE_MATERIAL_REF_W7C",
    contentPacketId: "PACKET_W7C",
    statement: STATEMENT,
    targetAtomicClaimIds: ["AC_001"],
    claimDirection: "opposes",
    evidenceScope: {
      scopeId: "SCOPE_W7C_001",
      method: "comparative efficiency assessment",
      temporalBounds: "current vehicle generation",
      populationOrDomain: "passenger vehicle energy chain",
      geographicScope: "general passenger-vehicle market",
      limitations: ["efficiency only"],
    },
    probativeValue: "medium",
    evidenceStrength: "moderate",
    extractionConfidence: "medium",
    provenance: {
      locator: "bounded source locator",
      rationale: "bounded source rationale",
    },
  };
}

function w5(overrides: Partial<BoundedEvidenceExtractionDecision> = {}): BoundedEvidenceExtractionDecision {
  const item = evidenceItem();
  const statementHash = sha256Text(item.statement);
  const base: BoundedEvidenceExtractionDecision = {
    decisionVersion: BOUNDED_EVIDENCE_EXTRACTION_DECISION_VERSION,
    decisionId: "BOUNDED_EVIDENCE_EXTRACTION_W7C_TEST",
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
      parentPacketId: "PACKET_W7C",
      parentPacketHash: "4".repeat(64),
      parentPacketByteLength: 512,
      parentProviderId: "wikimedia_core",
      sourceMaterialRef: "SOURCE_MATERIAL_REF_W7C",
      contentPacketId: "PACKET_W7C",
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

function sufficiencyAssessment(): SufficiencyAssessmentDecision {
  return {
    decisionVersion: SUFFICIENCY_ASSESSMENT_DECISION_VERSION,
    decisionId: "SUFFICIENCY_ASSESSMENT_W7C_TEST",
    kind: "sufficiency_assessment",
    assessmentStatus: "sufficiency_assessment_completed",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parentSufficiencyIntakeDecisionId: "filled-by-runtime-mock",
    parentSufficiencyIntakeDecisionVersion: SUFFICIENCY_INTAKE_DECISION_VERSION,
    parentW5DecisionId: "BOUNDED_EVIDENCE_EXTRACTION_W7C_TEST",
    admittedEvidenceItemCount: 1,
    evidenceItemStatementHashes: [sha256Text(STATEMENT)],
    evidenceItemStatementByteLengths: [byteLength(STATEMENT)],
    sourceMaterialLineageHash: sha256Text("SOURCE_MATERIAL_REF_W7C"),
    w4hPacketHash: "4".repeat(64),
    providerId: "wikimedia_core",
    modelId: "claude-haiku-4-5-20251001",
    taskKey: "evidence_sufficiency",
    taskSchemaVersion: "v2.evidence_sufficiency_assessment.0",
    sufficiencyResultStatus: "accepted",
    sufficiencyResultPayloadHash: "8".repeat(64),
    reportStopRecommendation: "caveat_report",
    redaction: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputPacketReturned: false,
      evidenceScopeTextReturned: false,
      provenanceTextReturned: false,
      promptTextReturned: false,
      renderedPromptTextReturned: false,
      providerPayloadReturned: false,
      sufficiencyResultPayloadReturned: false,
    },
    sideEffects: {
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
    },
    executionTelemetry: {
      gatewayTaskId: "evidence_sufficiency",
      promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_sufficiency,
      promptContentHash: "9".repeat(64),
      renderedPromptHash: "a".repeat(64),
      inputPacketHash: "b".repeat(64),
      inputPacketByteLength: 1024,
      outputSchemaVersion: "v2.evidence_sufficiency_assessment.0",
      modelPolicyId: "v2.model.evidence_sufficiency.w6c",
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      tokenUsage: {
        inputTokens: 100,
        outputTokens: 80,
        totalTokens: 180,
      },
      durationMs: 20,
      cacheDecision: "no_store_no_read",
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
      cachePolicyId: "v2.semantic.evidence-sufficiency.w6c",
      approvalPointer: "Docs/WIP/2026-05-20_V2_Slice_W6-C_Sufficiency_Assessment_Implementation_Approval_Package.md",
    },
  };
}

type ScenarioOptions = {
  readonly w5Decision?: BoundedEvidenceExtractionDecision;
  readonly recordW5ArtifactAsNull?: boolean;
  readonly sufficiencyThrows?: boolean;
  readonly boundaryVerdictThrows?: boolean;
};

async function runScenario(options: ScenarioOptions = {}) {
  vi.resetModules();
  const order: string[] = [];
  const generateText = vi.fn(async () => {
    throw new Error("real provider modules must not be called");
  });
  const anthropic = vi.fn(() => {
    throw new Error("real Anthropic SDK must not be called");
  });
  const sufficiencyOwner = vi.fn(async (input) => {
    order.push("W6-C2");
    if (options.sufficiencyThrows) {
      throw new Error("raw sufficiency owner failure must not leak");
    }
    return {
      ...sufficiencyAssessment(),
      parentSufficiencyIntakeDecisionId: input.sufficiencyIntake?.decisionId ?? null,
    };
  });
  const boundaryVerdictOwner = vi.fn(async () => {
    order.push("W7-B2");
    if (options.boundaryVerdictThrows) {
      throw new Error("raw boundary verdict owner failure must not leak");
    }
    return {
      decisionId: "BOUNDARY_VERDICT_EXECUTION_W7C_TEST",
      status: "boundary_verdict_candidates_created_internal",
    } as BoundaryVerdictExecutionDecision;
  });
  const w5Decision = markBoundedEvidenceExtractionRuntimeOwnedDecision(
    options.w5Decision ?? w5(),
  );

  vi.doMock("ai", () => ({ generateText }));
  vi.doMock("@ai-sdk/anthropic", () => ({ anthropic }));
  vi.doMock("@/lib/analyzer-v2/claim-understanding/runtime-stage", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/analyzer-v2/claim-understanding/runtime-stage")>()),
    runClaimUnderstandingRuntimeStage: vi.fn(async () => acceptedClaimUnderstandingState()),
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory", () => ({
    buildEvidenceQueryPlanningProviderFactory: vi.fn((snapshot) => ({
      factoryVersion: "v2.evidence-query-planning.provider-factory.x7s",
      factorySourcePath: "apps/web/src/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory.ts",
      configSnapshotHash: snapshot.configSnapshotHash,
      providerId: "anthropic",
      modelId: snapshot.modelId,
      providerCall: vi.fn(async () => ({
        output: acceptedQueryPlanningResult(),
        telemetry: {
          providerId: "anthropic",
          modelId: snapshot.modelId,
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          durationMs: 80,
        },
      })),
    })),
  }));
  vi.doMock("@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-closed-loop", () => ({
    runSourceAcquisitionCandidateRuntimeClosedLoop: vi.fn(async () => ({ status: "w2-closed-loop" })),
  }));
  vi.doMock("@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop", () => ({
    runSourceAcquisitionCandidateProviderNetworkLoop: vi.fn(async () => ({ status: "w2-provider-network" })),
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner", () => ({
    buildEvidenceLifecycleSourceCandidatePreviewDecision: vi.fn(() => ({ status: "w3a-preview" })),
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner", () => ({
    runEvidenceLifecycleSourceMaterialPageSummaryDecision: vi.fn(async () => ({ status: "w3b" })),
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner", () => ({
    buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision: vi.fn(() => ({ status: "w4a" })),
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner", () => ({
    buildEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision: vi.fn(() => ({ status: "w4c" })),
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner", () => ({
    buildEvidenceLifecycleEvidenceCorpusShellDecision: vi.fn(() => ({ status: "w4d" })),
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-extraction-readiness-denial-owner", () => ({
    buildEvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision: vi.fn(() => ({ status: "w4e" })),
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner", () => ({
    buildEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision: vi.fn(() => ({ status: "w4f" })),
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner", () => ({
    buildEvidenceLifecycleExtractionInputAuthorizationDecision: vi.fn(() => ({ status: "w4h" })),
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-owner", () => ({
    buildEvidenceLifecycleExecutionReadinessDenialDecision: vi.fn(() => ({ status: "w4i" })),
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink", () => ({
    recordEvidenceLifecycleIntakeRuntimeArtifact: vi.fn(),
  }));
  vi.doMock(
    "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink",
    () => ({ recordEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact: vi.fn() }),
  );
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink", () => ({
    recordEvidenceQueryPlanningRuntimeArtifact: vi.fn(),
  }));
  vi.doMock(
    "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-intake-artifact-sink",
    () => ({ recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact: vi.fn() }),
  );
  vi.doMock(
    "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-admission-artifact-sink",
    () => ({ recordEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact: vi.fn() }),
  );
  vi.doMock(
    "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifact-sink",
    () => ({ recordEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact: vi.fn() }),
  );
  vi.doMock(
    "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink",
    () => ({ recordEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact: vi.fn() }),
  );
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-artifact-sink", () => ({
    recordEvidenceLifecycleSourceCandidatePreviewRuntimeArtifact: vi.fn(),
  }));
  vi.doMock(
    "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-artifact-sink",
    () => ({ recordEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact: vi.fn() }),
  );
  vi.doMock(
    "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-artifact-sink",
    () => ({ recordEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact: vi.fn() }),
  );
  vi.doMock(
    "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-observability-artifact-sink",
    () => ({ recordEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact: vi.fn() }),
  );
  vi.doMock(
    "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-artifact-sink",
    () => ({ recordEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact: vi.fn() }),
  );
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-artifact-sink", () => ({
    recordEvidenceLifecycleExtractionInputRuntimeArtifact: vi.fn(),
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-artifact-sink", () => ({
    recordEvidenceLifecycleExecutionReadinessRuntimeArtifact: vi.fn(),
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner", () => ({
    runBoundedEvidenceExtractionDecision: vi.fn(async () => {
      order.push("W5");
      return w5Decision;
    }),
  }));
  vi.doMock(
    "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink",
    () => ({
        recordBoundedEvidenceExtractionRuntimeArtifact: vi.fn((input: {
          readonly context: { readonly observabilityLedger: { readonly ledgerId: string }; readonly runId: string; readonly generatedUtc: string };
          readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision;
        }) => {
          order.push("W5-artifact");
          if (options.recordW5ArtifactAsNull) {
            return null;
          }
          return {
            artifactVersion: BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_VERSION,
            source: "product_v2_orchestrator_after_bounded_evidence_extraction",
            ledgerId: input.context.observabilityLedger.ledgerId,
            runId: input.context.runId,
            contextGeneratedUtc: input.context.generatedUtc,
            decisionHash: sha256Text(JSON.stringify(input.boundedEvidenceExtraction)),
            defaultProjection: "hash_length_provenance_only",
            inputTextReturned: false,
            evidenceItemTextReturned: false,
            sourceTextReturned: false,
            boundedEvidenceExtraction: input.boundedEvidenceExtraction,
            boundedEvidenceItemAdmission: buildBoundedEvidenceItemAdmissionDecision({
              ledgerId: input.context.observabilityLedger.ledgerId,
              boundedEvidenceExtraction: input.boundedEvidenceExtraction,
            }),
          };
        }),
      }),
  );
  vi.doMock(
    "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff",
    () => ({
        ...evidenceItemHandoffModule,
        buildEvidenceItemHandoffDecision: vi.fn((input) => {
          order.push("W5-F");
          return evidenceItemHandoffModule.buildEvidenceItemHandoffDecision(input);
        }),
      }),
  );
  vi.doMock("@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake", () => ({
      ...sufficiencyIntakeModule,
      buildSufficiencyIntakeDecision: vi.fn((input) => {
        order.push("W6-B");
        return sufficiencyIntakeModule.buildSufficiencyIntakeDecision(input);
      }),
    }));
  vi.doMock(
    "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate",
    () => ({
        ...boundaryVerdictCandidateModule,
        buildBoundaryVerdictCandidateDecision: vi.fn((input) => {
          order.push("W7-A");
          return boundaryVerdictCandidateModule.buildBoundaryVerdictCandidateDecision(input);
        }),
      }),
  );
  vi.doMock("@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate", () => ({
      ...reportStopCandidateModule,
      buildInternalAlphaReportStopCandidate: vi.fn((input) => {
        order.push("W8-A");
        return reportStopCandidateModule.buildInternalAlphaReportStopCandidate(input);
      }),
    }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-owner", () => ({
    runSufficiencyAssessmentDecision: sufficiencyOwner,
  }));
  vi.doMock("@/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner", () => ({
    runBoundaryVerdictExecutionDecision: boundaryVerdictOwner,
  }));

  const reportResultSink = await import(
    "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink"
  );
  reportResultSink.clearInternalAlphaReportResultRuntimeArtifacts(LEDGER_ID);
  const { runClaimBoundaryPipelineV2 } = await import("@/lib/analyzer-v2/orchestrator");
  const result = await runClaimBoundaryPipelineV2(
    {
      runIdHint: "job-v2-w7c-chain",
      submitted: {
        kind: "text",
        value: INPUT,
      },
      preparedSeed: null,
      selectedAtomicClaimIds: ["AC_001"],
    },
    {
      now: () => new Date("2026-05-20T19:30:00.000Z"),
      runtimeActivationStatus: "enabled_hidden_direct_text",
      queryPlanningRuntimeActivationStatus: "enabled_hidden_direct_text",
    },
  );
  return {
    result,
    order,
    generateText,
    anthropic,
    sufficiencyOwner,
    boundaryVerdictOwner,
    reportResultArtifacts: reportResultSink.readInternalAlphaReportResultRuntimeArtifacts(LEDGER_ID),
    reportResultProjections: reportResultSink.readInternalAlphaReportResultRuntimeArtifactDefaultProjections(LEDGER_ID),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("Analyzer V2 W7-C product chain integration", () => {
  it("runs the hidden product chain once after W5 bounded extraction", async () => {
    const scenario = await runScenario();

    expect(scenario.order).toEqual(["W5", "W5-artifact", "W5-F", "W6-B", "W6-C2", "W7-A", "W8-A", "W7-B2"]);
    expect(scenario.sufficiencyOwner).toHaveBeenCalledTimes(1);
    expect(scenario.boundaryVerdictOwner).toHaveBeenCalledTimes(1);
    expect(scenario.boundaryVerdictOwner).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({
        observabilityLedger: expect.objectContaining({ ledgerId: LEDGER_ID }),
      }),
      boundedEvidenceExtraction: expect.objectContaining({
        decisionId: "BOUNDED_EVIDENCE_EXTRACTION_W7C_TEST",
      }),
      evidenceItemHandoff: expect.objectContaining({
        handoffStatus: "evidence_items_ready_for_downstream_internal_handoff",
      }),
      sufficiencyIntake: expect.objectContaining({
        intakeStatus: "sufficiency_intake_ready_for_contract_only_assessment",
      }),
      sufficiencyAssessment: expect.objectContaining({
        assessmentStatus: "sufficiency_assessment_completed",
      }),
      boundaryVerdictCandidate: expect.objectContaining({
        status: "boundary_verdict_candidate_ready",
      }),
      internalAlphaReportStop: expect.objectContaining({
        status: "alpha_report_stop_created_not_report_ready",
      }),
    }));
    expect(scenario.generateText).not.toHaveBeenCalled();
    expect(scenario.anthropic).not.toHaveBeenCalled();
    expect(scenario.result.resultJson).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      meta: {
        publicCutoverStatus: "blocked_precutover",
      },
      qualityGates: {
        damagedReport: true,
      },
    });
  });

  it.each([
    [
      "W5 extraction is not accepted",
      { w5Decision: w5({
        status: "hidden_evidence_item_extraction_blocked",
        extractionResult: null,
        extractionResultStatus: "blocked",
        extractionStatus: "blocked",
        evidenceItemCount: 0,
        evidenceItemStatementHashes: [],
        evidenceItemStatementByteLengths: [],
        evidenceItemStatementProjections: [],
      }) },
    ],
    ["W5 artifact recording returns null", { recordW5ArtifactAsNull: true }],
  ])("does not start W5-F/W6/W7 when %s", async (_label, options) => {
    const scenario = await runScenario(options);

    expect(scenario.order).toEqual(["W5", "W5-artifact"]);
    expect(scenario.sufficiencyOwner).not.toHaveBeenCalled();
    expect(scenario.boundaryVerdictOwner).not.toHaveBeenCalled();
    expect(scenario.result.resultJson).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      meta: { publicCutoverStatus: "blocked_precutover" },
      qualityGates: { damagedReport: true },
    });
  });

  it.each([
    ["W6-C2", { sufficiencyThrows: true }, ["W5", "W5-artifact", "W5-F", "W6-B", "W6-C2"]],
    ["W7-B2", { boundaryVerdictThrows: true }, ["W5", "W5-artifact", "W5-F", "W6-B", "W6-C2", "W7-A", "W8-A", "W7-B2"]],
  ] as const)("keeps the public envelope fail-closed when %s throws", async (_label, options, expectedOrder) => {
    const scenario = await runScenario(options);
    const serializedPublic = JSON.stringify(scenario.result.resultJson);
    const [reportProjection] = scenario.reportResultProjections;

    expect(scenario.order).toEqual(expectedOrder);
    expect(scenario.reportResultArtifacts).toHaveLength(1);
    expect(reportProjection?.internalAlphaReportResult).toMatchObject({
      status: "internal_alpha_report_result_blocked",
      upstreamStopAttribution: {
        firstIncompleteStage: _label === "W6-C2" ? "sufficiency_assessment" : "boundary_verdict_execution",
      },
    });
    expect(scenario.result.resultJson).toMatchObject({
      _schemaVersion: "4.0.0-cb-precutover",
      meta: { publicCutoverStatus: "blocked_precutover" },
      qualityGates: { damagedReport: true },
      verdict: {
        label: "UNVERIFIED",
        truthPercentage: 50,
        confidence: 0,
      },
    });
    expect(serializedPublic).not.toContain("raw sufficiency owner failure");
    expect(serializedPublic).not.toContain("raw boundary verdict owner failure");
    expect(serializedPublic).not.toContain("SUFFICIENCY_ASSESSMENT_W7C_TEST");
    expect(serializedPublic).not.toContain("BOUNDARY_VERDICT_EXECUTION_W7C_TEST");
    expect(serializedPublic).not.toContain(STATEMENT);
  });
});
