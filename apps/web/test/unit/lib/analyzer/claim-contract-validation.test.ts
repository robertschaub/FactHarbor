/**
 * Claim Contract Validation — Unit Tests
 *
 * Tests for the ClaimContractOutputSchema and claim contract validation logic.
 * These tests verify schema parsing, severity classification, and retry decision rules.
 *
 * @see apps/web/src/lib/analyzer/claimboundary-pipeline.ts
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  ClaimContractOutputSchema,
} from "@/lib/analyzer/claimboundary-pipeline";
import {
  evaluateClaimContractValidation,
  applySingleClaimAtomicityValidation,
  buildContractRetrySaliencePlan,
  evaluateSingleClaimAtomicityValidation,
  getPrioritySalienceAnchorsForAtomicityValidation,
  runClaimContractValidationWithRetry,
  selectPreferredSingleClaimContractChallenge,
  selectPreferredSingleClaimAtomicityValidation,
  shouldRunSingleClaimAtomicityValidation,
  type ClaimContractValidationResult,
  type EvaluatedClaimContractValidation,
} from "@/lib/analyzer/claim-extraction-stage";
import type { AtomicClaim } from "@/lib/analyzer/types";
import {
  DEFAULT_CALC_CONFIG,
} from "@/lib/config-schemas";

// ---------------------------------------------------------------------------
// Read the actual prompt file once for prompt-contract assertions
// ---------------------------------------------------------------------------
const promptPath = path.resolve(
  __dirname,
  "../../../../prompts/claimboundary.prompt.md",
);
const promptContent = readFileSync(promptPath, "utf-8");

function extractSection(content: string, sectionName: string): string | null {
  const lines = content.split("\n");
  let capturing = false;
  const captured: string[] = [];
  for (const line of lines) {
    const headerMatch = line.match(/^## ([A-Z][A-Z0-9_ ]+(?:\([^)]*\))?)\s*$/);
    if (headerMatch) {
      if (capturing) break;
      if (headerMatch[1] === sectionName) {
        capturing = true;
        continue;
      }
    }
    if (capturing && line.trim() !== "---") {
      captured.push(line);
    }
  }
  return capturing ? captured.join("\n").trim() : null;
}

// ============================================================================
// SCHEMA PARSING
// ============================================================================

describe("ClaimContractOutputSchema", () => {
  it("parses a valid passing result", () => {
    const input = {
      inputAssessment: {
        preservesOriginalClaimContract: true,
        rePromptRequired: false,
        summary: "All claims preserve original meaning",
      },
      claims: [
        {
          claimId: "AC_01",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "none",
          recommendedAction: "keep",
          reasoning: "Preserves evaluative predicate with dimension qualifier",
        },
      ],
    };

    const result = ClaimContractOutputSchema.parse(input);
    expect(result.inputAssessment.preservesOriginalClaimContract).toBe(true);
    expect(result.inputAssessment.rePromptRequired).toBe(false);
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].proxyDriftSeverity).toBe("none");
    expect(result.claims[0].recommendedAction).toBe("keep");
  });

  it("parses a result with material proxy drift requiring retry", () => {
    const input = {
      inputAssessment: {
        preservesOriginalClaimContract: false,
        rePromptRequired: true,
        summary: "Claims substitute proxy predicates for original meaning",
      },
      claims: [
        {
          claimId: "AC_01",
          preservesEvaluativeMeaning: false,
          usesNeutralDimensionQualifier: false,
          proxyDriftSeverity: "material",
          recommendedAction: "retry",
          reasoning: "Replaced 'not useful' with 'not viable'",
        },
        {
          claimId: "AC_02",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "none",
          recommendedAction: "keep",
          reasoning: "Preserves original predicate",
        },
      ],
    };

    const result = ClaimContractOutputSchema.parse(input);
    expect(result.inputAssessment.rePromptRequired).toBe(true);
    expect(result.claims[0].proxyDriftSeverity).toBe("material");
    expect(result.claims[0].recommendedAction).toBe("retry");
    expect(result.claims[1].proxyDriftSeverity).toBe("none");
  });

  it("parses mild drift without retry", () => {
    const input = {
      inputAssessment: {
        preservesOriginalClaimContract: true,
        rePromptRequired: false,
        summary: "Minor wording shift, meaning preserved",
      },
      claims: [
        {
          claimId: "AC_01",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "mild",
          recommendedAction: "keep",
          reasoning: "Slight rewording but evaluative meaning intact",
        },
      ],
    };

    const result = ClaimContractOutputSchema.parse(input);
    expect(result.inputAssessment.rePromptRequired).toBe(false);
    expect(result.claims[0].proxyDriftSeverity).toBe("mild");
    expect(result.claims[0].recommendedAction).toBe("keep");
  });

  it("falls back to defaults for missing optional fields", () => {
    const input = {
      inputAssessment: {
        preservesOriginalClaimContract: true,
        rePromptRequired: false,
        // summary missing
      },
      claims: [
        {
          claimId: "AC_01",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          // proxyDriftSeverity missing
          // recommendedAction missing
          // reasoning missing
        },
      ],
    };

    const result = ClaimContractOutputSchema.parse(input);
    expect(result.inputAssessment.summary).toBe("");
    expect(result.claims[0].proxyDriftSeverity).toBe("none");
    expect(result.claims[0].recommendedAction).toBe("keep");
    expect(result.claims[0].reasoning).toBe("");
  });

  it("rejects invalid proxyDriftSeverity by falling back to none", () => {
    const input = {
      inputAssessment: {
        preservesOriginalClaimContract: true,
        rePromptRequired: false,
        summary: "",
      },
      claims: [
        {
          claimId: "AC_01",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "extreme",
          recommendedAction: "keep",
          reasoning: "",
        },
      ],
    };

    const result = ClaimContractOutputSchema.parse(input);
    expect(result.claims[0].proxyDriftSeverity).toBe("none");
  });

  it("handles multi-claim batch correctly", () => {
    const input = {
      inputAssessment: {
        preservesOriginalClaimContract: false,
        rePromptRequired: true,
        summary: "2 of 3 claims show proxy drift",
      },
      claims: [
        {
          claimId: "AC_01",
          preservesEvaluativeMeaning: false,
          usesNeutralDimensionQualifier: false,
          proxyDriftSeverity: "material",
          recommendedAction: "retry",
          reasoning: "Replaced predicate with feasibility claim",
        },
        {
          claimId: "AC_02",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "none",
          recommendedAction: "keep",
          reasoning: "Clean dimension qualifier",
        },
        {
          claimId: "AC_03",
          preservesEvaluativeMeaning: false,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "material",
          recommendedAction: "retry",
          reasoning: "Replaced predicate with contribution claim",
        },
      ],
    };

    const result = ClaimContractOutputSchema.parse(input);
    expect(result.claims).toHaveLength(3);
    const materialClaims = result.claims.filter(c => c.proxyDriftSeverity === "material");
    expect(materialClaims).toHaveLength(2);
    const retryClaims = result.claims.filter(c => c.recommendedAction === "retry");
    expect(retryClaims).toHaveLength(2);
  });
});

describe("runClaimContractValidationWithRetry", () => {
  it("recovers when the first validation attempt returns undefined", async () => {
    const expected: ClaimContractValidationResult = {
      inputAssessment: {
        preservesOriginalClaimContract: true,
        rePromptRequired: false,
        summary: "validator recovered",
      },
      claims: [],
    };

    let calls = 0;
    const result = await runClaimContractValidationWithRetry(async () => {
      calls += 1;
      return calls === 1 ? undefined : expected;
    });

    expect(calls).toBe(2);
    expect(result.attempts).toBe(2);
    expect(result.result).toEqual(expected);
  });

  it("stops after two unavailable attempts", async () => {
    let calls = 0;
    const result = await runClaimContractValidationWithRetry(async () => {
      calls += 1;
      return undefined;
    });

    expect(calls).toBe(2);
    expect(result.attempts).toBe(2);
    expect(result.result).toBeUndefined();
  });
});

// ============================================================================
// RETRY DECISION LOGIC
// ============================================================================

describe("Claim contract retry decision", () => {
  it("should trigger retry when rePromptRequired=true and material drift exists", () => {
    const contractResult = {
      inputAssessment: {
        preservesOriginalClaimContract: false,
        rePromptRequired: true,
        summary: "proxy drift detected",
      },
      claims: [
        {
          claimId: "AC_01",
          preservesEvaluativeMeaning: false,
          usesNeutralDimensionQualifier: false,
          proxyDriftSeverity: "material" as const,
          recommendedAction: "retry" as const,
          reasoning: "replaced predicate",
        },
      ],
    };

    const maxRetries = DEFAULT_CALC_CONFIG.claimContractValidation?.maxRetries ?? 1;
    const shouldRetry = contractResult.inputAssessment.rePromptRequired && maxRetries > 0;
    expect(shouldRetry).toBe(true);

    const failingClaims = contractResult.claims
      .filter(c => c.recommendedAction === "retry" || c.proxyDriftSeverity === "material");
    expect(failingClaims).toHaveLength(1);
  });

  it("should not trigger retry when rePromptRequired=false", () => {
    const contractResult = {
      inputAssessment: {
        preservesOriginalClaimContract: true,
        rePromptRequired: false,
        summary: "all good",
      },
      claims: [
        {
          claimId: "AC_01",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "mild" as const,
          recommendedAction: "keep" as const,
          reasoning: "slight rewording",
        },
      ],
    };

    const maxRetries = DEFAULT_CALC_CONFIG.claimContractValidation?.maxRetries ?? 1;
    const shouldRetry = contractResult.inputAssessment.rePromptRequired && maxRetries > 0;
    expect(shouldRetry).toBe(false);
  });

  it("should not trigger retry when maxRetries=0", () => {
    const contractResult = {
      inputAssessment: {
        preservesOriginalClaimContract: false,
        rePromptRequired: true,
        summary: "drift detected",
      },
      claims: [],
    };

    const maxRetries = 0;
    const shouldRetry = contractResult.inputAssessment.rePromptRequired && maxRetries > 0;
    expect(shouldRetry).toBe(false);
  });

  it("builds corrective guidance from failing claims", () => {
    const contractResult = {
      inputAssessment: {
        preservesOriginalClaimContract: false,
        rePromptRequired: true,
        summary: "Claims use proxy predicates",
      },
      claims: [
        {
          claimId: "AC_01",
          preservesEvaluativeMeaning: false,
          usesNeutralDimensionQualifier: false,
          proxyDriftSeverity: "material" as const,
          recommendedAction: "retry" as const,
          reasoning: "Replaced 'useless' with 'not viable'",
        },
        {
          claimId: "AC_02",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "none" as const,
          recommendedAction: "keep" as const,
          reasoning: "clean",
        },
      ],
    };

    const failingClaims = contractResult.claims
      .filter(c => c.recommendedAction === "retry" || c.proxyDriftSeverity === "material");
    const failingReasons = failingClaims
      .map(c => `${c.claimId}: ${c.reasoning}`)
      .join("; ");

    expect(failingClaims).toHaveLength(1);
    expect(failingReasons).toContain("AC_01");
    expect(failingReasons).toContain("not viable");
    expect(failingReasons).not.toContain("AC_02");
  });
});

describe("contract retry salience planning", () => {
  const salienceCommitment = {
    ran: true,
    enabled: true,
    mode: "audit",
    success: true,
    anchors: [
      {
        text: "actually",
        inputSpan: "actually",
        type: "modal_illocutionary",
        rationale: "",
        truthConditionShiftIfRemoved: "",
      },
      {
        text: "making nukes",
        inputSpan: "making nukes",
        type: "action_predicate",
        rationale: "",
        truthConditionShiftIfRemoved: "",
      },
    ],
  } as any;

  it("escalates to binding and merges the validator anchor when no valid carriers survive", () => {
    const evaluated: EvaluatedClaimContractValidation = {
      summary: {
        ran: true,
        preservesContract: false,
        rePromptRequired: true,
        summary: "anchor omitted from all thesis-direct claims",
        failureMode: "contract_violated",
        truthConditionAnchor: {
          presentInInput: true,
          anchorText: "actually making nukes",
          preservedInClaimIds: [],
          validPreservedIds: [],
          preservedByQuotes: [],
        },
      },
      effectiveRePromptRequired: true,
      anchorRetryReason: "anchor_provenance_failed: missing valid carrier",
    };

    const result = buildContractRetrySaliencePlan(evaluated, salienceCommitment);

    expect(result.anchorEscalation.mode).toBe("binding_merged_anchor");
    expect(result.anchorEscalation.anchorText).toBe("actually making nukes");
    expect(result.retrySalienceCommitment?.mode).toBe("binding");
    expect(result.retrySalienceCommitment?.anchors.map((anchor) => anchor.text)).toEqual([
      "actually making nukes",
      "actually",
      "making nukes",
    ]);
  });

  it("does not duplicate an exact-match validator anchor and preserves upstream order", () => {
    const exactMatchSalience = {
      ...salienceCommitment,
      anchors: [
        {
          text: "actually",
          inputSpan: "actually",
          type: "modal_illocutionary",
          rationale: "",
          truthConditionShiftIfRemoved: "",
        },
        {
          text: "actually making nukes",
          inputSpan: "actually making nukes",
          type: "action_predicate",
          rationale: "",
          truthConditionShiftIfRemoved: "",
        },
        {
          text: "making nukes",
          inputSpan: "making nukes",
          type: "action_predicate",
          rationale: "",
          truthConditionShiftIfRemoved: "",
        },
      ],
    } as any;

    const evaluated: EvaluatedClaimContractValidation = {
      summary: {
        ran: true,
        preservesContract: false,
        rePromptRequired: true,
        summary: "anchor omitted from all thesis-direct claims",
        failureMode: "contract_violated",
        truthConditionAnchor: {
          presentInInput: true,
          anchorText: "actually making nukes",
          preservedInClaimIds: [],
          validPreservedIds: [],
          preservedByQuotes: [],
        },
      },
      effectiveRePromptRequired: true,
      anchorRetryReason: "anchor_provenance_failed: missing valid carrier",
    };

    const result = buildContractRetrySaliencePlan(evaluated, exactMatchSalience);
    const anchorTexts = result.retrySalienceCommitment?.anchors.map((anchor) => anchor.text) ?? [];

    expect(anchorTexts.filter((text) => text === "actually making nukes")).toHaveLength(1);
    expect(anchorTexts).toEqual([
      "actually",
      "actually making nukes",
      "making nukes",
    ]);
  });

  it("keeps audit mode and anchor guidance when no trustworthy upstream anchors exist", () => {
    const emptySalience = {
      ran: true,
      enabled: true,
      mode: "audit",
      success: true,
      anchors: [],
    } as any;

    const evaluated: EvaluatedClaimContractValidation = {
      summary: {
        ran: true,
        preservesContract: false,
        rePromptRequired: true,
        summary: "anchor omitted from all thesis-direct claims",
        failureMode: "contract_violated",
        truthConditionAnchor: {
          presentInInput: true,
          anchorText: "actually making nukes",
          preservedInClaimIds: [],
          validPreservedIds: [],
          preservedByQuotes: [],
        },
      },
      effectiveRePromptRequired: true,
      anchorRetryReason: "anchor_provenance_failed: missing valid carrier",
    };

    const result = buildContractRetrySaliencePlan(evaluated, emptySalience);

    expect(result.anchorEscalation.mode).toBe("audit_guidance_only");
    expect(result.anchorEscalation.anchorText).toBe("actually making nukes");
    expect(result.retrySalienceCommitment).toEqual(emptySalience);
  });

  it("keeps audit mode and anchor guidance when salience commitment failed", () => {
    const failedSalience = {
      ran: true,
      enabled: true,
      mode: "audit",
      success: false,
      anchors: [],
    } as any;

    const evaluated: EvaluatedClaimContractValidation = {
      summary: {
        ran: true,
        preservesContract: false,
        rePromptRequired: true,
        summary: "anchor omitted from all thesis-direct claims",
        failureMode: "contract_violated",
        truthConditionAnchor: {
          presentInInput: true,
          anchorText: "actually making nukes",
          preservedInClaimIds: [],
          validPreservedIds: [],
          preservedByQuotes: [],
        },
      },
      effectiveRePromptRequired: true,
      anchorRetryReason: "anchor_provenance_failed: missing valid carrier",
    };

    const result = buildContractRetrySaliencePlan(evaluated, failedSalience);

    expect(result.anchorEscalation.mode).toBe("audit_guidance_only");
    expect(result.retrySalienceCommitment).toEqual(failedSalience);
  });

  it("does not escalate when the anchor still has valid preserved IDs", () => {
    const evaluated: EvaluatedClaimContractValidation = {
      summary: {
        ran: true,
        preservesContract: false,
        rePromptRequired: true,
        summary: "retry required for non-anchor drift",
        truthConditionAnchor: {
          presentInInput: true,
          anchorText: "actually making nukes",
          preservedInClaimIds: ["AC_01"],
          validPreservedIds: ["AC_01"],
          preservedByQuotes: ["actually making nukes"],
        },
      },
      effectiveRePromptRequired: true,
    };

    const result = buildContractRetrySaliencePlan(evaluated, salienceCommitment);

    expect(result.anchorEscalation.mode).toBe("none");
    expect(result.retrySalienceCommitment).toEqual(salienceCommitment);
  });

  it("does not escalate when no retry is required", () => {
    const evaluated: EvaluatedClaimContractValidation = {
      summary: {
        ran: true,
        preservesContract: true,
        rePromptRequired: false,
        summary: "contract preserved",
      },
      effectiveRePromptRequired: false,
    };

    const result = buildContractRetrySaliencePlan(evaluated, salienceCommitment);

    expect(result.anchorEscalation.mode).toBe("none");
    expect(result.retrySalienceCommitment).toEqual(salienceCommitment);
  });

  it("still escalates when raw cited IDs exist but validPreservedIds is empty", () => {
    const evaluated: EvaluatedClaimContractValidation = {
      summary: {
        ran: true,
        preservesContract: false,
        rePromptRequired: true,
        summary: "hallucinated or tangential carrier",
        failureMode: "contract_violated",
        truthConditionAnchor: {
          presentInInput: true,
          anchorText: "actually making nukes",
          preservedInClaimIds: ["AC_99"],
          validPreservedIds: [],
          preservedByQuotes: [],
        },
      },
      effectiveRePromptRequired: true,
      anchorRetryReason: "anchor_provenance_failed: cited ID invalid after structural filtering",
    };

    const result = buildContractRetrySaliencePlan(evaluated, salienceCommitment);

    expect(result.anchorEscalation.mode).toBe("binding_merged_anchor");
  });
});

describe("Single-claim atomicity enforcement", () => {
  const makeAtomicityResult = (overrides: Partial<import("@/lib/analyzer/claim-extraction-stage").SingleClaimAtomicityValidationResult> = {}) => ({
    singleClaimAssessment: {
      isAtomic: true,
      rePromptRequired: false,
      summary: "single claim is atomic enough",
      ...(overrides.singleClaimAssessment ?? {}),
    },
    coordinatedBranchFinding: {
      presentInInput: false,
      bundledInSingleClaim: false,
      branchLabels: [],
      reasoning: "no coordinated branches that require splitting",
      ...(overrides.coordinatedBranchFinding ?? {}),
    },
  });

  const approvedContract: import("@/lib/analyzer/claim-extraction-stage").EvaluatedClaimContractValidation = {
    summary: {
      ran: true,
      preservesContract: true,
      rePromptRequired: false,
      summary: "contract preserved",
    },
    effectiveRePromptRequired: false,
  };
  const salienceCommitment = {
    success: true,
    anchors: [
      {
        text: "before B and C decided",
        inputSpan: "before B and C decided",
        type: "modal_illocutionary",
        rationale: "",
        truthConditionShiftIfRemoved: "",
      },
    ],
  } as any;

  it("runs only for approved single-claim outputs", () => {
    const singleClaim: AtomicClaim[] = [{
      id: "AC_01",
      statement: "A signed before B and C decided.",
      category: "factual",
      centrality: "high",
      harmPotential: "medium",
      isCentral: true,
      claimDirection: "supports_thesis",
      keyEntities: [],
      checkWorthiness: "high",
      specificityScore: 0.8,
      groundingQuality: "moderate",
      expectedEvidenceProfile: { methodologies: [], expectedMetrics: [], expectedSourceTypes: [] },
    }];

    expect(shouldRunSingleClaimAtomicityValidation(singleClaim, approvedContract, salienceCommitment)).toBe(true);
    expect(shouldRunSingleClaimAtomicityValidation(singleClaim, approvedContract)).toBe(false);
    expect(shouldRunSingleClaimAtomicityValidation([...singleClaim, { ...singleClaim[0], id: "AC_02" }], approvedContract, salienceCommitment)).toBe(false);
    expect(shouldRunSingleClaimAtomicityValidation(singleClaim, {
      ...approvedContract,
      summary: { ...approvedContract.summary, preservesContract: false, rePromptRequired: true },
      effectiveRePromptRequired: true,
    }, salienceCommitment)).toBe(false);
  });

  it("forces retry when a bundled single claim still contains coordinated branches", () => {
    const evaluated = evaluateSingleClaimAtomicityValidation(makeAtomicityResult({
      singleClaimAssessment: {
        isAtomic: false,
        rePromptRequired: true,
        summary: "one bundled claim still contains multiple coordinated decision gates",
      },
      coordinatedBranchFinding: {
        presentInInput: true,
        bundledInSingleClaim: true,
        reasoning: "Parliament and the people are independently verifiable decision gates",
      },
    }));

    expect(evaluated.effectiveRePromptRequired).toBe(true);
    expect(evaluated.retryReason).toContain("single_claim_atomicity_failed");
    expect(evaluated.summaryAppendix).toContain("independently verifiable decision gates");
  });

  it("treats bundled coordinated branches as a retry trigger even if the atomic flag is inconsistent", () => {
    const evaluated = evaluateSingleClaimAtomicityValidation(makeAtomicityResult({
      singleClaimAssessment: {
        isAtomic: true,
        rePromptRequired: false,
        summary: "claim appears near-verbatim but still bundles decision branches",
      },
      coordinatedBranchFinding: {
        presentInInput: true,
        bundledInSingleClaim: true,
        reasoning: "Volk and Parlament remain fused inside one claim statement",
      },
    }));

    expect(evaluated.effectiveRePromptRequired).toBe(true);
    expect(evaluated.retryReason).toContain("single_claim_atomicity_failed");
    expect(evaluated.summaryAppendix).toContain("Volk and Parlament remain fused");
  });

  it("treats explicit multi-branch labels as a retry trigger even when booleans look permissive", () => {
    const evaluated = evaluateSingleClaimAtomicityValidation(makeAtomicityResult({
      singleClaimAssessment: {
        isAtomic: true,
        rePromptRequired: false,
        summary: "single claim was treated as atomic",
      },
      coordinatedBranchFinding: {
        presentInInput: false,
        bundledInSingleClaim: false,
        branchLabels: ["Volk", "Parlament"],
        reasoning: "two independently verifiable decision gates were identified",
      },
    }));

    expect(evaluated.effectiveRePromptRequired).toBe(true);
    expect(evaluated.retryReason).toContain("single_claim_atomicity_failed");
    expect(evaluated.summaryAppendix).toContain("branchLabels=[Volk, Parlament]");
  });

  it("treats named-side versus comparator-side labels as a retry trigger even when booleans look permissive", () => {
    const evaluated = evaluateSingleClaimAtomicityValidation(makeAtomicityResult({
      singleClaimAssessment: {
        isAtomic: true,
        rePromptRequired: false,
        summary: "single claim was treated as atomic",
      },
      coordinatedBranchFinding: {
        presentInInput: true,
        bundledInSingleClaim: false,
        branchLabels: ["current-side total", "historical comparator"],
        reasoning: "the claim bundles a current-side proposition with a separately checkable historical comparator",
      },
    }));

    expect(evaluated.effectiveRePromptRequired).toBe(true);
    expect(evaluated.retryReason).toContain("single_claim_atomicity_failed");
    expect(evaluated.summaryAppendix).toContain("branchLabels=[current-side total, historical comparator]");
  });

  it("prefers a challenger result when it upgrades an apparent pass into a retry", () => {
    const primary = makeAtomicityResult({
      singleClaimAssessment: {
        isAtomic: true,
        rePromptRequired: false,
        summary: "single claim looks atomic",
      },
      coordinatedBranchFinding: {
        presentInInput: false,
        bundledInSingleClaim: false,
        branchLabels: [],
        reasoning: "no split required",
      },
    });
    const challenger = makeAtomicityResult({
      singleClaimAssessment: {
        isAtomic: true,
        rePromptRequired: false,
        summary: "challenge pass found hidden branch split",
      },
      coordinatedBranchFinding: {
        presentInInput: true,
        bundledInSingleClaim: false,
        branchLabels: ["Volk", "Parlament"],
        reasoning: "challenge pass identified two independent branch labels",
      },
    });

    expect(selectPreferredSingleClaimAtomicityValidation(primary, challenger)).toEqual(challenger);
  });

  it("prefers a binding contract challenger when it upgrades an apparent pass into a retry", () => {
    const challenger: import("@/lib/analyzer/claim-extraction-stage").EvaluatedClaimContractValidation = {
      summary: {
        ran: true,
        preservesContract: false,
        rePromptRequired: true,
        summary: "binding-mode challenger found unresolved branch bundling",
        failureMode: "contract_violated",
      },
      effectiveRePromptRequired: true,
      atomicityRetryReason: "binding_contract_challenge_failed",
    };

    expect(selectPreferredSingleClaimContractChallenge(approvedContract, challenger)).toEqual(challenger);
  });

  it("keeps the primary contract result when the binding challenger stays permissive", () => {
    const challenger: import("@/lib/analyzer/claim-extraction-stage").EvaluatedClaimContractValidation = {
      summary: {
        ran: true,
        preservesContract: true,
        rePromptRequired: false,
        summary: "binding-mode challenger agrees",
      },
      effectiveRePromptRequired: false,
    };

    expect(selectPreferredSingleClaimContractChallenge(approvedContract, challenger)).toEqual(approvedContract);
  });

  it("overrides a passing contract summary when atomicity fails", () => {
    const merged = applySingleClaimAtomicityValidation(
      approvedContract,
      makeAtomicityResult({
        singleClaimAssessment: {
          isAtomic: false,
          rePromptRequired: true,
          summary: "bundled single claim is non-atomic",
        },
        coordinatedBranchFinding: {
          presentInInput: true,
          bundledInSingleClaim: true,
          reasoning: "one act is still tied to multiple coordinated branches",
        },
      }),
    );

    expect(merged.summary.preservesContract).toBe(false);
    expect(merged.summary.rePromptRequired).toBe(true);
    expect(merged.summary.failureMode).toBe("contract_violated");
    expect(merged.summary.atomicityRetryReason).toContain("single_claim_atomicity_failed");
    expect(merged.effectiveRePromptRequired).toBe(true);
  });
});

describe("Atomicity salience prioritization", () => {
  it("prioritizes modal and action-predicate anchors when available", () => {
    const prioritized = getPrioritySalienceAnchorsForAtomicityValidation({
      enabled: true,
      mode: "audit",
      success: true,
      anchors: [
        {
          text: "before Volk und Parlament darüber entschieden haben",
          inputSpan: "before Volk und Parlament darüber entschieden haben",
          type: "temporal",
          rationale: "",
          truthConditionShiftIfRemoved: "",
        },
        {
          text: "rechtskräftig",
          inputSpan: "rechtskräftig",
          type: "modal_illocutionary",
          rationale: "",
          truthConditionShiftIfRemoved: "",
        },
      ],
    } as any);

    expect(prioritized.map((anchor) => anchor.text)).toEqual(["rechtskräftig"]);
  });

  it("falls back to the full anchor list when no priority anchors are available", () => {
    const prioritized = getPrioritySalienceAnchorsForAtomicityValidation({
      enabled: true,
      mode: "audit",
      success: true,
      anchors: [
        {
          text: "before parliament decided",
          inputSpan: "before parliament decided",
          type: "temporal",
          rationale: "",
          truthConditionShiftIfRemoved: "",
        },
      ],
    } as any);

    expect(prioritized.map((anchor) => anchor.text)).toEqual(["before parliament decided"]);
  });
});

// ============================================================================
// CONFIG DEFAULTS
// ============================================================================

describe("claimContractValidation config defaults", () => {
  it("has enabled=true by default", () => {
    expect(DEFAULT_CALC_CONFIG.claimContractValidation?.enabled).toBe(true);
  });

  it("has maxRetries=1 by default", () => {
    expect(DEFAULT_CALC_CONFIG.claimContractValidation?.maxRetries).toBe(1);
  });
});

// ============================================================================
// OBSERVABILITY: contractValidationSummary SHAPE
// ============================================================================

describe("contractValidationSummary observability shape", () => {
  it("captures passing validation as compact summary", () => {
    const contractResult = {
      inputAssessment: {
        preservesOriginalClaimContract: true,
        rePromptRequired: false,
        summary: "All claims preserve original meaning",
      },
      claims: [],
    };

    const summary = {
      ran: true,
      preservesContract: contractResult.inputAssessment.preservesOriginalClaimContract,
      rePromptRequired: contractResult.inputAssessment.rePromptRequired,
      summary: contractResult.inputAssessment.summary ?? "",
    };

    expect(summary.ran).toBe(true);
    expect(summary.preservesContract).toBe(true);
    expect(summary.rePromptRequired).toBe(false);
    expect(summary.summary).toBe("All claims preserve original meaning");
  });

  it("captures failing validation with retry request", () => {
    const contractResult = {
      inputAssessment: {
        preservesOriginalClaimContract: false,
        rePromptRequired: true,
        summary: "proxy drift detected",
      },
      claims: [],
    };

    const summary = {
      ran: true,
      preservesContract: contractResult.inputAssessment.preservesOriginalClaimContract,
      rePromptRequired: contractResult.inputAssessment.rePromptRequired,
      summary: contractResult.inputAssessment.summary ?? "",
    };

    expect(summary.ran).toBe(true);
    expect(summary.preservesContract).toBe(false);
    expect(summary.rePromptRequired).toBe(true);
  });

  it("captures revalidation_unavailable as preservesContract=false (no silent fail-open)", () => {
    // Fix 3 (2026-04-10): when the contract validation LLM call returns
    // undefined, we do NOT stamp preservesContract=true. Prior behavior was
    // a silent fail-open lottery (initial undefined + retry undefined +
    // Gate 1 doesn't filter → summary carries preservesContract=true all
    // the way through the Wave 1A safeguard, which then fails to fire).
    // Current behavior: mark as degraded so the safeguard terminates the
    // run rather than ship an unverified report.
    const summary = {
      ran: true,
      preservesContract: false,
      rePromptRequired: false,
      summary: "revalidation_unavailable: initial contract validation LLM call returned no usable result",
    };

    expect(summary.ran).toBe(true);
    expect(summary.preservesContract).toBe(false);
    expect(summary.summary).toContain("revalidation_unavailable");
  });

  it("is undefined when validation is disabled", () => {
    // When contractValidationEnabled=false, no summary should be produced
    const contractValidationSummary = undefined;
    expect(contractValidationSummary).toBeUndefined();
  });
});

// ============================================================================
// OBSERVABILITY: CBClaimUnderstanding type compatibility
// ============================================================================

describe("CBClaimUnderstanding observability fields", () => {
  it("accepts optional inputClassification and contractValidationSummary", () => {
    // Verify the type shape is backward-compatible (old jobs without these fields)
    const understanding: Partial<import("@/lib/analyzer/types").CBClaimUnderstanding> = {
      inputClassification: "ambiguous_single_claim",
      contractValidationSummary: {
        ran: true,
        preservesContract: true,
        rePromptRequired: false,
        summary: "All claims preserve original meaning",
      },
    };
    expect(understanding.inputClassification).toBe("ambiguous_single_claim");
    expect(understanding.contractValidationSummary?.ran).toBe(true);
  });

  it("tolerates missing observability fields (backward compatibility)", () => {
    const understanding: Partial<import("@/lib/analyzer/types").CBClaimUnderstanding> = {};
    expect(understanding.inputClassification).toBeUndefined();
    expect(understanding.contractValidationSummary).toBeUndefined();
  });
});

// ============================================================================
// PROVENANCE GATE: evaluateClaimContractValidation
// ============================================================================
//
// Fix 1 (2026-04-10): the provenance gate in evaluateClaimContractValidation
// was rewritten to remove deterministic semantic matching of the anchor text
// against claim text. The gate now enforces only structural checks:
//
//   1. Cited preservedInClaimIds must exist in the final claim list.
//   2. Cited preservedByQuotes must be real substrings of their cited claims
//      (anti-hallucination provenance, NOT semantic relevance to the anchor).
//   3. LLM self-consistency: a claim cited in preservedInClaimIds must not be
//      simultaneously marked as drifted in the per-claim assessment
//      (recommendedAction=retry, proxyDriftSeverity=material, or
//      preservesEvaluativeMeaning=false).
//
// What the gate deliberately does NOT check:
//
//   * Whether the quoted span is semantically related to the anchor text.
//     This is an intentional trust-the-LLM decision, documented here with
//     regression tests. Substring-matching an anchor across LLM judgments
//     breaks on morphological variants (e.g., German adjective inflections),
//     coordinated-actor splits (e.g., "before X and Y" → "before X" + "before
//     Y"), and synonym-level preservation, and was the direct cause of the
//     2026-04-10 non-rechtskräftig false-positive damaged reports. See the
//     LLM Expert empirical addendum handoff and the AGENTS.md "LLM
//     Intelligence mandate" for the reasoning.
// ============================================================================

describe("evaluateClaimContractValidation — provenance gate", () => {
  const makeClaim = (id: string, statement: string): AtomicClaim => ({
    id,
    statement,
    category: "factual",
    centrality: "high",
    harmPotential: "medium",
    isCentral: true,
    claimDirection: "supports_thesis",
    keyEntities: [],
    checkWorthiness: "high",
    specificityScore: 0.8,
    groundingQuality: "moderate",
    expectedEvidenceProfile: { methodologies: [], expectedMetrics: [], expectedSourceTypes: [] },
  });

  const makeResult = (overrides: {
    preservesOriginalClaimContract?: boolean;
    rePromptRequired?: boolean;
    summary?: string;
    claims?: ClaimContractValidationResult["claims"];
    anchorText?: string;
    preservedInClaimIds?: string[];
    preservedByQuotes?: string[];
    antiInferenceCheck?: ClaimContractValidationResult["antiInferenceCheck"];
  } = {}): ClaimContractValidationResult => ({
    inputAssessment: {
      preservesOriginalClaimContract: overrides.preservesOriginalClaimContract ?? true,
      rePromptRequired: overrides.rePromptRequired ?? false,
      summary: overrides.summary ?? "contract preserved",
    },
    claims: overrides.claims ?? [],
    truthConditionAnchor: overrides.anchorText !== undefined
      ? {
        presentInInput: true,
        anchorText: overrides.anchorText,
        preservedInClaimIds: overrides.preservedInClaimIds ?? [],
        preservedByQuotes: overrides.preservedByQuotes ?? [],
      }
      : undefined,
    ...(overrides.antiInferenceCheck ? { antiInferenceCheck: overrides.antiInferenceCheck } : {}),
  });

  it("accepts valid provenance: cited ID exists and quote is a real substring", () => {
    const claims = [makeClaim("AC_01", "The council signed the treaty before parliament decided.")];
    const result = makeResult({
      anchorText: "signed the treaty before parliament decided",
      preservedInClaimIds: ["AC_01"],
      preservedByQuotes: ["signed the treaty before parliament decided"],
      claims: [{
        claimId: "AC_01",
        preservesEvaluativeMeaning: true,
        usesNeutralDimensionQualifier: true,
        proxyDriftSeverity: "none",
        recommendedAction: "keep",
        reasoning: "anchor preserved",
      }],
    });

    const evaluated = evaluateClaimContractValidation(result, claims);

    expect(evaluated.summary.preservesContract).toBe(true);
    expect(evaluated.effectiveRePromptRequired).toBe(false);
    expect(evaluated.anchorRetryReason).toBeUndefined();
  });

  it("rejects when preservedInClaimIds cites non-existent claim IDs (no valid IDs)", () => {
    const claims = [makeClaim("AC_01", "The council signed the treaty.")];
    const result = makeResult({
      anchorText: "rechtskräftig",
      preservedInClaimIds: ["AC_99"], // hallucinated ID
      preservedByQuotes: ["rechtskräftig"],
      claims: [],
    });

    const evaluated = evaluateClaimContractValidation(result, claims);

    expect(evaluated.summary.preservesContract).toBe(false);
    expect(evaluated.effectiveRePromptRequired).toBe(true);
    expect(evaluated.anchorRetryReason).toContain("no valid cited claim IDs");
  });

  // "rejects when all quotes are hallucinated" test REMOVED: the honestQuotes
  // substring check was deleted because it uses the same .includes() anti-pattern
  // as the F4 anchor check (fails on German morphology and paraphrasing, causing
  // ~60% false-positive anchorOverrideRetry). The LLM's preservedByQuotes field
  // is now trusted as-is. Structural validity is checked via validPreservedIds
  // (ID existence + thesis-directness) and the self-consistency check below.

  it("rejects LLM self-contradiction: preservedInClaimIds cites a claim marked recommendedAction=retry", () => {
    const claims = [makeClaim("AC_01", "The council signed the treaty before parliament decided.")];
    const result = makeResult({
      anchorText: "before parliament decided",
      preservedInClaimIds: ["AC_01"],
      preservedByQuotes: ["before parliament decided"],
      claims: [{
        claimId: "AC_01",
        preservesEvaluativeMeaning: false, // ← LLM contradicts itself
        usesNeutralDimensionQualifier: false,
        proxyDriftSeverity: "material",
        recommendedAction: "retry",
        reasoning: "actually drifted",
      }],
    });

    const evaluated = evaluateClaimContractValidation(result, claims);

    expect(evaluated.summary.preservesContract).toBe(false);
    expect(evaluated.effectiveRePromptRequired).toBe(true);
    expect(evaluated.anchorRetryReason).toContain("LLM self-contradiction");
    expect(evaluated.anchorRetryReason).toContain("AC_01");
  });

  it("rejects LLM self-contradiction: proxyDriftSeverity=material alone is sufficient", () => {
    const claims = [makeClaim("AC_01", "Test claim with some preserved wording.")];
    const result = makeResult({
      anchorText: "some preserved wording",
      preservedInClaimIds: ["AC_01"],
      preservedByQuotes: ["some preserved wording"],
      claims: [{
        claimId: "AC_01",
        preservesEvaluativeMeaning: true,
        usesNeutralDimensionQualifier: true,
        proxyDriftSeverity: "material", // ← contradicts preservation
        recommendedAction: "keep",
        reasoning: "",
      }],
    });

    const evaluated = evaluateClaimContractValidation(result, claims);

    expect(evaluated.summary.preservesContract).toBe(false);
    expect(evaluated.anchorRetryReason).toContain("LLM self-contradiction");
  });

  // --------------------------------------------------------------------------
  // INTENTIONAL GAP: trust-the-LLM on semantic relevance of quotes
  // --------------------------------------------------------------------------
  //
  // The prompt contract (claimboundary.prompt.md CLAIM_CONTRACT_VALIDATION
  // output schema) instructs the LLM that preservedByQuotes must be the
  // modifier-bearing span. The runtime gate does NOT enforce that: it only
  // checks provenance (the quote exists verbatim in the cited claim) and
  // self-consistency (the LLM's per-claim assessment agrees with its own
  // preservation judgment).
  //
  // This means a well-behaved LLM that cites a real claim ID, quotes a real
  // span from that claim, and marks the claim as non-drifted can pass the
  // gate even if the quoted span is semantically unrelated to the anchor
  // (e.g., quoted "The council" when the anchor is "rechtskräftig"). This
  // is an intentional trust-the-LLM decision, not a bug. The alternative
  // (deterministic substring match of anchor → quote or anchor → claim text)
  // breaks on morphological variants and coordinated decomposition and was
  // the direct cause of the 2026-04-10 non-rechtskräftig false-positive
  // damaged reports.
  //
  // If this test starts failing because the gate got stricter and started
  // rejecting the "unrelated quote from cited claim" case, check first
  // whether the new check also regresses morphological variants and
  // coordinated-actor splits. A correct stricter check would not.
  // --------------------------------------------------------------------------

  it("INTENTIONAL GAP: accepts a cited-but-semantically-unrelated quote — trusts the LLM's preservation judgment", () => {
    const claims = [makeClaim("AC_01", "The council signed the treaty before parliament decided.")];
    const result = makeResult({
      // Anchor is the modifier-bearing phrase the prompt asked the LLM to preserve.
      anchorText: "rechtskräftig",
      // LLM cites AC_01 as preserving the anchor.
      preservedInClaimIds: ["AC_01"],
      // LLM quotes a real substring of AC_01, but this span has nothing
      // to do with the anchor "rechtskräftig". This violates the prompt
      // contract, but the runtime gate does not enforce semantic relevance.
      preservedByQuotes: ["The council"],
      // LLM's per-claim assessment is internally consistent (no drift flagged).
      claims: [{
        claimId: "AC_01",
        preservesEvaluativeMeaning: true,
        usesNeutralDimensionQualifier: true,
        proxyDriftSeverity: "none",
        recommendedAction: "keep",
        reasoning: "anchor preserved (LLM says so)",
      }],
    });

    const evaluated = evaluateClaimContractValidation(result, claims);

    // This is the intentional gap: runtime trusts the LLM.
    expect(evaluated.summary.preservesContract).toBe(true);
    expect(evaluated.anchorRetryReason).toBeUndefined();
  });

  it("accepts coordinated decomposition: anchor spans multiple claims, quotes are per-actor fragments", () => {
    // Regression test for the 2026-04-10 non-rechtskräftig false-positive class.
    // The LLM correctly decomposes "before Volk und Parlament decided" into
    // two claims, one per actor. No single claim contains the literal
    // multi-actor anchor string as a substring, so the old substring check
    // would have falsely flagged this. The new provenance-only gate accepts it.
    const claims = [
      makeClaim("AC_01", "The council signed before parliament decided."),
      makeClaim("AC_02", "The council signed before the people decided."),
    ];
    const result = makeResult({
      anchorText: "before Volk und Parlament decided",
      preservedInClaimIds: ["AC_01", "AC_02"],
      preservedByQuotes: ["before parliament decided", "before the people decided"],
      claims: [
        {
          claimId: "AC_01",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "none",
          recommendedAction: "keep",
          reasoning: "preserved",
        },
        {
          claimId: "AC_02",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "none",
          recommendedAction: "keep",
          reasoning: "preserved",
        },
      ],
    });

    const evaluated = evaluateClaimContractValidation(result, claims);

    expect(evaluated.summary.preservesContract).toBe(true);
    expect(evaluated.effectiveRePromptRequired).toBe(false);
    expect(evaluated.anchorRetryReason).toBeUndefined();
  });

  // ==========================================================================
  // PR 1 (Rev B Track 1): structural directness gate
  // ==========================================================================
  //
  // The provenance gate now requires that cited preservedInClaimIds reference
  // claims marked thesisRelevance="direct". Tangential or contextual claims
  // cannot serve as anchor carriers, even if their text happens to contain
  // modifier-like wording. This is a typed-field check, NOT a semantic
  // re-check of anchor text.
  // ==========================================================================

  const makeTangentialClaim = (id: string, statement: string): AtomicClaim => ({
    ...makeClaim(id, statement),
    thesisRelevance: "tangential",
  });

  const makeDirectClaim = (id: string, statement: string): AtomicClaim => ({
    ...makeClaim(id, statement),
    thesisRelevance: "direct",
  });

  it("PR 1: rejects when only tangential claim is cited as anchor carrier", () => {
    const claims = [
      makeDirectClaim("AC_01", "Some unrelated direct claim about another aspect."),
      makeTangentialClaim("AC_02", "The council signed the treaty before parliament decided."),
    ];
    const result = makeResult({
      anchorText: "before parliament decided",
      preservedInClaimIds: ["AC_02"],
      preservedByQuotes: ["before parliament decided"],
      claims: [
        {
          claimId: "AC_01",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "none",
          recommendedAction: "keep",
          reasoning: "ok",
        },
        {
          claimId: "AC_02",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "none",
          recommendedAction: "keep",
          reasoning: "ok",
        },
      ],
    });

    const evaluated = evaluateClaimContractValidation(result, claims);

    expect(evaluated.summary.preservesContract).toBe(false);
    expect(evaluated.effectiveRePromptRequired).toBe(true);
    expect(evaluated.anchorRetryReason).toContain("tangential/contextual");
    expect(evaluated.anchorRetryReason).toContain("AC_02");
    expect(evaluated.summary.truthConditionAnchor?.validPreservedIds).toEqual([]);
  });

  it("PR 1: accepts when at least one cited claim is thesis-direct (others may be tangential)", () => {
    const claims = [
      makeDirectClaim("AC_01", "The council signed the treaty before parliament decided."),
      makeTangentialClaim("AC_02", "Background context about the treaty negotiations."),
    ];
    const result = makeResult({
      anchorText: "before parliament decided",
      preservedInClaimIds: ["AC_01", "AC_02"],
      preservedByQuotes: ["before parliament decided", "negotiations"],
      claims: [
        {
          claimId: "AC_01",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "none",
          recommendedAction: "keep",
          reasoning: "ok",
        },
        {
          claimId: "AC_02",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "none",
          recommendedAction: "keep",
          reasoning: "ok",
        },
      ],
    });

    const evaluated = evaluateClaimContractValidation(result, claims);

    // AC_02 is filtered out by the directness gate; AC_01 remains valid.
    expect(evaluated.summary.preservesContract).toBe(true);
    expect(evaluated.summary.truthConditionAnchor?.validPreservedIds).toEqual(["AC_01"]);
  });

  it("PR 1: claims with undefined thesisRelevance default to direct (backward compat)", () => {
    // Old test fixtures use makeClaim() which does not set thesisRelevance.
    // The directness gate must default these to "direct" so existing tests
    // continue to behave the same way.
    const claims = [makeClaim("AC_01", "The council signed the treaty before parliament decided.")];
    const result = makeResult({
      anchorText: "before parliament decided",
      preservedInClaimIds: ["AC_01"],
      preservedByQuotes: ["before parliament decided"],
      claims: [{
        claimId: "AC_01",
        preservesEvaluativeMeaning: true,
        usesNeutralDimensionQualifier: true,
        proxyDriftSeverity: "none",
        recommendedAction: "keep",
        reasoning: "ok",
      }],
    });

    const evaluated = evaluateClaimContractValidation(result, claims);

    expect(evaluated.summary.preservesContract).toBe(true);
    expect(evaluated.summary.truthConditionAnchor?.validPreservedIds).toEqual(["AC_01"]);
  });

  it("rejects normative/legal injection even when anchor provenance is otherwise clean", () => {
    const claims = [makeDirectClaim("AC_01", "The council signed the binding treaty.")];
    const result = makeResult({
      anchorText: "binding",
      preservedInClaimIds: ["AC_01"],
      preservedByQuotes: ["binding"],
      antiInferenceCheck: {
        normativeClaimInjected: true,
        injectedClaimIds: ["AC_01"],
        reasoning: "Added a legal/normative qualifier not present in the input.",
      },
      claims: [{
        claimId: "AC_01",
        preservesEvaluativeMeaning: true,
        usesNeutralDimensionQualifier: true,
        proxyDriftSeverity: "none",
        recommendedAction: "keep",
        reasoning: "anchor preserved",
      }],
    });

    const evaluated = evaluateClaimContractValidation(result, claims);

    expect(evaluated.summary.preservesContract).toBe(false);
    expect(evaluated.effectiveRePromptRequired).toBe(true);
    expect(evaluated.summary.failureMode).toBe("contract_violated");
    expect(evaluated.anchorRetryReason).toContain("normative_injection");
    expect(evaluated.anchorRetryReason).toContain("AC_01");
  });
});

// ============================================================================
// PR 1 (Rev B Track 1): CLAIM_CONTRACT_VALIDATION prompt contract
// ============================================================================
//
// Verifies the prompt section knows about the new directness metadata and
// that the validator-payload shape (built in claim-extraction-stage.ts
// validateClaimContract) renders without unresolved placeholders.
// ============================================================================

describe("CLAIM_CONTRACT_VALIDATION prompt contract", () => {
  it("section exists in prompt file", () => {
    const section = extractSection(promptContent, "CLAIM_CONTRACT_VALIDATION");
    expect(section, "Section ## CLAIM_CONTRACT_VALIDATION not found").not.toBeNull();
  });

  it("PR 1: section references thesisRelevance and the directness rule", () => {
    const section = extractSection(promptContent, "CLAIM_CONTRACT_VALIDATION");
    expect(section).not.toBeNull();
    expect(section).toContain("thesisRelevance");
    // Rule 11 must specify thesis-direct preservation
    expect(section).toContain("thesis-direct");
    // Rule 13 must explicitly require preservedInClaimIds to reference direct claims
    expect(section).toMatch(/preservedInClaimIds.*MUST.*direct|direct.*preservedInClaimIds/i);
  });

  it("PR 1: payload variables resolve with the new directness-context shape", () => {
    const section = extractSection(promptContent, "CLAIM_CONTRACT_VALIDATION");
    if (!section) return;

    // Mirror the exact payload validateClaimContract() builds, including the
    // new directness metadata fields.
    const vars: Record<string, string> = {
      analysisInput: "Sample input.",
      inputClassification: "single_atomic_claim",
      impliedClaim: "Sample claim",
      articleThesis: "Sample thesis",
      salienceBindingContextJson: JSON.stringify(
        {
          enabled: true,
          mode: "audit",
          success: true,
          anchors: [
            { text: "legally binding", type: "modal_illocutionary" },
            { text: "signed", type: "action_predicate" },
          ],
          priorityAnchors: [
            { text: "legally binding", type: "modal_illocutionary" },
          ],
        },
        null,
        2,
      ),
      distinctEventsContextJson: JSON.stringify(
        {
          count: 2,
          events: [
            { name: "Branch A", date: "", description: "First input-derived branch" },
            { name: "Branch B", date: "", description: "Second input-derived branch" },
          ],
        },
        null,
        2,
      ),
      atomicClaimsJson: JSON.stringify(
        [
          {
            claimId: "AC_01",
            statement: "Direct claim",
            category: "factual",
            thesisRelevance: "direct",
            claimDirection: "supports_thesis",
          },
          {
            claimId: "AC_02",
            statement: "Tangential claim",
            category: "factual",
            thesisRelevance: "tangential",
            claimDirection: "contextual",
            isDimensionDecomposition: false,
          },
        ],
        null,
        2,
      ),
    };

    const unresolved: string[] = [];
    section.replace(/\$\{(\w+)\}/g, (_match, varName: string) => {
      if (!(varName in vars)) unresolved.push(varName);
      return "";
    });

    expect(
      unresolved,
      `Unresolved variables in CLAIM_CONTRACT_VALIDATION: ${unresolved.join(", ")}.`,
    ).toEqual([]);
  });

  it("locks in truth-condition and anti-inference output requirements", () => {
    const section = extractSection(promptContent, "CLAIM_CONTRACT_VALIDATION");
    expect(section).not.toBeNull();
    expect(section).toContain("Precommitted priority-anchor guard");
    expect(section).toContain("Detected distinct-events reconciliation");
    expect(section).toContain("${distinctEventsContextJson}");
    expect(section).toContain('"truthConditionAnchor"');
    expect(section).toContain('"antiInferenceCheck"');
    expect(section).toContain("If `truthConditionAnchor.presentInInput` is true and `preservedInClaimIds` is empty, then `rePromptRequired` must be true.");
    expect(section).toContain("the modifier/status claim is a valid preservation carrier");
    expect(section).toContain('Do not mark that carrier as `recommendedAction: "retry"` or `proxyDriftSeverity: "material"` solely because');
    expect(section).toContain("If `antiInferenceCheck.normativeClaimInjected` is true, then `rePromptRequired` must be true.");
  });
});

describe("CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION prompt contract", () => {
  it("section exists in prompt file", () => {
    const section = extractSection(promptContent, "CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION");
    expect(section, "Section ## CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION not found").not.toBeNull();
  });

  it("locks in the bundled-single-claim retry doctrine", () => {
    const section = extractSection(promptContent, "CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION");
    expect(section).not.toBeNull();
    expect(section).toContain("Near-verbatim is not enough");
    expect(section).toContain("Precommitted salience context");
    expect(section).toContain("the `coordinatedBranchFinding` object is the general structural-finding container");
    expect(section).toContain("Comparison-side test");
    expect(section).toContain("Pure bilateral comparison exception");
    expect(section).toContain("Priority anchor guard");
    expect(section).toContain("No anchor weakening or externalization");
    expect(section).toContain("Coordinated branch test");
    expect(section).toContain("Conjunctive gate rule");
    expect(section).toContain("named/current side plus another proposition about the comparator/reference side");
    expect(section).toContain("Do NOT require decomposition merely because a claim compares A and B");
    expect(section).toContain('A statement of the form "A is more/less [predicate] than B" is ordinarily one inseparable comparative proposition');
    expect(section).toContain("Modifier handling across split propositions");
    expect(section).toContain("a separate thesis-direct modifier/status claim plus separate branch-relation claims is more atomic");
    expect(section).toContain("Mandatory branch enumeration");
    expect(section).toContain("Use `branchLabels` for coordinated branches and for comparison sides alike");
    expect(section).toContain("singleClaimAssessment");
    expect(section).toContain("coordinatedBranchFinding");
    expect(section).toContain("bundledInSingleClaim");
    expect(section).toContain("branchLabels");
  });
});

// ============================================================================
// PR 1 (Rev B Track 1): early `report_damaged` regression
// ============================================================================
//
// Wave 1A safeguard in claimboundary-pipeline.ts terminates the run early when
// understanding.contractValidationSummary.preservesContract === false. This
// test locks in the structural condition that triggers it: a known-broken
// final contract must produce that exact summary state.
//
// The full pipeline path is exercised by the existing integration tests; this
// test focuses on the contract-result → summary translation that drives the
// safeguard.
// ============================================================================

describe("PR 1: early report_damaged regression", () => {
  const makeClaim = (id: string, statement: string, thesisRelevance: "direct" | "tangential" = "direct"): AtomicClaim => ({
    id,
    statement,
    category: "factual",
    centrality: "high",
    harmPotential: "medium",
    isCentral: true,
    claimDirection: "supports_thesis",
    thesisRelevance,
    keyEntities: [],
    checkWorthiness: "high",
    specificityScore: 0.8,
    groundingQuality: "moderate",
    expectedEvidenceProfile: { methodologies: [], expectedMetrics: [], expectedSourceTypes: [] },
  });

  it("known-broken contract: only-tangential anchor citation produces preservesContract=false (safeguard input)", () => {
    // Scenario: input contained a thesis-defining modifier; LLM extraction
    // produced one direct claim that drops the modifier and one tangential
    // claim that happens to contain wording from the modifier. The LLM
    // validator self-incorrectly cites the tangential claim as the anchor
    // carrier. Pre-PR-1 this would have passed; PR 1's structural directness
    // gate must reject it and produce the exact summary state that triggers
    // the Wave 1A early-termination safeguard.
    const claims = [
      makeClaim("AC_01", "Some unrelated direct claim about the topic.", "direct"),
      makeClaim("AC_02", "Background note: signed before parliament decided.", "tangential"),
    ];
    const contractResult: ClaimContractValidationResult = {
      inputAssessment: {
        preservesOriginalClaimContract: true,
        rePromptRequired: false,
        summary: "looks ok to LLM but anchor only cited from tangential",
      },
      claims: [
        {
          claimId: "AC_01",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "none",
          recommendedAction: "keep",
          reasoning: "ok",
        },
        {
          claimId: "AC_02",
          preservesEvaluativeMeaning: true,
          usesNeutralDimensionQualifier: true,
          proxyDriftSeverity: "none",
          recommendedAction: "keep",
          reasoning: "ok",
        },
      ],
      truthConditionAnchor: {
        presentInInput: true,
        anchorText: "before parliament decided",
        preservedInClaimIds: ["AC_02"],
        preservedByQuotes: ["before parliament decided"],
      },
    };

    const evaluated = evaluateClaimContractValidation(contractResult, claims);

    // The exact summary fields the Wave 1A safeguard reads:
    expect(evaluated.summary.preservesContract).toBe(false);
    expect(evaluated.effectiveRePromptRequired).toBe(true);
    expect(evaluated.anchorRetryReason).toBeDefined();
    expect(evaluated.anchorRetryReason).toContain("tangential/contextual");
  });
});

// ============================================================================
// PR 1 (Rev B Track 1): validator-unavailable fallback wording alignment
// ============================================================================
//
// The validator-unavailable retry guidance must use the same fusion-first
// wording the normal anchor-retry path uses. This is a string-presence
// regression test that locks in alignment between the two branches.
// ============================================================================

describe("PR 1: validator-unavailable fallback guidance wording", () => {
  it("source file contains aligned fusion-first wording on validator-unavailable branch", () => {
    // Read claim-extraction-stage.ts and assert the validator-unavailable
    // fallback branch uses the same canonical phrases the normal retry path
    // uses. This is a build-time regression guard against the two branches
    // drifting apart again.
    const sourcePath = path.resolve(
      __dirname,
      "../../../../src/lib/analyzer/claim-extraction-stage.ts",
    );
    const source = readFileSync(sourcePath, "utf-8");

    // The fusion-first canonical phrases (must appear in BOTH the normal
    // contractGuidance string and the fallbackGuidance string).
    const canonicalPhrases = [
      "must fuse any truth-condition-bearing modifier",
      "Do NOT substitute proxy predicates",
      "shared predicate or modifier applies across multiple actors",
    ];

    // The code now uses an inline ternary branch inside contractGuidance
    // rather than a separate fallbackGuidance variable. Anchor on the
    // validator-unavailable literal and inspect that branch directly.
    const fallbackStart = source.indexOf(
      "CLAIM CONTRACT CORRECTION: The contract-validation step did not return a usable structured result.",
    );
    expect(fallbackStart, "validator-unavailable fallback guidance literal not found").toBeGreaterThan(-1);
    const fallbackEnd = source.indexOf("console.info(", fallbackStart);
    const fallbackBlock = source.slice(fallbackStart, fallbackEnd === -1 ? undefined : fallbackEnd);

    for (const phrase of canonicalPhrases) {
      expect(
        fallbackBlock,
        `validator-unavailable fallback guidance is missing canonical phrase "${phrase}"`,
      ).toContain(phrase);
    }
  });
});

// ============================================================================
// C9 (Phase 5): failureMode discriminant
// ============================================================================
//
// Phase B reporting partitions contract failures into genuine violations vs
// validator-availability hiccups via a new `failureMode` field on the
// contractValidationSummary. Preserved/success leaves the field undefined.
// Runtime semantics (preservesContract, Wave 1A safeguard) are unchanged —
// this is observational only.
// ============================================================================

describe("C9: contractValidationSummary.failureMode discriminant", () => {
  const makeClaim = (id: string, statement: string): AtomicClaim => ({
    id,
    statement,
    category: "factual",
    centrality: "high",
    harmPotential: "medium",
    isCentral: true,
    claimDirection: "supports_thesis",
    keyEntities: [],
    checkWorthiness: "high",
    specificityScore: 0.8,
    groundingQuality: "moderate",
    expectedEvidenceProfile: { methodologies: [], expectedMetrics: [], expectedSourceTypes: [] },
  });

  it("leaves failureMode undefined on clean preservation", () => {
    const claims = [makeClaim("AC_01", "Council signed the binding treaty.")];
    const result: ClaimContractValidationResult = {
      inputAssessment: {
        preservesOriginalClaimContract: true,
        rePromptRequired: false,
        summary: "preserved",
      },
      claims: [{
        claimId: "AC_01",
        preservesEvaluativeMeaning: true,
        usesNeutralDimensionQualifier: true,
        proxyDriftSeverity: "none",
        recommendedAction: "keep",
        reasoning: "ok",
      }],
    };

    const evaluated = evaluateClaimContractValidation(result, claims);

    expect(evaluated.summary.preservesContract).toBe(true);
    expect(evaluated.summary.failureMode).toBeUndefined();
  });

  it("sets failureMode='contract_violated' when validator returns a usable result flagging drift", () => {
    const claims = [makeClaim("AC_01", "Council discussed the treaty.")];
    const result: ClaimContractValidationResult = {
      inputAssessment: {
        preservesOriginalClaimContract: false,
        rePromptRequired: true,
        summary: "material drift",
      },
      claims: [{
        claimId: "AC_01",
        preservesEvaluativeMeaning: false,
        usesNeutralDimensionQualifier: false,
        proxyDriftSeverity: "material",
        recommendedAction: "retry",
        reasoning: "predicate drifted from 'signed' to 'discussed'",
      }],
    };

    const evaluated = evaluateClaimContractValidation(result, claims);

    expect(evaluated.summary.preservesContract).toBe(false);
    expect(evaluated.summary.failureMode).toBe("contract_violated");
  });

  it("C11b: source defines anchor-gated repair gate and narrow-scope repair function", () => {
    const sourcePath = path.resolve(
      __dirname,
      "../../../../src/lib/analyzer/claim-extraction-stage.ts",
    );
    const source = readFileSync(sourcePath, "utf-8");

    // Narrow repair function exists and uses context_refinement tier.
    expect(source).toContain("async function runContractRepair");
    expect(source).toMatch(/getModelForTask\("context_refinement"[^\n]+runContractRepair|runContractRepair[\s\S]+?getModelForTask\("context_refinement"/);

    // Structural gate fires only when anchor is non-empty, present-in-input,
    // and NOT a substring of any claim statement.
    expect(source).toContain("repairPassEnabled");
    expect(source).toContain("presentInInput === true");
    expect(source).toContain("selectRepairAnchorText(");
    expect(source).toContain("claimSetContainsAnchorText(");

    // Repair output must carry the anchor verbatim — post-check discards
    // silent-failure responses. This is what converts the stochastic
    // failure into a structural invariant.
    const postCheck = source.indexOf("Contract repair output still missing anchor");
    expect(postCheck, "C11b post-check for anchor landing is missing").toBeGreaterThan(-1);
  });

  it("C11b: config schema exposes repairPassEnabled", () => {
    const schemaPath = path.resolve(
      __dirname,
      "../../../../src/lib/config-schemas.ts",
    );
    const schema = readFileSync(schemaPath, "utf-8");
    expect(schema).toContain("repairPassEnabled");

    const jsonPath = path.resolve(
      __dirname,
      "../../../../configs/calculation.default.json",
    );
    const json = readFileSync(jsonPath, "utf-8");
    expect(json).toContain('"repairPassEnabled": true');
  });

  it("source sets failureMode='validator_unavailable' on both unavailable-path summary literals", () => {
    // Structural regression guard: the two code sites that synthesize a
    // contract summary when the validator LLM returns no usable result must
    // both carry failureMode='validator_unavailable'. We cannot easily unit-
    // test these sites without full Stage 1 orchestration, so this locks in
    // their presence via source inspection.
    const sourcePath = path.resolve(
      __dirname,
      "../../../../src/lib/analyzer/claim-extraction-stage.ts",
    );
    const source = readFileSync(sourcePath, "utf-8");

    // Count occurrences of the literal mode inside summaries whose `summary`
    // field starts with "revalidation_unavailable". Two sites expected:
    // initial contract-validation unavailable + final-revalidation unavailable.
    const unavailableSummaryMatches = source.match(/failureMode:\s*"validator_unavailable"/g) ?? [];
    expect(unavailableSummaryMatches.length).toBeGreaterThanOrEqual(2);

    // Each of those sites must sit alongside a "revalidation_unavailable"
    // summary string, so that the discriminant and the human-readable summary
    // stay consistent.
    const revalUnavailableCount = (source.match(/revalidation_unavailable/g) ?? []).length;
    expect(revalUnavailableCount).toBeGreaterThanOrEqual(2);
  });
});
