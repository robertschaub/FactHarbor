# Wikipedia & Semantic Scholar Integration — Future Integration Concept

**Date:** 2026-03-03  
**Last Updated:** 2026-04-03  
**Status:** Active as a future integration concept. The provider-layer implementation is already in the codebase; the open work is deeper pipeline integration.  
**Historical detail:** [2026-03-03_Wikipedia_SemanticScholar_Integration_Concept_arch.md](../ARCHIVE/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept_arch.md)

---

## 1. Document Role

The basic provider layer and admin wiring are no longer the open question. Those foundations are already in the codebase.

This document now exists to:

- capture the remaining pipeline-aware supplementary-provider opportunities
- prevent teams from reopening already-complete provider plumbing as if it were still missing
- scope any new work as narrow retrieval-integration work rather than a broad search redesign

What remains relevant here are the deeper ideas:

- provider-aware query generation
- once-per-claim supplementary orchestration
- better Wikipedia-language handling
- citation/reference harvesting
- deeper Semantic Scholar / academic-evidence treatment
- richer Google Fact Check loop integration

---

## 2. Current Code Reality

Already implemented:

- provider registration for Wikipedia / Semantic Scholar / Google Fact Check
- UCM/provider wiring
- Admin UI visibility for supplementary providers
- dedicated Wikipedia search provider implementation
- Wikipedia enable/disable switch in UCM: `search.providers.wikipedia.enabled`
- Wikipedia configured language in UCM: `search.providers.wikipedia.language`

Important current behavior:

- Wikipedia is treated as a supplementary provider, not a primary provider
- in `auto` mode, supplementary providers currently run only when primary providers return **zero** results
- therefore, enabling Wikipedia today does **not** mean it contributes to most normal successful runs
- Wikipedia currently uses a configured language value rather than detected claim/input language

So the open gap is not “Wikipedia support exists or not”. The open gap is:

- when supplementary providers should run
- how their queries should be shaped
- how multilingual claims should choose Wikipedia language editions
- how supplementary evidence should be blended into the normal research flow

Still future-facing:

- provider-specific query variants
- better use of source-type differences inside Stage 2
- deeper evidence extraction from supplementary providers
- a policy for running supplementary providers even when primary search already succeeded
- multilingual Wikipedia routing beyond a static configured language

### 2.1 Provider-role classification

For current FactHarbor design, these three supplementary providers should not be treated as interchangeable:

- **Wikipedia**
  - best understood as a **secondary reference source**
  - valuable for broad overview, terminology, subtopic discovery, and multilingual coverage
  - useful as bounded supplementary context
  - not usually the strongest final evidentiary anchor when primary sources are available

- **Semantic Scholar**
  - best understood as an **academic discovery/index layer**
  - the `semanticscholar.org` result is usually a pointer to a paper, not the paper's evidence itself
  - the underlying paper may be primary or secondary depending on study type
  - therefore the provider is valuable, but it is not as drop-in ready for default-on use as Wikipedia

- **Google Fact Check**
  - best understood as a **fact-check review discovery/index layer**
  - it points to published fact-check reviews by third-party publishers
  - those reviews are usually secondary analyses, not original primary evidence
  - very useful when a claim is already in the public fact-check ecosystem, but coverage is sparse and topic-dependent

This distinction matters for default posture:

- Wikipedia is the most reasonable candidate for bounded default-on supplementary use
- Semantic Scholar and Google Fact Check remain better as explicit optional supplements until their deeper integration path is reopened

### 2.2 Recommended provider usage

- **Wikipedia**
  - **When to use**
    - when the claim needs broad public-reference context, terminology, entity background, multilingual framing, or quick subtopic expansion
    - especially useful when a claim is cross-lingual and the primary search pool may be language-skewed
  - **How to use**
    - run as a bounded supplementary provider
    - prefer detected input/claim language, then configured language, then `en`
    - treat Wikipedia text as contextual support, not as the strongest final anchor when primary sources are available

- **Semantic Scholar**
  - **When to use**
    - when the claim is materially research-dependent, such as science, medicine, environment, technology, or empirical-effectiveness questions
    - especially useful when high-quality academic evidence is likely to matter more than general web coverage
  - **How to use**
    - keep optional/off by default until deeper integration is reopened
    - use as an academic discovery layer, not as a final evidence authority by itself
    - prefer extracting the underlying abstract/full text or publisher/PDF evidence rather than relying on the index page alone

- **Google Fact Check**
  - **When to use**
    - when the claim is likely already in the public fact-check ecosystem, such as viral misinformation, political statements, widely circulated social posts, or recurring media claims
    - especially useful for quick discovery of existing published reviews
  - **How to use**
    - keep optional/off by default in the current narrow retrieval posture
    - treat it as a discovery layer for third-party fact-check reviews, not as a universal provider with broad claim coverage
    - use bounded results and expect sparse / uneven availability depending on topic and region

---

## 3. Recommended Narrow Reopening Scope

If this track is reopened now, the recommended next slice is:

- **SEARCH-1A: narrow supplementary-provider completion**

Target shape:

1. keep Wikipedia behind the existing UCM switch
2. allow bounded supplementary-provider participation even when primary providers succeeded
3. thread detected input/claim language into Wikipedia language selection
4. keep Wikipedia as a secondary/supplementary source, not a replacement for primary web evidence

Not recommended as part of this slice:

- Wikipedia reference extraction
- source-specific semantic heuristics
- broad provider orchestration redesign
- deep Semantic Scholar integration work
- Google Fact Check direct-seeding redesign
- special aggregation logic for Wikipedia evidence

Rationale:

- the provider layer is already shipped
- the highest-value remaining gap is retrieval diversity / multilingual robustness
- a narrow completion step is lower-risk than reopening the larger archived architecture plan

---

## 4. Validation Intent

This track should be validated as:

- retrieval-diversity improvement
- multilingual robustness improvement
- optional supplementary evidence broadening

It should **not** be framed as a complete fix for the Plastik multilingual-neutrality problem by itself.

Wikipedia may reduce some evidence-pool asymmetry, but it remains a supplementary secondary source. It is not expected to replace the need for primary-source and general web evidence quality.

Semantic Scholar and Google Fact Check should still be considered valuable future supplements, but not equivalent candidates for immediate default-on promotion in this narrow reopening slice.

---

## 5. Current Decision Rule

- Keep this document as a future design source and scoping guard.
- Do not treat provider-layer work as still-open engineering.
- If a narrow Wikipedia completion step is approved, keep the implementation small and UCM-controlled.
- If the broader track is reopened later, start from the archived detailed concept but re-check all assumptions against the current code first.
