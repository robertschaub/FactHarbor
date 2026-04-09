---
### 2026-04-09 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Implementation Plan Rev A
**Task:** Convert the dominant-claim investigation and subsequent skeptical reviews into an updated implementation plan that is ready for another design review.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The implementation is now split into two tracks: Track A hardens Stage 5 before any new dominance logic lands, and Track B adds a narrow v1 dominance path. The final truth path for complete-assessment jobs will be deterministic after the dominance step; `VERDICT_NARRATIVE` will explain that result, not reinterpret it.
**Open items:** Another review is still required before implementation. The remaining open choices are the exact multiplier values and whether medium-confidence dominance should have a reduced effect or no effect in v1.
**Warnings:** This remains a compensating control for Stage-1 extraction variance, not a replacement for Stage-1 quality work. Hydrogen must be rerun on the current stack before it can be used as a promotion gate.
**For next agent:** Use this file as the new review artifact. The older April 8 handoffs remain historical context, but this document supersedes them on implementation order and review criteria.
**Learnings:** No

## Review Status

Status as of 2026-04-09:
- **Ready for Implementation Review**

Latest architect + LLM-expert review conclusion:
- the two-track structure is correct
- Track A must remain the hard gate
- the deterministic truth path for complete-assessment jobs is the correct architectural direction
- dominance superseding anchor is the correct safety model
- the simplified v1 taxonomy is the correct scope reduction

Two explicit watch items were carried forward from that review:
- monitor whether `LOW` confidence direct claims are too noisy to remain inside the complete-assessment predicate
- add an explicit default-behavior regression test proving that when no claim is marked decisive, the system falls back to the standard weighted average path

## Goal

Fix article-level verdicts that stay directionally wrong when one AtomicClaim is semantically decisive, while preserving current behavior for genuinely multi-dimensional inputs.

Primary motivating failure:
- Swiss target `11a8f75cb79449b69f152635eb42663a`

Required controls:
- Swiss sibling `67a3d07df2d04ebaab7a0ec0f256bd1a`
- plastic `70a3963c15aa47009ea694f786d1897e`
- Bolsonaro `173ccb848e394026b96933a39073146a`
- hydrogen `a0c5e51e00cb4de080f961fc9854ed55` after rerun on current code

## What Changed After Review

### Accepted from review

1. **Stage-5 hardening must land first or together with dominance.**
   The unguarded `adjustedTruthPercentage` path in `aggregation-stage.ts` is real and cannot remain open.

2. **`aggregateAssessment()` needs baseline regression tests before structural edits.**
   Current coverage is concentrated in `aggregation.ts`, not `aggregation-stage.ts`.

3. **Dominance must supersede anchor, not stack with it.**
   The design must avoid `anchorClaimMultiplier × dominanceMultiplier` compounding.

4. **Dominance output must be typed and persisted.**
   Auditability is a first-class requirement, not an implementation detail.

5. **Dominance should run before narrative generation.**
   The narrative should explain the reviewed aggregate, not improvise its own semantic correction.

6. **Scope should be narrowed for v1.**
   No `cluster` mode in v1 unless a concrete review case requires it.

7. **Track A is a hard gate, not a preference.**
   Track B must not merge without Track A. If split across PRs, Track A merges first. If combined, review and test gating must still treat Track A as the prerequisite.

8. **The complete-assessment predicate must be exact.**
   The plan must define this against actual pipeline fields, not vague prose.

9. **Dominance multipliers must be UCM-configurable from day one.**
   The values are calibration-sensitive and must not be hardcoded in the first implementation.

### Rejected or modified from review

1. **Rejected:** leaving truth override LLM-led for complete-assessment jobs.
   For complete-assessment jobs, once per-claim verdicts exist and the dominance step has run, the article truth path should be deterministic. Letting `VERDICT_NARRATIVE` move truth again creates a second semantic decision-maker and reopens the exact hole under review.

2. **Modified:** role taxonomy.
   The earlier four-role taxonomy was too fine-grained for v1. We will simplify it rather than keep the more nuanced distinction.

3. **Modified:** binary confidence gate as the only option.
   We should not pre-commit to either `high-only` or `medium+` until the arithmetic is rerun on the current stack. The plan below includes a calibration checkpoint for this.

## Updated Architecture

## Track A — Stage-5 Hardening Prerequisite

This track must be implemented before or in the same PR as dominance.

### A1. Add direct unit coverage for `aggregateAssessment()`

Create focused unit tests for:
- baseline weighted aggregation
- counter-claim inversion
- thesis-relevance zero-weight gate
- anchor fallback behavior
- explicit fallback-to-baseline behavior when dominance does not fire
- article-truth clamp for complete-assessment jobs
- confidence ceiling enforcement
- narrative-path branching
- no-regression identity path when dominance is absent

Purpose:
- freeze current intended behavior
- make later dominance edits auditable

### A2. Close the complete-assessment narrative override hole

Define **complete-assessment** as:
- every `CBClaimVerdict` whose corresponding claim has `thesisRelevance === "direct"`
- has `confidenceTier !== "INSUFFICIENT"`

Define **unresolved-claim** as any job where at least one direct claim fails that predicate.

Implementation watch item:
- if validation shows `LOW` confidence direct claims are still too unstable to drive deterministic article truth, tighten this predicate to `MEDIUM | HIGH` in a follow-up calibration decision rather than silently changing it mid-implementation

For complete-assessment jobs:
- article truth must not be changed by `VERDICT_NARRATIVE`
- article confidence may still be capped downward by structural rules

This is structural contract enforcement, not semantic adjudication:
- semantic decisions happen in per-claim verdict generation and, if present, in the new dominance step
- narrative becomes explanatory for complete-assessment jobs

### A3. Persist adjudication path explicitly

Add typed fields that record:
- baseline aggregate
- dominance-adjusted aggregate, if any
- final stored aggregate
- adjudication path:
  - `baseline_only`
  - `dominance_adjusted`
  - `unresolved_claim_narrative_adjustment`

This is required so future reviewers can see whether a result changed because of:
- base weighting
- dominance weighting
- unresolved-claim article adjudication

## Track B — Dominance MVP

### B1. Add a narrow Stage-5 LLM step

New prompt section:
- `CLAIM_DOMINANCE_ASSESSMENT`

Placement:
- after per-claim verdicts are available
- before `generateVerdictNarrative()`

Reason:
- dominance is article-level and depends on actual claim outcomes
- the narrative should receive the already-reviewed aggregate

### B2. Narrow v1 schema

Use this simplified v1 output:

```json
{
  "dominanceMode": "none | single",
  "dominanceConfidence": "low | medium | high",
  "dominantClaimId": "AC_03",
  "dominanceStrength": "strong | decisive",
  "claimRoles": [
    { "claimId": "AC_01", "role": "supporting" },
    { "claimId": "AC_02", "role": "supporting" },
    { "claimId": "AC_03", "role": "decisive" }
  ],
  "rationale": "string"
}
```

Changes from the earlier plan:
- dropped `cluster` for v1
- dropped `truth_condition | core_proposition | background_detail`
- kept only the role split needed for weighting

This reduces multilingual drift risk and removes a distinction that Stage 1 already struggles with.

### B3. Dominance supersedes anchor

Weighting rule:
- if validated dominance is present and a claim is the `dominantClaimId`, use the dominance multiplier and suppress anchor on that claim
- if dominance is absent, current anchor fallback remains

Do **not** multiply anchor and dominance together.

This gives:
- no `10x` compounding
- a clear migration path away from anchor-driven truth-condition handling
- safe fallback when dominance does not fire

### B4. Deterministic final truth path for complete-assessment jobs

For complete-assessment jobs, as defined in Track A2:
- compute baseline aggregate
- compute dominance-adjusted aggregate if validated dominance exists
- final stored truth is one of those deterministic outputs
- `VERDICT_NARRATIVE` receives that truth as input and explains it
- `adjustedTruthPercentage` from narrative is ignored on this path

For unresolved-claim jobs only:
- the existing article-level unresolved-claim adjudication path remains available

This is the strongest change in the revised plan, and it is intentional.

## Open Calibration Decision

We need one small calibration step before locking the v1 multipliers:

### Decision D1 — how to treat `dominanceConfidence=medium`

Two viable options:

Option 1:
- `medium` = no effect in v1
- `high` = full effect

Option 2:
- `medium` = reduced effect
- `high` = full effect

Current recommendation:
- do not decide this in prose
- run the arithmetic on the current stack first

If hydrogen only fixes under reduced-effect `medium`, that must be shown explicitly.
If Swiss requires `high` + `decisive`, that must also be shown explicitly.

### Decision D2 — initial multiplier ranges

The first implementation must not hardcode one exact pair in code.

Start with UCM-backed ranges:
- `strong`: `2.0 - 3.0`
- `decisive`: `4.0 - 6.0`

Review-time expectation:
- arithmetic must be shown for the approval set before choosing exact defaults
- the chosen defaults must ship as UCM values in `calculation.default.json`
- implementation should document that these are calibration defaults, not invariant constants

## Deliberate Non-Goals For This PR

These are intentionally out of scope for the first implementation review:

1. **No Stage-1 redesign in this PR.**
   We acknowledge this feature is partly compensating for Stage-1 variance.

2. **No revival of `articleVerdictOverride` config.**
   It is legacy/dead today. Do not entangle the new path with it. Handle cleanup separately.

3. **No sibling attenuation in v1.**
   Start with boost-only plus anchor supersession. Add attenuation only if current-stack arithmetic proves boost-only cannot satisfy the approval set.

4. **No multi-claim cluster mode in v1.**
   Revisit only when a real review case needs it.

## Implementation Sequence

1. Add tests for `aggregateAssessment()`.
2. Add typed persistence fields for aggregate path and dominance output.
3. Add the complete-assessment truth-override guard.
4. Rerun arithmetic baselines on the current stack for:
   - Swiss target
   - Swiss sibling
   - plastic
   - Bolsonaro
   - fresh hydrogen
5. Add `CLAIM_DOMINANCE_ASSESSMENT` prompt section and typed parser.
6. Implement v1 dominance path:
   - `none | single`
   - `supporting | decisive`
   - `strong | decisive`
   - anchor supersession
7. Recompute dominance-adjusted aggregate before narrative generation.
8. Restrict narrative truth adjustment to unresolved-claim paths only.
9. Run review validation.

Hard gate:
- Track B must not merge without steps 1-3 already implemented in the same PR or an earlier merged PR.

## Review Checklist For The Next Reviewer

The next design/code reviewer should explicitly verify:

- `aggregateAssessment()` now has baseline tests before the dominance logic lands
- complete-assessment jobs cannot drift via narrative truth override
- dominance supersedes anchor instead of stacking
- v1 schema is simplified enough to be multilingual-safe
- persistence is sufficient to reconstruct every final article verdict
- hydrogen validation uses a fresh current-stack run, not the old archived result

## Approval Gates

### Must pass before implementation approval

- complete-assessment truth override hole is structurally closed
- baseline `aggregateAssessment()` tests exist
- anchor/dominance interaction is non-stacking and explicitly specified
- typed persistence fields are specified in the plan

### Must pass before promotion

- Swiss target stops landing true-leaning
- Swiss sibling cannot drift upward through narrative override
- plastic stays within the agreed tolerance band
- Bolsonaro stays within the agreed tolerance band
- hydrogen is rerun on current code and behaves according to the chosen confidence policy
- at least one French and one English non-anchor control stay stable

## Recommended Review Question

For the next review round, the key question should be:

> Does this revised plan now define a single, auditable truth path for complete-assessment jobs, with dominance as the only new semantic adjustment layer and narrative restricted to explanation?

If the reviewer answers “yes,” the design is ready for implementation review.
