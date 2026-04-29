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

This is not specific to automatic mode. The Stage 2 coverage invariant must hold for every selected-claim job, including manual/interactive selections and administrator-on-behalf submissions. Automatic mode has an additional preventive control: it can admit fewer recommendations before final job creation when budget fit is impossible. Manual mode may still allow a user/admin to select up to the configured cap, but Stage 2 must then either cover those selected claims or explicitly report budget non-admission rather than producing ordinary zero-evidence `UNVERIFIED` claims.

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

`AC_12` and `AC_21` each generated four main research queries, but the protected contradiction window was reached before provider search. This is now visible through telemetry, but the system does not yet prevent it.

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

This helps automatic runs, but it is not sufficient and it does not cover manual selections. A lower cap reduces pressure but does not by itself guarantee every selected claim receives a real search/fetch opportunity.

### Adopted direction

Implement a selected-claim acquisition coverage guard:

1. Every selected `AtomicClaim` must receive at least one real main search/fetch opportunity before any claim receives expansion or refinement work.
2. If the remaining main-research budget cannot cover that minimum coverage for all selected claims, the final job must record budget non-admission explicitly.
3. In automatic mode, the system should prevent that state earlier by admitting fewer recommended claims before auto-confirm.
4. Move the protected-time check before query generation so the system does not spend LLM query calls after the run is already inside the protected contradiction window.
5. Treat "selected claim reached verdict with zero search attempts" as a system degradation, not ordinary evidence scarcity.

### Separate performance follow-ups

Stage 3 clustering timeout/fallback and Stage 1 preliminary acquisition waste are real, but they are separate from the selected-claim zero-acquisition bug.

---

## Options

### Option A - Selected-Claim Acquisition Coverage Guard (recommended)

Add a scheduler invariant in Stage 2:

- Before expansion/refinement/contradiction work, each selected claim gets one primary main acquisition opportunity.
- A claim counts as covered only after an actual provider search attempt, not merely query generation.
- If the protected contradiction window would prevent even the first provider search, the claim should not be silently sent to verdict as ordinary `UNVERIFIED`.

Benefits:

- Directly fixes the observed failure.
- Preserves the ACS authority boundary: ACS still selects; Stage 2 only enforces budget feasibility.
- Avoids deterministic semantic filtering.

Risks:

- Some selected claims may receive only a minimal first pass.
- Contradiction time may shrink unless admission control reduces selected count.

### Option B - Budget Admission Control (recommended with Option A)

Use structural budget feasibility to decide how many selected claims the final job can cover. Automatic mode can apply this before auto-confirm; manual mode must surface the same feasibility constraint at or before final execution.

Candidate approach:

- Keep ACS recommendation LLM-driven.
- Add a UCM-configurable estimate for minimum main-research seconds per selected claim.
- Compute an effective selected-claim coverage limit from:
  - `researchTimeBudgetMs`
  - `contradictionProtectedTimeMs`
  - estimated minimum seconds per selected claim
  - configured minimum recommended claims
- Apply the effective limit to automatic recommendation validation and auto-confirm.
- For manual/admin selections above the effective limit, either block confirmation with an explicit budget message or allow confirmation but mark non-admitted selected claims before verdict generation. Blocking is preferable if product requirements allow it.

Benefits:

- Prevents automatic mode from accepting five claims when the configured budget realistically supports three.
- Makes the same budget feasibility visible for manual/admin selections.
- Keeps tuning in UCM instead of hardcoding behavior.

Risks:

- Too conservative a budget estimate narrows report breadth.
- Too optimistic an estimate preserves the current failure.
- Blocking manual selections can surprise users/admins unless the UI explains the budget limit clearly.

### Option C - Pre-Query Protected-Time Guard (recommended)

Move the protected contradiction time check before research-query generation in `runResearchIteration`.

Benefits:

- Prevents query LLM spend that cannot lead to provider search/fetch.
- Makes ledger semantics cleaner: no generated-only main iterations that look like research happened.

Risks:

- The system may skip cheap query generation that could have led to a fast source in edge cases.
- This should be paired with acquisition coverage/admission control, not used alone.

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

### Phase 1 - Correctness: selected-claim coverage

Goal: no selected claim reaches verdict with zero provider search attempts unless the system explicitly records that the claim was not admitted due to budget.

Tasks:

1. Add a Stage 2 coverage-first round for selected claims.
   - Prioritize claims with `researchedIterationsByClaim[claimId] < 1`.
   - Do this before refinement/expansion work can consume budget for already-covered claims.
   - Continue using existing LLM query generation and provider search paths.
2. Move the protected-time check before query generation in `runResearchIteration`.
   - If the window is already reached, do not generate main queries for that claim.
   - Record a clear telemetry reason.
3. Add a selected-claim zero-acquisition warning.
   - Register the warning through `warning-display.ts`.
   - Severity should reflect verdict impact. A selected claim with zero acquisition can materially change the verdict, so it should not be hidden as ordinary evidence scarcity.
4. Add focused unit tests:
   - Coverage-first scheduling hits every selected claim once before second-pass work.
   - Query generation is skipped when protected time is already reached.
   - `selectedClaimResearchCoverage.zeroTargetedMainResearch` remains accurate.
   - Warning registration works.

Acceptance criteria:

- `zeroTargetedSelectedClaimCount` is `0` when budget admits the selected claims.
- If the system cannot cover a selected claim, that is explicit budget/admission telemetry, not ordinary `UNVERIFIED`.
- No deterministic semantic claim filtering is introduced.

### Phase 2 - Budget admission

Goal: no final job should proceed with more selected claims than the main-research budget can give minimum coverage, unless the uncovered claims are explicitly marked as budget-non-admitted and excluded from ordinary verdict treatment.

Tasks:

1. Add UCM config for estimated minimum main-research seconds per selected claim.
2. Compute an effective recommendation/admission cap when:
   - `claimSelectionBudgetAwarenessEnabled === true`
   - `claimSelectionBudgetFitMode === "allow_fewer_recommendations"`
3. Apply the effective cap to:
   - ACS recommendation prompt variables / validation envelope
   - automatic auto-confirm selection
4. Decide and implement the manual/admin behavior:
   - preferred: block confirmation above the effective coverage limit with a clear budget message;
   - fallback: allow confirmation, but make uncovered selected claims explicit budget non-admissions and do not classify them as ordinary evidence-scarce `UNVERIFIED`.

Acceptance criteria:

- For a 600s research budget with 120s protected contradiction time, automatic mode no longer assumes five selected claims are feasible unless the configured per-claim estimate says so.
- The chosen cap is visible in recommendation/admission metadata.
- Manual/admin mode cannot silently send selected claims to ordinary verdict generation with zero acquisition.

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
5. `npm -w apps/web run build`

Live verification discipline:

1. Commit source changes first.
2. Restart services before submitting live jobs.
3. Submit one automatic SVP canary for the same input.
4. Inspect:
   - selected claim count
   - `selectedClaimResearchCoverage`
   - `zeroTargetedSelectedClaimCount`
   - search/fetch counts for each selected claim
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

- A conservative automatic cap can reduce breadth.
- A coverage-first scheduler may reduce time left for contradiction retrieval.
- Stage 3 timeout hardening could overuse fallback boundaries.
- Stage 1 prep reduction could weaken extracted claim quality if done too aggressively.

### Opportunities

- Automatic mode becomes predictable: every selected claim gets real acquisition coverage.
- `UNVERIFIED` becomes more trustworthy because zero-acquisition system misses are separated from genuine evidence scarcity.
- Runtime attribution becomes clearer and less misleading.
- Future ACS canaries become interpretable because selection count, budget admission, and coverage telemetry align.

---

## Immediate Next Step

Implement Phase 1 and Phase 2 together as one bounded correctness slice:

1. Coverage-first Stage 2 scheduling for selected claims.
2. Pre-query protected-time guard.
3. UCM-backed selected-claim budget admission cap.
4. Selected-claim zero-acquisition warning.

Then rerun the same SVP automatic canary.
