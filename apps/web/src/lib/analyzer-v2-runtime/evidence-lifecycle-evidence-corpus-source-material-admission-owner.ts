import {
  buildEvidenceCorpusSourceMaterialAdmission,
  type EvidenceCorpusSourceMaterialAdmissionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission";
import {
  readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision,
} from "./evidence-lifecycle-source-material-evidence-corpus-readiness-provenance";
import {
  markEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision,
} from "./evidence-lifecycle-evidence-corpus-source-material-admission-provenance";

export type EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision =
  EvidenceCorpusSourceMaterialAdmissionDecision;

export function buildEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision(params: {
  readonly sourceMaterialReadiness: unknown;
}): EvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision {
  const runtimeOwnedReadiness =
    readEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(params.sourceMaterialReadiness);

  const decision = buildEvidenceCorpusSourceMaterialAdmission({
    sourceMaterialReadiness: runtimeOwnedReadiness ?? params.sourceMaterialReadiness,
    runtimeOwned: runtimeOwnedReadiness !== null,
  });
  return markEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision(decision);
}
