---
### 2026-04-27 | Lead Developer | Codex (GPT-5) | Stale Draft Preparation Recovery
**Task:** Diagnose and fix a draft stuck on the claim-selection preparation page at `PREPARING` 12%.
**Files touched:** `apps/web/src/lib/internal-runner-queue.ts`; `apps/web/test/unit/lib/runner-concurrency-split.integration.test.ts`; this handoff; `Docs/AGENTS/Agent_Outputs.md`.
**Key decisions:** The stuck draft was not a `finalJobId` resume-list case. It was a locally tracked draft-preparation task with no progress updates. Report jobs already had stale-running recovery; draft preparation only recovered orphaned `PREPARING` drafts after restart. The fix extends the existing 15-minute stale-running threshold to the draft-preparation lane and fails stale locally tracked drafts through the existing internal failed-draft endpoint instead of requeueing duplicate work.
**Open items:** None for the observed stuck-draft class.
**Warnings:** The local draft `e410123312c44e5c961e5ae36b921273` was recovered through the app route drain and is now `FAILED` with `LastEventMessage = "Stale draft preparation (no progress update for 33 minutes)"`. This used the application recovery path, not direct SQLite mutation.
**For next agent:** If drafts still stick in `PREPARING`, inspect whether `/internal/v1/claim-selection-drafts/recoverable` is reachable from the web runner and whether `updatedUtc` is advancing. The intended behavior is now: orphaned `PREPARING` drafts requeue after restart; locally tracked stale `PREPARING` drafts fail after the shared 15-minute stale threshold.
**Learnings:** No Role_Learnings entry appended; this is a narrow runner parity fix.

```text
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: Amend draft-preparation recovery to mirror the existing stale-running report-job guard.
Rejected path and why: UI hiding would conceal the broken draft; requeueing a locally tracked stale draft could create duplicate writers while the old task is still alive.
What was removed/simplified: The report-job stale threshold was lifted into a shared constant instead of keeping a draft-only duplicate.
What was added: A stale locally tracked `PREPARING` draft branch that calls the existing failed-draft endpoint, clears `runningDraftIds`, and decrements draft running count.
Net mechanism count: unchanged; no new runner lane or status model.
Budget reconciliation: Touched the expected runner file and focused test only; no prompt, UCM, schema, or analysis semantics changed.
Verification: `npm -w apps/web test -- runner-concurrency-split.integration.test.ts` passed.
Debt accepted and removal trigger: none.
Residual debt: Exact LLM-call hang cause remains unknown, but the recovery behavior is now bounded.
```
