import {
  buildEvidenceCorpusSourceMaterialReadiness,
  type EvidenceCorpusSourceMaterialReadinessDecision,
} from "./source-material-readiness";

export function buildEvidenceCorpusSourceMaterialReadinessGuard(params: {
  readonly sourceMaterialPageSummary: unknown;
  readonly runtimeOwned: boolean;
}): EvidenceCorpusSourceMaterialReadinessDecision {
  return buildEvidenceCorpusSourceMaterialReadiness(params);
}
