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
- analysisContexts structure: {id, name, type} only

### ANALYSISCONTEXT BOUNDARIES
Maintain clear distinctions:
- Different institutions/processes → separate AnalysisContexts
- Different methodologies → separate AnalysisContexts
- Different perspectives on same matter → NOT separate AnalysisContexts`;
}

export function getGeminiExtractEvidenceVariant(): string {
  return `
## GEMINI OPTIMIZATION - EVIDENCE EXTRACTION

### OUTPUT LENGTH LIMITS (CRITICAL)
| Field | Maximum |
|-------|---------|
| statement (JSON field) | 100 characters |
| sourceExcerpt | 50-200 characters |
| category | exact enum value |

### NUMBERED EXTRACTION PROCESS
1. Read source content completely
2. Identify 4-6 most relevant evidence items
3. For each evidence item:
   a. Write concise statement (≤100 chars)
   b. Copy verbatim excerpt from source (50-200 chars)
   c. Determine if supports/contradicts/neutral to claim
   d. Extract evidenceScope if source defines methodology
4. Count your evidence items (min 3, max 8)
5. Output JSON

### SCHEMA CHECKLIST (Verify before output)
Each evidence item MUST have:
- [ ] id: string (E1, E2, etc.)
- [ ] statement: string (≤100 chars, one sentence)
- [ ] category: "evidence" | "expert_quote" | "statistic" | "event" | "legal_provision" | "criticism"
- [ ] specificity: "high" | "medium" (NEVER "low")
- [ ] sourceExcerpt: string (50-200 chars, verbatim quote)
- [ ] claimDirection: "supports" | "contradicts" | "neutral"
- [ ] contextId: string (AnalysisContext ID or "")
- [ ] evidenceScope: object OR null (NEVER missing/undefined)
- [ ] sourceAuthority: "primary" | "secondary" | "opinion"
- [ ] evidenceBasis: "scientific" | "documented" | "anecdotal" | "theoretical" | "pseudoscientific"

### EVIDENCE SCOPE FORMAT
When source defines analytical frame:
{
  "name": "short label (e.g., Boundary A)",
  "methodology": "standard used (e.g., Standard X)",
  "boundaries": "what's included/excluded",
  "geographic": "region (e.g., Region X)",
  "temporal": "time period (e.g., 2024)"
}
When not defined: null (not {} or missing)

### VERBOSITY PREVENTION
- One sentence per evidence item, no explanations
- Numbers and dates IN the evidence statement
- Avoid repeating information across evidence items`;
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
2. List supporting evidence items (count them)
3. List contradicting evidence items (count them)
4. Compare counts to determine verdict band:
   - More supporting → 72-100%
   - Balanced → 43-57%
   - More contradicting → 0-28%
5. Write reasoning (≤30 words)
6. Write shortAnswer (≤25 words)
7. Generate 3-5 keyFactors

### SCHEMA CHECKLIST
- [ ] contextId matches one from the known AnalysisContexts
- [ ] answer is integer 0-100
- [ ] shortAnswer is complete sentence (≤25 words)
- [ ] keyFactors array has 3-5 items
- [ ] Each keyFactor has: factor (≤12 words), explanation (≤20 words), supports, isContested, contestedBy, factualBasis
- [ ] Use "" for empty strings (NEVER null)
- [ ] supportingEvidenceIds is array (even if empty: [])

### ENUM VALUES (Use exact strings)
- supports: "yes" | "no" | "neutral"
- factualBasis: "established" | "disputed" | "opinion" | "unknown"
- status: "concluded" | "ongoing" | "pending" | "unknown"`;
}

export function getGeminiContextRefinementVariant(): string {
  return `
## GEMINI OPTIMIZATION - CONTEXT REFINEMENT

### LENGTH LIMITS
| Field | Maximum |
|-------|---------|
| name | 60 characters |
| shortName | 12 characters |
| subject | 80 characters |
| outcome | 100 characters |

### NUMBERED REFINEMENT PROCESS
1. Read all evidence items provided
2. Identify potential AnalysisContext boundaries:
   - Methodology markers (different standards, frameworks)
   - Institutional markers (different bodies, agencies)
   - Temporal markers (different time periods, phases)
3. For each potential AnalysisContext, verify:
   - [ ] Directly relevant to input topic?
   - [ ] Supported by ≥1 evidence item?
   - [ ] Genuinely distinct analytical frame?
4. Create only verified AnalysisContexts
5. Assign ALL evidence items to AnalysisContexts
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

evidenceContextAssignments array:
- [ ] Each item: {evidenceId: string, contextId: string}
- [ ] Coverage: ≥70% of evidence items assigned
- [ ] Each AnalysisContext: ≥1 evidence item assigned

### OUTPUT FORMAT
- Use "" for unknown fields (NEVER null for strings)
- metadata must be object {} (not null)
- Arrays must be arrays (not single values)
- Keep all text fields within length limits`;
}
