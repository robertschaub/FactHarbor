# Triple-Path Pipeline — Migration Plan (Current → Desired)

**Last Updated**: 2026-01-17  
**Audience**: Lead Developers, Architects  
**Purpose**: Define a low-risk, execution-ready path from the current `OrchestratedPipeline` to the desired triple-path architecture, while minimizing side effects on the current path.

Companion architecture doc:
- `Docs/ARCHITECTURE/Pipeline_TriplePath_Architecture.md`

---

## 0) Definition of success (acceptance gates)

### Functional
- Users can select **one of three variants** on the Analyze page.
- Each job persists `pipelineVariant` and is executed consistently by the runner.

### Safety / governance
- `OrchestratedPipeline` behavior stays unchanged except for low-risk shared wrappers.
- Budgets are enforced for monolithic variants (maxSteps, maxSources, timeouts).
- Provenance rules are enforced (no synthetic evidence).
- `CTX_UNSCOPED` remains display-only and excluded from overall verdict aggregation.

### Quality metrics (evaluation)
- Input neutrality divergence (Q vs S): **≤ 4 points avg absolute** on the fixed suite.
- Multi-scope isolation: adversarial scope-leak suite passes.
- p95 latency does not regress beyond agreed budget.

---

## 1) Phase 1 — Per-job selection + persistence (minimal surface area)

### 1.1 UI: add variant selector to Analyze page
Target:
- `apps/web/src/app/analyze/page.tsx`

Behavior:
- Add a selector with:
  - `OrchestratedPipeline (default)`
  - `MonolithicToolLoop (canonical schema)`
  - `MonolithicToolLoop (dynamic schema)`
- Submit payload includes `pipelineVariant`.

### 1.2 API: accept pipelineVariant when creating job
Targets:
- `apps/web/src/app/api/fh/analyze/route.ts` (proxy to API)
- `apps/api/Controllers/AnalyzeController.cs` (job creation request)
- `apps/api/Data/*` (DB schema changes)

Change:
- Extend create-job request to include `pipelineVariant`.
- Persist on job record.

**DB migration caution**: do not overwrite `apps/api/factharbor.db` in-repo. Add an EF migration and let local dev DB update.

---

## 2) Phase 2 — Runner dispatch (thin boundary, no behavior change)

Target:
- `apps/web/src/app/api/internal/run-job/route.ts`

Change:
- Runner reads the job (already does) and dispatches by `job.pipelineVariant`.
- Initially, the two monolithic variants may be wired to “not implemented” and fail closed to orchestrated (to keep Phase 2 low-risk).

Persist into result envelope:
- `pipelineVariant`
- `pipelineFallback` (boolean + reason) when a monolithic variant falls back to orchestrated

---

## 3) Phase 3 — Implement MonolithicToolLoop_CanonicalSchema

Goal:
- Tool-loop pipeline that outputs canonical schema (existing UI).

Approach:
- Implement in a separate module (do not embed into `analyzer.ts`):
  - `apps/web/src/lib/analyzer/monolithic-canonical.ts` (suggested)
- Use AI SDK tool calling with strict caps:
  - `maxSteps` (hard limit)
  - max searches, max fetches, timeouts
  - budget stats recorded in envelope

Validation / fail-closed:
- Validate schema + critical semantic constraints:
  - canonical schema shape
  - provenance requirements for cited facts
  - scope mapping correctness (or explicit UNSCOPED)
- On failure: fall back to `OrchestratedPipeline` and record `pipelineFallback=true`.

---

## 4) Phase 4 — Implement MonolithicToolLoop_DynamicSchema + dynamic viewer

Goal:
- Allow flexible model-defined structure without breaking the canonical UI.

Approach:
- Implement in a separate module:
  - `apps/web/src/lib/analyzer/monolithic-dynamic.ts` (suggested)
- Enforce minimum dynamic safety contract (architecture doc §4.3).

UI:
- Update `apps/web/src/app/jobs/[id]/page.tsx` to detect `pipelineVariant === "monolithic_dynamic"` and render:
  - narrative markdown (if present)
  - citations list (required)
  - raw JSON viewer
  - tool trace viewer (optional)

Labeling:
- Clearly label the output as “Dynamic/experimental structure.”

---

## 5) Phase 5 — Evaluation and decision

### 5.1 Evaluation harness
Run the same fixed suite across variants:
- neutrality pairs
- adversarial scope leak
- representative multi-scope workloads

Metrics to report per variant:
- neutrality divergence distribution (avg/median/p95)
- scope isolation pass/fail
- provenance rejection rate
- budget exceeded rate
- p95 latency
- cost proxies (tokens/calls if available)

### 5.2 Decision policy
Decide one of:
- keep all three variants (with clear user-facing constraints)
- keep orchestrated + monolithic canonical only
- restrict monolithic variants to internal evaluation

---

## 6) Risks and guardrails (implementation-level)

- **Do not refactor `apps/web/src/lib/analyzer.ts` to “share orchestration”**. Share only wrappers/adapters.
- Treat dynamic schema as additive UI only; never allow it to silently flow into canonical verdict math.
- Ensure per-job persistence of variant; avoid global runtime-only switching.

