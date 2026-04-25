import { describe, expect, it } from "vitest";

import {
  buildMultiEventRepromptGuidance,
  shouldRunMultiEventReprompt,
} from "@/lib/analyzer/claim-extraction-stage";
import type { CBClaimUnderstanding } from "@/lib/analyzer/types";

function makeContractSummary(
  overrides: Partial<NonNullable<CBClaimUnderstanding["contractValidationSummary"]>> = {},
): NonNullable<CBClaimUnderstanding["contractValidationSummary"]> {
  return {
    ran: true,
    preservesContract: true,
    rePromptRequired: false,
    summary: "validated",
    ...overrides,
  };
}

function makeSalienceCommitment(
  overrides: Partial<NonNullable<CBClaimUnderstanding["salienceCommitment"]>> = {},
): NonNullable<CBClaimUnderstanding["salienceCommitment"]> {
  return {
    ran: true,
    enabled: true,
    mode: "audit",
    success: true,
    anchors: [
      {
        text: "rechtskräftig",
        inputSpan: "rechtskräftig",
        type: "modal_illocutionary",
        rationale: "truth-condition-bearing modifier",
        truthConditionShiftIfRemoved: "Removing this changes the proposition.",
      },
    ],
    ...overrides,
  };
}

describe("shouldRunMultiEventReprompt", () => {
  it("keeps the contract-approved skip when no trustworthy salience inventory is available", () => {
    expect(
      shouldRunMultiEventReprompt(
        4,
        1,
        2,
        makeContractSummary(),
        makeSalienceCommitment({ success: false, anchors: [] }),
      ),
    ).toBe(false);
  });

  it("reopens MT-5(C) for contract-approved single-claim sets when salience anchors are available", () => {
    expect(
      shouldRunMultiEventReprompt(
        4,
        1,
        2,
        makeContractSummary(),
        makeSalienceCommitment(),
      ),
    ).toBe(true);
  });

  it("still runs for non-contract-approved sets without requiring salience success", () => {
    expect(
      shouldRunMultiEventReprompt(
        3,
        1,
        2,
        makeContractSummary({ preservesContract: false, rePromptRequired: true }),
        undefined,
      ),
    ).toBe(true);
  });

  it("does not run when the structural trigger conditions are absent", () => {
    expect(
      shouldRunMultiEventReprompt(1, 1, 2, makeContractSummary(), makeSalienceCommitment()),
    ).toBe(false);
    expect(
      shouldRunMultiEventReprompt(4, 2, 2, makeContractSummary(), makeSalienceCommitment()),
    ).toBe(false);
    expect(
      shouldRunMultiEventReprompt(4, 1, 0, makeContractSummary(), makeSalienceCommitment()),
    ).toBe(false);
  });
});

describe("buildMultiEventRepromptGuidance", () => {
  it("uses input-only recovery guidance for contract-approved MT-5(C) retries", () => {
    const guidance = buildMultiEventRepromptGuidance({
      distinctEventCount: 3,
      distinctEvents: [
        {
          name: "Evidence-derived event title",
          date: "2030",
          description: "Evidence-only detail",
        },
      ],
      salienceCommitment: makeSalienceCommitment({
        anchors: [
          {
            text: "priority modifier",
            inputSpan: "priority modifier",
            type: "modal_illocutionary",
            rationale: "truth-condition-bearing modifier",
            truthConditionShiftIfRemoved: "The proposition changes.",
          },
        ],
      }),
      inputOnly: true,
    });

    expect(guidance).toContain("rederive branch labels from the original input");
    expect(guidance).toContain("Precommitted salience anchors");
    expect(guidance).toContain("priority modifier");
    expect(guidance).not.toContain("Evidence-derived event title");
    expect(guidance).not.toContain("2030");
  });

  it("keeps the distinct-events inventory for ordinary non-approved retries", () => {
    const guidance = buildMultiEventRepromptGuidance({
      distinctEventCount: 2,
      distinctEvents: [
        {
          name: "First branch",
          date: "",
          description: "Input branch",
        },
      ],
      inputOnly: false,
    });

    expect(guidance).toContain("Input-derived distinct-events inventory");
    expect(guidance).toContain("First branch");
    expect(guidance).toContain("Verify every entry against the original input");
  });
});
