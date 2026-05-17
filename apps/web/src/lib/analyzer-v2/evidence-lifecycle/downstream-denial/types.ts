import {
  EVIDENCE_CORPUS_SOURCE_MATERIAL_GUARD_VERSION,
  type EvidenceCorpusSourceMaterialGuardReason,
  type EvidenceCorpusSourceMaterialGuardStatus,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard";

export const DOWNSTREAM_NO_CORPUS_DENIAL_VERSION =
  "v2.evidence-lifecycle.downstream.no-corpus-denial.x7g1";

export const DOWNSTREAM_NO_CORPUS_STRUCTURAL_INPUT_VERSION =
  "v2.evidence-lifecycle.downstream.no-corpus-structural-input.x7g2";

export type DownstreamNoCorpusDenialStatus =
  | "downstream_blocked_no_evidence_corpus"
  | "downstream_blocked_source_material_invalid"
  | "downstream_blocked_source_material_not_accepted"
  | "downstream_blocked_input_invalid";

export type DownstreamNoCorpusDenialBlockedReason =
  | "source_material_guard_no_corpus"
  | "source_material_guard_invalid"
  | "source_material_guard_not_accepted"
  | "source_material_guard_input_invalid"
  | "runtime_source_acquisition_gate_closed"
  | "runtime_source_acquisition_gate_rejected"
  | "runtime_parser_denial_no_parsed_material"
  | "runtime_input_not_owned"
  | "runtime_input_invalid";

export type DownstreamNoCorpusStructuralSource =
  | "x7b_source_material_guard"
  | "x7f_source_acquisition_gate"
  | "c0s3_parsed_material_denial";

export type DownstreamNoCorpusStructuralStatus =
  | "structural_no_evidence_corpus"
  | "structural_source_acquisition_closed"
  | "structural_no_parsed_material"
  | "structural_input_rejected";

export type DownstreamNoCorpusStructuralBlockedReason =
  | "source_material_guard_no_corpus"
  | "runtime_source_acquisition_gate_closed"
  | "runtime_source_acquisition_gate_rejected"
  | "runtime_parser_denial_no_parsed_material"
  | "runtime_input_not_owned"
  | "runtime_input_invalid";

export type DownstreamNoCorpusStructuralInput = {
  readonly inputVersion: typeof DOWNSTREAM_NO_CORPUS_STRUCTURAL_INPUT_VERSION;
  readonly visibility: "internal_only";
  readonly structuralSource: DownstreamNoCorpusStructuralSource;
  readonly status: DownstreamNoCorpusStructuralStatus;
  readonly blockedReason: DownstreamNoCorpusStructuralBlockedReason;
  readonly sourceMaterial: null;
  readonly parsedMaterial: null;
  readonly extractionInput: null;
  readonly evidenceCorpus: null;
};

export type DownstreamNoCorpusDenialDecision = {
  readonly denialVersion: typeof DOWNSTREAM_NO_CORPUS_DENIAL_VERSION;
  readonly visibility: "internal_only";
  readonly status: DownstreamNoCorpusDenialStatus;
  readonly blockedReason: DownstreamNoCorpusDenialBlockedReason;
  readonly sourceMaterialGuardVersion:
    | typeof EVIDENCE_CORPUS_SOURCE_MATERIAL_GUARD_VERSION
    | null;
  readonly sourceMaterialGuardStatus: EvidenceCorpusSourceMaterialGuardStatus | null;
  readonly sourceMaterialGuardReason: EvidenceCorpusSourceMaterialGuardReason | null;
  readonly applicabilityInput: null;
  readonly extractionInput: null;
  readonly sufficiencyInput: null;
  readonly boundaryInput: null;
  readonly verdictInput: null;
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
