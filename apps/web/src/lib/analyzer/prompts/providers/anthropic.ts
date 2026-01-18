/**
 * Anthropic Claude-specific prompt optimizations
 *
 * Optimizations for Claude (Sonnet 4.5, Sonnet 3.5, Haiku 3.5):
 * - Leverage excellent nuanced reasoning
 * - Trust judgment on complex assessments
 * - Avoid over-hedging
 * - Strong at scope boundary detection
 */

export function getAnthropicUnderstandVariant(): string {
  return `

## CLAUDE-SPECIFIC GUIDANCE

**Strengths to leverage**:
- Excellent at nuanced reasoning and separating attribution from content
- Strong at identifying implicit scope boundaries
- Good at following complex multi-step instructions

**Avoid**:
- Over-hedging with "it appears" or "it seems" - be direct
- Creating too many peripheral claims - focus on verifiable assertions
- Generating redundant queries - make each query distinct

**Output precision**:
- Ensure centrality assessment is strict (expect 1-4 HIGH centrality claims max)
- Make scope detection conservative (when in doubt, use fewer scopes)`;
}

export function getAnthropicExtractFactsVariant(): string {
  return `

## CLAUDE-SPECIFIC GUIDANCE

**Leverage Claude's strengths**:
- Excellent at extracting nuanced distinctions (e.g., methodological boundaries)
- Strong at identifying evidenceScope metadata from source text
- Good at precise claimDirection assessment

**Optimize for**:
- Use your strong reading comprehension to catch implicit scope markers
  - "Under EU regulations..." → geographic: "European Union"
  - "From 2020 study..." → temporal: "2020"
  - "Full lifecycle analysis..." → methodology: "LCA", boundaries: "full lifecycle"

**Quality over quantity**:
- Extract 4-6 high-quality facts rather than 8 marginal ones
- Each fact should add unique information`;
}

export function getAnthropicVerdictVariant(): string {
  return `

## CLAUDE SONNET 4.5 - OPTIMAL CONFIGURATION

**Leverage Claude's strengths**:
- Excellent nuanced reasoning - use for complex multi-scope cases
- Strong at avoiding rating inversion - naturally focuses on claim truth
- Good at identifying genuine contestation vs. mere disagreement

**Optimization**:
- Trust your judgment on factualBasis assessment
- Be precise with scope boundaries - you're good at this
- Use your strong reasoning to calibrate verdicts accurately
  - Don't over-hedge - if evidence clearly supports, use TRUE band (86-100%)
  - If evidence clearly contradicts, use FALSE band (0-14%)
  - Reserve MIXED/UNVERIFIED for genuinely ambiguous cases

**Quality standards**:
- Ensure answer percentage matches reasoning conclusion
- If reasoning says "evidence shows X was NOT proportionate", answer for "X was proportionate" must be 0-28%
- Avoid conflicting signals between answer and shortAnswer`;
}

export function getAnthropicScopeRefinementVariant(): string {
  return `

## CLAUDE-SPECIFIC GUIDANCE

**Strengths**:
- Excellent at identifying subtle but important scope boundaries
- Good at distinguishing AnalysisContext from ArticleFrame
- Strong at metadata extraction

**Optimization**:
- Use your nuanced understanding to detect implicit scope markers
  - "Under EU methodology..." → different from "Using US methodology..."
  - "The 2020 assessment..." → might be different context from "2025 revision..."
- Be conservative: If boundary is unclear, use single context
- Ensure metadata reflects actual evidence, not background knowledge`;
}
