# Start Pipeline Redesign Implementation

**Document**: `Docs/DEVELOPMENT/Start_Pipeline_Redesign_Implementation.md`  
**Scope**: Implementation entry instructions for the Pipeline Redesign (Option D: Code-Orchestrated Native Research)  
**Primary Plan**: `Docs/DEVELOPMENT/Pipeline_Redesign_Plan_2026-01-16.md`  
**Reviewer Guide**: `Docs/DEVELOPMENT/Plan_Review_Guide_2026-01-16.md`

---

## Non‑negotiable invariants (read first)

From `AGENTS.md`:
- **Pipeline Integrity**: Always run **Understand → Research → Verdict**. No stage skipping.
- **Evidence transparency**: Verdicts must cite evidence; evidence must be attributable.
- **Input neutrality**: Question vs statement forms must follow the same analysis path; divergence target ≤ 4 points (percentage points, avg absolute).
- **Generic by design**: No domain-specific keyword lists or topic hardcoding.

From the Ground Realism audit:
- **No synthetic evidence**: Do not treat any LLM synthesis (including “grounded responses”) as evidence for verdicts.
- **Fail closed**: If grounded/native research cannot provide real sources with provenance, fall back to standard search.
- **p95 matters**: Design to bound tail latency on multi-scope workloads.

---

## Quick start (dev environment)

From repo root:

1. **First run (installs + validates)**:
   - `powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1`

2. **Restart services cleanly**:
   - `.\scripts\restart-clean.ps1`

3. **Run web app**:
   - `cd apps/web; npm run dev`

4. **Run API** (optional if you’re only changing analyzer behavior first):
   - `cd apps/api; dotnet watch run`

---

## Where to implement first (Phase 0: Ground Realism Gate)

### Goal
Make “grounded/native research” **provably provenance-safe**:
- Facts used for verdicts must come from **fetched sources** (real URLs/documents), with stable `sourceUrl` and `sourceExcerpt`.
- If grounding metadata/citations are missing, **do not pretend research happened** — fall back to external search providers.

### Primary files
- `apps/web/src/lib/search-gemini-grounded.ts`
- `apps/web/src/lib/analyzer.ts`
- `apps/web/src/lib/web-search.ts` (external providers adapter; for fallback path)

### Definition of Done (Phase 0)
- [ ] Grounded mode does **not** feed LLM synthesis text into fact extraction as evidence
- [ ] Grounded mode produces **real candidate URLs** and uses the existing fetch → extract pipeline
- [ ] If grounding metadata is absent, grounded mode **falls back** to standard search and logs why
- [ ] Add one regression fixture for an adversarial multi-scope input (see below)
- [ ] Document the behavior in `Docs/USER_GUIDES/LLM_Configuration.md`

---

## Day 0 audits (required before deterministic scope IDs)

The feasibility audit identified a small set of files that can silently break if scope IDs change format. Before implementing deterministic/hashes IDs, audit these and record findings:

- [ ] `apps/web/src/lib/analyzer/verdict-corrections.ts` (look for scope ID string matching like `includes("TSE")` or `startsWith("CTX_")`)
- [ ] `apps/web/src/lib/claim-importance.ts` (confirm it is ID-agnostic)
- [ ] `apps/web/src/app/jobs/[id]/page.tsx` (locate and verify any `normalizeScopeKey()` / scope key assumptions)
- [ ] Grep repo-wide for `CTX_` hardcoding and remove/replace any assumptions
- [ ] `apps/web/src/lib/search-gemini-grounded.ts` (confirm provenance: real URLs/citations, and fail-closed fallback)

---

## Required stress test (adversarial scope leak)

Run this input as both **question** and **statement** forms (Input Neutrality).

**Adversarial input**:

> Two legal scopes share confusing identifiers.  
> Scope A: Supreme Court of Country A, Case 2024-017, about whether Policy P violates Statute S.  
> Scope B: Supreme Court of Country B, Case 2024-017, about whether Policy P complies with Statute S.  
> Some articles abbreviate both courts as “SC” and merge the stories.  
> Task: Analyze Scope A and Scope B separately. For each scope, list the controlling decision, date, holding, and only the evidence that belongs to that scope. If evidence is ambiguous, place it in CTX_UNSCOPED/General and do not let it affect either scope’s verdict.

**Pass criteria**:
- No cross-scope citations (Scope A verdict must not cite Scope B facts and vice versa)
- Ambiguous evidence is placed into `CTX_UNSCOPED` and excluded from aggregation
- p95 research latency stays within the defined budget (set a target before measuring)

---

## Implementation sequencing (recommended PR order)

### PR 1 — Grounded search provenance gate (small, reviewable)
- Remove/disable any “synthetic source” path that turns an LLM synthesis into a `FetchedSource` used for verdicting
- Ensure grounded mode either:
  - yields real URLs and proceeds with fetch/extract, or
  - falls back to standard search
- Add logging/events so the UI shows what path was taken

### PR 2 — Research budgets + bounded parallelism (p95 controls)
- Add explicit timeouts and caps per scope and per job
- Use bounded concurrency for multi-scope workloads
- Ensure partial results degrade confidence (Gate 4), not silently “complete”

### PR 3 — Semantic validation of Structured Fact Buffer
- Add deterministic validators before verdicting:
  - provenance present (`sourceUrl`, non-trivial excerpt)
  - `relatedProceedingId` maps to known scopes or `CTX_UNSCOPED`
  - disallow “synthetic-only evidence” for verdict aggregation
- Fail closed: if validation fails, return “insufficient evidence” rather than fabricated confidence

---

## Notes (avoid common traps)

- **Don’t rely on DB schema to catch drift**: the API stores `ResultJson` as a blob; validation must happen in the analyzer.
- **Avoid domain keyword rules**: if you need taxonomy/labels, prefer model-provided metadata + deterministic normalization, or config-driven taxonomy.
- **Measure p95, not averages**: multi-scope cases are the rollout killers.

