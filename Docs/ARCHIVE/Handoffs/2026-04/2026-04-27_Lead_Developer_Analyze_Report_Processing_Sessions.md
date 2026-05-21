---
### 2026-04-27 | Lead Developer | Codex (GPT-5) | Analyze Screen Report Processing Sessions
**Task:** Analyze and then implement removal of `/analyze` resume entries once a claim-selection draft has a `finalJobId`.
**Files touched:** `apps/web/src/app/analyze/ActiveClaimSelectionSessions.tsx`; `apps/web/test/unit/app/analyze/active-claim-selection-sessions.test.ts`; this handoff; `Docs/AGENTS/Agent_Outputs.md`.
**Key decisions:** `REPORT PROCESSING` was a frontend-only label, not an API job status. The accepted behavior is now removal, not downstream job-status polling. `shouldDropSessionFromRegistry()` drops drafts/refs with `finalJobId`, storage sync cleans old local refs before display, refresh removes server-returned final-job drafts, and obsolete `REPORT PROCESSING` / `Open report` UI branches were deleted.
**Open items:** None for this requested behavior.
**Warnings:** This is scoped to the analyze-page local resume registry. It does not change job creation, the `/jobs/{id}` page, or any backend draft/job status semantics.
**For next agent:** If similar completed entries reappear, check any new writer to `ACTIVE_CLAIM_SELECTION_SESSIONS_STORAGE_KEY`. The intended contract is that `lastKnownFinalJobId` is now a cleanup signal, not a display/recovery signal.
**Learnings:** No Role_Learnings entry appended; this is a narrow UI lifecycle finding, not a general role pattern.

```text
DEBT-GUARD REVIEW
Verdict: pass
Findings: none
Deletion candidates: obsolete `REPORT PROCESSING`, `Open report`, final-job summary, and final-job polling guard branches were removed in the patch.
Split candidates: none
Debt classification: no new debt introduced
Required changes before merge: none
Residual risk: none identified for the requested behavior
```

```text
DEBT-GUARD COMPACT RESULT
Chosen option: Amend the existing analyze-page registry cleanup mechanism.
Net mechanism count: unchanged; no polling, fallback, feature flag, or new lifecycle path was added.
Verification: `npm -w apps/web test -- active-claim-selection-sessions.test.ts` passed twice after the final cleanup.
Residual debt: none for the requested behavior; stale unrelated local-storage data is still bounded by normal storage normalization/eviction.
```
