import { describe, expect, it } from "vitest";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";

describe("analyzer-v2 run context", () => {
  it("uses ACS resolved input and detected language without adding shell-only claim ids", () => {
    const context = buildClaimBoundaryV2RunContext(
      {
        runIdHint: "job-context",
        submitted: {
          kind: "text",
          value: "Submitted text",
        },
        preparedSeed: {
          acsSnapshot: {
            resolvedInputText: "Prepared resolved text",
            preparedUnderstanding: {
              detectedLanguage: "de",
            },
          },
        },
        selectedAtomicClaimIds: ["AC_V2_SHELL_01", "AC_SELECTED_01"],
      },
      {
        now: () => new Date("2026-05-14T01:02:03.000Z"),
      },
    );

    expect(context.resolvedInputText).toBe("Prepared resolved text");
    expect(context.detectedLanguage).toBe("de");
    expect(context.selectedAtomicClaimIds).toEqual(["AC_SELECTED_01"]);
  });
});
