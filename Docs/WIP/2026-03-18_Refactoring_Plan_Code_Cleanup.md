# Refactoring Plan — Residual Work Streams

**Author:** Lead Architect (Claude Code, Opus 4.6)  
**Date:** 2026-03-18  
**Status:** Active as a **residual source plan** only. `WS-1` through `WS-4` are complete; only `WS-5`/`WS-6`/`WS-7` remain as deferred cleanup candidates.  
**Historical detail:** [2026-03-18_Refactoring_Plan_Code_Cleanup_arch.md](../ARCHIVE/2026-03-18_Refactoring_Plan_Code_Cleanup_arch.md)

---

## 1. Document Role

This file no longer governs a large refactor wave. It now exists only to preserve the still-open **residual refactor candidates** after the Mar-22/24 cleanup wave completed:

- `WS-1` dead-code removal — complete
- `WS-2` ClaimBoundary pipeline decomposition — complete
- `WS-3` evaluate-source decomposition — complete
- `WS-4` search-provider clone consolidation — complete

The active repository gate is currently the validation follow-up in [2026-03-24_Post_Validation_Control_and_Coverage_Followup.md](2026-03-24_Post_Validation_Control_and_Coverage_Followup.md), not further refactoring.

---

## 2. Completed Refactor Streams

These streams are done and no longer belong in active execution planning:

- **WS-1**: dead code removal
- **WS-2**: full analyzer/pipeline decomposition, including Stage 2 research loop
- **WS-3**: request-safe evaluate-source decomposition
- **WS-4**: search-provider shared utility consolidation

Backlog and status should treat them as **closed**, not as pending work.

---

## 3. Remaining Deferred Streams

### WS-5 — Job Report Page Decomposition

**Scope:** Break down the large jobs detail page into smaller components/hooks without changing behavior.

**Why it still matters:**
- the page remains a large maintenance hotspot
- review and iteration cost stays high while logic and presentation are interleaved

**Why it is deferred now:**
- current priority is pipeline/control-quality validation, not UI refactoring
- this stream carries visual-regression risk and needs manual smoke verification

### WS-6 — Admin Config Page Decomposition

**Scope:** Break the admin config page into smaller forms/panels/hooks while preserving editing behavior.

**Why it still matters:**
- the file remains structurally large
- config editing logic is harder to reason about than it should be

**Why it is deferred now:**
- high interaction-surface risk
- no current production or validation blocker depends on it

### WS-7 — Admin Route Boilerplate Cleanup

**Scope:** Consolidate repetitive admin-route wrapper logic.

**Why it still matters:**
- low-cost structural cleanup if the admin route set is touched again

**Why it is deferred now:**
- lowest-impact residual item
- not worth opening as a standalone work stream while more important validation and quality gates are open

---

## 4. Architectural Guidance

- Keep these streams **behavior-preserving**.
- Do not reopen analyzer refactors by drift; the analyzer refactor wave is materially complete.
- If `WS-5` or `WS-6` is selected later, use a **small-slice extraction** strategy and require a manual UI smoke test before closure.

---

## 5. Canonical Tracking

Open residual refactor topics should be reflected in:

- [Backlog.md](../STATUS/Backlog.md)
- [Current_Status.md](../STATUS/Current_Status.md)

This file should be treated as the **source plan for the remaining cleanup ideas**, not as the top-level “what next?” document.
