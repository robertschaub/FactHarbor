# Execution Plan — Next 1-2 Weeks

**Date:** 2026-03-22
**Status:** Complete — priorities 0-5 are materially finished; this plan is now closed and superseded for next-step decisions by `2026-03-23_Post_WS2_Decision_Point.md`
**Author:** Codex (GPT-5)
**Scope:** Practical execution order for the next 1-2 weeks after the Plastik Stage 2 investigation and failed Phase 2 v1/v2 experiments

---

## Document Role

This document was the **governing short-horizon execution plan** for the Mar-22 work window.

It is now a completed execution record. For the next action after WS-2 stabilization, use:
- `2026-03-23_Post_WS2_Decision_Point.md`

It is intentionally different from these two source plans:
- `2026-03-18_Refactoring_Plan_Code_Cleanup.md`
  - comprehensive **refactoring source plan**
  - defines work streams and sequencing inside the cleanup/refactor track
  - does **not** define overall repository priorities by itself
- `Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md`
  - comprehensive **optimization source plan**
  - defines candidate speed/cost improvements and their tradeoffs
  - does **not** define overall repository priorities by itself

Rule for future readers:
- Use **this document** to decide **what happens next**
- Use the other two documents to decide **how to execute their respective tracks once they are selected**

---

## 1. Current State

The repository is in a technically stable state, but the Plastik-family input-neutrality problem remains unresolved.

What is settled:
- **Stage 1 broad-claim contract preservation is materially fixed.**
- **`verdictDirectionPolicy` remains active** as `retry_once_then_safe_downgrade`.
- **Phase 2 v1 and v2 are both closed as failed experiments** and `crossLinguisticQueryEnabled` is now off again in live UCM.
- **Hydrogen is a stable control on the current stack.**
- **Bolsonaro is not currently revalidated.** The clean Mar 22 fair/legal run landed `UNVERIFIED (44 / 24)`, so this family must not be used as a positive benchmark until a fresh clean mini-series confirms recovery.
- **Config provenance repair is now complete for ClaimBoundary jobs.** Fresh jobs now record per-job usage for pipeline, search, calculation, prompt, and SR configs, and the job config snapshot endpoint is populated again.

What remains open:
- The Plastik family still shows a large remaining spread (~47pp).
- The attempted multilingual retrieval fixes failed for different reasons:
  - **Phase 2 v1:** shared supplementary pool produced inter-claim divergence and confidence collapse.
  - **Phase 2 v2:** contrarian supplementary pass rarely fired, and the only real firing moved in the wrong direction.

Practical conclusion:
- **Do not continue tuning Phase 2 v1/v2.**
- Treat Plastik-family multilingual neutrality as a **known limitation for now** unless and until a new Phase 2 v3 architecture is designed.

---

## 2. Planning Goals

This plan optimizes for:
- keeping the system stable after an intensive quality-investigation cycle
- improving future investigability and developer velocity
- avoiding fresh quality regressions caused by mixing architectural work with live quality experimentation

This plan does **not** assume that Plastik Phase 2 v3 must be implemented immediately.

---

## 3. Recommended Execution Order

### Priority 0 — Close and Park the Plastik Retrieval Limitation

**Goal:** Finish the current investigation track cleanly and stop spending time on failed Phase 2 variants.

**Actions:**
- Update the master quality-investigation material so the current state is explicit:
  - Stage 1 fixed
  - Phase 2 v1 failed
  - Phase 2 v2 failed
  - `crossLinguisticQueryEnabled` remains off
- Record a short "known limitation" statement suitable for future references and status docs.
- Preserve the failure reasons for v1/v2 so the same dead ends are not retried later.

**Why first:** This closes the quality loop and prevents future agents from reopening already-rejected lines of attack.

**Done when:**
- The WIP/master docs clearly say the limitation is parked, not pending.
- The active flag state is documented correctly.

---

### Priority 1 — Config Provenance Repair

**Goal:** Make future quality experiments auditable without repeated git archaeology.

**Problem:**
- Per-job config attribution has been an ongoing weakness in the investigation chain.
- Future architecture or quality experiments will be harder to interpret if the exact config state is not tied to each job cleanly.

**Actions:**
- Ensure `jobId` is correctly threaded into config-load/config-usage recording.
- Verify with one fresh job that config provenance is actually visible and attributable.

**Why second:** This is a small, high-leverage infrastructure fix that reduces friction for all later quality and architecture work.

**Status update (2026-03-22):**
- Completed.
- Verified on fresh job `68c9e85ad5fc44a58e0f7749312a5872` after clean restart:
  - `/api/fh/jobs/[id]/configs` returned five config types (`pipeline`, `search`, `calculation`, `prompt`, `sr`)
  - `/api/admin/quality/job/[id]/config` returned a full snapshot

**Done when:**
- A fresh job can be traced to the effective config state that actually ran it.

---

### Priority 2 — Start the Refactoring Plan, but Only WS-1 First

**Source document:** `2026-03-18_Refactoring_Plan_Code_Cleanup.md`

**Goal:** Reduce structural debt without changing behavior.

**First slice only:**
- **WS-1 Dead Code Removal**

**Why WS-1 first:**
- Near-zero behavioral risk
- Simplifies the codebase before larger pipeline work
- Reduces noise for later design and optimization work

**Guardrails:**
- One small step at a time
- Safe tests + build after each step
- No opportunistic refactors outside the approved dead-code scope

**Done when:**
- WS-1 is complete and verified
- No behavior changes were introduced

---

### Priority 3 — Prepare WS-2, Then Start With a Small Slice

**Source document:** `2026-03-18_Refactoring_Plan_Code_Cleanup.md`

**Goal:** Begin decomposing `claimboundary-pipeline.ts` in a controlled, behavior-preserving way.

**Recommended approach:**
- Do **not** attempt all of WS-2 in one move.
- First confirm the extraction order and module boundaries.
- Start with one isolated slice:
  - a leaf/shared helper extraction, or
  - an isolated stage module with minimal coupling

**Why now, but not all at once:**
- Future Phase 2 v3 architecture work will be easier in a less monolithic pipeline.
- But doing the full decomposition immediately would create too much review and regression surface.

**Done when:**
- The first WS-2 slice is merged and verified
- The orchestrator direction is validated without destabilizing the pipeline

**Status update (2026-03-23):**
- **WS-2 complete.** The `claimboundary-pipeline.ts` monolith has been fully decomposed into modular, testable stages:
  - `claim-extraction-stage.ts` (Stage 1)
  - `research-orchestrator.ts` (Stage 2 Orchestration & Helpers)
  - `research-query-stage.ts` (Stage 2 Queries)
  - `research-acquisition-stage.ts` (Stage 2 Acquisition)
  - `research-extraction-stage.ts` (Stage 2 Extraction)
  - `boundary-clustering-stage.ts` (Stage 3)
  - `verdict-generation-stage.ts` (Stage 4)
  - `aggregation-stage.ts` (Stage 5)
  - `pipeline-utils.ts` (Leaf helpers)
- The refactor wave is materially complete. The pipeline code has been reduced from ~5,700 lines to ~900 lines of high-level orchestration.
- Public API surface remains stable via re-exports.

---

### Priority 4 — Only the Low-Risk Part of the Speed/Cost Plan

**Source document:** `Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md`

**Goal:** Capture obvious structural wins without changing analysis quality assumptions.

**Recommended subset only:**
- **P1-C** — record preliminary URLs in `state.sources`
- **P1-D** — wire `parallelExtractionLimit`
- **P1-E** — align fetch timeout usage
- optionally **P1-B** — parallelize preliminary search, but only after the earlier low-risk items

**Do not prioritize yet:**
- clustering model downgrades
- self-consistency reductions
- debate-cost reductions
- anything that could change quality and create a second investigation track

**Why this subset:** These are cleanup/throughput wins with limited semantic risk.

**Done when:**
- The chosen subset is verified with safe tests/build
- No new quality investigation is needed to interpret the change

**Progress update (2026-03-22):**
- **P1-C** complete: preliminary source fetches now also populate `state.sources` for later auditability/debugging.
- **P1-D** complete: `fetchSources(...)` now honors `parallelExtractionLimit` instead of using a hardcoded concurrency.
- **P1-E** complete: preliminary source fetches now use the configured `sourceFetchTimeoutMs`.
- Verification: targeted ClaimBoundary test suite green (`292/292`) and web build green.
- **P1-B** remains explicitly deferred; it was not bundled into this low-risk slice.

---

### Priority 5 — Phase 2 v3 as a Design Track, Not an Implementation Track

**Goal:** Keep the Plastik multilingual neutrality problem alive as an architecture topic without reopening implementation churn immediately.

**What to do:**
- Write or commission a dedicated Phase 2 v3 architecture brief.
- Build directly on the v1/v2 post-mortems.
- Compare a small number of plausible v3 options instead of jumping back into code.

**What not to do yet:**
- No immediate implementation
- No v2.1 or v2.2 parameter tweaking
- No hidden retry of the same shared-pool or simple contrarian-supplement patterns

**Why later:** The codebase first benefits from provenance hardening and some cleanup. The v3 problem is real, but it is not ready for a rushed implementation.

**Done when:**
- A new architecture brief exists with clear rationale, constraints, and decision gates

**Progress update (2026-03-22):**
- Complete.
- A dedicated design-only brief now exists: `2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md`
- Recommendation in that brief: keep Plastik parked by default; if reopened later, restart from a claim-scoped multilingual-lane design, not from v1/v2 variants.

---

## 4. Suggested Week-by-Week Sequence

### Week 1

1. Close the Plastik limitation and update the governing docs
2. Complete config provenance repair
3. Execute WS-1 dead code removal

**Progress update (2026-03-23):**
- Steps 1, 2, and 3 are complete
- WS-1 removed 3,682 lines across 22 files (14 source + 4 test + 6 prompt). Build clean, 1329 tests passing.
- Next execution item: another separately approved WS-2 slice, not `P1-B` by default

### Week 2

1. Prepare and execute the first WS-2 decomposition slice
2. Take the low-risk Speed/Cost subset (P1-C, P1-D, P1-E; optionally P1-B)
3. Start Phase 2 v3 as a design-only architecture brief

**Progress update (2026-03-23):**
- Step 1 is complete:
  - leaf helper extraction (`pipeline-utils.ts`)
  - isolated Stage 3 extraction (`boundary-clustering-stage.ts`)
  - isolated Stage 5 extraction (`aggregation-stage.ts`)
  - isolated Stage 4 verdict-generation extraction (`verdict-generation-stage.ts`)
  - isolated Stage 1 claim-extraction extraction (`claim-extraction-stage.ts`)
- Step 2 is complete for the selected low-risk subset (`P1-C`, `P1-D`, `P1-E`); `P1-B` remains deferred
- Step 3 is complete (Phase 2 v3 design-only brief written; no implementation reopened)
- WS-4 search provider clone consolidation is complete: extracted shared utilities into `search-provider-utils.ts`, reducing 181 lines of clone boilerplate across 7 provider files
- **P1-A2 retired (2026-03-23):** The per-claim sequential debate loop P1-A2 targeted no longer exists; Stage 4 already batches all claims per step, Steps 2+3 run in parallel, and validation checks run in parallel. See updated optimization plan for details.
- WS-3 evaluate-source route decomposition is complete: `route.ts` decomposed from 2,959 to 281 lines across 5 new modules; all 8 mutable module-level globals eliminated via `SrEvalConfig`
- Next structural implementation step: to be decided. `P1-B` stays optional and deferred. `P1-A` (clustering model downgrade) remains a separate future quality experiment.

---

## 5. Decision Gates

### Gate A — After Priority 1

**Question:** Is config provenance now reliable enough that future experiments are meaningfully attributable?

If **no**:
- fix this before continuing with deeper architecture or optimization work

If **yes**:
- proceed to WS-1 / WS-2

### Gate B — After WS-1

**Question:** Did dead-code cleanup stay behavior-preserving and low-drama?

If **no**:
- pause the larger refactor sequence and stabilize

If **yes**:
- continue to the first WS-2 slice

### Gate C — Before any Phase 2 v3 implementation

**Question:** Is Plastik multilingual neutrality important enough right now to justify another architecture implementation cycle?

If **no**:
- keep it parked as a known limitation

If **yes**:
- use the v3 design brief as the only restart point

---

## 6. Explicit Non-Goals

These are intentionally out of scope for the next 1-2 weeks:
- further tuning of Phase 2 v1 or v2
- reopening Stage 1 decomposition / contract-validation work
- weakening Gate 4 / confidence calibration to make failed retrieval designs look better
- high-risk cost optimization that changes model quality assumptions
- broad UI-only extraction work unless it is needed by the refactor sequence

---

## 7. Review Questions

This plan is ready for review on these decision points:

1. Is **parking Plastik Phase 2** now the right product tradeoff, or should v3 move up in priority?
2. Should **config provenance repair** stay ahead of the refactor plan?
3. Is the **WS-1 -> incremental WS-2 slices -> low-risk speed plan** order the right sequence?

---

## 8. Close-Out Status (2026-03-23)

This plan is now materially complete:
- Plastik Phase 2 remains parked as a known limitation
- config provenance repair is complete
- WS-1 is complete
- WS-2, including full Stage 2 research-loop deconstruction, is complete
- WS-3 and WS-4 are complete
- low-risk optimization subset `P1-C/D/E` is complete
- `P1-A2` is retired as stale

The next step is **not** automatic implementation. The current decision line is:
- validate the post-refactor stack first
- then, only if clean, prepare `P1-A` as an isolated experiment
- keep `P1-B` separate and deferred until after that evaluation
4. Should any part of the Speed/Cost plan be moved earlier or explicitly deferred?

---

## 8. Summary

Recommended order:

1. Close and park the Plastik multilingual limitation
2. Repair config provenance
3. Execute WS-1 dead code cleanup
4. Continue WS-2 only in small approved slices
5. Take only the low-risk part of the Speed/Cost plan
6. Reopen Plastik only as a fresh Phase 2 v3 architecture track

This sequence keeps the repository stable, improves developer velocity, and avoids mixing another experimental quality track into an already noisy investigation cycle.
