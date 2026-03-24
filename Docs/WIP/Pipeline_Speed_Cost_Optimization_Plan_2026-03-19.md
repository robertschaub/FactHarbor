# Pipeline Speed & Cost Optimization Plan

**Date:** 2026-03-19  
**Status:** Active as a **residual optimization source plan**. `P1-C/D/E` are complete, `P1-A2` is retired as stale, `P1-A` is blocked, and `P1-B` remains deferred.  
**Historical detail:** [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19_arch.md](../ARCHIVE/Pipeline_Speed_Cost_Optimization_Plan_2026-03-19_arch.md)

---

## 1. Document Role

This file no longer serves as a live execution plan. It preserves the still-open optimization ideas after:

- the Mar-22/24 refactor wave,
- the Stage-4 reliability incident and guard fix,
- the Stage-1 `claimDirection` correction,
- and the preliminary-evidence mapping repair.

**Do not reopen optimization from this file directly.** First close the current validation gate in [2026-03-24_Post_Validation_Control_and_Coverage_Followup.md](2026-03-24_Post_Validation_Control_and_Coverage_Followup.md), then re-baseline runtime/cost on the validated stack.

---

## 2. Current Decision State

### Completed

- **P1-C** — preliminary URLs recorded to avoid duplicate fetch work
- **P1-D** — extraction concurrency config wired
- **P1-E** — timeout alignment / structural cleanup

### Retired

- **P1-A2** — retired as stale because Stage 4 already uses batched multi-claim debate steps; the documented per-claim parallelization target no longer exists

### Still Open

- **P1-A** — clustering model downgrade experiment  
  Quality-affecting. Remains blocked until the current validation gate closes and a fresh baseline exists.

- **P1-B** — preliminary search parallelism  
  Structural and lower-risk than `P1-A`, but still deferred because it is not the current highest-value activity.

- **Phase 2 reductions** (`P2-*`)  
  Remain future, measurement-driven candidates only after the validated baseline is stable again.

---

## 3. What Still Matters

### P1-A — Clustering Model Downgrade

Keep as a **future experiment**, not an approved implementation item.

Preconditions before any attempt:
- current validation gate closed
- fresh benchmark run on the validated stack
- explicit quality comparison plan

### P1-B — Preliminary Search Parallelism

Keep as a **separate deferred structural optimization**.

It should not be bundled with `P1-A`, because:
- `P1-A` changes quality characteristics
- `P1-B` changes runtime characteristics

Keeping them separate makes attribution cleaner.

### Phase 2 Cost/Latency Work

Items like self-consistency reduction, challenger measurement, or additional batching remain valid only as **future measurement topics**. They should not be reopened from historical Mar-19 timing numbers alone.

---

## 4. Architectural Guidance

- Use this file as a **menu of still-open optimization ideas**, not as permission to execute them now.
- Treat old Mar-17/19 timing and cost numbers as **historical context**, not current truth.
- Any future optimization decision should start with:
  1. validated control stack
  2. fresh runtime/cost baseline
  3. isolated experiment design

---

## 5. Canonical Tracking

The current blocking and deferred state should stay visible in:

- [Backlog.md](../STATUS/Backlog.md)
- [Current_Status.md](../STATUS/Current_Status.md)

This file remains useful only as the **source plan for the still-open optimization ideas**.
