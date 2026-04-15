# Phase 7 Code And Prompt Deep Review — Archived Fixed-Blocker Detail

**Archived from:** `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md`  
**Archive date:** 2026-04-15  
**Why archived:** these sections described pre-`61815f41` blocker details that are no longer needed as forward-looking guidance in the active WIP doc.

## Archived section: Proven: post-repair contract observability can go stale

After `runContractRepair`, the code mutates `activePass2`, but the persisted `contractValidationSummary` is only refreshed if the final accepted claim set is not equivalent to the last validated claim set. If repair changes the set and Gate 1 later preserves it as-is, the summary can still describe the pre-repair validation state.

Source: [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:515), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:804)

## Archived section: Proven: traceability is lost between validator output and persisted summary

The validator prompt requires exact quoted proof for anchor preservation. The structured output includes `preservedByQuotes`. But the persisted summary drops those quotes and stores only:

- `anchorText`
- `preservedInClaimIds`
- `validPreservedIds`

That weakens auditability for the E2 batch and for later replay analysis.

Source: [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:390), [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:477), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:2337), [types.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/types.ts:1216)

## Archived section: Proven: part of the extraction architecture is still hidden in inline prompt text

`runContractRepair` uses a long inline system prompt and user prompt embedded directly in TypeScript instead of the prompt file system. This splits the extraction contract across:

- `claimboundary.prompt.md`
- inline strings in `claim-extraction-stage.ts`

That makes review harder and increases drift risk.

Source: [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:1688)

## Archived recommendation detail: fixed items from "What should be fixed before using E2 as architecture-moving evidence"

These recommendation items were later addressed and no longer belong in the active forward-looking WIP summary:

1. Refresh or recompute `contractValidationSummary` after repair so the stored summary matches the stored final claim set.
2. Persist quote-level anchor proof if the validator approved preservation.
3. Move the contract-repair prompt into the prompt system so the Stage 1 contract lives in one reviewable place.
