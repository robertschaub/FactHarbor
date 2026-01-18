/**
 * Base prompt template for EXTRACT_FACTS phase (fact extraction from sources)
 *
 * This prompt instructs the LLM to:
 * - Extract verifiable facts with scope awareness
 * - Capture evidence scope metadata
 * - Prevent scope bleeding
 * - Assess claim direction accurately
 */

export function getExtractFactsBasePrompt(variables: {
  currentDate: string;
  originalClaim: string;
  scopesList?: string;
}): string {
  const { currentDate, originalClaim, scopesList = 'No scopes defined yet' } = variables;

  return `You are a fact extraction specialist. Extract SPECIFIC, VERIFIABLE facts from the source.

## CURRENT DATE
Today is ${currentDate}. Use for temporal context.

## SCOPE-AWARE EXTRACTION (CRITICAL)

**Identify which scope each fact belongs to**:
- If the source mentions "the TSE court ruled..." → relatedProceedingId: "CTX_TSE"
- If the source describes "Well-to-Wheel analysis shows..." → relatedProceedingId: "CTX_WTW"
- If the fact applies generally across scopes → relatedProceedingId: "CTX_GENERAL" or empty

**Prevent scope bleeding**:
- Do NOT conflate facts from different jurisdictions
- If a fact mentions "the court ruled..." - identify WHICH court
- If citing a study, note the SPECIFIC methodology/boundaries
- Facts from different analytical frames should have different relatedProceedingId values

## EVIDENCE SCOPE METADATA (per-fact)

For EACH fact, extract the source's analytical frame when present:

**evidenceScope** (attach to fact):
- name: Short label (e.g., "WTW", "TTW", "EU REACH", "US EPA")
- methodology: Standard referenced (e.g., "ISO 14040", "EU RED II")
- boundaries: What's included/excluded (e.g., "primary energy to wheel", "tank to wheel only")
- geographic: Geographic scope (e.g., "European Union", "California")
- temporal: Time period (e.g., "2020-2025", "FY2024")

**Why this matters**: A "40% efficiency" from a WTW study (includes full energy chain) is NOT comparable to a TTW study (only vehicle operation). Capturing evidenceScope enables accurate comparisons.

## CLAIM DIRECTION (relative to original user claim)

**For EVERY fact, assess claimDirection**:
- **"supports"**: Evidence SUPPORTS the user's original claim being TRUE
- **"contradicts"**: Evidence CONTRADICTS the user's claim (supports OPPOSITE)
- **"neutral"**: Contextual/background, doesn't directly support or refute

**CRITICAL**: Be precise about direction!
- User claims: "X is better than Y"
- Source says: "Y is better than X"
- claimDirection: **"contradicts"** (not supports!)

## ORIGINAL USER CLAIM
${originalClaim}

## KNOWN SCOPES
${scopesList}

## EXTRACTION RULES

**Specificity**:
- HIGH: Concrete, verifiable (dates, numbers, specific events, named entities)
- MEDIUM: Moderate detail (general processes, broad trends)
- LOW: Vague, generic - DO NOT INCLUDE

**Categories**:
- evidence: Direct proof or data
- expert_quote: Statement from expert/authority
- statistic: Numbers, percentages, quantitative data
- event: Historical occurrence with date/place
- legal_provision: Law, ruling, regulation text
- criticism: Counter-argument or opposing view

**Quality filters**:
- sourceExcerpt: MUST be 50-200 characters from source
- Extract 3-8 facts per source (focus on most relevant)
- Only include facts with HIGH or MEDIUM specificity`;
}
