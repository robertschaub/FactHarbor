import { describe, expect, it } from "vitest";

import { buildEvidenceLifecycleExecutionReadinessDenial } from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial";
import type { PipelineRunContext } from "@/lib/analyzer-v2/run-context";
import {
  readEvidenceLifecycleExecutionReadinessRuntimeArtifactDefaultProjections,
  readEvidenceLifecycleExecutionReadinessRuntimeArtifacts,
  recordEvidenceLifecycleExecutionReadinessRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-artifact-sink";
import { markEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-provenance";

function context(ledgerId: string): PipelineRunContext {
  return {
    runId: `RUN_${ledgerId}`,
    inputType: "direct_text",
    inputValue: "Using hydrogen for cars is more efficient than using electricity",
    resolvedInputText: "Using hydrogen for cars is more efficient than using electricity",
    detectedLanguage: "en",
    selectedAtomicClaimIds: [],
    generatedUtc: "2026-05-19T12:00:00.000Z",
    currentDate: "2026-05-19",
    configSnapshot: { source: "test", hash: "CONFIG_HASH" },
    promptProfile: { source: "test", hash: "PROMPT_HASH" },
    modelPolicy: { source: "test", hash: "MODEL_POLICY_HASH" },
    observabilityLedger: {
      id: ledgerId,
      ledgerId,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    },
  } as PipelineRunContext;
}

function decision() {
  return markEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(
    buildEvidenceLifecycleExecutionReadinessDenial({
      extractionInputAuthorization: null,
      extractionInputRuntimeOwnership: "not_owned",
    }),
  );
}

describe("evidence lifecycle execution-readiness artifact sink", () => {
  it("records bounded runtime-owned artifacts by ledger id", () => {
    const ledgerId = `ledger-w4i-${Date.now()}`;
    const artifact = recordEvidenceLifecycleExecutionReadinessRuntimeArtifact({
      context: context(ledgerId),
      executionReadinessDenial: decision(),
    });

    expect(artifact).not.toBeNull();
    expect(readEvidenceLifecycleExecutionReadinessRuntimeArtifacts(ledgerId)).toHaveLength(1);
    expect(artifact?.inputTextReturned).toBe(false);
    expect(artifact?.defaultProjection).toBe("hash_length_provenance_only");
  });

  it("default projections remain hash/length/provenance-only and never add text fields", () => {
    const ledgerId = `ledger-w4i-redacted-${Date.now()}`;
    recordEvidenceLifecycleExecutionReadinessRuntimeArtifact({
      context: context(ledgerId),
      executionReadinessDenial: decision(),
    });
    const projections =
      readEvidenceLifecycleExecutionReadinessRuntimeArtifactDefaultProjections(ledgerId);
    const serialized = JSON.stringify(projections);

    expect(projections).toHaveLength(1);
    expect(serialized).not.toContain('"inputText":');
    expect(serialized).not.toContain("Using hydrogen");
    expect(projections[0]?.inputTextReturned).toBe(false);
  });

  it("rejects invalid ledger ids and unowned decisions", () => {
    const unowned = buildEvidenceLifecycleExecutionReadinessDenial({
      extractionInputAuthorization: null,
      extractionInputRuntimeOwnership: "not_owned",
    });

    expect(recordEvidenceLifecycleExecutionReadinessRuntimeArtifact({
      context: context("../bad"),
      executionReadinessDenial: decision(),
    })).toBeNull();
    expect(recordEvidenceLifecycleExecutionReadinessRuntimeArtifact({
      context: context(`ledger-w4i-unowned-${Date.now()}`),
      executionReadinessDenial: unowned,
    })).toBeNull();
  });
});
