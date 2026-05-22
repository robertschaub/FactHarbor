import {
  BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION,
  type BoundaryVerdictExecutionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import {
  INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION,
  type InternalAlphaReportResultCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result";
import { sha256Json } from "@/lib/analyzer-v2/util";

export const INTERNAL_ALPHA_REPORT_DRAFT_DECISION_VERSION =
  "v2.evidence-lifecycle.internal-alpha-report-draft.w8g" as const;
export const INTERNAL_ALPHA_REPORT_DRAFT_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-22_V2_HighJump_W8G_Internal_Alpha_Report_Draft_Package.md" as const;
export const INTERNAL_ALPHA_REPORT_DRAFT_MAX_MARKDOWN_BYTES = 32_768 as const;

export type InternalAlphaReportDraftStatus =
  | "internal_alpha_report_draft_created"
  | "internal_alpha_report_draft_blocked"
  | "internal_alpha_report_draft_damaged";

export type InternalAlphaReportDraftBlockedReason =
  | "internal_alpha_report_result_missing"
  | "internal_alpha_report_result_not_created"
  | "boundary_verdict_execution_missing"
  | "boundary_verdict_execution_not_accepted"
  | "boundary_verdict_review_payload_missing";

export type InternalAlphaReportDraftDamagedReason =
  | "lineage_mismatch"
  | "empty_report_draft"
  | "report_draft_too_large";

export type InternalAlphaReportDraftSideEffects = {
  readonly reportDraftProjected: boolean;
  readonly reportProseLlmCalled: false;
  readonly publicReportGenerated: false;
  readonly verdictPublished: false;
  readonly warningPublished: false;
  readonly confidencePublished: false;
  readonly truthPercentagePublished: false;
  readonly publicSurfaceWritten: false;
  readonly compatibilityProjectionWritten: false;
  readonly promptLoaded: false;
  readonly promptRendered: false;
  readonly modelCalled: false;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly parserExecuted: false;
  readonly sourceReliabilityRead: false;
  readonly sourceReliabilityWrite: false;
  readonly storageWrite: false;
};

export type InternalAlphaReportDraftDecision = {
  readonly decisionVersion: typeof INTERNAL_ALPHA_REPORT_DRAFT_DECISION_VERSION;
  readonly decisionId: string;
  readonly kind: "internal_alpha_report_draft";
  readonly status: InternalAlphaReportDraftStatus;
  readonly blockedReason: InternalAlphaReportDraftBlockedReason | null;
  readonly damagedReason: InternalAlphaReportDraftDamagedReason | null;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly defaultProjection: "hash_length_provenance_only";
  readonly parent: {
    readonly internalAlphaReportResultVersion: typeof INTERNAL_ALPHA_REPORT_RESULT_DECISION_VERSION | null;
    readonly internalAlphaReportResultStatus: InternalAlphaReportResultCandidate["status"] | null;
    readonly internalAlphaReportResultDecisionHash: string | null;
    readonly boundaryVerdictExecutionVersion: typeof BOUNDARY_VERDICT_EXECUTION_DECISION_VERSION | null;
    readonly boundaryVerdictExecutionStatus: BoundaryVerdictExecutionDecision["status"] | null;
    readonly boundaryVerdictExecutionDecisionHash: string | null;
    readonly boundaryVerdictExecutionResultPayloadHash: string | null;
    readonly boundaryVerdictExecutionReviewPayloadHash: string | null;
  };
  readonly draftMarkdown: string | null;
  readonly draftMarkdownHash: string | null;
  readonly draftMarkdownByteLength: number;
  readonly boundaryDraftCount: number;
  readonly verdictDraftCount: number;
  readonly citedEvidenceItemRefCount: number;
  readonly citedEvidenceItemRefHashes: readonly string[];
  readonly reportReviewReadiness:
    | "ready_for_internal_alpha_report_review"
    | "blocked_before_internal_alpha_report_review"
    | "damaged_before_internal_alpha_report_review";
  readonly redaction: {
    readonly draftMarkdownReturnedByDefault: false;
    readonly sourceTextReturned: false;
    readonly evidenceItemTextReturned: false;
    readonly inputTextReturned: false;
    readonly promptTextReturned: false;
    readonly providerPayloadReturned: false;
    readonly hiddenLedgerReferenceReturned: false;
    readonly publicVerdictReturned: false;
    readonly publicTruthPercentageReturned: false;
    readonly publicConfidenceReturned: false;
    readonly publicWarningReturned: false;
  };
  readonly sideEffects: InternalAlphaReportDraftSideEffects;
  readonly retirementTrigger:
    "merge_w8g_into_stable_report_writer_after_internal_report_review_accepts_output_shape";
  readonly approvalPointer: typeof INTERNAL_ALPHA_REPORT_DRAFT_SOURCE_PACKAGE;
};

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function hashText(value: string): string {
  return sha256Json({ value });
}

function noSideEffects(projected = false): InternalAlphaReportDraftSideEffects {
  return {
    reportDraftProjected: projected,
    reportProseLlmCalled: false,
    publicReportGenerated: false,
    verdictPublished: false,
    warningPublished: false,
    confidencePublished: false,
    truthPercentagePublished: false,
    publicSurfaceWritten: false,
    compatibilityProjectionWritten: false,
    promptLoaded: false,
    promptRendered: false,
    modelCalled: false,
    cacheRead: false,
    cacheWrite: false,
    parserExecuted: false,
    sourceReliabilityRead: false,
    sourceReliabilityWrite: false,
    storageWrite: false,
  };
}

function redaction(): InternalAlphaReportDraftDecision["redaction"] {
  return {
    draftMarkdownReturnedByDefault: false,
    sourceTextReturned: false,
    evidenceItemTextReturned: false,
    inputTextReturned: false,
    promptTextReturned: false,
    providerPayloadReturned: false,
    hiddenLedgerReferenceReturned: false,
    publicVerdictReturned: false,
    publicTruthPercentageReturned: false,
    publicConfidenceReturned: false,
    publicWarningReturned: false,
  };
}

function parentProjection(input: {
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
}): InternalAlphaReportDraftDecision["parent"] {
  return {
    internalAlphaReportResultVersion: input.internalAlphaReportResult?.decisionVersion ?? null,
    internalAlphaReportResultStatus: input.internalAlphaReportResult?.status ?? null,
    internalAlphaReportResultDecisionHash: input.internalAlphaReportResult
      ? sha256Json({
        decisionVersion: input.internalAlphaReportResult.decisionVersion,
        decisionId: input.internalAlphaReportResult.decisionId,
        status: input.internalAlphaReportResult.status,
      })
      : null,
    boundaryVerdictExecutionVersion: input.boundaryVerdictExecution?.decisionVersion ?? null,
    boundaryVerdictExecutionStatus: input.boundaryVerdictExecution?.status ?? null,
    boundaryVerdictExecutionDecisionHash: input.boundaryVerdictExecution
      ? sha256Json({
        decisionVersion: input.boundaryVerdictExecution.decisionVersion,
        decisionId: input.boundaryVerdictExecution.decisionId,
        status: input.boundaryVerdictExecution.status,
      })
      : null,
    boundaryVerdictExecutionResultPayloadHash: input.boundaryVerdictExecution?.resultPayloadHash ?? null,
    boundaryVerdictExecutionReviewPayloadHash:
      input.boundaryVerdictExecution?.internalReviewPayload?.payloadHash ?? null,
  };
}

function blockedDecision(input: {
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
  readonly reason: InternalAlphaReportDraftBlockedReason;
}): InternalAlphaReportDraftDecision {
  return decision({
    parent: parentProjection(input),
    status: "internal_alpha_report_draft_blocked",
    blockedReason: input.reason,
    damagedReason: null,
    draftMarkdown: null,
    boundaryDraftCount: 0,
    verdictDraftCount: 0,
    citedEvidenceItemRefs: [],
  });
}

function damagedDecision(input: {
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
  readonly reason: InternalAlphaReportDraftDamagedReason;
  readonly draftMarkdown?: string | null;
  readonly boundaryDraftCount?: number;
  readonly verdictDraftCount?: number;
  readonly citedEvidenceItemRefs?: readonly string[];
}): InternalAlphaReportDraftDecision {
  return decision({
    parent: parentProjection(input),
    status: "internal_alpha_report_draft_damaged",
    blockedReason: null,
    damagedReason: input.reason,
    draftMarkdown: input.draftMarkdown ?? null,
    boundaryDraftCount: input.boundaryDraftCount ?? 0,
    verdictDraftCount: input.verdictDraftCount ?? 0,
    citedEvidenceItemRefs: input.citedEvidenceItemRefs ?? [],
  });
}

function decision(input: {
  readonly parent: InternalAlphaReportDraftDecision["parent"];
  readonly status: InternalAlphaReportDraftStatus;
  readonly blockedReason: InternalAlphaReportDraftBlockedReason | null;
  readonly damagedReason: InternalAlphaReportDraftDamagedReason | null;
  readonly draftMarkdown: string | null;
  readonly boundaryDraftCount: number;
  readonly verdictDraftCount: number;
  readonly citedEvidenceItemRefs: readonly string[];
}): InternalAlphaReportDraftDecision {
  const draftMarkdownHash = input.draftMarkdown ? hashText(input.draftMarkdown) : null;
  const draftMarkdownByteLength = input.draftMarkdown ? byteLength(input.draftMarkdown) : 0;
  const readiness = input.status === "internal_alpha_report_draft_created"
    ? "ready_for_internal_alpha_report_review"
    : input.status === "internal_alpha_report_draft_blocked"
      ? "blocked_before_internal_alpha_report_review"
      : "damaged_before_internal_alpha_report_review";
  const decisionHash = sha256Json({
    parent: input.parent,
    status: input.status,
    blockedReason: input.blockedReason,
    damagedReason: input.damagedReason,
    draftMarkdownHash,
    draftMarkdownByteLength,
  });

  return {
    decisionVersion: INTERNAL_ALPHA_REPORT_DRAFT_DECISION_VERSION,
    decisionId: `INTERNAL_ALPHA_REPORT_DRAFT_${decisionHash.slice(0, 24).toUpperCase()}`,
    kind: "internal_alpha_report_draft",
    status: input.status,
    blockedReason: input.blockedReason,
    damagedReason: input.damagedReason,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parent: input.parent,
    draftMarkdown: input.draftMarkdown,
    draftMarkdownHash,
    draftMarkdownByteLength,
    boundaryDraftCount: input.boundaryDraftCount,
    verdictDraftCount: input.verdictDraftCount,
    citedEvidenceItemRefCount: input.citedEvidenceItemRefs.length,
    citedEvidenceItemRefHashes: input.citedEvidenceItemRefs.map(hashText).sort(),
    reportReviewReadiness: readiness,
    redaction: redaction(),
    sideEffects: noSideEffects(input.status === "internal_alpha_report_draft_created"),
    retirementTrigger: "merge_w8g_into_stable_report_writer_after_internal_report_review_accepts_output_shape",
    approvalPointer: INTERNAL_ALPHA_REPORT_DRAFT_SOURCE_PACKAGE,
  };
}

function renderDraftMarkdown(
  boundaryVerdictExecution: BoundaryVerdictExecutionDecision,
): string {
  const payload = boundaryVerdictExecution.internalReviewPayload;
  if (!payload) {
    return "";
  }
  const lines: string[] = [
    "# Internal Alpha Report Draft",
    "",
    "Status: internal Alpha review candidate. Public V2 remains blocked/precutover.",
    "",
    "## Verdict Candidates",
    "",
  ];

  for (const verdict of payload.verdictSetCandidate.verdictCandidates) {
    lines.push(
      `### ${verdict.verdictCandidateId}: ${verdict.internalVerdictLabelCandidate}`,
      "",
      `Internal truth candidate: ${verdict.internalTruthPercentageCandidate}`,
      `Internal confidence candidate: ${verdict.internalConfidenceCandidate}`,
      `Boundary candidates: ${verdict.boundaryCandidateIds.join(", ")}`,
      `EvidenceItem refs: ${verdict.evidenceItemIds.join(", ")}`,
      "",
      verdict.rationale,
      "",
    );
    if (verdict.caveats.length > 0) {
      lines.push("Caveats:");
      for (const caveat of verdict.caveats) {
        lines.push(`- ${caveat}`);
      }
      lines.push("");
    }
    if (verdict.materialUncertaintySignals.length > 0) {
      lines.push("Material uncertainty signals:");
      for (const signal of verdict.materialUncertaintySignals) {
        lines.push(`- ${signal}`);
      }
      lines.push("");
    }
  }

  lines.push("## ClaimAssessmentBoundary Candidates", "");
  for (const boundary of payload.boundarySetCandidate.boundaries) {
    lines.push(
      `### ${boundary.boundaryCandidateId}: ${boundary.title}`,
      "",
      `AtomicClaim refs: ${boundary.targetAtomicClaimIds.join(", ")}`,
      `EvidenceItem refs: ${boundary.evidenceItemIds.join(", ")}`,
      "",
      `Evidence scope: ${boundary.evidenceScopeSummary}`,
      "",
      boundary.rationale,
      "",
    );
  }

  lines.push(
    "## Warning Materiality",
    "",
    `Upstream sufficiency: ${payload.warningMaterialityInputs.upstreamSufficiencyStatus}`,
    `Recommended next action: ${payload.warningMaterialityInputs.upstreamRecommendedNextAction}`,
    `Boundary/verdict integrity events: ${payload.warningMaterialityInputs.boundaryVerdictIntegrityEventCount}`,
    `Material uncertainty signals: ${payload.warningMaterialityInputs.candidateMaterialUncertaintySignalCount}`,
    "User-visible warning publication: closed",
    "",
  );

  return `${lines.join("\n").trim()}\n`;
}

export function buildInternalAlphaReportDraftDecision(input: {
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
}): InternalAlphaReportDraftDecision {
  if (!input.internalAlphaReportResult) {
    return blockedDecision({ ...input, reason: "internal_alpha_report_result_missing" });
  }
  if (input.internalAlphaReportResult.status !== "internal_alpha_report_result_candidate_created") {
    return blockedDecision({ ...input, reason: "internal_alpha_report_result_not_created" });
  }
  if (!input.boundaryVerdictExecution) {
    return blockedDecision({ ...input, reason: "boundary_verdict_execution_missing" });
  }
  if (input.boundaryVerdictExecution.status !== "boundary_verdict_candidates_created_internal") {
    return blockedDecision({ ...input, reason: "boundary_verdict_execution_not_accepted" });
  }
  if (!input.boundaryVerdictExecution.internalReviewPayload) {
    return blockedDecision({ ...input, reason: "boundary_verdict_review_payload_missing" });
  }
  if (
    input.internalAlphaReportResult.inputLineage.boundaryVerdictExecutionDecisionId !==
      input.boundaryVerdictExecution.decisionId ||
    input.internalAlphaReportResult.boundaryVerdictSummary.resultPayloadHash !==
      input.boundaryVerdictExecution.resultPayloadHash
  ) {
    return damagedDecision({ ...input, reason: "lineage_mismatch" });
  }

  const draftMarkdown = renderDraftMarkdown(input.boundaryVerdictExecution);
  const payload = input.boundaryVerdictExecution.internalReviewPayload;
  const citedEvidenceItemRefs = Array.from(new Set([
    ...payload.boundarySetCandidate.boundaries.flatMap((boundary) => boundary.evidenceItemIds),
    ...payload.verdictSetCandidate.verdictCandidates.flatMap((verdict) => verdict.evidenceItemIds),
  ])).sort();
  if (draftMarkdown.trim().length === 0 || citedEvidenceItemRefs.length === 0) {
    return damagedDecision({ ...input, reason: "empty_report_draft", draftMarkdown });
  }
  if (byteLength(draftMarkdown) > INTERNAL_ALPHA_REPORT_DRAFT_MAX_MARKDOWN_BYTES) {
    return damagedDecision({
      ...input,
      reason: "report_draft_too_large",
      draftMarkdown: null,
      boundaryDraftCount: payload.boundarySetCandidate.boundaries.length,
      verdictDraftCount: payload.verdictSetCandidate.verdictCandidates.length,
      citedEvidenceItemRefs,
    });
  }

  return decision({
    parent: parentProjection(input),
    status: "internal_alpha_report_draft_created",
    blockedReason: null,
    damagedReason: null,
    draftMarkdown,
    boundaryDraftCount: payload.boundarySetCandidate.boundaries.length,
    verdictDraftCount: payload.verdictSetCandidate.verdictCandidates.length,
    citedEvidenceItemRefs,
  });
}
