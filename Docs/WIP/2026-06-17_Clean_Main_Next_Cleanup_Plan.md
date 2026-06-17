# Clean Main Next Cleanup Plan

**Status:** Reviewed execution plan
**Date:** 2026-06-17
**Owner:** Senior Developer / Captain-directed cleanup

## Purpose

Bring `main` back to a clean, manageable base for further development without
switching day-to-day work off `main`. The fallback branch is
`codex/main-cleanup-fallback-2026-06-17`, created from `origin/main` before the
next cleanup commits.

This plan follows the Captain preference:

- Work on `main`.
- Keep the fallback branch only as a worst-case recovery point.
- Ask the Captain only for material product, prompt, validation-input, or
  expensive-live-run decisions.

## Current Evidence

| Area | Evidence | Decision impact |
|---|---|---|
| WIP state | Consolidation #13 archived 26 superseded WIP files; 66 active files remained before this plan. | The doc tree is usable enough to plan from; do not reopen broad archive churn now. |
| F2 source/config | `CLAIM_CONTRACT_SURGICAL_REPAIR` exists in `claimboundary.prompt.md`; `surgicalRepairEnabled=true`; max group size default is 4. | F2 is present locally. Missing surgical warnings in the fresh jobs are not a prompt-section absence signal. |
| F2 minimal live validation | Commit `9931f468`; jobs `efa8c4e8` Plastic, `d8dcec2f` Hydrogen, `24e71d7e` Bolsonaro PT. | Hard-abort target provisionally passes; report-quality target does not. |
| Historical census | `checkworthy-unverified-census.cjs`: 982/4015 check-worthy claims UNVERIFIED (24.5%); 265 clean jobs have >=1 checkworthy-UNVERIFIED claim. | Per-claim publishability remains a systemic quality smell, not an isolated Bolsonaro event. |

## Fresh F2 Validation Result

| Input family | Result | F2 hard-failure signal | Quality signal |
|---|---:|---|---|
| Plastic recycling | `MOSTLY-FALSE`, truth 17.8, confidence 67.6 | No `report_damaged`, no top UNVERIFIED, no surgical warnings. | Fails current quality expectation: too false-side for the broad "pointless" claim. |
| Hydrogen cars | `FALSE`, truth 9, confidence 56 | No `report_damaged`, no UNVERIFIED, no surgical warnings. | Direction and boundary separation look good; confidence is below the expected 65-85 band. |
| Bolsonaro PT | `LEANING-TRUE`, truth 64.6, confidence 24 | No `report_damaged`, but AC_01 is high-checkworthiness `UNVERIFIED` due to `verdict_integrity_failure`. | Direction/truth/boundary count are acceptable; confidence and per-claim publishability fail. |

Observed warning detail points primarily to Stage 4 citation registry and
grounding integrity failures:

- invalid or out-of-registry evidence IDs in challenge/reasoning channels
- repair candidates rejected by grounded-acceptance checks
- confidence collapse after one high-harm claim becomes unpublishable

This is not evidence for making the next cleanup a Stage 1 F2 rewrite.

## Recommended Execution Order

### Phase 0 - Guardrails

1. Keep working on `main`; do not switch the active worktree to the fallback
   branch.
2. Commit before every live validation run so job metadata maps to source.
3. Refresh prompt/config/runtime state before live jobs.
4. Use only Captain-defined inputs for validation unless the Captain approves a
   new input.
5. Stop a validation batch after the first three jobs if the regression is
   already clear.

### Phase 1 - State Hygiene Closeout

Goal: make the repo's planning surface truthful enough that future agents stop
starting from stale April/May status. This phase may interleave with Phase 2;
it must not block the first integrity fix.

Actions:

1. Update the top of `Docs/STATUS/Current_Status.md` to point to this plan,
   the F2 smoke result, and the current quality blockers. Keep old changelog
   history intact.
2. Update `Docs/STATUS/Backlog.md` immediate priorities to reflect the current
   June quality gate:
   - Stage 4 citation/grounding integrity
   - confidence calibration after integrity
   - Plastic broad-claim adjudication
   - repeatable validation/report-quality measurement
3. If Phase 2 is already underway, land the status update after the fix so the
   status snapshot does not immediately need a second rewrite.
4. Do not rewrite historical sections unless they block the current reader.
5. Run `npm run index` if handoff indexes or analyzer-stage indexes are touched.

Verifier:

- `git diff --check`
- link scan by `rg "Docs/WIP/2026-06-17_Clean_Main_Next_Cleanup_Plan|F2|Stage 4 citation"`

### Phase 2 - Stage 4 Citation/Grounding Integrity

Goal: remove the current highest-risk quality blocker before tuning verdict
semantics or confidence.

Focused execution plan:

- `Docs/WIP/2026-06-17_Stage4_Citation_Grounding_Execution_Plan.md`

Initial target files to read before editing:

- `apps/web/src/lib/analyzer/verdict-stage.ts`
- `apps/web/src/lib/analyzer/verdict-generation-stage.ts`
- `apps/web/src/lib/analyzer/grounding-check.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`
- `apps/web/test/unit/lib/analyzer/grounding-check.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts` only if the
  investigation points toward prompt contract behavior

Triage before editing:

1. Confirm the fresh failures are not Stage 1 F2 precondition failures by
   checking `contractValidationSummary`, `analysisWarnings`, and surgical
   warning absence for the three smoke jobs.
2. Classify invalid evidence IDs as one of:
   - structural carriage/registry construction bug
   - LLM hallucination of IDs
   - Gate 4 / publishability interaction after a grounded-acceptance rejection
3. If the root cause is LLM hallucinated IDs or prompt-contract behavior, stop
   for Captain approval before drafting prompt wording.

Implementation constraints:

- Prefer fixing structural citation carriage, registry construction, or
  validator acceptance logic over adding a parallel rescue path.
- Do not add deterministic semantic judgment. Structural ID validation is fine;
  meaning-level decisions stay with LLM outputs.
- Any acceptance change that depends on claim meaning rather than ID resolution
  is semantic and must be treated as prompt-adjacent.
- Do not edit `apps/web/prompts/` without explicit Captain approval for the
  concrete prompt wording.

Verifier:

- focused unit tests for invalid challenge IDs, evidence-pool-only IDs, and
  repaired-verdict acceptance
- `npm test` if focused tests pass
- commit, refresh runtime, then rerun the same three Captain inputs as a smoke
  check

Success gate:

- Bolsonaro PT has no high-checkworthiness UNVERIFIED claim caused by
  `verdict_integrity_failure`.
- Fresh runs do not introduce `report_damaged` or `analysis_generation_failed`.
- Grounding warnings fall or become clearly diagnostic-only without degrading
  final report quality.

Stop or amend if:

- any smoke input changes to a worse verdict direction or loses more than one
  selected atomic claim
- invalid IDs stop surfacing only because out-of-registry IDs are allowed to
  bypass checks
- the investigation shows a prompt change is required
- the three-job smoke is inconclusive and the decision would depend on
  confidence or direction variance; use at least three repetitions per input
  before calling that outcome pass/fail

### Phase 3 - Confidence Calibration After Integrity

Goal: restore confidence bands only after verdict publishability is structurally
stable.

Scope:

- Hydrogen confidence below band despite correct direction and adequate boundary
  separation.
- Bolsonaro PT article confidence collapse caused by one unpublishable high-harm
  claim.

Constraints:

- Do not raise confidence by clamp or constant.
- Inspect how Gate 4, publishability, harm, grounding diagnostics, and article
  aggregation interact.
- Do not add a new analysis-affecting threshold without Captain approval. If an
  existing threshold changes, it must remain UCM-configurable and must be
  verified through runtime config read-back, not only defaults/tests.

Verifier:

- focused tests for confidence aggregation behavior
- same three live jobs after commit
- a negative test showing genuinely catastrophic multi-claim failures still
  produce low confidence instead of being over-corrected into publication

### Phase 4 - Plastic Broad-Claim Adjudication

Goal: handle broad evaluative claims such as "Plastic recycling is pointless"
without collapsing every facet into an overconfident false-side article verdict.

Scope:

- Investigate whether the problem is claim decomposition, article aggregation,
  misleadingness handling, or verdict narrative adjudication.
- Use existing comparator expectations in
  `Docs/AGENTS/Captain_Quality_Expectations.md` and
  `Docs/AGENTS/benchmark-expectations.json`.

Constraints:

- No topic-specific plastic vocabulary in code or prompts.
- No prompt edits without Captain approval.
- No new validation input unless Captain approves it.
- Expect this phase to stop early if the root cause points to prompt wording.

Success gate:

- Plastic returns to the accepted centered band without regressing Hydrogen or
  Bolsonaro PT.

### Phase 5 - Deferred Measurement and Remaining Cleanup

Goal: make future cleanup cheaper and less dependent on one-off DB spelunking.
This is deferred until Phases 2-4 produce a repeated need.

Actions:

1. Promote the F2 minimal validation summary extraction into a small reusable
   diagnostic script only after a second real use.
2. Decide whether report-quality measurement work in the June WIP docs should
   become the canonical regression gate.
3. Do a second, smaller WIP pass only after the active quality blockers are
   updated in Status/Backlog and current quality gates are no longer blocked.

## Captain Decisions Needed Later

Pause for Captain decision before:

- prompt wording changes under `apps/web/prompts/`
- adding or replacing validation inputs
- changing accepted verdict/truth/confidence bands
- running more than the three-job smoke or any expensive validation suite
- deleting or materially rewriting normative status/backlog content

No Captain decision is needed for:

- structural code fixes with focused tests
- doc index/link maintenance
- rerunning the same three approved smoke inputs after a committed fix
- adding concise handoff notes and generated indexes

## External Review

Reviewed by:

- Claude via `scripts/agents/invoke-claude.cjs`
- Gemini via `scripts/agents/invoke-gemini.cjs`

Consolidated changes made after review:

- Kept Stage 4 structural citation/grounding integrity as the first code target.
- Made Phase 1 state hygiene non-blocking and interleavable with Phase 2.
- Resolved the initial Phase 2 file list to actual modules/tests.
- Deferred Phase 5 script extraction and second-pass WIP cleanup.
- Added stop conditions for LLM-hallucinated IDs, invalid-ID bypass, worse
  verdict direction, atomic-claim loss, and confidence/direction variance.
- Added UCM read-back and over-correction verifiers for confidence work.
