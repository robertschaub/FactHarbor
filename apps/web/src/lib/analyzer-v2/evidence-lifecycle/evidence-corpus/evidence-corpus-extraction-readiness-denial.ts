import {
  EVIDENCE_CORPUS_SHELL_DECISION_VERSION,
  EVIDENCE_CORPUS_SHELL_VERSION,
  type EvidenceCorpusShellDecision,
} from "./evidence-corpus-shell";

export const EVIDENCE_CORPUS_EXTRACTION_READINESS_DENIAL_DECISION_VERSION =
  "v2.evidence-lifecycle.evidence-corpus-extraction-readiness-denial.x7w4e";

export type EvidenceCorpusExtractionReadinessRuntimeOwnership =
  | "owned"
  | "not_owned"
  | "mutated_after_provenance";

export type EvidenceCorpusExtractionReadinessDenialStatus =
  | "extraction_denied_shell_only"
  | "extraction_denied_corpus_text_access_closed"
  | "extraction_denied_extraction_input_absent"
  | "extraction_denied_semantic_extraction_unauthorized"
  | "extraction_denied_evidence_item_extraction_unauthorized"
  | "extraction_denied_corpus_not_runtime_owned"
  | "extraction_denied_corpus_post_mark_mutated"
  | "extraction_denied_corpus_status_not_positive"
  | "extraction_denied_corpus_kind_unsupported"
  | "extraction_denied_corpus_lineage_invalid"
  | "extraction_denied_structural";

export type EvidenceCorpusExtractionReadinessDenialStopReason =
  | "shell_only_corpus"
  | "corpus_text_access_closed"
  | "extraction_input_absent"
  | "semantic_extraction_not_authorized"
  | "evidence_item_extraction_not_authorized"
  | "runtime_ownership_missing"
  | "corpus_post_mark_mutated"
  | "w4d_shell_not_created"
  | "unsupported_corpus_kind"
  | "shell_lineage_inconsistent"
  | "structural_exception";

export type EvidenceCorpusExtractionReadinessDenialClosedExecutionFlags = {
  readonly parserExecuted: false;
  readonly cacheRead: false;
  readonly cacheWrite: false;
  readonly storageWrite: false;
  readonly sourceReliabilityCalled: false;
  readonly evidenceItemGenerated: false;
  readonly warningGenerated: false;
  readonly reportGenerated: false;
  readonly verdictGenerated: false;
  readonly confidenceGenerated: false;
  readonly publicSurfaceWritten: false;
};

export type EvidenceCorpusExtractionReadinessDenialDecision = {
  readonly decisionVersion: typeof EVIDENCE_CORPUS_EXTRACTION_READINESS_DENIAL_DECISION_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly status: EvidenceCorpusExtractionReadinessDenialStatus;
  readonly stopReason: EvidenceCorpusExtractionReadinessDenialStopReason;
  readonly parent: {
    readonly shellDecisionVersion: typeof EVIDENCE_CORPUS_SHELL_DECISION_VERSION | null;
    readonly shellStatus: string | null;
    readonly shellStopReason: string | null;
    readonly shellVersion: typeof EVIDENCE_CORPUS_SHELL_VERSION | null;
    readonly evidenceCorpusId: string | null;
  };
  readonly parentAdmissionLineage: {
    readonly admissionDecisionVersion: string | null;
    readonly admissionStatus: string | null;
    readonly corpusAdmissionInputId: string | null;
  };
  readonly evidenceCorpusKind: "shell_only" | null;
  readonly corpusTextAccess: "closed" | null;
  readonly semanticExtractionAuthorized: false;
  readonly evidenceItemExtractionAuthorized: false;
  readonly extractionInput: null;
  readonly evidenceItems: readonly [];
  readonly downstreamGate: "evidence_item_extraction_denied_shell_only";
  readonly publicCutoverStatus: "blocked_precutover";
  readonly productExecution: {
    readonly extractionReadinessDenied: true;
    readonly parserExecuted: false;
    readonly cacheRead: false;
    readonly cacheWrite: false;
    readonly storageWrite: false;
    readonly sourceReliabilityCalled: false;
    readonly evidenceItemGenerated: false;
    readonly warningGenerated: false;
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
    readonly confidenceGenerated: false;
    readonly publicSurfaceWritten: false;
  };
};

const POSITIVE_SHELL_STATUS = "evidence_corpus_shell_created_extraction_gate_closed";

const FORBIDDEN_FIELD_NAMES = new Set([
  "sourceMaterialText",
  "rawProviderJson",
  "rawUrl",
  "rawPageTitle",
  "rawPageKey",
  "providerReturnedUrl",
  "requestUrl",
  "headers",
  "cookies",
  "secrets",
  "stackTrace",
  "lowLevelExceptionText",
  "parserPacket",
  "parsedMaterial",
  "llmPromptText",
  "extractionInputPacket",
  "evidenceStatement",
  "sourceReliabilityScore",
  "probativeValue",
  "claimDirection",
  "verdictLabel",
  "truthPercentage",
  "confidence",
  "warning",
  "reportMarkdown",
  "reportProse",
  "publicCompatibilityFields",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0;
}

function hasForbiddenFieldName(value: unknown, seen = new WeakSet<object>()): boolean {
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return value.some((item) => hasForbiddenFieldName(item, seen));
  }
  if (!isRecord(value)) {
    return false;
  }
  if (seen.has(value)) {
    return false;
  }
  seen.add(value);
  for (const [key, childValue] of Object.entries(value)) {
    if (FORBIDDEN_FIELD_NAMES.has(key) || hasForbiddenFieldName(childValue, seen)) {
      return true;
    }
  }
  return false;
}

function closedFlags(value: unknown): value is EvidenceCorpusExtractionReadinessDenialClosedExecutionFlags {
  return isRecord(value)
    && value.parserExecuted === false
    && value.cacheRead === false
    && value.cacheWrite === false
    && value.storageWrite === false
    && value.sourceReliabilityCalled === false
    && value.evidenceItemGenerated === false
    && value.warningGenerated === false
    && value.reportGenerated === false
    && value.verdictGenerated === false
    && value.confidenceGenerated === false
    && value.publicSurfaceWritten === false;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function parentSummary(value: unknown): EvidenceCorpusExtractionReadinessDenialDecision["parent"] {
  if (!isRecord(value)) {
    return {
      shellDecisionVersion: null,
      shellStatus: null,
      shellStopReason: null,
      shellVersion: null,
      evidenceCorpusId: null,
    };
  }
  const corpus = isRecord(value.evidenceCorpus) ? value.evidenceCorpus : null;
  return {
    shellDecisionVersion: value.decisionVersion === EVIDENCE_CORPUS_SHELL_DECISION_VERSION
      ? EVIDENCE_CORPUS_SHELL_DECISION_VERSION
      : null,
    shellStatus: readString(value.status),
    shellStopReason: readString(value.stopReason),
    shellVersion: corpus?.shellVersion === EVIDENCE_CORPUS_SHELL_VERSION ? EVIDENCE_CORPUS_SHELL_VERSION : null,
    evidenceCorpusId: readString(corpus?.evidenceCorpusId),
  };
}

function admissionLineageSummary(
  value: unknown,
): EvidenceCorpusExtractionReadinessDenialDecision["parentAdmissionLineage"] {
  const corpus = isRecord(value) && isRecord(value.evidenceCorpus) ? value.evidenceCorpus : null;
  const lineage = corpus && isRecord(corpus.admissionLineage) ? corpus.admissionLineage : null;
  return {
    admissionDecisionVersion: readString(lineage?.admissionDecisionVersion),
    admissionStatus: readString(lineage?.admissionStatus),
    corpusAdmissionInputId: readString(lineage?.corpusAdmissionInputId),
  };
}

function deny(
  input: unknown,
  status: EvidenceCorpusExtractionReadinessDenialStatus,
  stopReason: EvidenceCorpusExtractionReadinessDenialStopReason,
): EvidenceCorpusExtractionReadinessDenialDecision {
  const corpus = isRecord(input) && isRecord(input.evidenceCorpus) ? input.evidenceCorpus : null;
  return {
    decisionVersion: EVIDENCE_CORPUS_EXTRACTION_READINESS_DENIAL_DECISION_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    status,
    stopReason,
    parent: parentSummary(input),
    parentAdmissionLineage: admissionLineageSummary(input),
    evidenceCorpusKind: corpus?.kind === "shell_only" ? "shell_only" : null,
    corpusTextAccess: corpus?.corpusTextAccess === "closed" ? "closed" : null,
    semanticExtractionAuthorized: false,
    evidenceItemExtractionAuthorized: false,
    extractionInput: null,
    evidenceItems: [],
    downstreamGate: "evidence_item_extraction_denied_shell_only",
    publicCutoverStatus: "blocked_precutover",
    productExecution: {
      extractionReadinessDenied: true,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
    },
  };
}

function hasValidShellLineage(corpus: Record<string, unknown>): boolean {
  return isRecord(corpus.admissionLineage)
    && corpus.admissionLineage.admissionDecisionVersion
      === "v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c"
    && corpus.admissionLineage.admissionStatus === "source_material_admitted_to_corpus_input_gate_closed"
    && corpus.admissionLineage.admissionStopReason === "not_stopped"
    && typeof corpus.admissionLineage.corpusAdmissionInputId === "string"
    && corpus.admissionLineage.corpusAdmissionInputId.trim().length > 0
    && isRecord(corpus.readinessLineage)
    && typeof corpus.readinessLineage.readinessDecisionVersion === "string"
    && typeof corpus.readinessLineage.readinessStatus === "string"
    && typeof corpus.readinessLineage.readinessStopReason === "string";
}

function validatePositiveShellDecision(value: Record<string, unknown>):
  | { readonly ok: true; readonly shell: Record<string, unknown> }
  | {
    readonly ok: false;
    readonly status: EvidenceCorpusExtractionReadinessDenialStatus;
    readonly stopReason: EvidenceCorpusExtractionReadinessDenialStopReason;
  } {
  if (value.decisionVersion !== EVIDENCE_CORPUS_SHELL_DECISION_VERSION) {
    return {
      ok: false,
      status: "extraction_denied_corpus_lineage_invalid",
      stopReason: "shell_lineage_inconsistent",
    };
  }
  if (
    value.visibility !== "internal_admin_only"
    || value.publicPointerExposure !== "forbidden"
    || value.downstreamGate !== "evidence_item_extraction_gate_closed"
    || value.publicCutoverStatus !== "blocked_precutover"
  ) {
    return { ok: false, status: "extraction_denied_structural", stopReason: "structural_exception" };
  }
  if (value.status !== POSITIVE_SHELL_STATUS) {
    return {
      ok: false,
      status: "extraction_denied_corpus_status_not_positive",
      stopReason: "w4d_shell_not_created",
    };
  }
  if (!isRecord(value.evidenceCorpus)) {
    return {
      ok: false,
      status: "extraction_denied_extraction_input_absent",
      stopReason: "extraction_input_absent",
    };
  }
  const shell = value.evidenceCorpus;
  if (shell.kind !== "shell_only") {
    return {
      ok: false,
      status: "extraction_denied_corpus_kind_unsupported",
      stopReason: "unsupported_corpus_kind",
    };
  }
  if (shell.shellVersion !== EVIDENCE_CORPUS_SHELL_VERSION || !hasValidShellLineage(shell)) {
    return {
      ok: false,
      status: "extraction_denied_corpus_lineage_invalid",
      stopReason: "shell_lineage_inconsistent",
    };
  }
  if (shell.corpusTextAccess !== "closed") {
    return {
      ok: false,
      status: "extraction_denied_corpus_text_access_closed",
      stopReason: "corpus_text_access_closed",
    };
  }
  if (value.semanticExtractionAuthorized !== false || shell.semanticExtractionAuthorized !== false) {
    return {
      ok: false,
      status: "extraction_denied_semantic_extraction_unauthorized",
      stopReason: "semantic_extraction_not_authorized",
    };
  }
  if (value.evidenceItemExtractionAuthorized !== false || shell.evidenceItemExtractionAuthorized !== false) {
    return {
      ok: false,
      status: "extraction_denied_evidence_item_extraction_unauthorized",
      stopReason: "evidence_item_extraction_not_authorized",
    };
  }
  if (value.extractionInput !== null) {
    return { ok: false, status: "extraction_denied_structural", stopReason: "structural_exception" };
  }
  if (!isEmptyArray(value.evidenceItems)) {
    return { ok: false, status: "extraction_denied_structural", stopReason: "structural_exception" };
  }
  if (!closedFlags(shell.downstreamExecution) || !isRecord(value.productExecution)) {
    return { ok: false, status: "extraction_denied_structural", stopReason: "structural_exception" };
  }
  if (
    value.productExecution.semanticExtractionAuthorized !== false
    || value.productExecution.evidenceItemExtractionAuthorized !== false
    || value.productExecution.parserExecuted !== false
    || value.productExecution.cacheRead !== false
    || value.productExecution.cacheWrite !== false
    || value.productExecution.storageWrite !== false
    || value.productExecution.sourceReliabilityCalled !== false
    || value.productExecution.evidenceItemGenerated !== false
    || value.productExecution.warningGenerated !== false
    || value.productExecution.reportGenerated !== false
    || value.productExecution.verdictGenerated !== false
    || value.productExecution.confidenceGenerated !== false
    || value.productExecution.publicSurfaceWritten !== false
  ) {
    return { ok: false, status: "extraction_denied_structural", stopReason: "structural_exception" };
  }
  return { ok: true, shell };
}

export function buildEvidenceCorpusExtractionReadinessDenial(params: {
  readonly evidenceCorpusShellDecision: unknown;
  readonly runtimeOwnership: EvidenceCorpusExtractionReadinessRuntimeOwnership;
}): EvidenceCorpusExtractionReadinessDenialDecision {
  if (params.runtimeOwnership === "mutated_after_provenance") {
    return deny(
      params.evidenceCorpusShellDecision,
      "extraction_denied_corpus_post_mark_mutated",
      "corpus_post_mark_mutated",
    );
  }
  if (params.runtimeOwnership !== "owned") {
    return deny(
      params.evidenceCorpusShellDecision,
      "extraction_denied_corpus_not_runtime_owned",
      "runtime_ownership_missing",
    );
  }
  if (!isRecord(params.evidenceCorpusShellDecision) || hasForbiddenFieldName(params.evidenceCorpusShellDecision)) {
    return deny(params.evidenceCorpusShellDecision, "extraction_denied_structural", "structural_exception");
  }

  const validation = validatePositiveShellDecision(
    params.evidenceCorpusShellDecision as EvidenceCorpusShellDecision as unknown as Record<string, unknown>,
  );
  if (!validation.ok) {
    return deny(params.evidenceCorpusShellDecision, validation.status, validation.stopReason);
  }

  return deny(params.evidenceCorpusShellDecision, "extraction_denied_shell_only", "shell_only_corpus");
}
