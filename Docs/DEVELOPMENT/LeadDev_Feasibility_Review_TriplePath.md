# Lead Developer Feasibility Review Guide — Triple-Path Pipeline

**Last Updated**: 2026-01-17  
**Audience**: Lead Developer + development team  
**Purpose**: Provide a checklist and report template to evaluate feasibility, risks, and effort for implementing the Triple-Path Pipeline (UI-selectable variants).

Reference docs:
- Architecture: `Docs/ARCHITECTURE/Pipeline_TriplePath_Architecture.md`
- Migration plan: `Docs/DEVELOPMENT/Pipeline_TriplePath_Migration_Plan.md`

---

## 1) What you are reviewing

We want a **user-selectable** analysis pipeline variant with **per-job persistence**:
- `orchestrated`
- `monolithic_canonical` (must output canonical schema + reuse current UI)
- `monolithic_dynamic` (dynamic payload + separate viewer)

The goal is to add this without destabilizing the current orchestrated path.

---

## 2) Required feasibility questions (answer all)

### 2.1 Data model + API feasibility (apps/api)
- Can we add `pipelineVariant` to job creation (`v1/analyze`) without breaking existing clients?
- How will we persist `pipelineVariant` in SQLite (EF migration strategy)?
- How will we ensure existing jobs (without variant) remain readable (default to orchestrated)?

### 2.2 Runner feasibility (apps/web)
- Where will dispatch happen? (Target: `apps/web/src/app/api/internal/run-job/route.ts`)
- How will we record `pipelineVariant` and `pipelineFallback` in stored result JSON?

### 2.3 UI feasibility (apps/web)
- Can we add a selector on `apps/web/src/app/analyze/page.tsx` with minimal UI disruption?
- Can the jobs UI (`apps/web/src/app/jobs/[id]/page.tsx`) support dynamic payload rendering without breaking canonical rendering?

### 2.4 Invariants and quality gates
Confirm how each variant preserves:
- Understand → Research → Verdict ordering
- Gate1 and Gate4 presence
- `CTX_UNSCOPED` display-only (no aggregation influence) [[memory:13420326]]
- neutrality target ≤4 points avg abs on the suite
- provenance fail-closed behavior

### 2.5 Budget and tail-latency risk
- Define maxSteps for monolithic tool loop (hard cap).
- Define max searches/fetches and timeouts.
- Define behavior on budget exceed: fallback vs degrade-confidence vs fail job.

### 2.6 Dynamic payload safety contract
Confirm the minimum contract can be enforced:
- `citations[]` with `url` + `excerpt`
- `rawJson` always stored
- “dynamic/experimental” labeling in UI

---

## 3) Code review targets (where to look)

### Web UI
- `apps/web/src/app/analyze/page.tsx` (submit payload changes)
- `apps/web/src/app/jobs/[id]/page.tsx` (dynamic viewer addition)

### Web API routes (proxy)
- `apps/web/src/app/api/fh/analyze/route.ts` (payload forward)

### Web runner
- `apps/web/src/app/api/internal/run-job/route.ts` (dispatch by job.pipelineVariant)
- `apps/web/src/lib/analyzer.ts` (current orchestrated pipeline)
- `apps/web/src/lib/analyzer/config.ts` (existing config surface)

### API service
- `apps/api/Controllers/AnalyzeController.cs` (job creation request)
- `apps/api/Controllers/JobsController.cs` (job read shape; confirm result JSON storage)
- `apps/api/Data/FhDbContext.cs` + migrations (job schema extension)

---

## 4) Feasibility report template (fill this in)

### 4.1 Summary
- **Feasibility**: Green / Yellow / Red
- **Estimated effort**: S / M / L (with rough days)
- **Primary risks**: (top 3)

### 4.2 Proposed implementation sequence (PRs)
List PRs that align to the migration plan phases, with rough scope/estimate.

### 4.3 Data model/API changes
- Proposed DB changes:
- Backward compatibility plan:
- Migration notes:

### 4.4 Runner + dispatch design
- Dispatch location:
- Fallback behavior:
- Result envelope metadata:

### 4.5 UI design
- Analyze page selector design:
- Jobs page dynamic viewer design:
- User-facing warnings/labels:

### 4.6 Invariant verification plan
- Which tests prove neutrality/scopes/provenance/budgets remain intact?
- Any missing tests to add?

### 4.7 Go/No-Go gates for rollout
- Staging gates:
- Metrics to monitor:
- Rollback plan:

---

## 5) Reviewer checklist (sign-off)

- [ ] Per-job pipelineVariant persistence is implemented (no global drift)
- [ ] Orchestrated pipeline logic unchanged except low-risk wrappers
- [ ] Monolithic canonical has strict validation + fail-closed fallback
- [ ] Monolithic dynamic meets minimum safety contract + clear labeling
- [ ] Budgets/caps are enforced and recorded in results
- [ ] Neutrality target and scope isolation tests cover all variants

