import {
  ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION,
  readHiddenDirectTextSourceAcquisitionReadinessCompositionRuntimeOwnedResult,
  type HiddenDirectTextSourceAcquisitionReadinessCompositionResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition";
import {
  markHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate-provenance";

export const ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_EXECUTION_GATE_VERSION =
  "v2.hidden-direct-text-source-acquisition-execution-gate.x7f";

export type HiddenDirectTextSourceAcquisitionExecutionGateRequest = {
  readonly readinessComposition: HiddenDirectTextSourceAcquisitionReadinessCompositionResult;
};

type HiddenDirectTextSourceAcquisitionExecutionGateBlockedReason =
  | "request_malformed"
  | "readiness_composition_malformed"
  | "readiness_composition_not_runtime_owned"
  | "readiness_composition_blocked"
  | "readiness_composition_not_no_io";

type HiddenDirectTextSourceAcquisitionExecutionGateClosedReason =
  "research_acquisition_gateway_not_implemented";

type ZeroCostProof = {
  readonly networkExecution: false;
  readonly providerCalls: 0;
  readonly networkCalls: 0;
  readonly bytesRead: 0;
  readonly candidateRecords: 0;
  readonly retries: 0;
  readonly parserRuns: 0;
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
  readonly contentPackets: null;
  readonly parserInput: null;
  readonly parserOutput: null;
};

type ParserAdmissionBlock = {
  readonly parserAdmissionStatus: "blocked_pending_b2_b3_c0_2d_c";
};

export type HiddenDirectTextSourceAcquisitionExecutionGateResult =
  ZeroCostProof & NullOutputs & ParserAdmissionBlock & (
    | {
        readonly gateVersion: typeof ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_EXECUTION_GATE_VERSION;
        readonly visibility: "internal_only";
        readonly status: "gate_closed_no_io";
        readonly executionStatus: "blocked_no_io";
        readonly closedReason: HiddenDirectTextSourceAcquisitionExecutionGateClosedReason;
        readonly blockedReason: null;
        readonly readinessCompositionVersion:
          typeof ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION;
        readonly readinessCompositionStatus: "composition_not_executable_pre_live_gate";
        readonly readinessCompositionBlockedReason: null;
      }
    | {
        readonly gateVersion: typeof ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_EXECUTION_GATE_VERSION;
        readonly visibility: "internal_only";
        readonly status: "blocked_pre_execution";
        readonly executionStatus: "blocked_no_io";
        readonly closedReason: null;
        readonly blockedReason: HiddenDirectTextSourceAcquisitionExecutionGateBlockedReason;
        readonly readinessCompositionVersion:
          | typeof ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION
          | null;
        readonly readinessCompositionStatus:
          | HiddenDirectTextSourceAcquisitionReadinessCompositionResult["status"]
          | null;
        readonly readinessCompositionBlockedReason:
          | HiddenDirectTextSourceAcquisitionReadinessCompositionResult["blockedReason"]
          | null;
      }
  );

const READINESS_COMPOSITION_RESULT_KEYS = [
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

function zeroCostProof(): ZeroCostProof {
  return {
    networkExecution: false,
    providerCalls: 0,
    networkCalls: 0,
    bytesRead: 0,
    candidateRecords: 0,
    retries: 0,
    parserRuns: 0,
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
    contentPackets: null,
    parserInput: null,
    parserOutput: null,
  };
}

function parserAdmissionBlock(): ParserAdmissionBlock {
  return {
    parserAdmissionStatus: "blocked_pending_b2_b3_c0_2d_c",
  };
}

function blocked(params: {
  readonly blockedReason: HiddenDirectTextSourceAcquisitionExecutionGateBlockedReason;
  readonly readinessCompositionVersion:
    | typeof ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION
    | null;
  readonly readinessCompositionStatus:
    | HiddenDirectTextSourceAcquisitionReadinessCompositionResult["status"]
    | null;
  readonly readinessCompositionBlockedReason:
    | HiddenDirectTextSourceAcquisitionReadinessCompositionResult["blockedReason"]
    | null;
}): HiddenDirectTextSourceAcquisitionExecutionGateResult {
  return markHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult({
    gateVersion: ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_EXECUTION_GATE_VERSION,
    visibility: "internal_only",
    status: "blocked_pre_execution",
    executionStatus: "blocked_no_io",
    closedReason: null,
    blockedReason: params.blockedReason,
    readinessCompositionVersion: params.readinessCompositionVersion,
    readinessCompositionStatus: params.readinessCompositionStatus,
    readinessCompositionBlockedReason: params.readinessCompositionBlockedReason,
    ...zeroCostProof(),
    ...nullOutputs(),
    ...parserAdmissionBlock(),
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
  request: HiddenDirectTextSourceAcquisitionExecutionGateRequest,
): boolean {
  return isRecord(request)
    && hasExactKeys(request, ["readinessComposition"]);
}

function compositionHasBasicShape(value: unknown): value is Record<string, unknown> {
  return isRecord(value)
    && hasExactKeys(value, READINESS_COMPOSITION_RESULT_KEYS)
    && value.compositionVersion
      === ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION
    && value.visibility === "internal_only";
}

function compositionRecordProvesNoIo(value: Record<string, unknown>): boolean {
  return value.executionStatus === "blocked_no_io"
    && value.networkExecution === false
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

function compositionProvesNoIo(
  readinessComposition: HiddenDirectTextSourceAcquisitionReadinessCompositionResult,
): boolean {
  return compositionRecordProvesNoIo(readinessComposition);
}

export function buildHiddenDirectTextSourceAcquisitionExecutionGate(
  request: HiddenDirectTextSourceAcquisitionExecutionGateRequest,
): HiddenDirectTextSourceAcquisitionExecutionGateResult {
  if (!requestHasSafeShape(request)) {
    return blocked({
      blockedReason: "request_malformed",
      readinessCompositionVersion: null,
      readinessCompositionStatus: null,
      readinessCompositionBlockedReason: null,
    });
  }

  if (!compositionHasBasicShape(request.readinessComposition)) {
    return blocked({
      blockedReason: "readiness_composition_malformed",
      readinessCompositionVersion: null,
      readinessCompositionStatus: null,
      readinessCompositionBlockedReason: null,
    });
  }

  if (!compositionRecordProvesNoIo(request.readinessComposition)) {
    return blocked({
      blockedReason: "readiness_composition_not_no_io",
      readinessCompositionVersion:
        ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION,
      readinessCompositionStatus: request.readinessComposition.status as
        HiddenDirectTextSourceAcquisitionReadinessCompositionResult["status"],
      readinessCompositionBlockedReason: request.readinessComposition.blockedReason as
        HiddenDirectTextSourceAcquisitionReadinessCompositionResult["blockedReason"],
    });
  }

  const readinessComposition =
    readHiddenDirectTextSourceAcquisitionReadinessCompositionRuntimeOwnedResult(
      request.readinessComposition,
    );

  if (!readinessComposition) {
    return blocked({
      blockedReason: "readiness_composition_not_runtime_owned",
      readinessCompositionVersion:
        ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_READINESS_COMPOSITION_VERSION,
      readinessCompositionStatus: request.readinessComposition.status,
      readinessCompositionBlockedReason: request.readinessComposition.blockedReason,
    });
  }

  if (!compositionProvesNoIo(readinessComposition)) {
    return blocked({
      blockedReason: "readiness_composition_not_no_io",
      readinessCompositionVersion: readinessComposition.compositionVersion,
      readinessCompositionStatus: readinessComposition.status,
      readinessCompositionBlockedReason: readinessComposition.blockedReason,
    });
  }

  if (readinessComposition.status !== "composition_not_executable_pre_live_gate") {
    return blocked({
      blockedReason: "readiness_composition_blocked",
      readinessCompositionVersion: readinessComposition.compositionVersion,
      readinessCompositionStatus: readinessComposition.status,
      readinessCompositionBlockedReason: readinessComposition.blockedReason,
    });
  }

  return markHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult({
    gateVersion: ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_EXECUTION_GATE_VERSION,
    visibility: "internal_only",
    status: "gate_closed_no_io",
    executionStatus: "blocked_no_io",
    closedReason: "research_acquisition_gateway_not_implemented",
    blockedReason: null,
    readinessCompositionVersion: readinessComposition.compositionVersion,
    readinessCompositionStatus: readinessComposition.status,
    readinessCompositionBlockedReason: null,
    ...zeroCostProof(),
    ...nullOutputs(),
    ...parserAdmissionBlock(),
  });
}
