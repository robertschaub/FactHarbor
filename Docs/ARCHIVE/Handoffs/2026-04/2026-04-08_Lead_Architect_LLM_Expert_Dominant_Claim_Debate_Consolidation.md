---
### 2026-04-08 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Debate Consolidation
**Task:** Investigate job `11a8f75cb79449b69f152635eb42663a`, analyze other mixed-direction jobs, call an internal debate, and return a consolidated solution and plan for dominant AtomicClaim handling.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_LLM_Expert_Dominant_Claim_Debate_Consolidation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The root issue is split across Stage 1 and Stage 5, but the primary fix should live in Stage 5. Add an explicit LLM-driven dominant-claim assessment before final aggregation, keep weighting deterministic and auditable, and add a code guard so article-level narrative override cannot change complete-assessment jobs unless a validated dominance condition exists.
**Open items:** Captain approval is required before prompt changes. Implementation still needs the exact UCM config shape and the final choice of dominance multipliers.
**Warnings:** Raising `anchorClaimMultiplier` alone is insufficient. The target job already applies the anchor boost and still lands at `LEANING-TRUE 65`. Prompt-only rescue in `VERDICT_NARRATIVE` is unsafe because one sibling Swiss run already drifted from deterministic `~61.4` to final `77`.
**For next agent:** Reuse the existing investigation handoff `Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_Dominant_Claim_Aggregation_Investigation.md`, but treat this file as the current decision record. Validate against Swiss target `11a8f75c...`, Swiss sibling `67a3d07d...`, hydrogen `a0c5e51e...`, plastic control `70a3963c...`, and one multilingual control before promotion.
**Learnings:** No

## Evidence Reviewed

- Live target job `11a8f75cb79449b69f152635eb42663a`
- Same-input Swiss sibling runs on 2026-04-08, including:
  - `67a3d07df2d04ebaab7a0ec0f256bd1a`
  - `f21f5fe6ca8a40a18db7d4c0b9bf6c5d`
  - `8c1c175635be4b25b38d5e7275d17ede`
  - `a8de06fd31584ddda253057c7639f764`
- Mixed-direction control families:
  - plastic recycling `70a3963c15aa47009ea694f786d1897e`
  - hydrogen efficiency `a0c5e51e00cb4de080f961fc9854ed55`
  - Bolsonaro fair-trial `173ccb848e394026b96933a39073146a`
- Relevant code paths:
  - `apps/web/src/lib/analyzer/aggregation-stage.ts`
  - `apps/web/prompts/claimboundary.prompt.md`
  - `apps/web/src/lib/analyzer/types.ts`
  - `apps/web/src/lib/config-schemas.ts`
  - `apps/web/configs/calculation.default.json`

## Consolidated Findings

### 1. The target run confirms the captain's concern

Target job `11a8f75cb79449b69f152635eb42663a` on 2026-04-08 produced:

- `AC_01`: `100 / 90`
- `AC_02`: `95 / 80`
- `AC_03`: `15 / 53`
- article: `LEANING-TRUE 65 / 72.6`

The article narrative already says the legal-binding part is false and materially distorts the whole claim, but the stored article verdict remains positive.

### 2. Stage 5 lacks semantic dominance handling

Current Stage-5 weighting uses only:

- centrality
- harm potential
- confidence
- triangulation
- derivative evidence attenuation
- anchor multiplier
- probative-value factor

For the target run, reconstructed weights were approximately:

- `AC_01`: `3.402`
- `AC_02`: `3.312`
- `AC_03`: `4.293`

So the decisive false claim already has the largest single weight, but two near-100 timeline claims still push the deterministic aggregate to `~65.3`.

### 3. This is not only a Swiss decomposition problem

Hydrogen control `a0c5e51e00cb4de080f961fc9854ed55` is structurally important:

- `AC_01`: `18 / 85`
- `AC_02`: `28 / 28`
- `AC_03`: `92 / 93`
- article: `LEANING-TRUE 58.1`

Contract preservation was clean there, so Stage 1 was not the main issue. The bad article verdict came from a true side-dimension claim outweighing the thesis-deciding efficiency claims. That confirms Stage 5 needs an explicit dominance concept even when extraction is faithful.

### 4. Stage 1 still contributes real variance in the Swiss family

The same Swiss input on 2026-04-08 produced outcomes ranging from `FALSE` to `TRUE`.

Observed pattern:

- runs that keep `rechtskräftig` attached to the governing proposition often land correctly false
- runs that isolate the legal-status issue into one separate claim while leaving two true chronology claims often land mixed or true-leaning

The target job itself logged:

- `preservesContract=false`
- anchor omission around `rechtskräftig`
- summary stating AC_03 injected a stronger legal-effect proposition than the input

So the root cause is both Stage 1 and Stage 5, but Stage 5 is the correct first fix because it can recover when the decisive claim still exists in the extracted set.

### 5. Article-level narrative override needs a hard guard

Swiss sibling `67a3d07df2d04ebaab7a0ec0f256bd1a` showed a second problem:

- deterministic reconstructed aggregate: `~61.4`
- final stored article truth: `77`

That drift came from `VERDICT_NARRATIVE.adjustedTruthPercentage`, even though all direct claims were assessed. This is unsafe for two reasons:

- the prompt contract says complete-assessment jobs should not be freely overridden
- a free-form narrative step is the wrong place to repair semantic dominance

Therefore any dominance work must include a code guard:

- if all direct claims are assessed and no validated dominance condition exists, article override must clamp to the deterministic aggregate

## Debate Outcome

Independent views converged on the same direction:

- Architect: Stage 1 instability matters, but Stage 5 needs the real fix because the same bug class appears in clean-extraction jobs.
- LLM Expert: Dominance must be LLM-detected, categorical, and conservative-by-default.
- Skeptic: No approval for global multiplier tuning or prompt-only rescue. Require a dedicated Stage-5 dominance step, persisted output, and an override guard.

## Recommended Solution

### New Stage-5 substep

Add `CLAIM_DOMINANCE_ASSESSMENT` before final article aggregation.

Recommended inputs:

- original user input
- extracted atomic claims
- `contractValidationSummary`
- per-claim verdict summary:
  - `truthPercentage`
  - `confidence`
  - `misleadingness`
  - evidence and boundary counts
  - claim direction / thesis relevance
- current baseline aggregate

Recommended categorical output:

```json
{
  "dominanceMode": "none | single | cluster",
  "assessmentConfidence": "low | medium | high",
  "groups": [
    {
      "claimIds": ["AC_03"],
      "dominanceLevel": "ordinary | strong | decisive",
      "role": "truth_condition | core_proposition | supporting_dimension | background_detail",
      "rationale": "string"
    }
  ]
}
```

### Aggregation policy

- Keep the current aggregate exactly as the baseline path.
- Apply deterministic, UCM-backed dominance multipliers only when `assessmentConfidence` is high.
- Fallback behavior with `dominanceMode=none` or low confidence must be byte-for-byte current behavior.

Recommended v1 posture:

- boost-only, not sibling attenuation yet
- `ordinary=1.0`
- `strong=2.0`
- `decisive=4.0`

This is simpler, auditable, and already sufficient to flip the target and hydrogen examples in simulation while leaving the plastic control materially unchanged when no dominance is detected.

### Narrative/adjudication guard

- block free-form article override for complete-assessment jobs unless a validated dominance condition exists
- when validated dominance exists, allow article-level adjudication to use the dominance-adjusted aggregate, not the raw baseline

## Why This Is Better Than The Alternatives

Rejected:

- global `anchorClaimMultiplier` increase
- prompt-only `VERDICT_NARRATIVE` rescue
- deterministic semantic heuristics for dominant-claim detection

Accepted:

- LLM semantic-role detection
- deterministic and UCM-controlled downstream weighting
- explicit fallback to current behavior when no clear dominant claim exists

## Implementation Plan

1. Add new result types in `apps/web/src/lib/analyzer/types.ts`.
2. Add UCM config in `apps/web/src/lib/config-schemas.ts` and `apps/web/configs/calculation.default.json`.
3. Add the new LLM call plus guarded dominance-aware aggregation path in `apps/web/src/lib/analyzer/aggregation-stage.ts`.
4. Add the new prompt section in `apps/web/prompts/claimboundary.prompt.md`.
5. Add the article-override clamp so complete-assessment jobs cannot drift without validated dominance.
6. Validate on:
   - Swiss target `11a8f75c...`
   - Swiss sibling override case `67a3d07d...`
   - hydrogen `a0c5e51e...`
   - plastic control `70a3963c...`
   - one multilingual control

## Validation Gate

Do not promote unless:

- Swiss target stops landing true-leaning when the decisive claim is false
- hydrogen stops landing true-leaning when the thesis-deciding efficiency claim is false
- plastic remains materially stable
- no dominance-free complete-assessment job can drift via `VERDICT_NARRATIVE`
