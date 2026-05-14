---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2F Validation Matrix Compatibility
**Task:** Continue V2 read compatibility by updating the older `scripts/run-validation-matrix.js` metrics extraction path.

**Files touched:**
- `scripts/run-validation-matrix.js`
- `apps/web/test/unit/scripts/validation-matrix.test.ts`

**Key decisions:**
- The matrix runner remains a standalone CommonJS script and can now be safely imported by tests without executing CLI startup, health checks, or file writes.
- V2 result metrics are schema-gated and read canonical `verdict.truthPercentage`, `verdict.confidence`, and `verdict.label`.
- V2 sources come from canonical `sources.items`; for matrix metrics, V2 `fetchedSources` is counted as `sources.items.length` because canonical V2 fixture sources represent included acquired sources and do not carry the legacy `fetchSuccess` flag.
- V2 warnings are normalized from `warnings[]` with `message || materialityRationale`, while preserving canonical severity.
- Legacy V1 and unknown/raw results keep the old `verdictSummary`, `analysisContexts`, `sources[].fetchSuccess`, and `analysisWarnings` paths.

**Open items:**
- No live validation matrix was run.
- The old script still reports `pipeline: "orchestrated"` in output rows. That was deliberately not changed in this compatibility slice because it is output-format history, not a V2 read blocker.
- Remaining result-reader surfaces should be checked separately, especially admin metrics/quality-health paths that may read persisted result payloads outside the API quick-field helper.

**Warnings:**
- This is a narrow compatibility reader, not a recommendation to use the 25-run matrix routinely. It submits live jobs and remains expensive.
- If V2 later adds explicit per-source acquisition status, revisit the `fetchedSources` mapping instead of inferring all included canonical sources as fetched.

**For next agent:**
- Workspace: `C:\DEV\FactHarbor`. Git branch: `main`.
- Verification passed:
  - `npm -w apps/web test -- --run test/unit/scripts/validation-matrix.test.ts` (3 tests)
  - `node --check scripts/run-validation-matrix.js`
  - `node -e "require('./scripts/run-validation-matrix.js'); console.log('import-ok')"`
  - hot-path/API/prompt diff guard
  - `npm -w apps/web run build`
  - `npm test`
  - `git diff --check`
- Continue with the next non-hot-path persisted-result reader. Do not run live validation or touch analyzer runtime/prompt/config without a separate reviewed slice.

**Learnings:** Not appended to `Role_Learnings.md`; no durable role-level learning beyond this slice handoff.
