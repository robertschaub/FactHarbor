---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2E Validation Summary Compatibility
**Task:** Continue V2 read compatibility by updating the validation batch summary extractor used by `npm run validate:run`.

**Files touched:**
- `scripts/validation/extract-validation-summary.js`
- `apps/web/test/unit/scripts/validation-summary.test.ts`

**Key decisions:**
- The validation extractor remains a standalone CommonJS script so `node scripts/validation/extract-validation-summary.js ...` does not depend on TS transpilation, Next aliases, or web runtime modules.
- V2 summary extraction is schema-gated and reads canonical `verdict.label`, `verdict.truthPercentage`, and `verdict.confidence`.
- V2 claim summaries use adapter fallback `compatibility.v1.fallbackFields.claimVerdicts` plus canonical `claims.atomicClaims[].statement`; absent fallback claim verdicts yield an empty claim list without crashing.
- V2 quality-gate summary fields intentionally read `compatibility.v1.fallbackFields.qualityGates`, because canonical V2 `qualityGates` are not shape-compatible with the current validation summary format.
- V2 warnings use canonical `severity` for counts and `message || materialityRationale` only as readable normalized message data.
- Legacy V1 and unknown/raw historical batch summaries keep the old raw top-level result behavior, including the old claim-statement fallback for non-V2 results.
- Deputy reviewer `Lorentz` approved the standalone helper approach and requested the V1/unknown fallback correction plus fixture drift tests; both were completed before final verification.

**Open items:**
- `scripts/validation/compare-batches.js` consumes generated summary JSON only and was not changed.
- Remaining read-compatibility consumers still to inspect include model/quality metrics surfaces and any admin-only report diagnostics that read stored result JSON directly.
- No live validation batch was run.

**Warnings:**
- This script duplicates a very small structural schema reader instead of importing the TS adapter. Keep it small and fixture-pinned; do not let it grow into an alternate result model.
- If the validation summary format changes later, update both V2 fallback expectations and comparison scripts together.

**For next agent:**
- Worktree: `C:\DEV\FactHarbor-pipeline-rebuild-spec`, branch `codex/pipeline-rebuild-spec`.
- Verification passed:
  - `npm -w apps/web test -- --run test/unit/scripts/validation-summary.test.ts` (4 tests)
  - `node --check scripts/validation/extract-validation-summary.js`
  - `node -e "require('./scripts/validation/extract-validation-summary.js'); console.log('import-ok')"`
  - hot-path/API/prompt diff guard
  - `npm -w apps/web run build`
  - `npm test`
  - `git diff --check`
- Continue with the next external result-reader surface only; do not touch V1 analyzer source, prompts, config, UI, API, or live validation without a separate reviewed slice.

**Learnings:** Not appended to `Role_Learnings.md`; no durable role-level learning beyond this slice handoff.
