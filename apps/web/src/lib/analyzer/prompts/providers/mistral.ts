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
- Factual statement → "claim"
- News article/long text → "article"

**Step 3:** Extract claims using this template
For each claim found:
- id: SC{n} (SC1, SC2, etc.)
- text: [the claim statement]
- claimRole: [pick one: "attribution" | "source" | "timing" | "core"]
- centrality: [pick one]
  - "low" → background detail claims
  - "medium" → supporting details
  - "high" → core verifiable assertions (expect 1-4 max)
- isCentral: true if centrality="high", else false
- dependsOn: [array of claim IDs this depends on, or []]

**Step 4:** Detect AnalysisContext boundaries
Look for:
- Different institutions or formal bodies
- Different methodologies or standards
- Different regulatory or governance frameworks
If found: Create analysisContexts array
If not: Leave analysisContexts empty

**Step 5:** Generate 4-6 search queries
- 2 queries to find supporting evidence
- 2 queries to find contradicting evidence
- 1-2 queries for background details

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
## MISTRAL OPTIMIZATION - EVIDENCE EXTRACTION

### STEP-BY-STEP PROCESS

**Step 1:** Read source content completely

**Step 2:** Identify extractable evidence items
- Look for: numbers, dates, names, specific events
- Minimum: 3 evidence items
- Maximum: 8 evidence items

**Step 3:** For EACH evidence item, fill this template
{
  "id": "F{n}",
  "statement": "[one sentence, ≤100 chars]",
  "category": "[pick one: evidence | expert_quote | statistic | event | legal_provision | criticism]",
  "specificity": "[high | medium]",
  "sourceExcerpt": "[copy 50-200 chars verbatim from source]",
  "claimDirection": "[pick one: supports | contradicts | neutral]",
  "contextId": "[AnalysisContext ID or empty string]",
  "sourceAuthority": "[pick one: primary | secondary | opinion | contested]",
  "evidenceBasis": "[pick one: scientific | documented | anecdotal | theoretical | pseudoscientific]",
  "evidenceScope": [object or null]
}

**Step 4:** Determine claimDirection
- Read user's original claim
- Does this evidence support the claim being TRUE? → "supports"
- Does this evidence support the claim being FALSE? → "contradicts"
- Neither, just background details? → "neutral"

**Step 5:** Extract evidenceScope (if applicable)
Does the source define its analytical frame?
- YES → Fill: {name, methodology, boundaries, geographic, temporal}
- NO → Set to null

**Step 6:** Output JSON

### EVIDENCESCOPE TEMPLATE
{
  "name": "[short label, e.g., Boundary A]",
  "methodology": "[standard used, e.g., Standard X]",
  "boundaries": "[what included/excluded]",
  "geographic": "[region, e.g., Region X]",
  "temporal": "[time period, e.g., 2024]"
}
Use "" for unknown fields, not null.

### VALIDATION CHECKLIST
[ ] 3-8 evidence items extracted
[ ] Each evidence item ≤100 characters
[ ] Each sourceExcerpt is 50-200 chars
[ ] Each sourceExcerpt is verbatim from source
[ ] No duplicate information across evidence items
[ ] claimDirection matches evidence relationship to user's claim
[ ] sourceAuthority classified for each evidence item
[ ] evidenceBasis classified for each evidence item
[ ] JSON is valid`;
}

export function getMistralVerdictVariant(): string {
  return `
## MISTRAL OPTIMIZATION - VERDICT GENERATION

### STEP-BY-STEP VERDICT PROCESS

**Step 1:** Read user's original claim
Write it down: "[claim]"

**Step 2:** For each AnalysisContext, process separately:

**Step 2a:** List evidence items for this AnalysisContext only
- Count SUPPORTING evidence items: ___
- Count COUNTER-EVIDENCE items: ___

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

export function getMistralContextRefinementVariant(): string {
  return `
## MISTRAL OPTIMIZATION - CONTEXT REFINEMENT

### STEP-BY-STEP PROCESS

**Step 1:** Read all evidence items and identify potential boundaries

Look for these markers:
| Marker Type | Examples |
|-------------|----------|
| Methodology | Different analytical standards or frameworks |
| Institution | Different formal bodies or agencies |
| Temporal | Different time periods or phases |

**Step 2:** For each potential boundary, answer these questions

Boundary: ____________
[ ] Directly relevant to input's specific topic?
[ ] Supported by ≥1 evidence item?
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

**Step 4:** Assign ALL evidence items to AnalysisContexts

For each evidence item:
- evidenceId: "[F1, F2, etc.]" (use Evidence item IDs)
- contextId: "[CTX_XXX]"

Ensure:
- Each evidence item → exactly one contextId
- ≥70% of evidence items assigned
- Each AnalysisContext has ≥1 evidence item

**Step 5:** Output JSON

### VALIDATION CHECKLIST
[ ] requiresSeparateAnalysis matches AnalysisContext count (true if >1)
[ ] Each AnalysisContext has all required fields
[ ] shortName ≤12 characters
[ ] metadata uses "" for unknown fields (not null)
[ ] evidenceContextAssignments covers ≥70% of evidence items
[ ] Each AnalysisContext has ≥1 evidence item assigned
[ ] JSON is valid`;
}
