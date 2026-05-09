---
### 2026-05-09 | Lead Developer + LLM Expert | Codex (GPT-5) | Stage 2 Applicability Direction Prompt Fix

**Task:** Continue the report-improvement plan by implementing the smallest generic fix justified by the static comparator packet.

**Files touched:**
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
- `Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md`
- `Docs/AGENTS/Handoffs/2026-05-09_Lead_Developer_Stage2_Applicability_Direction_Prompt_Fix.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** Chose a prompt-only amendment to `APPLICABILITY_ASSESSMENT`. The prompt now requires directional claim-local entries to use a directional `directionBasis`, and instructs non-directional bases to return `neutral`. It adds a self-check for rule-governed standard claims and current-snapshot/endpoint/threshold numeric claims. This keeps the fix LLM-mediated and topic-neutral while avoiding a code-level `directionBasis` veto or query-breadth expansion.

**Open items:** Live validation has not been run. Before the first canary, commit the prompt/test change, reseed prompts, restart affected services, then spend one job on `asylum-235000-de`. If it remains outside the corrected band, stop and classify this prompt amendment before further edits.

**Warnings:** Static tests prove prompt contract shape, not model adherence. The remaining worktree includes broader docs changes from prior expectation updates; do not revert them. For job provenance, analyzer/prompt/config paths should be committed or otherwise clean before live validation.

**For next agent:** Use `Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md` Section 12.5 as the current implementation state. The next action is not more prompt piling; it is commit/reseed/restart plus the first serial live canary if Captain approves the git/runtime gate.

**Learnings:** Not appended. The task reinforced existing guardrails rather than adding a new reusable role learning.

DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism / failed-validation recovery.
Chosen option: amend the existing Stage 2 applicability prompt contract.
Rejected path and why: rejected code-level `directionBasis` behavioral veto because it would reintroduce the quarantined lock and add deterministic control over an LLM semantic label; rejected query breadth because prior `090a25c` was reverted after cross-family regression.
What was removed/simplified: no runtime mechanism removed; prompt ambiguity around non-directional bases was narrowed.
What was added: one APPLICABILITY_ASSESSMENT self-check plus prompt-contract assertions.
Net mechanism count: unchanged.
Budget reconciliation: actual touched files matched expected scope; no branches, fallbacks, flags, helpers, retries, or compatibility paths added.
Verification: `npm -w apps/web test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts` (107 passed); `npm -w apps/web test -- test/unit/lib/analyzer/research-extraction-stage.test.ts test/unit/lib/analyzer/verdict-stage.test.ts` (256 passed); `npm test` (safe suite passed); `git diff --check` passed.
Debt accepted and removal trigger: live quality risk remains until a committed/reseeded/restarted canary validates the prompt behavior.
Residual debt: if the canary fails, classify this amendment as keep/quarantine/revert before any further prompt or code change.
