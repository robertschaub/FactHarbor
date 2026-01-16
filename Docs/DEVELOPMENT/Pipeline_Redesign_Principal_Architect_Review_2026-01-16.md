# Pipeline Redesign — Principal Architect Review (Findings & Recommendations)

**Date**: 2026-01-16  
**Scope**: Review of the “Pipeline Redesign” implementation and associated docs, focused on production readiness and alignment with `AGENTS.md` invariants.  
**Related docs**:
- Review guide: `Docs/DEVELOPMENT/Pipeline_Redesign_Review_Guide.md`
- Implementation report: `Docs/DEVELOPMENT/Pipeline_Redesign_Implementation_Report.md`
- Redesign plan: `Docs/DEVELOPMENT/Pipeline_Redesign_Plan_2026-01-16.md`

---

## 1) Executive Summary (Principal Architect)

The codebase contains substantial progress (tests, budgets, provenance validation, deterministic scope IDs, Gate1-lite). However, **there are correctness and safety issues that block a “production-ready” sign-off**:

- The “grounded search” path is currently **not truly grounded** and can accidentally introduce **synthetic evidence by indirection**.
- A **trackRecordScore scale mismatch** can cause mathematically invalid verdict outputs (truth percentages can go outside 0–100) if grounded-derived sources participate in weighting.
- Budget enforcement exists but **defaults likely do not match the documented intent** (risk of premature termination or false sense of p95 control).
- The `CTX_UNSCOPED` display-only guarantee is **not enforced in aggregation math** (unscoped items can still influence overall verdict unless explicitly excluded).

**Verdict**: **NO-GO to production** until the blockers in §3 are resolved and re-tested.

---

## 2) What is verified in code (high confidence)

### 2.1 Budgets and enforcement hooks exist
- `apps/web/src/lib/analyzer/budgets.ts`: budget config + tracker + enforcement helpers
- `apps/web/src/lib/analyzer.ts`: research loop calls `checkScopeIterationBudget(...)`, records iterations, and can break early

### 2.2 Provenance validation exists and is wired into extraction
- `apps/web/src/lib/analyzer/provenance-validation.ts`: `validateFactProvenance(...)`, `filterFactsByProvenance(...)`
- `apps/web/src/lib/analyzer.ts`: fact extraction maps `sourceUrl`/`sourceExcerpt` and filters facts when enabled

### 2.3 Gate1-lite exists (pre-research) and central-claim protection exists
- `apps/web/src/lib/analyzer/quality-gates.ts`: `applyGate1Lite(...)` always allows `isCentral === true`

### 2.4 Input neutrality normalization at entry point exists
- `apps/web/src/lib/analyzer.ts`: normalizes question → statement for analysis; preserves original input for UI display only

---

## 3) Blockers (must fix before “production-ready”)

### Blocker A — Grounded search is not truly grounded (future‑ware risk)
`apps/web/src/lib/search-gemini-grounded.ts` explicitly notes that true search grounding (`useSearchGrounding`) is **not enabled** yet and would require an SDK upgrade. The current implementation can therefore degrade to “model knowledge + prompt”.

**Risk**: Breaks the “Ground Realism” prerequisite and makes provenance assumptions unsafe.

### Blocker B — Synthetic evidence by indirection via URL + snippet/fullText
`convertToFetchedSources(...)` sets `fullText` to `snippet || groundedResponse`. This is **not fetched page text**.

Even if facts have a real `sourceUrl`, they may still be extracted from a snippet/LLM synthesis while appearing “provenanced” by URL.

**Risk**: Evidence laundering: synthetic content enters verdicting with a real URL attached.

### Blocker C — trackRecordScore scale mismatch (math safety)
Grounded sources currently assign `trackRecordScore` as `50`/`60`. In the analyzer pipeline, `trackRecordScore` is treated as **0–1** (multiplied by 100 for display, compared against `0.6`, and used directly in `applyEvidenceWeighting`).

**Risk**: Weighting can produce invalid truth percentages outside 0–100 (and distort confidence).

### Blocker D — Budget enforcement semantics mismatch

The research loop uses `checkScopeIterationBudget(...)` with a constant scope ID (e.g., `"GLOBAL_RESEARCH"`). With defaults:
- `maxIterationsPerScope = 3`
- `maxTotalIterations = 12`

…the effective cap becomes **3 total iterations**, because the “per-scope” counter is applied to the single global bucket.

**Risk**: premature early termination (lower quality) and a false sense of p95 protection (limits do not match the documented intent).

### Blocker E — Gate1-lite ordering does not enforce the feasibility rationale

The feasibility concern was about **coverage counting** and supplemental-claims behavior. In the current `understandClaim` flow, Gate1-lite is applied **after** supplemental-claims generation, so supplemental coverage decisions still see the unfiltered claim set.

**Risk**: the system can still over/under-generate supplemental claims based on inflated claim counts, undermining the intent of Gate1-lite.

### Blocker F — `CTX_UNSCOPED` is not enforced as display-only in verdict aggregation

`CTX_UNSCOPED` exists and is assigned, but overall aggregation is driven by claim-level attributes (e.g., thesis relevance) rather than an explicit rule that excludes `CTX_UNSCOPED` from overall verdict influence.

**Risk**: ambiguous/unscoped evidence can still influence overall verdict math unless explicitly excluded.

### Blocker G — Doc/operational drift (“complete” status conflicts with blockers)

Multiple docs claim “IMPLEMENTATION COMPLETE”, but the grounded-search module itself notes grounding is not enabled, and the above blockers remain.

**Risk**: stakeholders may treat the system as staging/prod-ready when it is not.

---

## 4) Required decisions (with recommended defaults)

These are “choose one” decisions that must be explicit in the implementation plan. Recommended defaults assume the `AGENTS.md` invariants and the Ground Realism gate are hard constraints.

### Decision 1 — What is “grounded search” allowed to contribute?

- **Option A (recommended)**: Grounded search is **URL discovery only**. URLs must still be fetched via the existing pipeline. Fact extraction may only use fetched page text.
- **Option B**: Grounded search may produce a summary, but it is **non-evidentiary** and cannot flow into fact extraction; the system must fall back to standard search if citations/provenance are missing.

### Decision 2 — How to normalize `trackRecordScore`?

- **Option A (recommended)**: Standardize `trackRecordScore` to **0–1** across all sources; clamp/guard at module boundaries; add tests.
- **Option B**: Keep a 0–100 scale but convert to 0–1 at ingestion; still clamp/guard; update all comparisons and displays accordingly.

### Decision 3 — How to enforce budgets?

- **Option A (recommended)**: Implement two explicit checks:
  - a **global** `maxTotalIterations` counter
  - a **per-scope** `maxIterationsPerScope` counter keyed by proceeding ID
- **Option B**: Keep the current helper but call it with per-scope IDs and introduce a separate global iteration cap (do not overload “per-scope” for global).

### Decision 4 — How to make Gate1-lite influence supplemental coverage correctly?

- **Option A (recommended)**: Apply Gate1-lite **before** supplemental coverage logic runs (or provide a Gate1-lite view for counting).
- **Option B**: Refactor supplemental logic to explicitly count “eligible” claims and keep a separate “display/debug” set.

### Decision 5 — `CTX_UNSCOPED` governance

- **Option A (recommended)**: `CTX_UNSCOPED` is **display-only** and excluded from aggregation math (overall and per-scope).
- **Option B**: Keep it in math but force weight 0 (equivalent outcome; Option A is clearer).

---

## 5) Acceptance criteria (sign-off gates)

### Ground Realism
- Facts used for verdicts must be extracted from **fetched sources** (real HTTP(S) URLs) and not from snippets or model summaries.
- When grounded search cannot produce verifiable provenance, the system **fails closed** to standard search.

### Safety / math validity
- `truthPercentage` is guaranteed to remain within **0–100** under all weighting paths.
- `trackRecordScore` is guaranteed to be within **0–1** (or converted and clamped).

### Input neutrality
- Question vs statement divergence target **≤ 4 points** (avg absolute).

### Scope hygiene
- No cross-scope citation bleeding in adversarial multi-scope inputs.
- `CTX_UNSCOPED` does not influence overall verdict math.

### p95 controls
- Default budgets enforce the documented intent (e.g., 12 total iterations, 3 per scope), not accidental early termination.

