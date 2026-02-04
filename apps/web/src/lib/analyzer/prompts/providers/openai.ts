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

**Example - Multi-AnalysisContext Detection:**
Input: "Institution A ruled X was ineligible, while Institution B ruled differently on eligibility"
Output:
{
  "analysisContexts": [
    {"id": "CTX_A", "name": "Institution A Eligibility Ruling", "type": "legal"},
    {"id": "CTX_B", "name": "Institution B Eligibility Ruling", "type": "legal"}
  ],
  "requiresSeparateAnalysis": true
}

### REQUIRED OUTPUT FIELDS (All must be present)
- impliedClaim: string (neutral summary)
- articleThesis: string (what input asserts)
- backgroundDetails: string — article background details (NOT an AnalysisContext), or "".
- subClaims: array with id, text, claimRole, centrality, isCentral, checkWorthiness, harmPotential, dependsOn
- researchQueries: array of 4-6 distinct search strings
- analysisContexts: array (can be empty)
- requiresSeparateAnalysis: boolean

### RULES TO FOLLOW
1. Only 1-4 claims should have "high" centrality
2. Generate 4-6 DISTINCT search queries (no redundancy)
3. Look for institutional/methodology differences for AnalysisContext detection
4. Use "" for empty strings, never null

Now analyze the input following these exact patterns.`;
}

export function getOpenAIExtractEvidenceVariant(): string {
  return `
## GPT OPTIMIZATION - EVIDENCE EXTRACTION

### FEW-SHOT EXAMPLE (Follow this pattern)

**Example - Evidence with Full EvidenceScope:**
{
  "evidenceItems": [
    {
      "id": "E1",
      "statement": "Technology A achieves 40% full-cycle efficiency",
      "category": "statistic",
      "specificity": "high",
      "sourceExcerpt": "The full-cycle efficiency of Technology A is approximately 40%",
      "claimDirection": "contradicts",
      "contextId": "CTX_FULL",
      "sourceAuthority": "primary",
      "evidenceBasis": "scientific",
      "evidenceScope": {
        "name": "Full-Cycle",
        "methodology": "End-to-end analysis",
        "boundaries": "Primary production through final operation",
        "geographic": "Region X",
        "temporal": "2024"
      }
    },
    {
      "id": "E2",
      "statement": "Technology B achieves 77% full-cycle efficiency",
      "category": "statistic",
      "specificity": "high",
      "sourceExcerpt": "Technology B demonstrates full-cycle efficiency of approximately 77%",
      "claimDirection": "supports",
      "contextId": "CTX_FULL",
      "sourceAuthority": "primary",
      "evidenceBasis": "scientific",
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

### REQUIRED FIELDS PER EVIDENCE ITEM
- id: string (E1, E2, etc.)
- statement: string (one sentence, under 100 chars preferred)
- category: "evidence" | "expert_quote" | "statistic" | "event" | "legal_provision" | "criticism"
- specificity: "high" | "medium" (never "low")
- sourceExcerpt: string (50-200 chars, verbatim from source)
- claimDirection: "supports" | "contradicts" | "neutral"
- contextId: string (AnalysisContext ID or "")
- evidenceScope: object with name, methodology, boundaries, geographic, temporal (or null if not defined)
- sourceAuthority: "primary" | "secondary" | "opinion" | "contested" (REQUIRED for each evidence item)
- evidenceBasis: "scientific" | "documented" | "anecdotal" | "theoretical" | "pseudoscientific" (REQUIRED)

### CLAIM DIRECTION RULES
- User claims "X is better than Y" + Source says "Y outperforms X" → "contradicts"
- User claims "X is better than Y" + Source says "X exceeds Y" → "supports"
- Source provides background only → "neutral"

### OUTPUT FORMAT
- Use "" for empty strings, NEVER null for string fields
- evidenceScope: Include full object when source defines analytical frame, null otherwise
- Extract 4-6 high-quality evidence items (quality over quantity)
- Each evidence item must be independently verifiable`;
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
- contextId: string (must match AnalysisContext ID from list)
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
- supportingEvidenceIds must be array (even if empty: [])
- Ensure contextId matches one from the known AnalysisContexts
- factualBasis = "established" ONLY if documented counter-evidence exists`;
}

export function getOpenAIContextRefinementVariant(): string {
  return `
## GPT OPTIMIZATION - CONTEXT REFINEMENT

### FEW-SHOT EXAMPLE

**Input:** Evidence about System A vs System B efficiency from multiple studies
**Output:**
{
  "requiresSeparateAnalysis": true,
  "analysisContexts": [
    {
      "id": "CTX_A",
      "name": "Boundary A Efficiency Analysis",
      "shortName": "A",
      "subject": "Boundary A efficiency comparison",
      "temporal": "2020-2024",
      "status": "concluded",
      "outcome": "Studies show efficiency differences",
      "metadata": {
        "methodology": "Method A",
        "boundaries": "Boundary A",
        "geographic": "Region X"
      }
    },
    {
      "id": "CTX_B",
      "name": "Boundary B Efficiency Analysis",
      "shortName": "B",
      "subject": "Boundary B efficiency comparison",
      "temporal": "2020-2024",
      "status": "concluded",
      "outcome": "Studies show efficiency differences",
      "metadata": {
        "methodology": "Method B",
        "boundaries": "Boundary B",
        "geographic": "Region X"
      }
    }
  ],
  "evidenceContextAssignments": [
    {"evidenceId": "E1", "contextId": "CTX_A"},
    {"evidenceId": "E2", "contextId": "CTX_B"}
  ]
}

### PREVENT OVER-SPLITTING CHECKLIST
For EACH proposed AnalysisContext, verify:
1. [ ] Directly relevant to input's specific topic?
2. [ ] Supported by ≥1 actual evidence item?
3. [ ] Represents distinct analytical frame (not just perspective)?
4. [ ] If removed, would analysis materially change?

If ANY answer is "no" → Don't create that AnalysisContext.

### REQUIRED FIELDS
- requiresSeparateAnalysis: boolean
- analysisContexts: array with id, name, shortName, subject, temporal, status, outcome, metadata
- evidenceContextAssignments: array of {evidenceId, contextId} covering ≥70% of evidence items
- Each AnalysisContext must have ≥1 evidence item assigned

### OUTPUT FORMAT
- Use "" for unknown metadata fields, NEVER null
- metadata must be object (can be empty {})
- shortName: max 12 characters`;
}
