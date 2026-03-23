# Decision Point: Post-WS-2 Execution Order
**Date:** 2026-03-23
**Status:** REVIEWED — validation gate first, then isolated optimization experiment
**Author:** Senior Architect (Gemini 3.0 Pro)

---

## 1. Context
The major refactoring wave (**WS-1** through **WS-4**) is materially complete. The pipeline monolith is decomposed, search providers are consolidated, and infrastructure (config provenance) is repaired.

The repository is now in a "Clean Floor" state. The immediate short-horizon execution plan from Mar-22 is effectively exhausted.

---

## 2. Successor Options (Pick One)

### Option A: Open the "Quality Track" (Phase 2 v3 Design)
Focus on solving the Plastik family input-neutrality problem (~47pp spread) using the already-written v3 design brief.
*   **Risk:** Medium. Reopens quality experimentation which can be "noisy."
*   **Benefit:** Addresses the primary known limitation of the current Alpha.

### Option B: Open the "Optimization Track" (Speed & Cost)
Implement deferred optimization items from the Optimization Plan, but only **after** a clean post-refactor validation gate.
*   **Risk:** Low-Medium. `P1-A` is quality-affecting and must not be mixed with unvalidated post-refactor behavior.
*   **Benefit:** Significant reduction in token costs and job latency.

### Option C: UI/UX & Frontend Hardening
Extract and modularize the frontend logic in `apps/web` (Dashboard, Report view) to match the new backend cleanliness.
*   **Risk:** Low.
*   **Benefit:** Improves developer velocity for future UI features.

---

## 3. Recommendation
Do **not** jump directly into Option B.

The correct next sequence is:
1. **Validation gate first** on the current deployed `main`
2. If validation is clean: run **P1-A** (`clustering -> Haiku`) as a single isolated experiment
3. Re-evaluate quality/cost impact
4. Decide on **P1-B** separately afterward

**Rationale:** The refactor wave was large enough that quality-affecting optimization must not be introduced without a fresh clean baseline. A single Hydrogen validation run is enough to confirm that current behavior is intact before opening the optimization track.

---

## 4. Next Step
Immediate next step:

1. Deploy current `main`
2. Run a Hydrogen validation job on the deployed stack
3. Record `truth %`, `confidence`, `verdict`, and notable warnings
4. If the run is clean, prepare **P1-A only** as the next experiment

**Not approved yet:**
- bundling `P1-A` and `P1-B` together
- reopening the Plastik quality track
- opening a new frontend/UI workstream before the validation gate
