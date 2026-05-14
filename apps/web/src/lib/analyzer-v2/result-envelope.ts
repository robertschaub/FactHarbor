import { CLAIM_UNDERSTANDING_SHELL_ONLY_PLACEHOLDER_CLAIM_IDS } from "@/lib/analyzer-v2/claim-understanding/types";
import type { ClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";

export const CLAIMBOUNDARY_V2_PRECUTOVER_SCHEMA_VERSION = "4.0.0-cb-precutover";
export const CLAIMBOUNDARY_V2_PIPELINE = "claimboundary-v2";
export const CLAIMBOUNDARY_V2_SHELL_PLACEHOLDER_CLAIM_ID = CLAIM_UNDERSTANDING_SHELL_ONLY_PLACEHOLDER_CLAIM_IDS[0];

export type ClaimBoundaryV2Result = Record<string, unknown>;

export type ClaimBoundaryV2Envelope = {
  resultJson: ClaimBoundaryV2Result;
  reportMarkdown: string;
};

export type ClaimPreparationEnvelopeDiagnostic = {
  inputSource: "acs_prepared_snapshot" | "direct_input";
  preparationStatus: string;
  eventType: string;
  eventSeverity: "info" | "warning" | "error";
  claimIds: string[];
  acsMigrationStatus: "accepted" | null;
  blockCategory: "none" | "input_contract" | "stage_scope" | "policy_gate_closed";
};

type QualityGateStatus = "passed" | "warning" | "failed";

function qualityGate(status: QualityGateStatus, summary: string): { status: QualityGateStatus; summary: string } {
  return { status, summary };
}

function shellOnlyClaimIds(context: ClaimBoundaryV2RunContext): string[] {
  return context.selectedAtomicClaimIds.length > 0
    ? context.selectedAtomicClaimIds
    : [CLAIMBOUNDARY_V2_SHELL_PLACEHOLDER_CLAIM_ID];
}

function buildPlaceholderClaims(context: ClaimBoundaryV2RunContext) {
  return shellOnlyClaimIds(context).map((claimId) => ({
    id: claimId,
    statement: context.resolvedInputText,
    gate1Status: qualityGate("failed", "V2 shell has not run Gate 1."),
    selected: true,
    claimBoundaryIds: [],
  }));
}

function buildDamagedWarning(context: ClaimBoundaryV2RunContext) {
  const affectedClaimIds = shellOnlyClaimIds(context);

  return {
    type: "report_damaged",
    category: "system_failure",
    severity: "error",
    displaySeverity: "error",
    visibility: "blocking",
    stage: "pipeline_application",
    owner: "analyzer-v2",
    affected: {
      runId: context.runId,
      selectedAtomicClaimIds: affectedClaimIds,
    },
    materialityRationale:
      "Analyzer V2 is only a structural pre-cutover envelope in this slice; no valid analysis stages or verdict generation ran.",
    recoveryState: "not_recoverable",
    primaryIssueEligible: true,
    damagedReportRelation: "report_damaged",
    details: {
      shellOnly: true,
      analyticalStagesExecuted: [],
    },
  };
}

function claimPreparationDiagnostics(
  context: ClaimBoundaryV2RunContext,
  diagnostics: readonly ClaimPreparationEnvelopeDiagnostic[],
) {
  if (diagnostics.length === 0) {
    return [];
  }

  return diagnostics.map((diagnostic) => ({
    type: "claim_preparation_integrity_event",
    category: "internal_diagnostic",
    severity: "info",
    displaySeverity: "info",
    visibility: "admin_only",
    stage: "claim_understanding",
    owner: "claim_understanding",
    affected: {
      claimIds: diagnostic.claimIds.length > 0
        ? diagnostic.claimIds
        : shellOnlyClaimIds(context),
    },
    materialityRationale:
      "Pre-cutover Analyzer V2 kept Claim Understanding preparation diagnostics internal; the public result remains damaged.",
    recoveryState: diagnostic.blockCategory === "none" ? "recovered" : "failed",
    primaryIssueEligible: false,
    damagedReportRelation: diagnostic.blockCategory === "none" ? "none" : "contributes",
    details: {
      inputSource: diagnostic.inputSource,
      preparationStatus: diagnostic.preparationStatus,
      eventType: diagnostic.eventType,
      eventSeverity: diagnostic.eventSeverity,
      acsMigrationStatus: diagnostic.acsMigrationStatus,
      blockCategory: diagnostic.blockCategory,
    },
  }));
}

function buildCompatibilityQualityGates(context: ClaimBoundaryV2RunContext) {
  const claimCount = shellOnlyClaimIds(context).length;
  return {
    passed: false,
    gate1Stats: {
      total: claimCount,
      passed: 0,
      filtered: claimCount,
      centralKept: 0,
    },
    gate4Stats: {
      total: claimCount,
      publishable: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      insufficient: claimCount,
      centralKept: 0,
    },
    summary: {
      totalEvidenceItems: 0,
      totalSources: 0,
      searchesPerformed: 0,
      contradictionSearchPerformed: false,
      damagedReport: true,
    },
  };
}

export function buildDamagedClaimBoundaryV2Envelope(
  context: ClaimBoundaryV2RunContext,
  preparationDiagnostics: readonly ClaimPreparationEnvelopeDiagnostic[] = [],
): ClaimBoundaryV2Envelope {
  const placeholderClaims = buildPlaceholderClaims(context);
  const warning = buildDamagedWarning(context);
  const diagnostics = claimPreparationDiagnostics(context, preparationDiagnostics);
  const compatibilityQualityGates = buildCompatibilityQualityGates(context);
  const shellClaimIds = shellOnlyClaimIds(context);
  const reportMarkdown = [
    "# V2 Pre-Cutover Pipeline Not Implemented",
    "",
    "This is a damaged structural envelope for the gated Analyzer V2 pre-cutover path.",
    "No claim understanding, research, evidence extraction, ClaimAssessmentBoundary clustering, or verdict generation ran.",
  ].join("\n");

  return {
    reportMarkdown,
    resultJson: {
      _schemaVersion: CLAIMBOUNDARY_V2_PRECUTOVER_SCHEMA_VERSION,
      meta: {
        schemaVersion: CLAIMBOUNDARY_V2_PRECUTOVER_SCHEMA_VERSION,
        pipeline: CLAIMBOUNDARY_V2_PIPELINE,
        resultContractVersion: 1,
        runId: context.runId,
        generatedUtc: context.generatedUtc,
        currentDate: context.currentDate,
        executedWebGitCommitHash: null,
        promptContentHash: null,
        pipelineConfigHash: context.configSnapshot.pipelineConfigHash,
        searchConfigHash: context.configSnapshot.searchConfigHash,
        calcConfigHash: context.configSnapshot.calcConfigHash,
        modelPolicyHash: null,
      },
      input: {
        inputType: context.inputType,
        inputValue: context.inputValue,
        resolvedInputText: context.resolvedInputText,
        detectedLanguage: context.detectedLanguage,
        selectedAtomicClaimIds: shellClaimIds,
      },
      claims: {
        atomicClaims: placeholderClaims,
      },
      evidence: {
        evidenceItems: [],
      },
      sources: {
        items: [],
      },
      boundaries: {
        claimAssessmentBoundaries: [],
        coverageMatrix: {
          rows: shellClaimIds,
          columns: [],
          cells: [],
        },
      },
      verdict: {
        label: "UNVERIFIED",
        truthPercentage: 50,
        confidence: 0,
        confidenceTier: "none",
        gate4Status: "failed",
        sourceMarker: "canonical_v2",
      },
      qualityGates: {
        gate1: qualityGate("failed", "V2 shell has not run claim validation."),
        sufficiency: qualityGate("failed", "V2 shell produced no evidence."),
        gate4: qualityGate("failed", "V2 shell produced no publishable verdict."),
        reportIntegrity: qualityGate("passed", "V2 result envelope fields are present."),
        warningIntegrity: qualityGate("passed", "Damaged-report warning is represented in the V2 warning contract."),
        damagedReport: true,
      },
      warnings: [warning, ...diagnostics],
      narrative: {
        markdown: reportMarkdown,
        sections: {
          headline: "V2 pre-cutover pipeline not implemented.",
          keyFinding: "No analytical conclusion was produced.",
          evidenceBaseSummary: "No research or evidence extraction ran in this structural shell.",
          limitations: "This result is intentionally damaged and must not be treated as a valid report.",
        },
        evidenceReferenceIds: [],
        reportQualityStatus: "damaged",
      },
      reportGeneration: {
        profileId: "claimboundary-v2-precutover-damaged",
        profileVersion: "0",
        reportWriterVersion: "v2.shell.0",
        narrativePromptSectionId: null,
        narrativePromptContentHash: null,
        modelTaskId: null,
        modelTaskVersion: null,
        configSnapshotHash: context.configSnapshot.configSnapshotHash,
        rendererVersion: "v2.shell-markdown.0",
        exportAdapterVersion: "v2.compatibility-view.0",
        sourceCommit: null,
        evidencePacketHash: null,
        replayFixtureId: null,
      },
      compatibility: {
        v1: {
          schemaVersion: "3.2.0-cb",
          adapterOnly: true,
          fallbackFields: {
            truthPercentage: 50,
            verdict: "UNVERIFIED",
            confidence: 0,
            claimBoundaries: [],
            claimVerdicts: [],
            searchQueries: [],
            qualityGates: compatibilityQualityGates,
          },
        },
      },
    },
  };
}
