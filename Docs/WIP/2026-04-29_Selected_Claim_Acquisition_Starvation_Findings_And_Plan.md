# Selected-Claim Acquisition Starvation Findings and Plan

**Date**: 2026-04-29  
**Status**: Investigation complete; implementation plan ready  
**Primary job inspected**: `1bd9723a68134a20a96f2bb745e12291`  
**Draft inspected**: `6620dc43952f497084e5d4a9c126ea9d`  
**Input**: `https://www.svp.ch/wp-content/uploads/260324_Argumentarium-ohne-Q-A-DE.pdf`  

---

## Executive Summary

The long runtime and `UNVERIFIED` selected-claim outcomes in job `1bd9723a68134a20a96f2bb745e12291` are not primarily caused by final Stage 2 researching AtomicClaims that were later dropped.

The final Stage 2 run was correctly constrained to the five selected `AtomicClaims`. The failure mode is more specific:

1. Automatic ACS selected five claims, but the Stage 2 main-research budget only funded real search/fetch work for three of them.
2. Two selected claims, `AC_12` and `AC_21`, generated queries but reached the protected contradiction window before any provider search or fetch occurred.
3. Those two claims were reported as `UNVERIFIED` with zero evidence even though bounded external search found accessible official evidence.
4. Stage 1 preparation did spend material time before selection across all 23 candidate claims, and its preliminary evidence mapped to a claim that was later dropped.
5. Stage 3 clustering added a separate latency problem: one Sonnet clustering call failed after about 160 seconds and fell back.

Conclusion: the next correctness fix should be selected-claim acquisition coverage, not just a lower selection cap. A lower cap is useful only as a budget-admission mechanism.

This is not specific to automatic mode. The Stage 2 coverage invariant and the budget-admission check must hold for every selected-claim job, including automatic recommendations, manual/interactive selections, and administrator-on-behalf submissions. Automatic and manual modes differ only in who supplies the selected IDs; both converge before final job creation and must use the same coverage feasibility contract. If the selected set cannot be covered by the main-research budget, the system should block or shrink the selected set before final execution, or explicitly mark non-admitted claims rather than producing ordinary zero-evidence `UNVERIFIED` claims.

---

## Evidence From Job `1bd9723a68134a20a96f2bb745e12291`

### Timing

Draft preparation:

| Component | Duration |
|---|---:|
| Draft wall time | ~437s |
| Stage 1 preparation | ~377s |
| ACS recommendation | ~57s |
| Candidate claims prepared | 23 |
| Claims auto-selected | 5 |

Final job:

| Component | Duration |
|---|---:|
| Final job wall time | ~1150s |
| Runner analysis | ~1136s |
| Reused prepared Stage 1 | ~0.011s |
| Stage 2 selected-claim research | ~562s |
| Post-research applicability / claim mapping | ~68s |
| Stage 3 clustering | ~181s |
| Verdict generation | ~264s |
| Aggregation / report | ~51s |

Metrics for the same job show the Stage 3 clustering phase included a failed `claude-sonnet-4-6` structured call:

- Task: `cluster`
- Duration: `160151ms`
- Success: `false`
- Error: `No object generated: response did not match schema.`

### Selected vs Dropped Claims

Selected claims:

- `AC_19`
- `AC_15`
- `AC_10`
- `AC_12`
- `AC_21`

Dropped claims: 18 of 23 prepared candidates.

Final Stage 2 did not research the dropped claims. The prepared Stage 1 snapshot was filtered before final Stage 2:

- `apps/web/src/lib/internal-runner-queue.ts` parses prepared Stage 1 and selected IDs before dispatch.
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` filters prepared understanding to selected claims.

However, Stage 1 preliminary work before selection did produce:

- 6 preliminary queries
- 7 fetch attempts
- 4 successful fetches
- 14 preliminary evidence items
- 0 URL overlap with final Stage 2 URLs
- All preliminary evidence items mapped to dropped `AC_01`

So there is real pre-selection preparation waste, but it is not final Stage 2 working on dropped claims.

### Selected-Claim Coverage

`selectedClaimResearchCoverage` showed:

| Claim | Main searched iterations | Search attempts | Fetch attempts | Final evidence | Outcome |
|---|---:|---:|---:|---:|---|
| `AC_19` | 1 | 4 | 13 | 11 | `UNVERIFIED`, confidence 48 |
| `AC_15` | 1 | 8 | 16 | 6 | `UNVERIFIED`, confidence 24 |
| `AC_10` | 1 | 4 | 10 | 12 | `MOSTLY-TRUE`, confidence 38 |
| `AC_12` | 0 | 0 | 0 | 0 | `UNVERIFIED`, confidence 0 |
| `AC_21` | 0 | 0 | 0 | 0 | `UNVERIFIED`, confidence 0 |

`AC_12` and `AC_21` each generated four main research queries, but the protected contradiction window was reached before provider search. This is now visible through `ClaimAcquisitionIterationEntry.searchAttempts` and `selectedClaimResearchCoverage`, but the system does not yet prevent it.

### Source-Level Root Cause

The outer Stage 2 coverage-first mechanism already exists. In `apps/web/src/lib/analyzer/research-orchestrator.ts`, the main loop:

- checks whether selected claims are below `sufficiencyMinResearchedIterationsPerClaim` before entering the protected contradiction window;
- builds a `targetingPool` of claims below that floor;
- counts a claim as researched only when the relevant ledger entry has `searchAttempts > 0`.

The observed starvation is caused by the inner iteration path defeating that mechanism:

1. `runResearchIteration` generates main research queries before checking the protected contradiction window for the per-query execution path.
2. When the protected window is reached after query generation, no provider search happens, so `searchAttempts` remains `0`.
3. The outer loop then treats the no-search/no-evidence iteration as immediate zero-yield exhaustion by setting `zeroYieldCount` to `zeroYieldBreakThreshold`.
4. The claim enters `zeroYieldExhaustedClaimIds`, which removes it from the below-floor retry path and from the protected-window floor bypass.

This means the fix is narrower than adding a new coverage-first round. The existing outer coverage-first scheduler should be preserved; the defect is the interaction between the per-iteration time guard and the no-search zero-yield fast-path.

Budget pressure is still material. With the default `researchTimeBudgetMs = 600000` and `contradictionProtectedTimeMs = 120000`, the effective main-research window is about 480 seconds. At five selected claims, that is only 96 seconds per claim before protected contradiction time. In the inspected job, the three selected claims that received real research consumed about 161s, 238s, and 146s of selected-claim research time. Those durations include variable fetch/refinement/contradiction work and should not be treated as a stable estimate, but they explain why the no-search fast-path becomes visible late in the selected set.

The inspected job did not end main research because the hard wall-clock time budget fired: `contradictionReachability.remainingMsWhenMainResearchEnded` was about 104 seconds, contradiction research started, and no `budget_exceeded` / `query_budget_exhausted` warning was present. The proven root cause for this job remains protected-window/no-search exhaustion. The budget arithmetic should inform Phase 2 only after Phase 1 canary data confirms whether five selected claims can reliably receive at least one provider search attempt.

---

## External Evidence Check

The two zero-evidence selected claims are not evidence-sparse based on bounded external search.

### `AC_12` - National-road congestion hours

Claim:

> Im Jahr 2024 wurden auf den Nationalstrassen der Schweiz 55'569 Staustunden verzeichnet, gegenueber 7'711 Stunden im Jahr 2000; rund 87% dieser Staus entfallen auf Verkehrsueberlastung.

Accessible official evidence:

- Admin.ch / ASTRA: `Verkehrsfluss 2024: 48,5 Milliarden Fahrzeugkilometer auf Nationalstrassen zurueckgelegt`
  - URL: https://www.admin.ch/de/newnsb/56doq938PLdX44UyJmoG9
  - Relevant finding: reports 55,569 congestion hours in 2024 and attributes about 87% to overload.

Classification: FactHarbor miss caused by zero acquisition, not genuine evidence scarcity.

### `AC_21` - Settlement-area growth

Claim:

> Gemaess der Arealstatistik 2018 des BFS wuchs die Siedlungsflaeche in der Schweiz zwischen 2009 und 2018 taeglich um durchschnittlich 7,7 Fussballfelder; insgesamt entstanden in neun Jahren 180,6 km2 neue Siedlungsflaechen.

Accessible official evidence:

- BFS web article: `Bodennutzung in der Schweiz`
  - URL: https://www.swissstats.bfs.admin.ch/data/webviewer/appId/ch.admin.bfs.swissstat/article/issue21020021801-03/package
- BFS media release PDF:
  - URL: https://dam-api.bfs.admin.ch/hub/api/dam/assets/19365029/master

Classification: FactHarbor miss caused by zero acquisition, not genuine evidence scarcity.

---

## Historical Same-Input Comparison

A historical local DB comparison found 23 exact same-input jobs.

| Current claim | Historical finding |
|---|---|
| `AC_19` social-assistance rate | Equivalent prior claim was previously `LEANING-TRUE` with evidence from SKOS/BFS and SEM/BJ monitoring. |
| `AC_15` crime share | Equivalent prior claim was previously `LEANING-TRUE` with BFS PKS 2024 evidence for foreign accused and residence categories. |
| `AC_10` EU free-movement forecast | Equivalent prior claim was previously `LEANING-TRUE`, though evidence quality was mixed and partly non-primary for the exact compound claim. |
| `AC_12` congestion hours | Prior equivalents were also `UNVERIFIED` with zero search/fetch in checked ledgers. One older job had an ASTRA source URL but no linked evidence. |
| `AC_21` settlement-area growth | Prior equivalents were also `UNVERIFIED` with zero search/fetch and no useful linked land-use evidence. |

Interpretation:

- `AC_12` and `AC_21` show a recurring acquisition coverage failure for later selected claims.
- This is not a one-off provider miss or evidence scarcity case.

---

## Debate Result

### Rejected as sufficient

**"Simply cap automatic ACS to 3 selected claims."**

This helps only one input path. It is not sufficient and it does not cover manual/admin selections. A lower cap reduces pressure but does not by itself guarantee every selected claim receives a real search/fetch opportunity.

### Adopted direction

Implement a selected-claim acquisition starvation fix:

1. Preserve the existing outer coverage-first scheduler and below-floor targeting pool.
2. Move the protected-time check before query generation so the system does not spend LLM query calls after the run is already inside the protected contradiction window.
3. Do not instantly exhaust a selected claim that never had a provider search attempt. It must stay eligible for the existing below-floor retry path unless a distinct budget/non-admission condition is recorded.
4. Treat "selected claim reached verdict with zero search attempts" as a system degradation, not ordinary evidence scarcity.
5. Defer selection budget-admission changes until after the narrower scheduler fix is canary-tested.

### Separate performance follow-ups

Stage 3 clustering timeout/fallback and Stage 1 preliminary acquisition waste are real, but they are separate from the selected-claim zero-acquisition bug.

---

## Options

### Option A - Fix Iteration-Level Starvation (recommended)

Amend the existing Stage 2 coverage-first mechanism:

- Keep the current below-floor `targetingPool` and `researchedIterationsByClaim` contract.
- Within the below-floor targeting path, verify that lower `researchedIterationsByClaim` counts win before evidence-count scoring. If necessary, amend targeting so zero-searched claims are preferred over already-searched claims even when seeded/preliminary evidence counts differ.
- Move the protected-time check before main query generation in `runResearchIteration`.
- If a selected claim has no provider search attempt, do not set its zero-yield count directly to `zeroYieldBreakThreshold`.
- A claim counts as researched only after an actual provider search attempt, using `ClaimAcquisitionIterationEntry.searchAttempts`.
- If a selected claim still reaches verdict with zero provider search attempts, emit a system degradation warning.

Benefits:

- Directly fixes the observed failure.
- Preserves the existing Stage 2 coverage-first mechanism instead of adding a parallel scheduler.
- Avoids deterministic semantic filtering.

Risks:

- Some selected claims may receive only a minimal first pass.
- Contradiction time may shrink when all selected claims are forced to get at least one real attempt.
- If the protected window is already reached, a selected claim may remain below floor until the loop hits the overall time budget; that state must be explicit.

### Option B - Budget Admission Control (defer until after Option A canary)

Use structural budget feasibility to decide how many selected claims the final job can cover. The selected-claim confirmation/execution boundary should apply this once for all modes, after selected IDs are known and before final analysis proceeds.

This is reasonable architecture, but it should not be implemented in the same slice as the scheduler fix. The inspected job does not prove that five selected claims are impossible within the configured budget once the no-search exhaustion bug is fixed. In job `1bd9723a68134a20a96f2bb745e12291`, the three selected claims that did receive research took about 161s, 238s, and 146s total selected-claim research time, but that includes variable fetch, refinement, and contradiction work. A reliable admission estimate needs fresh canary data after Option A.

Candidate approach:

- Keep ACS recommendation LLM-driven.
- Add a UCM-configurable estimate for minimum main-research seconds per selected claim.
- Compute an effective selected-claim coverage limit from:
  - `researchTimeBudgetMs`
  - `contradictionProtectedTimeMs`
  - estimated minimum seconds per selected claim
  - configured minimum recommended claims
- Apply the effective limit at the web-side selected-claim confirmation boundary before calling the API confirm endpoint.
- Optionally also pass the effective limit into ACS recommendation generation so automatic recommendations are less likely to exceed the shared confirmation limit.
- For selected sets above the effective limit, either block confirmation with an explicit budget message or allow confirmation but mark non-admitted selected claims before verdict generation. Blocking is preferable if product requirements allow it.

Benefits:

- Prevents any selected-claim mode from accepting five claims when the configured budget realistically supports fewer.
- Keeps automatic, manual, and admin-on-behalf paths aligned at the shared selected-claim boundary.
- Keeps tuning in UCM instead of hardcoding behavior.
- Keeps the C# API as a structural guard for IDs/uniqueness/absolute cap instead of duplicating web-side UCM budget logic across runtimes.

Risks:

- Too conservative a budget estimate narrows report breadth.
- Too optimistic an estimate preserves the current failure.
- Blocking selections can surprise users/admins unless the UI explains the budget limit clearly.
- A static seconds-per-claim estimate can drift with provider latency, model routing, and search/fetch configuration. Treat it as an approximate UCM guardrail, validated by canary data.

### Option C - Standalone Pre-Query Protected-Time Guard (insufficient alone)

Move the protected contradiction time check before research-query generation in `runResearchIteration`.

Benefits:

- Prevents query LLM spend that cannot lead to provider search/fetch.
- Makes ledger semantics cleaner: no generated-only main iterations that look like research happened.

Risks:

- The system may skip cheap query generation that could have led to a fast source in edge cases.
- This must be paired with the zero-yield exhaustion fix. If no-search iterations are still exhausted immediately, the below-floor retry path remains broken.

### Option D - Stage 3 Clustering Timeout/Fallback Hardening

Address the 160s failed clustering call.

Possible paths:

- Add a shorter Stage 3 structured-output timeout.
- Add a cheaper precondition fallback when scope count/evidence shape is simple.
- Add a retry/fallback path that does not wait for a full long failure before using `CB_GENERAL`.

Benefits:

- Reduces long-tail runtime.
- Avoids paying for failed cluster calls that produce fallback anyway.

Risks:

- More fallback clustering may reduce boundary quality.
- Needs targeted tests to avoid silently flattening multi-boundary reports.

### Option E - Stage 1 Preliminary Acquisition Waste Reduction

Investigate whether Stage 1 preliminary acquisition should be limited, deferred, or better reused when ACS is enabled.

Benefits:

- Could cut the ~377s preparation cost.
- Reduces wasted preliminary evidence on dropped claims.

Risks:

- Stage 1 pass 2 quality depends on preliminary grounding.
- Deferring too much may worsen extracted claim quality.
- This should be a second slice after selected-claim coverage is fixed.

---

## Implementation Plan

### Phase 1 - Correctness: iteration-level starvation

Goal: no selected claim reaches verdict with zero provider search attempts unless the system explicitly records that the claim was not admitted due to budget.

Tasks:

1. Preserve and verify the existing Stage 2 coverage-first targeting.
   - The existing below-floor `targetingPool` is the coverage-first mechanism.
   - Do not add a second scheduler or selector.
   - Keep `researchedIterationsByClaim` tied to `searchAttempts > 0`.
   - Verify `findLeastResearchedClaim` / its caller cannot prefer an already-searched claim over a zero-searched selected claim inside the below-floor path.
2. Move the protected-time check before main query generation in `runResearchIteration`.
   - If the window is already reached, do not generate main queries for that claim.
   - Record a clear telemetry reason.
3. Fix the no-search zero-yield exhaustion fast-path.
   - Do not set `zeroYieldCount = zeroYieldBreakThreshold` when `mainSearchAttempted === false`.
   - Leave the selected claim eligible for the below-floor retry path unless a distinct budget/non-admission condition is recorded.
4. Add a selected-claim zero-acquisition warning.
   - Proposed type: `selected_claim_zero_acquisition`.
   - Proposed severity: `error`, per AGENTS.md report-quality severity policy. The verdict-impact test asks whether the verdict would be materially different if the event had not occurred; for a selected claim with zero provider search attempts, the answer is yes.
   - Details should include at least `{ claimId, notRunReason }`, plus available timing/query-budget fields.
   - Register the warning through `warning-display.ts`.
5. Add focused unit tests:
   - A below-floor selected claim is re-targeted after a no-search iteration instead of being exhausted.
   - Query generation is skipped when protected time is already reached.
   - `ClaimAcquisitionIterationEntry.searchAttempts` remains the source of truth for whether targeted research happened.
   - `selectedClaimResearchCoverage.zeroTargetedMainResearch` remains accurate.
   - Warning registration works.

Acceptance criteria:

- `zeroTargetedSelectedClaimCount` is `0` when budget admits the selected claims.
- If the system cannot cover a selected claim, that is explicit budget/admission telemetry, not ordinary `UNVERIFIED`.
- No deterministic semantic claim filtering is introduced.

### Phase 2 - Budget admission (deferred pending Phase 1 canary)

Goal: no final job should proceed with more selected claims than the main-research budget can give minimum coverage, unless the uncovered claims are explicitly marked as budget-non-admitted and excluded from ordinary verdict treatment.

Decision gate:

- Run the Phase 1 canary first with the current selection cap.
- If all selected claims receive at least one provider search attempt and runtime remains acceptable, keep Phase 2 deferred.
- If selected claims still starve or runtime remains unacceptable, use the Phase 1 canary timings to set the initial UCM estimate for minimum main-research seconds per selected claim.

Tasks:

1. Add UCM config for estimated minimum main-research seconds per selected claim.
2. Compute an effective recommendation/admission cap when:
   - `claimSelectionBudgetAwarenessEnabled === true`
   - `claimSelectionBudgetFitMode === "allow_fewer_recommendations"`
3. If Phase 2 is still needed, apply the effective cap to:
   - web-side selected-claim confirmation for all modes, before the API confirm endpoint is called
   - ACS recommendation prompt variables / validation envelope, if useful for automatic proposal quality
   - API responses/metadata as observability only; avoid duplicating UCM budget computation in C# unless a later architecture decision introduces shared generated config contracts
4. Decide and implement the over-limit behavior:
   - preferred: block confirmation above the effective coverage limit with a clear budget message;
   - fallback: allow confirmation, but make uncovered selected claims explicit budget non-admissions and do not classify them as ordinary evidence-scarce `UNVERIFIED`.

Acceptance criteria:

- For a 600s research budget with 120s protected contradiction time, the shared selected-claim boundary no longer assumes five selected claims are feasible unless the configured per-claim estimate says so.
- The chosen cap is visible in recommendation/admission metadata.
- No mode can silently send selected claims to ordinary verdict generation with zero acquisition.

### Phase 3 - Runtime observability and clustering hardening

Goal: make non-research latency visible and reduce the 160s failed clustering tail.

Tasks:

1. Add explicit timing for post-research applicability / claim mapping.
2. Add or tune Stage 3 clustering timeout/fallback behavior.
3. Add tests for fallback preservation on simple one-boundary evidence pools.

Acceptance criteria:

- Metrics separate research, applicability/mapping, clustering, verdict, and aggregate/report.
- A failed clustering call should not consume ~160s before fallback unless explicitly configured.

### Phase 4 - Stage 1 prep waste review

Goal: reduce preparation waste without weakening Stage 1 claim quality.

Tasks:

1. Measure Stage 1 preliminary acquisition value across same-input runs.
2. Determine whether preliminary acquisition should be capped, deferred, or reused only when claim-mapped to selected claims.
3. Avoid prompt changes unless separately approved and reviewed.

Acceptance criteria:

- No reduction in Stage 1 contract quality.
- Reduced preliminary evidence waste on dropped claims.

---

## Verification Plan

Local verification:

1. `npm -w apps/web exec vitest run test/unit/lib/analyzer/research-contradiction-admission.test.ts`
2. `npm -w apps/web exec vitest run test/unit/lib/analyzer/research-waste-metrics.test.ts`
3. Add and run new focused Stage 2 coverage tests.
4. Add and run any warning display tests touched by the new warning.
5. Verify the active/default config keeps `sufficiencyMinResearchedIterationsPerClaim = 1` unless intentionally overridden.
6. `npm -w apps/web run build`

Affected files to plan for:

- `apps/web/src/lib/analyzer/research-orchestrator.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/analyzer/warning-display.ts`
- `apps/web/test/unit/lib/analyzer/research-contradiction-admission.test.ts`
- `apps/web/test/unit/lib/analyzer/warning-display.test.ts`
- Phase 2 only: `apps/web/src/lib/claim-selection-flow.ts` and selected-claim confirmation UI/runner paths
- Phase 2 observability only: `apps/api/Controllers/ClaimSelectionDraftsController.cs`, `apps/api/Controllers/InternalClaimSelectionDraftsController.cs`, and `apps/api/Services/JobService.cs`

Live verification discipline:

1. Commit source changes first.
2. Restart services before submitting live jobs.
3. Submit one automatic SVP canary for the same input.
4. Inspect:
   - selected claim count
   - `selectedClaimResearchCoverage`
   - `zeroTargetedSelectedClaimCount`
   - search/fetch counts for each selected claim
   - `claimAcquisitionLedger[*].iterations[*].searchAttempts`
   - evidence for `AC_12` / `AC_21` if selected
   - total runtime and clustering metrics

Live acceptance criteria:

- No selected claim has `searchAttemptCount = 0` unless explicitly not admitted by budget control.
- If `AC_12` or `AC_21` is selected, the system should find official evidence or show searched-but-insufficient evidence, not zero acquisition.
- Final Stage 2 remains constrained to selected claims.
- No prompt wording change or deterministic semantic selector is introduced.

---

## Risks and Opportunities

### Risks

- A conservative selected-claim cap can reduce breadth.
- A coverage-first scheduler may reduce time left for contradiction retrieval.
- Stage 3 timeout hardening could overuse fallback boundaries.
- Stage 1 prep reduction could weaken extracted claim quality if done too aggressively.

### Opportunities

- Selected-claim jobs become predictable: every selected claim gets real acquisition coverage or explicit budget non-admission.
- `UNVERIFIED` becomes more trustworthy because zero-acquisition system misses are separated from genuine evidence scarcity.
- Runtime attribution becomes clearer and less misleading.
- Future ACS canaries become interpretable because selection count, budget admission, and coverage telemetry align.

---

## Immediate Next Step

Implement Phase 1 only as one bounded correctness slice:

1. Preserve the existing coverage-first Stage 2 scheduler.
2. Pre-query protected-time guard.
3. No-search zero-yield exhaustion fix.
4. Selected-claim zero-acquisition warning.

Then rerun the same SVP automatic canary.

Only decide on Phase 2 budget admission after that canary.
