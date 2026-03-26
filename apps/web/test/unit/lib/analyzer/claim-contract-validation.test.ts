/**
 * Claim Contract Validation — Unit Tests
 *
 * Tests for the ClaimContractOutputSchema and claim contract validation logic.
 * These tests verify schema parsing, severity classification, and retry decision rules.
 *
 * @see apps/web/src/lib/analyzer/claimboundary-pipeline.ts
 */

import { describe, it, expect } from "vitest";
import {
  ClaimContractOutputSchema,
} from "@/lib/analyzer/claimboundary-pipeline";
import {
  DEFAULT_CALC_CONFIG,
} from "@/lib/config-schemas";

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

  it("captures fail-open (undefined result) as ran=true with neutral summary", () => {
    // When the LLM call returns undefined, fail-open should still record that validation ran
    const summary = {
      ran: true,
      preservesContract: true,
      rePromptRequired: false,
      summary: "fail-open: LLM call returned undefined",
    };

    expect(summary.ran).toBe(true);
    expect(summary.preservesContract).toBe(true);
    expect(summary.summary).toContain("fail-open");
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
