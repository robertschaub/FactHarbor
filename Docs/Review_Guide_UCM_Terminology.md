# Reviewer Guide - UCM + Terminology Cleanup

Date: 2026-02-02
Scope: Unified Config Management changes + Context/EvidenceScope terminology cleanup

## Review Goals
- Confirm UCM is the single source of truth for analysis config.
- Verify SR config is kept separate (SR service domain).
- Ensure terminology uses Context for AnalysisContext and evidenceScope for source metadata.
- Confirm behavior matches pre-UCM defaults (no regression).
- Check for accidental hardcoding of terms, prompts, or test-case artifacts.
- Note: Historical review docs moved to `Docs/ARCHIVE/REVIEWS` for reference.

---

## Key Areas to Review

### 1) Pipeline config source of truth
Files:
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/src/lib/analyzer/llm.ts`
- `apps/web/src/lib/analyzer/orchestrated.ts`
- `apps/web/src/lib/analyzer/monolithic-canonical.ts`
- `apps/web/src/lib/analyzer/monolithic-dynamic.ts`
- `apps/web/src/lib/analyzer/text-analysis-llm.ts`
- `apps/web/src/lib/analyzer/text-analysis-service.ts`

Checks:
- `pipeline.llmProvider` exists and defaults match prior hardcoded behavior.
- Provider selection does not read `process.env.LLM_PROVIDER`.
- Model routing honors pipeline config and tiering settings.
- Errors/warnings correctly describe provider mismatch.

### 2) SR config separation
Files:
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/src/lib/source-reliability-config.ts`
- `apps/web/src/lib/analyzer/source-reliability.ts`
- `apps/web/src/app/api/internal/evaluate-source/route.ts`
- `apps/web/src/lib/config-snapshots.ts`

Checks:
- SR config is retrieved via `getConfig("sr")`, not via pipeline config.
- `/api/internal/evaluate-source` uses SR config for eval search behavior.
- Job snapshots only store SR summary, not full SR config.

### 3) Terminology cleanup: Context vs EvidenceScope
Files:
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/src/app/admin/config/page.tsx`
- Any prompt or UI text in analyzer or admin UI

Checks:
- New keys use `context*` (e.g., `contextDedupThreshold`).
- Legacy `scope*` keys are supported only for backward compatibility.
- UI labels say "Context" (not "Scope") except for evidenceScope metadata.

### 4) Default config seeding
Files:
- `apps/web/src/lib/config-storage.ts`

Checks:
- Defaults seeded if missing.
- System defaults refresh if schema defaults changed and active config was system default.

### 5) API health/test-config tooling
Files:
- `apps/web/src/app/api/health/route.ts`
- `apps/web/src/app/api/admin/test-config/route.ts`
- `apps/web/src/app/admin/test-config/page.tsx`

Checks:
- Health reports provider from UCM pipeline config.
- Test-config prompts mention UCM instead of envs.

### 6) Documentation alignment
Files:
- `Docs/ARCHITECTURE/Source_Reliability.md`
- `Docs/USER_GUIDES/LLM_Configuration.md`
- `Docs/USER_GUIDES/Unified_Config_Management.md`
- `Docs/USER_GUIDES/Admin_Interface.md`
- `Docs/ARCHITECTURE/Overview.md`
- `Docs/ARCHITECTURE/Calculations.md`

Checks:
- Env references removed where UCM applies.
- SR config documented as separate UCM domain.
- No Context/Scope confusion.

---

## Regression Risks / Focus Points
- LLM provider switching: ensure runtime uses correct provider after UCM change.
- Grounded search availability: only when provider is Google/Gemini.
- SR evaluation search: ensure SR eval settings take effect (search pack building).
- Legacy compatibility: existing configs using `scope*` still function.

---

## Suggested Review Flow
1) Verify config schemas and defaults.
2) Trace analyzer config loading path (getAnalyzerConfig -> pipeline/search/calc + SR).
3) Check SR integration and evaluate-source endpoint.
4) Review admin UI for terminology changes and new fields.
5) Confirm docs align with new behavior.

---

## Optional Test Plan
- `npm -w apps/web run build`
- `npm -w apps/web test -- test/unit/lib/analyzer/llm-routing.test.ts`
- `npm -w apps/web test -- test/unit/lib/llm-integration.test.ts`

---

End of reviewer guide.
