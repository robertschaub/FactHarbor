/**
 * Google Gemini-specific prompt optimizations
 *
 * Optimizations for Gemini (Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0):
 * - Explicit word/character limits (Gemini tends toward verbosity)
 * - Schema field checklists before output
 * - Numbered steps for multi-part tasks
 * - Large context window utilization
 * - Grounding metadata support when enabled
 *
 * @version 2.8.0 - Enhanced with strict length limits and verbosity prevention
 */

export function getGeminiUnderstandVariant(): string {
  return `
## GEMINI OPTIMIZATION

### OUTPUT LENGTH LIMITS (MUST FOLLOW)
| Field | Maximum |
|-------|---------|
| impliedClaim | 150 characters |
| articleThesis | 200 characters |
| claim text | 150 characters |
| search query | 80 characters |

### SCHEMA COMPLIANCE CHECKLIST
Before outputting, verify each claim has:
- [ ] id: string (SC1, SC2, etc.)
- [ ] text: string (≤150 chars)
- [ ] claimRole: "attribution" | "source" | "timing" | "core"
- [ ] centrality: "high" | "medium" | "low"
- [ ] isCentral: boolean
- [ ] checkWorthiness: "high" | "medium" | "low"
- [ ] harmPotential: "high" | "medium" | "low"
- [ ] dependsOn: array of claim IDs (or empty [])

### NUMBERED PROCESS
1. Read input completely
2. Identify claim type (statement vs article)
3. Extract claims from input
4. Assess centrality (expect 1-4 HIGH max)
5. Detect AnalysisContext boundaries if present
6. Generate 4-6 search queries
7. Output JSON

### AVOID VERBOSITY
- Keep all text fields concise
- No explanatory prose in output
- Use short phrases, not sentences where possible
- detectedScopes structure: {id, name, type} only

### CONTEXT BOUNDARIES
Maintain clear distinctions:
- Different institutions/processes → separate contexts
- Different methodologies → separate contexts
- Different perspectives on same matter → NOT separate contexts`;
}

export function getGeminiExtractFactsVariant(): string {
  return `
## GEMINI OPTIMIZATION - FACT EXTRACTION

### OUTPUT LENGTH LIMITS (CRITICAL)
| Field | Maximum |
|-------|---------|
| fact | 100 characters |
| sourceExcerpt | 50-200 characters |
| category | exact enum value |

### NUMBERED EXTRACTION PROCESS
1. Read source content completely
2. Identify 4-6 most relevant facts
3. For each fact:
   a. Write concise statement (≤100 chars)
   b. Copy verbatim excerpt from source (50-200 chars)
   c. Determine if supports/contradicts/neutral to claim
   d. Extract evidenceScope if source defines methodology
4. Count your facts (min 3, max 8)
5. Output JSON

### SCHEMA CHECKLIST (Verify before output)
Each fact MUST have:
- [ ] id: string (F1, F2, etc.)
- [ ] fact: string (≤100 chars, one sentence) // Legacy field name for extracted statement
- [ ] category: "evidence" | "expert_quote" | "statistic" | "event" | "legal_provision" | "criticism"
  // NOTE: "evidence" is legacy value, type system also accepts "direct_evidence" (Phase 1.5 will migrate prompts)
- [ ] specificity: "high" | "medium" (NEVER "low")
- [ ] sourceExcerpt: string (50-200 chars, verbatim quote)
- [ ] claimDirection: "supports" | "contradicts" | "neutral"
- [ ] contextId: string (AnalysisContext ID or "")
- [ ] evidenceScope: object OR null (NEVER missing/undefined)

### EVIDENCE SCOPE FORMAT
When source defines analytical frame:
{
  "name": "short label (e.g., WTW)",
  "methodology": "standard used (e.g., ISO 14040)",
  "boundaries": "what's included/excluded",
  "geographic": "region (e.g., EU, USA)",
  "temporal": "time period (e.g., 2024)"
}
When not defined: null (not {} or missing)

### VERBOSITY PREVENTION
- One sentence per fact, no explanations
- Numbers and dates IN the fact statement
- Avoid repeating information across facts`;
}

export function getGeminiVerdictVariant(): string {
  return `
## GEMINI OPTIMIZATION - VERDICT GENERATION

### STRICT LENGTH LIMITS (COUNT WORDS BEFORE OUTPUT)
| Field | Maximum |
|-------|---------|
| keyFactors.factor | 12 words |
| keyFactors.explanation | 20 words |
| claimVerdicts.reasoning | 30 words |
| shortAnswer | 25 words |

### RATING DIRECTION VERIFICATION (CRITICAL)
Before each verdict, answer these 4 questions:
1. What does the USER's claim state? → Write it down
2. What does the EVIDENCE show? → Summarize key points
3. Do they MATCH or CONTRADICT? → Decide clearly
4. Verdict = match percentage (NOT analysis quality)

**Example:**
- User claim: "X is more efficient than Y"
- Evidence shows: Y is more efficient
- Match: CONTRADICT → Low verdict (0-28%)

### NUMBERED VERDICT PROCESS
For each AnalysisContext:
1. Identify user's claim for this AnalysisContext
2. List supporting facts (count them)
3. List contradicting facts (count them)
4. Compare counts to determine verdict band:
   - More supporting → 72-100%
   - Balanced → 43-57%
   - More contradicting → 0-28%
5. Write reasoning (≤30 words)
6. Write shortAnswer (≤25 words)
7. Generate 3-5 keyFactors

### SCHEMA CHECKLIST
- [ ] contextId matches one from the known contexts
- [ ] answer is integer 0-100
- [ ] shortAnswer is complete sentence (≤25 words)
- [ ] keyFactors array has 3-5 items
- [ ] Each keyFactor has: factor (≤12 words), explanation (≤20 words), supports, isContested, contestedBy, factualBasis
- [ ] Use "" for empty strings (NEVER null)
- [ ] supportingFactIds is array (even if empty: [])

### ENUM VALUES (Use exact strings)
- supports: "yes" | "no" | "neutral"
- factualBasis: "established" | "disputed" | "opinion" | "unknown"
- status: "concluded" | "ongoing" | "pending" | "unknown"`;
}

export function getGeminiScopeRefinementVariant(): string {
  return `
## GEMINI OPTIMIZATION - SCOPE REFINEMENT

### LENGTH LIMITS
| Field | Maximum |
|-------|---------|
| name | 60 characters |
| shortName | 12 characters |
| subject | 80 characters |
| outcome | 100 characters |

### NUMBERED REFINEMENT PROCESS
1. Read all facts provided
2. Identify potential context boundaries:
   - Methodology markers (different standards, frameworks)
   - Institutional markers (different bodies, agencies)
   - Temporal markers (different time periods, phases)
3. For each potential AnalysisContext, verify:
   - [ ] Directly relevant to input topic?
   - [ ] Supported by ≥1 fact?
   - [ ] Genuinely distinct analytical frame?
4. Create only verified scopes
5. Assign ALL facts to scopes
6. Output JSON

### SCHEMA CHECKLIST
analysisContexts array - each item must have:
- [ ] id: string (CTX_XXX format)
- [ ] name: string (≤60 chars)
- [ ] shortName: string (≤12 chars)
- [ ] subject: string (≤80 chars)
- [ ] temporal: string
- [ ] status: "concluded" | "ongoing" | "pending" | "unknown"
- [ ] outcome: string (≤100 chars)
- [ ] metadata: object (can be {})

factScopeAssignments array:
- [ ] Each item: {factId: string, contextId: string}
- [ ] Coverage: ≥70% of facts assigned
- [ ] Each context: ≥1 fact assigned

### OUTPUT FORMAT
- Use "" for unknown fields (NEVER null for strings)
- metadata must be object {} (not null)
- Arrays must be arrays (not single values)
- Keep all text fields within length limits`;
}

/** Primary name for getting Gemini context refinement variant */
export const getGeminiContextRefinementVariant = getGeminiScopeRefinementVariant;
