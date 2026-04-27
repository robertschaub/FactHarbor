# Budget-Aware ACS Slice 5 Review Design

**Date:** 2026-04-27
**Status:** Review complete; Phase 5A metadata plumbing implemented; bounded Phase 5B prompt-mode implementation prepared
**Owner role:** Lead Architect

**Implementation update (2026-04-27):** Phase 5A landed the default-off UCM fields, optional budget/deferred metadata schema, persistence, and UI/API disclosure. The bounded Phase 5B implementation keeps defaults off, passes structural budget context only through the existing ACS recommendation path, keeps `explain_only` as shadow metadata without operational deferral, and permits fewer-than-cap recommendations only under explicit `allow_fewer_recommendations` mode with `budgetFitRationale` and validated deferred-claim metadata. No source reuse, second selector, deterministic semantic filtering, hidden cap, or final-runner claim dropping is approved.

## 1. Decision

Proceed with Slice 5 design as the next product lever after the live SVP metrics review.

Budget-aware AtomicClaim Selection may recommend fewer than `claimSelectionCap`, because the cap is an upper bound rather than a target. This is acceptable only when the decision is made by the batched ACS LLM over the full final Stage 1 candidate set and is persisted with explicit budget-fit and deferred-claim metadata.

This does not approve source artifact reuse, deterministic claim filtering, a second selector, or silent claim dropping.

## 2. Evidence Basis

The 2026-04-27 live SVP run showed:

- `28` prepared candidate claims.
- `5` ACS-selected claims.
- Only `3` of `5` selected claims received Stage 2 research iterations.
- `0` contradiction iterations.
- `contradictionReachability.notRunReason = time_budget_exhausted`.
- Exact normalized Stage 1 -> Stage 2 URL overlap was `0/5` Stage 1 URLs and `0/31` Stage 2 URLs.

Conclusion: source reuse is not the next justified lever for this case. The next risk is budget fit between ACS breadth and Stage 2 research capacity.

## 3. Reviewer Outcome

LLM Expert verdict: `MODIFY before implementation`.

Accepted:

- ACS may recommend fewer than the configured cap.
- The recommendation must reason over the full candidate set.
- Deferred claims must remain visible and explicitly categorized.

Rejected:

- deterministic semantic filtering;
- hidden caps;
- silent dropping after recommendation;
- English-only prompt logic;
- source-reuse implementation from this gate.

Senior Developer verdict: approve design direction, not implementation yet.

Accepted:

- extend the existing ACS path instead of adding a new selector;
- keep `recommendedClaimIds` as `0..cap`;
- add optional budget/deferred metadata;
- persist through draft state and final job metadata;
- use UCM-only mitigation first for unattended validation runs.

Rejected:

- a second hidden cap;
- changing `claimSelectionCap` defaults globally from one run;
- final-runner logic that silently removes selected claims.

## 4. Behavioral Contract

The final product behavior must satisfy all of these rules:

1. `claimSelectionCap` remains the maximum selectable/recommended count, not a target.
2. The ACS LLM sees the full final Stage 1 candidate set and still returns a full ranking.
3. A fewer-than-cap recommendation is valid only with a budget-fit rationale.
4. Claims not recommended because of budget pressure are `deferred`, not dropped, disproven, failed, low-quality, or unimportant.
5. Manual users may still select deferred claims up to `claimSelectionCap`.
6. Automatic mode may auto-confirm only the recommended IDs, while preserving deferred state in metadata.
7. No deterministic semantic claim-text logic may select, defer, rank, or filter claims.
8. Structural budget arithmetic may compute exposed budget context, but must not become an enforced semantic selector.

## 5. UCM Contract

Use existing UCM fields as primary inputs:

- `claimSelectionDefaultMode`
- `claimSelectionCap`
- `researchTimeBudgetMs`
- `contradictionProtectedTimeMs`

Add new UCM fields only if the implementation needs them:

- `claimSelectionBudgetAwarenessEnabled`: boolean, default `false` for first landing.
- `claimSelectionBudgetFitMode`: enum, proposed values `off`, `explain_only`, `allow_fewer_recommendations`.
- `claimSelectionMinRecommendedClaims`: number, default `1`.
- `claimSelectionPerClaimBudgetTargetMs`: number, optional structural planning value used only to expose an advisory budget target to the LLM.

Do not derive a universal default from the single SVP run. If `claimSelectionPerClaimBudgetTargetMs` is added, it must be UCM-visible and treated as an operator-tuned planning value, not an inferred performance model.

All added defaults must be present in both `apps/web/src/lib/config-schemas.ts` and `apps/web/configs/pipeline.default.json`.

## 6. Schema Contract

Extend the existing ACS recommendation schema rather than adding a new selector.

Recommended shape:

```ts
type ClaimBudgetTreatment =
  | "selected"
  | "deferred_budget_limited"
  | "not_recommended";

interface ClaimSelectionRecommendation {
  rankedClaimIds: string[];
  recommendedClaimIds: string[];
  deferredClaimIds?: string[];
  budgetFitRationale?: string;
  assessments: Array<{
    claimId: string;
    triageLabel: string;
    thesisDirectness: string;
    expectedEvidenceYield: string;
    coversDistinctRelevantDimension: boolean;
    redundancyWithClaimIds: string[];
    recommendationRationale: string;
    budgetTreatment?: ClaimBudgetTreatment;
    budgetTreatmentRationale?: string;
  }>;
  rationale: string;
}
```

Validation rules:

- `recommendedClaimIds` remain unique and must be a subset of `rankedClaimIds`.
- `deferredClaimIds` must be unique, must be a subset of `rankedClaimIds`, and must not overlap `recommendedClaimIds`.
- If budget awareness is active and `recommendedClaimIds.length < claimSelectionCap`, require `budgetFitRationale`.
- If a claim has `budgetTreatment = deferred_budget_limited`, it must appear in `deferredClaimIds`.
- If automatic mode confirms a fewer-than-cap recommendation, persist the budget/deferred fields into `ClaimSelectionDraftState` and `ClaimSelectionMetadata`.

## 7. Prompt Contract

Prompt changes require explicit Captain approval before code edits.

The prompt must stay topic-neutral and multilingual. It may describe budget as a structural constraint, but it must not include case-specific terms, SVP-specific wording, language-specific heuristics, or examples using concrete validation topics.

Prompt requirements:

- rank every candidate claim;
- choose up to `claimSelectionCap`;
- consider the available research budget and protected contradiction budget;
- avoid truth, reliability, or verdict judgments;
- explain when fewer-than-cap recommendations are due to budget fit;
- mark budget-limited non-selections as deferred;
- preserve the original claim wording and language;
- state that deferred claims remain valid candidates for manual selection.

## 8. UI and API Contract

Manual selection UI:

- show recommended claims as preselected;
- show deferred budget-limited claims distinctly;
- avoid wording that implies deferred claims are false, weak, failed, unimportant, or removed;
- allow the user/admin to override by selecting deferred claims up to `claimSelectionCap`.

Automatic mode:

- auto-confirm only `recommendedClaimIds`;
- persist budget-fit and deferred metadata;
- expose the reduced-selection reason in admin/debug views and final job metadata.

API:

- keep existing confirm validation: selected IDs must be candidate IDs and count must be `1..cap`;
- pass budget/deferred fields through draft detail, internal auto-confirm, final job metadata, and admin JSON;
- do not reject manual selection of deferred claims unless it violates the existing cap/candidate constraints.

Prepared snapshots:

- UCM budget-behavior changes affect `pipelineConfigHash`.
- Existing prepared drafts should be retried rather than reused across budget-behavior changes.

## 9. Operational Mitigation Before Product Change

For unattended validation runs, the reversible UCM-only mitigation is:

1. Set `claimSelectionDefaultMode = automatic`.
2. Choose one scoped validation profile:
   - lower `claimSelectionCap` to reduce breadth and cost; or
   - raise `researchTimeBudgetMs` and `contradictionProtectedTimeMs` to preserve breadth.
3. Measure with `analysisObservability.acsResearchWaste.selectedClaimResearch` and `contradictionReachability`.

Do not treat this as a product fix. It is an operational profile for measurement and unattended runs.

## 10. Test Plan

Required local tests before implementation can be considered complete:

- recommendation schema validation for `budgetFitRationale`, `deferredClaimIds`, and per-assessment `budgetTreatment`;
- prompt variable rendering for budget context;
- fewer-than-cap recommendation accepted when budget-aware metadata is present;
- fewer-than-cap automatic mode auto-confirms only recommended IDs and persists deferred metadata;
- manual UI displays deferred claims and permits manual override within cap;
- API confirm path preserves budget/deferred metadata;
- config drift test for UCM defaults;
- stale prepared-snapshot behavior after UCM budget changes;
- multilingual validation scenarios using Captain-approved inputs.

Verification commands:

- `npm test`
- `npm -w apps/web run build`
- `git diff --check`

Live validation remains gated by commit-first and runtime/config-refresh discipline.

## 11. Risks and Controls

| Risk | Control |
| --- | --- |
| One SVP run overfits defaults | Keep new behavior default-off or explicitly profiled; do not set universal defaults from one run. |
| Budget-aware ACS hides claims | Persist deferred state and show it in UI/API/admin metadata. |
| A hidden deterministic cap emerges | Keep budget target advisory only; LLM makes semantic select/defer decisions over the full candidate set. |
| Automatic mode obscures reduced selection | Persist and expose `budgetFitRationale` and deferred claims. |
| Prompt changes regress multilingual behavior | Use topic-neutral prompt wording and multilingual Captain-approved validation inputs. |
| Prepared drafts use stale budget behavior | Rely on `pipelineConfigHash`; retry existing prepared drafts after UCM budget changes. |
| Operators tune breadth vs. budget inconsistently | Document validation profiles and compare `selectedClaimResearch` plus `contradictionReachability`. |

## 12. Implementation Readiness

Phase 5A and the bounded Phase 5B local implementation are ready for commit after safe-local verification. Live validation remains a separate gate.

Do not enable a broad validation profile from the SVP case alone. Any live validation must follow commit-first and runtime/config-refresh discipline, use Captain-approved inputs, and inspect `analysisObservability.acsResearchWaste.selectedClaimResearch`, `contradictionReachability`, selected-claim quality, and `UNVERIFIED` rate before considering broader rollout.
