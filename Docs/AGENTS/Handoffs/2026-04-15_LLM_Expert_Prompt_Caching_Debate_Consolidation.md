---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Prompt Caching Debate Consolidation
**Task:** Review the Anthropic prompt-caching proposal, pressure-test competing implementation options, and return a consolidated recommendation on what to do next.
**Files touched:** Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Prompt_Caching_Debate_Consolidation.md; Docs/AGENTS/Agent_Outputs.md; Docs/AGENTS/Role_Learnings.md
**Key decisions:**
- Rejected the claim that the caching gap is in `claimboundary-pipeline.ts`. That file orchestrates stages; the real call sites live in stage modules.
- Confirmed Anthropic prompt caching is already wired through `getPromptCachingOptions()` in the main high-volume stage calls (`claim-extraction-stage.ts`, `research-extraction-stage.ts`, `verdict-generation-stage.ts`, plus related modules).
- Identified the real remaining gap in `grounding-check.ts`, which still uses user-only prompts with no cache metadata.
- Concluded that prompt-shape, not missing cache flags, is the main limiter on cache payoff: current system prompts inline large per-job payloads, so cache annotations exist but reuse is weaker than it could be.
- Recommended a phased plan: patch grounding-check now; do not touch `claimboundary-pipeline.ts`; defer any broad prompt-boundary refactor unless cost telemetry justifies it.
**Open items:**
- If implementation is requested, patch the two grounding-check calls first and verify no behavior changes.
- If cost optimization becomes a measured priority, run a narrowly scoped proof-of-concept that splits static system instructions from dynamic user payload in the highest-volume stage (`EXTRACT_EVIDENCE`) before considering wider refactors.
- If a broader refactor is pursued, decide whether legacy `orchestrated` grounding prompts should remain DB-only or be migrated to a current prompt profile first.
**Warnings:**
- Adding more cache markers to existing claim/extract/verdict system messages is mostly redundant; those calls are already annotated.
- Refactoring prompt boundaries is materially higher risk than the original proposal suggests because prompt content, prompt-loader behavior, and stage input contracts all assume single rendered system prompts today.
- The strongest savings case is limited to Anthropic. Multi-provider behavior does not justify a large architectural refactor by itself.
**For next agent:**
- Start from the current cache helper in `apps/web/src/lib/analyzer/llm.ts` and the uncached grounding calls in `apps/web/src/lib/analyzer/grounding-check.ts`.
- Do not spend time modifying `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` for prompt caching; it has no direct `generateText()` call sites.
- If asked for implementation, prefer a two-step sequence: (1) grounding-check parity patch, (2) optional research-extraction proof-of-concept only if someone explicitly wants to chase token-cost reduction.
**Learnings:** yes — added an LLM Expert learning about prompt-caching ROI being constrained by dynamic payloads rendered into system prompts.
