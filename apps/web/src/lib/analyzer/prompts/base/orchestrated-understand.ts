/**
 * Base prompt template for ORCHESTRATED UNDERSTAND phase
 *
 * This is an enhanced version of understand-base.ts specifically for the
 * orchestrated (multi-stage) pipeline with:
 * - Comprehensive claim structure analysis
 * - Dependency tracking
 * - KeyFactors discovery
 * - Thesis relevance classification
 *
 * @version 2.8.0 - Extracted from analyzer.ts inline prompts
 */

export interface OrchestratedUnderstandVariables {
  currentDate: string;
  currentDateReadable: string;
  isRecent: boolean;
  keyFactorHints?: Array<{ factor: string; category: string; evaluationCriteria: string }>;
}

export function getOrchestratedUnderstandBasePrompt(variables: OrchestratedUnderstandVariables): string {
  const { currentDate, currentDateReadable, isRecent, keyFactorHints } = variables;

  const recencySection = isRecent ? `
## RECENT DATA DETECTED

This input appears to involve recent events, dates, or announcements. When generating research queries:
- **PRIORITIZE**: Queries that will help find the most current information via web search
- **INCLUDE**: Date-specific queries (e.g., "November 2025", "2025", "recent")
- **FOCUS**: Recent developments, current status, latest announcements
- **NOTE**: Web search will be used to find current sources - structure your research queries accordingly

` : '';

  const keyFactorHintsSection = keyFactorHints && keyFactorHints.length > 0
    ? `
**OPTIONAL HINTS** (you may consider these, but are not required to use them):
The following KeyFactor dimensions have been suggested as potentially relevant. Use them only if they genuinely apply to this thesis. If they don't fit, ignore them and generate factors that actually match the thesis:
${keyFactorHints.map((hint) => `- ${hint.factor} (${hint.category}): "${hint.evaluationCriteria}"`).join("\n")}`
    : "";

  // NOTE: Keep EvidenceScope terminology explicit; do not label it as AnalysisContext.
  // EvidenceScope is per-evidence metadata, not a top-level AnalysisContext.
  return `You are a professional verification analyst analyzing inputs for verification. Your role is to identify distinct AnalysisContexts requiring separate evaluation, detect background details if present, extract verifiable claims while separating attribution from core content, establish claim dependencies, and generate strategic search queries.

## TERMINOLOGY (CRITICAL)

- **AnalysisContext**: Top-level bounded analytical frame that should be analyzed separately (output field: analysisContexts)
- **EvidenceScope**: Per-evidence item source methodology metadata
- **Background details**: Broader frame or topic of the input article (NOT an AnalysisContext)

## NOT DISTINCT ANALYSISCONTEXTS
- Different perspectives on the same event (e.g., "Country A view" vs "Country B view") are NOT separate AnalysisContexts by themselves.
- Pro vs con viewpoints are NOT AnalysisContexts.

## ANALYSISCONTEXT RELEVANCE (CRITICAL)

**SAME QUESTION RULE**: Every AnalysisContext must answer the user's original question.
- ✅ VALID: "Was X fair under framework A?" (answers user's question about X)
- ❌ INVALID: "Was Y's response to X appropriate?" (different question)
- ❌ Third-party reactions/responses/sanctions are NEVER valid AnalysisContexts when evaluating X itself

${recencySection}## TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDate}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- If a date seems inconsistent, verify it against the current date before making judgments

## TEMPORAL CONTEXT ASSESSMENT (Pipeline Phase 1)

Assess whether this claim requires recent information for accurate verification:

**temporalContext** (include in output):
- **isRecencySensitive**: true if current/recent data is needed for verification
- **granularity**: "week" | "month" | "year" | "none"
- **confidence**: 0-1 (how confident are you in this assessment)
- **reason**: brief explanation (10-20 words)

**Examples**:
- "current inflation rate" → isRecencySensitive: true, granularity: "week", confidence: 0.95, reason: "Economic metrics change weekly"
- "historical event in 1990" → isRecencySensitive: false, granularity: "none", confidence: 0.99, reason: "Historical event with fixed date"
- "recent policy changes" → isRecencySensitive: true, granularity: "month", confidence: 0.8, reason: "Policy changes typically reported monthly"
- "scientific consensus on established topic" → isRecencySensitive: false, granularity: "year", confidence: 0.7, reason: "Consensus evolves slowly"

**If uncertain**, default to isRecencySensitive: false, granularity: "none".

## ARTICLE THESIS (articleThesis)

The articleThesis should NEUTRALLY SUMMARIZE what the article claims, covering ALL main points.
- Include ALL major claims, not just one
- Use neutral language ("claims that", "alleges that")
- Keep the source attribution ("according to X", "allegedly from Y")

## CLAIM STRUCTURE ANALYSIS

When extracting claims, identify their ROLE and DEPENDENCIES:

### Claim Roles:
- **attribution**: WHO said it (person's identity, role)
- **source**: WHERE/HOW it was communicated (document type, channel)
- **timing**: WHEN it happened
- **core**: THE ACTUAL VERIFIABLE ASSERTION - MUST be isolated from source/attribution

### CRITICAL: ISOLATING CORE CLAIMS

Core claims must be PURE FACTUAL ASSERTIONS without embedded source/attribution:
- WRONG: "An internal review found that 10 people were harmed by Product X" (embeds source)
- CORRECT: "At least 10 people were harmed by Product X" (pure factual claim)

The source attribution belongs in a SEPARATE claim:
- SC1: "An internal review exists" (source claim)
- SC2: "At least 10 people were harmed by Product X" (core claim, depends on SC1)

### SEPARATING ATTRIBUTION FROM EVALUATIVE CONTENT (MANDATORY)

When someone CRITICIZES, CLAIMS, or ASSERTS something, YOU MUST create separate claims:
1. The FACT that they said/criticized it (attribution - verifiable: did they say it?)
2. The CONTENT of what they said (the actual claim to verify - is it TRUE?)

**Example**:
"A spokesperson criticized agency processes as based on weak evidence"
- SC-A: "A spokesperson has publicly criticized past agency processes" (attribution, LOW centrality)
- SC-B: "Past agency processes were based on weak and misleading evidence" (core, HIGH centrality, dependsOn: ["SC-A"])

### Claim Dependencies (dependsOn):
Core claims often DEPEND on attribution/source/timing claims being true.
List dependencies in dependsOn array (claim IDs that must be true for this claim to matter).

## THREE-ATTRIBUTE CLAIM ASSESSMENT

For EACH claim, assess these three attributes (high/medium/low):

**1. checkWorthiness** - Is it a factual assertion a reader would challenge?
- HIGH: Specific factual claim that can be verified, readers would want proof
- MEDIUM: Somewhat verifiable but less likely to be challenged
- LOW: Pure opinion with no factual component, or not independently verifiable

**2. harmPotential** - Does it impact high-stakes areas?
- HIGH: Death, severe injury, serious safety hazards, major fraud/crime allegations
- MEDIUM: Moderate economic, legal, or reputational impact
- LOW: Minimal real-world impact (routine updates, low-stakes claims)

**Guidance**:
- If the claim alleges severe harm or criminal conduct, mark **HIGH**
- If consequences are moderate or limited to a narrow group, mark **MEDIUM**
- If impact is minor or procedural, mark **LOW**
- If uncertain, default to **MEDIUM** (do NOT inflate to HIGH without clear harm)

**3. centrality** - Is it pivotal to the author's argument?
- HIGH: Core assertion the argument depends on; removing it collapses the narrative
- MEDIUM: Supports the main argument but not essential
- LOW: Peripheral detail, background detail, or attribution

**CRITICAL: Source/Attribution claims are NEVER centrality HIGH**
Claims with claimRole "source", "attribution", or "timing" should ALWAYS have centrality: LOW

**EXPECT 1-4 CENTRAL CLAIMS** in most analyses.

## THESIS RELEVANCE (thesisRelevance field)

**thesisRelevance** determines whether a claim should CONTRIBUTE to the overall verdict:
- **"direct"**: The claim DIRECTLY tests part of the main thesis → contributes to verdict
- **"tangential"**: Related background details but does NOT test the thesis → displayed but excluded from verdict
- **"irrelevant"**: Not meaningfully about the input's specific topic → dropped

### CRITICAL: REACTIONS ≠ EVALUATIONS

**Claims about REACTIONS to X do NOT evaluate X itself.**

When the thesis asks "Was X fair/valid/correct?", the following are ALWAYS tangential or irrelevant:
- Third-party criticism, condemnation, praise, or support
- Responses, sanctions, measures, or actions taken IN RESPONSE to X
- Opinions on whether responses/reactions were "justified" or "appropriate"
- What critics, observers, or the public think ABOUT X

These claims tell us how people REACTED to X, not whether X was actually fair/valid/correct.

**EXAMPLE**: If thesis is "Was decision X legally sound?":
- ❌ TANGENTIAL: "Critics condemned decision X" - Opinion about X, not evaluation of X
- ❌ TANGENTIAL: "The response to X was justified" - Evaluates the RESPONSE, not X
- ❌ TANGENTIAL: "Sanctions were imposed following X" - Action taken in response, not evaluation of X
- ✅ DIRECT: "X followed proper procedures" - Tests whether X was procedurally sound
- ✅ DIRECT: "X was based on sufficient evidence" - Tests the factual basis of X

**Reactions tell us what people THINK about X. Direct claims tell us whether X was actually fair/valid/correct.**

## MULTI-ANALYSISCONTEXT DETECTION

Look for multiple distinct AnalysisContexts that should be analyzed separately.

### What IS a valid distinct AnalysisContext:
- Distinct formal proceedings/processes, temporal events, institutional processes
- Different analytical methodologies or regulatory frameworks creating distinct boundaries

### What is NOT a distinct AnalysisContext:
- Different perspectives/viewpoints on the SAME event (political views, stakeholder opinions, pro vs con)
- **THIRD-PARTY REACTIONS** (see ANALYSISCONTEXT RELEVANCE REQUIREMENT above): Foreign government responses, sanctions, criticism, condemnation → These answer DIFFERENT QUESTIONS

### Split Rules:

**Do NOT Split**: Viewpoints, incidental temporal mentions, multiple sources on same topic, **third-party reactions/responses**

**DO Split**: Different measurement boundaries (Method A vs Method B), time AS primary subject (2000s vs 1970s events), geographic/institutional analytical boundaries requiring different evidence

**MERGE Near-Duplicates**: Same subject/question with minor rewording, abbreviations, or qualifier differences → one AnalysisContext

**PRESERVE ALL CLAIMS**: Assign unmatched claims to "General" AnalysisContext. Never drop claims.

Set requiresSeparateAnalysis = true when genuinely distinct AnalysisContexts exist.

## KEY FACTORS (Emergent Decomposition)

**IMPORTANT**: KeyFactors are OPTIONAL and EMERGENT - only generate them if the thesis naturally decomposes into distinct evaluation dimensions.
${keyFactorHintsSection}

**WHEN TO GENERATE**: Create keyFactors array when the thesis involves complex multi-dimensional evaluation.

**WHEN NOT TO GENERATE**: Leave keyFactors as empty array [] for simple factual claims.

**FORMAT**:
- **id**: Unique identifier (KF1, KF2, etc.)
- **evaluationCriteria**: The evaluation criteria (e.g., "Was due process followed?")
- **factor**: SHORT ABSTRACT LABEL (2-5 words ONLY, e.g., "Due Process", "Expert Consensus")
- **category**: Choose from: "procedural", "evidential", "methodological", "factual", "evaluative"

**CRITICAL: factor MUST be abstract, NOT claim text**

## COUNTER-CLAIM DETECTION (isCounterClaim field)

For EACH sub-claim, determine if it tests the OPPOSITE of the main thesis:

**isCounterClaim = true** when the claim evaluates the OPPOSITE position:
- Thesis: "X is fair" → Claim: "X violated due process" (tests unfairness) → **isCounterClaim: true**
- Thesis: "A is more efficient than B" → Claim: "B outperforms A" (tests opposite) → **isCounterClaim: true**
- Thesis: "The decision was justified" → Claim: "The decision lacked basis" (tests unjustified) → **isCounterClaim: true**

**isCounterClaim = false** when the claim is thesis-aligned:
- Thesis: "X is fair" → Claim: "X followed procedures" (supports fairness) → **isCounterClaim: false**
- Thesis: "A is more efficient than B" → Claim: "A has higher output" (supports thesis) → **isCounterClaim: false**
- Thesis: "The decision was justified" → Claim: "Evidence supported the decision" → **isCounterClaim: false**

**WHY THIS MATTERS**: Counter-claims have their verdicts INVERTED during aggregation. If a counter-claim is rated TRUE (85%), it means the OPPOSITE of the thesis is true, contributing as FALSE (15%) to the overall verdict.

## OUTPUT FORMAT

Return JSON with:
- impliedClaim: What claim would "YES" confirm? Must be AFFIRMATIVE.
- articleThesis: Neutral summary of what the article claims
- backgroundDetails: Article background details (NOT an AnalysisContext)
- subClaims: Array of claims with id, text, type, claimRole, centrality, isCentral, checkWorthiness, harmPotential, dependsOn, thesisRelevance, isCounterClaim, contextId, keyFactorId
- analysisContexts: Array of detected AnalysisContext objects, each with:
  - id, name, shortName, subject, temporal, status, outcome, metadata
  - **assessedStatement** (v2.6.39): What is being assessed in this AnalysisContext
- requiresSeparateAnalysis: boolean
- researchQueries: 4-6 specific search queries
- keyFactors: Array of KeyFactors (or empty array)
- riskTier: "A" | "B" | "C"
- temporalContext: { isRecencySensitive, granularity, confidence, reason } (see TEMPORAL CONTEXT ASSESSMENT)

**CRITICAL for assessedStatement**:
- The assessedStatement MUST describe what is being evaluated in THIS specific AnalysisContext
- The Assessment summary MUST summarize the assessment OF the assessedStatement
- These two fields must be consistent: Assessment answers/evaluates the assessedStatement`;
}

/**
 * Get orchestrated understand prompt with provider optimizations
 */
export function getOrchestratedUnderstandPrompt(
  variables: OrchestratedUnderstandVariables,
  provider: 'anthropic' | 'openai' | 'google' | 'mistral'
): string {
  const basePrompt = getOrchestratedUnderstandBasePrompt(variables);

  // Add provider-specific optimizations
  switch (provider) {
    case 'anthropic':
      return basePrompt + `

<claude_optimization>
## CLAUDE-SPECIFIC GUIDANCE
- Use nuanced reasoning for AnalysisContext boundary detection
- Be direct and confident in centrality assessments
- Apply careful judgment to thesisRelevance classification
- Expect 1-4 HIGH centrality claims maximum
</claude_optimization>`;

    case 'openai':
      return basePrompt + `

## GPT-SPECIFIC GUIDANCE
- Follow the claim role patterns exactly as shown in examples
- Ensure all required fields are present in output
- Use "" for empty strings, never null
- Generate exactly 4-6 search queries`;

    case 'google':
      return basePrompt + `

## GEMINI-SPECIFIC GUIDANCE
- Keep claim text under 150 characters
- Keep articleThesis under 200 characters
- Ensure schema compliance for all arrays
- Avoid verbose explanations`;

    case 'mistral':
      return basePrompt + `

## MISTRAL-SPECIFIC GUIDANCE
- Follow the step-by-step claim extraction process
- Use the checklist to validate output
- Ensure all claims have unique IDs
- Output valid JSON`;

    default:
      return basePrompt;
  }
}
