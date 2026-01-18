/**
 * Mistral-specific prompt optimizations
 *
 * Optimizations for Mistral (Mistral Large, Mistral Medium):
 * - Clear, explicit instructions work best
 * - Strong at following enumerated rules
 * - Explicit checklists and step-by-step processes
 * - Fast structured output
 */

export function getMistralUnderstandVariant(): string {
  return `

## MISTRAL-SPECIFIC GUIDANCE

**Optimize for Mistral**:
- Direct, explicit instructions work best
- Good at following enumerated rules
- Fast structured output

**Explicit enumeration** (Mistral benefits from this):

Centrality = LOW (examples):
- "Dr. X is the director" (attribution)
- "An internal memo exists" (source)
- "The event occurred in November" (timing)
- "The methodology is ISO 14040" (methodology validation)

Centrality = HIGH (examples):
- "10 people were harmed by Product X" (factual impact)
- "The process violated due process standards" (legal/procedural violation)
- "Hydrogen cars are more efficient than electric" (comparative factual claim)`;
}

export function getMistralExtractFactsVariant(): string {
  return `

## MISTRAL-SPECIFIC GUIDANCE

**Optimize for Mistral**:
- Direct, explicit instructions work best
- Good at following enumerated rules
- Fast structured output

**Explicit rule checklist**:

For EACH fact extracted:
1. Fact text: One sentence, under 100 chars
2. Category: Pick ONE from: evidence, expert_quote, statistic, event, legal_provision, criticism
3. Specificity: HIGH or MEDIUM only (reject LOW)
4. sourceExcerpt: Copy 50-200 chars directly from source
5. claimDirection:
   - If supports user's claim → "supports"
   - If contradicts user's claim → "contradicts"
   - If neither → "neutral"
6. relatedProceedingId: Which scope? (or "" if general)
7. evidenceScope: Does source define its analytical frame?
   - If YES: Fill name, methodology, boundaries, geographic, temporal (use "" for unknown)
   - If NO: Set to null

**Quality threshold**:
- Minimum 3 facts, maximum 8 facts
- Each fact must be independently verifiable
- Avoid duplicate information across facts`;
}

export function getMistralVerdictVariant(): string {
  return `

## MISTRAL LARGE GUIDANCE

**Optimize for Mistral**:
- Clear, explicit instructions work best
- Strong at following rules systematically
- Fast structured output

**Systematic verdict process** (step-by-step):

For each scope:
1. Read user's original claim
2. Read facts for this scope only
3. Count [SUPPORTING] facts
4. Count [COUNTER-EVIDENCE] facts
5. Determine which direction evidence points
6. Assign truth percentage:
   - More supporting → 72-100%
   - Balanced → 43-57%
   - More counter-evidence → 0-28%
7. Verify: Does percentage match evidence direction?

**Checklist for each verdict**:
- [ ] proceedingId matches scope ID from list
- [ ] answer is 0-100 integer
- [ ] answer matches reasoning (if reasoning says "false", answer should be 0-28)
- [ ] shortAnswer is complete sentence
- [ ] keyFactors: 3-5 items
- [ ] Each keyFactor has all required fields
- [ ] factualBasis is correct: "established" only if DOCUMENTED counter-evidence

**Common errors to avoid**:
- Rating analysis quality instead of claim truth → Re-read rating direction section
- Conflating scopes → Check that facts match proceedingId
- Over-using "neutral" in supports field → Use your knowledge`;
}

export function getMistralScopeRefinementVariant(): string {
  return `

## MISTRAL-SPECIFIC GUIDANCE

**Systematic process**:

Step 1: Read all facts and identify potential boundaries
- Look for methodology markers (e.g., "WTW", "TTW", "LCA")
- Look for jurisdiction markers (e.g., court names, country names)
- Look for temporal markers (e.g., "2020 study", "2025 revision")

Step 2: For each potential boundary, verify:
- [ ] Directly relevant to input topic?
- [ ] Supported by ≥1 fact?
- [ ] Represents distinct analytical frame?

Step 3: Create contexts only if Step 2 checks pass

Step 4: Assign ALL facts to contexts
- Each fact → exactly one proceedingId
- Verify coverage: All facts in input → All assignments in output

**Metadata population**:
- Fill fields when evidence provides info
- Use empty string ("") when not specified, not null
- Example legal metadata: {institution: "TSE", jurisdiction: "Federal", charges: ["Electoral fraud"]}
- Example scientific metadata: {methodology: "WTW", boundaries: "Primary energy to wheel", geographic: "EU"}`;
}
