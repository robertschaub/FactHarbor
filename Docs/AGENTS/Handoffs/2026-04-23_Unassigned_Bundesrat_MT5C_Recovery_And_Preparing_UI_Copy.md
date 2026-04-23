---
roles: [Unassigned]
topics: [stage1, claim_extraction, bundesrat, mt5c, multi_event_reprompt, salience_commitment, jobs_ui, claim_selection]
files_touched:
  - apps/web/src/lib/analyzer/claim-extraction-stage.ts
  - apps/web/src/app/analyze/select/[draftId]/page.tsx
  - apps/web/src/app/analyze/select/[draftId]/page-helpers.ts
  - apps/web/test/unit/lib/analyzer/claim-extraction-multi-event.test.ts
  - apps/web/test/unit/app/analyze/select/page-helpers.test.ts
  - Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Bundesrat_MT5C_Recovery_And_Preparing_UI_Copy.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-23 | Unassigned | Codex (GPT-5) | Bundesrat MT-5(C) Recovery And Preparing UI Copy
**Task:** Investigate why the Captain-defined Bundesrat input `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` recently under-split to a single Stage 1 claim, fix the regression, and stop the `/analyze/select/[draftId]` screen from presenting `PREPARING` as an atomic-claim-selection step.

**Files touched:** `apps/web/src/lib/analyzer/claim-extraction-stage.ts`; `apps/web/src/app/analyze/select/[draftId]/page.tsx`; `apps/web/src/app/analyze/select/[draftId]/page-helpers.ts`; `apps/web/test/unit/lib/analyzer/claim-extraction-multi-event.test.ts`; `apps/web/test/unit/app/analyze/select/page-helpers.test.ts`; `Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Bundesrat_MT5C_Recovery_And_Preparing_UI_Copy.md`; `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** The ACS code path was not the cause. Draft `051b371bd0b9443e861a5a508150b2bc` already skipped recommendation (`recommendationMs = null`) and auto-continued with one surviving claim. The actual regression sat inside Stage 1. Historical DB comparison showed the same input oscillating between `2` and `1` claims across runs, with the current bad runs still having `distinctEvents >= 4`, successful salience commitment, and a contract-approved single claim. The live Next log then identified the concrete blocking branch:
- `[Stage1] Post-Gate-1 claim count (1) < minimum (2), but the current claim set is contract-approved (C14). Skipping reprompt loop.`
- `[Stage1] MT-5(C): 4 distinct events detected but the surviving 1-claim set is contract-approved (C14 applied to MT-5(C)). Skipping multi-event reprompt.`

That traces the regression to the older `d16862e3` change (`fix(extraction): extend C14 contract-approved skip to MT-5(C) reprompt`). The intent of that commit was valid — prevent anchor loss from unsafe multi-event retries — but the blanket skip became too strong once single-claim atomicity remained probabilistic and occasionally blessed a bundled Bundesrat claim. I fixed this by making the MT-5(C) exception *safe* instead of disabled:
- `shouldRunMultiEventReprompt(...)` now keeps the old contract-approved skip by default, but reopens MT-5(C) when a trustworthy salience inventory exists.
- Contract-approved one-claim sets now retry MT-5(C) only under binding salience mode.
- The expanded MT-5(C) candidate set must pass a fresh claim-contract revalidation before it is accepted. If revalidation fails or comes back unusable, Stage 1 keeps the existing contract-approved single-claim set.

This preserves the original d16862e3 safety goal while restoring a recovery path for structurally obvious multi-event collapse.

For the UI, I accepted the product framing issue as separate from the Stage 1 bug. `/analyze/select/[draftId]` was doing double duty as both preparation monitor and real selection screen, but always carried the `Atomic Claim Selection` title. I moved the wording into `page-helpers.ts` and now use:
- `Preparing Analysis` while the session is queued/preparing or auto-continuing
- `Atomic Claim Selection` only when manual selection is actually required

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer/claim-extraction-multi-event.test.ts test/unit/app/analyze/select/page-helpers.test.ts`
- `npm -w apps/web run build`
- `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts -t "multi-event reprompt"`
- `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts -t "contract-approved"`

**Open items:** This fix restores the *safe* MT-5(C) recovery path, but it does not remove the underlying nondeterminism in single-claim atomicity judgments. If Bundesrat-class inputs still wobble, inspect `CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION` next; the live failure here was that the atomicity challenge did not force decomposition even though `distinctEvents` remained high.

**Warnings:** `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts` still fails in unrelated pre-existing Stage 2 tests (`fetchSources` and `runResearchIteration` expectations). I did not modify those areas; I used targeted MT-5(C) cases plus the build and new focused tests as the relevant verifier set for this patch.

**For next agent:** If the Bundesrat family under-splits again, start with the live log for the exact `MT-5(C)` branch outcome. If you still see `contract-approved ... Skipping multi-event reprompt`, either salience commitment failed/returned empty anchors or the run never reached the new salience-backed exception. If you see MT-5(C) retry running but still staying at one claim, move upstream to the single-claim atomicity validator prompt and its branch-label doctrine.

**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.
