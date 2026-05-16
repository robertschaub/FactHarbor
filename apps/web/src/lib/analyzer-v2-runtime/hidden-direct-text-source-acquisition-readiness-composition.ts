import type {
  HiddenDirectTextCandidateAcquisitionHarnessResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness";
import {
  readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness-provenance";
import {
  runHiddenDirectTextSourceMaterialReadinessHarness,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-source-material-readiness-harness";
import {
  buildSourceAcquisitionProviderNetworkReadiness,
  type SourceAcquisitionProviderNetworkReadinessDecision,
  type SourceAcquisitionProviderNetworkReadinessRequest,
} from "@/lib/analyzer-v2-runtime/source-acquisition-provider-network-readiness";

export const ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION =
  "v2.hidden-direct-text-source-acquisition-readiness-composition.x7d";

export type HiddenDirectTextSourceAcquisitionReadinessCompositionRequest = {
  readonly x6CandidateAcquisition: HiddenDirectTextCandidateAcquisitionHarnessResult;
  readonly providerNetwork: Omit<SourceAcquisitionProviderNetworkReadinessRequest, "sourceMaterialInput">;
};

type SourceMaterialReadinessDecision = ReturnType<
  typeof runHiddenDirectTextSourceMaterialReadinessHarness
>["sourceMaterialReadiness"];

type HiddenDirectTextSourceAcquisitionReadinessCompositionBlockedReason =
  | "request_malformed"
  | "x6_malformed"
  | "x6_not_runtime_owned"
  | "x6_not_completed"
  | "public_cutover_not_blocked_precutover"
  | "source_material_readiness_blocked"
  | "source_material_absence_contract_invalid"
  | "evidence_corpus_guard_not_negative"
  | "provider_network_readiness_blocked";

type ZeroCostProof = {
  readonly networkExecution: false;
  readonly providerCalls: 0;
  readonly networkCalls: 0;
  readonly bytesRead: 0;
  readonly candidateRecords: 0;
  readonly retries: 0;
  readonly cacheTouched: false;
  readonly sourceReliabilityTouched: false;
  readonly publicExposure: false;
  readonly liveJobs: false;
};

type NullOutputs = {
  readonly providerNetworkExecution: null;
  readonly candidateAcquisition: null;
  readonly sourceMaterial: null;
  readonly extractionInput: null;
  readonly evidenceCorpus: null;
};

export type HiddenDirectTextSourceAcquisitionReadinessCompositionResult = ZeroCostProof & NullOutputs & (
  | {
      readonly compositionVersion: typeof ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION;
      readonly visibility: "internal_only";
      readonly status: "composition_not_executable_pre_live_gate";
      readonly executionStatus: "blocked_no_io";
      readonly blockedReason: null;
      readonly sourceMaterialReadiness: Extract<SourceMaterialReadinessDecision, {
        readonly status: "not_ready_pre_execution";
      }>;
      readonly providerNetworkReadiness: Extract<SourceAcquisitionProviderNetworkReadinessDecision, {
        readonly status: "not_executable_pre_live_gate";
      }>;
    }
  | {
      readonly compositionVersion: typeof ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION;
      readonly visibility: "internal_only";
      readonly status: "blocked_pre_execution";
      readonly executionStatus: "blocked_no_io";
      readonly blockedReason: HiddenDirectTextSourceAcquisitionReadinessCompositionBlockedReason;
      readonly sourceMaterialReadiness: SourceMaterialReadinessDecision | null;
      readonly providerNetworkReadiness: SourceAcquisitionProviderNetworkReadinessDecision | null;
    }
);

export type HiddenDirectTextSourceAcquisitionReadinessCompositionRuntimeOwnedResult =
  HiddenDirectTextSourceAcquisitionReadinessCompositionResult;

const RESULT_KEYS = [
  "blockedReason",
  "bytesRead",
  "cacheTouched",
  "candidateAcquisition",
  "candidateRecords",
  "compositionVersion",
  "evidenceCorpus",
  "executionStatus",
  "extractionInput",
  "liveJobs",
  "networkCalls",
  "networkExecution",
  "providerCalls",
  "providerNetworkExecution",
  "providerNetworkReadiness",
  "publicExposure",
  "retries",
  "sourceMaterial",
  "sourceMaterialReadiness",
  "sourceReliabilityTouched",
  "status",
  "visibility",
].sort();
const BLOCKED_REASONS = new Set<string>([
  "request_malformed",
  "x6_malformed",
  "x6_not_runtime_owned",
  "x6_not_completed",
  "public_cutover_not_blocked_precutover",
  "source_material_readiness_blocked",
  "source_material_absence_contract_invalid",
  "evidence_corpus_guard_not_negative",
  "provider_network_readiness_blocked",
]);
const runtimeOwnedReadinessCompositionResults = new WeakSet<object>();

function zeroCostProof(): ZeroCostProof {
  return {
    networkExecution: false,
    providerCalls: 0,
    networkCalls: 0,
    bytesRead: 0,
    candidateRecords: 0,
    retries: 0,
    cacheTouched: false,
    sourceReliabilityTouched: false,
    publicExposure: false,
    liveJobs: false,
  };
}

function nullOutputs(): NullOutputs {
  return {
    providerNetworkExecution: null,
    candidateAcquisition: null,
    sourceMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
  };
}

function blocked(
  blockedReason: HiddenDirectTextSourceAcquisitionReadinessCompositionBlockedReason,
  sourceMaterialReadiness: SourceMaterialReadinessDecision | null = null,
  providerNetworkReadiness: SourceAcquisitionProviderNetworkReadinessDecision | null = null,
): HiddenDirectTextSourceAcquisitionReadinessCompositionResult {
  return markHiddenDirectTextSourceAcquisitionReadinessCompositionRuntimeOwnedResult({
    compositionVersion: ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION,
    visibility: "internal_only",
    status: "blocked_pre_execution",
    executionStatus: "blocked_no_io",
    blockedReason,
    sourceMaterialReadiness,
    providerNetworkReadiness,
    ...zeroCostProof(),
    ...nullOutputs(),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function requestHasSafeShape(
  request: HiddenDirectTextSourceAcquisitionReadinessCompositionRequest,
): boolean {
  return isRecord(request)
    && hasExactKeys(request, ["providerNetwork", "x6CandidateAcquisition"])
    && isRecord(request.providerNetwork)
    && hasExactKeys(request.providerNetwork, ["authority", "budget", "endpoint"]);
}

function publicCutoverIsBlocked(x6CandidateAcquisition: Record<string, unknown>): boolean {
  const publicEnvelope = x6CandidateAcquisition.publicEnvelope;
  const resultJson = isRecord(publicEnvelope) ? publicEnvelope.resultJson : null;
  const meta = isRecord(resultJson) ? resultJson.meta : null;
  return isRecord(meta) && meta.publicCutoverStatus === "blocked_precutover";
}

function candidateRuntimeHasSafeShape(candidateRuntime: unknown): boolean {
  if (!isRecord(candidateRuntime) || !hasExactKeys(candidateRuntime, [
    "candidates",
    "queryOutcomes",
    "status",
    "stopReason",
    "version",
    "visibility",
  ])) {
    return false;
  }
  return candidateRuntime.visibility === "internal_only"
    && (
      candidateRuntime.status === "completed_structural"
      || candidateRuntime.status === "blocked"
      || candidateRuntime.status === "damaged_structural"
      || candidateRuntime.status === "not_available"
    )
    && Array.isArray(candidateRuntime.candidates)
    && Array.isArray(candidateRuntime.queryOutcomes);
}

function resultHasZeroCostAndNullOutputs(value: Record<string, unknown>): boolean {
  return value.networkExecution === false
    && value.providerCalls === 0
    && value.networkCalls === 0
    && value.bytesRead === 0
    && value.candidateRecords === 0
    && value.retries === 0
    && value.cacheTouched === false
    && value.sourceReliabilityTouched === false
    && value.publicExposure === false
    && value.liveJobs === false
    && value.providerNetworkExecution === null
    && value.candidateAcquisition === null
    && value.sourceMaterial === null
    && value.extractionInput === null
    && value.evidenceCorpus === null;
}

function resultHasSafeShape(value: Record<string, unknown>): boolean {
  if (
    !hasExactKeys(value, RESULT_KEYS)
    || value.compositionVersion !== ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION
    || value.visibility !== "internal_only"
    || value.executionStatus !== "blocked_no_io"
    || !resultHasZeroCostAndNullOutputs(value)
  ) {
    return false;
  }

  if (value.status === "composition_not_executable_pre_live_gate") {
    return value.blockedReason === null
      && isRecord(value.sourceMaterialReadiness)
      && value.sourceMaterialReadiness.status === "not_ready_pre_execution"
      && isRecord(value.providerNetworkReadiness)
      && value.providerNetworkReadiness.status === "not_executable_pre_live_gate";
  }

  if (value.status === "blocked_pre_execution") {
    return typeof value.blockedReason === "string"
      && BLOCKED_REASONS.has(value.blockedReason)
      && (
        value.sourceMaterialReadiness === null
        || isRecord(value.sourceMaterialReadiness)
      )
      && (
        value.providerNetworkReadiness === null
        || isRecord(value.providerNetworkReadiness)
      );
  }

  return false;
}

function markHiddenDirectTextSourceAcquisitionReadinessCompositionRuntimeOwnedResult(
  result: HiddenDirectTextSourceAcquisitionReadinessCompositionResult,
): HiddenDirectTextSourceAcquisitionReadinessCompositionRuntimeOwnedResult {
  runtimeOwnedReadinessCompositionResults.add(result);
  return result;
}

export function readHiddenDirectTextSourceAcquisitionReadinessCompositionRuntimeOwnedResult(
  value: unknown,
): HiddenDirectTextSourceAcquisitionReadinessCompositionRuntimeOwnedResult | null {
  if (
    !isRecord(value)
    || !runtimeOwnedReadinessCompositionResults.has(value)
    || !resultHasSafeShape(value)
  ) {
    return null;
  }

  return value as unknown as HiddenDirectTextSourceAcquisitionReadinessCompositionRuntimeOwnedResult;
}

function classifyX6Input(
  x6CandidateAcquisition: HiddenDirectTextCandidateAcquisitionHarnessResult,
): HiddenDirectTextSourceAcquisitionReadinessCompositionBlockedReason | null {
  if (!isRecord(x6CandidateAcquisition) || !hasExactKeys(x6CandidateAcquisition, [
    "blockedReason",
    "candidateAcquisitionRuntime",
    "harnessVersion",
    "publicEnvelope",
    "status",
    "visibility",
    "x5Integration",
  ])) {
    return "x6_malformed";
  }
  if (
    x6CandidateAcquisition.harnessVersion !== "v2.hidden-direct-text-candidate-acquisition-harness.x6"
    || x6CandidateAcquisition.visibility !== "internal_only"
  ) {
    return "x6_malformed";
  }

  const runtimeOwnedX6 = readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(
    x6CandidateAcquisition,
  );
  if (!runtimeOwnedX6) {
    return "x6_not_runtime_owned";
  }

  if (runtimeOwnedX6.status !== "completed") {
    return "x6_not_completed";
  }
  if (runtimeOwnedX6.blockedReason !== null) {
    return "x6_malformed";
  }
  if (!publicCutoverIsBlocked(runtimeOwnedX6)) {
    return "public_cutover_not_blocked_precutover";
  }
  if (!candidateRuntimeHasSafeShape(runtimeOwnedX6.candidateAcquisitionRuntime)) {
    return "x6_malformed";
  }
  return null;
}

function blockedReasonForProviderNetworkReadiness(
  providerNetworkReadiness: SourceAcquisitionProviderNetworkReadinessDecision,
): HiddenDirectTextSourceAcquisitionReadinessCompositionBlockedReason {
  if (providerNetworkReadiness.status !== "blocked_pre_execution") {
    return "provider_network_readiness_blocked";
  }
  if (providerNetworkReadiness.blockedReason === "source_material_guard_invalid") {
    return "source_material_absence_contract_invalid";
  }
  if (providerNetworkReadiness.blockedReason === "source_material_guard_not_negative") {
    return "evidence_corpus_guard_not_negative";
  }
  return "provider_network_readiness_blocked";
}

export function buildHiddenDirectTextSourceAcquisitionReadinessComposition(
  request: HiddenDirectTextSourceAcquisitionReadinessCompositionRequest,
): HiddenDirectTextSourceAcquisitionReadinessCompositionResult {
  if (!requestHasSafeShape(request)) {
    return blocked("request_malformed");
  }

  const x6BlockedReason = classifyX6Input(request.x6CandidateAcquisition);
  if (x6BlockedReason) {
    return blocked(x6BlockedReason);
  }

  const sourceMaterialReadiness = runHiddenDirectTextSourceMaterialReadinessHarness({
    x6CandidateAcquisition: request.x6CandidateAcquisition,
  }).sourceMaterialReadiness;

  if (sourceMaterialReadiness.status !== "not_ready_pre_execution") {
    return blocked("source_material_readiness_blocked", sourceMaterialReadiness);
  }

  const providerNetworkReadiness = buildSourceAcquisitionProviderNetworkReadiness({
    ...request.providerNetwork,
    sourceMaterialInput: sourceMaterialReadiness,
  });

  if (providerNetworkReadiness.status !== "not_executable_pre_live_gate") {
    return blocked(
      blockedReasonForProviderNetworkReadiness(providerNetworkReadiness),
      sourceMaterialReadiness,
      providerNetworkReadiness,
    );
  }

  return markHiddenDirectTextSourceAcquisitionReadinessCompositionRuntimeOwnedResult({
    compositionVersion: ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION,
    visibility: "internal_only",
    status: "composition_not_executable_pre_live_gate",
    executionStatus: "blocked_no_io",
    blockedReason: null,
    sourceMaterialReadiness,
    providerNetworkReadiness,
    ...zeroCostProof(),
    ...nullOutputs(),
  });
}
