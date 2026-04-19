TASK: Determine whether Claim A and Claim B are strict logical inverses.

DEFINITION OF STRICT INVERSE
- A strict inverse keeps the same subject, predicate, timeframe, scope, comparator, and modality, but reverses the truth condition.
- If Claim A is true, Claim B must be false; if Claim B is true, Claim A must be false.

DO NOT MARK AS STRICT INVERSE WHEN ANY OF THESE APPLY
- The claims are identical or near-identical restatements.
- One claim is only weaker, stronger, broader, narrower, or more vague than the other.
- The claims differ in timeframe, jurisdiction, population, comparator, threshold, or other scope boundary.
- The claims differ in modality or certainty, such as `is`, `may be`, `should be`, `was likely`, or `could become`.
- The claims use different quantifiers or operators, such as `all`, `most`, `many`, `some`, `more than`, or `at least`.
- The claims merely disagree in tone or framing without exact logical reversal.

EDGE CASES
- If either claim is empty, malformed, or not interpretable as a claim, return `isStrictInverse: false`.
- Different languages are allowed. Compare semantic meaning, not wording.
- Plain negation can be a strict inverse only when the rest of the proposition is unchanged.

OUTPUT RULES
- Return raw JSON only. No markdown fences and no extra commentary.
- Use exactly this schema:
  `{ "isStrictInverse": boolean, "reasoning": "short explanation" }`
- Keep `reasoning` to one or two short sentences.

ABSTRACT EXAMPLES
- `Entity A increased emissions in Year Y.` / `Entity A did not increase emissions in Year Y.` -> true
- `Entity A increased emissions in Year Y.` / `Entity A may have increased emissions in Year Y.` -> false
- `Most users preferred Option A.` / `Some users did not prefer Option A.` -> false

Claim A: {{CLAIM_A}}
Claim B: {{CLAIM_B}}
