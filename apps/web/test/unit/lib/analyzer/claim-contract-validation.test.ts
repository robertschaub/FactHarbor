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
  type ClaimContractValidationResult,
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

    // Look for the fallbackGuidance variable definition and ensure each
    // canonical phrase appears between its definition and the next blank-line
    // marker. We use a slice anchored on the variable name.
    const fallbackStart = source.indexOf("const fallbackGuidance");
    expect(fallbackStart, "fallbackGuidance variable not found").toBeGreaterThan(-1);
    const fallbackEnd = source.indexOf("\n\n", fallbackStart);
    const fallbackBlock = source.slice(fallbackStart, fallbackEnd === -1 ? undefined : fallbackEnd);

    for (const phrase of canonicalPhrases) {
      expect(
        fallbackBlock,
        `validator-unavailable fallback guidance is missing canonical phrase "${phrase}"`,
      ).toContain(phrase);
    }
  });
});
