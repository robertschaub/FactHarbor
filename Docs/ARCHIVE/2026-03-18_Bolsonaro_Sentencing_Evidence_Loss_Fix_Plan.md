# Bolsonaro Sentencing Evidence Loss — Investigation & Fix Plan

**Date:** 2026-03-18
**Status:** COMPLETE — all fixes implemented, tested (1337 pass), and live-validated (job 91e018df)
**Author:** LLM Expert (Claude Code, Opus 4.6)
**Reviewed by:** Two prior agents (see §5 Review History)
**Priority:** HIGH — affects report completeness for jurisdiction-specific claims

---

## 1. Problem Statement

### Symptom

The Bolsonaro trial analysis ("Was the Bolsonaro judgment (trial) fair and based on Brazil's law?") previously included references to the **27-year prison sentence** in its reports. Recent runs no longer surface this information in the final report, even though it still appears in web search results.

The user confirmed: *"only on searches it appeared"* — meaning the search engine returns sentencing articles, but they are filtered out before reaching the report.

### Baseline: Older Reports DO Contain the Sentence

Three archived reports from before the Phase A contamination fixes all reference the 27-year sentence:

| Report | Date | Language | Sentence Reference |
|--------|------|----------|-------------------|
| `Was_the_Bolsonaro_judgment_trial_fair_an_Report_20260301_220532.html` | 2026-03-01 | EN | PBS News: "27-year prison term" (evidence EV_1772397000184, 4 occurrences) |
| `O_julgamento_de_Bolsonaro_foi_justo_e_ba_Report_20260301_221740.html` | 2026-03-01 | PT | "27 anos e três meses de prisão" (EV_020, EV_022) |
| `O_julgamento_de_Bolsonaro_foi_justo_e_ba_Report_20260219_162245.html` (gh-pages) | 2026-02-19 | PT | Same sentencing references |

The English report sourced the 27-year sentence primarily from PBS News:
`https://www.pbs.org/newshour/world/bolsonaro-arrested-over-alleged-plot-to-escape-and-avoid-27-year-prison-term-in-brazil`

### Timeline: What Changed

The Phase A contamination fixes landed March 12–16, 2026. These were designed to prevent **US government reactions** (Trump administration commentary, sanctions, congressional statements) from contaminating Brazilian legal analysis — a valid and necessary fix. The sentencing disappearance is a side effect.

Key commits in the window:

| Date | Commit | Change |
|------|--------|--------|
| Mar 12 | `7ed71a05` | Distinct Events Rules exclude foreign reactions from research queries |
| Mar 12 | `172bba3d` | Foreign jurisdiction relevance cap = 0.35 (below 0.4 discard threshold) |
| Mar 12 | `fa06cfc3` | Applicability filter removes `foreign_reaction` evidence post-extraction |
| Mar 15 | `28d42d8f` | Contradiction budget reservation — main loop stops 1 iteration earlier |
| Mar 15 | `1a0687c0` | Pass 2 extraction switched from Sonnet to Haiku |
| Mar 16 | `bb2d3190` | `thesisRelevance` field — tangential claims get weight=0 |

**Constraint from product owner:** The foreign reaction filtering must be preserved. It was added specifically to stop baseless Trump admin commentary from polluting the analysis. We must not weaken it.

---

## 2. Root Cause Analysis

### Primary Hypothesis: RELEVANCE_CLASSIFICATION Misclassifies International Factual Journalism

**Likelihood: HIGH (60%)**

The pipeline has two jurisdiction filters, both using `direct | contextual | foreign_reaction` classification:

1. **RELEVANCE_CLASSIFICATION** (pre-fetch, Stage 2) — classifies search results before page fetch. Items classified `foreign_reaction` are capped at `foreignJurisdictionRelevanceCap` (0.35), falling below the 0.4 discard threshold. They are never fetched.
2. **APPLICABILITY_ASSESSMENT** (post-extraction) — classifies extracted evidence items. Items classified `foreign_reaction` are removed entirely.

The problem: both prompts define `contextual` as including "foreign media reporting on the jurisdiction's events," but **RELEVANCE_CLASSIFICATION lacks a concrete example** while APPLICABILITY_ASSESSMENT has one:

**RELEVANCE_CLASSIFICATION** (`claimboundary.prompt.md:420-425`):
```
- contextual: Evidence about the jurisdiction from neutral external observers
  (international NGOs, academic comparative studies, foreign media reporting
  on the jurisdiction's events). Score normally but note as external.
- foreign_reaction: Evidence produced by foreign governments, foreign legislative
  bodies, or foreign executive actions ABOUT the claim's jurisdiction (sanctions,
  diplomatic statements, foreign congressional resolutions, foreign State Department
  reports). These are political reactions, not evidence about the claim's substance.
  Score at most 0.3.
```

**APPLICABILITY_ASSESSMENT** (`claimboundary.prompt.md:1357-1367`) — has the explicit rule:
```
- Foreign media reporting (e.g., BBC reporting on Brazilian trials) is "contextual"
  — the media organization is foreign but it's reporting on the jurisdiction's events
  using the jurisdiction's own sources.
- Foreign government ACTIONS (sanctions, executive orders) are always
  "foreign_reaction" — even if they mention the jurisdiction's events.
```

Since RELEVANCE_CLASSIFICATION is the gatekeeper (pre-fetch), if the Haiku model misclassifies PBS as `foreign_reaction` there, the article is discarded before it ever reaches APPLICABILITY_ASSESSMENT's better prompt. PBS is a US public broadcaster — somewhat government-adjacent in perception — making misclassification more likely for a lightweight model without a concrete example.

### Contributing Cause: Top-5 Fetch Without Deterministic Sort

**Likelihood: MEDIUM (35%) — independent structural bug**

Even if classification is correct, the pipeline takes only the first 5 items after filtering (`claimboundary-pipeline.ts:3173`):

```typescript
const fetchedSources = await fetchSources(
  relevantSources.slice(0, 5),  // <-- no sort, uses LLM-emitted order
  ...
);
```

`relevantSources` preserves the LLM-emitted order from `classifyRelevance`, not score order. A correctly classified `contextual` PBS article scored at 0.95 but returned 6th by the LLM is silently dropped.

### Other Contributing Factors

| Factor | Likelihood | Mechanism |
|--------|-----------|-----------|
| Sufficiency early-exit (3 items after 1 iteration) | 30% | Research stops before sentencing-specific queries run |
| Query generation doesn't target sentencing outcomes | 25% | Thesis is about process fairness; sentencing is an outcome |
| Contradiction budget reservation reduces iterations | 20% | Main loop stops 1 iteration earlier (Fix 4, commit `28d42d8f`) |
| Search cache (7-day TTL) | 15% | Less likely given user reports searches show it |

### Diagnostic Gap

The exact classification is **not observable** in the current system. `classifyRelevance` returns only `{ url, relevanceScore }` to the caller (`claimboundary-pipeline.ts:3430`), even though the LLM output includes `jurisdictionMatch` and `reasoning` (`claimboundary-pipeline.ts:2458-2463`). These fields are used internally for capping, then discarded. There is no way to confirm post-hoc whether PBS was lost due to:
- `foreign_reaction` misclassification (capped below 0.4)
- Low relevance score (unrelated to jurisdiction)
- LLM ordering (correct classification, ranked 6+)
- Fetch failure
- Post-extraction applicability removal

This makes the root-cause claim **stronger than the available evidence** — the diagnosis is a plausible hypothesis, not a confirmed conclusion.

---

## 3. Relevant Code & Config

### Code Paths

| File | Lines | Role |
|------|-------|------|
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | 3160-3175 | Caller: classifyRelevance → slice(0,5) → fetchSources |
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | 3424-3539 | `classifyRelevance()` — LLM call, capping, filtering |
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | 3540-3673 | `assessEvidenceApplicability()` — post-extraction filter |
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | 2457-2465 | `RelevanceClassificationOutputSchema` (Zod) |
| `apps/web/prompts/claimboundary.prompt.md` | 396-458 | RELEVANCE_CLASSIFICATION prompt |
| `apps/web/prompts/claimboundary.prompt.md` | 1347-1399 | APPLICABILITY_ASSESSMENT prompt |
| `apps/web/src/lib/analyzer/debug.ts` | — | `debugLog()` utility, already used for Stage 2/3 diagnostics |

### Config

| Setting | Location | Value | Role |
|---------|----------|-------|------|
| `foreignJurisdictionRelevanceCap` | `pipeline.default.json` / UCM | 0.35 | Cap for `foreign_reaction` scores |
| Relevance threshold | Hardcoded in `classifyRelevance` | 0.4 | Minimum score to pass filter |
| Top-N fetch | Hardcoded at call site | 5 | Max sources fetched per iteration |

### Existing Test Coverage

Tests in `claimboundary-pipeline.test.ts:2075-2188` cover:
- Foreign sanctions → `foreign_reaction` → capped and filtered (line 2082)
- NGO report → `contextual` → passes (line 2096)
- Missing `jurisdictionMatch` → defaults to `contextual` via `.catch()` (line 2109)
- UCM `foreignJurisdictionRelevanceCap` respected (line 2168)
- Applicability assessment removes `foreign_reaction` evidence (line 2200)

**NOT covered:**
- Foreign media reporting domestic court proceedings → should be `contextual`
- Foreign media reporting foreign sanctions → should remain `foreign_reaction`
- Deterministic ordering before top-5 fetch
- Diagnostics observability (raw vs. adjusted scores)

### Operational Note: Prompt Reseed Required

Prompt file changes do NOT affect runtime until reseeded into UCM. Auto-reseed runs on `postbuild` (`package.json:12`) but NOT during `dev`. After any prompt change: `cd apps/web && npm run reseed:prompts`.

---

## 4. Fix Plan

Five fixes, ordered by dependency. A and B are zero-risk structural improvements. C is the prompt change. D validates. E confirms against live data.

### Fix A — Stable Deterministic Sort Before Top-5 Fetch

**File:** `claimboundary-pipeline.ts:3169-3175`
**Change:** Sort `relevantSources` by adjusted `relevanceScore` descending, then original search rank ascending (tie-break), before `.slice(0, 5)`.
**Risk:** None — strictly better behavior. Highest-scored sources always fetched; equal scores resolved deterministically by original search rank.
**Rationale:** Fixes the structural bug independently of classification. Even with perfect classification, LLM ordering instability can drop high-value sources.

**Before:**
```typescript
const fetchedSources = await fetchSources(
  relevantSources.slice(0, 5),
  ...
);
```

**After (sketch):**
```typescript
// Stable sort: score desc, then original search rank asc (tie-break)
const sorted = [...relevantSources].sort((a, b) =>
  b.relevanceScore - a.relevanceScore || a.originalRank - b.originalRank
);
const fetchedSources = await fetchSources(
  sorted.slice(0, 5),
  ...
);
```

Note: `originalRank` must be threaded from the search results array index through `classifyRelevance`. Implementation detail to resolve during coding.

### Fix B — Stage 2 Diagnostics via debugLog

**File:** `claimboundary-pipeline.ts` inside `classifyRelevance()` (lines 3490-3519) and at the call site (line 3173)
**Change:**
- Inside `classifyRelevance`: `debugLog` for every classified result — original search rank, url (truncated), raw score, adjusted score (after cap), `jurisdictionMatch`, brief reasoning
- At call site: `debugLog` for the post-sort top-5 selected for fetch
**API:** Keep return type as `Array<{ url: string; relevanceScore: number }>` — no external API change, no churn. Diagnostics stay internal.
**Risk:** None — admin-only observability, no behavior change.
**Purpose:** Next investigation of this class of bug takes minutes instead of days of hypothesis-driven guessing.

### Fix C — Contrastive Rule in RELEVANCE_CLASSIFICATION Prompt

**File:** `claimboundary.prompt.md:423` (after the `foreign_reaction` bullet)
**Change:** Add a substance-based contrastive rule that mirrors what APPLICABILITY_ASSESSMENT already has:

```markdown
  - **Key distinction — classify by evidence substance, not publisher nationality:**
    - Foreign news coverage of domestic events in the claim's jurisdiction
      (court proceedings, sentencing, agency actions, locally produced data)
      is "contextual."
    - Foreign news coverage whose substantive evidence is a foreign government
      action about the jurisdiction (sanctions, executive orders, diplomatic
      statements, foreign legislative resolutions, State Department positions)
      is "foreign_reaction."
    - State media, government press offices, and official government publications
      are not "neutral external observers" — classify by the issuing authority.
    - Infer category from the likely substantive evidence in the result's
      title/snippet, not merely the publisher's nationality or the page wrapper.
```

**Risk:** Low — the contrastive structure explicitly preserves the `foreign_reaction` classification for sanctions/government actions. Without the counter-rule (just "foreign media is contextual"), a Reuters article about US sanctions on Brazil could slip through as `contextual`. The counter-rule prevents this.
**Constraint:** Must NOT weaken the foreign reaction filter that blocks Trump admin commentary.

### Fix D — Tests

Split into D1 (for A/B) and D2 (for C):

**D1 — After A+B:**
- Deterministic sort: 6 items, 2 sharing the same score → verify tie-break by original rank
- Diagnostics: mock LLM output includes `jurisdictionMatch` and `reasoning` → verify debugLog captures raw score, adjusted score, jurisdictionMatch, original rank

**D2 — After C (unit tests with mocked LLM output):**
- `"foreign media reporting domestic court proceedings is contextual"` — PBS/Reuters with Brazilian trial/sentencing snippet → `contextual`, no cap, passes 0.4 threshold
- `"foreign media reporting foreign sanctions remains foreign_reaction"` — PBS/Reuters with US sanctions snippet → `foreign_reaction`, capped at 0.35, filtered out
- Assert both raw and adjusted scores (not just pass/fail outcome) to catch regressions where `contextual` items are accidentally penalized

### Fix E — Reseed + Live Validation

**Commands:** `cd apps/web && npm run reseed:prompts`
**Validation:** Run EN Bolsonaro variant and verify at three checkpoints:
1. **Stage 2 classified list** (via debugLog) — PBS article present, classified `contextual`
2. **Fetch stage** — PBS in top-5 after sort
3. **Extracted evidence** — sentencing evidence item present in final report

All three checkpoints must pass. If the sentence survives Stage 2 but fails at fetch or extraction, the root cause is elsewhere.

### Execution Order

```
A (sort) → B (diagnostics) → D1 (tests for A/B) → run tests
→ C (prompt) → D2 (tests for C) → run tests → reseed → E (live validation)
```

A and B are safe, structural, and give us diagnostics before touching the prompt. C is the behavior change. D validates C won't regress. E confirms against live data.

---

## 5. Review History

### Review 1 — Code Reviewer (2026-03-18)
**Key feedback incorporated:**
- Prompt fix needs a **contrastive rule**, not just a positive example. Without the counter-rule ("foreign media reporting foreign sanctions is still foreign_reaction"), the fix risks reopening contamination.
- **Top-5 fetch without deterministic sort** is a structural bug independent of classification. PBS can disappear even if correctly classified, simply by being emitted 6th by the LLM.
- **Diagnostics gap**: `jurisdictionMatch` is thrown away at the API boundary. Cannot confirm root cause without observability.
- **Test gap**: No coverage for the specific boundary (foreign media + domestic events vs. foreign media + foreign actions).
- **Reseed trap**: Prompt edits don't affect runtime until reseeded into UCM.

### Review 2 — Senior Developer (2026-03-18)
**Key adjustments incorporated:**
- Fix A needs a **stable tie-break** (score desc, original search rank asc), not just score sort. Equal-scored items still churn without it.
- Fix B should use **debugLog inside `classifyRelevance`**, not widen the return type. Only one call site; API churn is avoidable.
- Fix C should add: *"Infer category from the likely substantive evidence in the result's title/snippet, not merely the publisher's nationality or the page wrapper."* — because the classifier sees only title, snippet, and URL.
- Fix D should assert both **raw and adjusted scores**, not just pass/fail. Catches regressions where `contextual` items are accidentally penalized.
- Fix E should validate at **three checkpoints** (classified, fetched, extracted), not just final output.

---

## 6. Open Questions for Reviewer

1. **Is the `originalRank` threading approach for Fix A acceptable?** The search results array index must be carried through `classifyRelevance` to the sort at the call site. Options: (a) add `originalRank` to the return type, (b) zip the index at the call site before passing to sort. Which is cleaner?

2. **Should Fix B diagnostics also capture which items were discarded and why?** Currently proposed: log every classified result. Alternative: also log a summary line of discarded items (below threshold, foreign_reaction capped, not in top-5).

3. **Is the contrastive prompt wording in Fix C sufficiently specific for Haiku?** The model sees only title/snippet/URL. Should we add more concrete examples (e.g., "BBC article titled 'Brazil sentences Bolsonaro to 27 years' → contextual; Reuters article titled 'US imposes sanctions on Brazil over Bolsonaro case' → foreign_reaction")?

4. **Should the top-N fetch limit (currently hardcoded at 5) be promoted to UCM config?** This would allow tuning without code changes. Counter-argument: more fetches = more cost/latency.

5. **Any concerns about the execution order?** Specifically: should we run E (live validation) before merging C, or is the D2 test coverage sufficient as a gate?
