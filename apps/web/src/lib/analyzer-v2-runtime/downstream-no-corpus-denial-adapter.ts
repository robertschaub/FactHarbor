import {
  buildDownstreamNoCorpusDenial,
} from "@/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial";
import {
  DOWNSTREAM_NO_CORPUS_STRUCTURAL_INPUT_VERSION,
  type DownstreamNoCorpusDenialDecision,
  type DownstreamNoCorpusStructuralInput,
} from "@/lib/analyzer-v2/evidence-lifecycle/downstream-denial/types";
import {
  readHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate-provenance";
import {
  readSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult,
} from "@/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial-provenance";

export const ANALYZER_V2_RUNTIME_DOWNSTREAM_NO_CORPUS_DENIAL_ADAPTER_VERSION =
  "v2.runtime-downstream-no-corpus-denial-adapter.x7g2";

export type RuntimeDownstreamNoCorpusDenialAdapterStatus =
  | "runtime_downstream_blocked_no_corpus"
  | "runtime_downstream_blocked_input_invalid";

export type RuntimeDownstreamNoCorpusDenialAdapterBlockedReason =
  | "runtime_source_acquisition_gate_closed"
  | "runtime_source_acquisition_gate_rejected"
  | "runtime_parser_denial_no_parsed_material"
  | "runtime_input_not_owned"
  | "runtime_input_invalid";

export type RuntimeDownstreamNoCorpusDenialAdapterResult = {
  readonly adapterVersion: typeof ANALYZER_V2_RUNTIME_DOWNSTREAM_NO_CORPUS_DENIAL_ADAPTER_VERSION;
  readonly visibility: "internal_only";
  readonly status: RuntimeDownstreamNoCorpusDenialAdapterStatus;
  readonly blockedReason: RuntimeDownstreamNoCorpusDenialAdapterBlockedReason;
  readonly upstreamKind:
    | "x7f_source_acquisition_gate"
    | "c0s3_parsed_material_denial"
    | null;
  readonly coreDenial: DownstreamNoCorpusDenialDecision;
  readonly sourceMaterial: null;
  readonly parsedMaterial: null;
  readonly extractionInput: null;
  readonly evidenceCorpus: null;
  readonly evidenceItems: null;
  readonly warnings: null;
  readonly report: null;
  readonly publicOutput: null;
  readonly liveEligibility: false;
  readonly semanticLlmTasksApproved: false;
  readonly productPublicLiveApproved: false;
  readonly cacheTouched: false;
  readonly sourceReliabilityTouched: false;
};

function structuralInput(
  params: Pick<
    DownstreamNoCorpusStructuralInput,
    "structuralSource" | "status" | "blockedReason"
  >,
): DownstreamNoCorpusStructuralInput {
  return {
    inputVersion: DOWNSTREAM_NO_CORPUS_STRUCTURAL_INPUT_VERSION,
    visibility: "internal_only",
    structuralSource: params.structuralSource,
    status: params.status,
    blockedReason: params.blockedReason,
    sourceMaterial: null,
    parsedMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
  };
}

function adapterResult(params: {
  readonly status: RuntimeDownstreamNoCorpusDenialAdapterStatus;
  readonly blockedReason: RuntimeDownstreamNoCorpusDenialAdapterBlockedReason;
  readonly upstreamKind: RuntimeDownstreamNoCorpusDenialAdapterResult["upstreamKind"];
  readonly coreDenial: DownstreamNoCorpusDenialDecision;
}): RuntimeDownstreamNoCorpusDenialAdapterResult {
  return {
    adapterVersion: ANALYZER_V2_RUNTIME_DOWNSTREAM_NO_CORPUS_DENIAL_ADAPTER_VERSION,
    visibility: "internal_only",
    status: params.status,
    blockedReason: params.blockedReason,
    upstreamKind: params.upstreamKind,
    coreDenial: params.coreDenial,
    sourceMaterial: null,
    parsedMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
    evidenceItems: null,
    warnings: null,
    report: null,
    publicOutput: null,
    liveEligibility: false,
    semanticLlmTasksApproved: false,
    productPublicLiveApproved: false,
    cacheTouched: false,
    sourceReliabilityTouched: false,
  };
}

function invalidInputResult(): RuntimeDownstreamNoCorpusDenialAdapterResult {
  return adapterResult({
    status: "runtime_downstream_blocked_input_invalid",
    blockedReason: "runtime_input_invalid",
    upstreamKind: null,
    coreDenial: buildDownstreamNoCorpusDenial({}),
  });
}

export function buildRuntimeDownstreamNoCorpusDenialAdapter(
  upstreamDenial: unknown,
): RuntimeDownstreamNoCorpusDenialAdapterResult {
  const sourceAcquisitionGate =
    readHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult(upstreamDenial);
  if (sourceAcquisitionGate !== null) {
    const blockedReason = sourceAcquisitionGate.status === "gate_closed_no_io"
      ? "runtime_source_acquisition_gate_closed"
      : "runtime_source_acquisition_gate_rejected";
    const input = structuralInput({
      structuralSource: "x7f_source_acquisition_gate",
      status: sourceAcquisitionGate.status === "gate_closed_no_io"
        ? "structural_source_acquisition_closed"
        : "structural_input_rejected",
      blockedReason,
    });
    return adapterResult({
      status: "runtime_downstream_blocked_no_corpus",
      blockedReason,
      upstreamKind: "x7f_source_acquisition_gate",
      coreDenial: buildDownstreamNoCorpusDenial(input),
    });
  }

  const parsedMaterialDenial =
    readSourceAcquisitionParserAdmissionParsedMaterialDenialProducerOwnedResult(upstreamDenial);
  if (parsedMaterialDenial !== null) {
    const blockedReason = parsedMaterialDenial.status === "blocked_no_parsed_material"
      ? "runtime_parser_denial_no_parsed_material"
      : "runtime_input_not_owned";
    const input = structuralInput({
      structuralSource: "c0s3_parsed_material_denial",
      status: parsedMaterialDenial.status === "blocked_no_parsed_material"
        ? "structural_no_parsed_material"
        : "structural_input_rejected",
      blockedReason,
    });
    return adapterResult({
      status: "runtime_downstream_blocked_no_corpus",
      blockedReason,
      upstreamKind: "c0s3_parsed_material_denial",
      coreDenial: buildDownstreamNoCorpusDenial(input),
    });
  }

  return invalidInputResult();
}
