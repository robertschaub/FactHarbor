---
roles: [Senior Developer]
topics: [anthropic_cache, stage2, extract_evidence, cost, verification]
files_touched:
  - apps/web/src/lib/analyzer/llm.ts
  - apps/web/src/lib/analyzer/research-extraction-stage.ts
  - apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts
  - apps/web/test/unit/lib/analyzer/llm-routing.test.ts
  - Docs/AGENTS/Handoffs/2026-05-10_Senior_Developer_Anthropic_Cache_Opt_Out_Verification.md
  - Docs/AGENTS/Agent_Outputs.md
---

# 2026-05-10 | Senior Developer | Codex (GPT-5) | Anthropic Cache Opt-Out Verification

## Task

Continue from `Docs/AGENTS/Handoffs/2026-05-10_LLM_Expert_Anthropic_Cache_Opt_Out_Partial_Patch.md` and finish the local verification slice for the Anthropic prompt-caching cost patch.

## Done

- Resolved the user typo `Senior developper` to the intended `Senior Developer` role after `fhAgentKnowledge.preflight_task` initially mapped it incorrectly.
- Loaded Senior Developer role context, `/debt-guard`, the referenced partial-patch handoff, `apps/web/AGENTS.md`, coding/testing/pipeline docs, and the touched source/test files.
- Kept the LLM Expert patch shape:
  - `getPromptCachingOptions(provider, { enabled: false })` returns `undefined`.
  - Only `extractResearchEvidence(...)` opts out of Anthropic prompt caching.
  - Relevance classification and applicability assessment still use normal Anthropic cache metadata.
- Added direct helper coverage in `apps/web/test/unit/lib/analyzer/llm-routing.test.ts` because the Stage 2 callsite test mocks `getPromptCachingOptions(...)` and therefore did not prove the real helper honors the opt-out policy.

## Verification

- `npm -w apps/web test -- test/unit/lib/analyzer/research-extraction-stage.test.ts` passed: 67 tests.
- `npm -w apps/web run build` passed after the original partial patch and reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `npm -w apps/web test -- test/unit/lib/analyzer/llm-routing.test.ts test/unit/lib/analyzer/research-extraction-stage.test.ts` passed: 73 tests.
- `git diff --check` passed after the final test addition.

## Decisions

- No live jobs and no expensive LLM test suites were run. This slice changes provider cache metadata only and local tests/build answer the code-level contract.
- No prompt text, UCM defaults, model routing, provider selection, schema shape, or extraction semantics were changed.
- No UCM-backed cache policy was added; that remains separate product/operations work if the Captain wants runtime tunability.

## Warnings

- The patch is verified locally but not committed, staged, or deployed.
- The worktree still contains unrelated modified/untracked files from before this continuation. Do not revert them while handling this cache patch.
- Live Anthropic cache ROI cannot be proven by local tests; measure it later through billing/usage telemetry after the patch is committed and run in the target runtime.

## For next agent

If asked to commit this slice, review and stage only the cache-patch files plus this completion output/index row unless the Captain explicitly includes unrelated work:

- `apps/web/src/lib/analyzer/llm.ts`
- `apps/web/src/lib/analyzer/research-extraction-stage.ts`
- `apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts`
- `apps/web/test/unit/lib/analyzer/llm-routing.test.ts`
- `Docs/AGENTS/Handoffs/2026-05-10_LLM_Expert_Anthropic_Cache_Opt_Out_Partial_Patch.md`
- `Docs/AGENTS/Handoffs/2026-05-10_Senior_Developer_Anthropic_Cache_Opt_Out_Verification.md`
- `Docs/AGENTS/Agent_Outputs.md`

## Learnings

No new Role_Learnings entry. The main lesson restates the prior handoff: cache ROI depends on prompt shape, and full-source extraction is a poor cache-write candidate because `sourceContent` is rendered into the system prompt.

## Debt Guard

```text
DEBT-GUARD COMPACT RESULT
Chosen option: keep the helper/callsite amendment and add direct helper test coverage.
Net mechanism count: unchanged.
Verification: targeted Vitest files, web build, and git diff --check all passed.
Residual debt: live cache ROI telemetry remains a separate post-deployment measurement task.
```
