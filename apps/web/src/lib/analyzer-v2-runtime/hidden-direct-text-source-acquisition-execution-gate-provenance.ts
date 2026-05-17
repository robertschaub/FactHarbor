import type {
  HiddenDirectTextSourceAcquisitionExecutionGateResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate";

export const ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_EXECUTION_GATE_PROVENANCE_VERSION =
  "v2.hidden-direct-text-source-acquisition-execution-gate-provenance.x7g2";

const ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_EXECUTION_GATE_VERSION =
  "v2.hidden-direct-text-source-acquisition-execution-gate.x7f";

export type HiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult =
  HiddenDirectTextSourceAcquisitionExecutionGateResult;

const RESULT_KEYS = [
  "blockedReason",
  "bytesRead",
  "cacheTouched",
  "candidateAcquisition",
  "candidateRecords",
  "closedReason",
  "contentPackets",
  "evidenceCorpus",
  "executionStatus",
  "extractionInput",
  "gateVersion",
  "liveJobs",
  "networkCalls",
  "networkExecution",
  "parserAdmissionStatus",
  "parserInput",
  "parserOutput",
  "parserRuns",
  "providerCalls",
  "providerNetworkExecution",
  "publicExposure",
  "readinessCompositionBlockedReason",
  "readinessCompositionStatus",
  "readinessCompositionVersion",
  "retries",
  "sourceMaterial",
  "sourceReliabilityTouched",
  "status",
  "visibility",
].sort();

const BLOCKED_REASONS = new Set([
  "request_malformed",
  "readiness_composition_malformed",
  "readiness_composition_not_runtime_owned",
  "readiness_composition_blocked",
  "readiness_composition_not_no_io",
]);

const producerOwnedSnapshots = new WeakMap<object, string>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length
    && actual.every((key, index) => key === keys[index]);
}

function hasNoIoOrOutputs(value: Record<string, unknown>): boolean {
  return value.executionStatus === "blocked_no_io"
    && value.networkExecution === false
    && value.providerCalls === 0
    && value.networkCalls === 0
    && value.bytesRead === 0
    && value.candidateRecords === 0
    && value.retries === 0
    && value.parserRuns === 0
    && value.cacheTouched === false
    && value.sourceReliabilityTouched === false
    && value.publicExposure === false
    && value.liveJobs === false
    && value.providerNetworkExecution === null
    && value.candidateAcquisition === null
    && value.sourceMaterial === null
    && value.extractionInput === null
    && value.evidenceCorpus === null
    && value.contentPackets === null
    && value.parserInput === null
    && value.parserOutput === null
    && value.parserAdmissionStatus === "blocked_pending_b2_b3_c0_2d_c";
}

function hasValidStatusPayload(value: Record<string, unknown>): boolean {
  if (value.status === "gate_closed_no_io") {
    return value.closedReason === "research_acquisition_gateway_not_implemented"
      && value.blockedReason === null
      && value.readinessCompositionStatus === "composition_not_executable_pre_live_gate"
      && value.readinessCompositionBlockedReason === null;
  }

  if (value.status === "blocked_pre_execution") {
    return value.closedReason === null
      && typeof value.blockedReason === "string"
      && BLOCKED_REASONS.has(value.blockedReason);
  }

  return false;
}

function buildIntegritySnapshot(value: unknown): string | null {
  if (
    !isRecord(value)
    || !hasExactKeys(value, RESULT_KEYS)
    || value.gateVersion !== ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_EXECUTION_GATE_VERSION
    || value.visibility !== "internal_only"
    || !hasNoIoOrOutputs(value)
    || !hasValidStatusPayload(value)
  ) {
    return null;
  }

  return JSON.stringify(RESULT_KEYS.map((key) => [key, value[key]]));
}

export function markHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult<
  TResult extends HiddenDirectTextSourceAcquisitionExecutionGateResult,
>(result: TResult): TResult {
  const snapshot = buildIntegritySnapshot(result);
  if (snapshot !== null) {
    producerOwnedSnapshots.set(result, snapshot);
  }
  return result;
}

export function readHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult(
  value: unknown,
): HiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const expectedSnapshot = producerOwnedSnapshots.get(value);
  if (expectedSnapshot === undefined) {
    return null;
  }

  const currentSnapshot = buildIntegritySnapshot(value);
  if (currentSnapshot === null || currentSnapshot !== expectedSnapshot) {
    producerOwnedSnapshots.delete(value);
    return null;
  }

  return value as unknown as HiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult;
}
