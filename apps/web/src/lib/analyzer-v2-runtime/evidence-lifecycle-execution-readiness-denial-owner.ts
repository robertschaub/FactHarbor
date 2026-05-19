import {
  buildEvidenceLifecycleExecutionReadinessDenial,
  type EvidenceLifecycleExecutionReadinessDenialDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial";
import type { BoundedExtractionInputAuthorizationDecision } from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";
import {
  inspectEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnership,
  readEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-provenance";
import { markEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-provenance";

export function buildEvidenceLifecycleExecutionReadinessDenialDecision(
  input: {
    readonly extractionInputAuthorization: BoundedExtractionInputAuthorizationDecision;
  },
): EvidenceLifecycleExecutionReadinessDenialDecision {
  const extractionInputRuntimeOwnership =
    inspectEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnership(
      input.extractionInputAuthorization,
    );
  const runtimeOwnedAuthorization =
    readEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(
      input.extractionInputAuthorization,
    );

  const decision = buildEvidenceLifecycleExecutionReadinessDenial({
    extractionInputAuthorization: runtimeOwnedAuthorization,
    extractionInputRuntimeOwnership,
  });

  return markEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(decision);
}
