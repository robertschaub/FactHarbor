# ACS-CW-1 Implementation

Date: 2026-04-22  
Author: Codex (unassigned)

## Scope

Implemented the first ACS-CW-1 slice inside the existing ACS-1 draft/prepared-job architecture:

- new prompt section `CLAIM_SELECTION_RECOMMENDATION`
- new analyzer module `claim-selection-recommendation.ts`
- draft runner integration for recommendation generation and persistence
- failure-path preservation of `PreparedStage1Snapshot`
- focused unit coverage for recommendation invariants and retry behavior

## What Changed

### Prompt

- Added `CLAIM_SELECTION_RECOMMENDATION` to `apps/web/prompts/claimboundary.prompt.md`
- Updated prompt frontmatter `variables`, `requiredSections`, and `lastModified`

The section:

- evaluates the final Stage 1 candidate set jointly
- assigns the approved four-way provisional v1 treatment label
- ranks the full set
- recommends up to 3 claims
- allows empty `recommendedClaimIds`
- keeps the reasoning generic and multilingual-safe

### Analyzer module

Added `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`.

Key behavior:

- uses one structured `context_refinement` LLM call
- validates module-boundary invariants before returning:
  - full assessment coverage
  - full ranked permutation coverage
  - recommended subset ordering
  - non-empty rationale strings
  - no out-of-set or self-redundancy ids
- retries once on ordinary structured-output / invariant failure
- does not retry on explicit refusal metadata (`finishReason = content-filter|other` with no structured output)

### Draft runner integration

Updated `apps/web/src/lib/internal-runner-queue.ts`.

New behavior:

- loads the active pipeline config once and reuses it for both Stage 1 preparation and recommendation
- runs recommendation immediately after successful prepared Stage 1 snapshot generation
- persists recommendation snapshot into `DraftStateJson`
- in `interactive` mode:
  - preselects `recommendedClaimIds`
- in `automatic` mode:
  - auto-confirms `recommendedClaimIds` when non-empty
  - leaves the draft in `AWAITING_CLAIM_SELECTION` when the recommendation is valid but empty

### Failure persistence

Updated:

- `apps/api/Controllers/InternalClaimSelectionDraftsController.cs`
- `apps/api/Services/ClaimSelectionDraftService.cs`

`/failed` now accepts optional `draftStateJson`, and `StoreFailureAsync(...)` can persist a prepared snapshot plus `lastError` before marking the draft `FAILED`.

Also tightened `StoreFailureAsync(...)` so stale failure callbacks do not overwrite drafts already in `FAILED` or `AWAITING_CLAIM_SELECTION`.

## Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer/claim-selection-recommendation.test.ts`
- `cd apps/web; npx tsc --noEmit`
- `dotnet build -o C:\DEV\FactHarbor\tmp\api-review-build`
- `npm -w apps/web run build`
- `npm test`

## Warnings

- Automatic mode now depends on the recommendation module. If the module returns a valid empty recommendation set, the draft is intentionally left in `AWAITING_CLAIM_SELECTION` rather than inventing fallback selections.
- This does not resolve the previously documented Bundesrat parity instability. That remains a Stage 1 run-to-run stability issue and is intentionally deferred.

## Learnings

- The recommendation fail-closed rule is only operationally useful if the failure path can still persist the prepared Stage 1 snapshot; otherwise recommendation failure discards the most expensive successful work.
- Prompt frontmatter drift tests will immediately fail when new `##` sections are added unless both `requiredSections` and `variables` are updated at the top of the prompt file.
