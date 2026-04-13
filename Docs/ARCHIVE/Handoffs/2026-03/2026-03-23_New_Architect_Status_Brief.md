# New Architect Status Brief

**Date:** 2026-03-23  
**Audience:** Incoming architect / lead architect  
**Purpose:** Fast onboarding into the current FactHarbor state after the Plastik investigation, the short-horizon stabilization plan, and the recent refactor/cleanup wave.

---

## Addendum (2026-03-24)

Later follow-up changed the immediate next-step picture:
- The **Stage-4 provider guard** has now passed concurrent live validation.
- A separate **Stage-1 `claimDirection` bug** was identified on flat-earth controls and fixed at the prompt layer.
- A separate **preliminary-evidence multi-claim mapping leak** was identified in the Stage-1 → Stage-2 handoff and fixed in code (`31aea55d`).
- The current active steering document is now:
  - [2026-03-24_Post_Validation_Control_and_Coverage_Followup.md](C:/DEV/FactHarbor/Docs/WIP/2026-03-24_Post_Validation_Control_and_Coverage_Followup.md)

Read this addendum first if you are using this handoff after 2026-03-24.

---

## 1. Executive Summary

The repository is currently in a **technically stable but strategically paused** state.

What is settled:
- Plastik multilingual neutrality is **parked as a known limitation**.
- Phase 2 `v1` and `v2` retrieval fixes both failed for different architectural reasons and are closed.
- Config provenance repair is complete.
- The short-horizon structural cleanup plan has advanced substantially:
  - `WS-1` complete
  - `WS-2` advanced through **five low-risk slices**
  - `WS-3` complete
  - `WS-4` complete
- `P1-C`, `P1-D`, `P1-E` are complete.
- `P1-A2` was discovered to be **stale** against the real Stage 4 architecture and has been retired in the docs.

What is **not** settled:
- Plastik-family input-neutrality remains unresolved.
- Bolsonaro is **not** currently revalidated as a positive benchmark on current `main`.
- There is **no approved next implementation step yet** after `WS-3` and the `P1-A2` retirement.

The current need is **architectural prioritization**, not emergency debugging.

---

## 2. Background Timeline

### March 19-22: Quality investigation
- A broad quality investigation showed that Plastik-family multilingual neutrality was still unstable.
- Two attempted retrieval fixes failed:
  - **Phase 2 v1:** cross-linguistic supplementary shared pool caused inter-claim divergence and confidence collapse.
  - **Phase 2 v2:** contrarian supplementary pass rarely fired, and the one attributable firing moved in the wrong direction.
- Result: `crossLinguisticQueryEnabled` is off again; Plastik remains parked as a known limitation.

### March 22: Reliability and hygiene corrections
- Live-validation hygiene was formalized.
- Config provenance for ClaimBoundary jobs was repaired and verified.
- Clean post-restart live re-baselining forced a stricter interpretation of current quality claims:
  - Hydrogen remains a stable control.
  - Bolsonaro is **not** currently validated as recovered.

### March 22-23: Structural cleanup wave
- `WS-1` dead-code cleanup completed.
- `WS-2` was intentionally advanced only through low-risk slices:
  - `pipeline-utils.ts`
  - `boundary-clustering-stage.ts`
  - `aggregation-stage.ts`
  - `verdict-generation-stage.ts`
  - `claim-extraction-stage.ts`
- `claimboundary-pipeline.ts` dropped from roughly `~5,700` lines to `~2,522` lines and is now mostly:
  - main entry
  - Stage 2 research loop
- `WS-3` then decomposed the `evaluate-source` route from `2,959` lines to `281` lines and removed request-unsafe mutable globals via request-scoped `SrEvalConfig`.
- `WS-4` consolidated search-provider boilerplate into shared utilities.

### March 23: Optimization-plan correction
- `P1-A2` had been treated as the next step.
- Review against the current code showed the plan was stale:
  - Stage 4 already batches all claims per debate step.
  - Steps `2+3` already run in parallel.
  - Validation checks already run in parallel.
- `P1-A2` was therefore retired as stale and the optimization docs were corrected.

---

## 3. Current Stable State

### Quality / Product State
- Plastik multilingual neutrality: **known limitation, parked**
- Hydrogen: stable control
- Bolsonaro: **do not use as positive benchmark**
- Stage 1 claim-contract validator remains in place and is kept, but clean Mar-22 live evidence did **not** justify overly strong “fully solved” language for exact Plastik inputs
- `verdictDirectionPolicy` remains active
- `crossLinguisticQueryEnabled` remains off

### Codebase / Architecture State
- `claimboundary-pipeline.ts` is much smaller and no longer carries most of Stages 1, 3, 4, 5/6 inline
- The remaining high-coupling core is the **Stage 2 research loop**
- `evaluate-source` route is now decomposed and no longer relies on request-unsafe mutable globals
- Search-provider boilerplate has been consolidated without changing behavior

### Plan / Governance State
- The Mar-22 execution plan has largely been executed
- The current near-term plan is effectively **exhausted**
- A fresh architectural prioritization decision is now needed

---

## 4. Relevant Current Modules

### ClaimBoundary pipeline refactor status
- [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts)
- [pipeline-utils.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/pipeline-utils.ts)
- [boundary-clustering-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/boundary-clustering-stage.ts)
- [aggregation-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/aggregation-stage.ts)
- [verdict-generation-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-generation-stage.ts)
- [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts)

### Source-reliability evaluate-source refactor status
- [route.ts](C:/DEV/FactHarbor/apps/web/src/app/api/internal/evaluate-source/route.ts)
- [sr-eval-types.ts](C:/DEV/FactHarbor/apps/web/src/lib/source-reliability/sr-eval-types.ts)
- [sr-eval-prompts.ts](C:/DEV/FactHarbor/apps/web/src/lib/source-reliability/sr-eval-prompts.ts)
- [sr-eval-evidence-pack.ts](C:/DEV/FactHarbor/apps/web/src/lib/source-reliability/sr-eval-evidence-pack.ts)
- [sr-eval-enrichment.ts](C:/DEV/FactHarbor/apps/web/src/lib/source-reliability/sr-eval-enrichment.ts)
- [sr-eval-engine.ts](C:/DEV/FactHarbor/apps/web/src/lib/source-reliability/sr-eval-engine.ts)

### Search-provider consolidation
- [search-provider-utils.ts](C:/DEV/FactHarbor/apps/web/src/lib/search/search-provider-utils.ts)

---

## 5. What Has Been Explicitly Decided

These decisions are active and should not be silently reopened:

1. **Do not continue Phase 2 `v1` or `v2`.**
2. **Do not weaken Gate 4** to hide multilingual retrieval failures.
3. **Do not resume `WS-2` into the Stage 2 research loop** without fresh explicit approval.
4. **Do not treat Bolsonaro as a positive validation benchmark** on current `main`.
5. **Do not implement `P1-A2`** in its old documented form; it is stale.

---

## 6. Main Difficulties / Architectural Friction Points

### A. Plastik remains unresolved, but the easy paths are exhausted
- The known limitation is real.
- Two retrieval architecture variants failed for different reasons.
- Another quick parameter tweak is not credible.
- A future `v3` would need a genuinely different architecture, documented in the v3 brief.

### B. The Stage 2 research loop is now the main coupling hotspot
What remains in `claimboundary-pipeline.ts` is the most interconnected part:
- query generation
- evidence extraction
- iteration control
- budget management
- shared mutable research state
- abort propagation

This is why `WS-2` is paused at the current boundary.

### C. Some documentation required active correction because the code had moved ahead
The biggest recent example:
- `P1-A2` looked approved on paper
- but the current code already used a batched-per-step verdict architecture
- so the documented optimization path was factually wrong

This means architecture decisions should continue to be checked against current code, not only against old plan documents.

### D. New extracted modules are structurally cleaner, but some are large
Not urgent, but worth monitoring:
- `claim-extraction-stage.ts` is large
- `aggregation-stage.ts` should be watched for re-monolith growth

These are not current blockers, but they are the most likely future “second-level decomposition” candidates.

---

## 7. Active Planning / What the New Architect Should Know

### Governing near-term plan
- [2026-03-24_Post_Validation_Control_and_Coverage_Followup.md](C:/DEV/FactHarbor/Docs/WIP/2026-03-24_Post_Validation_Control_and_Coverage_Followup.md)

### Archived Mar-22 execution record
- [2026-03-22_Next_1_2_Weeks_Execution_Plan.md](C:/DEV/FactHarbor/Docs/ARCHIVE/2026-03-22_Next_1_2_Weeks_Execution_Plan.md)

### Refactoring source plan
- [2026-03-18_Refactoring_Plan_Code_Cleanup.md](C:/DEV/FactHarbor/Docs/WIP/2026-03-18_Refactoring_Plan_Code_Cleanup.md)

### Optimization source plan
- [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md](C:/DEV/FactHarbor/Docs/WIP/Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md)

### Plastik future restart point
- [2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md](C:/DEV/FactHarbor/Docs/WIP/2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md)

### Current WIP index
- [README.md](C:/DEV/FactHarbor/Docs/WIP/README.md)

### Latest agent execution trail
- [Agent_Outputs.md](C:/DEV/FactHarbor/Docs/AGENTS/Agent_Outputs.md)

---

## 8. Recommended Architectural Questions for the Next Window

The next architect should decide **which track comes next**, rather than assuming more of the same:

### Option 1 — Continue structural cleanup
Most natural next structural candidate:
- UI decomposition (`WS-5` / `WS-6`) or similar low-risk refactor work

### Option 2 — Revisit Stage 2 research-loop extraction
Only if explicitly chosen as the next architectural priority:
- high value
- highest coupling
- needs a dedicated extraction plan first

### Option 3 — Run a quality-affecting optimization experiment
Most plausible candidate:
- `P1-A` clustering-to-Haiku experiment

But this is **not** a structural cleanup and needs validation by design.

### Option 4 — Reopen Plastik only as architecture work
Only if product priority changes:
- use the v3 brief
- do not restart from v1/v2 patterns

---

## 9. Suggested Starting Point for the New Architect

If you are a new architect taking over now, the recommended first move is:

1. Read the execution plan and v3 brief
2. Confirm whether the current window is considered complete
3. Decide whether the next window is primarily:
   - structural cleanup,
   - quality experimentation,
   - or a return to Stage 2 architecture work

Do **not** assume the next step is already implicitly approved.

---

## 10. At-Time-of-Writing Repository Note

At the time of writing, local `main` includes:
- `25e4f633` — `WS-3`
- `d2549730` — `P1-A2` retirement doc correction

Verify remote sync state before using `origin/main` as the authoritative baseline.
