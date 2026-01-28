/**
 * Budget mode adaptations for LLM tiering configuration
 *
 * When FH_LLM_TIERING=on with cheaper/faster models (Haiku, Flash, Mini):
 * - Ultra-simplified instructions (minimize token count)
 * - Single concrete example per task
 * - Direct field mapping, no verbose explanations
 * - Skip complex reasoning in favor of pattern matching
 *
 * @version 2.8.0 - Optimized for ~40% token reduction vs full prompts
 */

export function getTieringUnderstandAdaptation(): string {
  return `
## FAST MODE

**Task**: Extract claims, generate queries. Skip complex reasoning.

**Example**:
Input: "Expert X says Y is harmful"
Output: 2 claims
1. {id: "SC1", text: "Expert X made statements about Y", claimRole: "attribution", centrality: "low"}
2. {id: "SC2", text: "Y is harmful", claimRole: "core", centrality: "high"}

**Rules**:
- Separate WHO SAID from WHAT THEY SAID
- Only 1-2 claims = "high" centrality
- Generate 4 queries (2 supporting, 2 contradicting)
- Output valid JSON`;
}

export function getTieringExtractFactsAdaptation(): string {
  return `
## FAST MODE

**Task**: Extract 4-6 facts from source. Simple rules.

**Per fact**:
- fact: one sentence, ≤100 chars // Legacy field name for extracted statement
- category: evidence|expert_quote|statistic|event|legal_provision|criticism
  // NOTE: "evidence" is legacy value, system also accepts "direct_evidence"
- specificity: high (has numbers/dates) or medium
- sourceExcerpt: 50-200 chars verbatim
- claimDirection: supports|contradicts|neutral
- contextId: AnalysisContext ID or ""
- evidenceScope: null (skip unless obvious)

**Direction rule**:
- Fact agrees with user claim → "supports"
- Fact disagrees with user claim → "contradicts"
- Just context → "neutral"`;
}

export function getTieringVerdictAdaptation(): string {
  return `
## FAST MODE

**Process**:
1. Count supporting facts
2. Count contradicting facts
3. Pick verdict band:
   - More supporting → 72-100%
   - Balanced → 43-57%
   - More contradicting → 0-28%
4. Write 1-2 sentence reasoning

**Critical**: Rate THE CLAIM truth, not analysis quality.
- Claim: "X is better" + Evidence: "Y is better" → 0-28% (claim is FALSE)

**Output**:
- answer: 0-100 integer
- shortAnswer: 1 sentence
- keyFactors: 3 simple items
- Use "" for empty strings`;
}

/**
 * Get simplified base prompt for budget models
 * Strips verbose sections from full prompts for faster processing
 */
export function getBudgetUnderstandPrompt(currentDate: string): string {
  return `You are a fact-checker. Extract claims and generate search queries.

Date: ${currentDate}

## TASK
1. Extract claims from input
2. Separate WHO SAID (attribution) from WHAT THEY SAID (core)
3. Mark 1-2 claims as "high" centrality (the main verifiable assertions)
4. Generate 4-6 search queries

## OUTPUT (JSON)
{
  "impliedClaim": "neutral summary of input",
  "articleThesis": "what input asserts",
  "subClaims": [{"id": "SC1", "text": "...", "claimRole": "core|attribution|source|timing", "centrality": "high|medium|low", "isCentral": true/false, "dependsOn": []}],
  "researchQueries": ["query1", "query2", ...],
  "detectedScopes": [],
  "requiresSeparateAnalysis": false
}`;
}

export function getBudgetExtractFactsPrompt(currentDate: string, originalClaim: string): string {
  return `You extract facts from sources. Date: ${currentDate}

CLAIM TO VERIFY: ${originalClaim}

## TASK
Extract 4-6 specific, verifiable facts from the source.

## PER FACT
- fact: one sentence (≤100 chars) // Legacy field name
- category: evidence|expert_quote|statistic|event|legal_provision|criticism
  // NOTE: "evidence" is legacy, "direct_evidence" also accepted
- specificity: high|medium
- sourceExcerpt: verbatim quote (50-200 chars)
- claimDirection: supports|contradicts|neutral (relative to user's claim)
- contextId: "" (or AnalysisContext ID if known)
- evidenceScope: null

## OUTPUT (JSON)
{"facts": [{...}, {...}]}`;
}

export function getBudgetVerdictPrompt(currentDate: string, originalClaim: string, allowModelKnowledge: boolean): string {
  const knowledgeMode = allowModelKnowledge
    ? `
## KNOWLEDGE MODE: Use your training data
- If you know facts from training data, use them
- Don't mark as "neutral" if you know the answer`
    : `
## EVIDENCE-ONLY MODE: Use ONLY provided facts
- Do NOT use your training data
- If not in provided facts → mark "neutral"`;

  return `You generate verdicts. Date: ${currentDate}

CLAIM: ${originalClaim}
${knowledgeMode}

## CRITICAL RULE
Rate THE CLAIM truth (not your analysis quality).
- Claim says X, evidence shows opposite → LOW verdict (0-28%)
- Claim says X, evidence confirms → HIGH verdict (72-100%)

## PROCESS
1. Count supporting facts
2. Count contradicting facts  
3. Assign percentage:
   - More support → 72-100%
   - Balanced → 43-57%
   - More contradict → 0-28%

## OUTPUT (JSON)
{
  "contextId": "CTX_MAIN",
  "answer": 0-100,
  "confidence": 0-100,
  "shortAnswer": "one sentence",
  "keyFactors": [{"factor": "...", "explanation": "...", "supports": "yes|no|neutral", "isContested": false, "contestedBy": "", "factualBasis": "established|disputed|opinion|unknown"}]
}`;
}
