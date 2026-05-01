---
roles: [Senior Developer]
topics: [acs, claim_selection, idle_auto_proceed, rollout, internal_runner_queue]
files_touched:
  - apps/web/src/lib/internal-runner-queue.ts
  - apps/web/test/unit/lib/runner-concurrency-split.integration.test.ts
  - Docs/AGENTS/Handoffs/2026-05-01_Senior_Developer_Idle_Auto_Proceed_Clean_Rollout.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-05-01 | Senior Developer | Codex (GPT-5) | Idle Auto-Proceed Clean Rollout

**Task:** Implement only the approved immediate rollout path on a clean branch from canonical base `2a713bcc`, manually reimplementing the idle auto-proceed timestamp seeding from `0482c962` without taking the broader `main-regression` commit stack.

**Branch and base:** New worktree `C:\DEV\FactHarbor-idle-autoproceed-rollout`, branch `codex/idle-autoproceed-rollout`, base `2a713bcc`.

**Commit:** `7714840b fix(acs): seed idle selection timestamp`

**Files touched:** `apps/web/src/lib/internal-runner-queue.ts`; `apps/web/test/unit/lib/runner-concurrency-split.integration.test.ts`; `Docs/AGENTS/Handoffs/2026-05-01_Senior_Developer_Idle_Auto_Proceed_Clean_Rollout.md`; `Docs/AGENTS/Agent_Outputs.md`

**Implementation:** In the interactive draft path that persists an `AWAITING_CLAIM_SELECTION` draft after recommendation, the runner now sets `lastSelectionInteractionUtc: new Date().toISOString()` in the `ClaimSelectionDraftState`. This arms the existing server-owned idle auto-proceed sweep even if the original browser never opens or writes a selection interaction. The focused test prepares an interactive draft with six candidate claims and verifies the persisted draft state carries the configured idle timeout, seeded interaction timestamp, and recommended selected IDs.

**Explicitly not changed:**
- Did not cherry-pick the proposed 11-commit slice.
- Did not apply the 15-minute UX default from `05c8c864`; `claimSelectionIdleAutoProceedMs` remains at the canonical-base value unless Captain explicitly approves the default change.
- Did not change ACS semantics, budget defaults, prompt files, warning handling, UCM state, services, reseeds, restarts, or live jobs.
- Did not touch `C:\DEV\FactHarbor` or branch `codex/private-admin-repo-cutover-clean`.

**Verification:**
- `npm -w apps/web test -- test/unit/lib/runner-concurrency-split.integration.test.ts test/unit/lib/internal-runner-queue.test.ts`
- `npm -w apps/web run build`
- `git diff --check`
- `npm test`

**Verification notes:** The clean worktree initially had no `node_modules`; `npm ci --ignore-scripts` was used to install local dependencies, then `npm rebuild sqlite3` was required so Vitest could load SQLite-backed modules. These dependency directories are ignored and were not committed. The build ran the existing postbuild prompt/config seeding against the rollout worktree's local `apps/web/config.db`; no tracked config files changed.

**Prerequisite DAG before broader rollout:**

```text
ACS budget-aware substrate
  -> config/schema/default fields
  -> recommendation cap/admission plumbing
  -> draft/job selection metadata
  -> validation/report exposure

Selected-claim starvation substrate
  -> claim acquisition ledger and selected coverage metrics
  -> below-floor selected-claim scheduling
  -> no-search/budget terminal reasons
  -> validation warnings/tests

Prepared-routing/applicability substrate
  -> prepared Stage 1 snapshot contract
  -> selected vs routing claim separation
  -> applicability replacement/claim remapping
  -> selected-only evidence filtering before verdict

Verdict repair substrate
  -> citation direction basis
  -> post-citation audit
  -> direction repair chain through at least 3d20e789
  -> focused Stage 4 verdict tests/prompt review
```

**Open items:**
- If Captain approves the UX change, apply the 15-minute default separately: `claimSelectionIdleAutoProceedMs` and `CLAIM_SELECTION_IDLE_AUTO_PROCEED_DEFAULT_MS` from `3600000` to `900000`, with config/schema/default tests.
- Keep `b1229c39`, `0f696419`, `daa7bc61`, `e45b1515`, and `b5421841` held until their prerequisite substrates are promoted or re-authored against the canonical base.

**DEBT-GUARD COMPACT RESULT**

Chosen option: amend the existing awaiting-selection draft-state construction.
Net mechanism count: unchanged.
Verification: targeted tests, build, `git diff --check`, and full safe `npm test` passed.
Residual debt: broader ACS/verdict rollout remains blocked on the prerequisite DAG above.

