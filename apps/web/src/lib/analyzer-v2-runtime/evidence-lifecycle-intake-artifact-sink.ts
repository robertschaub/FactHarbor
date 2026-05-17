import type { ClaimUnderstandingStageHandoff } from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import type { EvidenceLifecycleStartDecision } from "@/lib/analyzer-v2/evidence-lifecycle/types";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";

export const EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_VERSION =
  "v2.evidence-lifecycle.intake-artifact.x7j";
export const EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_MAX_RECORDS_PER_LEDGER = 4;
export const EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_MAX_LEDGER_COUNT = 256;
export const EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_MAX_SERIALIZED_BYTES = 16_384;
export const EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_MAX_LEDGER_ID_LENGTH = 256;

export type EvidenceLifecycleIntakeRuntimeArtifact = {
  readonly artifactVersion: typeof EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_VERSION;
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_claim_understanding";
  readonly claimUnderstanding: {
    readonly handoffStatus: ClaimUnderstandingStageHandoff["status"];
    readonly blockedReason: ClaimUnderstandingStageHandoff["blockedReason"];
    readonly damagedReason: ClaimUnderstandingStageHandoff["damagedReason"];
    readonly selectedAtomicClaimCount: number;
    readonly integrityEventCount: number;
  };
  readonly evidenceLifecycleIntake: {
    readonly decisionVersion: EvidenceLifecycleStartDecision["decisionVersion"];
    readonly observationStatus: "contract_observed_preexecution" | "blocked_preexecution";
    readonly status: EvidenceLifecycleStartDecision["status"];
    readonly blockedReason: EvidenceLifecycleStartDecision["blockedReason"];
    readonly executionScope: "contract_only_no_provider_execution" | null;
    readonly claimContractPresent: boolean;
    readonly executionEligibility: "not_executable_precutover";
  };
  readonly publicCutoverStatus: "blocked_precutover";
  readonly downstreamExecution: {
    readonly queryPlanningExecuted: false;
    readonly sourceAcquisitionExecuted: false;
    readonly providerNetworkExecuted: false;
    readonly parserExecuted: false;
    readonly evidenceCorpusCreated: false;
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
  };
};

export type EvidenceLifecycleIntakeRuntimeArtifactRecordResult =
  | {
    readonly status: "recorded";
    readonly artifact: EvidenceLifecycleIntakeRuntimeArtifact;
  }
  | {
    readonly status: "skipped_artifact_oversize";
    readonly artifact: EvidenceLifecycleIntakeRuntimeArtifact;
  };

type EvidenceLifecycleIntakeArtifactLedgerGlobal = typeof globalThis & {
  __factHarborV2EvidenceLifecycleIntakeArtifactLedgers?:
    Map<string, EvidenceLifecycleIntakeRuntimeArtifact[]>;
};

function runtimeArtifactLedgers(): Map<string, EvidenceLifecycleIntakeRuntimeArtifact[]> {
  const globalLedger = globalThis as EvidenceLifecycleIntakeArtifactLedgerGlobal;
  globalLedger.__factHarborV2EvidenceLifecycleIntakeArtifactLedgers ??=
    new Map<string, EvidenceLifecycleIntakeRuntimeArtifact[]>();
  return globalLedger.__factHarborV2EvidenceLifecycleIntakeArtifactLedgers;
}

function recordsForLedger(ledgerId: string): EvidenceLifecycleIntakeRuntimeArtifact[] {
  const ledgers = runtimeArtifactLedgers();
  const existing = ledgers.get(ledgerId);
  if (existing) {
    ledgers.delete(ledgerId);
    ledgers.set(ledgerId, existing);
    return existing;
  }

  const records: EvidenceLifecycleIntakeRuntimeArtifact[] = [];
  ledgers.set(ledgerId, records);

  while (ledgers.size > EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_MAX_LEDGER_COUNT) {
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

function cloneArtifact(
  artifact: EvidenceLifecycleIntakeRuntimeArtifact,
): EvidenceLifecycleIntakeRuntimeArtifact {
  return freezeDeep(JSON.parse(JSON.stringify(artifact)) as EvidenceLifecycleIntakeRuntimeArtifact);
}

function serializedByteLength(artifact: EvidenceLifecycleIntakeRuntimeArtifact): number {
  return Buffer.byteLength(JSON.stringify(artifact), "utf8");
}

function appendBoundedRecord(
  records: EvidenceLifecycleIntakeRuntimeArtifact[],
  artifact: EvidenceLifecycleIntakeRuntimeArtifact,
): void {
  const recordsToDrop =
    records.length - EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_MAX_RECORDS_PER_LEDGER + 1;
  if (recordsToDrop > 0) {
    records.splice(0, recordsToDrop);
  }
  records.push(cloneArtifact(artifact));
}

export function buildEvidenceLifecycleIntakeRuntimeArtifact(params: {
  readonly context: PipelineRunContext;
  readonly claimUnderstandingHandoff: ClaimUnderstandingStageHandoff;
  readonly evidenceLifecycleIntake: EvidenceLifecycleStartDecision;
}): EvidenceLifecycleIntakeRuntimeArtifact {
  const decision = params.evidenceLifecycleIntake;
  const intake = decision.status === "intake_ready" ? decision.intake : null;

  return {
    artifactVersion: EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_VERSION,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    ledgerId: params.context.observabilityLedger.ledgerId,
    runId: params.context.runId,
    createdUtc: params.context.generatedUtc,
    source: "product_v2_orchestrator_after_claim_understanding",
    claimUnderstanding: {
      handoffStatus: params.claimUnderstandingHandoff.status,
      blockedReason: params.claimUnderstandingHandoff.blockedReason,
      damagedReason: params.claimUnderstandingHandoff.damagedReason,
      selectedAtomicClaimCount: params.claimUnderstandingHandoff.selectedAtomicClaimIds.length,
      integrityEventCount: params.claimUnderstandingHandoff.integrityEventSummaries.length,
    },
    evidenceLifecycleIntake: {
      decisionVersion: decision.decisionVersion,
      observationStatus: decision.status === "intake_ready"
        ? "contract_observed_preexecution"
        : "blocked_preexecution",
      status: decision.status,
      blockedReason: decision.blockedReason,
      executionScope: intake?.executionScope ?? null,
      claimContractPresent: Boolean(intake?.claimContract),
      executionEligibility: "not_executable_precutover",
    },
    publicCutoverStatus: "blocked_precutover",
    downstreamExecution: {
      queryPlanningExecuted: false,
      sourceAcquisitionExecuted: false,
      providerNetworkExecuted: false,
      parserExecuted: false,
      evidenceCorpusCreated: false,
      reportGenerated: false,
      verdictGenerated: false,
    },
  };
}

export function recordEvidenceLifecycleIntakeRuntimeArtifact(params: {
  readonly context: PipelineRunContext;
  readonly claimUnderstandingHandoff: ClaimUnderstandingStageHandoff;
  readonly evidenceLifecycleIntake: EvidenceLifecycleStartDecision;
}): EvidenceLifecycleIntakeRuntimeArtifactRecordResult {
  const artifact = buildEvidenceLifecycleIntakeRuntimeArtifact(params);
  if (serializedByteLength(artifact) > EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_MAX_SERIALIZED_BYTES) {
    return { status: "skipped_artifact_oversize", artifact };
  }

  appendBoundedRecord(recordsForLedger(artifact.ledgerId), artifact);
  return { status: "recorded", artifact };
}

export function readEvidenceLifecycleIntakeRuntimeArtifacts(
  ledgerId: string,
): readonly EvidenceLifecycleIntakeRuntimeArtifact[] {
  return (runtimeArtifactLedgers().get(ledgerId) ?? []).map(cloneArtifact);
}

export function clearEvidenceLifecycleIntakeRuntimeArtifacts(ledgerId: string): void {
  runtimeArtifactLedgers().delete(ledgerId);
}
