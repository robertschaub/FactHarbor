## Task

Consolidate and implement the three selection-readiness follow-ups after live monitoring:

1. cross-session prepared-snapshot reuse for repeated public URLs
2. better draft/job log attribution during concurrent runs
3. clearer preparation-page wording about when manual claim selection becomes available

The user explicitly requested a debate review before implementation.

## Debate Outcome

Advocate and challenger agreed on the high-level priority, but diverged on scope:

- `Change 1` was **blocked for live behavior now**.
  - The challenger was right that exact public URL equality is not yet a semantics-complete reuse contract under the current evidence-seeded Stage 1.
  - The advocate was right that the architecture already has a reusable prepared-artifact path and that missing provenance, not missing plumbing, is the real blocker.
- `Change 2` was approved as a **narrow attribution patch**, not a logging redesign.
- `Change 3` was approved as a **copy-only clarification**.

## Consolidated Decision

Implement now:

- `2. Log attribution`
- `3. Preparation-page wording`
- `1a. Forward-only prepared-snapshot provenance groundwork`

Do **not** implement now:

- `1b. Live cross-session reuse behavior`

That means this slice intentionally stops short of reusing another session's prepared Stage 1 snapshot. It only lands the provenance needed to make a future exact/auditable reuse decision possible.

## Why Change 1 Was Narrowed

Current `PreparedStage1Snapshot` previously carried only:

- `version`
- `resolvedInputText`
- `preparedUnderstanding`

That is not enough to safely prove that a later session may reuse the snapshot without re-running cold Stage 1. The current Stage 1 still depends on live input fetch plus evidence-seeded preparation behavior.

The safe compromise was:

- add forward-only provenance metadata to `PreparedStage1Snapshot`
- do **not** consume it for reuse yet

## Implemented Changes

### 1. Forward-only prepared-snapshot provenance groundwork

Files:

- [types.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/types.ts)
- [claimboundary-pipeline.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts)

Added optional `preparedStage1.preparationProvenance` with:

- `pipelineVariant`
- `sourceInputType`
- optional `sourceUrl`
- `resolvedInputSha256`
- `executedWebGitCommitHash`
- `promptContentHash`
- `pipelineConfigHash`
- `searchConfigHash`
- `calcConfigHash`
- `selectionCap`

This is explicitly provenance/audit groundwork. It does not change runtime behavior and does not introduce cross-session sharing.

### 2. Concurrent draft/job log attribution

Files:

- [debug.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/debug.ts)
- [internal-runner-queue.ts](/c:/DEV/FactHarbor/apps/web/src/lib/internal-runner-queue.ts)

Implemented:

- async-scoped debug log context via `AsyncLocalStorage`
- per-line context prefixing for debug-file output
- console `log/info/warn/error` wrapping keyed off async context
- runner binding:
  - `[job:<id>|analysis]`
  - `[draft:<id>|prep]`

This keeps concurrent prep/job output distinguishable without adding a new logging store or rewriting the analyzer.

### 3. Preparation-page wording refinement

Files:

- [page-helpers.ts](/c:/DEV/FactHarbor/apps/web/src/app/analyze/select/[draftId]/page-helpers.ts)
- [page.tsx](/c:/DEV/FactHarbor/apps/web/src/app/analyze/select/[draftId]/page.tsx)

Updated copy now states clearly:

- Stage 1 prepares the final candidate set first
- if the manual-review threshold is reached, FactHarbor then generates ranked recommendations
- for interactive sessions, the manual claim-selection screen appears only after that recommendation step

This keeps the explanation accurate without implying that recommendation is the main latency source.

## Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer/debug.test.ts test/unit/app/analyze/select/page-helpers.test.ts test/unit/lib/analyzer/claimboundary-prepared-stage1.test.ts test/unit/lib/analyzer/claim-selection-recommendation.test.ts`
- `npm -w apps/web run build`

## Warnings

- Live cross-session prepared-snapshot reuse is still **deferred**. The new provenance metadata is not yet sufficient by itself to authorize reuse; it only closes the most obvious auditability gap.
- The worktree still contains the earlier uncommitted ACS recommendation-order normalization slice. I left it intact and verified against it, but this task did not commit anything.

## Learnings

- The selection-readiness bottleneck is still primarily Stage 1 latency, but the debate correctly separated “what is slow” from “what is safe to optimize now.”
- Exact public URL equality feels tempting as a reuse key, but under the current Stage 1 semantics it is not enough.
- AsyncLocalStorage is the right-sized tool for concurrent attribution here; it solves the operator pain without dragging the repo into a logging architecture migration.
