# Google Fact Check API Cross-Reference Enhancement — Implementation Plan

**Date:** 2026-04-06
**Role:** Lead Architect
**Status:** DEFERRED — empirical testing (§14) shows 0/10 semantically relevant matches for FactHarbor's input families. The ClaimReview database covers viral misinformation debunks, not broad evaluative claims.
**Parent:** `2026-04-06_OSINT_Tool_Integration_Proposal.md` (Tier 1)

---

## 1. Executive Summary

FactHarbor already has a [Google Fact Check Tools API](https://developers.google.com/fact-check/tools/api) integration (`search-factcheck-api.ts`) including a structured query function (`queryFactCheckApi()`). However, it is only used as a supplementary search provider — ClaimReview data (publisher, textual rating, review URL) flows through as generic `WebSearchResult` entries, losing its structured signal.

This plan promotes the Fact Check API from "search result" to **first-class claim cross-reference**. After Stage 1 extracts AtomicClaims, a lightweight cross-reference step queries the API for each claim and attaches matching prior fact-checks as structured metadata. This metadata flows through the pipeline as context — not as evidence that binds the verdict, but as a transparency signal.

**Result:** FactHarbor reports can say "This claim was also assessed by Snopes as Mostly True" with publisher attribution and link. Zero new infrastructure. Zero additional API cost.

**Timing context:** In June 2025, [Google retired ClaimReview snippet visibility in Search results](https://www.poynter.org/ifcn/2025/google-claimreview-fact-checks-snippets-removed/), meaning users can no longer discover prior fact-checks organically through Google Search. The API itself still works and returns structured data. This makes FactHarbor's cross-reference integration **more valuable** — it fills a visibility gap that Google just created. However, ClaimReview adoption by publishers may decline over time if Google no longer rewards it, which is a medium-term data freshness risk to monitor.

---

## 2. What Exists Today

### Code

- `apps/web/src/lib/search-factcheck-api.ts`
  - `searchGoogleFactCheck(options)` — search provider for `web-search.ts` AUTO mode (line 38)
  - `queryFactCheckApi(query, options)` — structured query returning `FactCheckApiResult` with full `FactCheckClaim[]` including publisher, textualRating, reviewDate, claimant (line 140)
  - Types: `FactCheckClaim`, `FactCheckReview`, `FactCheckApiResult` (lines 10-32)

### Current usage

`searchGoogleFactCheck` is registered as a search provider. When enabled, it contributes results to the general evidence pool during Stage 2. The structured `queryFactCheckApi` function exists but is **never called** from the analysis pipeline.

### What's lost

When ClaimReview results flow through as `WebSearchResult`, the pipeline receives:
- `url` (fact-check article URL)
- `title` (article title)
- `snippet` (formatted as `[Publisher] Rating: Claim text`)

But it loses:
- Structured `publisher.name` and `publisher.site`
- Structured `textualRating` (e.g., "Mostly True", "False", "Teilweise wahr")
- `reviewDate` (when the fact-check was published)
- `claimant` (who originally made the claim)
- `claimDate` (when the claim was first made)
- The fact that this is a **prior fact-check**, not just another search result

---

## 3. Proposed Design

### 3.1 New cross-reference step

**When:** After Pass 2 produces final AtomicClaims, before Stage 2 research begins. Runs in parallel with preliminary evidence remap and contract validation (non-blocking).

**What:** For each AtomicClaim, query the Google Fact Check API using the claim statement as the search query. Attach matching prior fact-checks to the claim as structured metadata.

**Where:** New function `crossReferenceFactChecks()` in `claim-extraction-stage.ts` or a new `factcheck-crossref.ts` module.

### 3.2 Data model

```typescript
interface PriorFactCheck {
  publisher: string;       // e.g., "Snopes", "AFP Fact Check", "PolitiFact"
  publisherSite: string;   // e.g., "snopes.com"
  rating: string;          // e.g., "Mostly True", "False", "Teilweise wahr"
  url: string;             // Link to the fact-check article
  reviewDate?: string;     // When the fact-check was published
  claimText: string;       // The claim text as indexed by the API
  claimant?: string;       // Who originally made the claim
}
```

Stored on the understanding object:
```typescript
interface CBClaimUnderstanding {
  // ... existing fields ...
  priorFactChecks?: Record<string, PriorFactCheck[]>;  // keyed by claimId
}
```

### 3.3 Pipeline integration points

| Stage | How prior fact-checks are used | Mechanism |
|-------|-------------------------------|-----------|
| **Stage 1** (extraction) | Cross-reference query after Pass 2 | New `crossReferenceFactChecks()` call |
| **Stage 2** (research) | Query generation sees prior fact-checks as context | `priorFactChecks` passed to `GENERATE_QUERIES` template |
| **Stage 4** (verdict) | Advocate/Reconciler see prior fact-checks in evidence portfolio | Included alongside `sourcePortfolioByClaim` |
| **Stage 5** (report) | Report narrative references prior assessments | `VERDICT_NARRATIVE` sees `priorFactChecks` |
| **Result JSON** | Persisted for UI display | Stored in `resultJson.understanding.priorFactChecks` |

### 3.4 Analytical independence

**Critical design rule:** Prior fact-checks are **context, not evidence.** They inform the LLM that this claim has been assessed before, but FactHarbor produces its own independent verdict. The LLM prompt must say:

> "Prior fact-checks by other organizations are provided for context and transparency. They do NOT determine your verdict. Your assessment must be based on the evidence in the evidence pool. Reference prior fact-checks in the report narrative for user transparency, not as analytical input."

This ensures FactHarbor's verdicts remain independently derived while being transparent about prior work.

### 3.5 Report output

The report narrative (`VERDICT_NARRATIVE`) includes a section like:

> **Prior assessments:** This claim was also assessed by:
> - Snopes (2025-08-15): "Mostly True" — [link]
> - AFP Fact Check (2025-09-02): "Partially Correct" — [link]

This is a transparency feature, not an analytical dependency.

---

## 4. Implementation Details

### 4.1 Cross-reference function

```typescript
// In claim-extraction-stage.ts or new factcheck-crossref.ts

import { queryFactCheckApi, FactCheckClaim } from "@/lib/search-factcheck-api";

export async function crossReferenceFactChecks(
  claims: AtomicClaim[],
  detectedLanguage?: string,
): Promise<Record<string, PriorFactCheck[]>> {
  const result: Record<string, PriorFactCheck[]> = {};
  
  // Batch: one API call per claim (API doesn't support batch)
  // Use Promise.all with concurrency limit
  await Promise.all(claims.map(async (claim) => {
    try {
      const apiResult = await queryFactCheckApi(claim.statement, {
        maxResults: 5,
        languageCode: detectedLanguage,
      });
      
      const matches: PriorFactCheck[] = [];
      for (const fc of apiResult.claims ?? []) {
        for (const review of fc.claimReview ?? []) {
          matches.push({
            publisher: review.publisher.name,
            publisherSite: review.publisher.site,
            rating: review.textualRating,
            url: review.url,
            reviewDate: review.reviewDate,
            claimText: fc.text,
            claimant: fc.claimant,
          });
        }
      }
      
      if (matches.length > 0) {
        result[claim.id] = matches;
      }
    } catch {
      // Non-fatal — cross-reference is best-effort
    }
  }));
  
  return result;
}
```

### 4.2 UCM configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `factCheckCrossReferenceEnabled` | boolean | `true` | Enable/disable the cross-reference step |
| `factCheckCrossReferenceMaxPerClaim` | number | `5` | Max prior fact-checks to return per claim |

Added to pipeline config schema in `config-schemas.ts` and `pipeline.default.json`.

### 4.3 Prompt additions (minimal)

**GENERATE_QUERIES:** Add optional `${priorFactChecks}` variable. When present, the query LLM sees: "Note: This claim has been previously assessed by [publishers]. You may use this to focus queries on aspects not already covered, but generate queries independently."

**VERDICT_NARRATIVE:** Add `${priorFactChecks}` variable. Instruction: "If prior fact-checks exist for any claim, include a 'Prior Assessments' subsection listing publisher, rating, date, and link. This is for user transparency."

### 4.4 What NOT to change

| Item | Why not |
|------|---------|
| Verdict debate prompts (ADVOCATE/CHALLENGER/RECONCILIATION) | Prior fact-checks should not influence the independent assessment. Keep them out of the verdict debate. |
| D5 sufficiency | Prior fact-checks are not evidence items |
| Evidence filter | Prior fact-checks bypass the evidence pipeline entirely |
| Stage 2 search providers | The existing `searchGoogleFactCheck` provider stays as-is for evidence discovery. The cross-reference is a separate, earlier step. |
| Source reliability | Prior fact-check publishers are not SR-scored |

---

## 5. Cost and Performance

| Metric | Value |
|--------|-------|
| API cost | Free (Google Fact Check API with API key, generous quota) |
| Latency per claim | ~200-500ms (one HTTP call to Google) |
| Total latency | ~1-2s for 2-3 claims (parallel) |
| When it runs | After Pass 2, parallel with contract validation |
| Failure mode | Fail-open — if API is down or returns no results, pipeline continues without cross-reference |

---

## 6. Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|:---:|-----------|
| **ClaimReview database becomes stale** | MEDIUM | MEDIUM over 1-2 years | Google [retired ClaimReview visibility in Search](https://www.poynter.org/ifcn/2025/google-claimreview-fact-checks-snippets-removed/) in June 2025. If publishers stop tagging fact-checks because Google no longer rewards it, the API database stops growing. The existing 250k+ fact-checks remain, but new claims may not be covered. Monitor match rates quarterly. |
| **API deprecation** | HIGH if occurs | LOW near-term | Google has not announced API deprecation — only Search snippet visibility was removed. The [API documentation](https://developers.google.com/fact-check/tools/api) is still active. But the precedent (CrowdTangle shutdown, ClaimReview snippet removal) suggests Google may eventually deprioritize the API too. Keep the integration UCM-togglable for easy disable. |
| **Analytical contamination** | HIGH if design fails | LOW with correct design | If prior fact-checks leak into the verdict debate (not just narrative), FactHarbor's verdicts would no longer be independent. Strict prompt discipline: prior fact-checks appear ONLY in report narrative and query guidance context, NEVER in verdict debate prompts. |
| **False matches** | LOW | MEDIUM | The API matches by keyword similarity, not semantic equivalence. A claim about "plastic recycling in Switzerland" might match a fact-check about "plastic recycling in the US." Mitigate by showing the matched claim text alongside the rating so users can judge relevance. |

---

## 7. Strategic Context: Google's ClaimReview Retreat

In June 2025, Google [removed ClaimReview snippet visibility from Search results](https://factcheckafrica.net/google-drops-claimreview-undermining-verified-information-visibility-following-metas-end-of-fact-checking-program/), following Meta's shutdown of CrowdTangle and its fact-checking program. This means:

- **Users can no longer discover prior fact-checks through normal Google searches.** The rich snippets with publisher attribution and ratings are gone from the SERP.
- **The Fact Check Tools API still works.** The structured ClaimReview database (250k+ tagged fact-checks) remains queryable programmatically.
- **FactHarbor fills a new gap.** By surfacing prior fact-checks in its reports, FactHarbor provides transparency that Google Search no longer offers. This is a differentiator.
- **Long-term data freshness risk.** If publishers stop investing in ClaimReview markup because Google no longer rewards it, the API database may stop growing. The existing archive remains valuable, but coverage of new claims may decline. FactHarbor should track match rates over time and consider alternative cross-reference sources (IFCN database, individual publisher APIs) if the Google database stagnates.

This context strengthens the case for implementing the cross-reference now — while the database is still actively maintained and before any potential API deprecation.

---

## 8. Validation Plan

### Test cases

1. **Input with known prior fact-checks** (e.g., "The Earth is flat"): Expect ≥1 prior fact-check from a known publisher
2. **Input with no prior fact-checks** (e.g., niche local claim): Expect empty `priorFactChecks`, pipeline unaffected
3. **API key missing/invalid**: Expect graceful degradation, no pipeline failure
4. **Non-English input** (e.g., Plastik DE): Expect language-appropriate results if available

### Success criteria

- Prior fact-checks appear in result JSON when they exist
- Verdict is analytically independent (same truth/confidence range with and without cross-reference)
- No latency regression >2s on typical runs
- Report narrative includes "Prior Assessments" section when matches exist
- Zero pipeline failures from cross-reference errors

---

## 7. Implementation Sequence

| Step | What | Type | Effort |
|------|------|------|--------|
| 1 | Add `PriorFactCheck` type + `crossReferenceFactChecks()` function | Code | 0.5 day |
| 2 | Wire into `extractClaims()` after Pass 2, store on understanding | Code | 0.5 day |
| 3 | Add UCM config fields | Code + config | 0.25 day |
| 4 | Add `${priorFactChecks}` to `VERDICT_NARRATIVE` prompt | Prompt (needs approval) | 0.25 day |
| 5 | Persist in result JSON, verify in UI | Code | 0.25 day |
| 6 | Tests + validation runs | Test | 0.5 day |

**Total: ~2 days**

---

## 10. Debate Reconciliation

A structured debate was run with a skeptical Code Reviewer/Product Strategist challenging the proposal.

### Accepted critique (plan revised)

1. **Analytical contamination via query generation (HIGH).** The original plan injected prior fact-checks into `GENERATE_QUERIES`. This creates anchoring bias — the LLM would subtly shift query selection toward evidence corroborating the prior rating. **Revised: prior fact-checks appear ONLY in `VERDICT_NARRATIVE` (Stage 5 report). Removed from Stage 2 and Stage 4 entirely.**

2. **Stage 4 contradiction (HIGH).** The plan simultaneously said prior fact-checks appear "alongside sourcePortfolioByClaim" in verdict debate AND that verdict prompts should not be changed. **Revised: unambiguously excluded from all Stage 4 inputs. Narrative only.**

3. **Enable existing search provider first (MEDIUM).** Before building a new pipeline step, flip `googleFactCheck.enabled` to `true`, run 7 test families, measure match rates. If the search-provider path delivers most of the value, the structured cross-reference becomes a nice-to-have. **Revised: implementation now has Phase 0 (15-min config change + measurement) before any code work.**

4. **ClaimReview database staleness (MEDIUM).** **Revised: Phase 0 includes a spot-check of API freshness for 5-10 recent claims.**

### Partially accepted

5. **Low hit rate (~30% for test families).** Valid for current niche test inputs (SRG, wind-still.ch won't match). But real-world user inputs (political, health, science claims) are more likely to have prior fact-checks. The test set underestimates production value. Still, the plan should be honest: **this is a transparency enhancement with variable coverage, not a core analytical feature.**

6. **Wrong priority (HIGH).** The 58pp cross-linguistic neutrality gap and SRG decomposition ARE more important. **However, Phase 0 is a 15-minute config change — it costs almost nothing. The full Phase 1 (1 day) should be deferred until quality gaps are addressed.**

### Rejected

7. **False match semantic filtering (LOW).** Adding an LLM relevance call per match undermines the "zero cost" premise. **Compromise: the narrative LLM in VERDICT_NARRATIVE already has analytical judgment — it can decide whether to reference a match. No additional filtering step needed.**

---

## 11. Revised Implementation Plan (Post-Debate)

### Phase 0: Measure first (15 minutes, do now)

1. Enable `googleFactCheck` search provider by default in `search.default.json`
2. Run 7 test families (Flat Earth, Homeopathy, Plastik EN, Bolsonaro, Hydrogen, SRG, wind-still.ch)
3. Measure: how many return ClaimReview results? Are the matches relevant?
4. Spot-check API freshness: query 5 recent claims (last 3 months), verify database has recent entries

**Decision gate:** If ≥3/7 families return relevant matches AND the database has entries from the last 3 months, proceed to Phase 1. Otherwise, defer the entire feature.

### Phase 1: Data-only cross-reference (~2 hours, after Phase 0 validates)

Minimal viable integration — data attachment only, zero prompt changes, zero analytical influence.

1. Add `PriorFactCheck` type to `types.ts` + `priorFactChecks?: Record<string, PriorFactCheck[]>` on `CBClaimUnderstanding`
2. New `crossReferenceFactChecks()` function calling existing `queryFactCheckApi()` per claim
3. Wire into `extractClaims()` after Pass 2 (parallel with contract validation, non-blocking)
4. Persist in result JSON via `understanding.priorFactChecks`
5. UCM toggle: `factCheckCrossReferenceEnabled` (default true if API key present)
6. **NO prompt changes in Phase 1. NO analytical pipeline integration. Data only.**

### Phase 2: Report narrative (0.5 day, after Phase 1 proves value)

- Add `${priorFactChecks}` to `VERDICT_NARRATIVE` prompt: "Prior Assessments" section
- Still NOT in GENERATE_QUERIES, NOT in verdict debate prompts

### Phase 3: Deferred enhancements

- Report UI: dedicated "Prior Assessments" panel
- Semantic relevance filtering (if false match rate is high)
- Alternative cross-reference sources (IFCN database) if Google API stagnates
- Match rate monitoring metric

### What explicitly NOT to do

| Item | Why not |
|------|---------|
| Inject prior fact-checks into GENERATE_QUERIES | Analytical contamination — biases evidence pool |
| Inject into VERDICT_ADVOCATE/CHALLENGER/RECONCILIATION | Undermines independent assessment |
| Add semantic filtering LLM call per match | Undermines zero-cost premise; VERDICT_NARRATIVE LLM can filter |
| Build Phase 1 before Phase 0 measurement | Invest 1 day only if data justifies it |
| Prioritize over cross-linguistic neutrality work | 58pp Plastik spread is more important than transparency cosmetics |

---

## 12. Final Judgment (Revised)

**`Phase 0 measurement justified now; Phase 1 deferred until quality gaps addressed`**

The debate revealed two design flaws (query contamination, Stage 4 contradiction) and a priority concern (open quality gaps). The revised plan fixes the contamination by restricting prior fact-checks to narrative-only, and gates the full implementation behind a cheap measurement step. Phase 0 (enable existing search provider, measure match rates) costs 15 minutes and answers the key feasibility question. Phase 1 (structured cross-reference, 1 day) should wait until the cross-linguistic neutrality gap and SRG decomposition are addressed.

---

**Recommended next task:** Phase 0 — enable Google Fact Check search provider and measure match rates

**Why this first:** It's a 15-minute config change that answers the critical feasibility question (does the API return relevant results for our inputs?) without investing engineering time. If the answer is "rarely," the entire feature can be deprioritized. If the answer is "yes, for 3+ families," Phase 1 is justified after quality work.

---

## 13. Reality Check (Deep Analysis, 2026-04-06)

### Critical finding: the API has never been tested

The entire proposal was built on speculation. Verified facts:

| Check | Finding |
|-------|---------|
| API key configured | **No** — `GOOGLE_FACTCHECK_API_KEY` commented out in `.env.local` |
| API ever called from pipeline | **No** — provider disabled (`enabled: false`), `queryFactCheckApi` never invoked |
| API accessible without key | **No** — returns HTTP 403 |
| Match rates for our inputs | **Unknown** — cannot test without API key |
| API doc freshness | Last updated **May 2023** — 3+ years old, still `v1alpha1` |
| Quota/pricing | **Undocumented** |
| ClaimReview incentive for publishers | **Removed** by Google June 2025 ([source](https://www.poynter.org/ifcn/2025/google-claimreview-fact-checks-snippets-removed/)) |

### What must happen before any implementation

1. Get a Google Fact Check API key (5 min, Google Cloud Console)
2. Run 10 test queries covering all families:
   - Flat Earth, Homeopathy, Plastik EN, Bolsonaro, Hydrogen, SRG, Global warming, Sexual orientation, BBC fact-checking, wind-still.ch
3. For each: record match count, relevance, publisher, recency of newest entry
4. Decision gate: if <3/10 return semantically relevant matches with entries from the last 6 months, defer the entire feature

### Status

All prior sections of this plan (Phases 0-3, architecture, prompts) remain valid as a design IF the empirical validation passes. But no implementation work should begin until the match rate data exists.

---

## 14. Empirical Test Results (2026-04-07)

API key obtained and configured. 10 queries tested against the live Google Fact Check API covering all FactHarbor input families.

### Results

| # | Family | Query | Results | Semantically relevant? | Newest entry |
|---|--------|-------|:---:|:---:|:---:|
| 1 | Flat Earth | "flat earth" | 5 | **No** — about specific hoax posts ("Hillary Clinton confirmed earth is flat"), not the general claim | Feb 2026 |
| 2 | Homeopathy | "homeopathy effective treating diseases" | **0** | — | — |
| 3 | Plastik EN | "plastic recycling pointless useless" | **0** | — | — |
| 4 | Bolsonaro | "Bolsonaro trial compliance Brazilian law" | **0** | — | — |
| 5 | Hydrogen | "hydrogen cars more efficient electricity" | **0** | — | — |
| 6 | SRG SSR | "SRG SSR fact checking" | **0** | — | — |
| 7 | Global warming | "global warming human caused climate change" | 5 | **Tangential** — about specific denial posts, not the general scientific claim | Dec 2023 (2+ years stale) |
| 8 | Sexual orientation | "sexual orientation determined after birth" | **0** | — | — |
| 9 | BBC | "BBC fact checking reliable" | 1 | **No** — about AI chatbot accuracy, not BBC reliability | May 2025 |
| 10 | Wind energy | "wind energy Switzerland efficiency" | **0** | — | — |

### Assessment

- **3/10 queries returned results. 0/10 returned semantically relevant matches.**
- ClaimReview covers specific viral misinformation debunks ("Did X say Y?"), not broad evaluative claims ("Is plastic recycling pointless?", "Were the Bolsonaro trials fair?").
- The Flat Earth and Global warming matches are about specific social media hoax posts, not the general claims FactHarbor decomposes.
- 7/10 families have zero coverage in the database.
- The Global warming entries are 2+ years old — suggesting the database is not actively growing for non-viral topics.

### Decision

**DEFER the entire feature.** The Google Fact Check API database does not match FactHarbor's use case. The infrastructure exists and works, but the content coverage is wrong. Revisit only if:
- FactHarbor expands to viral misinformation debunking (specific false claims)
- The ClaimReview database significantly expands to cover evaluative/analytical claims
- An alternative prior-fact-check database emerges with broader topical coverage
