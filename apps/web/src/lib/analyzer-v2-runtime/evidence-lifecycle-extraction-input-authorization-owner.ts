import {
  buildBoundedExtractionInputAuthorization,
  type BoundedExtractionInputAuthorizationDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";
import {
  inspectEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnership,
  readEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision,
} from "./evidence-lifecycle-evidence-corpus-bounded-text-authorization-provenance";
import {
  markEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision,
} from "./evidence-lifecycle-extraction-input-authorization-provenance";

export type EvidenceLifecycleExtractionInputAuthorizationDecision =
  BoundedExtractionInputAuthorizationDecision;

export function buildEvidenceLifecycleExtractionInputAuthorizationDecision(params: {
  readonly boundedTextAuthorization: unknown;
}): EvidenceLifecycleExtractionInputAuthorizationDecision {
  const boundedTextRuntimeOwnership =
    inspectEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnership(params.boundedTextAuthorization);
  const boundedTextRuntimeOwned =
    readEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationRuntimeOwnedDecision(params.boundedTextAuthorization);

  const decision = buildBoundedExtractionInputAuthorization({
    boundedTextAuthorization: boundedTextRuntimeOwned ?? params.boundedTextAuthorization,
    boundedTextRuntimeOwnership,
  });

  return markEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(decision);
}
