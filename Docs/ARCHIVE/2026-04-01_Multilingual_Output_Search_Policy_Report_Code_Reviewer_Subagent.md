# Multilingual Output/Search Policy — Report: Code Reviewer (Codex/GPT-5.4-mini)

**Date:** 2026-04-01
**Hub Document:** Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Investigation.md
**Status:** DONE

---

## Files Analyzed
- `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Investigation.md` — task framing and scope.
- `Docs/STATUS/Current_Status.md` — prior cross-linguistic neutrality findings and parked/closed experiment history.
- `Docs/AGENTS/Handoffs/2026-03-22_Senior_Developer_Phase2v2_CrossLinguistic_v2_Results.md` — known-bad supplementary language retrieval behavior.
- `Docs/ARCHITECTURE/Prompt_Architecture.md` — runtime prompt loading and UCM prompt structure.
- `Docs/ARCHITECTURE/Calculations.md` — verdict scale, narrative behavior, and language-sensitive output expectations.
- `Docs/ARCHITECTURE/Evidence_Quality_Filtering.md` — deterministic evidence filtering and scope of config-driven defense layers.
- `apps/web/prompts/claimboundary.prompt.md` — current language/search/narrative instructions.
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts` — language detection and language-preservation directives in Stage 1.
- `apps/web/src/lib/analyzer/research-query-stage.ts` — query generation wiring.
- `apps/web/src/lib/analyzer/research-orchestrator.ts` — language passed into query generation and search execution.
- `apps/web/src/lib/analyzer/aggregation-stage.ts` — Stage 5 narrative generation and fallback behavior.
- `apps/web/src/lib/web-search.ts` and provider files — provider execution, caching, and language-specific provider behavior.
- `apps/web/src/app/jobs/[id]/components/VerdictNarrative.tsx` — report chrome and user-visible labels.

## Findings

1. **[HIGH] The proposal mixes two different requirements that should not be shipped as one policy: report language and retrieval language.** Current code already preserves input language in Stage 1 and Stage 5 prompts for the narrative, but the surrounding UI chrome and fallback strings remain English. For example, `aggregation-stage.ts` falls back to English `headline`, `evidenceBaseSummary`, `keyFinding`, and `limitations` when narrative generation fails, and `VerdictNarrative.tsx` hardcodes panel labels such as "Evidence Base", "Limitations", and "Cross-Boundary Tensions". If the policy is stated as "any output," it will require localization of report chrome, warnings, and fallback paths, not just LLM content. That is a larger and riskier change than the user-facing wording suggests.

2. **[HIGH] "Original language plus English where meaningful" is a known-bad class of retrieval policy unless the directionality is explicitly claim-aware.** The March 22 cross-linguistic experiment showed that a supplementary language pass could fire rarely and, when it fired, swing results in the wrong direction. The failure was not just a threshold problem; the handoff explicitly says language selection and evidential direction must be controlled independently. Reintroducing bilingual retrieval as a general rule without claim-aware gating risks rebuilding that same failure mode under a new name.

3. **[MEDIUM] Input language is not always the right anchor for search.** The current pipeline already treats geography as independent from language in Stage 1, and the prompt docs say to avoid inferring geography from language. The same caution applies to retrieval language. Mixed-language inputs, quoted source text, URLs, multilingual evidence bodies, and region-specific topics can all require different search anchors than the input surface language. A strict "search in the input language" rule can underfetch for domains where authoritative evidence is concentrated in another language, while a strict bilingual rule can overfetch noisy English commentary.

4. **[MEDIUM] There is no obvious regression guard for "language purity" in the final user report.** Existing quality work covers cross-linguistic verdict spread, claim decomposition stability, and evidence quality, but I did not find a test that asserts the final narrative, fallback narrative, warning text, and UI labels remain in the detected input language for non-English runs. There is also no test that checks whether bilingual search actually improves evidence quality rather than just search volume. Without those tests, this change will be hard to evaluate and easy to overfit.

5. **[LOW] The current prompt set already contains enough language directives that a broad rewrite could destabilize unrelated behavior.** Stage 1 explicitly says to preserve original language and not translate; Stage 2 query generation already prefers the detected language and only adds English in limited cases; Stage 5 says to write the narrative in the same language as the input claims and evidence. A new policy layered on top of this risks prompt duplication, conflicting instructions, and more drift unless the scope is narrowed carefully.

## Proposals

- Treat "report language" and "retrieval language" as separate policies.
- If the goal is only user-facing output, localize the narrative and fallback/report chrome, but do not force all internal reasoning, IDs, evidence excerpts, or source titles into the input language.
- If bilingual search is pursued, make it claim-aware and directional, not a blanket "add English" rule. The safe version is "search primarily in the input language, plus English only for evidence classes that are known to be international/academic and only when the query is semantically supported by the claim metadata."
- Gate any retrieval-language expansion behind a small experiment with explicit success criteria: evidence yield, verdict stability, and cross-language neutrality must all improve together. Do not promote based on search volume alone.

## Risks / Concerns

- Reviving cross-linguistic retrieval without a redesign could reproduce the March 22 wrong-direction swing.
- Localization scope is underspecified. If "any output" includes warnings, fallback messages, cached provider labels, and UI labels, the surface area is much larger than the prompt changes.
- Mixed-language source evidence is likely to become worse, not better, if the system tries to translate or normalize everything before analysis.
- Bilingual search can silently bias the evidence pool toward English-language commentary and away from primary local sources.
- Because cached search keys currently hash only the query and filters, a richer language-policy change may need cache invalidation or cache-key updates if query templates change.

## Out of Scope

- Implementing the policy.
- Changing prompts, UCM defaults, or provider configuration.
- Running paid live LLM validation.
- Revisiting the closed cross-linguistic supplementary-pass feature as-is.

## Recommendation

Do not ship this as a single broad policy. The defensible version is a narrow localization change for user-visible report text, plus a separate, claim-aware bilingual retrieval experiment with explicit rollback and tests. If the team cannot define "meaningful" in a way that is claim-aware and measurable, the retrieval part should stay off.
