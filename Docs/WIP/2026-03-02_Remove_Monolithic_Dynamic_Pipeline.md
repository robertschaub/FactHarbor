# Remove Monolithic Dynamic Pipeline

**Date:** 2026-03-02
**Status:** APPROVED — ready for implementation
**Decision by:** Captain (solo developer)

## Rationale

The monolithic dynamic pipeline (902 lines, single-LLM-call verdict, no debate/claim extraction/boundaries) adds maintenance burden, user confusion, and pre-release risk without proportional value. ClaimBoundary is the production pipeline. Pre-release is the cleanest time to remove.

Quality gap is structural (no debate = no robustness check) — not fixable with tuning. Improving it significantly would converge it toward ClaimBoundary, eliminating the "fast path" value.

## Files to DELETE

| File | Lines | Reason |
|------|-------|--------|
| `apps/web/src/lib/analyzer/monolithic-dynamic.ts` | 902 | Main pipeline |
| `apps/web/prompts/monolithic-dynamic.prompt.md` | ~200 | UCM prompt |
| `apps/web/test/unit/lib/analyzer/prompts/monolithic-dynamic-prompt.test.ts` | 350 | Prompt tests |
| `apps/web/prompts/monolithic-canonical.prompt.md` | if exists | Orphaned prompt from already-removed pipeline |

## Files to MODIFY

| # | File | Change |
|---|------|--------|
| 1 | `src/lib/internal-runner-queue.ts` | Remove dynamic branch + import; all routes → CB |
| 2 | `src/lib/pipeline-variant.ts` | Remove `"monolithic_dynamic"` from union type |
| 3 | `src/app/analyze/page.tsx` | Remove Dynamic pipeline card; simplify to single pipeline |
| 4 | `src/app/jobs/[id]/page.tsx` | Remove dynamic-specific display branches |
| 5 | `src/app/jobs/page.tsx` | Remove Dynamic badge from `getPipelineBadge()` |
| 6 | `src/app/admin/page.tsx` | Remove dynamic pipeline option |
| 7 | `src/lib/config-schemas.ts` | Remove monolithic params + `"monolithic_dynamic"` from enums |
| 8 | `src/lib/config-storage.ts` | Remove `"monolithic-dynamic"` from `VALID_PROMPT_PROFILES` |
| 9 | `src/lib/analyzer/prompt-loader.ts` | Remove monolithic profiles |
| 10 | `src/lib/analyzer/metrics.ts` | Remove monolithic-dynamic variant |
| 11 | `src/lib/analyzer/metrics-integration.ts` | Remove dynamic references |
| 12 | `apps/api/Controllers/AnalyzeController.cs` | Valid pipelines → `["claimboundary"]`; accept `"orchestrated"` silently as legacy alias |
| 13 | `apps/web/configs/pipeline.default.json` | Remove monolithic-specific params |
| 14 | `test/integration/drain-runner-pause.integration.test.ts` | Remove `runMonolithicDynamic` mock |
| 15 | `test/unit/lib/analyzer/config-schemas.test.ts` | Update pipeline variant expectations |
| 16 | `CLAUDE.md` | Remove dynamic pipeline mention |
| 17 | `AGENTS.md` | Update pipeline variants in Current State |
| 18 | `Docs/STATUS/Current_Status.md` | Update pipeline listing |

## Backward compatibility

- **API:** Accept `"orchestrated"` and `"monolithic_dynamic"` in `pipelineVariant` without error — silently route to `claimboundary`. Old job records in DB keep their `pipelineVariant` column unchanged.
- **Job viewer:** Old dynamic results still render (keep fallback display for `resultJson` that doesn't have `claimBoundaries`).
- **UCM:** `defaultPipelineVariant` DB value may still be `"monolithic_dynamic"` — treat as `"claimboundary"`.

## What to preserve (shared infra — do NOT delete)

- `source-reliability.ts` (shared SR system)
- `evidence-filter.ts` (shared evidence filtering)
- Search/fetch infrastructure
- Metrics framework
- `prompt-loader.ts` (keep for other profiles)

## Verification

1. `grep -r "monolithic_dynamic\|monolithic-dynamic\|MonolithicDynamic\|runMonolithicDynamic" apps/ --include="*.ts" --include="*.tsx" --include="*.cs" --include="*.json"` → 0 results
2. `npm test` → all pass (test count drops ~10-15)
3. `npm -w apps/web run build` → clean
4. Old dynamic job results still viewable in UI (backward compat)
