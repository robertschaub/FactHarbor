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

## OUTPUT
- Valid JSON matching schema
- Empty strings "" for missing optional fields
- All arrays as arrays (even if empty)

## STRENGTHS
Apply nuanced reasoning. Be direct and confident.
</claude_optimization>`;
}

export function getAnthropicExtractFactsVariant(): string {
  return `
<claude_optimization>
## FORMAT
Use XML tags. Follow schema precisely.

## OUTPUT
- Valid JSON matching schema
- Empty strings "" for missing optional fields
- All arrays as arrays (even if empty)

## STRENGTHS
Use strong reading comprehension for implicit scope markers.
</claude_optimization>`;
}

export function getAnthropicVerdictVariant(): string {
  return `
<claude_optimization>
## FORMAT
Use XML tags. Follow schema precisely.

## CRITICAL
Rate USER'S CLAIM truth, NOT analysis quality.
Evidence contradicts claim → low verdict (0-28%).
Evidence supports claim → high verdict (72-100%).

## OUTPUT
- Answer percentage must match reasoning
- shortAnswer must align with percentage

## STRENGTHS
Trust your judgment. Be decisive. Don't over-hedge.
</claude_optimization>`;
}

export function getAnthropicScopeRefinementVariant(): string {
  return `
<claude_optimization>
## FORMAT
Use XML tags. Follow schema precisely.

## OUTPUT
- Valid JSON matching schema
- Empty strings "" for missing optional fields
- All arrays as arrays (even if empty)

## STRENGTHS
Use strong comprehension for metadata extraction.
</claude_optimization>`;
}

/** Primary name for getting Anthropic AnalysisContext refinement variant */
export const getAnthropicContextRefinementVariant = getAnthropicScopeRefinementVariant;
