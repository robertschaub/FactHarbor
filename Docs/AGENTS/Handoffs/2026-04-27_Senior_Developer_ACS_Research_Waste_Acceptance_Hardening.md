---
### 2026-04-27 | Senior Developer | Codex (GPT-5) | ACS Research Waste Acceptance Hardening
**Task:** Continue after the Slices 1-2 commit by closing remaining Slice 1 acceptance gaps in shared-source attribution, byte counting, and no-source-text persistence tests.

**Files touched:**
- `apps/web/src/lib/analyzer/research-waste-metrics.ts`
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/test/unit/lib/analyzer/research-waste-metrics.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-preliminary-search-dedupe.test.ts`

**Key decisions:**
- Amended the existing `buildPreliminaryByOutcome(...)` path so preliminary evidence linked to both selected and dropped candidate IDs is counted in both non-exclusive buckets while global totals remain deduplicated.
- Changed preliminary `sourceTextByteCount` from JavaScript string length to UTF-8 byte length.
- Added focused tests for non-exclusive selected/dropped attribution, structural URL overlap by source family, selected-claim cost metrics, and no source text/excerpts in `researchWasteMetrics`.

**Open items:**
- This still does not authorize source artifact reuse or ACS budget-aware recommendation behavior. Those remain gated on real metrics review.

**Warnings:**
- The initial focused test failure was a fixture mismatch (`/utf8` search result with `/shared` mocked relevance result), not a production-code contradiction; the implementation was kept and the fixture was corrected.

**For next agent:**
- Use `research-waste-metrics.test.ts` as the local contract for Slice 1 acceptance details before changing `researchWasteMetrics` shape.

**Learnings:** No new role learning added; the prior admission-guard learning still applies.

```
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism.
Chosen option: amend the existing research-waste metrics helper and focused tests.
Rejected path and why: rejected a second attribution mechanism because `buildPreliminaryByOutcome(...)` already owns the selected/dropped/unmapped contract.
What was removed/simplified: no obsolete production code removed; the mistaken test fixture expectation was corrected after failed validation.
What was added: non-exclusive bucket attribution, UTF-8 byte counting, and acceptance tests for overlap/privacy.
Net mechanism count: unchanged for production behavior; test coverage increased.
Budget reconciliation: stayed inside Slice 1 observability; no analysis behavior, prompt, source reuse, or live-job path changed.
Verification: focused Vitest for research-waste/preliminary/prepared/URL tests, `npm -w apps/web run build`, `npm test`, and `git diff --check`.
Debt accepted and removal trigger: none.
Residual debt: live metrics review is still required before Slice 4 source-reuse design can be considered.
```
