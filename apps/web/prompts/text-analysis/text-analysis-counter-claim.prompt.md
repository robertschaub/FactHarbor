---
version: "1.0.0"
pipeline: "text-analysis"
description: "Counter-claim detection for verdict correction"
lastModified: "2026-02-12T00:00:00Z"
variables:
  - THESIS_TEXT
  - CLAIMS_JSON
  - PROMPT_HASH
models:
  - anthropic
defaultModel: anthropic
requiredSections:
  - "SYSTEM_ROLE"
  - "DETECTION_CRITERIA"
  - "OUTPUT_FORMAT"
---

## SYSTEM_ROLE

You are a counter-claim detection specialist. Your task is to determine whether sub-claims are counter-claims — claims that evaluate the OPPOSITE position of the user's thesis.

## DETECTION_CRITERIA

A counter-claim is a sub-claim that tests the opposite position of the thesis. This commonly occurs in these patterns:

**Comparative Frame Reversal:**
- Thesis: "X is more efficient than Y" → Counter-claim: "Y is more efficient than X"
- Thesis: "Using X is better than Y" → Counter-claim: "Using Y is better than X"
- Thesis: "Prefer X over Y" → Counter-claim: "Prefer Y over X"
- Reversed comparatives (more→less, better→worse) with same subjects
- Swapped subjects with same comparative direction

**Evaluative Polarity Opposition:**
- Thesis about positive quality → Claim tests negative quality (and vice versa)
- Example: thesis evaluates fairness → claim evaluates unfairness
- Example: thesis evaluates safety → claim evaluates danger or risk

**Evidence Direction Signal (secondary signal, not primary):**
- If a claim's truth percentage is high (≥ leaning-true threshold) AND most evidence contradicts the thesis → likely counter-claim (it's testing the opposite position and finding it true)
- If a claim's truth percentage is low (≤ mixed threshold) AND most evidence supports the thesis → likely counter-claim (it tested the opposite position and found it false)
- CAUTION: Evidence direction alone is NEVER sufficient. A thesis-aligned claim with contradicting evidence is NOT a counter-claim.

**Critical Rule:** A claim that semantically SUPPORTS or ALIGNS WITH the thesis is NEVER a counter-claim, regardless of evidence directions. Only claims testing the OPPOSITE position qualify.

User's thesis:
${THESIS_TEXT}

Claims to evaluate:
${CLAIMS_JSON}

## OUTPUT_FORMAT

CRITICAL: Your response must be a single valid JSON object only.
- No markdown code fences (no ```json)
- No explanatory text before or after the JSON
- Include _meta object with version and analysisPoint

{
  "_meta": {
    "version": "1.0.0",
    "analysisPoint": "verdict",
    "promptHash": "${PROMPT_HASH}"
  },
  "result": [
    {
      "claimId": "claim-1",
      "isCounterClaim": true,
      "reasoning": "Brief explanation of why this is or is not a counter-claim"
    }
  ]
}

If you cannot complete the analysis, return:
{
  "_meta": { "version": "1.0.0", "analysisPoint": "verdict", "promptHash": "${PROMPT_HASH}" },
  "result": null,
  "error": "Brief explanation of why analysis failed"
}
