# Pipeline Redesign Implementation Handover (for Claude Code)

**Date:** 2026-01-16  
**Audience:** Claude Code (implementation agent) + maintainers  
**Target:** Option D — Code-Orchestrated Native Research (Phase 0 → Phase 4 hardening)  

---

## 0) What this handover is

This document is the **single implementation handover** for the FactHarbor Pipeline Redesign work. It consolidates:
- the latest architectural decisions and invariants
- the feasibility audit’s blockers and “go/no-go” gates
- the recommended PR sequencing (what to do first, what not to touch yet)
- the minimum regression/stress tests required before rollout steps

**Primary references:**
- Plan: `Docs/DEVELOPMENT/Pipeline_Redesign_Plan_2026-01-16.md`
- Reviewer guide: `Docs/DEVELOPMENT/Plan_Review_Guide_2026-01-16.md`
- Implementation entry: `Docs/DEVELOPMENT/Start_Pipeline_Redesign_Implementation.md`
- Feasibility audit: `Docs/DEVELOPMENT/Implementation_Feasibility_Audit_Report.md`

---

## 1) Non‑negotiable invariants (repo governance)

These are codified in `AGENTS.md`. Do not “relax” them in implementation unless the team explicitly changes `AGENTS.md` and re-derives the test gates.

- **Pipeline Integrity:** Always execute **Understand → Research → Verdict** (no stage skipping)
- **Scope detection:** Preserve multi-scope detection + unified “Scope” terminology
- **Quality gates:** Gate 1 and Gate 4 are mandatory
- **Input Neutrality:** Question vs statement divergence target **≤ 4 percentage points** (avg absolute)
- **Generic by design:** No domain-specific keyword lists / topic hardcoding

---

## 2) Current project position (what is “decided”)

### 2.1 Architecture decision
- **Selected:** Option D (TypeScript orchestrator + provenance-safe grounded/native research + strict validation + fallback)
- **Explicitly deferred:** Option A (monolithic “unified tool loop”)

### 2.2 Ground Realism stance (rollout-blocking)
- **No synthetic evidence:** do not treat any LLM synthesis text (including any “grounded response”) as a fetchable source used for verdict evidence.
- **Fail closed:** if grounding metadata/citations are absent, fall back deterministically to standard search providers.

### 2.3 p95-first stance
- Optimization must be driven by **tail latency** (p95), not average-case.
- Multi-scope (3+ scopes) is the critical workload.

---

## 3) Critical feasibility blockers (do not ignore)

### 3.1 Gate1 move is NOT safe yet (blocker)
From `Implementation_Feasibility_Audit_Report.md`:
- Moving Gate1 fully post-research will break supplemental claims coverage detection (`requestSupplementalSubClaims` counts post-Gate1 claims).

**Implementation rule:** Do not move Gate1 fully post-research unless you also refactor supplemental claims logic (or remove/replace it).

**Safe choices:**
- **Defer:** keep Gate1 pre-research for now
- **Gate1-lite:** keep a minimal pre-filter for extreme non-factual claims, then apply full Gate1 post-research for final verdict filtering

### 3.2 Deterministic scope IDs require a “Day 0 audit gate”
Before changing scope ID format (hash-based IDs), audit for hardcoded `CTX_` assumptions:
- `apps/web/src/lib/analyzer/verdict-corrections.ts`
- `apps/web/src/lib/claim-importance.ts`
- `apps/web/src/app/jobs/[id]/page.tsx` (find `normalizeScopeKey()` assumptions)
- repo-wide grep for `CTX_`

### 3.3 Phase 3–4 is blocked until grounded provenance is proven
Before enabling any “grounded/native research” path:
- verify grounding metadata/citations exist
- verify deterministic fallback to external search
- add tests that prevent “synthetic evidence” entering verdict chains

---

## 4) Implementation PR sequence (recommended)

This sequence is designed to minimize regression risk and align with the feasibility audit.

### PR 0 (docs/test harness only): lock the gates
**Goal:** make regressions measurable and enforceable.
- Add/extend regression harness for:
  - Q/S neutrality (avg abs divergence ≤4 points, plus defined p95 target)
  - scope retention (no scope-loss events in tracked suite)
  - adversarial scope-leak test (must pass)
  - p95 latency measurement (baseline vs changes)

### PR 1 (safe): normalization cleanup
**Goal:** single normalization point (no behavior drift).
- Remove redundant normalization inside `understandClaim` (caller already normalizes)
- Add assertion/contract test that `understandClaim` input is already normalized

### PR 2 (safe): scope preservation verification
**Goal:** prove scope preservation logic works on regressions.
- Add regression cases that previously lost scopes (e.g., multi-scope legal) and assert ≥1 representative fact per scope in the refinement prompt selection.

### PR 3 (conditional, after Day 0 audit): deterministic scope IDs
**Goal:** stable IDs without breaking hidden string-matching assumptions.
- Implement deterministic hashing with documented canonicalization
- Add regression test: same input → stable IDs across runs
- Confirm UI + verdict corrections are ID-format agnostic

### PR 4 (do NOT attempt without refactor plan): Gate1 timing
**Goal:** align with plan intent without breaking supplemental claims.
- Either keep Gate1 pre-research (defer) OR implement Gate1-lite + supplemental claims refactor.
- Add targeted tests for “coverage gap” behavior.

### PR 5 (Phase 0 Ground Realism): grounded research provenance enforcement
**Goal:** prevent synthetic evidence and ensure deterministic fallback.
- Grounded mode may propose sources; verdict evidence must come from fetched sources.
- Add integration test: grounded search with no metadata ⇒ fallback to standard search.
- Add assertion/test: no facts in verdict are sourced from synthetic-only content.

### PR 6 (Phase 4 hardening): budgets, semantic validation, bounded parallelism
**Goal:** p95 safety + prevent schema-valid-but-wrong drift.
- Add explicit budgets/caps and bounded concurrency for multi-scope research.
- Add semantic validation (provenance + scope mapping) before verdict generation.
- Implement shadow-mode run (`FH_SHADOW_PIPELINE`) to compare baseline vs hardened Option D.

---

## 5) Required tests (minimum set)

### 5.1 Input Neutrality
- Metric: average absolute difference in final truth percentage between Q and S forms
- Target: **≤ 4 points** avg absolute
- Also define and track p95 divergence

### 5.2 Adversarial scope-leak test
Use the test input from `Start_Pipeline_Redesign_Implementation.md`.

Pass criteria:
- no cross-scope citations
- ambiguous evidence goes to `CTX_UNSCOPED` and is excluded from aggregation

### 5.3 Ground Realism (provenance)
- Every cited fact must have a real `sourceUrl` and an excerpt
- “LLM synthesis as evidence” paths must be impossible

### 5.4 p95 latency
- Define a p95 target (plan suggests 45s, feasibility audit stresses tail risk)
- Measure on multi-scope inputs (3+ scopes)

---

## 6) Local dev commands (Windows)

From repo root:
- `powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1`
- `.\scripts\restart-clean.ps1`
- Web: `cd apps/web; npm run dev`
- API: `cd apps/api; dotnet watch run`

---

## 7) “Stop signs” (what not to do)

- Do not enable/ship grounded/native research until provenance + fallback are enforced and tested.
- Do not move Gate1 fully post-research without refactoring supplemental claims logic.
- Do not change scope ID formats before completing the Day 0 audits.
- Do not add domain-specific keyword lists to “fix” scope labeling (violates `AGENTS.md`).

---

## 8) Quick links (files Claude Code will touch)

- Analyzer core: `apps/web/src/lib/analyzer.ts`
- Scopes: `apps/web/src/lib/analyzer/scopes.ts`
- Grounded search adapter: `apps/web/src/lib/search-gemini-grounded.ts`
- Verdict corrections: `apps/web/src/lib/analyzer/verdict-corrections.ts`
- UI results: `apps/web/src/app/jobs/[id]/page.tsx`
- Quality gates: `apps/web/src/lib/analyzer/quality-gates.ts`
