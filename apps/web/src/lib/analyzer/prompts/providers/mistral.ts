/**
 * Mistral-specific prompt optimizations
 *
 * Optimizations for Mistral (Mistral Large, Mistral Small):
 * - Step-by-step numbered processes (Mistral excels at these)
 * - Explicit checklists for validation
 * - Template-based field completion
 * - Clear, direct instructions
 * - Fast structured output
 *
 * @version 2.8.0 - Enhanced with comprehensive step-by-step processes
 */

export function getMistralUnderstandVariant(): string {
  return `
## MISTRAL OPTIMIZATION

### STEP-BY-STEP PROCESS (Follow exactly)

**Step 1:** Read input completely

**Step 2:** Identify input type
- Statement about facts → "claim"
- News article/long text → "article"

**Step 3:** Extract claims using this template
For each claim found:
- id: SC{n} (SC1, SC2, etc.)
- text: [the claim statement]
- claimRole: [pick one: "attribution" | "source" | "timing" | "core"]
- centrality: [pick one]
  - "low" → background/context claims
  - "medium" → supporting context
  - "high" → core verifiable assertions (expect 1-4 max)
- isCentral: true if centrality="high", else false
- dependsOn: [array of claim IDs this depends on, or []]

**Step 4:** Detect context boundaries
Look for:
- Different institutions or formal bodies
- Different methodologies or standards
- Different regulatory or governance frameworks
If found: Create detectedScopes array
If not: Leave detectedScopes empty

**Step 5:** Generate 4-6 search queries
- 2 queries to find supporting evidence
- 2 queries to find contradicting evidence
- 1-2 queries for context/background

**Step 6:** Output JSON

### CENTRALITY EXAMPLES

Centrality = LOW:
- "Dr. X is the agency director" (attribution)
- "An internal memo exists" (source)
- "The event occurred in November" (timing)

Centrality = HIGH:
- "10 people were harmed by Product X" (factual impact)
- "The process violated due process" (procedural violation)
- "Technology A is more efficient than Technology B" (comparative claim)

### VALIDATION CHECKLIST
Before output, verify:
[ ] All claims have unique IDs (SC1, SC2, etc.)
[ ] Only 1-4 claims marked as "high" centrality
[ ] 4-6 search queries included
[ ] JSON is valid`;
}

export function getMistralExtractFactsVariant(): string {
  return `
## MISTRAL OPTIMIZATION - FACT EXTRACTION

### STEP-BY-STEP PROCESS

**Step 1:** Read source content completely

**Step 2:** Identify extractable facts
- Look for: numbers, dates, names, specific events
- Minimum: 3 facts
- Maximum: 8 facts

**Step 3:** For EACH fact, fill this template
{
  "id": "F{n}",
  "fact": "[one sentence, ≤100 chars]",  // Legacy field name for extracted statement
  "category": "[pick one: evidence | expert_quote | statistic | event | legal_provision | criticism]",
  // NOTE: "evidence" is legacy value, type system also accepts "direct_evidence" (Phase 1.5 will migrate prompts)
  "specificity": "[high | medium]",
  "sourceExcerpt": "[copy 50-200 chars verbatim from source]",
  "claimDirection": "[pick one: supports | contradicts | neutral]",
  "contextId": "[AnalysisContext ID or empty string]",
  "evidenceScope": [object or null]
}

**Step 4:** Determine claimDirection
- Read user's original claim
- Does this fact support the claim being TRUE? → "supports"
- Does this fact support the claim being FALSE? → "contradicts"
- Neither, just context? → "neutral"

**Step 5:** Extract evidenceScope (if applicable)
Does the source define its analytical frame?
- YES → Fill: {name, methodology, boundaries, geographic, temporal}
- NO → Set to null

**Step 6:** Output JSON

### EVIDENCESCOPE TEMPLATE
{
  "name": "[short label, e.g., WTW]",
  "methodology": "[standard used, e.g., ISO 14040]",
  "boundaries": "[what included/excluded]",
  "geographic": "[region, e.g., EU]",
  "temporal": "[time period, e.g., 2024]"
}
Use "" for unknown fields, not null.

### VALIDATION CHECKLIST
[ ] 3-8 facts extracted
[ ] Each fact ≤100 characters
[ ] Each sourceExcerpt is 50-200 chars
[ ] Each sourceExcerpt is verbatim from source
[ ] No duplicate information across facts
[ ] claimDirection matches evidence relationship to user's claim
[ ] JSON is valid`;
}

export function getMistralVerdictVariant(): string {
  return `
## MISTRAL OPTIMIZATION - VERDICT GENERATION

### STEP-BY-STEP VERDICT PROCESS

**Step 1:** Read user's original claim
Write it down: "[claim]"

**Step 2:** For each AnalysisContext, process separately:

**Step 2a:** List facts for this AnalysisContext only
- Count SUPPORTING facts: ___
- Count COUNTER-EVIDENCE facts: ___

**Step 2b:** Determine evidence direction
- More supporting → claim is TRUE → 72-100%
- Balanced → MIXED → 43-57%
- More counter-evidence → claim is FALSE → 0-28%

**Step 2c:** Fill verdict template
{
  "contextId": "[AnalysisContext ID]",
  "answer": [0-100 integer],
  "confidence": [0-100 integer],
  "shortAnswer": "[complete sentence, ≤25 words]",
  "keyFactors": [array of 3-5 items]
}

**Step 2d:** Fill keyFactor template (3-5 times)
{
  "factor": "[≤12 words]",
  "explanation": "[≤20 words]",
  "supports": "[yes | no | neutral]",
  "isContested": [true | false],
  "contestedBy": "[specific group or empty string]",
  "factualBasis": "[established | disputed | opinion | unknown]"
}

**Step 3:** Verify answer matches evidence direction
- If reasoning says "claim is false" → answer must be 0-28%
- If reasoning says "claim is true" → answer must be 72-100%

### RATING DIRECTION RULE (CRITICAL)
You are rating THE USER'S CLAIM, not your analysis quality.

Example:
- User claim: "X is better than Y"
- Evidence shows: Y is better than X
- Correct answer: 5-15% (claim is FALSE)
- Wrong answer: 85-95% (this rates analysis, not claim)

### VALIDATION CHECKLIST
For each verdict:
[ ] contextId matches AnalysisContext ID from list
[ ] answer is 0-100 integer
[ ] answer matches evidence direction
[ ] shortAnswer is complete sentence
[ ] 3-5 keyFactors included
[ ] Each keyFactor has all 6 fields
[ ] factualBasis = "established" ONLY if documented counter-evidence exists
[ ] Use "" for empty contestedBy, not null

### FACTUAL BASIS GUIDE
- "established": Documented counter-evidence (audits, reports, data)
- "disputed": Some factual counter-evidence, debatable
- "opinion": No factual counter-evidence, just rhetoric
- "unknown": Cannot determine`;
}

export function getMistralScopeRefinementVariant(): string {
  return `
## MISTRAL OPTIMIZATION - SCOPE REFINEMENT

### STEP-BY-STEP PROCESS

**Step 1:** Read all facts and identify potential boundaries

Look for these markers:
| Marker Type | Examples |
|-------------|----------|
| Methodology | Different analytical standards or frameworks |
| Institution | Different formal bodies or agencies |
| Temporal | Different time periods or phases |

**Step 2:** For each potential boundary, answer these questions

Boundary: ____________
[ ] Directly relevant to input's specific topic?
[ ] Supported by ≥1 fact from the evidence?
[ ] Represents distinct analytical frame (not just perspective)?

If ALL boxes checked → Create AnalysisContext
If ANY unchecked → Skip this boundary

**Step 3:** Create AnalysisContext using template

{
  "id": "CTX_[SHORT_CODE]",
  "name": "[descriptive name, ≤60 chars]",
  "shortName": "[≤12 chars]",
  "subject": "[what's being analyzed]",
  "temporal": "[time period]",
  "status": "[concluded | ongoing | pending | unknown]",
  "outcome": "[result or empty string]",
  "metadata": {
    // Domain-specific fields:
    "institution": "[formal body name]",
    "level": "[Federal/State/National/International]",
    "methodology": "[standard/framework used]",
    "boundaries": "[what included/excluded]",
    "geographic": "[region/area]",
    "dataSource": "[dataset used]"
  }
}

**Step 4:** Assign ALL facts to contexts

For each fact:
- factId: "[F1, F2, etc.]"
- contextId: "[CTX_XXX]"

Ensure:
- Each fact → exactly one contextId
- ≥70% of facts assigned
- Each context has ≥1 fact

**Step 5:** Output JSON

### VALIDATION CHECKLIST
[ ] requiresSeparateAnalysis matches context count (true if >1)
[ ] Each context has all required fields
[ ] shortName ≤12 characters
[ ] metadata uses "" for unknown fields (not null)
[ ] factScopeAssignments covers ≥70% of facts
[ ] Each context has ≥1 fact assigned
[ ] JSON is valid`;
}

/** Primary name for getting Mistral context refinement variant */
export const getMistralContextRefinementVariant = getMistralScopeRefinementVariant;
