/**
 * OpenAI GPT-specific prompt optimizations
 *
 * Optimizations for GPT (GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo):
 * - Use concrete examples (GPT benefits from them)
 * - Compensate for tendency to be overly balanced
 * - Add calibration guidance
 * - Ensure schema compliance
 */

export function getOpenAIUnderstandVariant(): string {
  return `

## GPT-SPECIFIC GUIDANCE

**Strengths to leverage**:
- Fast structured output generation
- Good at following enumerated lists and examples
- Efficient token usage

**Compensate for**:
- Tendency to create too many claims - be selective
- May mark too many claims as central - apply strict filter
- Can miss implicit scope boundaries - look carefully for jurisdiction/methodology differences

**Concrete examples** (GPT benefits from examples):

Example 1 - Separating attribution from content:
Input: "Dr. Smith claims the vaccine is unsafe"
Output:
  - Claim 1: "Dr. Smith has made public statements about the vaccine" (attribution, LOW centrality)
  - Claim 2: "The vaccine is unsafe" (core, HIGH centrality - this is what needs verification)

Example 2 - Multi-scope detection:
Input: "The TSE court in Brazil ruled one way, while the SCOTUS court in USA ruled differently"
Output:
  - detectedScopes: [
      {id: "CTX_TSE", name: "Brazil TSE Electoral Ruling", type: "legal"},
      {id: "CTX_SCOTUS", name: "USA SCOTUS Constitutional Ruling", type: "legal"}
    ]
  - requiresSeparateAnalysis: true`;
}

export function getOpenAIExtractFactsVariant(): string {
  return `

## GPT-SPECIFIC GUIDANCE

**Work with GPT's characteristics**:
- Fast processing - good for bulk extraction
- May extract too many similar facts - prioritize diversity
- Ensure evidenceScope fields are populated when info is available

**Concrete examples**:

Example fact with evidenceScope:
{
  "fact": "Hydrogen fuel cell vehicles achieve 40% well-to-wheel efficiency",
  "category": "statistic",
  "specificity": "high",
  "sourceExcerpt": "...WTW efficiency of hydrogen FCEVs is approximately 40%...",
  "claimDirection": "contradicts", // if user claimed higher efficiency
  "relatedProceedingId": "CTX_WTW",
  "evidenceScope": {
    "name": "WTW",
    "methodology": "Well-to-Wheel analysis",
    "boundaries": "Primary energy production through vehicle operation",
    "geographic": "European Union",
    "temporal": "2024"
  }
}

**Output format strictness**:
- Ensure all required fields present (GPT sometimes omits optional fields that should be empty strings)
- Use "" for empty strings, not null`;
}

export function getOpenAIVerdictVariant(): string {
  return `

## GPT-4o GUIDANCE

**Work with GPT's characteristics**:
- Tendency to be overly balanced - don't artificially center verdicts at 50%
- May over-apply "neutral" to factors - use your knowledge when appropriate
- Good at structured output - ensure schema compliance

**Compensate for known issues**:
- **Rating direction**: Double-check you're rating THE CLAIM, not your analysis
  - User claim: "X is better" + Evidence: "Y is better" = LOW verdict (0-28%)
- **Scope isolation**: Ensure facts from Scope A don't leak into Scope B verdict
- **Contestation**: Distinguish "disputed" (political disagreement) from "established counter-evidence" (documented violations)

**Calibration guidance**:
- If 3+ supporting facts, 0 counter-evidence → Use 80-95% (TRUE/MOSTLY TRUE)
- If 3+ counter-evidence facts, 0-1 supporting → Use 5-25% (FALSE/MOSTLY FALSE)
- If balanced evidence → Use 40-60% (MIXED/UNVERIFIED based on confidence)

**Schema strictness**:
- All keyFactors must have: factor, explanation, supports, isContested, contestedBy, factualBasis
- Use "" for empty strings, not null
- supportingFactIds must be array (even if empty)`;
}

export function getOpenAIScopeRefinementVariant(): string {
  return `

## GPT-SPECIFIC GUIDANCE

**Characteristics**:
- May over-split contexts - apply strict relevance filter
- Good at structured output with clear examples
- Ensure factScopeAssignments covers all facts

**Prevent over-splitting**:
Ask for each proposed context:
1. Is this directly relevant to the input's specific topic?
2. Is this supported by actual evidence facts?
3. Does this represent a distinct analytical frame (not just a perspective)?
4. If removed, would analysis materially change?

If answer to any is "no", don't create the context.

**Fact assignment coverage**:
- Ensure factScopeAssignments has ≥70% of facts assigned
- Each context should have ≥1 fact assigned`;
}
