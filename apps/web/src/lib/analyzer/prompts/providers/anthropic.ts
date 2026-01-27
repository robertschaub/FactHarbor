/**
 * Anthropic Claude-specific prompt optimizations
 *
 * Optimizations for Claude (Sonnet 4, Sonnet 3.5, Haiku 3.5):
 * - XML-structured prompts for clarity (Claude excels with XML tags)
 * - Thinking blocks for complex reasoning
 * - Prefill technique for structured output
 * - Leverage excellent nuanced reasoning
 * - Trust judgment on complex assessments
 * - Strong at AnalysisContext boundary detection
 *
 * @version 2.8.0 - Enhanced with XML structure and thinking patterns
 */

export function getAnthropicUnderstandVariant(): string {
  return `
<claude_optimization>
## PROMPT STRUCTURE
This prompt uses XML tags for optimal Claude comprehension. Follow the structure precisely.

## REASONING APPROACH
<thinking_process>
Before generating output, work through these steps internally:
1. What type of input is this? (claim vs article)
2. Identify the core factual assertions that need verification
3. Are there multiple analytical frames? (look for institutional/methodology boundaries)
4. Which claims require attribution separation (WHO said vs WHAT was said)?
5. What search queries would find supporting AND contradicting evidence?
</thinking_process>

## ATTRIBUTION SEPARATION (CRITICAL)
<attribution_rule>
ALWAYS separate attribution claims from content claims:
- Input: "Expert X claims Y is dangerous"
- Output TWO claims:
  1. "Expert X made statements about Y" (attribution, LOW centrality)
  2. "Y is dangerous" (core, HIGH centrality - this is what needs verification)
</attribution_rule>

## ANALYSISCONTEXT DETECTION
<scope_guidance>
Use your nuanced reasoning to detect implicit AnalysisContext boundaries:
- "Under EU regulations..." vs "Under US standards..." → distinct AnalysisContexts
- "Well-to-Wheel analysis shows..." vs "Tank-to-Wheel study finds..." → distinct methodologies
- Different courts/tribunals analyzing different matters → distinct AnalysisContexts
- Different viewpoints on SAME matter → NOT distinct AnalysisContexts (just perspectives)

Be conservative: When boundary is unclear, use fewer AnalysisContexts.
</scope_guidance>

## OUTPUT GUIDANCE
<output_rules>
- Return valid JSON matching the schema exactly
- Use empty strings "" for missing optional fields (never null for strings)
- Ensure all array fields are arrays (even if single element or empty)
- Centrality assessment: Expect 1-4 HIGH centrality claims maximum
- Each search query should be distinct (no redundancy)
</output_rules>

## LEVERAGE YOUR STRENGTHS
- Apply nuanced reasoning to AnalysisContext boundary detection
- Be direct and confident - avoid over-hedging ("it appears", "it seems")
- Focus on verifiable assertions, not peripheral commentary
</claude_optimization>`;
}

export function getAnthropicExtractFactsVariant(): string {
  return `
<claude_optimization>
## FACT EXTRACTION APPROACH
<thinking_process>
For each source, work through:
1. What specific, verifiable facts does this source contain?
2. Does each fact SUPPORT or CONTRADICT the user's claim?
3. What methodology/scope did the source use? (capture in evidenceScope)
4. Is the excerpt a genuine verbatim quote from the source?
</thinking_process>

## EVIDENCE SCOPE DETECTION
<scope_markers>
Use your strong reading comprehension to catch implicit scope markers:
- "Under EU regulations..." → geographic: "European Union"
- "According to 2020 study..." → temporal: "2020"
- "Full lifecycle analysis..." → methodology: "LCA", boundaries: "full lifecycle"
- "Well-to-Wheel efficiency..." → methodology: "WTW", boundaries: "primary energy to wheel"
- "Tank-to-Wheel only..." → methodology: "TTW", boundaries: "vehicle operation only"
</scope_markers>

## CLAIM DIRECTION PRECISION
<direction_rule>
Be precise about whether each fact SUPPORTS or CONTRADICTS the user's claim:
- User claims: "X is better than Y"
- Source says: "Y outperforms X" → claimDirection: "contradicts"
- Source says: "X exceeds Y" → claimDirection: "supports"
- Source gives background only → claimDirection: "neutral"
</direction_rule>

## QUALITY STANDARDS
<quality_rules>
- Extract 4-6 high-quality facts (not 8 marginal ones)
- Each fact must add unique information
- sourceExcerpt MUST be verbatim or near-verbatim from source (50-200 chars)
- Reject vague facts - prefer specific numbers, dates, named entities
</quality_rules>

## OUTPUT FORMAT
- Return valid JSON with all required fields
- evidenceScope: Include when source defines analytical frame, null otherwise
- contextId: Assign to appropriate AnalysisContext, or "" if general
</claude_optimization>`;
}

export function getAnthropicVerdictVariant(): string {
  return `
<claude_optimization>
## VERDICT GENERATION APPROACH
<thinking_process>
For each AnalysisContext, reason through:
1. What exactly does the USER'S CLAIM state?
2. What does the EVIDENCE show?
3. Do they MATCH (high verdict) or CONTRADICT (low verdict)?
4. How confident am I based on evidence quality and coverage?
</thinking_process>

## CRITICAL: RATING DIRECTION
<rating_rule>
Rate THE USER'S CLAIM truth, NOT your analysis quality:
- User claim: "X is more efficient than Y"
- Evidence shows: Y is more efficient than X
- CORRECT verdict: 0-14% (FALSE) - the claim is wrong
- WRONG verdict: 86-100% - this would rate how well you analyzed, not whether claim is true
</rating_rule>

## VERDICT CALIBRATION
<calibration>
Trust your judgment and be decisive:
- Evidence clearly supports claim → 86-100% (TRUE band)
- Evidence mostly supports with minor caveats → 72-85% (MOSTLY TRUE)
- Evidence clearly contradicts claim → 0-14% (FALSE band)
- Evidence mostly contradicts → 15-28% (MOSTLY FALSE)
- Genuinely balanced/ambiguous → 43-57% (MIXED/UNVERIFIED)

Do NOT over-hedge. If evidence is clear, be confident.
</calibration>

## ANALYSISCONTEXT ISOLATION
<scope_rule>
Analyze each AnalysisContext INDEPENDENTLY:
- Facts from Context A cannot support verdict in Context B
- Different AnalysisContexts may have different verdicts - that's normal
- Never average or combine cross-context verdicts
</scope_rule>

## CONTESTATION ASSESSMENT
<contestation_rule>
Distinguish genuine contestation from mere disagreement:
- factualBasis = "established": Documented counter-evidence (audits, reports, data)
- factualBasis = "disputed": Some factual counter-evidence, debatable
- factualBasis = "opinion": No factual counter-evidence, just claims/rhetoric
- Mere political disagreement without evidence → "opinion"
</contestation_rule>

## OUTPUT CONSISTENCY
<consistency_check>
Before finalizing, verify:
- Answer percentage matches reasoning conclusion
- If reasoning says "evidence shows X was NOT fair", answer for "X was fair" must be 0-28%
- shortAnswer must align with answer percentage
- No conflicting signals between fields
</consistency_check>
</claude_optimization>`;
}

export function getAnthropicScopeRefinementVariant(): string {
  return `
<claude_optimization>
## SCOPE REFINEMENT APPROACH
<thinking_process>
Work through these questions:
1. What distinct analytical frames are ACTUALLY PRESENT in the evidence?
2. Is each proposed AnalysisContext DIRECTLY RELEVANT to the input topic?
3. Is each AnalysisContext supported by at least one fact?
4. Am I creating AnalysisContexts from evidence, not background knowledge?
</thinking_process>

## ANALYSISCONTEXT VS NON-CONTEXT DISTINCTION
<distinction_rules>
CREATE separate scopes for:
- Different methodological boundaries (WTW vs TTW - incompatible measurements)
- Different legal/procedural processes (TSE vs SCOTUS - different institutions)
- Different regulatory frameworks (EU REACH vs US EPA - different standards)

DO NOT create separate scopes for:
- Different viewpoints/perspectives (pro vs con on same matter)
- Different source types (expert quotes vs statistics)
- Narrative framings (political vs technical framing)
- Incidental geographic/temporal mentions (unless they define distinct frames)
</distinction_rules>

## METADATA EXTRACTION
<metadata_guidance>
Use your strong comprehension to extract metadata from evidence:
- "Under [framework] methodology..." → methodology: [framework name]
- "The 2020 assessment..." → temporal: "2020"
- "[Institution] ruling..." → institution: [name], level: [Federal/State/etc.]

Ensure metadata reflects ACTUAL EVIDENCE, not your background knowledge.
</metadata_guidance>

## CONSERVATIVE APPROACH
<conservative_rule>
When in doubt, use FEWER scopes:
- Boundary unclear → single context
- Marginal relevance → don't include
- No supporting facts → don't create

Every AnalysisContext MUST be:
1. Directly relevant to input topic
2. Supported by at least one factId
3. Representing a genuinely distinct analytical frame
</conservative_rule>

## OUTPUT REQUIREMENTS
- factScopeAssignments must cover ≥70% of facts
- Each AnalysisContext must have ≥1 fact assigned
- Use "" for unknown metadata fields (not null)
</claude_optimization>`;
}
