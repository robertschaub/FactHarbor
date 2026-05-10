---
roles: [LLM Expert]
topics: [anthropic_cache, stage2, extract_evidence, cost, partial_patch]
files_touched:
  - apps/web/src/lib/analyzer/llm.ts
  - apps/web/src/lib/analyzer/research-extraction-stage.ts
  - apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts
---

# 2026-05-10 | LLM Expert | Codex (GPT-5) | Anthropic Cache Opt-Out Partial Patch

## Task

Continue the Anthropic prompt-caching cost-reduction lane after the Captain asked whether caching waste should be investigated next. A two-agent debate concluded that the first implementation slice should not disable caching globally; it should target the Stage 2 full-source evidence-extraction call where source bodies are rendered into the cached system prompt.

The Captain interrupted after noticing the desktop context was `C:\DEV\Guest-List`. No changes were made in `C:\DEV\Guest-List`; the partial patch exists only in `C:\DEV\FactHarbor`, which is the correct repository for this work.

## Done

- Read `C:\DEV\FactHarbor\AGENTS.md`, `.claude/skills/debt-guard/SKILL.md`, `.claude/skills/handoff/SKILL.md`, and prior prompt-caching handoffs.
- Ran `fhAgentKnowledge.preflight_task` as LLM Expert with `/debt-guard`.
- Confirmed the relevant prior conclusion: caching flags are already wired broadly through `getPromptCachingOptions()`, but reuse is poor when dynamic source bodies are rendered into the cached system prompt.
- Implemented an unverified partial patch:
  - `apps/web/src/lib/analyzer/llm.ts:390` adds `PromptCachingPolicy` and allows `getPromptCachingOptions(provider, { enabled: false })` to return `undefined`.
  - `apps/web/src/lib/analyzer/research-extraction-stage.ts:327` opts out only for `extractResearchEvidence(...)`, the full-source Stage 2 extraction call.
  - `apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts:461` adds a focused assertion that `extractResearchEvidence(...)` disables Anthropic cache provider options on the system message.
- Confirmed with `rg` that `research-extraction-stage.ts` still uses normal caching at relevance classification (`line 171`) and applicability assessment (`line 581`); only evidence extraction has `{ enabled: false }`.

## Decisions

- Do not change prompt text, model routing, schemas, structured-output options, or provider selection in this slice.
- Do not disable caching globally in `llm.ts`; other callsites may still benefit from repeated prompt shapes.
- Do not add UCM-backed cache policy yet. The debate preferred UCM for a final design, but this interrupted slice intentionally stays small: one helper amendment plus one high-confidence callsite opt-out.
- Treat the change as cost-affecting, not quality-affecting in prompt semantics. It removes Anthropic cache metadata only; it should not change the rendered prompt or model response.

## Warnings

- The patch is not verified. The Captain interrupted before the targeted Vitest run.
- The first attempted edit briefly hit the wrong similar callsite (`classifyRelevance`) because the message block shape matched. It was corrected immediately; current `rg` output shows only `extractResearchEvidence` opts out.
- Current worktree already had unrelated modified/untracked files before this patch. Do not revert them:
  - `.claude/settings.json`
  - `Docs/AGENTS/Agent_Outputs.md`
  - `Docs/AGENTS/Captain_Quality_Expectations.md`
  - `Docs/AGENTS/benchmark-expectations.json`
  - `Docs/AGENTS/index/stage-map.json`
  - `Docs/Legal/AI_And_Search_Provider_Nonprofit_Programs_2026-04-29.md`
  - `Docs/Legal/NPO_Formation_Checklist.md`
  - `Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md`
  - `.codex-run/`
  - `Docs/AGENTS/Handoffs/2026-05-09_Unassigned_ZHAW_AI_Provider_Briefing_Review.md`
  - `Docs/AGENTS/Handoffs/2026-05-10_Senior_Developer_Daily_Bug_Scan_No_Confirmed_Regression.md`
- Finance context from `C:\DEV\FactHarbor-internal\Operations\Finance\API Costs\API_Cost_Analysis_2026-05-08.md`: cache reads were only `$13.67 / 0.3%`, while cache writes were `$915.89`; line 117 recommends disabling caching for Stage 2 per-source calls while keeping caching for repeated system-prompt patterns.
- Official Anthropic docs state cache writes have a premium and reads are cheaper only when reusable prompt prefixes repeat within TTL: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching

## Learnings

- The core issue is prompt shape, not just the presence of cache flags. `extractResearchEvidence(...)` renders `sourceContent` into the system prompt, so each source batch produces a unique cached prefix and pays the write premium with little chance of reuse.
- The smallest safe code path is to amend the existing `getPromptCachingOptions(...)` helper with an opt-out parameter, rather than creating a second helper or changing every callsite.
- A broader UCM-backed cache policy and callsite-level cache ROI telemetry remain worthwhile follow-ups, but they should be separate from this first verification slice.

## For next agent

1. Stay in `C:\DEV\FactHarbor`; do not work from `C:\DEV\Guest-List`.
2. Inspect the current diff for the three touched files listed in the frontmatter.
3. Run the focused verifier:

   ```powershell
   npm -w apps/web test -- test/unit/lib/analyzer/research-extraction-stage.test.ts
   ```

4. If the test fails, apply `/debt-guard` failed-attempt recovery before editing further. The likely fix surface is the test expectation/mock shape, not prompt or pipeline behavior.
5. If the test passes, consider `git diff --check` and optionally `npm -w apps/web run build` because `llm.ts` exports a changed function signature.
6. Do not run live jobs or expensive LLM tests for this slice unless the Captain explicitly asks. Live provider cache ROI must be measured later against Anthropic billing/usage telemetry after the patch is committed and deployed.
