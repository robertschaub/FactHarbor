# 2026-04-20 Dominant Proposition Architecture Plan

## Status

- Decision state: reviewed, challenged, and re-consolidated
- Scope: Stage 1 structure, Stage 5 aggregation, report/UI shape, rollout controls
- Goal: introduce an optional parent/top-level proposition without damaging the current flat-claim pipeline
- Rollout posture: detection first, verdict semantics second
- 2026-09-24: Captain chose the three-claim split for act-level modifiers; see the update section below, which proposes a smaller Stage 5 change than Phase B

## 2026-09-24 update: three-claim decision and minimal Stage 5 path

**Decision (Captain, 2026-09-24; Backlog `DECOMP-RULES`).** When one act carries an act-level truth-condition-bearing modifier and is tied to several coordinated events, the target is one claim that fuses the modifier with the act plus one claim per branch that keeps the relation. For that structure this supersedes "Do not make truth-condition-bearing qualifier ⇒ separate child claim the default" below. The reviewed prompt change (claimboundary 1.0.14) is parked on local branch `claude/decomp-three-claims` (`2b9d54dee`). Until the Stage 5 change below exists, §Current Doctrine To Preserve stays in force on `main`.

**Why Stage 5 must change first.** In a three-claim set only the modifier claim carries the anchor, so today's baseline weights it 2.5× (`anchorClaimMultiplier`), while the two chronology claims are true. With high centrality for all three, modifier confidence 72 and chronology claims at truth 95 and confidence 85, the baseline is roughly (5.4·T + 2.55·95 + 2.55·95) / 10.5 for modifier truth T. That gives about 56 at T 20, 66 at T 38 and 69 at T 45 (other weight factors ignored). Article adjudication can pull the result down, but it runs only on a direction conflict, skips claims scoring 40–60 (`borderlineMargin` 10) and moves at most ±30 from the baseline (`aggregation-stage.ts:317`, `:642`, `:344`). A modifier claim at 45 therefore ends near 69 (LEANING-TRUE), outside this family's 29–57 band. The fused shape on `main` is in band in 8 of 21 local runs since 2026-04-20.

**Proposed change (generic, small, behind a UCM flag):**
1. **Anchor carriers from the validator only.** Replace the substring match in `aggregation-stage.ts:165-172` with the contract validator's LLM-validated carrier IDs (`validPreservedIds`, else `preservedInClaimIds`). The substring match is deterministic text matching, which AGENTS.md forbids, and it misses inflected forms; the same check was removed from Stage 1 in `9ca8c514` (Backlog `ANCHOR-SUBSTR`).
2. **Anchor-divergence trigger for article adjudication.** Also run the existing LLM adjudication when the anchor-carrying direct claims and the other direct claims differ in mean truth by at least `anchorDivergenceMargin` (UCM, proposed default 20), even if a carrier is borderline. This is structural routing on typed LLM outputs; whether the carrier is decisive stays an LLM judgment under the adjudication prompt's existing decisive-claim rule, which already receives `contractValidationSummary`.
3. **Flag and audit.** Add `articleAdjudication.anchorDivergenceTrigger` (default `false`) and record in `adjudicationPath` which trigger fired. Rollback means turning the flag off. Keep the ±30 cap for now and revisit it only with validation data.

**Not in this step:** no parent proposition (Phase A/B), no strict "all must hold" semantics, and no change to research or per-claim verdicts. Strict conjunction would cap the article at the modifier claim's truth (often 10–30, FALSE), below this family's MIXED/LEANING-FALSE band. Note also that the dossier's `dominance_weighted` weights (0.5 modifier, 0.2 per chronology branch, 0.1 signature) give about 67 at T 38, outside its own band; the band implies stronger dominance, which is why the decision is left to the adjudicator rather than fixed weights.

**Validation (paid; needs Captain go and spend cap).** Commit the prompt change and the Stage 5 change together on the branch, reseed, and run one job at a time with the flag on:
- `bundesrat-rechtskraftig` ×3 (target: three claims, in band in at least 2 of 3);
- `bundesrat-simple` ×1 (no modifier; must stay TRUE/MOSTLY-TRUE);
- `bolsonaro-pt` ×1 and `bolsonaro-en` ×1 (coordinated clauses; no spurious modifier claim, band holds);
- `plastic-en` ×1 (null control).

That is 7 jobs, roughly $12–15 now that source-reliability cost is recorded. Compare with the fused baseline job `d3de379c` (2026-09-23 UTC) and add a same-commit fused arm only if the results are ambiguous. Stop on any failed job, a second hard failure, or a clear regression on a control.

**If this is not enough:** implement Phase A/B below with a dominance-weighted parent mode, in which Stage 1 assigns component roles, instead of `all_must_hold`.

## Consolidated Solution

### Core model

- `topLevelProposition` is optional
- `atomicClaims` remain the researched, verdict-bearing child claims
- `topLevelProposition` lives **outside** `atomicClaims`
- In docs/UI, the concept can be called `dominant proposition`
- In code, prefer `topLevelProposition` to avoid collision with existing Stage 5 `dominanceAssessment`

Proposed Phase A contract:

```ts
topLevelProposition?: {
  statement: string;
  componentClaimIds: string[];
};
```

Semantics:

- `articleThesis` remains the general Stage 1 thesis summary for the input
- `topLevelProposition.statement` is a canonical parent proposition only when the input contains a genuine conjunctive parent structure
- `topLevelProposition.statement` must be derived from input text and must not be copied mechanically from `articleThesis`
- when both exist, they may be semantically close, but they are not interchangeable fields
- `topLevelProposition` is valid only when `componentClaimIds` identifies at least two child claims
- `dominanceAssessment` remains a Stage 5 peer-conflict concept and is orthogonal to parent/component structure
- `topLevelProposition` is provisional until the final accepted child set has passed Stage 1 end-state validation

### Atomic-claim rule

- `atomicClaims` are independently checkable component propositions
- No redundant bare restatement claim inside `atomicClaims`
- Do not treat the parent as an additional atomic claim
- Do not make “truth-condition-bearing qualifier => separate child claim” the default generic rule

### Checkability rule

- Every atomic-claim candidate must pass a soft checkability gate
- The gate must stay LLM-based, not deterministic
- Persisted schema should keep current `AtomicClaim.verifiability`
- If a richer disposition is needed later, keep it internal first, e.g.:

```ts
checkabilityDisposition: "keep" | "repair" | "drop";
```

- Do not persist that disposition in the first rollout

## What Changes Now vs Later

### Phase A: Alpha-safe detection MVP

Do now:

- Add optional `topLevelProposition` to Stage 1 output and `CBClaimUnderstanding`
- Add explicit type comments/JSDoc distinguishing:
  - `topLevelProposition` vs `articleThesis`
  - `topLevelProposition` vs Stage 5 `dominanceAssessment`
- Teach Pass 2 that `topLevelProposition` is allowed **outside** `atomicClaims`
- Clarify prompt/validator doctrine that:
  - decomposition-integrity rules apply to `atomicClaims`
  - `topLevelProposition` is not itself an atomic claim
  - `topLevelProposition` is not a “whole-input restatement exemption”
  - `topLevelProposition` should be absent for restatable but non-conjunctive inputs
- Add an explicit hard negative prompt rule:
  - do **not** create `topLevelProposition` for broad evaluative or multi-dimensional inputs whose candidate components are alternative readings, alternative explanatory axes, or independent evaluation dimensions rather than jointly necessary conditions
- Add post-retry Stage 1 structural validation that every `componentClaimId` resolves to a current `atomicClaims` entry and `componentClaimIds.length >= 2`; otherwise null out `topLevelProposition`
- Add final Stage 1 semantic re-authorization of `topLevelProposition` against the final accepted claim set during the same end-state LLM validation pass that refreshes claim-contract fidelity after Gate 1 changes
- If the final accepted child set survives structurally but the parent is no longer semantically justified relative to that final set, null out `topLevelProposition`
- Keep Stages 2-4 unchanged
- Keep child-claim research, clustering, and per-claim verdicting unchanged
- Keep current report internals child-claim based
- Keep aggregation flag off by default until benchmark observation is complete

Do not do yet:

- Do not add the parent to `atomicClaims`
- Do not add the parent to `claimVerdicts`
- Do not let the parent affect top-level truth/confidence yet
- Do not add a persisted `evaluationMode` field yet

### Phase B: Parent-aware aggregation after observation

Add a separate Stage 5 path only after Phase A detection behavior is validated.

- if `topLevelProposition` is absent:
  - keep current weighted-average aggregation
- if `topLevelProposition` exists and parent-aware aggregation is enabled:
  - use strict conjunction (`all_must_hold`) as the first supported parent semantics
  - compute the article-level verdict from the linked child claims
  - cap top-level truth by the weakest decisive child
  - cap top-level confidence by the weakest decisive child
  - derive overall range from the child ranges
  - if any required child is `UNVERIFIED`, `INSUFFICIENT`, confidence-`0`, or otherwise non-publishable, the parent must not inherit same-direction fallback behavior; instead force the parent result to a non-publishable `UNVERIFIED` state
  - record `aggregationMode: "all_must_hold"` in the adjudication trail
  - record `constrainingClaimId` in the adjudication trail when a resolved child bottlenecks the score
  - record `unresolvedRequiredClaimIds` when an unresolved child blocks publication

Do not:

- reuse `articleAdjudication`
- reuse `dominanceAssessment`
- treat the parent as one more peer claim
- run the existing `dominanceAssessment` path when parent-aware aggregation fires
- introduce deterministic heuristics that infer parent semantics from `claimWeightRationale`; if richer parent semantics are needed later, add them explicitly rather than deriving them heuristically

### Phase B contract additions

Parent-aware aggregation needs an explicit result/audit extension before coding starts.

Recommended direction:

```ts
adjudicationPath?: {
  baselineAggregate: { truthPercentage: number; confidence: number };
  finalAggregate: { truthPercentage: number; confidence: number };
  path:
    | "baseline_same_direction"
    | "llm_adjudicated"
    | "baseline_fallback"
    | "parent_all_must_hold";
  parentAggregation?: {
    aggregationMode: "all_must_hold";
    componentClaimIds: string[];
    constrainingClaimId?: string;
    unresolvedRequiredClaimIds?: string[];
    publishable: boolean;
  };
}
```

Rules:

- `articleAdjudication` remains absent on parent-aware runs
- `dominanceAssessment` remains absent on parent-aware runs
- `parentAggregation` is the audit surface for parent-aware Stage 5 results
- `truthPercentage` / `confidence` in `OverallAssessment` still carry the final stored top-level values, but their derivation is explained by `adjudicationPath.path = "parent_all_must_hold"` plus `parentAggregation`

#### Phase B Migration Semantics

- the illustrative `adjudicationPath` block above is an extension pattern, not a silent replacement of the current live Option G `AdjudicationPath` contract in `types.ts`
- on non-parent runs, keep the current Option G `AdjudicationPath` contract unchanged
- on parent-aware runs, use `adjudicationPath.path = "parent_all_must_hold"` plus `parentAggregation`; `articleAdjudication` remains absent on those runs
- Option G-only fields such as `directionConflict`, `llmAdjudication`, and `guardsApplied` must either remain intact for non-parent runs or be intentionally redesigned in the same change; they must never be dropped implicitly

### Phase C: Report/UI exposure

- Show the parent/top-level proposition at the top of the report
- Show child claims beneath it
- Keep coverage matrices and evidence linkage child-claim based until a dedicated parent-report contract exists
- When both exist, show `topLevelProposition` as the main headline proposition
- Keep `articleThesis` available in diagnostics, export, and admin surfaces instead of removing it entirely

## Why This Is The Recommended Shape

### What it solves

- avoids flat weighted averaging when one overarching proposition should be constrained by conjunctive child claims
- preserves current Stage 1 atomicity work instead of undoing it
- makes the architecture capable of representing “one overarching proposition, multiple checkable components”

### What it avoids

- double-counting in aggregation
- distortion of Gate 4 and report claim counts
- overfitting the architecture to the Bundesrat `rechtskräftig` case
- forcing parent structures onto broad evaluative inputs that should remain flat or ambiguous
- premature commitment to verdict semantics before observing detection quality

## Current Doctrine To Preserve

Until parent-aware aggregation is live, keep the current fused-branch doctrine:

- coordinated-branch decomposition keeps truth-condition-bearing modifiers fused into each branch claim when required
- do not externalize a modifier into a standalone peer claim inside the current flat claim set

This is the safer current operational output for cases like the approved Bundesrat family.

## Prompt Doctrine Changes Required

- Update the decomposition-integrity rule so it explicitly applies to `atomicClaims`, not to `topLevelProposition`
- State explicitly that `topLevelProposition` is valid only when the input contains a genuine conjunctive parent structure
- State explicitly that a whole-input paraphrase is **not** sufficient reason to emit `topLevelProposition`
- State explicitly that `articleThesis` summarizes what the input is about, while `topLevelProposition.statement` is a truth-evaluable conjunction whose falsity follows from falsifying any single component; if the model cannot state which component failure would falsify the parent, it must not emit `topLevelProposition`
- Add a hard negative rule for alternative-dimension decompositions:
  - if the candidate child propositions are independent reasons, alternative interpretations, or separate evaluation axes that could each make the input seem true/false on their own, do **not** emit `topLevelProposition`
  - default to `topLevelProposition = null`

## Control Cases

### Cases that may justify `topLevelProposition`

- one overarching proposition whose truth depends on multiple independently checkable component propositions
- conjunctive legal/procedural structures
- coordinated branch structures where multiple conditions must all hold
- some comparison families, if the model can justify a true conjunctive parent

### Cases that should often remain `topLevelProposition = null`

- flat multi-assertion inputs
- broad evaluative / ambiguous-dimension inputs without a clearly conjunctive parent
- inputs like `Plastic recycling is pointless` unless Stage 1 can justify a real parent-child conjunction rather than alternative readings/dimensions

`plastic-en` should remain a strong null-control during rollout.

## Risks

### High risks

- Parent treated as another peer claim, causing double-counting
- Ambiguous use of “dominance” because Stage 5 already has `dominanceAssessment`
- Parent detection becomes too eager and creates unstable outputs
- Rich checkability gating becomes too tight and drops hard-but-valid claims
- stale or hallucinated `componentClaimIds` survive retry loops and silently mis-link parent structure
- structurally valid parents survive retries even when the final accepted child set no longer semantically supports the parent
- unresolved required children leak through same-direction fallback logic and make a conjunctive parent look publishable when it is not

### Medium risks

- Prompt doctrine conflict if decomposition-integrity checks are not explicitly limited to `atomicClaims`
- Report/UI confusion if parent and child claims are mixed without clear hierarchy
- downstream consumers assume top-level truth is still a weighted mean of peer claims when parent-aware aggregation is active
- parent-aware runs overload existing Option-G audit fields because no dedicated contract is defined first

## Risk Mitigations

- Use `topLevelProposition` in code, not `dominantProposition`
- Keep the parent outside `atomicClaims`
- Add explicit JSDoc comments distinguishing `topLevelProposition`, `articleThesis`, and `dominanceAssessment`
- Validate `componentClaimIds` after the final Stage 1 retry outcome, not inline during provisional extraction
- Re-authorize the parent semantically during the final Stage 1 contract-validation refresh, not only structurally by ID
- Introduce parent-aware Stage 5 as a separate path, not a modification of flat peer weighting
- Keep checkability gating LLM-only
- Keep `keep | repair | drop` internal first
- Use UCM feature flags for rollout
- Keep `plastic-en` as a null-control and Bundesrat families as positive controls
- Add adjudication audit fields for parent-aware aggregation so score bottlenecks are explicit
- Force unresolved required children into a non-publishable parent outcome; do not inherit same-direction fallback from the current flat aggregator

## UCM Rollout Flags

Recommended:

- `topLevelPropositionDetectionEnabled`
- `topLevelPropositionAggregationEnabled`

Recommended alpha defaults:

- detection: `true`
- aggregation: `false`

Recommended rollback behavior:

- if detection is noisy, disable detection
- if detection looks good but top-level verdicting misbehaves, leave detection on and disable aggregation only

## Recommended Implementation Order

1. Add `topLevelProposition` to types and Stage 1 schemas
2. Update Stage 1 prompts so the parent is explicit, outside `atomicClaims`, distinguishable from `articleThesis`, and blocked on alternative-dimension cases
3. Add Stage 1 output validation that nulls invalid `componentClaimIds` after retries settle
4. Add final parent semantic re-authorization in the Stage 1 end-state contract validation pass
5. Add explicit type comments separating `topLevelProposition`, `articleThesis`, and `dominanceAssessment`
6. Add UCM flags
7. Run detection-only validation on approved benchmark families
8. Define the parent-aware `AdjudicationPath` / `OverallAssessment` extension contract before writing Stage 5 code
9. Only after observing detection quality, add the Stage 5 parent-aware path
10. Update report/UI rendering

Tests to add:

- parent is optional
- parent is not counted as an atomic claim
- parent can reference only existing child claim IDs
- single-component parents are nulled during structural validation
- `plastic-en` can remain parentless
- parent validation runs on the final post-retry claim set, not provisional IDs
- parent survives only when the final Stage 1 semantic re-validation re-authorizes it against the accepted child set
- when parent-aware aggregation is enabled, `dominanceAssessment` is bypassed and the adjudication path records `aggregationMode` and `constrainingClaimId`
- unresolved required children force a non-publishable `UNVERIFIED` parent outcome

## Validation Focus

Positive controls:

- `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
- `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`

Null / caution controls:

- `Plastic recycling is pointless`
- other approved flat or ambiguous benchmark families that should not gain a parent proposition spuriously

Observation gate before Phase B:

- do not enable parent-aware aggregation by default until detection behavior is stable across the approved benchmark suite, especially the null-controls
- monitor Pass 2 prompt-token growth and cache reuse after the `topLevelProposition` doctrine lands; if the added guidance materially hurts prompt focus or caching efficiency, move it into a dedicated prompt section/caching boundary rather than continuing to inline it

## Reviewer Prompts

### Sonnet reviewer prompt

Review this plan as an architecture and migration proposal for FactHarbor. Focus on whether the proposed optional `topLevelProposition` field, post-retry and final semantic parent re-authorization, child-only research flow, and delayed parent-aware aggregation path are coherent with the current Stage 1/Stage 5 pipeline. Challenge naming, schema boundaries, the `articleThesis` relationship, unresolved-child semantics, and prompt doctrine around conjunctive vs alternative-dimension inputs.

### Gemini reviewer prompt

Review this plan as a constraints and risk audit. Focus on over-detection risk, null-control discipline, dominanceAssessment interaction, parent-aware adjudication-contract clarity, and whether keeping aggregation disabled by default until post-benchmark observation is the right rollout. Flag any remaining path that could create double-counting, stale parent-to-child references, unresolved-child leakage, or misleading top-level truth semantics.
