import {
  buildEvidenceCorpusSourceMaterialReadiness,
  type EvidenceCorpusSourceMaterialReadinessDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness";
import {
  readEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision,
} from "./evidence-lifecycle-source-material-page-summary-provenance";
import {
  markEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision,
} from "./evidence-lifecycle-source-material-evidence-corpus-readiness-provenance";

export type EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision =
  EvidenceCorpusSourceMaterialReadinessDecision;

export function buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision(params: {
  readonly sourceMaterialPageSummary: unknown;
}): EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision {
  const runtimeOwnedDecision =
    readEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(params.sourceMaterialPageSummary);

  const decision = buildEvidenceCorpusSourceMaterialReadiness({
    sourceMaterialPageSummary: runtimeOwnedDecision ?? params.sourceMaterialPageSummary,
    runtimeOwned: runtimeOwnedDecision !== null,
  });
  return markEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeOwnedDecision(decision);
}
