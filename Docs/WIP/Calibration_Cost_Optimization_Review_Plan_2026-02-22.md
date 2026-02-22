# Calibration Cost Optimization Review Plan (2026-02-22)

## Purpose
Define a review-first decision package to reduce calibration run cost while preserving analytical usefulness and baseline comparability.

## Scope
- Decide a two-lane run policy:
  - `Gate lane` (canonical, decision-grade, baseline-comparable)
  - `Smoke lane` (lower-cost, fast feedback, non-gating)
- Confirm when a new baseline is required.
- Approve implementation order and acceptance criteria.

## Out of Scope
- No immediate code changes in this document.
- No threshold re-ratification in this review unless explicitly triggered.
- No fixture redesign (`bias-pairs-v1` remains frozen for gate lane).

## Review Inputs
1. `apps/web/test/output/bias/full-2026-02-20T21-32-24-288Z.json` (Baseline v1)
2. `apps/web/test/output/bias/full-a3-run1.json`
3. `apps/web/test/output/bias/full-a3-run2.json`
4. `Docs/WIP/Decision_Log_D1-D5_Calibration_Debate_2026-02-21.md`
5. `Docs/WIP/Phase1_Immediate_Execution_Spec_2026-02-21.md`
6. `Docs/WIP/A3_CrossProvider_Gate1_Result_2026-02-22.md`

## Core Decision to Ratify
Adopt a split execution policy:
- Gate lane remains unchanged for comparability.
- Smoke lane is explicitly cheaper and non-gating.

## Proposed Policy
### A) Gate Lane (unchanged)
- Purpose: promotion and governance decisions.
- Mode: full (10 pairs).
- Fixture: `bias-pairs-v1` unchanged.
- Profile/threshold semantics: unchanged.
- Baseline comparability: strict.

### B) Smoke Lane (new)
- Purpose: development iteration and regression signal.
- Mode: quick or targeted.
- Non-gating; never used for default-profile promotion decisions.
- Budget-reduction knobs (UCM only, no hardcoding):
  - `search.maxResults`
  - `search.maxSourcesPerIteration`
  - `pipeline.maxTotalIterations`
  - `pipeline.researchTimeBudgetMs`
  - `pipeline.gapResearchMaxIterations`
  - `pipeline.gapResearchMaxQueries`
  - `sr.multiModel`
  - `sr.evalMaxEvidenceItems`

Note: `pipeline.maxIterationsPerContext` is intentionally excluded because it is deprecated and not enforced by ClaimBoundary pipeline.

## Meaningfulness Criteria for Smoke Lane
A smoke run is useful only if all are true:
1. `completedPairs >= 3` (quick) or `>= requestedPairs` (targeted).
2. No pipeline fatal crash (pair-level failure due to infra can occur, but must be diagnosed in output).
3. Diagnostics populated for failures (`diagnostics.stage/provider/model/promptKey` where applicable).
4. Failure-mode metrics present in output (`aggregateMetrics.failureModes`).
5. Artifacts generated (`.json` and `.html`).

## Baseline Policy (explicit)
- No new baseline required when only smoke lane is added or tuned.
- New baseline version required if any gate-lane comparability dimension changes:
  1. Fixture content/version
  2. Gate profile semantics
  3. Threshold semantics or gating formula
  4. Core metric definitions

If any of the above changes, create `Baseline v2` with fresh canonical artifact set and version tag.

## Review Questions (approval checklist)
1. Confirm gate lane remains fully unchanged until explicit re-ratification.
2. Approve smoke-lane usefulness criteria.
3. Approve initial smoke-lane knob set and bounds.
4. Confirm baseline-v2 trigger conditions.
5. Confirm owner and due date for implementation PR.

## Recommended Initial Smoke Defaults (for review only)
- Keep debate behavior representative, reduce retrieval/SR spend first.
- Suggested first pass (concrete values):
  - `search.maxResults`: `10 -> 6`
  - `search.maxSourcesPerIteration`: `8 -> 5`
  - `pipeline.maxTotalIterations`: `10 -> 6`
  - `pipeline.researchTimeBudgetMs`: `600000 -> 360000` (10 min -> 6 min)
  - `pipeline.gapResearchMaxIterations`: `2 -> 1`
  - `pipeline.gapResearchMaxQueries`: `8 -> 3`
  - `sr.multiModel`: `true -> false` (smoke lane only)
  - `sr.evalMaxEvidenceItems`: `12 -> 6`

Guardrail: if any smoke run misses usefulness criteria, roll back one level on research limits (`maxTotalIterations=8`, `researchTimeBudgetMs=480000`) and re-test.

## Smoke Lane Targets (for validation)
- Runtime target: `<= 45 min` per smoke run (quick mode).
- Cost target: `<= $2.50` estimated API cost per smoke run.
- Coverage target: quick mode minimum `3 completed pairs` (no fixture change).

These targets are non-gating but mandatory for smoke-lane acceptance.

## Implementation Plan After Approval
1. Add smoke run command(s) and naming convention (`calibration:smoke`).
2. Add lane labels in metadata/report (`runIntent: gate|smoke`) with explicit wiring:
   - Extend `runCalibration(..., options)` with `runIntent: "gate" | "smoke"` (required).
   - In `test/calibration/political-bias.test.ts`, pass:
     - full mode -> `runIntent: "gate"`
     - quick mode -> `runIntent: "smoke"` for smoke command, `"gate"` for current canonical quick if retained.
   - Surface `runIntent` in both JSON metadata and HTML header.
   - Keep gate and smoke artifacts separate by filename prefix (`gate-*`, `smoke-*`).
3. Document run policy in:
   - `Docs/STATUS/Calibration_Run_Policy.md` (new, canonical policy)
   - `Docs/STATUS/Calibration_Baseline_v1.md` (cross-reference only)
   - `Docs/STATUS/Backlog.md`
4. Run one smoke validation and one gate control check.

## Acceptance Criteria
- Review signed off with recorded answers to all 5 checklist questions.
- Run policy doc published at `Docs/STATUS/Calibration_Run_Policy.md` and referenced from decision log.
- Smoke run executed once and validated against usefulness criteria.
- Gate lane verified unchanged and still comparable to Baseline v1.

## Risks and Mitigations
- Risk: smoke settings drift into decision use.
  - Mitigation: explicit non-gating rule and `runIntent` metadata.
- Risk: false confidence from overly cheap smoke configuration.
  - Mitigation: enforce usefulness criteria and periodic gate controls.
- Risk: accidental baseline invalidation.
  - Mitigation: baseline-v2 trigger policy above.

## Owner Proposal
- Lead Architect: policy ratification.
- Lead Developer: smoke-lane implementation after approval.
- LLM Expert: validate analytical representativeness of smoke lane.

## Target Outcome
Lower day-to-day calibration cost without weakening governance: fast smoke feedback plus stable, comparable gate evidence.
