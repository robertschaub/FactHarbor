import { describe, expect, it } from "vitest";

import {
  selectRepairAnchorText,
  shouldRunContractRepairPass,
} from "@/lib/analyzer/claim-extraction-stage";
import type { CBClaimUnderstanding } from "@/lib/analyzer/types";

function makeContractSummary(anchorText: string): NonNullable<CBClaimUnderstanding["contractValidationSummary"]> {
  return {
    ran: true,
    preservesContract: false,
    rePromptRequired: true,
    summary: "anchor missing",
    truthConditionAnchor: {
      presentInInput: true,
      anchorText,
      preservedInClaimIds: [],
      preservedByQuotes: [],
      validPreservedIds: [],
    },
  };
}

describe("selectRepairAnchorText", () => {
  const bundesratSalience: NonNullable<CBClaimUnderstanding["salienceCommitment"]> = {
    ran: true,
    enabled: true,
    mode: "audit",
    success: true,
    anchors: [
      {
        text: "rechtskräftig",
        inputSpan: "rechtskräftig",
        type: "modal_illocutionary",
        rationale: "Legal-binding qualifier",
        truthConditionShiftIfRemoved: "The signature would no longer be described as legally binding.",
      },
      {
        text: "bevor Volk und Parlament darüber entschieden haben",
        inputSpan: "bevor Volk und Parlament darüber entschieden haben",
        type: "temporal",
        rationale: "Temporal ordering matters",
        truthConditionShiftIfRemoved: "The sequence requirement would disappear.",
      },
      {
        text: "Volk und Parlament",
        inputSpan: "Volk und Parlament",
        type: "scope",
        rationale: "Both institutions are named",
        truthConditionShiftIfRemoved: "The scope would narrow.",
      },
    ],
  };

  it("narrows a broad validator anchor to the lone still-missing salience span", () => {
    const claims = [
      {
        statement: "Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben",
      },
    ];

    const repairAnchor = selectRepairAnchorText(
      makeContractSummary("rechtskräftig bevor Volk und Parlament darüber entschieden haben"),
      claims,
      bundesratSalience,
    );

    expect(repairAnchor).toBe("rechtskräftig");
  });

  it("keeps the validator anchor when multiple embedded salience spans are still missing", () => {
    const claims = [
      {
        statement: "Der Bundesrat unterschrieb den EU-Vertrag",
      },
    ];

    const repairAnchor = selectRepairAnchorText(
      makeContractSummary("rechtskräftig bevor Volk und Parlament darüber entschieden haben"),
      claims,
      bundesratSalience,
    );

    expect(repairAnchor).toBe("rechtskräftig bevor Volk und Parlament darüber entschieden haben");
  });

  it("keeps the validator anchor when overlapping salience spans leave multiple narrowed candidates", () => {
    const claims = [
      {
        statement: "Der Bundesrat unterschrieb den EU-Vertrag",
      },
    ];

    const repairAnchor = selectRepairAnchorText(
      makeContractSummary("rechtskräftig bevor Volk und Parlament darüber entschieden haben"),
      claims,
      {
        ...bundesratSalience,
        anchors: [
          bundesratSalience.anchors[0],
          {
            text: "rechtskräftig bevor Volk und Parlament darüber entschieden haben",
            inputSpan: "rechtskräftig bevor Volk und Parlament darüber entschieden haben",
            type: "temporal",
            rationale: "Combined predicate remains salient",
            truthConditionShiftIfRemoved: "The legal-finality and sequence predicate would both disappear.",
          },
          bundesratSalience.anchors[1],
        ],
      },
    );

    expect(repairAnchor).toBe("rechtskräftig bevor Volk und Parlament darüber entschieden haben");
  });

  it("returns the validator anchor unchanged when salience narrowing is unavailable", () => {
    const claims = [
      {
        statement: "Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben",
      },
    ];

    const repairAnchor = selectRepairAnchorText(
      makeContractSummary("rechtskräftig bevor Volk und Parlament darüber entschieden haben"),
      claims,
      {
        ...bundesratSalience,
        success: false,
      },
    );

    expect(repairAnchor).toBe("rechtskräftig bevor Volk und Parlament darüber entschieden haben");
  });

  it("keeps the validator anchor when the lone missing narrowed span is temporal", () => {
    const claims = [
      {
        statement: "Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig",
      },
    ];

    const repairAnchor = selectRepairAnchorText(
      makeContractSummary("rechtskräftig bevor Volk und Parlament darüber entschieden haben"),
      claims,
      bundesratSalience,
    );

    expect(repairAnchor).toBe("rechtskräftig bevor Volk und Parlament darüber entschieden haben");
  });
});

describe("shouldRunContractRepairPass", () => {
  it("skips repair for contract-approved claim sets", () => {
    expect(shouldRunContractRepairPass({
      ...makeContractSummary("rechtskräftig"),
      preservesContract: true,
      rePromptRequired: false,
      summary: "approved",
      truthConditionAnchor: {
        presentInInput: true,
        anchorText: "rechtskräftig",
        preservedInClaimIds: ["AC_01"],
        preservedByQuotes: ["rechtskräftig"],
        validPreservedIds: ["AC_01"],
      },
    })).toBe(false);
  });

  it("keeps repair enabled for unapproved claim sets", () => {
    expect(shouldRunContractRepairPass(makeContractSummary("rechtskräftig"))).toBe(true);
  });
});
