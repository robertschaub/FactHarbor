/**
 * Supplemental prompts for ORCHESTRATED pipeline
 *
 * These prompts handle:
 * - Adding missing claims to under-covered AnalysisContexts
 * - Re-evaluating AnalysisContext detection when initial pass under-splits
 * - Extracting outcome-related claims from research evidence items
 *
 * @version 2.8.0 - Extracted from analyzer.ts inline prompts
 */

export interface SupplementalClaimsVariables {
  minCoreClaimsPerContext: number;
  hasScopes: boolean;
}

/**
 * Get prompt for requesting supplemental subclaims for under-covered AnalysisContexts
 */
export function getSupplementalClaimsPrompt(variables: SupplementalClaimsVariables): string {
  const { minCoreClaimsPerContext, hasScopes } = variables;

  return `You are a verification assistant. Add missing subClaims ONLY for the listed AnalysisContexts.

## TASK
Generate additional claims for AnalysisContexts that don't have enough coverage.

## RULES
- Return ONLY new claims (do not repeat existing ones)
- Each claim must be tied to a single AnalysisContext via contextId${hasScopes ? "" : ". Use an empty string if no AnalysisContexts are listed."}
- Use claimRole="core" and checkWorthiness="high"
- Set thesisRelevance="direct" for ALL supplemental claims you generate
- Set harmPotential and centrality realistically
- Default centrality to "medium" unless the claim is truly the primary thesis of that AnalysisContext
- Set isCentral=true if centrality==="high"
- Use dependsOn=[] unless a dependency is truly required
- Ensure each listed AnalysisContext reaches at least ${minCoreClaimsPerContext} core claims

## CRITICAL: OUTCOME CLAIMS
If specific outcomes, penalties, or consequences are mentioned (e.g., an N-year term, a monetary fine, a time-bound ban), create a SEPARATE claim evaluating whether that specific outcome was fair, proportionate, or appropriate.

## OUTPUT FORMAT
Return JSON with:
{
  "subClaims": [
    {
      "id": "SC...",
      "text": "...",
      "type": "factual|evaluative",
      "claimRole": "core",
      "centrality": "high|medium|low",
      "isCentral": true|false,
      "checkWorthiness": "high",
      "harmPotential": "high|medium|low",
      "dependsOn": [],
      "thesisRelevance": "direct",
      "contextId": "CTX_..."
    }
  ]
}`;
}

/**
 * Get prompt for requesting supplemental AnalysisContext detection
 */
export function getSupplementalContextsPrompt(): string {
  return `You are a verification assistant.

## TASK
Detect whether the input contains multiple distinct AnalysisContexts that should be analyzed separately.

## OUTPUT FORMAT
Return ONLY a single JSON object with keys:
- analysisContexts: array
- requiresSeparateAnalysis: boolean

## ANALYSISCONTEXT DETECTION RULES

**SPLIT when there are clearly 2+ distinct AnalysisContexts:**
- Different events, phases, or timelines
- Different institutions or formal bodies
- Different processes or proceedings
- Different analytical methodologies/boundaries

**NOT DISTINCT ANALYSISCONTEXTS:**
- Different perspectives on the same event
- Pro vs con viewpoints on a single topic
- Different stakeholder opinions on one matter

## ANALYSISCONTEXT RELEVANCE REQUIREMENT (CRITICAL)
- Every AnalysisContext MUST be directly relevant to the SPECIFIC TOPIC of the input
- Do NOT include AnalysisContexts from unrelated domains just because they share a general category
- When in doubt, use fewer AnalysisContexts rather than including marginally relevant ones
- An AnalysisContext with zero relevant claims/evidence should NOT exist

**SAME SUBJECT/ENTITY RULE**:
- AnalysisContexts MUST be about the SAME SUBJECT as the thesis
- If thesis is about "Person A's trial", do NOT include AnalysisContexts about Person B, C, etc.
- Different cases involving DIFFERENT PEOPLE are NOT relevant AnalysisContexts
- **THIRD-PARTY REACTIONS WITH LOW PROBATIVE VALUE ARE NOISE**: Third-party reactions are only valid if they provide high or medium probativeValue evidence directly about X. Low probativeValue or mere reactions are NOISE

## SCHEMA
Each analysisContexts item must include:
- id (string): CTX_SHORTCODE format
- name (string): Descriptive name
- shortName (string): Max 12 characters
- subject (string): What's being analyzed
- temporal (string): Time period
- status ("concluded"|"ongoing"|"pending"|"unknown")
- outcome (string): Result or ""
- assessedStatement (string): What is being assessed in this AnalysisContext (Assessment MUST summarize assessment of THIS)
- metadata (object): Domain-specific fields (institution, methodology, boundaries, geographic, etc.)

Use empty strings "" and empty arrays [] when unknown.

## DECISION GUIDE
- If only 1 AnalysisContext exists → return empty array or 1-item array with requiresSeparateAnalysis=false
- If 2+ distinct AnalysisContexts exist → return full array with requiresSeparateAnalysis=true`;
}

/**
 * Get prompt for extracting outcome claims from research evidence items
 */
export function getOutcomeClaimsExtractionPrompt(): string {
  return `You are a verification assistant.

## TASK
Review the discovered evidence items and extract any OUTCOME-RELATED claims that weren't in the original input but should be evaluated.

## OUTCOME CLAIMS TO EXTRACT
Look for specific outcomes mentioned in evidence items:
- Sentences/penalties (e.g., "8-year ineligibility", "$1M fine")
- Rulings/decisions (e.g., "conviction upheld", "appeal denied")
- Quantitative impacts (e.g., "10,000 jobs lost", "30% efficiency gain")

## OUTPUT FORMAT
Return JSON with:
{
  "outcomesClaims": [
    {
      "id": "SC...",
      "text": "The [specific outcome] was proportionate/appropriate/justified",
      "type": "evaluative",
      "claimRole": "core",
      "centrality": "high",
      "isCentral": true,
      "checkWorthiness": "high",
      "harmPotential": "medium|high",
      "dependsOn": [],
      "thesisRelevance": "direct",
      "contextId": "CTX_..."
    }
  ]
}

## RULES
- Only extract outcomes that are SIGNIFICANT to the thesis
- Each outcome gets ONE claim about its appropriateness/proportionality
- Tie claims to the correct AnalysisContext via contextId
- Use evaluative type (these are judgments about outcomes)
- Set thesisRelevance="direct" for all outcome claims`;
}

/**
 * Get provider-optimized supplemental claims prompt
 */
export function getSupplementalClaimsPromptForProvider(
  variables: SupplementalClaimsVariables,
  provider: 'anthropic' | 'openai' | 'google' | 'mistral'
): string {
  const basePrompt = getSupplementalClaimsPrompt(variables);

  switch (provider) {
    case 'anthropic':
      return basePrompt + `

<claude_optimization>
- Be selective about which claims truly need to be added
- Ensure no duplication with existing claims
- Apply strict relevance filtering
</claude_optimization>`;

    case 'openai':
      return basePrompt + `

## GPT GUIDANCE
- Follow the output format exactly
- Ensure all required fields are present
- Use "" for empty strings`;

    case 'google':
      return basePrompt + `

## GEMINI GUIDANCE
- Keep claim text under 150 characters
- Output valid JSON only
- No explanatory text`;

    case 'mistral':
      return basePrompt + `

## MISTRAL GUIDANCE
- Follow the rules step by step
- Validate each claim has all required fields
- Output valid JSON`;

    default:
      return basePrompt;
  }
}

/**
 * Get provider-optimized supplemental AnalysisContexts prompt
 */
export function getSupplementalContextsPromptForProvider(
  provider: 'anthropic' | 'openai' | 'google' | 'mistral'
): string {
  const basePrompt = getSupplementalContextsPrompt();

  switch (provider) {
    case 'anthropic':
      return basePrompt + `

<claude_optimization>
- Use nuanced judgment for AnalysisContext boundary detection
- Be conservative - when in doubt, fewer AnalysisContexts is better
- Ensure metadata reflects evidence, not background knowledge
</claude_optimization>`;

    case 'openai':
      return basePrompt + `

## GPT GUIDANCE
- Follow the schema exactly
- Use "" for unknown metadata fields
- Arrays must be arrays (even empty [])`;

    case 'google':
      return basePrompt + `

## GEMINI GUIDANCE
- shortName max 12 characters
- Keep name under 60 characters
- Valid JSON output only`;

    case 'mistral':
      return basePrompt + `

## MISTRAL GUIDANCE
- Verify against the AnalysisContext detection rules
- Use the checklist before outputting
- Ensure schema compliance`;

    default:
      return basePrompt;
  }
}

