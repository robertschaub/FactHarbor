# Pipeline Redesign — Comprehensive Implementation Plan (with Decision Proposals)

**Date**: 2026-01-16
**Last Updated**: 2026-01-16 (Sharpened based on Principal Architect Review)
**Audience**: Principal Architect, implementers (Claude Code), reviewers
**Scope**: Bring the current Pipeline Redesign implementation from "implemented pieces exist" to **safe staging → safe production** by resolving the remaining architectural blockers and doc drift.

**Status**: 🔨 Ready for implementation - blockers identified, decisions proposed, implementation steps detailed

Related docs:
- `Docs/DEVELOPMENT/Pipeline_Redesign_Plan_2026-01-16.md` (original redesign plan)
- `Docs/DEVELOPMENT/Pipeline_Redesign_Principal_Architect_Review_2026-01-16.md` (findings/blockers) ⚠️ **BLOCKING ISSUES**
- `Docs/DEVELOPMENT/Pipeline_Redesign_Implementation_Report.md` (what was implemented narrative)
- `Docs/DEVELOPMENT/CI_CD_Test_Setup_Guide.md` (CI strategy)

---

## 0) Non‑negotiable invariants (must hold)

From `AGENTS.md`:
- **Pipeline integrity**: Understand → Research → Verdict (no stage skipping)
- **Input neutrality**: Q vs S divergence target **≤ 4 points** (avg absolute)
- **Scope detection**: multi-scope detection + unified “Scope” terminology
- **Quality gates**: Gate 1 and Gate 4 are mandatory
- **Generic by design**: no domain-specific keyword lists

Operational governance (required for rollout):
- **No synthetic evidence**: verdict evidence must come from fetched sources
- **Fail closed**: if provenance is insufficient, do not “pretend research happened”; fall back deterministically

---

## 1) Current state (baseline)

### 1.1 Already present in code (do not re-build)
- **PR0** regression tests exist (neutrality, scope preservation, adversarial scope leak).
- **PR1** entry-point normalization exists (Q→S canonicalization for neutrality).
- **PR3** deterministic scope IDs exist (hash-based).
- **PR4-lite** Gate1-lite exists.
- **PR5** provenance validation exists and is integrated into fact extraction.
- **PR6** budget module exists and research loop has enforcement hooks.

### 1.2 Why we still need an implementation plan
Despite “implemented pieces”, there are **blocking correctness and safety issues** documented in the Principal Architect review:
- grounded search path is not truly grounded and can launder synthetic evidence
- trackRecordScore scale mismatch can break math
- budget semantics mismatch can enforce unintended caps
- CTX_UNSCOPED display-only is not enforced in aggregation
- docs claim “complete” while blockers remain

This plan resolves those items with explicit decisions and acceptance tests.

---

## 2) Decision proposals (choose explicitly; defaults recommended)

| Decision | Options | Recommended Default | Rationale |
|---|---|---|---|
| **D1: Grounded search contribution** | A) URL discovery only + fetch pipeline; B) Non-evidentiary summary + deterministic fallback | **A** | Avoid synthetic evidence; keep “evidence = fetched text” invariant |
| **D2: trackRecordScore scale** | A) 0–1 everywhere; B) 0–100 then convert at ingestion | **A** | Simplest; matches current weighting math assumptions |
| **D3: Budget semantics** | A) separate global + per-scope caps; B) reuse helper but correct IDs + add global check | **A** | Avoid accidental 3-iteration global cap; aligns to doc intent |
| **D4: Gate1-lite vs supplemental** | A) apply Gate1-lite before coverage counting; B) count on filtered view | **A** | Enforces feasibility rationale directly |
| **D5: CTX_UNSCOPED governance** | A) exclude from aggregation; B) include weight=0 | **A** | Clearer invariants; easier to test |
| **D6: “Force external search” override** | A) implement `FH_FORCE_EXTERNAL_SEARCH`; B) remove doc references | **A** | Operational kill-switch; safest rollout control |

---

## 3) Work plan (PR sequence)

Each PR must be small, reviewable, and comes with acceptance criteria + tests.

**Priority Order**: PR-D (CRITICAL - breaks budget intent) → PR-C (CRITICAL - breaks math) → PR-B (BLOCKER - synthetic evidence) → PR-E → PR-F → PR-A (doc cleanup) → PR-G (ops)

---

### PR-A: Documentation alignment (remove "complete" claims; point to this plan)
**Status**: ✅ COMPLETE (already updated in previous work)
**Blocker addressed**: Blocker G (doc/operational drift)

**Goal**: Stop misleading status claims and ensure reviewers follow the correct gates.

**Already done**:
- ✅ `Docs/DEVELOPMENT/Handover_Pipeline_Redesign_Implementation.md` - updated with gated status
- ✅ `Docs/DEVELOPMENT/Pipeline_Redesign_Implementation_Report.md` - updated with blocker references
- ✅ `Docs/DEVELOPMENT/Pipeline_Redesign_Review_Guide.md` - links to Principal Architect review
- ✅ All PR summary docs - updated with completion + blocker status

**Acceptance**:
- ✅ No doc claims "production/staging ready" unless all Go/No-Go gates are met
- ✅ All docs link to the Principal Architect review + this implementation plan

**Skip to next PR** - documentation alignment already complete.

### PR-B: Ground Realism hardening (grounded search = URL discovery only)
**Decision(s)**: D1, D6

**Goal**: grounded/native research can never introduce synthetic evidence and never skip standard search while producing no usable facts.

- Implementation approach:
  - Add `FH_FORCE_EXTERNAL_SEARCH` to bypass grounded mode.
  - In grounded mode:
    - treat Gemini output as **candidate URL list only**
    - fetch those URLs via existing fetch pipeline
    - run extraction only on fetched page text
    - do **not** create a synthetic “grounded response” `FetchedSource` used for evidence
    - if grounding metadata/URLs are insufficient → fall back to standard search (and log why)
- Tests:
  - A unit/integration test that grounded mode with missing/empty URLs forces fallback.
  - A test that asserts no `FetchedSource.url` can be `gemini-grounded-search` in evidence-bearing pipelines.

### PR-C: trackRecordScore normalization + math clamps
**Decision(s)**: D2

**Goal**: prevent mathematically invalid verdict values; enforce invariants at module boundaries.

- Implementation approach:
  - Standardize `trackRecordScore` to 0–1 across:
    - grounded sources conversion
    - any synthetic/non-web sources (if retained for debugging only)
    - reliability bundle ingestion (if present)
  - Add guards:
    - clamp `trackRecordScore` to [0,1]
    - clamp `truthPercentage` to [0,100] after weighting (defensive safety)
- Tests:
  - Unit tests for score normalization/clamping
  - Regression test that ensures truthPercentage stays within 0–100 under weighting

### PR-D: Budget semantics fix (global vs per-scope)
**Decision(s)**: D3

**Goal**: budgets enforce the documented intent: **12 total iterations, 3 per scope** (defaults), not accidental early termination.

- Implementation approach:
  - Track and enforce:
    - global total iterations
    - per-proceeding iteration counts (use proceeding IDs, not a single “GLOBAL_RESEARCH” bucket)
  - Ensure budget stats emitted clearly state which cap triggered termination.
- Tests:
  - Unit tests for budget counters (global + per-scope)
  - Integration test verifying default allows >3 global iterations but caps at 12

### PR-E: Gate1-lite ordering / supplemental coverage correctness
**Decision(s)**: D4

**Goal**: Gate1-lite actually enforces the feasibility rationale.

- Implementation approach (recommended):
  - Apply Gate1-lite before supplemental coverage logic OR feed a Gate1-lite view into coverage counting.
  - Keep original claims for display/debug if needed, but supplemental decisions must use eligible set.
- Tests:
  - A unit/integration test that constructs a scenario where pre-filtering would change coverage decisions (and asserts the intended behavior).

### PR-F: CTX_UNSCOPED aggregation exclusion (display-only guarantee)
**Decision(s)**: D5

**Goal**: CTX_UNSCOPED is visible for debugging but cannot affect overall verdict.

- Implementation approach:
  - Exclude `relatedProceedingId === CTX_UNSCOPED` from:
    - overall aggregation
    - per-scope aggregation
  - Make the exclusion explicit and testable (avoid “accidental” behavior).
- Tests:
  - Add test: overallTruthPercentage unchanged when adding unscoped facts/verdicts
  - Add test: per-scope truth unchanged when adding unscoped items

### PR-G: Staging rollout playbook + CI gating policy
**Goal**: operationalize safety and define what “passing” means.

- Decide CI policy:
  - Which tests run on every PR (fast)
  - Which run nightly/manual (expensive API-key tests)
- Add staging defaults:
  - start with warn-only budgets, then enforce
  - provenance validation enabled by default
  - grounded mode disabled unless D1/D6 are implemented and verified

---

## 4) Definition of Done (production-ready)

All Go/No-Go gates in the Principal Architect review must be satisfied, plus:
- CI shows the selected required gates passing
- staging shows no abnormal spikes in early-termination, provenance rejection rates, or neutrality divergence
- rollback plan documented and tested

