# Phase 8 — Systematic Analysis of Pipeline Quality

**Date:** 2026-02-15
**Author:** Claude Opus 4.6 (Lead Architect)
**Status:** Ready for review
**Scope:** All 10 analysis jobs submitted 2026-02-15 + cumulative assessment of Phases 6-7 fixes

---

## 1. Executive Summary

After six iterations of targeted fixes across Phases 6-7, the analysis pipeline still fails to produce acceptable results for the majority of inputs. Of 8 orchestrated pipeline jobs today, **only 3 pass quality gates** (37.5%). The core problems are not in the areas we've been fixing.

**The research funnel is the primary failure point.** The pipeline retrieves 100-400 search results per job but fetches only 1-14 sources (0.5-13% conversion). This evidence famine cascades into thin verdicts, fallback defaults, and failing quality gates. Everything downstream — verdict hedging, harmPotential, quality gates — is a symptom of insufficient evidence, not the root cause.

**Incremental patches have not worked and will not work.** The 13,600-line monolith has too many interacting control mechanisms (10+) for targeted fixes to be predictable. The architecture needs structural changes at 3 specific points, not more patches.

---

## 2. Jobs Analyzed

10 jobs submitted in two batches:

| # | ID | Time | Input | Pipeline | Batch |
|---|-----|------|-------|----------|-------|
| 1 | `ab75b466` | 07:45 | SRG trustworthy? (German statement) | Orchestrated | BEFORE |
| 2 | `8247df53` | 07:46 | H2 vs EV efficiency | Orchestrated | BEFORE |
| 3 | `e92e0b94` | 07:46 | Bolsonaro trial fairness | Orchestrated | BEFORE |
| 4 | `0612fa2d` | 07:46 | SRG initiative URL | Orchestrated | BEFORE |
| 5 | `51d125e2` | 13:55 | Bolsonaro trial fairness | Orchestrated | AFTER |
| 6 | `3cfc5fe0` | 13:55 | H2 vs EV efficiency | Orchestrated | AFTER |
| 7 | `3f8d1cba` | 13:56 | SRG trustworthy? (German statement) | Orchestrated | AFTER |
| 8 | `3928db99` | 14:47 | SRG trustworthy? (English statement) | Orchestrated | AFTER |
| 9 | `60aac799` | 13:56 | SRG trustworthy? (German statement) | Dynamic | AFTER |
| 10 | `962c8ba2` | 14:47 | SRG trustworthy? (English statement) | Dynamic | AFTER |

**BEFORE** = Code as of morning (Phase 6 committed, Phase 7 may not have been deployed).
**AFTER** = Code after Phase 7 commits (circuit breaker + outcome claims harmPotential fix).

---

## 3. Master Results Table

| Job | Claims | Evidence | Searches | Ev/Search | Sources OK | Contradiction | QG | Publishable | Verdict | Conf |
|-----|--------|----------|----------|-----------|------------|--------------|-----|-------------|---------|------|
| SRG DE BEFORE | 4 | 2 | 30 | **0.07** | 1/1 | Yes | **FAIL** | 2 | UNVERIFIED 50% | 10 |
| H2 BEFORE | 7 | 25 | 18 | 1.39 | 14/11 | **No** | **FAIL** | 7 | LEAN-FALSE 38% | 53 |
| Bolsonaro BEFORE | 9 | 30 | 31 | 0.97 | 10/9 | Yes | PASS | 2 | LEAN-TRUE 69% | 74 |
| SRG URL BEFORE | 18 | 4 | 70 | **0.06** | 11/10 | Yes | **FAIL** | 9 | LEAN-TRUE 58% | None |
| Bolsonaro AFTER | 9 | 15 | 31 | 0.48 | 5/5 | Yes | PASS | 2 | MIXED 49% | 74 |
| H2 AFTER | 11 | 14 | 23 | 0.61 | 12/9 | **No** | **FAIL** | 4 | MIXED 54% | 60 |
| SRG DE AFTER | 2 | 3 | 30 | **0.10** | 1/1 | Yes | **FAIL** | 2 | UNVERIFIED 50% | 10 |
| SRG EN AFTER | 2 | 16 | 20 | 0.80 | 11/11 | Yes | PASS | 2 | LEAN-TRUE 68% | 54 |

**Quality gate pass rate: 3/8 (37.5%)**

---

## 4. The Research Funnel — Where Evidence Dies

This is the single most important finding. The pipeline's evidence acquisition has a devastating bottleneck:

```
Search Results (100-400)  →  Sources Fetched (1-14)  →  Evidence Extracted
      ↓ 0.5-13% survive              ↓ 75-100% succeed      ↓ 1.5-3.3 per source
```

### 4.1 Full Funnel Data

| Job | Searches | Results | Fetched | OK | Evidence | Results→Fetch | Ev/Source |
|-----|----------|---------|---------|-----|---------|---------------|-----------|
| SRG DE BEFORE | 30 | 190 | **1** | 1 | 2 | **0.5%** | 2.0 |
| H2 BEFORE | 18 | 108 | 14 | 11 | 25 | 13.0% | 2.3 |
| Bolsonaro BEFORE | 31 | 196 | 10 | 9 | 30 | 5.1% | 3.3 |
| SRG URL BEFORE | 70 | 429 | 11 | 10 | 4 | 2.6% | 0.4 |
| Bolsonaro AFTER | 31 | 196 | **5** | 5 | 15 | **2.6%** | 3.0 |
| H2 AFTER | 23 | 138 | 12 | 9 | 14 | 8.7% | 1.6 |
| SRG DE AFTER | 30 | 190 | **1** | 1 | 3 | **0.5%** | 3.0 |
| SRG EN AFTER | 20 | 130 | 11 | 11 | 16 | 8.5% | 1.5 |

### 4.2 The Bottleneck Is Source Selection, Not Search or Extraction

- **Search works fine**: 6+ results per query consistently.
- **Extraction works fine**: 1.5-3.3 evidence items per successful source.
- **Source selection is broken**: Only 0.5-13% of search results survive the filtering pipeline to become fetch candidates.

### 4.3 Source Selection Filtering Pipeline

The path from "search result" to "fetched source" passes through **5 filtering stages**:

```
Raw Search Results (6 per query)
    ↓
[1] Domain Pre-Filter — blocks blogspot, wordpress.com, medium.com, spam TLDs
    ↓
[2] selectDiverseSearchResultsByQuery — round-robin across queries, cap at maxSourcesPerIteration (DEFAULT: 4)
    ↓
[3] LLM Relevance Assessment — classifies as primary_source / secondary_commentary / unrelated
    Mode: STRICT (evidence + context), MODERATE (evidence), RELAXED (fallback)
    Only primary_source passes in STRICT/MODERATE modes
    ↓
[4] Adaptive Fallback — triggers if < 5 relevant results
    Step 1: relax institution match
    Step 2: relax context match
    Step 3: broad fallback queries
    ↓
[5] URL Deduplication — cross-iteration, normalized URLs
    ↓
1-14 Sources Actually Fetched
```

**The critical defaults:**
- `maxSourcesPerIteration = 4` — hard cap. Even if 50 results pass all filters, only 4 are fetched per iteration.
- `maxResults = 6` — only 6 results requested from search API per query.
- `adaptiveMinCandidates = 5` — fallback triggers when < 5 pass. But after fallback, domain pre-filter + dedup still applies.
- Evidence search mode = STRICT or MODERATE by default, which rejects `secondary_commentary`.

### 4.4 Why German Gets 1 Source vs English Gets 11

SRG German: 190 results → 1 fetched (0.5%).
SRG English: 130 results → 11 fetched (8.5%).

**Root causes:**
1. German search results have higher proportion of blog/WordPress/regional platforms → domain pre-filter rejects them.
2. LLM relevance assessment (Haiku) processes German snippets with English-first prompts → higher false-rejection rate.
3. Adaptive fallback runs, but domain filter still blocks German platform results.
4. The search API (SerpAPI) returns lower-authority German results vs. English (more .edu, .org, major news for English).

---

## 5. Before/After Comparison — What Phase 6-7 Fixes Changed

### 5.1 Bolsonaro: BEFORE (69%) vs AFTER (49%) — **20-point swing**

| Metric | BEFORE | AFTER | Δ |
|--------|--------|-------|---|
| Verdict | LEANING-TRUE 69% | MIXED 49% | **-20pp** |
| Contexts | 2 | 3 | +1 (added Lava Jato) |
| Evidence | 30 | 15 | **-50%** |
| Sources fetched | 10 | 5 | **-50%** |
| Hedging (45-55%) | 3/9 (33%) | 6/9 (67%) | +34pp |
| Gate 4 insufficient | 1 | 9 | **+8** |

**Assessment:** The AFTER run is objectively worse on every metric except report integrity. Fewer sources found, fewer evidence items, more hedging, worse quality gate. The verdict swung 20 points on identical input. This is unacceptable instability.

### 5.2 H2 vs EV: BEFORE (38%) vs AFTER (54%) — **16-point swing**

| Metric | BEFORE | AFTER | Δ |
|--------|--------|-------|---|
| Verdict | LEANING-FALSE 38% | MIXED 54% | **+16pp** |
| Claims | 7 | 11 | +4 |
| Contexts | 9 | 7 | -2 |
| Evidence | 25 | 14 | **-44%** |
| Publishable | 7/7 (100%) | 4/11 (36%) | **-64pp** |
| Contradiction | No | No | Still broken |

**Assessment:** BEFORE was the better result — higher evidence, all publishable, more differentiated verdicts. AFTER added claims but lost evidence. The contradiction search still doesn't fire for either run. The publishable rate collapsed from 100% to 36%.

### 5.3 SRG DE: BEFORE vs AFTER — **No improvement**

| Metric | BEFORE | AFTER | Δ |
|--------|--------|-------|---|
| Claims | 4 | 2 | -2 |
| Evidence | 2 | 3 | +1 |
| Sources fetched | 1 | 1 | 0 |
| Searches | 30 | 30 | 0 |
| Verdict | UNVERIFIED 50% | UNVERIFIED 50% | 0 |
| Confidence | 10 | 10 | 0 |

**Assessment:** The German language input is completely broken. Identical results across both runs. 30 searches → 190 results → 1 source → 2-3 evidence. The pipeline cannot analyze German-language claims.

### 5.4 SRG URL BEFORE — **Total failure persists**

18 claims, ALL at 50/50 fallback, report flagged as DAMAGED. 70 searches yielded only 4 evidence items from 10 successful source fetches (0.4 ev/source — even extraction failed here). The `maxOutputTokens` fix from Phase 6 either wasn't deployed or didn't help for this specific case.

### 5.5 Summary: What the Fixes Achieved

| Fix | Target | Observed Impact |
|-----|--------|----------------|
| maxOutputTokens 16384 (Phase 6) | SRG URL all-50/50 | **NOT CONFIRMED** — SRG URL still all-50/50 in today's BEFORE run |
| Decontextualized harmPotential (Phase 6) | HIGH inflation | **CANNOT VERIFY** — all claims are medium in all jobs today |
| Search circuit breaker (Phase 7) | Wasted API calls | **CANNOT VERIFY** — no per-iteration stats in result JSON |
| Outcome claim harmPotential (Phase 7) | Outcome HIGH fix | **NOT APPLICABLE** — zero outcome claims in today's jobs |

**Conclusion: None of the Phase 6-7 fixes produced a measurable improvement in today's results.** The fixes targeted real bugs, but the bugs were secondary symptoms. The primary problem — evidence famine from the source selection bottleneck — was never addressed.

---

## 6. Pattern Analysis — Systematic Problems

### 6.1 Evidence Famine Is the Root of All Quality Failures

Every quality problem traces back to insufficient evidence:

| Problem | How evidence famine causes it |
|---------|-------------------------------|
| Verdict hedging (45-55%) | LLM has little evidence → defaults to middle ground |
| Quality gate failures | Gate 4 requires evidence count + quality → starved claims fail |
| All-50/50 fallback | 0 evidence → structured output generates nothing → blanket 50/50 |
| Low confidence | Confidence calibrated from evidence diversity → thin evidence = low confidence |
| Instability (different verdicts) | With only 5-15 evidence items, small variations in which sources are fetched → large verdict swings |

### 6.2 LLM Non-Determinism Amplifies Instability

The UNDERSTAND step (claim decomposition) is the biggest source of run-to-run variation:

| Input | Run 1 | Run 2 | Variation |
|-------|-------|-------|-----------|
| H2 vs EV | 7 claims, 9 contexts | 11 claims, 7 contexts | 57% claim increase, different structure |
| Bolsonaro | 9 claims, 2 contexts | 9 claims, 3 contexts | Same count but different framing |
| SRG DE | 4 claims, 1 context | 2 claims, 1 context | 50% claim reduction |

**With thin evidence, decomposition variations have outsized impact.** If you have 30 evidence items (Bolsonaro BEFORE), distributing them across 2 vs 3 contexts still gives reasonable coverage. If you have 15 items (Bolsonaro AFTER), distributing across 3 contexts gives 5 per context — barely enough.

### 6.3 The Contradiction Search Paradox

H2 vs EV never fires contradiction search (both runs). Why? The contradiction search is "reserved" in the research budget but the pipeline exits before reaching it. The iteration budget is consumed by context-level evidence gathering, and the completion criteria don't enforce contradiction search strongly enough.

### 6.4 Language Is a First-Class Problem

| Metric | SRG DE (German) | SRG EN (English) | Gap |
|--------|----------------|-----------------|-----|
| Contexts | 1 | **8** | 8x |
| Evidence | 3 | **16** | 5x |
| Sources | 1 | **11** | 11x |
| Verdict | UNVERIFIED 50% | LEANING-TRUE 68% | 18pp |
| Confidence | 10 | 54 | +44 |
| Quality gate | FAIL | **PASS** | binary |

Same conceptual input. Fundamentally different analysis. This violates the project's multilingual robustness requirement.

---

## 7. What We Tried vs. What We Should Have Tried

### Phases 1-7: Where We Spent Effort

| Phase | Focus Area | Category |
|-------|-----------|----------|
| Phase 1-3 | Context ID stability, claim assignment, report assembly | Downstream plumbing |
| Phase 4 | harmPotential prompt, verdict direction correction | LLM behavior tuning |
| Phase 5 | Iteration budget scaling, Block 2 gate fix (planned) | Research loop control |
| Phase 6 | maxOutputTokens, decontextualized harmPotential | Verdict generation |
| Phase 7 | Search circuit breaker, outcome claims harmPotential | Research loop edge cases |

**All of these targeted downstream effects of evidence famine, not evidence famine itself.**

### What We Should Have Targeted

| Problem | Impact | What it takes |
|---------|--------|--------------|
| Source selection filtering (THE bottleneck) | 100-400 results → 1-14 sources | Loosen filters, increase per-iteration cap, improve language handling |
| Verdict batch size (all-or-nothing) | 18 claims → all fail together | Split into batches of 3-5 |
| Decomposition stability | Different structure each run | Structured constraints, temperature=0 |
| Per-context research allocation | Some contexts starved | Explicit budget per context |

---

## 8. Verdict: Incremental Patches Cannot Fix This

The pipeline has **10+ interacting control mechanisms** in the research loop:

1. `maxResearchIterations` (global cap)
2. `scaledMinEvidence` (completion threshold)
3. `contradictionSearchPerformed` (mandatory flag)
4. `inverseClaimSearchPerformed` (mandatory flag)
5. `contextBudget` (Block 2 gate)
6. `exhaustedContextNames` (circuit breaker — Phase 7)
7. Gap research (separate budget, 2 iterations)
8. Adaptive fallback (3-step graduated relaxation)
9. Central claim evidence check
10. Legal framework search
11. Recency-sensitive claims check

These interact in non-obvious ways. Adding the Phase 7 circuit breaker was mechanism #6. The Phase 5 plan proposed changing mechanisms #1, #2, and #5. Each addition makes the system harder to predict and debug.

**The right approach is not adding more mechanisms. It is simplifying the pipeline and fixing the actual bottleneck: source selection.**

---

## 9. Dynamic vs Orchestrated Pipeline Comparison

Jobs 9-10 used the `monolithic_dynamic` pipeline for the same SRG inputs. This provides a useful baseline:

| Metric | Orch DE | Dynamic DE | Orch EN | Dynamic EN |
|--------|---------|------------|---------|------------|
| Verdict | UNVERIFIED 50% | **LEANING-TRUE 62%** | LEAN-TRUE 68% | LEAN-TRUE 69% |
| Confidence | 10 | **40** | 54 | 57 |
| Findings/Claims | 2 | 4 | 2 | 6 |
| Citations/Evidence | 3 | 5 | 16 | 5 |
| Searches | 30 | **2** | 20 | **6** |
| Time | ~3 min | ~4 min | ~8 min | **~2 min** |

**Key observations:**
- The dynamic pipeline produces a better German result (62% vs 50%, conf 40 vs 10) with **15x fewer searches** (2 vs 30).
- For English, both pipelines converge on the same verdict (~68-69%) with similar confidence.
- The dynamic pipeline's language gap is smaller: 7pp verdict / 17pp confidence gap vs orchestrated's 18pp verdict / 44pp confidence gap.
- The dynamic pipeline self-identified 3/5 citations as irrelevant in the DE case — a useful quality signal the orchestrated pipeline lacks.

**Implication:** The orchestrated pipeline's complex research loop (30 searches, 10+ control mechanisms) does not outperform the dynamic pipeline's simpler approach for this class of inputs. The research loop complexity is net-negative for evidence-scarce topics.

---

## 10. Caveats and Limitations

**Per Codex review — these are important qualifications on the analysis:**

1. **Causal claim not experimentally isolated.** The conclusion that source selection is the root cause is based on funnel analysis, not A/B testing. A controlled experiment (change only `maxSourcesPerIteration` via UCM, re-run same inputs) is needed to confirm.

2. **Language gap root causes are hypotheses.** We inferred that domain pre-filter and LLM relevance assessment cause the German source rejection, but we have no per-stage rejection counts. Adding instrumentation to log filter-stage counts would confirm or refute this.

3. **Contradiction search assertion lacks per-iteration proof.** The H2 jobs show `contradictionSearchPerformed: false` in the result, but we don't have per-iteration decision logs showing *why* it didn't fire. The budget exhaustion theory is inferred from the code structure.

4. **SRG URL extraction failure (0.4 ev/source) was not investigated.** The SRG URL fetched 10 sources successfully but extracted only 4 evidence items (0.4/source vs normal 1.5-3.3/source). This could indicate an extraction prompt issue or unusually low-quality source content — a separate investigation point.

5. **BEFORE/AFTER commit boundary is uncertain.** The morning batch (7:45 AM) may or may not include Phase 7 commits depending on whether the dev server was restarted. The commit hashes for the running code are not logged in the job result.

### Recommended Follow-Ups

1. **A/B test:** Change only `maxSourcesPerIteration` (4→8) and `maxResults` (6→10) via UCM. Re-run SRG DE, SRG EN, Bolsonaro, H2. Compare funnel survival and QG pass rate.
2. **Add per-stage counters** to `researchStats` in the result JSON: counts for domain-filtered, LLM-relevance-rejected, dedup-filtered, and adaptive-fallback-recovered.
3. **Add language tag** to LLM relevance classification output to track false-reject rates by language.
4. **Investigate SRG URL extraction** — examine the 10 fetched source contents to understand why only 4 yielded evidence.

---

## Review Notes (Codex GPT-5)

**Reviewer:** Codex GPT-5 (Senior Developer)
**Date:** 2026-02-15
**Status:** Reviewed for accuracy, gaps, and AGENTS compliance impacts

### Strengths
- Data-driven funnel analysis ties evidence counts to quality gate failures.
- Before/after comparisons highlight instability and language gap.
- Clear separation of symptoms vs likely root cause.
- Inventory of research loop mechanisms helps scope redesign.

### Gaps and risks
- "All 10 jobs" claim vs master table covers 8 orchestrated jobs; dynamic runs are not summarized. Add a separate row set or clarify scope.
- Causal conclusion ("source selection is root cause") is plausible but not experimentally isolated; needs A/B confirmation.
- Language gap root causes are hypotheses; no direct evidence on LLM relevance false-reject rates by language.
- Contradiction search "never fires" is asserted without per-iteration metrics; add instrumentation to verify.
- SRG URL extraction failure (0.4 evidence/source) could indicate extraction prompt or source quality; not analyzed.

### Questions to resolve
- What commit/build hashes correspond to BEFORE vs AFTER runs?
- Are search result counts and filter-stage counts logged per iteration for these jobs?
- How many results are filtered at each stage (domain pre-filter, LLM relevance, dedup)?
- Did dynamic runs (jobs 9-10) show similar funnel collapse and language gap?

### Suggested follow-ups
- Run a controlled A/B: only change `maxSourcesPerIteration` and `maxResults` via UCM, re-run the same inputs, compare funnel survival and QG pass rate.
- Add per-stage counters to result JSON (or a debug log) for source selection stages to validate the funnel hypothesis.
- Add language-tagged metrics for relevance classification outcomes to confirm German false-rejects.
- Include a short "dynamic vs orchestrated" comparison section or explicitly exclude dynamic runs from headline stats.
