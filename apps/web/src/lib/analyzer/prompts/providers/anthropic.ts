/**
 * Anthropic Claude-specific prompt optimizations
 *
 * v2.8.1 - SLIMMED: Format-only optimizations (Phase 3 pilot)
 *
 * Claude optimizations:
 * - XML-structured prompts for clarity
 * - Thinking blocks for complex reasoning
 * - Trust nuanced reasoning capabilities
 *
 * All concept teaching happens in base prompts.
 * Variants ONLY specify format preferences.
 */

export function getAnthropicUnderstandVariant(): string {
  return `
<claude_optimization>
## FORMAT
Use XML tags. Follow schema precisely.

## APPROACH
<thinking_process>
Before output, internally: (1) input type, (2) core assertions, (3) analytical frames, (4) attribution separation, (5) search queries.
</thinking_process>

## OUTPUT
- Valid JSON matching schema
- Empty strings "" for missing optional fields
- All arrays as arrays (even if empty)
- 1-4 HIGH centrality claims max

## STRENGTHS
Apply nuanced reasoning. Be direct and confident.
</claude_optimization>`;
}

export function getAnthropicExtractFactsVariant(): string {
  return `
<claude_optimization>
## FORMAT
Use XML tags. Follow schema precisely.

## APPROACH
<thinking_process>
For each source: (1) verifiable facts, (2) support/contradict claim, (3) methodology/scope, (4) verbatim excerpt.
</thinking_process>

## OUTPUT
- 4-6 high-quality facts (not 8 marginal)
- sourceExcerpt: verbatim 50-200 chars
- evidenceScope when source defines frame
- contextId to appropriate AnalysisContext

## STRENGTHS
Use strong reading comprehension for implicit scope markers.
</claude_optimization>`;
}

export function getAnthropicVerdictVariant(): string {
  return `
<claude_optimization>
## FORMAT
Use XML tags. Follow schema precisely.

## APPROACH
<thinking_process>
For each context: (1) user claim states, (2) evidence shows, (3) match or contradict, (4) confidence.
</thinking_process>

## CRITICAL
Rate USER'S CLAIM truth, NOT analysis quality.
Evidence contradicts claim → low verdict (0-28%).
Evidence supports claim → high verdict (72-100%).

## OUTPUT
- Answer percentage must match reasoning
- shortAnswer must align with percentage
- Analyze each AnalysisContext independently

## STRENGTHS
Trust your judgment. Be decisive. Don't over-hedge.
</claude_optimization>`;
}

export function getAnthropicScopeRefinementVariant(): string {
  return `
<claude_optimization>
## FORMAT
Use XML tags. Follow schema precisely.

## APPROACH
<thinking_process>
Ask: (1) distinct frames in evidence, (2) directly relevant, (3) supported by facts, (4) from evidence not background.
</thinking_process>

## OUTPUT
- factScopeAssignments ≥70% coverage
- Each AnalysisContext ≥1 fact
- Empty strings "" for unknown metadata
- When in doubt, fewer contexts

## STRENGTHS
Use strong comprehension for metadata extraction.
</claude_optimization>`;
}

/** Primary name for getting Anthropic context refinement variant */
export const getAnthropicContextRefinementVariant = getAnthropicScopeRefinementVariant;
