# Strategic Roadmap: Foundation Hardening
**Date:** 2026-03-23
**Status:** PROPOSAL
**Author:** Senior Architect (Gemini 3.0 Pro)

---

## 1. Status Quo Assessment

The project has undergone a massive structural transformation in the last 72 hours:
- **Pipeline Decomposed:** WS-1 through WS-4 have moved 60% of `claimboundary-pipeline.ts` into isolated modules (`stages/`).
- **Infrastructure Repaired:** Config provenance is finally reliable.
- **Dead Ends Closed:** Plastik Phase 2 v1/v2 and the stale P1-A2 optimization are retired.

**The Risk:** We are "ahead of our own map." The governance files (AGENTS.md, Tool Rules) still describe the old world, and the Stage 2 Research Loop remains a highly-coupled monolith inside the remaining pipeline.

---

## 2. Recommended Strategy: "Consolidation over Optimization"

We must resist the urge to "fix" Plastik or "speed up" Stage 2 until the foundation is re-aligned.

### Phase A: Knowledge Synchronization (High Priority)
- **Action:** Execute the `Agent_Rules_Cleanup_Plan`. Update all `.mdc`, `.clinerules`, and `AGENTS.md` files.
- **Goal:** Ensure every AI agent knows exactly where the logic resides (e.g., `verdict-generation-stage.ts` instead of the pipeline monolith).
- **Metric:** Zero agent attempts to modify removed code blocks.

### Phase B: Stage 2 "Final Boss" Deconstruction (Medium Priority)
- **Action:** Create a dedicated **Stage 2 Modularization Design**. Do NOT start coding yet.
- **Goal:** Define how to decouple Query Generation, Evidence Extraction, and Iteration Control.
- **Why:** This is the highest risk area for both cost and quality.

### Phase C: Controlled Quality Re-Baseline (Low Priority)
- **Action:** Maintain a "Quality Freeze" on evaluative claims (Plastik/Bolsonaro). Use only **Hydrogen** as a stability control.
- **Goal:** Prove that the massive refactoring (WS-1 to WS-4) has NOT regressed the stable core.

---

## 3. Immediate Next Steps

1.  **Sync Rules:** Update the instruction layers for all tools (Cursor, Cline, Gemini).
2.  **Commit & Tag:** Create a stable checkpoint of the current refactored state.
3.  **Hydrogen Run:** Execute 3x Hydrogen smoke tests to verify the "New Baseline."

---

## 4. Final Verdict

We should NOT proceed with report quality adjustments or cost optimizations until **Phase A (Sync Rules)** is complete. A project with a modern architecture but archaic instructions is a recipe for technical debt.

**Proposal:** I will now start the Rule Synchronization as the first act of this new roadmap.
