# Broad Claim Contract Validator Plan (2026-03-20)

## Purpose

Stabilize current ClaimBoundary handling of **broad colloquial evaluative predicates** such as:
- `bringt nichts`
- `is pointless`
- `ne sert à rien`

without adding deterministic text heuristics.

The current failure pattern is now clear from the latest `main` runs:
- exact colloquial inputs are highly unstable
- nearby paraphrases like `brings no real benefit` / `bringt keinen Nutzen` are materially more stable
- weak runs drift from the user's broad evaluative meaning into narrower proxy predicates such as:
  - effectiveness
  - feasibility
  - viability
  - profitability
  - waste-diversion rates
  - material-cycle closure

That proxy drift then cascades into:
- search-query drift
- evidence-allocation drift
- verdict instability

This plan proposes a small **LLM-based contract validation / reprompt gate** after Stage 1 extraction.

---

## Recommendation

Implement a new Stage 1.5-style check:

- **Placement:** after `runPass2(...)`, before `runGate1Validation(...)`
- **Purpose:** validate that extracted claims preserve the original evaluative meaning and only add neutral dimension qualification
- **Action on failure:** reprompt Pass 2 once with targeted corrective feedback

This should be implemented as an LLM step, not as deterministic claim-shape rules.

---

## Why Here

### Best insertion point

The best insertion point is **between Pass 2 extraction and Gate 1**.

Reason:
- Pass 2 is where the broad-claim decomposition is created
- Gate 1 today validates opinion / specificity / fidelity, but it is not explicitly optimized for this newly observed predicate-drift class
- If we wait until later stages, the wrong claim shape already contaminates:
  - search queries
  - retained evidence
  - boundary formation

So the cheapest high-leverage intervention is:

1. Pass 2 extracts claims
2. Contract validator checks whether those claims still mean what the user said
3. If not, Pass 2 is re-run with targeted correction
4. Only then proceed to Gate 1

---

## Non-Goals

This validator should **not**:
- decide truth or confidence
- decide whether the user's claim is correct
- add topic-specific exceptions
- hardcode words like `useless`, `pointless`, `bringt nichts`
- enforce one fixed decomposition shape

This validator should only answer:

> “Did the extracted claims preserve the original claim contract, or did they drift into narrower proxy predicates not explicit in the input?”

---

## Scope of Validation

The validator should assess:

1. **Evaluative meaning preservation**
   - Does each claim still express the same broad evaluative meaning as the input?

2. **Neutral dimension qualification**
   - If the claim adds a dimension, is it just a neutral qualifier?

3. **Proxy drift**
   - Did the claim substitute the original broad evaluative predicate with a narrower predicate such as:
     - effective / ineffective
     - viable / unviable
     - profitable / unprofitable
     - technically feasible / infeasible
     - contribution / non-contribution
   - unless that narrower predicate was already explicit in the input

4. **Cross-claim contract quality**
   - As a set, do the extracted claims still answer the user's original thesis?

---

## Proposed Pipeline Integration

### New function

Add a new helper near Stage 1 in:
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

Suggested name:
- `runClaimContractValidation(...)`

### Call flow

Recommended sequence:

1. `runPass1(...)`
2. `runPass2(...)`
3. `runClaimContractValidation(...)`
4. If validator says `rePromptRequired=true`:
   - re-run Pass 2 once with corrective feedback
   - then validate again
5. `runGate1Validation(...)`

### Fail-open behavior

If validator fails technically:
- log warning / metrics
- do **not** block the pipeline
- continue with the existing Gate 1 path

This is consistent with the existing architecture.

---

## Suggested UCM Config

Add a small UCM group under pipeline or calculation config:

```json
{
  "claimContractValidationEnabled": true,
  "claimContractValidationMaxRetries": 1,
  "claimContractValidationTier": "budget",
  "claimContractValidationFailOpen": true,
  "claimContractValidationApplyToAllInputs": true
}
```

### Notes

- `Enabled`: feature flag
- `MaxRetries`: keep small; `1` is enough for v1
- `Tier`: default to budget / understand-tier
- `FailOpen`: true for initial rollout
- `ApplyToAllInputs`: keep `true` in code path, but the LLM should only trigger reprompt when it actually sees contract drift

I recommend **not** trying to pre-classify “broad evaluative” inputs deterministically in code.

---

## Output Schema Proposal

Use structured output with a tight schema.

```json
{
  "inputAssessment": {
    "preservesOriginalClaimContract": true,
    "rePromptRequired": false,
    "summary": "short reason"
  },
  "claims": [
    {
      "claimId": "AC_01",
      "preservesEvaluativeMeaning": true,
      "usesNeutralDimensionQualifier": true,
      "proxyDriftSeverity": "none",
      "recommendedAction": "keep",
      "reasoning": "short reason"
    }
  ]
}
```

### Field meanings

- `preservesOriginalClaimContract`
  - whole-set judgment
- `rePromptRequired`
  - whether Stage 1 should retry Pass 2
- `preservesEvaluativeMeaning`
  - per-claim contract check
- `usesNeutralDimensionQualifier`
  - distinguishes dimension-labeling from semantic substitution
- `proxyDriftSeverity`
  - `none | minor | major`
- `recommendedAction`
  - `keep | rewrite | drop`

### Structural logic allowed

Because the meanings come from the LLM, deterministic plumbing may safely do:
- if `rePromptRequired && retriesRemaining > 0` -> reprompt
- collect audit metadata
- emit an informational warning when drift was detected but fail-open chosen

That stays within repo policy.

---

## Prompt Draft

This is a **draft only**, not yet a live prompt change.

Suggested new section in `apps/web/prompts/claimboundary.prompt.md`:

## CLAIM_CONTRACT_VALIDATION

You are a claim-contract validator. Your task is to check whether extracted atomic claims still preserve the ORIGINAL MEANING of the user's input.

### Task

Assess whether the extracted claims preserve the user's original claim contract.

Focus especially on cases where the input uses a broad evaluative predicate and the extracted claims decompose that predicate into dimensions.

For each claim, determine:
- whether it preserves the original evaluative meaning
- whether any added dimension qualifier is neutral
- whether the claim drifts into a narrower proxy predicate that was not explicit in the input

Then decide whether the extraction should be accepted as-is or whether Pass 2 should be retried.

### Rules

1. **Meaning preservation first.**
   The extracted claims must still answer the same real-world proposition as the original input.

2. **Dimension qualification is allowed.**
   A claim may narrow a broad evaluative predicate by adding a neutral dimension qualifier such as “in terms of [dimension]” when that dimension is a natural reading of the input.

3. **Proxy drift is not allowed unless explicit in the input.**
   Fail a claim if it replaces the user's broad evaluative predicate with a narrower proxy predicate that was not explicit in the input.
   Examples of proxy drift classes include:
   - effectiveness / inefficiency
   - feasibility / viability
   - profitability / cost-effectiveness
   - contribution / non-contribution
   - technical process success or failure

4. **Do not judge truth.**
   You are not deciding whether the claim is correct. You are only deciding whether the extracted claims still mean what the user said.

5. **No evidence-derived narrowing.**
   Do not allow extracted claims to become narrower just because preliminary evidence suggests a convenient measurable proxy.

6. **Whole-set coherence matters.**
   Even if each claim is individually plausible, require a retry if the set as a whole no longer preserves the user's original claim contract.

7. **Multilingual semantics.**
   Preserve meaning regardless of language. Do not assume English wording patterns.

8. **Be conservative about retries.**
   Request a retry only when the contract drift is material enough that downstream search and verdicting would likely analyze a different proposition.

### Input

Original input:
`${analysisInput}`

Input classification:
`${inputClassification}`

Implied claim:
`${impliedClaim}`

Article thesis:
`${articleThesis}`

Atomic claims:
`${atomicClaimsJson}`

### Output

Return JSON:

```json
{
  "inputAssessment": {
    "preservesOriginalClaimContract": true,
    "rePromptRequired": false,
    "summary": "short explanation"
  },
  "claims": [
    {
      "claimId": "AC_01",
      "preservesEvaluativeMeaning": true,
      "usesNeutralDimensionQualifier": true,
      "proxyDriftSeverity": "none",
      "recommendedAction": "keep",
      "reasoning": "short explanation"
    }
  ]
}
```

Constraints:
- `summary`: max 160 chars
- `reasoning`: max 120 chars
- `proxyDriftSeverity`: `none | minor | major`
- `recommendedAction`: `keep | rewrite | drop`

---

## Reprompt Strategy

When `rePromptRequired=true`, re-run Pass 2 once with a short corrective instruction appended to the user-side guidance.

Suggested corrective payload:

```text
The previous extraction drifted away from the user's original evaluative meaning.
Retry the extraction while preserving the original claim contract.
Keep the same broad evaluative meaning.
Only add neutral dimension qualifiers.
Do not replace the user's predicate with narrower proxy predicates such as effectiveness, feasibility, viability, contribution, or profitability unless those narrower predicates are explicit in the input.
```

This should stay short and reusable.

---

## Why This Should Work Better Than More Prompt Tweaks Alone

B1 improved the family, but the diagnostic batch shows the prompt rules are not consistently binding.

That means:
- extraction quality is still too stochastic
- passive instruction is not enough
- a second explicit contract-validation step is now justified

This new validator gives the system:
- a direct semantic check on whether extraction still matches the input
- a mechanism to recover before search and verdict stages are polluted
- a generic architecture for future broad-claim stabilization beyond Plastik

---

## Recommended Implementation Order

1. Add types + schema for contract-validation output
2. Add prompt section draft and frontmatter variables
3. Implement `runClaimContractValidation(...)`
4. Wire one retry between Pass 2 and Gate 1
5. Add focused unit tests for:
   - pass-through on clean claims
   - reprompt trigger when validator requests retry
   - fail-open behavior on LLM / prompt failure
6. Validate on the current Plastik exact/paraphrase set

---

## Initial Success Criteria

Success for v1 is:
- exact `DE` colloquial input no longer swings into `LEANING-TRUE`
- exact `EN` colloquial input no longer swings into `MOSTLY-TRUE`
- paraphrases remain in the same verdict neighborhood as before
- FR control remains stable
- no obvious regression on Hydrogen or Bolsonaro

---

## Recommendation to Captain

Approve this as the next quality-focused implementation step.

It is now the highest-leverage generic fix because:
- it directly targets the currently observed root cause
- it is architecture-consistent with repo policy
- it avoids deterministic semantic rules
- it should improve not just Plastik, but any future broad evaluative input family
