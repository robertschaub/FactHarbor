# Pipeline Speed & Cost Optimization Plan

**Date:** 2026-03-19  
**Last Revised:** 2026-03-31  
**Status:** Active as a **residual optimization source plan**. `P1-B/C/D/E` are complete, `P1-A2` is retired as stale, `P1-A` remains blocked pending a fresh baseline + explicit approval, and `P2/P3` remain deferred future work.  
**Historical detail:** [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19_arch.md](../ARCHIVE/Pipeline_Speed_Cost_Optimization_Plan_2026-03-19_arch.md)

---

## 1. Document Role

This file is no longer a live execution plan. It is the curated **source plan for the still-open runtime/cost ideas** after the March 22-30 implementation wave.

Since the last live refresh of this plan, the stack changed materially:

- **`P1-B` shipped** (`756dded0`) — preliminary search is now parallelized across claims, queries, and source fetches
- **W15 shipped** (`5942eba5`) — same-domain fetch batching/staggering improved Stage-2 acquisition reliability and reduced avoidable fetch-path stalls
- **Source-fetch reduction shipped** — per-domain 401/403 short-circuiting plus enriched fetch-failure diagnostics now further reduce redundant blocked fetch work inside Stage 2 acquisition
- the March 29-30 integrity fixes landed (claim decomposition, all-insufficient path, report matrix, LLM article adjudication), which make the old March 17-19 runtime numbers even less representative of the current stack

Use this file to understand:

- which optimization ideas are still open
- which ones were already implemented or retired
- what the next optimization sequence should be **if optimization is explicitly reopened**

Do **not** reopen optimization directly from the archived March timing data.

---

## 2. Current Decision State

### Implemented from this plan

- **P1-B** — preliminary search parallelism is shipped
- **P1-C** — preliminary URLs are recorded to avoid duplicate fetch work
- **P1-D** — extraction concurrency config is wired
- **P1-E** — fetch-timeout alignment / structural cleanup is done

### Implemented adjacent runtime/reliability work

- **W15** — domain-aware fetch batching is shipped and should be treated as part of the current runtime baseline when optimization is re-measured
- **Source-fetch short-circuiting** — per-domain 401/403 blocking-streak suppression is shipped and should also be treated as part of the current runtime baseline when optimization is re-measured
- **Rec-A / Pass 2 → Haiku** was already shipped before this plan’s live reduction and remains part of the current cost baseline

### Retired

- **P1-A2** — retired as stale. The per-claim sequential Stage-4 loop described in the historical source analysis no longer exists. Stage 4 is already batched per debate step.

### Still Open

- **P1-A** — clustering-model downgrade experiment  
  Still a real candidate, but it is quality-affecting and must remain isolated.

- **Phase 2 (`P2-*`)** — self-consistency / challenger / contrarian reductions  
  Still valid as future measurement-driven work only.

- **Phase 3 (`P3-*`)** — lower-priority cleanup / secondary runtime work  
  Still valid, but clearly lower-value than `P1-A` if optimization is reopened.

- **External non-code cost track** — Batch API, credits, and cost governance  
  Lives primarily in [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md), not here.

---

## 3. What This Means Now

The original Phase 1 structural runtime track is **mostly consumed**.

What remains is no longer “easy parallelism”:

- `P1-A` is a **quality-sensitive model-allocation experiment**
- `P2-*` are **cost/latency reductions that need fresh evidence before approval**
- `P3-*` are **secondary cleanup opportunities**

So the plan should no longer be read as “Phase 1 still waiting.”  
The correct interpretation is:

1. low-risk structural wins are already shipped
2. remaining work needs a **fresh validated benchmark**
3. the next optimization decision is a **new approval decision**, not an automatic continuation

---

## 4. Recommended Next Steps

If optimization is **not** explicitly reopened:

1. keep this file as a source plan only
2. keep current engineering focus on the active quality/trust track
3. revisit optimization only when latency/cost pressure is again a real decision driver

If optimization **is** explicitly reopened, the recommended sequence is:

### Step 1 — Re-baseline on the current validated stack

Run a fresh runtime/cost benchmark on the post-March-30 stack.

Minimum benchmark goals:

- wall-clock time by stage
- LLM call counts by stage
- token/cost profile by stage
- representative 1-claim, 3-claim, and broader multi-claim cases

Do not reuse March 17-19 numbers as if they describe today’s system.

### Step 2 — Decide whether `P1-A` is worth opening

`P1-A` is now the only remaining high-impact item from the original Phase 1 list, but it is not structurally risk-free.

Only open it if:

- fresh baseline shows clustering is still a material latency/cost sink
- there is explicit Captain approval
- there is a comparison gate for boundary quality

### Step 3 — If `P1-A` is declined, move directly to measurement-only Phase 2 review

The next rational evaluation order is:

1. **P2-B** — measure challenger effectiveness
2. **P2-A** — test self-consistency reduction only if the measurement justifies it
3. **P2-C** — consider contrarian-search skip only if the current evidence path still shows redundancy

### Step 4 — Keep the non-code cost track separate

Batch API, nonprofit credits, research credits, and cost-governance work remain worthwhile but should stay in the separate external-cost strategy file.

---

## 5. What Still Matters from the Original Plan

### P1-A — Clustering Model Downgrade

Still the most plausible remaining direct runtime lever from the original plan.

But it is now explicitly:

- **future**
- **quality-gated**
- **baseline-dependent**

### P2-A / P2-B / P2-C — Debate / search cost reductions

Still worth keeping as future measurement topics, especially if:

- Alpha usage grows enough that latency or spend becomes visible
- the fresh benchmark shows Stage 4 still dominating runtime/cost

### P3-A / P3-B / P3-C / P3-D — Low-priority cleanup

Still valid, but do not treat them as the current best next move.

---

## 6. Architectural Guidance

- Treat old March 17-19 timing/cost numbers as **historical diagnosis**, not current truth
- Treat `P1-B/C/D/E` as **done**, not “deferred pending revisit”
- Treat W15 as part of the **current runtime baseline**, even though it came from a reliability track rather than the original optimization plan
- Keep optimization decisions **isolated from trust/quality stabilization work**
- If optimization is reopened, start with:
  1. fresh baseline
  2. one isolated experiment
  3. explicit before/after attribution

---

## 7. Canonical Tracking

Repository-level tracking should stay synchronized in:

- [Current_Status.md](../STATUS/Current_Status.md)
- [Backlog.md](../STATUS/Backlog.md)
- [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md) for the separate non-code cost/funding track

This file remains the **curated source plan for the still-open optimization ideas**, not a direct execution order.
