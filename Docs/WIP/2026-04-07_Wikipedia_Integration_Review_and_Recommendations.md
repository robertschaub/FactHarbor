# Wikipedia Integration — Review and Recommendations

**Date:** 2026-04-07
**Role:** Lead Architect
**Status:** REVIEW-READY
**Method:** Three-agent investigation (code investigator, data analyst, skeptic) + empirical DB analysis, reconciled by Lead Architect

---

## 1. Executive Summary

Wikipedia is currently a bounded supplementary search provider contributing ~8% of evidence across jobs where it fires. The evidence quality is good (56% rated high probative value by the extraction LLM) and the Bolsonaro case shows genuinely valuable institutional background. However, the skeptic raised three serious concerns that should be addressed:

1. **No tertiary-source awareness in the extraction prompt** — Wikipedia evidence is treated identically to primary sources in verdict debates
2. **`always_if_enabled` mode is over-eager** — Wikipedia fires on every query even when primary providers return strong results, adding noise
3. **The `collaborative_reference` SR category with no score cap may over-credit Wikipedia** relative to its actual epistemic standing

**Recommendation:** Keep Wikipedia enabled but make three targeted adjustments: switch to `fallback_only` mode, add tertiary-source guidance to the extraction prompt, and run an A/B measurement to quantify impact.

---

## 2. What's Implemented

| Aspect | Current state |
|--------|--------------|
| Provider | `search-wikipedia.ts`, MediaWiki Action API |
| Enabled | Yes (default) |
| Role | Supplementary (not primary) — runs after Google CSE/Serper |
| Result cap | 3 URLs per query (`maxResultsPerProvider`) |
| Mode | `always_if_enabled` — fires even when primary succeeds |
| Language | Fully language-aware via `detectedLanguage` → correct subdomain |
| SR classification | `collaborative_reference` — no score cap |
| Evidence pipeline | Same as all other sources — no special treatment |
| EN supplementary lane | Exists but disabled (experimental) |
| Per-source evidence cap | 5 items per URL (FLOOD-1) |

---

## 3. Empirical Data (15 recent jobs with Wikipedia evidence)

| Metric | Value |
|--------|-------|
| Wikipedia share of evidence | 8.1% (61/753 items) |
| Direction distribution | 69% neutral, 16% supports, 15% contradicts |
| Probative value | **70% high**, 29% medium, 1% low (across 1,658 items in 261 jobs) |
| Language | 87% English, 13% German, **0% Portuguese** (PT inputs get EN Wikipedia — gap) |
| Max wiki items in one job | 14/87 (16%) — Bolsonaro trial |
| **sourceType misclassification** | **26.2% of Wikipedia items** classified as primary types (legal_document 8.6%, government_report 4.3%, peer_reviewed_study 1.7%, news_secondary 10.6%) |
| Jobs with Wikipedia (818 total) | 261/818 (32%) have at least one Wikipedia item |
| Avg evidence share | 9.9% (median 6.7%, max 45.9%) |

**Bolsonaro case (14 Wikipedia items):** Highly valuable. Items from `Brazilian_criminal_justice`, `Trial_for_the_2022–2023_coup_attempt`, `Sergio_Moro`, `Luiz_Inácio_Lula_da_Silva`. Includes Justice Fux's dissenting opinion, UN Human Rights Committee findings, indictment details. 10 rated high probative, 4 medium. This is institutional procedural background that web search may not surface as effectively.

**Typical case (1-6 items):** Neutral contextual background. Neither harmful nor decisive.

---

## 4. Adjudication: What the Skeptic Gets Right

### 4.1 Tertiary source blindness (ACCEPTED — HIGH)

The extraction prompt (`EXTRACT_EVIDENCE`) has no `encyclopedia` or `tertiary_reference` sourceType. Wikipedia evidence items get classified as `sourceType: "other"` or sometimes `news_secondary`. The extraction LLM assigns `probativeValue: "high"` to well-sourced Wikipedia paragraphs because they *read* authoritative — but they are summaries of primary sources, not primary evidence themselves.

In the verdict debate, Wikipedia evidence items compete with peer-reviewed studies, government reports, and expert statements as if they were equally primary. A Wikipedia paragraph summarizing three studies is counted as one evidence item with the same weight as one of those studies.

**This is epistemologically wrong** and should be addressed — not by removing Wikipedia, but by making the pipeline aware that encyclopedic evidence is contextual background, not primary proof.

### 4.2 `always_if_enabled` is over-eager (ACCEPTED — MEDIUM)

When Google CSE returns 8-10 strong results for "plastic recycling effectiveness," adding 3 Wikipedia encyclopedia articles on top adds extraction cost and potential dilution. The `fallback_only` mode already exists in the code and is tested. Switching to it requires a config change, not code.

**However**, for sparse-evidence topics (SRG SSR, niche Swiss claims, Oberentfelden), Wikipedia may be the only source of structured background. `fallback_only` would correctly fire in those cases.

### 4.3 `collaborative_reference` SR inflation (PARTIALLY ACCEPTED)

The skeptic argues Wikipedia shares the "anyone can edit" property with Reddit/Quora (which are blacklisted). This overstates the case — Wikipedia's editorial governance (citation requirements, review processes, vandalism prevention) is materially stronger than Reddit's. The `collaborative_reference` category is architecturally correct.

**However**, the NO CAP designation may be too generous. Wikipedia should not score above 0.7-0.8 — it is a well-governed encyclopedia, not a peer-reviewed journal. A soft cap (e.g., 0.75) would be more honest than NO CAP while still keeping it above the UGC floor (0.42).

### 4.4 Cross-linguistic Wikipedia bias (ACCEPTED AS RISK — needs measurement)

The German Wikipedia article on Kunststoffrecycling likely reflects EU/DACH recycling-positive editorial perspective. The English article may reflect US/UK recycling-skeptical framing. This is a plausible amplifier of the 58pp cross-linguistic spread, but it hasn't been measured.

The skeptic's proposed experiment — compare Plastik DE/EN/FR with and without Wikipedia — would quantify this. It's cheap and would settle the question empirically.

---

## 5. What the Skeptic Gets Wrong

### 5.1 "Wikipedia adds zero independent probative value" — REJECTED

The Bolsonaro case disproves this. Wikipedia's article on the 2022-2023 coup trial includes Justice Fux's dissenting opinion, the 4-1 vote breakdown, the UN Human Rights Committee ruling on Sergio Moro, and detailed procedural timelines. These are specific facts cited to primary legal documents. The extraction LLM correctly identifies them as high-probative because they ARE factual claims with citations — not vague summaries.

Wikipedia is not always low-value encyclopedic noise. For legal, political, and scientific topics, it often contains structured factual content that primary search results (news articles) present less systematically.

### 5.2 "Duplication with Google search" — PARTIALLY REJECTED

Google does return Wikipedia pages, but the dedicated provider searches Wikipedia's own index — which surfaces different articles than Google's ranked results. For "Bolsonaro trial compliance," Google might return the top-ranked news articles; the Wikipedia provider surfaces `Brazilian_criminal_justice` and `Trial_for_the_2022-2023_coup_attempt` which are background reference articles, not news coverage. These are complementary, not duplicative.

The URL-level dedup in `research-acquisition-stage.ts` already prevents fetching the same URL twice.

---

## 6. Recommendations

### Recommendation 1: Switch to `fallback_only` mode (config-only, immediate)

**Change:** In `search.default.json`, change `supplementaryProviders.mode` from `"always_if_enabled"` to `"fallback_only"`.

**Effect:** Wikipedia fires only when primary providers return insufficient results. For strong-evidence topics (Plastik, Bolsonaro with good web coverage), Wikipedia is suppressed. For sparse topics (SRG, niche Swiss claims), it still fires.

**Risk:** Low. The `fallback_only` path is already implemented and tested. Reversible via UCM.

**Measurement:** Run the 7-family validation batch before and after. Compare evidence counts and verdict quality.

### Recommendation 2: Add `encyclopedia` sourceType guidance to extraction prompt (prompt change)

**Change:** In `EXTRACT_EVIDENCE` prompt, add to the sourceType guidance:

> When the source is an encyclopedia, wiki, or collaborative reference platform (e.g., Wikipedia, Britannica), classify as `sourceType: "encyclopedia"`. Encyclopedic evidence provides useful background context but is a tertiary source — assign `probativeValue` no higher than `"medium"` unless the passage cites a specific primary source (study, legal document, official report) that is independently verifiable.

**Effect:** Wikipedia evidence items get correctly classified and appropriately capped in probative value. They still enter the evidence pool and contribute to verdicts — but as background context, not as primary proof.

**Risk:** Low-medium. Requires prompt change (human approval). Could slightly reduce evidence diversity for sparse-evidence topics where Wikipedia is the strongest source.

### Recommendation 3: Run A/B measurement on cross-linguistic impact (measurement)

**What:** Run Plastik DE/EN/FR with `fallback_only` (Wikipedia suppressed on strong-evidence queries) and compare to the current `always_if_enabled` baseline. Measure:
- Cross-linguistic spread (target: <58pp)
- Per-language Wikipedia item count
- Verdict direction stability

**Cost:** $3-5 in LLM calls. 30 minutes of execution time.

**Why:** Settles the cross-linguistic bias question empirically instead of theoretically.

### Recommendation 4: Do NOT cap `collaborative_reference` SR score (defer)

The NO CAP designation is defensible given Wikipedia's editorial governance. The skeptic's comparison to Reddit is too aggressive — Wikipedia's citation requirements, review processes, and vandalism prevention are materially different. If SR calibration is ever enabled (Stage 4.5, currently off), the SR evaluation LLM can assess Wikipedia's reliability per-article rather than per-platform.

**Defer** to the broader SR calibration work rather than adding a Wikipedia-specific cap.

### Recommendation 5: Do NOT increase `maxResultsPerProvider` beyond 3 (keep current)

My initial recommendation to increase to 5 was premature. The skeptic correctly notes that 3 URLs × 5 items per URL = 15 potential Wikipedia items per claim, which is already a significant fraction of the typical 15-25 item evidence pool. The current cap is correctly bounded.

### Recommendation 6: Fix Portuguese Wikipedia language routing

The data analyst found that Portuguese inputs get **0% pt.wikipedia.org results** — all Wikipedia evidence comes from en.wikipedia.org. This means the Bolsonaro PT family misses jurisdiction-specific Portuguese Wikipedia content (e.g., `pt.wikipedia.org/wiki/Processo_do_golpe_de_2022-2023`). The `detectedLanguage` threading should already route to `pt.wikipedia.org` — investigate whether the Portuguese language code is not being detected or not being passed through.

### Recommendation 7: Keep EN supplementary lane disabled (no change)

The lane is experimental and should remain off until the cross-linguistic neutrality gap is understood. Enabling it now would inject English-Wikipedia editorial perspective into non-English analyses — potentially helpful for coverage but also potentially amplifying the exact language bias we're trying to measure.

---

## 7. Implementation Priority

| # | What | Type | Effort | Priority |
|---|------|------|--------|----------|
| 1 | Switch to `fallback_only` mode | Config change | 5 min | **Now** |
| 2 | Run cross-linguistic A/B measurement | Measurement | 30 min | **Now** |
| 3 | Add `encyclopedia` sourceType to extraction prompt | Prompt change (needs approval) | 0.5 day | After measurement |
| 4 | SR collaborative_reference cap | Deferred | — | After SR calibration work |

---

## 8. What NOT to Change

| Item | Why not |
|------|---------|
| Disable Wikipedia entirely | Evidence quality is genuinely good (56% high probative). The Bolsonaro case shows clear value. |
| Remove `collaborative_reference` sourceType | Architecturally correct distinction from UGC. The governance IS different. |
| Enable EN supplementary lane | Cross-linguistic bias must be measured first. |
| Increase result cap | 3 URLs is correctly bounded for a supplementary provider. |
| Add Wikipedia-specific pipeline handling | Violates the Generic by Design rule. Fix at the extraction prompt level, not with per-source code logic. |

---

## 9. Final Judgment

**Wikipedia integration is net-positive but should be tightened from `always_if_enabled` to `fallback_only` and the extraction prompt should learn to recognize encyclopedic sources.** The current design is well-bounded and the evidence quality data is better than expected. The skeptic's concerns about tertiary-source blindness and over-eager supplementary firing are valid and addressable. The cross-linguistic amplification risk is plausible but unmeasured — the A/B experiment should settle it.
