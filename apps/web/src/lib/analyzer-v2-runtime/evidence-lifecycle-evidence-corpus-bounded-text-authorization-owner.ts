import {
  buildEvidenceCorpusBoundedTextAuthorization,
  type EvidenceCorpusBoundedTextAuthorizationDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization";
import {
  readEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision,
} from "./evidence-lifecycle-source-material-page-summary-provenance";
import {
  inspectEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnership,
  readEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision,
} from "./evidence-lifecycle-evidence-corpus-source-material-admission-provenance";
import {
  inspectEvidenceLifecycleEvidenceCorpusShellRuntimeOwnership,
  readEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision,
} from "./evidence-lifecycle-evidence-corpus-shell-provenance";
import {
  markEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision,
} from "./evidence-lifecycle-evidence-corpus-bounded-text-authorization-provenance";

export type EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision =
  EvidenceCorpusBoundedTextAuthorizationDecision;

export function buildEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision(params: {
  readonly sourceMaterialPageSummary: unknown;
  readonly sourceMaterialAdmission: unknown;
  readonly evidenceCorpusShell: unknown;
  readonly extractionReadinessDenial: unknown;
}): EvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision {
  const sourceMaterialRuntimeOwned =
    readEvidenceLifecycleSourceMaterialPageSummaryRuntimeOwnedDecision(params.sourceMaterialPageSummary);
  const admissionRuntimeOwnership =
    inspectEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnership(params.sourceMaterialAdmission);
  const admissionRuntimeOwned =
    readEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionRuntimeOwnedDecision(params.sourceMaterialAdmission);
  const shellRuntimeOwnership =
    inspectEvidenceLifecycleEvidenceCorpusShellRuntimeOwnership(params.evidenceCorpusShell);
  const shellRuntimeOwned =
    readEvidenceLifecycleEvidenceCorpusShellRuntimeOwnedDecision(params.evidenceCorpusShell);

  const decision = buildEvidenceCorpusBoundedTextAuthorization({
    sourceMaterialPageSummary: sourceMaterialRuntimeOwned ?? params.sourceMaterialPageSummary,
    sourceMaterialRuntimeOwnership: sourceMaterialRuntimeOwned ? "owned" : "not_owned",
    sourceMaterialAdmission: admissionRuntimeOwned ?? params.sourceMaterialAdmission,
    admissionRuntimeOwnership,
    evidenceCorpusShell: shellRuntimeOwned ?? params.evidenceCorpusShell,
    shellRuntimeOwnership,
    extractionReadinessDenial: params.extractionReadinessDenial,
  });

  return markEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(decision);
}
