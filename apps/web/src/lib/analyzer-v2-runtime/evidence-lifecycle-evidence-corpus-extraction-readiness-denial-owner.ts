import {
  buildEvidenceCorpusExtractionReadinessDenial,
  type EvidenceCorpusExtractionReadinessDenialDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-extraction-readiness-denial";
import {
  inspectEvidenceLifecycleEvidenceCorpusShellRuntimeOwnership,
  readEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision,
} from "./evidence-lifecycle-evidence-corpus-shell-provenance";

export type EvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision =
  EvidenceCorpusExtractionReadinessDenialDecision;

export function buildEvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision(params: {
  readonly evidenceCorpusShell: unknown;
}): EvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision {
  const runtimeOwnership =
    inspectEvidenceLifecycleEvidenceCorpusShellRuntimeOwnership(params.evidenceCorpusShell);
  const runtimeOwnedShell =
    readEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(params.evidenceCorpusShell);

  return buildEvidenceCorpusExtractionReadinessDenial({
    evidenceCorpusShellDecision: runtimeOwnedShell ?? params.evidenceCorpusShell,
    runtimeOwnership,
  });
}
