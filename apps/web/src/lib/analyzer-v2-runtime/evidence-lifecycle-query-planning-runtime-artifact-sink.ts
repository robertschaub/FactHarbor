import type {
  EvidenceQueryPlanningRuntimeResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime";
import type {
  QueryPlanInspectionResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection";
import type {
  QueryPlanSourceAcquisitionHandoffDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import type {
  EvidenceQueryPlan,
  EvidenceQueryPlanEntry,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import { isRecord } from "@/lib/analyzer-v2/util";

export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_VERSION =
  "v2.evidence-query-planning.runtime-artifact.x7s";
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_SERIALIZED_BYTES = 32_768;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_QUERY_ENTRIES = 6;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_QUERY_TEXT_LENGTH = 240;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_QUERY_LABEL_LENGTH = 80;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_ATTEMPT_DIAGNOSTICS = 3;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_DIAGNOSTIC_ISSUES = 6;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_DIAGNOSTIC_TEXT_LENGTH = 240;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_DIAGNOSTIC_PATH_LENGTH = 160;

export type EvidenceQueryPlanningRuntimeArtifactQueryEntry = {
  readonly queryId: string;
  readonly retrievalPolicyKey: EvidenceQueryPlanEntry["retrievalPolicyKey"];
  readonly queryText: string;
  readonly targetAtomicClaimIds: readonly string[];
};

export type EvidenceQueryPlanningRuntimeArtifactDiagnosticIssue = {
  readonly path: string;
  readonly code: string;
  readonly message: string;
};

export type EvidenceQueryPlanningRuntimeArtifactAttemptDiagnostic = {
  readonly attemptNumber: number;
  readonly status: "accepted" | "invalid_schema" | "parse_failure" | "provider_failure";
  readonly promptContentHash: string;
  readonly providerTelemetry: {
    readonly providerId: string;
    readonly modelId: string;
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly totalTokens: number;
    readonly durationMs: number;
  } | null;
  readonly failureCategory: "none" | "schema_validation" | "parse_failure" | "provider_failure";
  readonly issueCount: number;
  readonly issues: readonly EvidenceQueryPlanningRuntimeArtifactDiagnosticIssue[];
};

export type EvidenceQueryPlanningRuntimeArtifact = {
  readonly artifactVersion: typeof EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_x7o_preexecution_observation";
  readonly activation: {
    readonly status: PipelineRunContext["queryPlanningRuntimeActivation"]["status"];
    readonly activationProfileId: PipelineRunContext["queryPlanningRuntimeActivation"]["activationProfileId"];
    readonly activationSnapshotHash: string;
    readonly sourcePackage: PipelineRunContext["queryPlanningRuntimeActivation"]["approvalPointer"]["sourcePackage"];
    readonly artifactVisibility: "internal_admin_only";
  };
  readonly runtime: {
    readonly runtimeVersion: EvidenceQueryPlanningRuntimeResult["runtimeVersion"];
    readonly status: EvidenceQueryPlanningRuntimeResult["status"];
    readonly blockedReason: EvidenceQueryPlanningRuntimeResult["blockedReason"];
    readonly resultStatus: EvidenceQueryPlanningRuntimeResult["result"]["status"];
    readonly resultBlockedReason: EvidenceQueryPlanningRuntimeResult["result"]["blockedReason"];
    readonly resultDamagedReason: EvidenceQueryPlanningRuntimeResult["result"]["damagedReason"];
  };
  readonly schemaOutcome: {
    readonly status: EvidenceQueryPlanningRuntimeResult["result"]["status"];
    readonly blockedReason: EvidenceQueryPlanningRuntimeResult["result"]["blockedReason"];
    readonly damagedReason: EvidenceQueryPlanningRuntimeResult["result"]["damagedReason"];
  };
  readonly selectedAtomicClaimIds: readonly string[];
  readonly queryEntryCount: number;
  readonly queryEntries: readonly EvidenceQueryPlanningRuntimeArtifactQueryEntry[];
  readonly sourceLanguagePolicy: EvidenceQueryPlan["sourceLanguagePolicy"] | null;
  readonly promptProvenance: {
    readonly promptContentHash: string | null;
    readonly renderedPromptHash: string | null;
    readonly configSnapshotHash: string | null;
  };
  readonly modelPolicy: {
    readonly modelPolicyId: string | null;
    readonly providerId: string | null;
    readonly modelId: string | null;
  };
  readonly cachePolicy: {
    readonly namespace: string | null;
    readonly reason: string | null;
    readonly canRead: boolean | null;
    readonly canWrite: boolean | null;
  };
  readonly providerTelemetry: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly totalTokens: number;
    readonly durationMs: number;
  } | null;
  readonly adapterAttemptDiagnostics: readonly EvidenceQueryPlanningRuntimeArtifactAttemptDiagnostic[];
  readonly inspection: {
    readonly status: QueryPlanInspectionResult["status"];
    readonly resultStatus: string | null;
    readonly queryEntryCount: number | null;
    readonly sourceLanguagePolicy: EvidenceQueryPlan["sourceLanguagePolicy"] | null;
  };
  readonly sourceAcquisitionHandoff: {
    readonly status: QueryPlanSourceAcquisitionHandoffDecision["status"];
    readonly blockedReason: QueryPlanSourceAcquisitionHandoffDecision["blockedReason"];
    readonly executionScope: "not_executable" | null;
  };
  readonly productExecution: {
    readonly queryPlanningRuntimeInvoked: true;
    readonly promptLoaded: boolean;
    readonly promptRendered: boolean;
    readonly modelCalled: boolean;
    readonly providerCallbackCreated: true;
    readonly providerSearchFetchCalled: false;
    readonly sourceAcquisitionExecuted: false;
    readonly parserExecuted: false;
    readonly evidenceCorpusCreated: false;
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
    readonly publicSurfaceWritten: false;
  };
  readonly publicCutoverStatus: "blocked_precutover";
};

export type EvidenceQueryPlanningRuntimeArtifactProjection = {
  readonly context: PipelineRunContext;
  readonly runtimeResult: EvidenceQueryPlanningRuntimeResult;
  readonly inspection: QueryPlanInspectionResult;
  readonly sourceAcquisitionHandoff: QueryPlanSourceAcquisitionHandoffDecision;
};

export type EvidenceQueryPlanningRuntimeArtifactRecordResult =
  | {
    readonly status: "recorded";
    readonly artifact: EvidenceQueryPlanningRuntimeArtifact;
  }
  | {
    readonly status: "skipped_artifact_oversize";
    readonly artifact: EvidenceQueryPlanningRuntimeArtifact;
  }
  | {
    readonly status: "skipped_invalid_ledger_id";
    readonly artifact: null;
  };

type EvidenceQueryPlanningRuntimeArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceQueryPlanningRuntimeArtifactLedgers?:
    Map<string, EvidenceQueryPlanningRuntimeArtifact[]>;
};

function runtimeArtifactLedgers(): Map<string, EvidenceQueryPlanningRuntimeArtifact[]> {
  const globalLedger = globalThis as EvidenceQueryPlanningRuntimeArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceQueryPlanningRuntimeArtifactLedgers ??=
    new Map<string, EvidenceQueryPlanningRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceQueryPlanningRuntimeArtifactLedgers;
}

function recordsForLedger(ledgerId: string): EvidenceQueryPlanningRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: EvidenceQueryPlanningRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (ledgers.size > EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_LEDGER_COUNT) {
    const oldestLedgerId = ledgers.keys().next().value;
    if (!oldestLedgerId) {
      break;
    }
    ledgers.delete(oldestLedgerId);
  }

  return records;
}

function freezeDeep<T>(value: T): T {
  if (!value || typeof value !== "object") {
    return value;
  }
  for (const child of Object.values(value)) {
    freezeDeep(child);
  }
  return Object.freeze(value);
}

function cloneArtifact(artifact: EvidenceQueryPlanningRuntimeArtifact): EvidenceQueryPlanningRuntimeArtifact {
  return freezeDeep(JSON.parse(JSON.stringify(artifact)) as EvidenceQueryPlanningRuntimeArtifact);
}

function serializedByteLength(artifact: EvidenceQueryPlanningRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

function ledgerIdIsBounded(ledgerId: string): boolean {
  return ledgerId.length > 0
    && ledgerId.trim() === ledgerId
    && ledgerId.length <= EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_LEDGER_ID_LENGTH;
}

function appendBoundedRecord(
  records: EvidenceQueryPlanningRuntimeArtifact[],
  artifact: EvidenceQueryPlanningRuntimeArtifact,
): void {
  const recordsToDrop = records.length - EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneArtifact(artifact));
}

function boundedText(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function containsUrlLikeText(value: string): boolean {
  return /(?:https?:\/\/|www\.)/i.test(value);
}

function sanitizeDiagnosticText(value: string, maxLength: number): string {
  return boundedText(
    value
      .replace(/(?:https?:\/\/|www\.)\S+/gi, "[redacted_url]")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted_email]")
      .replace(/"[^"]{48,}"/g, "\"[redacted_long_literal]\"")
      .replace(/\s+/g, " ")
      .trim(),
    maxLength,
  );
}

function readDiagnosticIssuePath(issue: Record<string, unknown>): string {
  const path = issue.path;
  if (!Array.isArray(path)) {
    return "";
  }
  return boundedText(
    path
      .map((segment) => {
        if (typeof segment === "string" && /^[A-Za-z0-9_-]+$/.test(segment)) {
          return segment;
        }
        if (typeof segment === "number" && Number.isInteger(segment) && segment >= 0) {
          return String(segment);
        }
        return "[non_structural]";
      })
      .join("."),
    EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_DIAGNOSTIC_PATH_LENGTH,
  );
}

function parseDiagnosticIssues(
  failureMessage: string | null,
  fallbackCode: EvidenceQueryPlanningRuntimeArtifactAttemptDiagnostic["status"],
): readonly EvidenceQueryPlanningRuntimeArtifactDiagnosticIssue[] {
  if (!failureMessage) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(failureMessage);
  } catch {
    return [{
      path: "",
      code: fallbackCode,
      message: sanitizeDiagnosticText(
        failureMessage,
        EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_DIAGNOSTIC_TEXT_LENGTH,
      ),
    }];
  }

  if (!Array.isArray(parsed)) {
    return [{
      path: "",
      code: fallbackCode,
      message: sanitizeDiagnosticText(
        failureMessage,
        EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_DIAGNOSTIC_TEXT_LENGTH,
      ),
    }];
  }

  return parsed
    .filter(isRecord)
    .slice(0, EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_DIAGNOSTIC_ISSUES)
    .map((issue) => ({
      path: readDiagnosticIssuePath(issue),
      code: typeof issue.code === "string"
        ? boundedText(issue.code, EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_QUERY_LABEL_LENGTH)
        : fallbackCode,
      message: sanitizeDiagnosticText(
        typeof issue.message === "string" ? issue.message : fallbackCode,
        EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_DIAGNOSTIC_TEXT_LENGTH,
      ),
    }));
}

function boundedQueryEntries(
  runtimeResult: EvidenceQueryPlanningRuntimeResult,
): readonly EvidenceQueryPlanningRuntimeArtifactQueryEntry[] {
  if (runtimeResult.result.status !== "accepted") {
    return [];
  }

  return runtimeResult.result.queryPlan.queries
    .slice(0, EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_QUERY_ENTRIES)
    .map((query) => ({
      queryId: boundedText(query.queryId, EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_QUERY_LABEL_LENGTH),
      retrievalPolicyKey: query.retrievalPolicyKey,
      queryText: containsUrlLikeText(query.queryText)
        ? "[redacted_url_like_query_text]"
        : boundedText(query.queryText, EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_QUERY_TEXT_LENGTH),
      targetAtomicClaimIds: query.targetAtomicClaimIds.map((claimId) =>
        boundedText(claimId, EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_QUERY_LABEL_LENGTH)
      ),
    }));
}

function modelPolicyId(runtimeResult: EvidenceQueryPlanningRuntimeResult): string | null {
  return runtimeResult.adapterOutcome?.telemetry.modelPolicyId ?? null;
}

function providerTelemetry(
  runtimeResult: EvidenceQueryPlanningRuntimeResult,
): EvidenceQueryPlanningRuntimeArtifact["providerTelemetry"] {
  const telemetry = runtimeResult.adapterOutcome?.telemetry;
  if (!telemetry) {
    return null;
  }
  return {
    inputTokens: telemetry.tokenUsage.inputTokens,
    outputTokens: telemetry.tokenUsage.outputTokens,
    totalTokens: telemetry.tokenUsage.totalTokens,
    durationMs: telemetry.durationMs,
  };
}

function attemptFailureCategory(
  status: EvidenceQueryPlanningRuntimeArtifactAttemptDiagnostic["status"],
): EvidenceQueryPlanningRuntimeArtifactAttemptDiagnostic["failureCategory"] {
  if (status === "accepted") {
    return "none";
  }
  if (status === "parse_failure") {
    return "parse_failure";
  }
  if (status === "provider_failure") {
    return "provider_failure";
  }
  return "schema_validation";
}

function attemptDiagnostics(
  runtimeResult: EvidenceQueryPlanningRuntimeResult,
): readonly EvidenceQueryPlanningRuntimeArtifactAttemptDiagnostic[] {
  const attempts = runtimeResult.adapterOutcome?.attempts ?? [];
  return attempts
    .slice(0, EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_ATTEMPT_DIAGNOSTICS)
    .map((attempt) => {
      const issues = parseDiagnosticIssues(attempt.failureMessage, attempt.status);
      return {
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        promptContentHash: boundedText(
          attempt.promptContentHash,
          EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_QUERY_LABEL_LENGTH,
        ),
        providerTelemetry: attempt.providerTelemetry
          ? {
            providerId: attempt.providerTelemetry.providerId,
            modelId: attempt.providerTelemetry.modelId,
            inputTokens: attempt.providerTelemetry.inputTokens,
            outputTokens: attempt.providerTelemetry.outputTokens,
            totalTokens: attempt.providerTelemetry.totalTokens,
            durationMs: attempt.providerTelemetry.durationMs,
          }
          : null,
        failureCategory: attemptFailureCategory(attempt.status),
        issueCount: attempt.failureMessage && issues.length === 0 ? 1 : issues.length,
        issues,
      };
    });
}

export function buildEvidenceQueryPlanningRuntimeArtifact(
  projection: EvidenceQueryPlanningRuntimeArtifactProjection,
): EvidenceQueryPlanningRuntimeArtifact {
  const context = projection.context;
  const runtimeResult = projection.runtimeResult;
  const inspectionSummary = projection.inspection.status === "inspected"
    ? projection.inspection.summary
    : null;
  const handoff = projection.sourceAcquisitionHandoff.status === "ready_not_executable"
    ? projection.sourceAcquisitionHandoff.handoff
    : null;
  const selectedAtomicClaimIds =
    handoff?.selectedAtomicClaimIds
    ?? inspectionSummary?.selectedAtomicClaimIds
    ?? context.selectedAtomicClaimIds;

  return {
    artifactVersion: EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: context.observabilityLedger.ledgerId,
    runId: context.runId,
    createdUtc: context.generatedUtc,
    source: "product_v2_orchestrator_after_x7o_preexecution_observation",
    activation: {
      status: context.queryPlanningRuntimeActivation.status,
      activationProfileId: context.queryPlanningRuntimeActivation.activationProfileId,
      activationSnapshotHash: context.queryPlanningRuntimeActivation.activationSnapshotHash,
      sourcePackage: context.queryPlanningRuntimeActivation.approvalPointer.sourcePackage,
      artifactVisibility: "internal_admin_only",
    },
    runtime: {
      runtimeVersion: runtimeResult.runtimeVersion,
      status: runtimeResult.status,
      blockedReason: runtimeResult.blockedReason,
      resultStatus: runtimeResult.result.status,
      resultBlockedReason: runtimeResult.result.blockedReason,
      resultDamagedReason: runtimeResult.result.damagedReason,
    },
    schemaOutcome: {
      status: runtimeResult.result.status,
      blockedReason: runtimeResult.result.blockedReason,
      damagedReason: runtimeResult.result.damagedReason,
    },
    selectedAtomicClaimIds: [...selectedAtomicClaimIds],
    queryEntryCount: runtimeResult.result.status === "accepted" ? runtimeResult.result.queryPlan.queries.length : 0,
    queryEntries: boundedQueryEntries(runtimeResult),
    sourceLanguagePolicy: runtimeResult.result.status === "accepted"
      ? runtimeResult.result.queryPlan.sourceLanguagePolicy
      : null,
    promptProvenance: {
      promptContentHash: runtimeResult.promptProvenance?.promptContentHash ?? null,
      renderedPromptHash: runtimeResult.promptProvenance?.renderedPromptHash ?? null,
      configSnapshotHash: runtimeResult.promptProvenance?.configSnapshotHash ?? null,
    },
    modelPolicy: {
      modelPolicyId: modelPolicyId(runtimeResult),
      providerId: runtimeResult.adapterOutcome?.telemetry.providerId ?? null,
      modelId: runtimeResult.adapterOutcome?.telemetry.modelId ?? null,
    },
    cachePolicy: {
      namespace: runtimeResult.cacheDecision?.namespace ?? null,
      reason: runtimeResult.cacheDecision?.reason ?? null,
      canRead: runtimeResult.cacheDecision?.canRead ?? null,
      canWrite: runtimeResult.cacheDecision?.canWrite ?? null,
    },
    providerTelemetry: providerTelemetry(runtimeResult),
    adapterAttemptDiagnostics: attemptDiagnostics(runtimeResult),
    inspection: {
      status: projection.inspection.status,
      resultStatus: inspectionSummary?.resultStatus ?? null,
      queryEntryCount: inspectionSummary?.queryEntryCount ?? null,
      sourceLanguagePolicy: inspectionSummary?.sourceLanguagePolicy ?? null,
    },
    sourceAcquisitionHandoff: {
      status: projection.sourceAcquisitionHandoff.status,
      blockedReason: projection.sourceAcquisitionHandoff.blockedReason,
      executionScope: handoff?.executionScope ?? null,
    },
    productExecution: {
      queryPlanningRuntimeInvoked: true,
      promptLoaded: runtimeResult.sideEffects.promptLoaded,
      promptRendered: runtimeResult.sideEffects.promptRendered,
      modelCalled: runtimeResult.sideEffects.modelCalled,
      providerCallbackCreated: true,
      providerSearchFetchCalled: false,
      sourceAcquisitionExecuted: false,
      parserExecuted: false,
      evidenceCorpusCreated: false,
      reportGenerated: false,
      verdictGenerated: false,
      publicSurfaceWritten: false,
    },
    publicCutoverStatus: "blocked_precutover",
  };
}

export function recordEvidenceQueryPlanningRuntimeArtifact(
  projection: EvidenceQueryPlanningRuntimeArtifactProjection,
): EvidenceQueryPlanningRuntimeArtifactRecordResult {
  if (!ledgerIdIsBounded(projection.context.observabilityLedger.ledgerId)) {
    return { status: "skipped_invalid_ledger_id", artifact: null };
  }

  const artifact = buildEvidenceQueryPlanningRuntimeArtifact(projection);
  if (serializedByteLength(artifact) > EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_SERIALIZED_BYTES) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readEvidenceQueryPlanningRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceQueryPlanningRuntimeArtifact[] {
  if (!ledgerIdIsBounded(ledgerId)) {
    return [];
  }
  return (runtimeArtifactLedgers().get(ledgerId) ?? []).map(cloneArtifact);
}

export function clearEvidenceQueryPlanningRuntimeArtifacts(ledgerId: string): void {
  if (!ledgerIdIsBounded(ledgerId)) {
    return;
  }
  runtimeArtifactLedgers().delete(ledgerId);
}
