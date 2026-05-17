import type {
  SourceAcquisitionParserAdmissionParsedMaterialDenialResult,
} from "@/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial";

export const SOURCE_ACQUISITION_PARSER_ADMISSION_PARSED_MATERIAL_DENIAL_PROVENANCE_VERSION =
  "v2.source-acquisition.parser-admission-parsed-material-denial-provenance.x7g2";

const SOURCE_ACQUISITION_PARSER_ADMISSION_PARSED_MATERIAL_DENIAL_VERSION =
  "v2.source-acquisition.parser-admission-parsed-material-denial.c0-s3";

export type SourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult =
  SourceAcquisitionParserAdmissionParsedMaterialDenialResult;

const RESULT_KEYS = [
  "admissionProvenanceStatus",
  "admissionReference",
  "admissionRuntimeOwned",
  "blockedReason",
  "bytesConsumed",
  "cacheTouched",
  "denialVersion",
  "evidenceCorpus",
  "evidenceLifecycleConsumptionApproved",
  "extractionInput",
  "fixtureBytesParsed",
  "liveJobs",
  "parserExecution",
  "parserOutput",
  "parsedMaterialPacket",
  "productPublicLiveApproved",
  "publicExposure",
  "realFetchedBytesAccepted",
  "sourceMaterial",
  "sourceReliabilityTouched",
  "status",
  "syntheticBytesParsed",
  "transportFrameAccepted",
  "transportPacketAccepted",
  "visibility",
  "workerSpawned",
].sort();

const producerOwnedSnapshots = new WeakMap<object, string>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length
    && actual.every((key, index) => key === keys[index]);
}

function hasNoParserOrOutputs(value: Record<string, unknown>): boolean {
  return value.parserExecution === false
    && value.workerSpawned === false
    && value.bytesConsumed === false
    && value.transportPacketAccepted === false
    && value.transportFrameAccepted === false
    && value.realFetchedBytesAccepted === false
    && value.fixtureBytesParsed === false
    && value.syntheticBytesParsed === false
    && value.productPublicLiveApproved === false
    && value.evidenceLifecycleConsumptionApproved === false
    && value.cacheTouched === false
    && value.sourceReliabilityTouched === false
    && value.publicExposure === false
    && value.liveJobs === false
    && value.parsedMaterialPacket === null
    && value.parserOutput === null
    && value.sourceMaterial === null
    && value.extractionInput === null
    && value.evidenceCorpus === null;
}

function hasValidStatusPayload(value: Record<string, unknown>): boolean {
  if (value.status === "blocked_no_parsed_material") {
    return value.blockedReason === "parser_execution_unapproved"
      && value.admissionProvenanceStatus === "runtime_owned"
      && value.admissionRuntimeOwned === true
      && isRecord(value.admissionReference);
  }

  if (value.status === "blocked_admission_not_runtime_owned") {
    return value.blockedReason === "admission_not_runtime_owned"
      && value.admissionProvenanceStatus === "blocked_not_runtime_owned"
      && value.admissionRuntimeOwned === false
      && value.admissionReference === null;
  }

  return false;
}

function buildIntegritySnapshot(value: unknown): string | null {
  if (
    !isRecord(value)
    || !hasExactKeys(value, RESULT_KEYS)
    || value.denialVersion !== SOURCE_ACQUISITION_PARSER_ADMISSION_PARSED_MATERIAL_DENIAL_VERSION
    || value.visibility !== "internal_only"
    || !hasNoParserOrOutputs(value)
    || !hasValidStatusPayload(value)
  ) {
    return null;
  }

  return JSON.stringify(RESULT_KEYS.map((key) => [key, value[key]]));
}

export function markSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult<
  TResult extends SourceAcquisitionParserAdmissionParsedMaterialDenialResult,
>(result: TResult): TResult {
  const snapshot = buildIntegritySnapshot(result);
  if (snapshot !== null) {
    producerOwnedSnapshots.set(result, snapshot);
  }
  return result;
}

export function readSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult(
  value: unknown,
): SourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult | null {
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

  return value as unknown as SourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult;
}
