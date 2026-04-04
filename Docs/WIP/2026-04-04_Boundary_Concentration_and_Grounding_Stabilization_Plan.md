# Boundary Concentration and Grounding Stabilization Plan

**Date:** 2026-04-04  
**Authoring role:** Senior Developer (Codex)  
**Input:** Newest local and deployed runs, plus a three-agent debate on next-fix priority

---

## 1. Executive Summary

The newest jobs do **not** point to a fresh Stage-4 collapse. The dominant current quality problem is still **upstream retrieval/boundary concentration variance**, with a second real but narrower issue in **verdict grounding integrity**.

The debate outcome is:

- **Primary root-cause workstream:** Stage 2/3 characterization and stabilization for boundary concentration and query/event drift
- **Parallel containment workstream:** narrow verdict-grounding containment/repair after same-commit validation control
- **Immediate prerequisite:** stop mixing commit/config/cache/quota conditions when comparing local vs deployed behavior

This ordering is recommended because:

- the repo's current-status posture already says cross-linguistic retrieval neutrality remains the next open quality gap
- the newest local and deployed jobs show the same upstream concentration shape across topics/languages
- verdict grounding issues are real, but they look more like a containment/trust problem than the main source of verdict divergence
- at least one healthy-distribution deployed run (`cfd508...`) still shows `verdict_grounding_issue`, so grounding has an independent failure mode and should not wait behind the full Stage 2/3 track

---

## 2. Observed Problems In Newest Runs

### 2.1 Local newest jobs

#### Local German plastics-industry family

- `eed30535d83e42a98046c21b35e2986e`
  - `MOSTLY-TRUE 74 / 68`
  - 5 boundaries, `9 / 4 / 3 / 1 / 1`
  - many `source_fetch_failure` warnings
  - support-skewed evidence pool
- `4046d58a1f46402598c8a6127740de0a`
  - `MOSTLY-TRUE 82 / 58`
  - 6 boundaries, `10 / 7 / 5 / 4 / 2 / 1`
  - query-budget exhaustion
  - insufficient evidence warning on one claim
- `8af5c7d351ba45c1bb46ced600c0e028`
  - `LEANING-TRUE 68 / 75`
  - 5 boundaries, `7 / 5 / 1 / 1 / 1`
  - thin evidence pool

These runs are not broken, but they are thin, noisy, and fetch-degradation-heavy.

#### Local Bolsonaro EN outlier

- `411cb1ca4e4d4556a3202b34c3903e5d`
  - `MIXED 57 / 61`
  - 4 boundaries, `110 / 1 / 1 / 1`
  - `boundary_evidence_concentration`
  - `Google-CSE` `429`
  - `verdict_grounding_issue`

#### Older local comparison points

- `5b355818bad94241a4ff6cb36da67cf3`
  - `LEANING-TRUE 58 / 63`
  - 6 boundaries, `58 / 4 / 1 / 1 / 1 / 1`
  - tangential boundaries formed from adjacent controversies
- `6aa5ec2f8b0a4d279815a255cc685752`
  - Portuguese Bolsonaro
  - `LEANING-TRUE 63 / 63`
  - 6 boundaries, `65 / 13 / 10 / 7 / 3 / 1`
  - materially healthier boundary structure

### 2.2 Deployed newest jobs

- `9a12f07e3da94c368cd8721b5dd40ab5`
  - Plastik DE
  - `MIXED 51 / 58`
  - 5 boundaries, `81 / 3 / 3 / 2 / 1`
  - `boundary_evidence_concentration`
  - `verdict_grounding_issue`
- `1fc7776c5cf5463498aaefca70844767`
  - Bolsonaro PT
  - `LEANING-TRUE 62 / 52`
  - 6 boundaries, `42 / 25 / 9 / 5 / 4 / 3`
  - `verdict_grounding_issue`
- `cfd508bc3c944a4b8b015d1c5d11783e`
  - Bolsonaro EN
  - `LEANING-TRUE 71 / 66`
  - 6 boundaries, `19 / 13 / 12 / 11 / 5 / 4`
  - materially healthier distribution
  - still shows `verdict_grounding_issue`

### 2.3 Current diagnosis from the evidence

- The main quality defect is **not** that valid boundaries are starved after formation.
- The stronger pattern is that Stage 2 admits broad/tangential evidence, then Stage 3 still creates:
  - one mega-boundary
  - plus several weak/tangential singleton boundaries
- A separate, cross-environment problem remains in Stage 4/5:
  - verdict reasoning still sometimes cites `CB_*` labels as if they were evidence
  - verdict reasoning still sometimes references inconsistent or non-existent `EV_*` IDs

---

## 3. Debate Summary

### 3.1 Grounding-first argument

The strongest grounding-first argument is product trust:

- `verdict_grounding_issue` appears in both local and deployed runs
- it appears across EN, PT, and DE
- the current policy treats it mostly as informational/admin-facing
- so a user can receive a polished verdict while the evidence-to-reasoning link is internally suspect

This makes grounding a strong **containment** candidate because the fix surface is relatively narrow and user trust is directly involved.

### 3.2 Retrieval/boundary-first argument

The strongest retrieval-first argument is breadth and root-cause fit:

- the same mega-boundary pattern appears locally and in production
- it appears across Bolsonaro and Plastik families
- healthy counterexamples exist when evidence distribution is healthy
- repo-level status and earlier investigations already point to Stage 2-driven cross-linguistic neutrality / evidence-pool variance as the main remaining quality gap

This makes Stage 2/3 the stronger **root-cause** workstream.

### 3.3 Validation-discipline argument

The strongest process argument is that current comparisons are still confounded by:

- different commits between local and deployed
- changing UCM/runtime configuration
- mixed cached and uncached runs
- provider health / quota noise

Therefore, the next code change should not be chosen from anecdotal cross-environment comparisons alone.

---

## 4. Recommended Order

## 4.1 First: controlled same-commit validation gate

Before choosing a fix slice, lock down:

- same commit
- same config snapshot
- same provider ordering / model choices
- explicit cache protocol:
  - cold-to-cold
  - warm-to-warm
- serial execution only
- quota/provider-health logging separated from quality findings

Recommended first comparison target:

- Bolsonaro EN on the **same commit** under serial conditions

Reason:

- it already has one healthy deployed reference (`cfd508...`)
- it is a better canary for environment/provider noise than the thin local German plastics-industry runs

## 4.2 Second: start two tracks in parallel after the validation gate

Once the validation gate is in place, run:

- **Track A:** Stage 2/3 retrieval-boundary stabilization
- **Track B:** narrow verdict-grounding containment

Reason:

- Stage 2/3 remains the stronger root-cause track
- but grounding is no longer safely deferrable until Stage 2/3 is complete, because `cfd508bc...` already shows `verdict_grounding_issue` on a healthy boundary distribution
- the two tracks have low merge-conflict overlap and different scopes

## 4.3 Track A: Stage 2 retrieval/query anchoring

If concentration still reproduces under controlled same-commit conditions, the next implementation slice should be Stage 2, not Stage 4.

Target files:

- `apps/web/src/lib/analyzer/research-query-stage.ts`
- `apps/web/src/lib/analyzer/research-orchestrator.ts`
- relevant UCM search config if a bounded tuning point is justified

Focus:

- keep queries anchored to the proceeding / claim under evaluation
- reduce drift into adjacent controversies
- improve query/event coverage without broad redesign

## 4.4 Track A follow-on: Stage 3 concentration / assignment guardrails

Only after Stage 2 is characterized or tightened:

- inspect why one boundary still absorbs 80%+ of evidence
- evaluate whether weak singleton/tangential boundary formation should be harder

Target file:

- `apps/web/src/lib/analyzer/boundary-clustering-stage.ts`

Important:

- do not start with a generic clustering tweak
- concentration is a signal and amplifier, but not proven as the first causal layer

## 4.5 Track B: narrow verdict-grounding containment

Grounding integrity should stay narrow, but it should no longer wait for full Stage 2/3 completion.

Target files:

- `apps/web/src/lib/analyzer/verdict-stage.ts`
- `apps/web/src/lib/analyzer/verdict-generation-stage.ts`
- `apps/web/src/lib/analyzer/aggregation-stage.ts`
- `apps/web/src/lib/analyzer/warning-display.ts`

Desired outcome:

- reasoning must not use `CB_*` labels as if they were evidence citations
- every cited `EV_*` must exist and match the live evidence pool
- if grounding is invalid, do not silently ship a fully normal-looking result

Why this is now parallel rather than deferred:

- deployed `cfd508bc3c944a4b8b015d1c5d11783e` has healthy boundary distribution and still shows `verdict_grounding_issue`
- this demonstrates grounding is not purely a downstream symptom of mega-boundary concentration
- therefore the right posture is:
  - **root-cause track:** retrieval/boundary
  - **containment track:** grounding

---

## 5. Validation Gate

The next workstream should only begin after the following controlled validation setup exists:

1. Pick one comparison baseline:
   - run deployed commit locally, or
   - stage the local commit into a deployed-like environment
2. Freeze UCM snapshot and runtime settings
3. Define cache protocol explicitly
4. Run serially only
5. Log provider-health / quota issues separately
6. Run at least 2-3 repeats per scenario

Recommended scenario order:

1. Bolsonaro EN
2. German Plastik
3. one stable control

Interpretation rule:

- if Bolsonaro EN is unhealthy only under noisy local conditions, do **not** rush into analysis-code changes
- if concentration reproduces on same-commit clean runs, Stage 2/3 is justified as the primary root-cause fix track
- if grounding issues persist on healthy-distribution runs, keep the containment slice active in parallel rather than waiting for the root-cause track to finish

### 5.1 Executable Procedure

For the first local execution pass, use this exact procedure:

1. Record current local commit and ensure `FH_RUNNER_MAX_CONCURRENCY=1`
2. Record local service health
3. Clear search cache
4. Reset all search-provider circuits
5. Run the canary scenarios **serially** on the same local commit:
   - Bolsonaro EN:
     - `Did the legal proceedings against Jair Bolsonaro regarding the attempted coup d'état comply with Brazilian and international procedural law, and did the proceedings and the subsequent verdict meet international standards for a “fair trial”?`
   - German Plastik:
     - `Plastik recycling bringt nichts`
   - Stable control:
     - `Ist die Erde rund?`
6. Capture for each job:
   - `jobId`
   - executed commit
   - config snapshot / config usage hashes
   - final verdict / truth / confidence
   - boundary counts
   - evidence count / source count / search count
   - warnings
7. Repeat the same scenarios without clearing search cache to get the first warm-pass comparison

### 5.2 Current execution scope

This plan's first execution slice is intentionally **local-only on the current commit**. It is meant to establish a clean same-commit baseline before any cross-environment comparison or code change.

### 5.3 2026-04-04 execution status

Executed on local commit:

- `3056ca55525a3f97a0d3b12da91ebf11c4e8e1e5+e092156c`

Procedure executed:

- local health confirmed
- search cache cleared
- provider circuits reset
- serial cold-pass canary batch started

Usable completed jobs:

- `6866375de4d44480b939cca7c5b8e83c`
  - scenario: Bolsonaro EN
  - result: `LEANING-TRUE 69 / 67`
  - boundaries: `3 / 3 / 2 / 1 / 9 / 50`
  - evidence / sources / searches: `68 / 28 / 18`
  - warnings still include:
    - `verdict_grounding_issue`
    - `source_fetch_failure`
    - `source_fetch_degradation`
    - `per_source_evidence_cap`
- `e4ed5b5b386f4e20a96630f8cbc44772`
  - scenario: Plastik DE
  - result: `UNVERIFIED 50 / 0`
  - boundaries: `47`
  - evidence / sources / searches: `47 / 28 / 12`
  - warnings include:
    - `analysis_generation_failed`
    - `explanation_quality_rubric_failed`
    - `source_fetch_failure`

Blocked/invalid validation artifacts:

- `2960ceefaea4423081807bebd21e5c1d`
- `8ce8b37321164c40a878d1d440c6c839`
- `5299ff4987944268b685b50275e3ede0`
- `c0563ce56e1843a2981f595f9e0b237e`

These failed operationally, not analytically. Local `JobEvents` show:

- `Your credit balance is too low to access the Anthropic API.`

Interpretation:

- the validation gate is **partially executed but not complete**
- the cold Bolsonaro run remains usable evidence
- the cold Plastik run is usable only as a partial data point because the batch was interrupted by provider-credit exhaustion
- no warm-pass comparison can be trusted until Anthropic access is restored

Next required step:

- restore Anthropic credits locally
- rerun the same canary matrix from a cleared-cache starting point
- only then treat the gate as complete

### 5.4 2026-04-04 rerun status after credit restoration

After the credit-exhausted jobs were deleted and resubmitted, the following jobs completed:

- `045e240d5c6949288b488978237f65ac`
  - Plastik DE
  - `LEANING-FALSE 34 / 71`
  - boundary counts: `75 / 11 / 10 / 4 / 4`
  - warnings include:
    - `verdict_grounding_issue`
    - `verdict_batch_retry`
    - `source_fetch_degradation`
- `42476c7a3b7941208e73ed03898396ab`
  - `Ist die Erde rund?`
  - `TRUE 96 / 91`
  - boundary counts: `2 / 1 / 1 / 9 / 8 / 33`
  - warnings include:
    - `verdict_grounding_issue`
    - `direction_rescue_plausible`
- `b6a7bcc9723b48e2812133c8bfd4400d`
  - Bolsonaro EN
  - `LEANING-TRUE 68 / 67`
  - boundary counts: `1 / 1 / 65`
  - warnings include:
    - `boundary_evidence_concentration`
    - `verdict_grounding_issue`

Additional job:

- `0488e3970951487c9c5d9c1f67b6fea5`
  - DPA family
  - `INTERRUPTED`
  - `JobEvents` show: `Job interrupted by server restart.`

### 5.5 New blocker found during rerun

The rerun batch still does **not** satisfy the intended validation gate, because the completed jobs did **not** execute on one stable local commit:

- `045e240...` → `4ae22067dcd17287ed661e83673c65ee75f06384+24726a42`
- `42476c7...` → `01ca99f73fffb222ed6c4310d4f06f8cd778455b+24726a42`
- `b6a7bcc...` → `987275928d3f871456eeb2787e639e81b83f710f+24726a42`

Interpretation:

- the canary jobs are analytically useful as spot observations
- but they are **not** a valid same-commit validation batch
- a real local restart/reload instability still exists in the dev stack and is contaminating the validation gate

Therefore:

- the gate remains **not yet satisfied**
- the next blocker is now local execution stability, not lack of canary jobs
- the clean next step is to run the validation batch only after the local stack is held on one stable build/commit without mid-batch restart or hot-reload drift

### 5.6 Cross-environment reading after the reruns

The newest completed jobs sharpen the picture:

- **Local remains operationally noisy**
  - the newest local jobs still executed on different `executedWebGitCommitHash` values
  - therefore local runs are still useful only as spot observations, not as a valid comparison baseline
- **Production is analytically more trustworthy right now**
  - `9a12f07e3da94c368cd8721b5dd40ab5` (Plastik DE) completed cleanly but still showed heavy concentration: `81 / 3 / 3 / 2 / 1`
  - `cfd508bc3c944a4b8b015d1c5d11783e` (Bolsonaro EN) completed with a healthier distribution: `19 / 13 / 12 / 11 / 5 / 4`
  - `1fc7776c5cf5463498aaefca70844767` (Bolsonaro PT) also completed, but still showed noticeable skew: `42 / 25 / 9 / 5 / 4 / 3`
  - `7b052c9d69394577bbaa9404846c98e9` (Homeopathy FR) completed with a moderate split: `25 / 21 / 8 / 2 / 2 / 1`
- **`verdict_grounding_issue` persists across both healthy and unhealthy distributions**
  - it still appears on deployed jobs with severe concentration
  - but it also still appears on deployed jobs with healthier distributions
  - therefore it is now confirmed as an **independent containment issue**, not just a side effect of mega-boundaries

Interpretation:

- the strongest evidence for the main analytical defect now comes from **production**, not local dev
- the main root-cause track remains **Stage 2/3 retrieval-boundary stabilization**
- the independent containment track remains **verdict-grounding integrity**
- the local same-commit validation gate is still required before trusting local-vs-deployed comparisons for code-change evaluation

### 5.7 Cause assessment for the post-deployment degradation impression

The latest production reading does **not** support a broad new regression caused by the most recent deployment.

Most relevant shipped analysis-affecting change in the latest deployment:

- `ee885b37` — bounded Wikipedia supplementary search enabled by default with:
  - `search.providers.wikipedia.enabled = true`
  - `supplementaryProviders.mode = "always_if_enabled"`
  - `maxResultsPerProvider = 3`

However, the deployed evidence does **not** support that change as the primary cause of the observed degradation:

- deployed **Plastik DE** `9a12f07e3da94c368cd8721b5dd40ab5`
  - still shows the strongest concentration problem
  - but its source set contains **no Wikipedia results**
- deployed **Bolsonaro EN** `cfd508bc3c944a4b8b015d1c5d11783e`
  - distribution is comparatively healthier
  - contains only **one** bounded Wikipedia result
- deployed **Homeopathy FR** `7b052c9d69394577bbaa9404846c98e9`
  - also contains a single Wikipedia result
  - but did **not** degrade catastrophically

Comparison to older deployed runs also shows that the core analytical issue predates the latest deployment:

- older deployed **Bolsonaro EN** `6f357b2af0ae4fef9893db4d4c7d27bd`
  - already had a dominant trial-documentation boundary with very high evidence count
- older deployed **Plastik DE** `800431527e254d2888ef56ba23af4688`
  - already had several oversized recycling-economics/technology boundaries

Therefore the best current diagnosis is:

- the apparent degradation is **mainly the pre-existing Stage 2/3 retrieval-boundary concentration problem**
- not a new broad regression introduced by the latest deployment
- the only latest-deployment search change (bounded default-on Wikipedia) is at most a **secondary amplifier on some topics**, and is **not implicated at all** in the degraded deployed Plastik case
- `verdict_grounding_issue` is also still present, but it is a separate containment concern rather than the cause of the concentration drift

### 5.8 Commit-hash provenance issue clarified

The recent local `executedWebGitCommitHash` confusion is now understood:

- the hash is **technically correct for the whole repo state**
- but it is **too broad to serve as an analyzer-specific validation key**

Root cause in code:

- `apps/web/src/lib/build-info.ts`
  - `getWebGitCommitHash()` resolves `git rev-parse HEAD`
  - if the working tree is dirty, it appends `+{wthash}` where `wthash = SHA256("git diff HEAD")[0..8]`
  - both checks are over the **entire repository**, not analysis-relevant paths only
- `apps/web/src/lib/internal-runner-queue.ts`
  - calls `getWebGitCommitHash()` for each job execution and persists that value as `executedWebGitCommitHash`
- `apps/api/Controllers/JobsController.cs`
  - exposes `ExecutedWebGitCommitHash ?? GitCommitHash` as the visible `gitCommitHash`

What this means in practice:

- any unrelated tracked-file change anywhere in the repo changes the dirty suffix
- any unrelated commit anywhere in the repo changes the base commit hash
- therefore docs-only commits and docs-only dirty changes can make jobs look like they ran on "different code" even when analyzer/runtime code did not materially change

This exactly matches the recent local hashes:

- `3056ca55...`, `4ae22067...`, `98727592...`, `01ca99f7...`, `a015b707...`
  - all correspond to **documentation commits**, not analyzer changes

Interpretation:

- the current visible execution hash is still useful as **whole-repo provenance**
- but it is misleading as a **quality-validation gate** for analyzer behavior
- this is why the local same-commit gate felt "wrong" even before the latest reruns

Practical consequence for the active plan:

- do **not** treat differing visible execution hashes alone as proof that analyzer code changed
- for quality validation, the missing piece is an **analysis-scoped provenance key** (or a stricter validation environment where no unrelated repo commits/dirty edits occur during the batch)

### 5.9 Same-commit serial local validation gate finally completed

After the provenance/live-hash fix, a fresh serial local batch was rerun on one stable build:

- live API/web build during batch: `a405c20fe605761e3166b8b75037aa909b235794+17524e1c`
- all three jobs below were created **and executed** on that same build

Results:

- local **Earth DE** `e3d6f405d2c345d58814b15c996e5874`
  - `LEANING-TRUE 70 / 80`
  - boundary evidence counts: `4 / 3 / 3 / 4 / 20 / 8`
  - warnings: fetch degradation only, **no** `verdict_grounding_issue`

- local **Bolsonaro EN** `b417c29833794d738c3f3103d7eec32b`
  - `LEANING-TRUE 69 / 64`
  - boundary evidence counts: `8 / 3 / 11 / 4 / 41 / 16`
  - warnings include:
    - `verdict_grounding_issue`
    - `llm_tpm_guard_fallback`
    - fetch/applicability noise

- local **Plastik DE** `3f97c7e2d6e741479c51135de279e766`
  - `LEANING-FALSE 39 / 67`
  - boundary evidence counts: `9 / 11 / 16 / 13 / 8 / 10`
  - warnings include:
    - `verdict_grounding_issue`
    - fetch degradation noise

What this changes:

- the local validation gate is now **satisfied**
- on this build, local runs do **not** reproduce the earlier catastrophic mega-boundary pattern
  - Bolsonaro still has a dominant boundary (`41`) but it is no longer the prior `65+` single-boundary collapse
  - Plastik is comparatively well distributed on this run
- `verdict_grounding_issue` now stands out more clearly as an **independent surviving defect**
  - it reproduces on Bolsonaro and Plastik
  - it does **not** reproduce on the stable control

Interpretation:

- Stage 2/3 concentration is still a real problem in deployed evidence and in some historical local runs
- but the latest same-commit local gate no longer justifies treating concentration as the first immediate coding target on local evidence alone
- the cleanly reproduced local issue on the current build is now **verdict grounding integrity**

---

## 6. What Not To Do

- Do not infer a local-vs-deployed regression from runs executed on different commits
- Do not reopen Stage-4 parse-recovery work unless parse failures reappear
- Do not add domain-specific heuristics for Bolsonaro, Plastik, or any specific topic
- Do not start with broad clustering redesign
- Do not treat `boundary_evidence_concentration` alone as proof of the first causal layer
- Do not let `verdict_grounding_issue` remain permanently as a quiet informational/admin-only signal if it is confirmed on healthy runs

---

## 7. Final Recommendation

**Updated recommendation:** the local same-commit validation gate is now complete, so the next work should shift to **narrow verdict-grounding containment first**, while keeping **Stage 2/3 retrieval-boundary stabilization** as the next comparative track driven mainly by deployed evidence and cross-environment reruns.

The current evidence does **not** support a broad Stage-4-first program. It supports:

- grounded validation discipline before implementation
- verdict grounding containment as the most clearly reproduced current defect
- Stage 2/3 as the next analytical-quality workstream, but no longer as an unvalidated immediate local fix trigger

Short version:

- **Validation gate:** satisfied on `a405c20f...+17524e1c`
- **Immediate next fix:** verdict grounding containment
- **Next comparative quality track:** Stage 2/3 retrieval-boundary stabilization
- **Evidence source for prioritization right now:** deployed jobs plus the now-valid same-commit local batch
