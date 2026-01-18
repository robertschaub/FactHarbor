/**
 * Budget mode adaptations for LLM tiering configuration
 *
 * When FH_LLM_TIERING=on with cheaper models for extraction tasks:
 * - Simplify instructions for fast models
 * - Use clear examples instead of abstract rules
 * - Minimize reasoning steps
 * - Emphasize schema compliance
 */

export function getTieringUnderstandAdaptation(): string {
  return `

## BUDGET MODE OPTIMIZATION

**Simplified instructions** (optimized for fast models):
- Focus on extraction accuracy over nuance
- Use clear examples instead of abstract rules
- Minimize reasoning steps

**Output format**:
- Be strict with schema compliance
- Use enumerated values exactly as specified
- Avoid optional fields when possible

**Example-driven extraction** (fast models benefit):

Example 1: Attribution separation
Input: "Dr. Jane Smith, a Harvard professor, claims hydroxychloroquine cures COVID"
Output:
- Claim 1: {text: "Dr. Jane Smith is a Harvard professor", role: "attribution", centrality: "low"}
- Claim 2: {text: "Hydroxychloroquine cures COVID-19", role: "core", centrality: "high"}

Example 2: Methodology claim recognition
Input: "Using the Well-to-Wheel methodology shows hydrogen is 40% efficient"
Output:
- Claim 1: {text: "Well-to-Wheel methodology is used", role: "source", centrality: "low"}
- Claim 2: {text: "Hydrogen achieves 40% efficiency in Well-to-Wheel analysis", role: "core", centrality: "high"}`;
}

export function getTieringExtractFactsAdaptation(): string {
  return `

## BUDGET MODE - EXTRACT FACTS ONLY

**Simplified task**:
1. Read source text
2. Extract 3-8 specific, verifiable facts
3. For each fact: statement, category, excerpt, direction

**No complex reasoning**:
- Don't overthink evidenceScope - fill if obvious, leave empty otherwise
- claimDirection: Does this support or contradict user claim? Simple binary.
- Specificity: If it has numbers/dates/names → HIGH, otherwise → MEDIUM

**Fast schema**:
Return JSON with facts array. Each fact needs:
- fact: string (one sentence)
- category: pick from list
- specificity: "high" or "medium"
- sourceExcerpt: copy 50-200 chars
- claimDirection: "supports" | "contradicts" | "neutral"`;
}

export function getTieringVerdictAdaptation(): string {
  return `

## BUDGET MODE - SIMPLIFIED VERDICT

**Streamlined process**:
1. Count supporting facts
2. Count contradicting facts
3. Assign verdict:
   - Majority supporting → 72-100%
   - Equal → 43-57%
   - Majority contradicting → 0-28%
4. Write 1-2 sentence reasoning

**No complex analysis**:
- Skip nuanced factualBasis assessment
- Use straightforward support scoring
- Keep keyFactors simple and direct`;
}
