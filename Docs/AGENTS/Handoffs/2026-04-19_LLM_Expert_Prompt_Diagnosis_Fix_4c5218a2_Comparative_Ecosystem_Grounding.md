---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Prompt Diagnosis Fix 4c5218a2 Comparative Ecosystem Grounding
**Task:** Implement the prompt-side fix for job `4c5218a2960444c29baccff13f21cb38` after the prior diagnosis identified two live prompt weaknesses: comparative ecosystem asymmetry in `VERDICT_RECONCILIATION` and registry-overweighting in `VERDICT_GROUNDING_VALIDATION`.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md`, `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `Docs/AGENTS/Prompt_Issue_Register.md`, `Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Prompt_Diagnosis_Fix_4c5218a2_Comparative_Ecosystem_Grounding.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept the fix prompt-only, per the diagnosis, rather than mixing in stage-code changes to seeded evidence. In `VERDICT_RECONCILIATION`, added a mandatory per-side direct-evidence sufficiency scaffold for comparative systematic/institutionalized/organized claims: each side must be checked separately for direct ecosystem evidence, omission is probative only when the source is actually enumerative/structural for the target ecosystem, and proxy/context-only asymmetry must stay in the `UNVERIFIED` band. In `VERDICT_GROUNDING_VALIDATION`, rewrote the task/rule ordering so `citedEvidenceRegistry` is explicitly only for directional citation arrays while claim-local context (`evidencePool`, `sourcePortfolio`, `boundaryIds`, `challengeContext`) governs uncited reasoning references. Added focused prompt-contract assertions for both behaviors. Targeted tests passed. Runtime activation is already current: `config.db` reports active `claimboundary` hash `c77cb6e8ca4671a0a3a26552f69cf94150723a440c152d003b4d530114aab8e3`, and `refreshPromptFromFileIfSystemSeed('claimboundary')` returned unchanged, meaning the DB blob already matches the edited file after canonicalization.
**Open items:** No post-fix live rerun was executed. Because the motivating Swiss input is not on the current Captain-defined input list, behavioral confirmation should be treated as pending human approval. The upstream seeded-evidence amplifier in `research-orchestrator.ts` is still untouched; if the prompt-side mitigation proves insufficient, that remains the next code-side candidate.
**Warnings:** `npm -w apps/web run reseed:prompts` reported `claimboundary` as unchanged. This is expected given the current runtime state: the active DB blob already matched the edited prompt content. I therefore did not restart services. `config-loader.ts` refreshes active prompt pointers every 30 seconds (`pointerTTL: 30_000`), so new jobs will pick up the active hash automatically without a restart.
**For next agent:** If you need runtime confirmation, first get approval to rerun the exact input. Then inspect whether the claim verdict stays in `UNVERIFIED` when one side remains proxy/context-only and whether `verdict_grounding_issue` stops firing on claim-local uncited evidence. If the first issue persists, move to the upstream amplifier at `apps/web/src/lib/analyzer/research-orchestrator.ts:934-1015`; if the second persists, inspect the grounding-validator caller at `apps/web/src/lib/analyzer/verdict-generation-stage.ts` / warning emission path.
**Learnings:** no

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`
- Result: `67 passed` + `5 passed`

## Active runtime state

- `claimboundary` active hash: `c77cb6e8ca4671a0a3a26552f69cf94150723a440c152d003b4d530114aab8e3`
- Activated UTC: `2026-04-19T13:23:23.971Z`
- Active version label: `seed-v1.0.3`
- Restart required: `no` under current loader behavior (`pointerTTL` 30s, hash-based invalidation)
