# P0 Fallback Strategy - Code Review

**Status:** IN_REVIEW
**Created:** 2026-02-03
**Last Updated:** 2026-02-03
**Author Role:** Senior Developer

---

## Context
Code review for the P0 Fallback Strategy implementation. Focus: correctness, transparency, and the explicit requirement of **no pattern-based intelligence** in fallbacks (null-checking + safe defaults only). Validate orchestrated pipeline integration, safe defaults, reporting/UI, and test coverage.

## References
- `Docs/WIP/P0_Implementation_Status.md`
- `Docs/WIP/Post-Migration_Robustness_Proposals.md`
- `Docs/WIP/P2_Classification_Monitoring_Backlog.md`
- `AGENTS.md`
- `Docs/REFERENCE/TERMINOLOGY.md`
- `Docs/DEVELOPMENT/Coding_Guidelines.md`
- `Docs/ARCHITECTURE/Overview.md`
- `Docs/ARCHITECTURE/Pipeline_TriplePath_Architecture.md`
- `Docs/DEVELOPMENT/TESTING_STRATEGY.md`
- `Docs/USER_GUIDES/Promptfoo_Testing.md`
- `Docs/USER_GUIDES/Unified_Config_Management.md`
- `Docs/USER_GUIDES/UCM_Administrator_Handbook.md`

---

## Review: Senior Developer - 2026-02-03

**Overall Assessment:** REQUEST_CHANGES

### Findings (ordered by severity)

1) **[BLOCKING] Fallbacks are silently applied by lenient Zod `.catch()` and never recorded**
- **Why it matters:** Requirement says fallbacks must be transparently reported. When `.catch()` populates defaults, the fallback tracker never sees the invalid/missing values, so `classificationFallbacks` underreports failures.
- **Evidence:**
  - `apps/web/src/lib/analyzer/orchestrated.ts:2926` (`SUBCLAIM_SCHEMA_LENIENT` uses `.catch("medium")` for `harmPotential`, etc.)
  - `apps/web/src/lib/analyzer/orchestrated.ts:6594` (`KEY_FACTOR_SCHEMA_LENIENT` uses `.catch("unknown")` for `factualBasis` and `.catch(false)` for `isContested`)
  - Similar `.catch()` defaults exist in other lenient verdict schemas used on recovery.
- **Impact:** LLM failures during structured output recovery are not visible in fallback summaries, violating transparency.
- **Recommendation:**
  - Option A: Remove `.catch()` for the 5 tracked fields and let normalization functions apply defaults + record fallbacks.
  - Option B: Keep lenient parse but explicitly record fallback events when `.catch()` is invoked (requires parse wrapper that detects which fields were defaulted).

2) **[MAJOR] Fallback reporting not surfaced in UI/markdown**
- **Why it matters:** The requirement is “transparent reporting in analysis results.” Currently only the raw JSON contains `classificationFallbacks`; the UI/report does not show it.
- **Evidence:**
  - `apps/web/src/lib/analyzer/format-fallback-report.ts` is unused.
  - `apps/web/src/components/FallbackReport.tsx` is unused.
  - Only reference to `classificationFallbacks` is in result JSON (`apps/web/src/lib/analyzer/orchestrated.ts:10561`).
- **Impact:** Users who rely on the UI or report never see fallback warnings unless they inspect raw JSON.
- **Recommendation:**
  - Add the markdown section to report generation (use `formatFallbackReportMarkdown`).
  - Render `FallbackReport` in the jobs UI when `classificationFallbacks` exists.

3) **[MAJOR] Test command requested in task fails; targeted tests not executed**
- **Evidence:**
  - `npm -w apps/web run test -- --filter classification-fallbacks` fails: Vitest doesn’t support `--filter`.
  - `npm -w apps/web run test -- -t classification-fallbacks` executes but skips the fallback tests (name filter doesn’t match) and fails on unrelated test: `test/analyzer/text-analysis-service.test.ts` (`HeuristicTextAnalysisService is not a constructor`).
- **Impact:** Cannot confirm fallback tests via requested command; test suite has a pre‑existing failure unrelated to P0.
- **Recommendation:**
  - Update test instructions to a supported pattern (e.g., `npm -w apps/web run test -- test/unit/lib/analyzer/classification-fallbacks.test.ts`).
  - Fix or quarantine the failing `text-analysis-service` test to allow targeted runs.

4) **[MINOR] Dead code: fallback helper functions are unused**
- **Evidence:**
  - `apps/web/src/lib/analyzer/orchestrated.ts:157-300` defines `get*WithFallback()` but no references exist.
- **Impact:** Increases maintenance risk (defaults/logic can drift from actual normalization path).
- **Recommendation:** Remove or refactor normalization to use these helpers.

5) **[MINOR] `llm_error` reason is unhandled in formatting**
- **Evidence:**
  - `ClassificationFallback.reason` includes `llm_error`, but formatters only distinguish `missing` vs `invalid`.
- **Impact:** If `llm_error` is ever used, UI/markdown will mislabel it as “invalid”.
- **Recommendation:** Add explicit handling for `llm_error` in `format-fallback-report.ts` and `FallbackReport.tsx`.

### Integration Review (Orchestrated Pipeline)
- ✅ `FallbackTracker` initialized at analysis start (`orchestrated.ts:9640`).
- ✅ Claim normalization after UNDERSTAND (`orchestrated.ts:9913`).
- ✅ Evidence normalization before verdict generation (`orchestrated.ts:10388`).
- ✅ KeyFactor normalization after verdict generation (`orchestrated.ts:10408`).
- ✅ Final verification before result build (`orchestrated.ts:10466`).
- ✅ `classificationFallbacks` attached to result JSON (`orchestrated.ts:10561`).

### Safe Defaults Review
- ✅ Defaults align with the stated rationale:
  - `harmPotential = "medium"`
  - `factualBasis = "unknown"`
  - `isContested = false`
  - `sourceAuthority = "secondary"`
  - `evidenceBasis = "anecdotal"`
- ✅ Defaults are documented in P0 status doc and in `verifyFinalClassifications` comments.

### Test Coverage Review
- ✅ Unit tests cover `FallbackTracker` behavior and safe defaults.
- ⚠️ No tests cover normalization functions or pipeline integration (`normalize*` and `verifyFinalClassifications`).
- ⚠️ Test command for focused run is not viable as written; unrelated test failure blocks targeted verification.

### Pattern-Based Intelligence Check
- ✅ Fallback logic itself is pure null/validity checking (no regex/lexicon usage).
- ⚠️ Pattern-based heuristics still exist in other pipeline areas (e.g., `isExternalReactionClaim`), but they are not part of fallback strategy.

### Build & Test Verification
- ✅ Build: `npm -w apps/web run build` (success)
- ❌ Tests: `npm -w apps/web run test -- --filter classification-fallbacks` failed (unsupported flag)
- ❌ Tests: `npm -w apps/web run test -- -t classification-fallbacks` failed due to unrelated `HeuristicTextAnalysisService` test error and skipped fallback tests

---

## Open Questions / Assumptions
1) Should transparency require UI/report surfacing (not just JSON)? If yes, the unused formatter/UI must be wired in.
2) Are lenient `.catch()` defaults allowed to be silent, or should they be tracked as fallbacks?
3) Is the failing `HeuristicTextAnalysisService` test expected to be removed/updated post‑lexicon cleanup?

---

## Review Log

| Date | Reviewer Role | Status | Comments |
|------|---------------|--------|----------|
| 2026-02-03 | Senior Developer | REQUEST_CHANGES | See findings above (fallback tracking gaps, reporting not surfaced, test command failure). |

---

## Decision Record
**Decision:** REQUEST_CHANGES

**Required fixes before sign‑off:**
1) Ensure fallback events from lenient parsing are tracked and reported.
2) Surface fallback summary in UI/report (or explicitly document that JSON-only is acceptable).
3) Fix test invocation or suite so fallback tests can be executed cleanly.

**Recommended (non-blocking):**
- Remove unused `get*WithFallback()` helpers or refactor normalization to use them.
- Add explicit `llm_error` handling in report/UI formatting.

