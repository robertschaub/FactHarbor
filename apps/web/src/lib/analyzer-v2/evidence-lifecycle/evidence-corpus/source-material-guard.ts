import {
  buildSourceMaterialAbsenceContract,
  isSourceMaterialAbsenceContract,
  SOURCE_MATERIAL_ABSENCE_CONTRACT_VERSION,
  type SourceMaterialAbsenceContract,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/contract";

export const EVIDENCE_CORPUS_SOURCE_MATERIAL_GUARD_VERSION =
  "v2.evidence-lifecycle.evidence-corpus.source-material-guard.x7b";

export type EvidenceCorpusSourceMaterialGuardStatus =
  | "not_buildable_no_source_material"
  | "blocked_source_material_invalid"
  | "blocked_source_material_not_accepted";

export type EvidenceCorpusSourceMaterialGuardReason =
  | "source_material_not_available_pre_execution"
  | "source_material_contract_invalid"
  | "source_material_readiness_blocked";

export type EvidenceCorpusSourceMaterialContractSummary = {
  readonly contractVersion: typeof SOURCE_MATERIAL_ABSENCE_CONTRACT_VERSION;
  readonly status: "not_available_pre_execution";
  readonly notAvailableReason: SourceMaterialAbsenceContract["notAvailableReason"];
  readonly readinessStatus: SourceMaterialAbsenceContract["sourceMaterialReadiness"] extends infer Readiness
    ? Readiness extends { readonly status: infer Status }
      ? Status | null
      : null
    : null;
};

export type EvidenceCorpusSourceMaterialGuardDecision = {
  readonly decisionVersion: typeof EVIDENCE_CORPUS_SOURCE_MATERIAL_GUARD_VERSION;
  readonly visibility: "internal_only";
  readonly status: EvidenceCorpusSourceMaterialGuardStatus;
  readonly blockedReason: EvidenceCorpusSourceMaterialGuardReason;
  readonly sourceMaterialContract: EvidenceCorpusSourceMaterialContractSummary | null;
  readonly sourceMaterial: null;
  readonly extractionInput: null;
  readonly evidenceCorpus: null;
};

function summarizeContract(
  contract: SourceMaterialAbsenceContract,
): EvidenceCorpusSourceMaterialContractSummary {
  return {
    contractVersion: contract.contractVersion,
    status: contract.status,
    notAvailableReason: contract.notAvailableReason,
    readinessStatus: contract.sourceMaterialReadiness?.status ?? null,
  };
}

function guardDecision(
  status: EvidenceCorpusSourceMaterialGuardStatus,
  blockedReason: EvidenceCorpusSourceMaterialGuardReason,
  sourceMaterialContract: EvidenceCorpusSourceMaterialContractSummary | null,
): EvidenceCorpusSourceMaterialGuardDecision {
  return {
    decisionVersion: EVIDENCE_CORPUS_SOURCE_MATERIAL_GUARD_VERSION,
    visibility: "internal_only",
    status,
    blockedReason,
    sourceMaterialContract,
    sourceMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
  };
}

export function buildEvidenceCorpusSourceMaterialGuard(
  sourceMaterialInput: unknown,
): EvidenceCorpusSourceMaterialGuardDecision {
  const contract = isSourceMaterialAbsenceContract(sourceMaterialInput)
    ? sourceMaterialInput
    : buildSourceMaterialAbsenceContract(sourceMaterialInput);
  const summary = summarizeContract(contract);

  if (contract.notAvailableReason === "source_material_contract_invalid") {
    return guardDecision("blocked_source_material_invalid", "source_material_contract_invalid", summary);
  }

  if (contract.notAvailableReason === "source_material_readiness_blocked") {
    return guardDecision("blocked_source_material_not_accepted", "source_material_readiness_blocked", summary);
  }

  return guardDecision(
    "not_buildable_no_source_material",
    "source_material_not_available_pre_execution",
    summary,
  );
}
