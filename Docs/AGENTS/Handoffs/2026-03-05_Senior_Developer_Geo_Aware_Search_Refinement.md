---
### 2026-03-05 | Senior Developer | Claude Code (Opus 4.6) | Geo-Aware Search — Refinement to Query-Only

**Task:** Investigate and fix German vs English verdict divergence (49 percentage point gap) caused by geo-aware search language restriction.

**Files touched:**
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — removed language and geography from all 3 `searchWebWithProvider()` call sites
- `apps/web/prompts/claimboundary.prompt.md` — tightened geography inference guidance in Pass 1

**Key decisions:**

1. **Language (`lr`/`hl`) dropped from search providers entirely.** German `lr=lang_de` caused Google CSE to return only German-language results (domestic crime stats, Verfassungsschutz), producing a FALSE verdict. English got global results (GTD, Pew), producing LEANING-TRUE. Same claim, 49% gap.

2. **Geography (`gl`) also dropped from search providers.** Even for geo-specific claims, `gl` can bias toward local/censored sources when international sources are more reliable (e.g., Iran human rights events). The LLM-based geography inference is also unreliable — it could associate input language with a country.

3. **Language and geography kept in query generation prompt only.** The LLM still knows the input language and any geographic context, so it generates queries in the appropriate language. This is the right place for the signal — it influences what queries are written, not what results Google filters.

4. **Geography inference prompt tightened.** Only triggers for events/conditions occurring within a named place. Not for countries merely mentioned as subjects, not from institutions, not from input language, not from cultural associations.

5. **UCM overrides (`searchLanguageOverride`, `searchGeographyOverride`) retained** as manual escape hatch but never used by the pipeline automatically.

**What remains from the original geo-aware implementation:**
- Pass 1 detects `detectedLanguage` and `inferredGeography` (used by query generation prompt)
- Provider-level code supports `gl`/`lr`/`hl` params (for UCM overrides or future use)
- `WebSearchOptions` type has `language`/`geography` fields
- BCP-47 stripping logic in providers
- 12 tests for provider geo param handling
- Query generation prompt receives language/geography context

**Open items:**
- German input does not decompose ambiguous claims (1 claim vs 3 for English) — separate prompt quality issue, not related to search
- Multilingual decomposition testing not yet done

**Warnings:**
- The original problem (local vs deployed producing different results) is NOT fully solved. With no geo params, search results still depend on server IP. However, the divergence is now due to Google's IP-based ranking (minor) rather than explicit language filtering (major). The query language (determined by the LLM) is the primary driver of result relevance now.
- Provider-level geo code is still present but unused — could confuse future developers. Consider adding a comment or removing if never needed.

**For next agent:**
- The German decomposition issue should be investigated separately. The ambiguous claim decomposition prompt fixes (A, B, C) work for English but not German. Likely the prompt guidance is English-centric.
- If local vs deployed divergence is still observed after this change, the remaining cause is IP-based Google ranking — the only fix would be using a consistent search proxy or API key with fixed region settings.

**Learnings:** Appended to Role_Learnings.md? Yes — see below.
