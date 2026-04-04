# Multilingual Output/Search Policy - Report: Senior Developer (Codex/GPT-5)

**Date:** 2026-04-01  
**Hub Document:** `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Investigation.md`  
**Status:** DONE

---

## Files Analyzed
- `Docs/AGENTS/Roles/Senior_Developer.md` - role scope, required reading, and implementation/testing expectations.
- `Docs/AGENTS/Role_Learnings.md` - prior multilingual lessons, especially the failed supplementary-language assumption.
- `Docs/STATUS/Current_Status.md` - current status of cross-linguistic neutrality work.
- `Docs/AGENTS/Handoffs/2026-03-22_Senior_Developer_Phase2v2_CrossLinguistic_v2_Results.md` - evidence that supplementary language is not a reliable proxy for direction.
- `apps/web/prompts/claimboundary.prompt.md` - Stage 1/2/4/5 language directives.
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts` - detected language and non-English output directive in Stage 1.
- `apps/web/src/lib/analyzer/research-query-stage.ts` - Stage 2 query generation wiring.
- `apps/web/src/lib/analyzer/research-orchestrator.ts` - language handoff into search query generation and search execution.
- `apps/web/src/lib/analyzer/aggregation-stage.ts` - fallback narrative strings and Stage 5 narrative generation.
- `apps/web/src/lib/analyzer/metrics.ts` and `apps/web/src/lib/analyzer/metrics-integration.ts` - current search observability schema.
- `apps/web/src/lib/search-cache.ts` - cache key shape and cache record model.
- `apps/web/src/lib/web-search.ts` and provider files - search provider abstraction and per-provider language support.
- `apps/web/src/app/jobs/[id]/page.tsx` - English report chrome, export buttons, and warning display.
- `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts` - HTML report chrome strings.
- `apps/web/src/app/jobs/[id]/components/VerdictNarrative.tsx` - verdict panel labels.
- `apps/web/src/lib/analyzer/warning-display.ts` - warning classification boundary.

## Findings

1. **The current pipeline is only partially multilingual.** Stage 1 already pushes non-English inputs to stay in the detected language, and Stage 2 query generation is language-aware, but the output surface is split. The LLM-generated narrative can follow the input language, while fallback text and UI/report chrome remain English. That means “any output in the input language” is not satisfiable by prompt-only changes.

2. **The search policy should not reuse the old cross-linguistic proxy.** Repo learnings already show that “supplementary language” is not a stable proxy for evidential direction. The failed March 22 experiment swung the verdict the wrong way when the supplementary pass fired. Any bilingual retrieval policy must keep language selection and evidential direction independent.

3. **Stage 2 already has the right insertion point for query-language expansion, but not for provider-language bias.** The orchestrator passes detected language into the query-generation LLM, then search executes without `hl`/`lr`/`gl`-style provider language parameters. That is a good default. If bilingual retrieval is added, the safe place is query generation and per-query language lanes, not automatic provider-level language filtering.

4. **The cache and metrics layers do not currently understand language lanes.** Search cache keys are based on query text plus result/filter settings, and search metrics record query/provider/result counts without language metadata. If the policy changes to generate original-language plus English queries, those layers need visibility into query language or lane identity so operators can explain why a run retrieved what it did.

5. **Full “all visible text” localization is much larger than the policy wording suggests.** The report page, HTML export, and verdict component contain many hardcoded English labels. If the requirement truly includes every visible string, this becomes a UI i18n project, not a pipeline tweak.

## Effort Sizing

### Minimal
- **Scope:** Prompt-only changes plus narrow fallback cleanup.
- **What changes:** Stage 1/2/5 prompts enforce report-authored narrative in the input language; query generation produces original-language queries first and only bounded English queries when the LLM judges it useful; fallback narrative strings are translated only where easy.
- **Effort:** Low to medium. Roughly a few days, assuming no new runtime state or UI localization.
- **Effect:** Removes most mixed-language LLM output in the common path, but leaves English chrome, English export labels, and some fallback/diagnostic text.
- **Risk:** Users may still see mixed-language reports because the non-LLM surfaces remain English.

### Medium
- **Scope:** Add first-class language policy state and observability.
- **What changes:** Introduce explicit pipeline state for `reportLanguage` and `retrievalLanguages` or equivalent; thread it through Stage 2 and Stage 5; add language-aware fallback generation; record query-language metrics; extend cache identity if query lanes are encoded structurally rather than only in query text.
- **Effort:** Moderate. Roughly one sprint for implementation plus test hardening.
- **Effect:** Makes the policy explicit, measurable, and maintainable. This is the first option that can be defended as a real architecture change rather than a prompt patch.
- **Risk:** If bilingual retrieval is implemented as a generic “add English” rule, it can recreate the prior failure mode. The model must decide when English is meaningful, and that judgment must not be coupled to evidential direction.

### Full
- **Scope:** Full report-page localization and localized operational text.
- **What changes:** Add UI i18n, localize report chrome, export controls, warnings, failure labels, and any static headings; likely add locale files and a translation workflow; decide whether source excerpts stay original-language or are translated for presentation.
- **Effort:** High. This is a cross-cutting project, likely multiple sprints.
- **Effect:** Only this option satisfies the strict interpretation of “any output” including chrome and diagnostics.
- **Risk:** High regression surface, larger test matrix, and a real chance of breaking auditability if source text is translated rather than preserved.

## Proposals

1. **Split the problem into two explicit policies.**
- Report-language policy: what language LLM-authored narrative should use.
- Retrieval-language policy: what language lanes Stage 2 should search.

2. **Prefer a prompt-first implementation for the first step, then add runtime state if the policy sticks.**
- Prompt-only work can fix most narrative-language drift quickly.
- Runtime state is required once the team wants deterministic observability, cache stability, and easier testing.

3. **Keep source text original-language and keep retrieval bilingual only when the LLM has evidence-based reason.**
- Do not translate evidence excerpts as part of the policy.
- Do not use English as a correction mechanism for directionality.
- Do not send provider language filters unless a specific provider and use case justify it.

4. **Treat UI chrome localization as separate.**
- If the product owner really wants every visible string in the input language, this should be a dedicated i18n rollout.
- If the goal is only the report narrative, avoid pulling the whole UI into the scope.

## Validation Strategy

- **Safe baseline:** `npm test` and `npm -w apps/web run build`.
- **Targeted unit coverage:** add/extend tests for prompt rendering, query generation, fallback narrative language, and report chrome localization boundaries.
- **Multilingual regression cases:** run deterministic fixtures for English, German, and French input to check that output language follows input language without changing verdict direction.
- **Avoid paid tests by default:** do not run `test:llm`, `test:neutrality`, or `test:cb-integration` unless the change actually touches live model behavior and a real-language validation is required.
- **If paid validation becomes necessary:** keep it small, language-focused, and compare language-purity plus verdict stability together. Do not measure search volume alone.

## Observability Needed

- Add query-language or query-lane fields to search metrics so operators can see whether a run searched original language, English, or both.
- Add counters for how often English supplementation fired and how often it produced results.
- Add a cache dimension or cache-key explanation if query lanes become structured.
- Emit a report-language mismatch signal when the runtime produced fallback English while the input language was non-English.
- Keep warnings classified through `warning-display.ts`; do not add language-specific warning severity rules inline in UI code.

## Regression Risks

- **Wrong-direction retrieval bias:** English supplementation can overpower local-language evidence and move the verdict in the wrong direction.
- **False completion:** prompt-only changes can make the narrative look better while leaving English chrome and fallback text visible.
- **Cache drift:** changing search-language behavior without updating cache identity can cause stale results or hard-to-explain cache hits.
- **Auditability loss:** translating source evidence instead of only report-authored narrative would make reports less trustworthy.
- **Test blindness:** if the team only checks English fixtures, the regression will not show up.

## Out of Scope

- Implementing the policy.
- Editing the hub document or any file outside this spoke report.
- Reworking the closed cross-linguistic experiment as-is.
- Running paid live-model validation for this investigation.

## Recommendation

The defensible rollout is **medium scope**, not full localization. First make report-authored narrative follow the input language, then add explicit retrieval language lanes with original-language-first search and bounded English supplementation only when meaningful. If product requirements truly mean every visible string on the report page, that should be a separate i18n project.
