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

export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_VERSION =
  "v2.evidence-query-planning.runtime-artifact.x7s";
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_SERIALIZED_BYTES = 32_768;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_QUERY_ENTRIES = 6;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_QUERY_TEXT_LENGTH = 240;
export const EVIDENCE_QUERY_PLANNING_RUNTIME_ARTIFACT_MAX_QUERY_LABEL_LENGTH = 80;

export type EvidenceQueryPlanningRuntimeArtifactQueryEntry = {
  readonly queryId: string;
  readonly retrievalPolicyKey: EvidenceQueryPlanEntry["retrievalPolicyKey"];
  readonly queryText: string;
  readonly targetAtomicClaimIds: readonly string[];
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
    selectedAtomicClaimIds: [...context.selectedAtomicClaimIds],
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
