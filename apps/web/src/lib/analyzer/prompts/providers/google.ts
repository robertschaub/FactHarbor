/**
 * Google Gemini-specific prompt optimizations
 *
 * Optimizations for Gemini (Gemini 1.5 Pro, Gemini 1.5 Flash):
 * - Large context window - can handle detailed instructions
 * - Prevent verbose outputs
 * - Explicit schema validation requirements
 * - Clear format strictness
 */

export function getGeminiUnderstandVariant(): string {
  return `

## GEMINI-SPECIFIC GUIDANCE

**Strengths to leverage**:
- Excellent context window - can handle detailed instructions
- Strong multimodal capabilities (if URLs to images/PDFs provided)
- Good at factual extraction

**Compensate for**:
- May provide overly verbose explanations - keep outputs concise
- Can struggle with exact JSON schema compliance - follow schema strictly
- Sometimes conflates similar but distinct scopes - maintain clear boundaries

**Schema compliance** (critical for Gemini):
- Each claim MUST have: id, text, claimRole, centrality, isCentral, checkWorthiness, harmPotential
- dependsOn must be array of claim IDs or empty array (not null)
- detectedScopes must match exact structure: id, name, type`;
}

export function getGeminiExtractFactsVariant(): string {
  return `

## GEMINI-SPECIFIC GUIDANCE

**Leverage Gemini's strengths**:
- Large context window - can handle longer source texts
- Good at factual extraction from structured documents
- Can process URLs and PDFs directly if configured

**Compensate for**:
- May be verbose - keep fact statements concise (one sentence)
- Ensure evidenceScope is filled when source defines analytical frame
- Follow exact schema for structured output

**Fact statement format**:
- Keep fact text under 100 characters when possible
- Include specific numbers/dates in fact statement
- sourceExcerpt should be direct quote (50-200 chars)

**Schema compliance checklist**:
- [ ] fact: string (concise statement)
- [ ] category: one of enum values
- [ ] specificity: "high" or "medium" (no "low")
- [ ] sourceExcerpt: 50-200 characters
- [ ] claimDirection: "supports" | "contradicts" | "neutral"
- [ ] relatedProceedingId: string (scope ID or "")
- [ ] evidenceScope: object or null (not missing)`;
}

export function getGeminiVerdictVariant(): string {
  return `

## GEMINI 1.5 PRO GUIDANCE

**Leverage Gemini's capabilities**:
- Large context - can synthesize many facts effectively
- Good factual recall - useful for background knowledge mode
- Strong at detailed analysis

**Compensate for**:
- Tendency toward verbose outputs - keep responses concise
- May need explicit reminders about rating direction
- Ensure structured output matches exact schema

**Verbose output prevention**:
- Factor explanations: Max 20 words
- Claim reasoning: Max 30 words
- shortAnswer: Max 25 words
- Focus on key points only

**Rating direction double-check**:
Before finalizing each verdict, ask yourself:
1. What does the USER's claim state?
2. What does the EVIDENCE show?
3. Do they match or contradict?
4. Verdict = how much they match (not how well we analyzed)

**Schema validation**:
- Verify proceedingId matches one from scopesList
- Verify claimId matches claim from claimslist
- Ensure all enum values are exact matches`;
}

export function getGeminiScopeRefinementVariant(): string {
  return `

## GEMINI-SPECIFIC GUIDANCE

**Strengths**:
- Large context window - can analyze many facts
- Good at factual extraction

**Ensure clarity**:
- Keep context names concise but specific
- Fill metadata fields when info available (use "" for unknown, not null)
- Ensure factScopeAssignments array has valid factIds from input

**Schema compliance**:
- distinctProceedings: Array of objects with all required fields
- Each proceeding must have: id, name, shortName, subject, temporal, status, outcome, metadata
- metadata can have flexible structure but must be object
- factScopeAssignments: Array of {factId: string, proceedingId: string}`;
}
