import {
  buildEvidenceCorpusShell,
  type EvidenceCorpusShellDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell";
import {
  inspectEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnership,
  readEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision,
} from "./evidence-lifecycle-evidence-corpus-source-material-admission-provenance";
import {
  markEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision,
} from "./evidence-lifecycle-evidence-corpus-shell-provenance";

export type EvidenceLifecycleEvidenceCorpusShellDecision = EvidenceCorpusShellDecision;

export function buildEvidenceLifecycleEvidenceCorpusShellDecision(params: {
  readonly sourceMaterialAdmission: unknown;
}): EvidenceLifecycleEvidenceCorpusShellDecision {
  const runtimeOwnership =
    inspectEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnership(params.sourceMaterialAdmission);
  const runtimeOwnedAdmission =
    readEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision(params.sourceMaterialAdmission);

  return markEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(buildEvidenceCorpusShell({
    sourceMaterialAdmission: runtimeOwnedAdmission ?? params.sourceMaterialAdmission,
    runtimeOwnership,
  }));
}
