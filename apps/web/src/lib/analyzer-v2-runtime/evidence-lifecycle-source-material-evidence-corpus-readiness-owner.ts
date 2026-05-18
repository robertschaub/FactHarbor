import {
  buildEvidenceCorpusSourceMaterialReadiness,
  type EvidenceCorpusSourceMaterialReadinessDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness";
import {
  readEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision,
} from "./evidence-lifecycle-source-material-page-summary-provenance";

export type EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision =
  EvidenceCorpusSourceMaterialReadinessDecision;

export function buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision(params: {
  readonly sourceMaterialPageSummary: unknown;
}): EvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision {
  const runtimeOwnedDecision =
    readEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(params.sourceMaterialPageSummary);

  return buildEvidenceCorpusSourceMaterialReadiness({
    sourceMaterialPageSummary: runtimeOwnedDecision ?? params.sourceMaterialPageSummary,
    runtimeOwned: runtimeOwnedDecision !== null,
  });
}
