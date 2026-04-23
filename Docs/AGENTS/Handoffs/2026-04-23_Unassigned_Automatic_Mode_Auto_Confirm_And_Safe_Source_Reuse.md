---
roles: [Unassigned]
topics: [acs, claim_selection, automatic_mode, research_acquisition, pdf_fetch, source_reuse, review]
files_touched:
  - apps/web/src/lib/internal-runner-queue.ts
  - apps/web/src/lib/analyzer/research-acquisition-stage.ts
  - apps/web/src/lib/analyzer/pipeline-utils.ts
  - apps/web/src/lib/retrieval.ts
  - apps/web/test/unit/lib/internal-runner-queue.test.ts
  - apps/web/test/unit/lib/analyzer/research-acquisition-stage.test.ts
  - apps/web/test/unit/lib/retrieval.test.ts
  - Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Automatic_Mode_Auto_Confirm_And_Safe_Source_Reuse.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-23 | Unassigned | Codex (GPT-5) | Automatic Mode Auto-Confirm And Safe Source Reuse
**Task:** Implement three runtime fixes: let `selectionMode="automatic"` auto-confirm the LLM-recommended claim set, reject empty extracted PDFs earlier, and add safe same-job source reuse for repeated exact URLs.

**Files touched:** `apps/web/src/lib/internal-runner-queue.ts`; `apps/web/src/lib/analyzer/research-acquisition-stage.ts`; `apps/web/src/lib/analyzer/pipeline-utils.ts`; `apps/web/src/lib/retrieval.ts`; `apps/web/test/unit/lib/internal-runner-queue.test.ts`; `apps/web/test/unit/lib/analyzer/research-acquisition-stage.test.ts`; `apps/web/test/unit/lib/retrieval.test.ts`; `Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Automatic_Mode_Auto_Confirm_And_Safe_Source_Reuse.md`; `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:**
- `runDraftPreparationBackground(...)` now treats automatic mode as a true non-interactive path after recommendation. When Stage 1 exceeds the auto-continue threshold but recommendation returns a non-empty recommended set, the runner immediately calls the internal draft `auto-confirm` endpoint with that set instead of persisting `AWAITING_CLAIM_SELECTION`.
- The new automatic branch is intentionally narrow: automatic mode still falls back to manual selection only when recommendation returns no safe set. The helper `getAutomaticRecommendationSelection(...)` makes that gate explicit and unit-tested.
- Empty extracted PDFs now fail early in `retrieval.ts` via `requireExtractedPdfText(...)` rather than flowing downstream as a low-content success case. `classifySourceFetchFailure(...)` now explicitly maps the empty-text message to `pdf_parse_failure`, so acquisition warnings stay in the existing diagnostics bucket.
- Same-job exact-match reuse is intentionally constrained to already-fetched document/data sources. HTML pages are still re-fetched so same-family follow-up discovery remains available per claim. When an already-known HTML URL is refetched, acquisition now refreshes the existing `FetchedSource` row in place instead of appending duplicate URL entries to `state.sources`.
- Review disposition: the first review found two real issues in the new code path (duplicate-URL coalescing kept the first score rather than the best one, and empty-PDF failures initially classified as `unknown`). Both were fixed in this slice, and the reviewer re-pass reported no remaining findings.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/internal-runner-queue.test.ts test/unit/lib/retrieval.test.ts test/unit/lib/analyzer/research-acquisition-stage.test.ts`
- `npm -w apps/web run build`

**Open items:** There is still no API-level test for `POST /internal/v1/claim-selection-drafts/{draftId}/auto-confirm`, and there is no higher-level integration test that runs a real image-only PDF through `extractTextFromUrl(...)` into acquisition diagnostics. Both are test-coverage gaps, not known product defects.

**Warnings:** This slice was applied on top of earlier uncommitted ACS/job-progress/docs changes already present in the worktree. I left those intact and limited the new code edits to the web runtime/test files listed above.

**For next agent:** If automatic mode still stops on the chooser UI, start with `apps/web/src/lib/internal-runner-queue.ts` and verify the recommended set is non-empty before the internal `auto-confirm` call. If repeated-source optimization needs to expand later, preserve the current safety boundary: document/data reuse is allowed, but HTML reuse must retain or replace follow-up discovery semantics before being widened.

**Learnings:** Safe Stage 2 reuse is narrower than it first appears. Exact URL reuse is low risk for repeated document/data artifacts, but reusing cached HTML content blindly suppresses claim-specific same-family artifact discovery.
