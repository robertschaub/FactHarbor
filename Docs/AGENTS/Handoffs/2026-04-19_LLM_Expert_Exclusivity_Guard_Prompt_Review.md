---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Exclusivity Guard Prompt Review
**Task:** Review the current working-tree diff in `apps/web/prompts/claimboundary.prompt.md` and `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts` for multilingual robustness, genericity, and AGENTS.md prompt-rule compliance.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Exclusivity_Guard_Prompt_Review.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The prompt change is acceptable and directionally correct: narrowing the override from `sole/only/first/last` to `sole/only/unique` removes the earlier semantic overreach, and the new ordering-rank guard protects `first`/`last` precedence claims from being auto-split as if they were plain uniqueness claims. The wording remains generic and non-domain-specific. The only review nit is in the focused test: it locks the contract to exact English phrasing rather than the underlying semantic distinction, which may make future multilingual-safe wording refinements look like regressions.
**Open items:** None for prompt acceptance. Optional follow-up: relax the test to assert semantic intent rather than exact wording if the team expects future wording iteration.
**Warnings:** This review is static only. No prompt reseed, restart, or live rerun was performed in this turn.
**For next agent:** The current prompt lines of interest are `apps/web/prompts/claimboundary.prompt.md:72-73` and `:222-223`; the paired contract assertions are in `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts:208-223`. Keep the prompt logic as written unless you want a more semantics-oriented test contract.
**Learnings:** no
