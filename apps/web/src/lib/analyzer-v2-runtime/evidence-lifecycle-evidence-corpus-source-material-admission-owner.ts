import {
  buildEvidenceCorpusSourceMaterialAdmission,
  type EvidenceCorpusSourceMaterialAdmissionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission";
import {
  readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision,
} from "./evidence-lifecycle-source-material-evidence-corpus-readiness-provenance";

export type EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision =
  EvidenceCorpusSourceMaterialAdmissionDecision;

export function buildEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision(params: {
  readonly sourceMaterialReadiness: unknown;
}): EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision {
  const runtimeOwnedReadiness =
    readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(params.sourceMaterialReadiness);

  return buildEvidenceCorpusSourceMaterialAdmission({
    sourceMaterialReadiness: runtimeOwnedReadiness ?? params.sourceMaterialReadiness,
    runtimeOwned: runtimeOwnedReadiness !== null,
  });
}
