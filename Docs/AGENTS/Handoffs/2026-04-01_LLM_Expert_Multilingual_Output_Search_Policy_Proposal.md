---
### 2026-04-01 | LLM Expert | Codex (GPT-5) | Multilingual Output/Search Policy Proposal
**Task:** Investigate the current mixed-language behavior for non-English reports, assess the effort and effects of making output follow input language, assess adding original-language-plus-English retrieval where meaningful, and return a debated multi-agent proposal.
**Files touched:** `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Investigation.md`, `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Report_Lead_Architect_Subagent.md`, `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Report_Senior_Developer_Subagent.md`, `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Report_Code_Reviewer_Subagent.md`, `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Policy_Proposal.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The investigation converged on four decisions. First, "output in input language" and "search in original language plus English" must be treated as separate policies. Second, the right boundary is: report-authored analytical text follows the report language, while source-authored evidence text stays in original language for auditability. Third, the architecture should introduce a first-class language-state concept such as `LanguageIntent` with explicit `reportLanguage` and retrieval language lanes, because the current root cause is not Stage 1 detection but the lack of Stage 4/5 report-language ownership and the presence of English fallbacks/UI chrome. Fourth, English search should only be an optional coverage-expansion lane judged meaningful by the LLM; it must not be used as a contrarian-balancing proxy because the 2026-03-22 supplementary-language experiment already failed in that direction. Proposal 2 has now been architecturally approved, and the approved review explicitly locks `reportLanguage` as a strongly typed cross-stage contract, preserves source-language evidence as a hard requirement, approves English only as a coverage-expansion lane, and defers full UI/chrome localization.
**Open items:** Product scope is now mostly locked by architectural review. The main remaining question is whether a prompt-only pilot is acceptable before first-class state/schema work, since the architect review approved the stateful direction but did not explicitly approve a prompt-only interim shortcut.
**Warnings:** A prompt-only fix will improve the common path but will not eliminate mixed-language output because English fallbacks and report chrome remain. A generic "always add English" retrieval rule risks reproducing the known wrong-direction failure mode from the March 22 cross-linguistic experiment. Translating source-derived evidence text would damage transparency and should be avoided.
**For next agent:** Start with `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Investigation.md` and `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Architect_Review.md`. Key code anchors are `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/research-query-stage.ts`, `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/src/lib/analyzer/aggregation-stage.ts`, `apps/web/src/lib/web-search.ts`, `apps/web/src/lib/search-cache.ts`, and the report UI/export files under `apps/web/src/app/jobs/[id]/`.
**Learnings:** no

#### Recommended rollout
1. Phase 1: make report-authored analytical output follow the input language and add report-language-aware fallbacks.
2. Phase 2: introduce explicit retrieval language lanes with original-language-first queries and optional English supplementation when meaningful.
3. Phase 3: add validation and observability for language purity, lane firing, and verdict stability.
4. Phase 4: localize report chrome and warnings only if product scope explicitly requires full visible-output localization.

#### Effort summary
- Narrow report-content localization only: low to medium.
- Report-content localization plus explicit retrieval lanes and observability: medium.
- Full visible-output localization including UI/export chrome: high.

#### Expected effects
- The recommended medium scope should significantly reduce mixed-language narrative output and improve retrieval coverage discipline without sacrificing auditability.
- It will not automatically localize every user-visible static string unless Phase 4 is approved.
