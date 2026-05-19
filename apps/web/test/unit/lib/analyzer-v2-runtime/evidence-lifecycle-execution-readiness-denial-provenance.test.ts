import { describe, expect, it } from "vitest";

import { buildEvidenceLifecycleExecutionReadinessDenial } from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial";
import {
  inspectEvidenceLifecycleExecutionReadinessRuntimeOwnership,
  markEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision,
  readEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-provenance";

function blockedDecision() {
  return buildEvidenceLifecycleExecutionReadinessDenial({
    extractionInputAuthorization: null,
    extractionInputRuntimeOwnership: "not_owned",
  });
}

describe("evidence lifecycle execution-readiness runtime provenance", () => {
  it("marks exact runtime-owned W4-I decisions and rejects copied values", () => {
    const decision = markEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(blockedDecision());
    const copied = JSON.parse(JSON.stringify(decision));

    expect(inspectEvidenceLifecycleExecutionReadinessRuntimeOwnership(decision)).toBe("owned");
    expect(readEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(decision)).toBe(decision);
    expect(inspectEvidenceLifecycleExecutionReadinessRuntimeOwnership(copied)).toBe("not_owned");
    expect(readEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(copied)).toBeNull();
  });

  it("detects mutation after provenance capture", () => {
    const decision = markEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(blockedDecision());
    const mutable = decision as unknown as Record<string, unknown>;
    mutable.status = "extraction_input_structurally_eligible_execution_denied";

    expect(inspectEvidenceLifecycleExecutionReadinessRuntimeOwnership(decision))
      .toBe("mutated_after_provenance");
  });

  it("rejects hidden-boundary drift even when an object is marked", () => {
    const decision = markEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(blockedDecision());
    const mutable = decision as unknown as Record<string, unknown>;
    mutable.publicPointerExposure = "blocked_precutover";

    expect(inspectEvidenceLifecycleExecutionReadinessRuntimeOwnership(decision))
      .toBe("mutated_after_provenance");
  });
});
