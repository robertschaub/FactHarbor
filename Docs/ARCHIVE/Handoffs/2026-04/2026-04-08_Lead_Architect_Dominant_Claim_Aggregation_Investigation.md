---
### 2026-04-08 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Aggregation Investigation
**Task:** Investigate job `11a8f75cb79449b69f152635eb42663a`, analyze why the atomic-claim verdicts look good while the overall verdict is wrong, compare against other mixed-direction jobs, and propose a consolidated solution and plan for dominant AtomicClaim handling.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_Dominant_Claim_Aggregation_Investigation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The right fix is not a blunt global increase of `anchorClaimMultiplier`. The pipeline needs an explicit LLM-driven dominant-claim assessment in Stage 5, plus a prompt-contract change so article-level adjudication may override the deterministic average when a claim is semantically dominant even if all direct claims were assessed.
**Open items:** Captain approval is required before prompt modifications. Implementation still needs an exact UCM config shape, dominance schema, and validation gate definition.
**Warnings:** This issue is partly Stage-1 decomposition instability and partly Stage-5 aggregation design. A Stage-5 fix will materially improve runs where the dominant claim is present, but it cannot repair runs where extraction omits or dilutes the decisive truth-condition altogether.
**For next agent:** Implement a conservative dominance-assessment step after per-claim verdict generation, persist its output for auditability, and feed it into both aggregation and article-level narrative/adjudication. Validate on the Swiss treaty family plus non-dominant controls before promotion.
**Learnings:** No

## Scope

Primary live target:
- Job `11a8f75cb79449b69f152635eb42663a` on 2026-04-08
- Input: `Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
- Result: `LEANING-TRUE`, `65%`, `72.6 confidence`

Captain's concern was confirmed: the per-claim verdicts are plausible, but the article verdict is not.

## Findings

### 1. The target job contains one materially decisive false claim, but the overall verdict stays true-leaning

Relevant per-claim verdicts in the live target job:
- `AC_01`: `100 / 90` — Parliament timing claim
- `AC_02`: `95 / 80` — Popular-vote timing claim
- `AC_03`: `15 / 53` — “rechtskräftig und bindend” legal-effect claim

The narrative already recognizes the real issue:
- It says the timing facts are correct.
- It says the legal-binding claim is factually untrue.
- It says the overall framing is materially distorted by that false legal conclusion.

But the stored article truth remains `65`.

### 2. Stage 5 has no real concept of dominant claims

Current Stage-5 weighting in `aggregation-stage.ts` is built from:
- centrality
- harm
- confidence
- triangulation
- derivative-evidence attenuation
- anchor multiplier
- probative-value factor

There is no explicit “this claim semantically governs the truth of the input” concept.

For the target job, approximate weights are:
- `AC_01`: `3.402`
- `AC_02`: `3.312`
- `AC_03`: `4.293`

So the false legal-effect claim already gets the largest single weight, but it still cannot overcome two near-100 timeline claims. That is why the weighted average lands at `~65`.

### 3. The current prompt contract forbids the article-level LLM from fixing this

`VERDICT_NARRATIVE` currently contains this rule:
- If all direct claims were fully assessed, `adjustedTruthPercentage` and `adjustedConfidence` must equal the deterministic aggregation.

That means the narrative step is not allowed to correct a semantically bad deterministic average once every claim is assessed. This exactly matches the target failure: the narrative text knows the overall framing is wrong, but the prompt contract blocks it from changing the article truth.

### 4. Stage 1 also signals a real upstream problem in the target run

The target job's `contractValidationSummary` says:
- `preservesContract: false`
- `anchorRetryReason`: anchor omission around `rechtskräftig`
- summary: `AC_03 injects normative legal-effect assertion ('bindend') not in input. 'Rechtskräftig' is temporal/procedural modifier in input, not standalone legal-effect claim.`

So the pipeline already knows this extraction is contract-fragile. Stage 5 currently uses only the anchor text for a limited multiplier. It does not use the stronger semantic signal that the extraction may have split the truth condition in a problematic way.

### 5. Same-input runs show the issue is structural, not incidental

The exact same input family on 2026-04-08 produced:
- `FALSE`
- `MOSTLY-FALSE`
- `MIXED`
- `MOSTLY-TRUE`
- `TRUE`

Observed pattern:
- Runs that decompose “rechtskräftig” into both direct claims often land correctly false.
- Runs that isolate the legal-effect issue into one separate claim while keeping two true timeline claims often land mixed or true-leaning.

Therefore:
- Stage-1 instability explains part of the family spread.
- But the dominant-claim blind spot is independently real, because the target run already contains the decisive false claim and still aggregates incorrectly.

## Comparator Jobs

### Same Swiss family

- `11a8f75cb79449b69f152635eb42663a` (2026-04-08 21:05 UTC): `100 / 95 / 15` -> article `65`
- `67a3d07df2d04ebaab7a0ec0f256bd1a` (2026-04-08 11:07 UTC): `95 / 98 / 20` -> article `77`
- `f21f5fe6ca8a40a18db7d4c0b9bf6c5d` (2026-04-08 16:10 UTC): two claims, both false-ish (`15 / 20`) -> article `16`

The 3-claim runs are where dominance-aware aggregation is needed most.

### Non-dominant control families

`70a3963c15aa47009ea694f786d1897e` — `Plastic recycling is pointless`
- Claims: `42 / 28 / 75`
- This looks like a genuine multi-dimension input.
- No single claim should automatically dominate.
- Good control for conservative “no dominant claim” behavior.

`173ccb848e394026b96933a39073146a` — Bolsonaro procedural-law / fair-trial input
- Claims: `75 / 68 / 60`
- Fair-trial concerns matter, but there is no obvious single decisive claim that should flip the article polarity on its own.
- Good control for multi-part evaluative claims.

`a0c5e51e00cb4de080f961fc9854ed55` — Hydrogen efficiency input
- Claims: `18 / 28 / 92`
- This is an ambiguous “efficiency” input spanning multiple notions.
- Good control against falsely declaring one dimension universally dominant.

## Consolidated Solution

### Core design

Add a new explicit Stage-5 LLM step:
- `DOMINANT_CLAIM_ASSESSMENT`

Purpose:
- Decide whether the original input has:
  - no dominant claim
  - one dominant claim
  - a dominant cluster of claims
- Judge dominance against the original input wording, not just the extracted claims.
- Determine whether a claim is a truth-condition-bearing hinge for the article-level verdict.

### Why Stage 5, not Stage 1

Dominance should be assessed **after** per-claim verdicts exist because:
- the question is article-level: “which claim materially determines whether the input is true?”
- the model needs the actual claim verdicts and claim confidence to decide how much the decisive claim should matter
- this avoids overcommitting during extraction for inputs that are genuinely multi-dimensional

However, Stage 1 contract-validation output should be passed into the dominance step as context:
- `preservesContract`
- `truthConditionAnchor`
- `anchorRetryReason`

That lets Stage 5 treat known contract-fragile decompositions more cautiously.

### Required prompt/output shape

Use categorical outputs, not raw continuous scores.

Recommended schema:

```json
{
  "dominanceMode": "none | single | cluster",
  "overallConfidence": "high | medium | low",
  "groups": [
    {
      "claimIds": ["AC_03"],
      "dominanceLevel": "decisive | strong | ordinary",
      "role": "truth_condition | core_proposition | supporting_dimension | background_detail",
      "rationale": "string"
    }
  ]
}
```

Important prompt rules:
- Start from the original input, not the extracted claim list.
- Ask which claim(s), if false, would materially invalidate the user's proposition.
- Ask which claim(s) are merely supporting dimensions or timeline/context details.
- Instruct the model to choose `none` unless dominance is clear.
- Instruct the model that multi-dimensional inputs often have no dominant claim.

### Aggregation behavior

Do not replace the existing base aggregation. Add a second layer:

1. Compute the current base aggregate exactly as now.
2. Compute a dominance-aware aggregate using LLM-assigned dominance multipliers.
3. Blend or select between them conservatively.

Recommended starting policy:
- `ordinary`: `1.0x`
- `strong`: `2.0x`
- `decisive`: `4.0x`

These should be UCM-backed.

Reason:
- The target family needs a materially stronger shift than the current `anchorClaimMultiplier: 2.5`.
- In the target job, a further `4x` decisive weighting on `AC_03` pulls the aggregate into the false-leaning band instead of leaving it true-leaning.
- In non-dominant controls, nothing changes because the dominance step should return `none`.

### Article-level adjudication change

`VERDICT_NARRATIVE` must be changed so that article-level override is allowed when:
- a dominant claim/group exists, and
- the dominant verdict materially conflicts with the base aggregate

Current prompt contract explicitly forbids this. That rule must be narrowed to:
- “Keep deterministic aggregation when there are no unresolved claims **and no dominant-claim override condition**.”

Without this change, the article-level narrative can describe the problem but cannot correct it.

### Interaction with Stage 1 contract failures

For the first implementation, do not block Stage 5 on contract failure.
Do:
- pass `contractValidationSummary` into dominance assessment
- cap final confidence when dominance relies on a contract-fragile extraction
- surface this in observability

This makes the target family safer immediately without turning contract mismatch into a hard pipeline stop.

## Risks

### If too aggressive

- Multi-dimensional inputs will collapse onto one claim incorrectly.
- “Plastic recycling is pointless” style inputs may overreact to one economic or operational dimension.
- Article truth may become overly sensitive to a single unstable medium-confidence claim.

### If too weak

- Swiss-family failures will persist because the decisive legal-effect claim still cannot overcome two true timeline claims.

### Prompt risk

- If the dominance prompt is not explicitly conservative, LLMs will over-assign dominance.
- If the prompt does not ground against the original input text, it will merely ratify the existing claim split.

## Recommended Plan

### Phase 1 — Dominance infrastructure

Files:
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/src/lib/analyzer/aggregation-stage.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/configs/calculation.default.json`

Work:
- Add `DOMINANT_CLAIM_ASSESSMENT` prompt section
- Add result type to persisted output
- Add UCM config for dominance multipliers and enable flag
- Compute `dominanceAwareTruthPercentage` alongside base aggregate

### Phase 2 — Article adjudication contract repair

Files:
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/src/lib/analyzer/aggregation-stage.ts`

Work:
- Update `VERDICT_NARRATIVE` so dominance may override the deterministic average even when all direct claims were assessed
- Feed dominance assessment + both aggregates into the prompt
- Persist both base and adjusted article truth for auditability

### Phase 3 — Validation

Must include:
- Swiss treaty family with and without `rechtskräftig`
- `Plastic recycling is pointless`
- Bolsonaro fair-trial input
- Hydrogen efficiency input
- At least one multilingual non-Swiss control

Success criteria:
- Swiss dominant-claim cases stop landing in `MOSTLY-TRUE` / `TRUE` when the decisive legal-effect claim is false
- Non-dominant controls show little or no movement
- Dominance step returns `none` for genuinely multi-dimensional inputs often enough to be trustworthy

## Recommended Captain Decision

Approve a Stage-5 dominant-claim design with:
- dedicated LLM dominance assessment
- conservative categorical outputs
- UCM-backed dominance multipliers
- prompt-contract update allowing article override when dominance exists

Do not try to solve this by only increasing `anchorClaimMultiplier`.
That is too blunt for general use and still leaves the narrative prompt contract unable to correct a known semantically bad average.
