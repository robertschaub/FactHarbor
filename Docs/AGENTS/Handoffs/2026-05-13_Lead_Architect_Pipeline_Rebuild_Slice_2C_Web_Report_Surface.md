---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2C Web Report Surface
**Task:** Continue Slice 2 by wiring the web job detail/report and HTML export surfaces to the analyzer-v2 compatibility view without changing the V1 analyzer hot path.

**Files touched:** `apps/web/src/lib/analyzer-v2/compatibility-view.ts`, `apps/web/src/app/jobs/[id]/page.tsx`, `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts`, `apps/web/test/unit/lib/analyzer-v2/compatibility-view.test.ts`, `apps/web/test/unit/app/jobs/[id]/utils/generateHtmlReport.test.ts`.

**Key decisions:** The job detail page now keeps raw stored JSON for the JSON tab, but uses `toLegacyReportSurfaceModel` for V2 report rendering/export. V2 schema 4 results pass the existing report-data gate and ClaimAssessmentBoundary UI gate. The compatibility adapter maps V2 coverage matrix rows/columns/cells to the legacy `{ claims, boundaries, counts }` shape and preserves original `meta` fields. The HTML exporter now prefers top-level canonical `result.verdict` for report-level metadata/banner and treats numeric per-claim `verdict` as a score, not a string label.

**Open items:** UI behavior was verified by TypeScript build and fixture-backed export tests, not by browser screenshot/manual page rendering. Remaining surfaces still pending: markdown report generation, metrics/calibration/validation readers, and any admin quality-report consumers.

**Warnings:** Do not replace the adapter with V2-specific UI branches unless a fixture proves the legacy surface cannot represent a needed field. The HTML exporter still has older internal `verdictFromPct` thresholds; this slice only prevented V2 from depending on that path for canonical top-level labels.

**For next agent:** Continue with metrics/calibration/validation readers or markdown generation one surface at a time. Reuse `toResultCompatibilityView`/`toLegacyReportSurfaceModel`; do not duplicate schema detection or verdict-label derivation.

**Learnings:** No Role_Learnings update; this is implementation-specific compatibility work.

```text
DEBT-GUARD RESULT
Classification: failed-attempt recovery; incomplete-existing-mechanism in HTML exporter.
Chosen option: amend existing exporter verdict selection.
Rejected path and why: reverting V2 page/export wiring would discard valid adapter progress; adding a second V2 exporter would duplicate mechanisms.
What was removed/simplified: no code removed; numeric per-claim verdicts are now excluded from string-label paths.
What was added: fixture-backed V2 HTML export test and V2 coverage-matrix mapping in the compatibility adapter.
Net mechanism count: unchanged for exporter; adapter capability broadened within the existing compatibility mechanism.
Budget reconciliation: actual diff stayed within expected web report/export surface; no new flags, retries, or parallel export path.
Verification: focused V2 adapter/export tests, web build, full safe web test, hot-path diff guard, git diff --check.
Debt accepted and removal trigger: static exporter still has legacy fallback threshold logic; remove or centralize when static export is fully contract-tested against V2/V1 fixtures.
Residual debt: browser rendering was not screenshot-tested in this slice.
```
