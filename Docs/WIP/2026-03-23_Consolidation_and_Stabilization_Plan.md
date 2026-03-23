# Consolidation & Stabilization Plan
**Date:** 2026-03-23
**Status:** DRAFT (Proposed)
**Role:** Senior Architect
**Context:** Consolidation Phase following Phase 2 v1/v2 failures and WS-2 Refactoring start.

---

## 1. Executive Directive: The "Freeze"

**STOP all "Quality Tuning" immediately.**

We are currently in a dangerous state of "Thrashing":
1.  **Refactoring** is changing the code structure (`claimboundary-pipeline.ts` decomposition).
2.  **Optimization** is changing the execution flow (parallelism).
3.  **Quality Investigation** is tempting us to change Prompts/Logic to fix "Plastik".

**Decision:**
*   **Park "Plastik" & "Bolsonaro" Quality:** Accept them as "Known Limitations" (Unstable/Unverified). Do not touch their prompts.
*   **Park "Speed Phase 2":** No model downgrades (Clustering -> Haiku) until the system is stable.
*   **FOCUS ONLY ON:** Finishing the Refactoring (WS-2) and Cleaning the Agent Rules.

---

## 2. Immediate Priorities (The "Clean Floor" Strategy)

We cannot build on a messy floor. We must clean up the rules and the code structure first.

### Priority A: Agent Rules Cleanup (Day 1)
*Reference: `Docs/ARCHIVE/Agent_Rules_Cleanup_Plan_2026-03-17.md`*

Our agents are reading stale rules about "Monolithic Pipelines" that barely exist anymore.
*   **Action:** Execute Phase 1 & 2 of the Cleanup Plan immediately.
*   **Why:** Prevents AI hallucinations during the refactoring. We need agents to understand the *new* `stages/` structure, not the old monolith.

### Priority B: Verify & Lock WS-2 Refactoring (Day 1-2)
*Reference: `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md` (Priority 3)*

We have started extracting stages (`verdict-generation`, `boundary-clustering`). We must ensure this is "Done" and "Stable" before moving on.
*   **Action:** Verify the split. Ensure no "logic leaks" between the orchestrator and the stages.
*   **Verification:** Run the **Hydrogen** smoke test. It is the *only* stable control we have. If Hydrogen breaks, the Refactoring is broken.

### Priority C: Infrastructure Hardening (Day 2-3)
*Reference: `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md` (Priority 3)*

*   **Action:** Fix **Config Provenance**. Pass `jobId` into config loads.
*   **Why:** We cannot debug the "Plastik" quality issues later if we don't know exactly which config ran. This is a prerequisite for re-opening the Quality track.

---

## 3. The "Known Limitations" (What we ignore for now)

Do **not** raise alerts or start investigations for:
1.  **Plastik Verdict Flips:** We know it's unstable (~47pp spread). We have a design brief (`Phase 2 v3`) for it later. Do not fix it now.
2.  **Bolsonaro "Fairness" Drift:** We know the input variants are mixed. Do not fix it now.
3.  **Legacy "Speed" Issues:** Unless they are low-risk config changes (P1-C/D/E), ignore them.

---

## 4. Execution Sequence

1.  **Rule Scrub:** Run the `Agent_Rules_Cleanup` prompts.
2.  **Code Lock:** Commit current WS-2 state.
3.  **Smoke Test:** Run `Hydrogen` control.
4.  **Infra Fix:** Implement `jobId` in Config.
5.  **Baseline:** Re-run `Hydrogen`.

**Only after these 5 steps are complete do we look at "Report Quality" again.**

---

## 5. Success Criteria for this Phase

*   **Agent Clarity:** Agents no longer reference "Monolithic Dynamic" pipeline.
*   **Code Stability:** The `apps/web/src/lib/analyzer/stages/` folder is the Source of Truth, and `claimboundary-pipeline.ts` is just a dumb orchestrator.
*   **Observability:** Every Job ID has a linked, retrievable Config Snapshot.
*   **Stability:** `Hydrogen` returns `MOSTLY-FALSE` consistently across 3 runs.

---

## 6. Next Steps (Post-Consolidation)

Once we cross the "Consolidation Gate", we will:
1.  Re-open the **Plastik Phase 2 v3** *Design* (not code).
2.  Start **Phase 2 Optimization** (Cost reduction).
