# Wikipedia Supplementary Completion Plan

**Date:** 2026-04-03  
**Status:** Proposed narrow implementation plan  
**Scope:** Complete the already-shipped Wikipedia provider so it can participate meaningfully in the live retrieval path, while remaining fully UCM-controlled and easy to disable.

---

## 1. Goal

Complete Wikipedia integration as a **small retrieval-layer improvement**, not as a broad search redesign.

Desired outcome:

- Wikipedia remains optional
- Wikipedia can contribute in a bounded way even when primary providers succeeded
- Wikipedia follows detected claim/input language instead of only a fixed configured language
- the feature remains easy to disable via UCM

This plan is about **supplementary-provider completion**, not about proving that Wikipedia alone solves multilingual neutrality.

---

## 2. Current Reality

Already true in code:

- Wikipedia provider exists
- Wikipedia is visible in Admin config
- Wikipedia already has a UCM `enabled` switch
- Wikipedia already has a UCM `language` field
- supplementary providers are already wired into `web-search.ts`

Current limitation:

- in `auto` mode, supplementary providers only run when primary providers return **zero** results
- this makes Wikipedia mostly a fallback for total primary-search failure, not a real supplementary source
- Wikipedia language currently comes from a static config value, not detected input language

So the missing integration work is orchestration, not provider plumbing.

### 2.1 Why Wikipedia first, but not the others

The three shipped supplementary providers play different roles:

- **Wikipedia**
  - secondary reference source
  - broad multilingual coverage
  - no API key
  - low operational risk
  - useful as bounded supplementary context even before deeper provider-specific integration

- **Semantic Scholar**
  - academic discovery/index layer
  - highly valuable, but the provider result is usually only a pointer to a paper
  - real value often requires better handling of abstract/full-text/study-type downstream

- **Google Fact Check**
  - fact-check review discovery/index layer
  - very useful when prior public fact-checks exist
  - topic coverage is sparse and uneven
  - API-key-backed and more specialized than Wikipedia

Therefore, for a narrow default-on supplementary step:

- Wikipedia is the only reasonable current candidate
- Semantic Scholar and Google Fact Check should remain optional/off by default in this slice

### 2.2 When and how to use each shipped supplementary provider

- **Wikipedia**
  - **Recommended use**
    - broad reference context
    - multilingual terminology and entity background
    - supplementary subtopic expansion when primary web evidence already exists
  - **Recommended operating mode**
    - enabled by default
    - bounded supplementary participation
    - language-aware routing

- **Semantic Scholar**
  - **Recommended use**
    - research-heavy claims where papers, studies, or reviews are likely to be central evidence
    - best reopened when the team is ready to improve downstream handling of abstracts, PDFs, and study type
  - **Recommended operating mode**
    - keep disabled by default in this slice
    - use only as an optional academic discovery layer
    - do not rely on the index page itself as the final evidentiary anchor

- **Google Fact Check**
  - **Recommended use**
    - claims likely to have existing public fact-check reviews
    - especially political, viral, media, and misinformation-heavy topics
  - **Recommended operating mode**
    - keep disabled by default in this slice
    - use only as an optional discovery layer for prior published fact-checks
    - expect sparse coverage and avoid treating absence as evidence of truth/falsity

---

## 3. Non-Goals

Do **not** include these in this slice:

- Wikipedia reference extraction
- Semantic Scholar deep integration
- Fact Check direct-seeding redesign
- provider-specific evidence weighting heuristics
- Wikipedia-specific aggregation logic
- broad Stage 2 architecture changes

Those belong to a later track, if ever reopened.

---

## 4. Proposed Narrow Implementation

### 4.1 Keep the existing kill switch

Do **not** add a second Wikipedia on/off control.

Use the existing UCM setting:

- `search.providers.wikipedia.enabled`

This remains the canonical kill switch.

Recommended default posture for this slice:

- `search.providers.wikipedia.enabled = true`
- keep `search.providers.semanticScholar.enabled = false`
- keep `search.providers.googleFactCheck.enabled = false`

### 4.2 Add one generic supplementary-trigger control

Add a small UCM-controlled supplementary-provider policy block in search config, for example:

```json
"supplementaryProviders": {
  "mode": "fallback_only",
  "maxResultsPerProvider": 3
}
```

Recommended `mode` values:

- `fallback_only`
  - current behavior
  - supplementary providers only run when primary providers return zero results
- `always_if_enabled`
  - supplementary providers run in addition to successful primary search

Keep this generic across Wikipedia / Semantic Scholar / Google Fact Check instead of adding a Wikipedia-only orchestration flag.

Recommended default:

- set `mode = "always_if_enabled"`
- set `maxResultsPerProvider = 3`

Why:

- narrow change
- UCM-controlled
- reversible
- lets Wikipedia contribute by default in a bounded way
- still keeps rollback simple through the existing UCM switches

### 4.3 Thread detected language into Wikipedia search

Wikipedia should not rely only on `search.providers.wikipedia.language`.

Implementation intent:

- if the pipeline/search layer has a detected claim/input language, pass it into Wikipedia search
- use the detected language as the preferred Wikipedia subdomain
- fall back to `search.providers.wikipedia.language`
- fall back again to `"en"`

This should be structural plumbing, not heuristic language inference inside the Wikipedia provider itself.

### 4.4 Keep contribution bounded

Wikipedia should stay supplementary.

Use:

- existing `enabled` switch
- supplementary mode
- bounded `maxResultsPerProvider`

Do not let Wikipedia dominate the evidence pool.

---

## 5. Files Likely Touched

Configuration:

- `apps/web/src/lib/config-schemas.ts`
- `apps/web/configs/search.default.json`
- `apps/web/test/unit/lib/config-drift.test.ts` if needed indirectly

Search orchestration:

- `apps/web/src/lib/web-search.ts`
- `apps/web/src/lib/search-wikipedia.ts`

Admin UI:

- `apps/web/src/app/admin/config/page.tsx`

If language threading needs a higher-level handoff:

- whichever search-call site currently has access to detected language / language intent before `searchWebWithProvider()`

---

## 6. Suggested Implementation Order

### Step 1

Add the generic supplementary-provider UCM block:

- `supplementaryProviders.mode`
- `supplementaryProviders.maxResultsPerProvider`

Wire it into:

- schema
- defaults JSON
- Admin UI
- search dispatch

### Step 2

Change supplementary dispatch in `web-search.ts`:

- current:
  - supplementary runs only when primary results are zero
- new:
  - `fallback_only` preserves current behavior
  - `always_if_enabled` runs bounded supplementary providers even when primary search succeeded

### Step 3

Thread detected language into Wikipedia search:

- prefer detected language when present
- otherwise use configured `language`
- otherwise use `en`

### Step 4

Add focused tests:

- Wikipedia disabled => no Wikipedia calls
- Wikipedia enabled + `fallback_only` + primary results present => no supplementary call
- Wikipedia enabled + `always_if_enabled` + primary results present => supplementary call happens
- detected language overrides static configured language for Wikipedia
- missing detected language falls back to configured language

---

## 7. Validation Gate

### Unit / build

- `npm test`
- `npm -w apps/web run build`

### Runtime checks

Run serially, not in parallel:

1. German Plastik with the new default posture
2. English Plastik with the new default posture
3. one stable non-Plastik control
4. one rollback check with Wikipedia disabled again

Capture:

- whether Wikipedia was actually used
- top source/domain mix
- evidence item count
- claim-boundary count
- final verdict band
- whether Wikipedia contribution is bounded or floods

Success criterion:

- Wikipedia contributes when intended
- it remains easy to disable
- no new `analysis_generation_failed` or runtime regressions

This validation should be judged as retrieval-diversity improvement, not as a complete neutrality proof.

---

## 8. Recommendation

This is a sensible next task **if kept narrow**.

Recommended practical interpretation:

- **yes** to Wikipedia supplementary completion
- **yes** to keeping it UCM-controlled
- **yes** to enabling Wikipedia by default in a bounded way
- **no** to enabling Semantic Scholar or Google Fact Check by default in the same slice
- **no** to treating it as the main fix for Plastik multilingual variance

The best next slice is:

- finish the orchestration gap
- validate carefully
- stop there before adding deeper Wikipedia-specific behavior
