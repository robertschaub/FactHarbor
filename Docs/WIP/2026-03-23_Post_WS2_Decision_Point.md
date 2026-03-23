# Decision Point: Post-WS-2 Execution Order
**Date:** 2026-03-23
**Status:** PROPOSAL
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
Implement the deferred items from the Optimization Plan (P1-A Clustering Model Downgrade, P1-B Preliminary Parallelization).
*   **Risk:** Low-Medium. Requires careful quality monitoring to ensure model downgrades don't break verdicts.
*   **Benefit:** Significant reduction in token costs and job latency.

### Option C: UI/UX & Frontend Hardening
Extract and modularize the frontend logic in `apps/web` (Dashboard, Report view) to match the new backend cleanliness.
*   **Risk:** Low.
*   **Benefit:** Improves developer velocity for future UI features.

---

## 3. Recommendation
I recommend **Option B (Optimization)** for the next 2-3 days, specifically **P1-A (Clustering Model Downgrade)** and **P1-B (Parallel Preliminary Search)**. 

**Rationale:** The new modular architecture is now ready to handle model-per-stage overrides cleanly. Cost reduction is a prerequisite for high-volume testing of future quality improvements (Option A).

---

## 4. Next Step
Confirm the preferred track. If Option B is chosen, I will prepare the detailed implementation slice for P1-A/B.
