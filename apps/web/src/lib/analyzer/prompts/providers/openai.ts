/**
 * OpenAI GPT-specific prompt optimizations
 *
 * Optimizations for GPT (GPT-4o, GPT-4o-mini, GPT-4 Turbo):
 * - Few-shot examples (GPT excels when shown patterns)
 * - Explicit field enumeration for schema compliance
 * - Bullet lists over paragraphs
 * - Compensate for tendency to be overly balanced
 * - JSON mode hints for structured output
 *
 * @version 2.8.0 - Enhanced with comprehensive few-shot examples
 */

export function getOpenAIUnderstandVariant(): string {
  return `
## GPT OPTIMIZATION

### FEW-SHOT EXAMPLES (Follow these patterns exactly)

**Example 1 - Attribution Separation:**
Input: "The WHO spokesperson stated that the new variant is more transmissible"
Output:
{
  "subClaims": [
    {
      "id": "SC1",
      "text": "A WHO spokesperson made a public statement about variant transmissibility",
      "claimRole": "attribution",
      "centrality": "low",
      "isCentral": false,
      "checkWorthiness": "low",
      "harmPotential": "low",
      "dependsOn": []
    },
    {
      "id": "SC2",
      "text": "The new variant is more transmissible than previous variants",
      "claimRole": "core",
      "centrality": "high",
      "isCentral": true,
      "checkWorthiness": "high",
      "harmPotential": "medium",
      "dependsOn": ["SC1"]
    }
  ],
  "detectedScopes": [],
  "requiresSeparateAnalysis": false
}

**Example 2 - Multi-Scope Detection:**
Input: "The TSE court in Brazil ruled he was ineligible, while SCOTUS in the US ruled differently on ballot access"
Output:
{
  "detectedScopes": [
    {"id": "CTX_TSE", "name": "Brazil TSE Electoral Ruling", "type": "legal"},
    {"id": "CTX_SCOTUS", "name": "USA SCOTUS Ballot Access Ruling", "type": "legal"}
  ],
  "requiresSeparateAnalysis": true
}

### REQUIRED OUTPUT FIELDS (All must be present)
- impliedClaim: string (neutral summary)
- articleThesis: string (what input asserts)
- analysisContext: string (ArticleFrame or "")
- subClaims: array with id, text, claimRole, centrality, isCentral, checkWorthiness, harmPotential, dependsOn
- researchQueries: array of 4-6 distinct search strings
- detectedScopes: array (can be empty)
- requiresSeparateAnalysis: boolean

### RULES TO FOLLOW
1. Separate WHO SAID from WHAT THEY SAID (attribution vs core)
2. Only 1-4 claims should have "high" centrality
3. Generate 4-6 DISTINCT search queries (no redundancy)
4. Look for jurisdiction/methodology differences for scope detection
5. Use "" for empty strings, never null

Now analyze the input following these exact patterns.`;
}

export function getOpenAIExtractFactsVariant(): string {
  return `
## GPT OPTIMIZATION - FACT EXTRACTION

### FEW-SHOT EXAMPLE (Follow this pattern)

**Example - Fact with Full EvidenceScope:**
{
  "facts": [
    {
      "id": "F1",
      "fact": "Technology A achieves 40% full-cycle efficiency",
      "category": "statistic",
      "specificity": "high",
      "sourceExcerpt": "The full-cycle efficiency of Technology A is approximately 40%",
      "claimDirection": "contradicts",
      "contextId": "CTX_FULL",
      "evidenceScope": {
        "name": "Full-Cycle",
        "methodology": "End-to-end analysis",
        "boundaries": "Primary production through final operation",
        "geographic": "Region X",
        "temporal": "2024"
      }
    },
    {
      "id": "F2",
      "fact": "Technology B achieves 77% full-cycle efficiency",
      "category": "statistic",
      "specificity": "high",
      "sourceExcerpt": "Technology B demonstrates full-cycle efficiency of approximately 77%",
      "claimDirection": "supports",
      "contextId": "CTX_FULL",
      "evidenceScope": {
        "name": "Full-Cycle",
        "methodology": "End-to-end analysis",
        "boundaries": "Primary production through final operation",
        "geographic": "Region X",
        "temporal": "2024"
      }
    }
  ]
}

### REQUIRED FIELDS PER FACT
- id: string (F1, F2, etc.)
- fact: string (one sentence, under 100 chars preferred)
- category: "evidence" | "expert_quote" | "statistic" | "event" | "legal_provision" | "criticism"
- specificity: "high" | "medium" (never "low")
- sourceExcerpt: string (50-200 chars, verbatim from source)
- claimDirection: "supports" | "contradicts" | "neutral"
- contextId: string (scope ID or "")
- evidenceScope: object with name, methodology, boundaries, geographic, temporal (or null if not defined)

### CLAIM DIRECTION RULES
- User claims "X is better than Y" + Source says "Y outperforms X" → "contradicts"
- User claims "X is better than Y" + Source says "X exceeds Y" → "supports"
- Source provides background only → "neutral"

### OUTPUT FORMAT
- Use "" for empty strings, NEVER null for string fields
- evidenceScope: Include full object when source defines analytical frame, null otherwise
- Extract 4-6 high-quality facts (quality over quantity)
- Each fact must be independently verifiable`;
}

export function getOpenAIVerdictVariant(): string {
  return `
## GPT OPTIMIZATION - VERDICT GENERATION

### CRITICAL: RATING DIRECTION EXAMPLES

**Example 1 - Correct Rating:**
- User claim: "Technology A is MORE efficient than Technology B"
- Evidence shows: Technology B is 77% efficient, Technology A is 40% efficient
- CORRECT verdict: 5-15% (FALSE) - the user's claim is wrong
- WRONG verdict: 85-95% - this would rate analysis quality, not claim truth

**Example 2 - Correct Rating:**
- User claim: "The proceeding followed proper procedures"
- Evidence shows: Multiple procedural violations documented
- CORRECT verdict: 10-25% (MOSTLY FALSE) - claim contradicts evidence
- WRONG verdict: 75-90% - this would confuse "we found evidence" with "claim is true"

### VERDICT CALIBRATION TABLE
| Evidence Pattern | Verdict Range |
|-----------------|---------------|
| 3+ supporting, 0 counter-evidence | 80-95% (TRUE/MOSTLY TRUE) |
| 2-3 supporting, 1 counter-evidence | 65-79% (LEANING TRUE) |
| Balanced evidence | 43-57% (MIXED) |
| 1 supporting, 2-3 counter-evidence | 21-35% (LEANING FALSE) |
| 0-1 supporting, 3+ counter-evidence | 5-20% (FALSE/MOSTLY FALSE) |

Do NOT artificially center at 50%. If evidence is clear, be decisive.

### REQUIRED FIELDS PER VERDICT
- contextId: string (must match scope ID from list)
- answer: number 0-100 (truth percentage of USER'S CLAIM)
- confidence: number 0-100
- shortAnswer: string (complete sentence)
- keyFactors: array of 3-5 objects with:
  - factor: string (max 12 words)
  - explanation: string (max 20 words)
  - supports: "yes" | "no" | "neutral"
  - isContested: boolean
  - contestedBy: string (specific group or "")
  - factualBasis: "established" | "disputed" | "opinion" | "unknown"

### SCHEMA COMPLIANCE
- Use "" for empty strings, NEVER null
- supportingFactIds must be array (even if empty: [])
- Ensure contextId matches one from scopesList
- factualBasis = "established" ONLY if documented counter-evidence exists`;
}

export function getOpenAIScopeRefinementVariant(): string {
  return `
## GPT OPTIMIZATION - SCOPE REFINEMENT

### FEW-SHOT EXAMPLE

**Input:** Facts about Technology A vs Technology B efficiency from multiple studies
**Output:**
{
  "requiresSeparateAnalysis": true,
  "analysisContexts": [
    {
      "id": "CTX_FULL",
      "name": "Full-Cycle Efficiency Analysis",
      "shortName": "FULL",
      "subject": "Complete process chain efficiency comparison",
      "temporal": "2020-2024",
      "status": "concluded",
      "outcome": "Studies show efficiency differences",
      "metadata": {
        "methodology": "Well-to-Wheel",
        "boundaries": "Primary energy to vehicle motion",
        "geographic": "EU"
      }
    },
    {
      "id": "CTX_TTW",
      "name": "Tank-to-Wheel Efficiency Analysis",
      "shortName": "TTW",
      "subject": "Vehicle operation efficiency comparison",
      "temporal": "2020-2024",
      "status": "concluded",
      "outcome": "Studies show efficiency differences",
      "metadata": {
        "methodology": "Tank-to-Wheel",
        "boundaries": "Fuel tank to vehicle motion",
        "geographic": "EU"
      }
    }
  ],
  "factScopeAssignments": [
    {"factId": "F1", "contextId": "CTX_WTW"},
    {"factId": "F2", "contextId": "CTX_TTW"}
  ]
}

### PREVENT OVER-SPLITTING CHECKLIST
For EACH proposed context, verify:
1. [ ] Directly relevant to input's specific topic?
2. [ ] Supported by ≥1 actual fact?
3. [ ] Represents distinct analytical frame (not just perspective)?
4. [ ] If removed, would analysis materially change?

If ANY answer is "no" → Don't create that context.

### REQUIRED FIELDS
- requiresSeparateAnalysis: boolean
- analysisContexts: array with id, name, shortName, subject, temporal, status, outcome, metadata
- factScopeAssignments: array of {factId, contextId} covering ≥70% of facts
- Each context must have ≥1 fact assigned

### OUTPUT FORMAT
- Use "" for unknown metadata fields, NEVER null
- metadata must be object (can be empty {})
- shortName: max 12 characters`;
}
