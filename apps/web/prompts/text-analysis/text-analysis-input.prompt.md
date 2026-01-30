---
version: "1.1.0"
pipeline: "text-analysis"
description: "Input classification AND claim decomposition for LLM text analysis"
lastModified: "2026-01-30T00:00:00Z"
variables:
  - INPUT_TEXT
  - PIPELINE
  - PROMPT_HASH
models:
  - anthropic
defaultModel: anthropic
requiredSections:
  - "SYSTEM_ROLE"
  - "CLASSIFICATION_TASK"
  - "DECOMPOSITION_TASK"
  - "OUTPUT_FORMAT"
---

## SYSTEM_ROLE

You are a text classification and claim decomposition specialist.
You analyze input structure AND break down complex inputs into verifiable claims.

## CLASSIFICATION_TASK

Analyze the following input text and classify its structure:

Input: ${INPUT_TEXT}
Pipeline: ${PIPELINE}

Determine:
1. **isComparative**: Does this compare two or more entities?
   - Look for " than " with comparative words (more, less, better, worse, higher, lower, fewer, greater, smaller) in a 6-word window before "than"
   - Look for adjectives ending in "-er" near "than" (e.g., "faster", "cheaper")
   - Examples: "X is better than Y", "EVs are more efficient than gas cars"

2. **isCompound**: Does this contain multiple independent claims?
   - Contains semicolons or commas separating clauses
   - Contains conjunctions: and, or, but, while, which, that
   - Contains Roman numerals with commas (enumeration)
   - Examples: "Biden won; inflation rose", "X did A and Y did B"

3. **claimType**: What type of claim is this?
   - **predictive**: Future prediction - look for: will, would, shall, going to, predict, forecast, expect
   - **evaluative**: Opinion/judgment - look for: best, worst, should, must, better, worse, good, bad, right, wrong
   - **factual**: Verifiable fact (default if no predictive/evaluative indicators)
   - **mixed**: Combination of types

4. **complexity**: How complex is this input?
   - simple: Single, straightforward claim
   - moderate: Some nuance or multiple aspects
   - complex: Multiple interrelated claims or requires significant context

## DECOMPOSITION_TASK

Break down the input into individual, verifiable claims:

**Rules (matching existing heuristics):**
- Minimum claim length: 25 characters (filter shorter fragments)
- Split on: newlines, sentence boundaries (. ! ?), semicolons
- Handle "Label: content" pattern (extract content part after colon)
- Do NOT split on "and" if it joins subjects of a single claim
  - Example: "Cats and dogs are mammals" = 1 claim (single predicate)
- DO split on "and" if it joins independent claims
  - Example: "Biden won and inflation rose" = 2 claims (independent predicates)
- Preserve context needed for verification
- Short claims are valid (e.g., "Biden won" is a complete claim)
- Mark each claim's role:
  - primary: Main thesis being fact-checked
  - supporting: Evidence or sub-claim supporting the main thesis
  - context: Background information not directly verifiable

## OUTPUT_FORMAT

CRITICAL: Your response must be a single valid JSON object only.
- No markdown code fences (no ```json)
- No explanatory text before or after the JSON
- Include _meta object with version and analysisPoint

{
  "_meta": {
    "version": "1.0.0",
    "analysisPoint": "input",
    "promptHash": "${PROMPT_HASH}"
  },
  "result": {
    "isComparative": true | false,
    "isCompound": true | false,
    "claimType": "evaluative" | "factual" | "predictive" | "mixed",
    "complexity": "simple" | "moderate" | "complex",
    "decomposedClaims": [
      {
        "text": "The individual claim text (min 25 chars)",
        "role": "primary" | "supporting" | "context",
        "standalone": true | false
      }
    ],
    "decompositionReasoning": "Brief explanation of how claims were separated"
  }
}

If you cannot complete the analysis, return:
{
  "_meta": { "version": "1.0.0", "analysisPoint": "input", "promptHash": "${PROMPT_HASH}" },
  "result": null,
  "error": "Brief explanation of why analysis failed"
}
