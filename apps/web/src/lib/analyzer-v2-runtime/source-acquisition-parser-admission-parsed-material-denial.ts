import {
  inspectSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision,
  type SourceAcquisitionParserWorkerAdmissionProvenanceInspection,
  type SourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission-provenance";
import {
  markSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult,
} from "@/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial-provenance";

export const SOURCE_ACQUISITION_PARSER_ADMISSION_PARSED_MATERIAL_DENIAL_VERSION =
  "v2.source-acquisition.parser-admission-parsed-material-denial.c0-s3";

export type SourceAcquisitionParserAdmissionParsedMaterialDenialRequest = {
  readonly parserAdmission: unknown;
};

export type SourceAcquisitionParserAdmissionParsedMaterialDenialAdmissionReference = {
  readonly admissionVersion: string | null;
  readonly profileId: string | null;
  readonly isolationLabel: string | null;
  readonly admittedProvenanceKind: string | null;
  readonly admittedByteCount: number | null;
  readonly admittedByteDigest: string | null;
};

type SourceAcquisitionParserAdmissionParsedMaterialDenialBase = {
  readonly denialVersion: typeof SOURCE_ACQUISITION_PARSER_ADMISSION_PARSED_MATERIAL_DENIAL_VERSION;
  readonly visibility: "internal_only";
  readonly admissionProvenanceStatus: SourceAcquisitionParserWorkerAdmissionProvenanceInspection["status"];
  readonly admissionRuntimeOwned: boolean;
  readonly admissionReference: SourceAcquisitionParserAdmissionParsedMaterialDenialAdmissionReference | null;
  readonly parserExecution: false;
  readonly workerSpawned: false;
  readonly bytesConsumed: false;
  readonly transportPacketAccepted: false;
  readonly transportFrameAccepted: false;
  readonly realFetchedBytesAccepted: false;
  readonly fixtureBytesParsed: false;
  readonly syntheticBytesParsed: false;
  readonly productPublicLiveApproved: false;
  readonly evidenceLifecycleConsumptionApproved: false;
  readonly cacheTouched: false;
  readonly sourceReliabilityTouched: false;
  readonly publicExposure: false;
  readonly liveJobs: false;
  readonly parsedMaterialPacket: null;
  readonly parserOutput: null;
  readonly sourceMaterial: null;
  readonly extractionInput: null;
  readonly evidenceCorpus: null;
};

export type SourceAcquisitionParserAdmissionParsedMaterialDenialResult =
  SourceAcquisitionParserAdmissionParsedMaterialDenialBase & (
    | {
        readonly status: "blocked_no_parsed_material";
        readonly blockedReason: "parser_execution_unapproved";
      }
    | {
        readonly status: "blocked_admission_not_runtime_owned";
        readonly blockedReason: "admission_not_runtime_owned";
      }
  );

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length
    && actual.every((key, index) => key === keys[index]);
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function admissionReference(
  decision: SourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision,
): SourceAcquisitionParserAdmissionParsedMaterialDenialAdmissionReference {
  return {
    admissionVersion: readString(decision.admissionVersion),
    profileId: readString(decision.profileId),
    isolationLabel: readString(decision.isolationLabel),
    admittedProvenanceKind: readString(decision.admittedProvenanceKind),
    admittedByteCount: readNumber(decision.admittedByteCount),
    admittedByteDigest: readString(decision.admittedByteDigest),
  };
}

function baseResult(params: {
  readonly admissionProvenanceStatus: SourceAcquisitionParserWorkerAdmissionProvenanceInspection["status"];
  readonly admissionRuntimeOwned: boolean;
  readonly admissionReference: SourceAcquisitionParserAdmissionParsedMaterialDenialAdmissionReference | null;
}): SourceAcquisitionParserAdmissionParsedMaterialDenialBase {
  return {
    denialVersion: SOURCE_ACQUISITION_PARSER_ADMISSION_PARSED_MATERIAL_DENIAL_VERSION,
    visibility: "internal_only",
    admissionProvenanceStatus: params.admissionProvenanceStatus,
    admissionRuntimeOwned: params.admissionRuntimeOwned,
    admissionReference: params.admissionReference,
    parserExecution: false,
    workerSpawned: false,
    bytesConsumed: false,
    transportPacketAccepted: false,
    transportFrameAccepted: false,
    realFetchedBytesAccepted: false,
    fixtureBytesParsed: false,
    syntheticBytesParsed: false,
    productPublicLiveApproved: false,
    evidenceLifecycleConsumptionApproved: false,
    cacheTouched: false,
    sourceReliabilityTouched: false,
    publicExposure: false,
    liveJobs: false,
    parsedMaterialPacket: null,
    parserOutput: null,
    sourceMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
  };
}

function blockedNotRuntimeOwned(
  admissionProvenanceStatus: SourceAcquisitionParserWorkerAdmissionProvenanceInspection["status"],
): SourceAcquisitionParserAdmissionParsedMaterialDenialResult {
  return markSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult({
    ...baseResult({
      admissionProvenanceStatus,
      admissionRuntimeOwned: false,
      admissionReference: null,
    }),
    status: "blocked_admission_not_runtime_owned",
    blockedReason: "admission_not_runtime_owned",
  });
}

export function buildSourceAcquisitionParserAdmissionParsedMaterialDenial(
  request: SourceAcquisitionParserAdmissionParsedMaterialDenialRequest,
): SourceAcquisitionParserAdmissionParsedMaterialDenialResult {
  if (!isRecord(request) || !hasExactKeys(request, ["parserAdmission"])) {
    return blockedNotRuntimeOwned("blocked_not_runtime_owned");
  }

  const inspection = inspectSourceAcquisitionParserWorkerAdmissionRuntimeOwnedDecision(
    request.parserAdmission,
  );
  if (inspection.status !== "runtime_owned") {
    return blockedNotRuntimeOwned(inspection.status);
  }

  return markSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult({
    ...baseResult({
      admissionProvenanceStatus: inspection.status,
      admissionRuntimeOwned: true,
      admissionReference: admissionReference(inspection.decision),
    }),
    status: "blocked_no_parsed_material",
    blockedReason: "parser_execution_unapproved",
  });
}
