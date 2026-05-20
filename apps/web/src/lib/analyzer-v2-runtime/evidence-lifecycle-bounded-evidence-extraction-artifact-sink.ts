import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import {
  buildBoundedEvidenceItemAdmissionDecision,
  BOUNDED_EVIDENCE_ITEM_ADMISSION_DEFAULT_PROJECTION_MAX_TOP_LEVEL_FIELDS,
  type BoundedEvidenceItemAdmissionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission";
import {
  buildEvidenceItemHandoffDecision,
  type EvidenceItemHandoffDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import {
  BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_VERSION,
  type BoundedEvidenceExtractionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import { sha256Json } from "@/lib/analyzer-v2/util";
import {
  isBoundedEvidenceExtractionRuntimeOwnedDecision,
  type BoundedEvidenceExtractionRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance";

export const BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_SERIALIZED_BYTES = 32_768 as const;
export const BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256 as const;

const BOUNDED_EVIDENCE_EXTRACTION_SCHEMA_DIAGNOSTICS_REMOVAL_TRIGGER =
  "remove_or_fold_into_stable_w5_telemetry_after_schema_root_cause_resolution_and_later_captain_approved_canary" as const;
const BOUNDED_EVIDENCE_EXTRACTION_SCHEMA_DIAGNOSTIC_VERSION =
  "v2.evidence-lifecycle.bounded-evidence-extraction.schema-diagnostics.x7w5c" as const;
const BOUNDED_EVIDENCE_ITEM_ADMISSION_DECISION_VERSION =
  "v2.evidence-lifecycle.bounded-evidence-item-admission.x7w5e" as const;
const BOUNDED_EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION = "v2.evidence_extraction_result.0" as const;
const MAX_DEFAULT_PROJECTION_SCHEMA_DIAGNOSTIC_ISSUES = 8;
const MAX_DEFAULT_PROJECTION_SCHEMA_PATH_SEGMENTS = 8;

type BoundedEvidenceExtractionSchemaDiagnostics =
  NonNullable<BoundedEvidenceExtractionDecision["executionTelemetry"]["schemaDiagnostics"]>;
type BoundedEvidenceExtractionSchemaDiagnosticIssue =
  BoundedEvidenceExtractionSchemaDiagnostics["issues"][number];

const SAFE_DIAGNOSTIC_CODES = new Set([
  "approved_packet_mismatch",
  "custom",
  "empty_evidence_statement",
  "invalid_arguments",
  "invalid_date",
  "invalid_enum_value",
  "invalid_intersection_types",
  "invalid_literal",
  "invalid_return_type",
  "invalid_string",
  "invalid_type",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_value",
  "json_parse_error",
  "missing_target_atomic_claims",
  "not_finite",
  "not_multiple_of",
  "too_big",
  "too_small",
  "unrecognized_keys",
  "unknown",
  "unselected_target_atomic_claim",
]);

const SAFE_DIAGNOSTIC_PATH_SEGMENTS = new Set([
  "blockedReason",
  "claimDirection",
  "contentPacketId",
  "damagedReason",
  "evidenceItemId",
  "evidenceItems",
  "evidenceScope",
  "evidenceStrength",
  "extractionConfidence",
  "extractionStatus",
  "geographicScope",
  "integrityEvents",
  "limitations",
  "locator",
  "method",
  "populationOrDomain",
  "probativeValue",
  "provenance",
  "rationale",
  "schemaVersion",
  "scopeId",
  "sourceRecordId",
  "sourceType",
  "statement",
  "status",
  "targetAtomicClaimIds",
  "taskKey",
  "temporalBounds",
]);

export type BoundedEvidenceExtractionRuntimeArtifact = {
  readonly artifactVersion: typeof BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_VERSION;
  readonly source: "product_v2_orchestrator_after_bounded_evidence_extraction";
  readonly ledgerId: string;
  readonly runId: string;
  readonly contextGeneratedUtc: string;
  readonly decisionHash: string;
  readonly defaultProjection: "hash_length_provenance_only";
  readonly inputTextReturned: false;
  readonly evidenceItemTextReturned: false;
  readonly sourceTextReturned: false;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionRuntimeOwnedDecision;
  readonly boundedEvidenceItemAdmission: BoundedEvidenceItemAdmissionDecision;
};

export type BoundedEvidenceExtractionItemDefaultProjection = Pick<
  BoundedEvidenceExtractionDecision["evidenceItemStatementProjections"][number],
  | "evidenceItemId"
  | "sourceRecordId"
  | "contentPacketId"
  | "statementHash"
  | "statementByteLength"
  | "statementCharLength"
  | "evidenceScopeHash"
  | "provenanceHash"
>;

export type BoundedEvidenceExtractionDecisionDefaultProjection =
  Omit<BoundedEvidenceExtractionDecision, "extractionResult" | "evidenceItemStatementProjections"> & {
    readonly extractionResult: null;
    readonly evidenceItemStatementProjections: readonly BoundedEvidenceExtractionItemDefaultProjection[];
    readonly evidenceItemTextAccess: "redacted_default_hash_length_provenance_only";
    readonly sourceTextAccess: "redacted_default_hash_length_provenance_only";
  };

export type BoundedEvidenceExtractionRuntimeArtifactDefaultProjection =
  Omit<BoundedEvidenceExtractionRuntimeArtifact, "boundedEvidenceExtraction"> & {
    readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecisionDefaultProjection;
    readonly evidenceItemHandoff: EvidenceItemHandoffDecision;
  };
type PossiblyLegacyBoundedEvidenceExtractionRuntimeArtifact =
  Omit<BoundedEvidenceExtractionRuntimeArtifact, "boundedEvidenceItemAdmission"> & {
    readonly boundedEvidenceItemAdmission?: BoundedEvidenceItemAdmissionDecision;
  };

type ArtifactLedger = Map<string, BoundedEvidenceExtractionRuntimeArtifact[]>;

type BoundedEvidenceExtractionArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2BoundedEvidenceExtractionArtifactLedgers?: ArtifactLedger;
};

function ledger(): ArtifactLedger {
  const globalLedger = globalThis as BoundedEvidenceExtractionArtifactLedgerGlobal;
  globalLedger.__factHarborV2BoundedEvidenceExtractionArtifactLedgers ??=
    new Map<string, BoundedEvidenceExtractionRuntimeArtifact[]>();
  return globalLedger.__factHarborV2BoundedEvidenceExtractionArtifactLedgers;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function recordBoundedEvidenceExtractionRuntimeArtifact(input: {
  readonly context: PipelineRunContext;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision;
}): BoundedEvidenceExtractionRuntimeArtifact | null {
  if (!isValidLedgerId(input.context.observabilityLedger.ledgerId)) {
    return null;
  }
  if (!isBoundedEvidenceExtractionRuntimeOwnedDecision(input.boundedEvidenceExtraction)) {
    return null;
  }

  const artifact: BoundedEvidenceExtractionRuntimeArtifact = {
    artifactVersion: BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_VERSION,
    source: "product_v2_orchestrator_after_bounded_evidence_extraction",
    ledgerId: input.context.observabilityLedger.ledgerId,
    runId: input.context.runId,
    contextGeneratedUtc: input.context.generatedUtc,
    decisionHash: sha256Json(input.boundedEvidenceExtraction),
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

  if (!isWithinSerializedLimit(artifact)) {
    return null;
  }

  const store = ledger();
  while (store.size >= BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_LEDGER_COUNT) {
    const oldest = store.keys().next().value as string | undefined;
    if (!oldest) {
      break;
    }
    store.delete(oldest);
  }
  const records = store.get(artifact.ledgerId) ?? [];
  store.set(artifact.ledgerId, [...records, cloneJson(artifact)].slice(-BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_RECORDS_PER_LEDGER));
  return artifact;
}

export function readBoundedEvidenceExtractionRuntimeArtifacts(
  ledgerId: string,
): readonly BoundedEvidenceExtractionRuntimeArtifact[] {
  if (!isValidLedgerId(ledgerId)) {
    return [];
  }
  return (ledger().get(ledgerId) ?? []).map(cloneJson);
}

export function readBoundedEvidenceExtractionRuntimeArtifactDefaultProjections(
  ledgerId: string,
): readonly BoundedEvidenceExtractionRuntimeArtifactDefaultProjection[] {
  return readBoundedEvidenceExtractionRuntimeArtifacts(ledgerId).map(
    redactBoundedEvidenceExtractionRuntimeArtifact,
  );
}

export function clearBoundedEvidenceExtractionRuntimeArtifacts(ledgerId?: string): void {
  const store = ledger();
  if (ledgerId) {
    store.delete(ledgerId);
    return;
  }
  store.clear();
}

export function redactBoundedEvidenceExtractionRuntimeArtifact(
  artifact: BoundedEvidenceExtractionRuntimeArtifact,
): BoundedEvidenceExtractionRuntimeArtifactDefaultProjection {
  const decision = artifact.boundedEvidenceExtraction;
  const boundedEvidenceItemAdmission = redactBoundedEvidenceItemAdmissionDecisionOrFailClosed(
    artifact as PossiblyLegacyBoundedEvidenceExtractionRuntimeArtifact,
  );
  const executionTelemetry = {
    ...decision.executionTelemetry,
    schemaDiagnostics: sanitizeSchemaDiagnosticsForDefaultProjection(
      decision.executionTelemetry.schemaDiagnostics,
    ),
  };
  return cloneJson({
    ...artifact,
    inputTextReturned: false,
    evidenceItemTextReturned: false,
    sourceTextReturned: false,
    boundedEvidenceExtraction: {
      ...decision,
      executionTelemetry,
      extractionResult: null,
      evidenceItemStatementProjections: decision.evidenceItemStatementProjections.map(
        redactEvidenceItemStatementProjection,
      ),
      evidenceItemTextReturnedByDefault: false,
      sourceTextReturnedByDefault: false,
      evidenceItemTextAccess: "redacted_default_hash_length_provenance_only",
      sourceTextAccess: "redacted_default_hash_length_provenance_only",
    },
    boundedEvidenceItemAdmission,
    evidenceItemHandoff: buildEvidenceItemHandoffDecision({
      boundedEvidenceExtraction: decision,
      boundedEvidenceItemAdmission,
    }),
  });
}

function redactBoundedEvidenceItemAdmissionDecisionOrFailClosed(
  artifact: PossiblyLegacyBoundedEvidenceExtractionRuntimeArtifact,
): BoundedEvidenceItemAdmissionDecision {
  if (artifact.boundedEvidenceItemAdmission) {
    return redactBoundedEvidenceItemAdmissionDecision(artifact.boundedEvidenceItemAdmission);
  }
  return missingAdmissionSnapshotDecision(artifact);
}

function missingAdmissionSnapshotDecision(
  artifact: PossiblyLegacyBoundedEvidenceExtractionRuntimeArtifact,
): BoundedEvidenceItemAdmissionDecision {
  const decision = artifact.boundedEvidenceExtraction;
  return {
    ledgerIdHash: sha256Json({ ledgerId: artifact.ledgerId, projection: "missing_w5e_admission" }),
    parentW5ArtifactId: decision.decisionId,
    admittedEvidenceItemCount: 0,
    evidenceItemStatementHashes: [],
    evidenceItemStatementByteLengths: [],
    sourceMaterialLineageHash: null,
    w4hPacketHash: decision.parent.parentPacketHash,
    w4iEligibilityStatus: decision.parent.w4iStatus,
    providerId: decision.parent.parentProviderId,
    modelId: decision.executionTelemetry.modelId,
    promptProfileId: "claimboundary-v2",
    schemaVersion: BOUNDED_EVIDENCE_ITEM_ADMISSION_DECISION_VERSION,
    admissionStatus: "evidence_item_admission_damaged",
    blockedReason: null,
    damagedReason: "missing_runtime_admission_snapshot",
    sideEffects: noAdmissionSideEffects(),
    defaultProjection: "hash_length_provenance_only",
    redaction: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
    },
  };
}

function redactBoundedEvidenceItemAdmissionDecision(
  decision: BoundedEvidenceItemAdmissionDecision,
): BoundedEvidenceItemAdmissionDecision {
  const sideEffects = {
    ...decision.sideEffects,
    evidenceItemTextReturned: false,
    sourceTextReturned: false,
    inputTextReturned: false,
    parserExecuted: false,
    reportGenerated: false,
    verdictGenerated: false,
    warningGenerated: false,
    confidenceGenerated: false,
    publicSurfaceWritten: false,
    cacheRead: false,
    cacheWrite: false,
    sourceReliabilityRead: false,
    sourceReliabilityWrite: false,
    storageWrite: false,
  } satisfies BoundedEvidenceItemAdmissionDecision["sideEffects"];
  const redaction = {
    evidenceItemTextReturned: false,
    sourceTextReturned: false,
    inputTextReturned: false,
  } satisfies BoundedEvidenceItemAdmissionDecision["redaction"];
  const projection = {
    ...decision,
    sideEffects,
    redaction,
  };

  if (Object.keys(projection).length > BOUNDED_EVIDENCE_ITEM_ADMISSION_DEFAULT_PROJECTION_MAX_TOP_LEVEL_FIELDS) {
    return {
      ...projection,
      admissionStatus: "evidence_item_admission_damaged",
      blockedReason: null,
      damagedReason: "projection_redaction_violation",
      admittedEvidenceItemCount: 0,
      evidenceItemStatementHashes: [],
      evidenceItemStatementByteLengths: [],
    };
  }

  return projection;
}

function noAdmissionSideEffects(): BoundedEvidenceItemAdmissionDecision["sideEffects"] {
  return {
    evidenceItemTextReturned: false,
    sourceTextReturned: false,
    inputTextReturned: false,
    parserExecuted: false,
    reportGenerated: false,
    verdictGenerated: false,
    warningGenerated: false,
    confidenceGenerated: false,
    publicSurfaceWritten: false,
    cacheRead: false,
    cacheWrite: false,
    sourceReliabilityRead: false,
    sourceReliabilityWrite: false,
    storageWrite: false,
  };
}

function redactEvidenceItemStatementProjection(
  projection: BoundedEvidenceExtractionDecision["evidenceItemStatementProjections"][number],
): BoundedEvidenceExtractionItemDefaultProjection {
  return {
    evidenceItemId: projection.evidenceItemId,
    sourceRecordId: projection.sourceRecordId,
    contentPacketId: projection.contentPacketId,
    statementHash: projection.statementHash,
    statementByteLength: projection.statementByteLength,
    statementCharLength: projection.statementCharLength,
    evidenceScopeHash: projection.evidenceScopeHash,
    provenanceHash: projection.provenanceHash,
  };
}

function sanitizeSchemaDiagnosticsForDefaultProjection(
  diagnostics: BoundedEvidenceExtractionSchemaDiagnostics | null,
): BoundedEvidenceExtractionSchemaDiagnostics | null {
  if (!diagnostics) {
    return null;
  }

  const rawIssues = Array.isArray(diagnostics.issues) ? diagnostics.issues : [];
  const issues = rawIssues
    .slice(0, MAX_DEFAULT_PROJECTION_SCHEMA_DIAGNOSTIC_ISSUES)
    .map(sanitizeSchemaDiagnosticIssueForDefaultProjection);

  return {
    diagnosticVersion: BOUNDED_EVIDENCE_EXTRACTION_SCHEMA_DIAGNOSTIC_VERSION,
    contractName: "EvidenceExtractionResultSchema",
    contractVersion: BOUNDED_EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
    outputParseStatus: safeOutputParseStatus(diagnostics.outputParseStatus),
    failureCategory: safeFailureCategory(diagnostics.failureCategory),
    issueCount: issues.length,
    issues,
    rawProviderOutputReturned: false,
    rawSchemaMessagesReturned: false,
    providerCompletionTextReturned: false,
    sourceTextReturned: false,
    inputTextReturned: false,
    evidenceItemTextReturned: false,
    promptTextReturned: false,
    stackTraceReturned: false,
    removalTrigger: BOUNDED_EVIDENCE_EXTRACTION_SCHEMA_DIAGNOSTICS_REMOVAL_TRIGGER,
  };
}

function sanitizeSchemaDiagnosticIssueForDefaultProjection(
  issue: BoundedEvidenceExtractionSchemaDiagnosticIssue,
): BoundedEvidenceExtractionSchemaDiagnosticIssue {
  const rawPath = Array.isArray(issue.path) ? issue.path : [];
  return {
    path: rawPath
      .slice(0, MAX_DEFAULT_PROJECTION_SCHEMA_PATH_SEGMENTS)
      .map(safeSchemaPathSegment),
    code: safeDiagnosticCode(issue.code),
  };
}

function safeDiagnosticCode(value: unknown): string {
  return typeof value === "string" && SAFE_DIAGNOSTIC_CODES.has(value)
    ? value
    : "unknown";
}

function safeSchemaPathSegment(value: unknown): string {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return String(value);
  }
  if (typeof value === "string" && SAFE_DIAGNOSTIC_PATH_SEGMENTS.has(value)) {
    return value;
  }
  return "[non_structural]";
}

function safeOutputParseStatus(
  value: BoundedEvidenceExtractionSchemaDiagnostics["outputParseStatus"],
): BoundedEvidenceExtractionSchemaDiagnostics["outputParseStatus"] {
  return value === "parse_failure" || value === "parsed" || value === "not_attempted"
    ? value
    : "not_attempted";
}

function safeFailureCategory(
  value: BoundedEvidenceExtractionSchemaDiagnostics["failureCategory"],
): BoundedEvidenceExtractionSchemaDiagnostics["failureCategory"] {
  return value === "parse_failure" ||
    value === "schema_validation" ||
    value === "task_contract_validation" ||
    value === "none"
    ? value
    : "none";
}

function isValidLedgerId(value: string): boolean {
  return value.length > 0 &&
    value.length <= BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_LEDGER_ID_LENGTH &&
    value.trim() === value &&
    /^[A-Za-z0-9:._-]+$/.test(value);
}

function isWithinSerializedLimit(value: unknown): boolean {
  return Buffer.byteLength(JSON.stringify(value), "utf8")
    <= BOUNDED_EVIDENCE_EXTRACTION_ARTIFACT_MAX_SERIALIZED_BYTES;
}
