import { describe, expect, it } from "vitest";

import { buildBoundedExtractionInputAuthorization } from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";
import {
  buildEvidenceLifecycleExecutionReadinessDenialDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-owner";
import { markEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-provenance";
import { isEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-provenance";

function structurallyValidBlockedW4h() {
  return buildBoundedExtractionInputAuthorization({
    boundedTextAuthorization: null,
    boundedTextRuntimeOwnership: "owned",
  });
}

describe("evidence lifecycle execution-readiness denial owner", () => {
  it("fails closed when the W4-H parent is not runtime-owned", () => {
    const decision = buildEvidenceLifecycleExecutionReadinessDenialDecision({
      extractionInputAuthorization: structurallyValidBlockedW4h(),
    });

    expect(decision.status).toBe("blocked_pre_execution_readiness_w4h_not_runtime_owned");
    expect(isEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(decision)).toBe(true);
    expect(decision.productExecution.extractionExecutionAuthorized).toBe(false);
  });

  it("reads runtime-owned W4-H provenance before applying W4-I eligibility checks", () => {
    const parent = markEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(
      structurallyValidBlockedW4h(),
    );
    const decision = buildEvidenceLifecycleExecutionReadinessDenialDecision({
      extractionInputAuthorization: parent,
    });

    expect(decision.status).toBe("blocked_pre_execution_readiness_w4h_not_positive");
    expect(decision.parent.runtimeOwnership).toBe("owned");
    expect(isEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(decision)).toBe(true);
    expect(decision.productExecution.evidenceItemGenerated).toBe(false);
  });
});
