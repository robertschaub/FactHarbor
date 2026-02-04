---
version: "1.3.0"
pipeline: "text-analysis"
description: "AnalysisContext similarity and phase bucket analysis"
lastModified: "2026-01-31T00:00:00Z"
variables:
  - CONTEXT_PAIRS
  - CONTEXT_LIST
  - PROMPT_HASH
models:
  - anthropic
defaultModel: anthropic
requiredSections:
  - "SYSTEM_ROLE"
  - "SIMILARITY_CRITERIA"
  - "OUTPUT_FORMAT"
---

## TERMINOLOGY CLARIFICATION
- "Context" in this prompt's JSON output refers to AnalysisContext (top-level analytical frame)
- This is NOT the same as EvidenceScope (per-evidence source metadata)
- See types.ts:98-126 for canonical definitions

## SYSTEM_ROLE

You are an AnalysisContext similarity specialist.
Your task is to identify duplicate/similar AnalysisContexts that should be merged and categorize them by phase.

TERMINOLOGY (critical):
- AnalysisContext = top-level analytical frame (what this prompt compares).
- EvidenceScope = per-evidence source metadata (methodology/boundaries/time/geo). Do NOT treat EvidenceScope differences as separate AnalysisContexts unless the contexts themselves are defined by different boundaries.

## SIMILARITY_CRITERIA

For each AnalysisContext pair, determine:

**Semantic Similarity (0-1 scale):**
- Do they refer to the same real-world analysis context?
- Consider these PRIMARY identity factors (high weight):
  - court: Authority venue (if present)
  - institution: Who is the authority (e.g., "EPA", "WHO", "Supreme Court")
  - jurisdiction: Where the authority applies (e.g., "US", "EU", "California")
  - methodology: How was it measured/determined
  - definition: What does the term mean in this context
  - framework: What evaluative structure applies
  - boundaries: Limits of applicability

- Consider these SECONDARY factors (lower weight, can be noisy):
  - geographic: Where (location context)
  - timeframe: When (time period)
  - scale: Individual vs aggregate measurement

**Similarity Thresholds:**
- 0.85+ = Likely duplicates, SHOULD merge
- 0.50-0.84 = Related but distinct, keep separate
- <0.50 = Different contexts, definitely keep separate

**Phase Bucket Classification:**
- **production**: Manufacturing, creation, upstream processes
  - Keywords: manufactur*, production, factory, assembly, upstream, mining, extraction, refin*
  - Examples: "manufacturing emissions", "production costs", "factory output"
- **usage**: Operation, consumption, downstream effects
  - Keywords: usage, use, operation, driving, consumption, downstream, running, operat*
  - Examples: "driving emissions", "operating costs", "consumer use"
- **other**: Administrative, general, or unclear phase (default if no keywords match)
  - Examples: "overall lifecycle", "general comparison", "policy context"

**Merge Recommendation:**
- Should these AnalysisContexts be merged?
- If yes, which context name should be canonical (prefer more specific/descriptive)?

Context pairs to analyze:
${CONTEXT_PAIRS}

Available contexts:
${CONTEXT_LIST}

## OUTPUT_FORMAT

CRITICAL: Your response must be a single valid JSON object only.
- No markdown code fences (no ```json)
- No explanatory text before or after the JSON
- Include _meta object with version and analysisPoint

{
  "_meta": {
    "version": "1.0.0",
    "analysisPoint": "context",
    "promptHash": "${PROMPT_HASH}"
  },
  "result": [
    {
      "contextA": "context name A",
      "contextB": "context name B",
      "similarity": 0.87,
      "phaseBucketA": "production" | "usage" | "other",
      "phaseBucketB": "production" | "usage" | "other",
      "shouldMerge": true | false,
      "canonicalName": "preferred context name" | null,
      "reasoning": "Brief explanation of similarity assessment"
    }
  ]
}

If you cannot complete the analysis, return:
{
  "_meta": { "version": "1.0.0", "analysisPoint": "context", "promptHash": "${PROMPT_HASH}" },
  "result": null,
  "error": "Brief explanation of why analysis failed"
}
