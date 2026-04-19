### 2026-04-20 | Unassigned | Codex (GPT-5) | Compound Subject Decomposition Prompt Fix
**Task:** Commit the remaining prompt/test changes in the worktree that prevent Stage 1 from splitting compound subjects or objects like `Volk und Parlament` into separate atomic claims when they share a joint temporal or conditional anchor.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md`; `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`; `Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Compound_Subject_Decomposition_Prompt_Fix.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The prompt change stays at the instruction level rather than adding deterministic post-processing. `claimboundary.prompt.md` now declares a `Compound subject/object exception` in both classification sections and loosens the contract-repair section so redundant sub-claims may be merged away when they violate decomposition integrity. The prompt-contract test was updated only to match the revised repair wording while preserving the rest of the contract assertions.
**Verification:** `npm -w apps/web exec vitest run test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts` passed (`11 passed`).
**Open items:** The prompt file is now committed, but the currently running local services were started before this final commit. To get clean commit-linked executions for this prompt change, restart the stack before starting another benchmark/job sequence.
**Warnings:** This task only commits the already-present prompt/test delta; it does not re-run live benchmark jobs or restart services.
**For next agent:** Start with `apps/web/prompts/claimboundary.prompt.md` around the Stage-1 classification rules and contract-repair rules. The intent is to stop joint anchors like `bevor Volk und Parlament ...` from being decomposed into whole-claim-plus-subclaim outputs. Restart the local stack before relying on this change in new job runs.
**Learnings:** no

