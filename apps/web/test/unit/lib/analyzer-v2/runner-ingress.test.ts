import { describe, expect, it, vi } from "vitest";
import { normalizeClaimBoundaryV2IngressFromRunner } from "@/lib/analyzer-v2/runner-ingress";

describe("analyzer-v2 runner ingress", () => {
  it("carries the full ACS prepared snapshot through the one-way runner adapter without deriving V2 hashes", async () => {
    const preparedStage1 = {
      version: 1,
      resolvedInputText: "Prepared resolved text",
      preparedUnderstanding: {
        detectedInputType: "text",
        detectedLanguage: "de",
        atomicClaims: [
          {
            id: "AC_01",
            statement: "Prepared selected statement",
          },
        ],
        gate1Stats: {
          overallPass: true,
        },
      },
      preparationProvenance: {
        resolvedInputSha256: "acs-snapshot-hash",
      },
    };
    const onEvent = vi.fn();

    const ingress = normalizeClaimBoundaryV2IngressFromRunner({
      jobId: "job-acs",
      inputType: "text",
      inputValue: "Submitted text",
      preparedStage1,
      selectedClaimIds: ["AC_01"],
      onEvent,
    });

    expect(ingress.preparedSeed).toEqual({
      acsSnapshot: preparedStage1,
    });
    expect(ingress.selectedAtomicClaimIds).toEqual(["AC_01"]);

    await ingress.emitProgress?.({ message: "progress", progress: 12 });
    expect(onEvent).toHaveBeenCalledWith("progress", 12);
  });

  it("rejects shell-only placeholder selected IDs before normalization can hide them", () => {
    expect(() =>
      normalizeClaimBoundaryV2IngressFromRunner({
        inputType: "text",
        inputValue: "Submitted text",
        selectedClaimIds: [" AC_V2_SHELL_01 "],
      })
    ).toThrow("shell-only placeholder selected claim IDs");
  });
});
