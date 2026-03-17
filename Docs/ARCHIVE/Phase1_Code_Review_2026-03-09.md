# Phase 1 Code Review — Full Findings, Proposals & Recommendations

**Date:** 2026-03-09
**Author:** Code Reviewer (Cursor, claude-4.6-sonnet)
**Commits reviewed:** `27c4ef44` (B1+B2+B5) and `8bef6a91` (B3+B4)
**Context:** Phase 1 of `Docs/WIP/Report_Quality_Analysis_2026-03-08.md` — addressing report variability and recurring imperfections across 7 local + 1 deployed Bolsonaro reports, plus SRG and Iran nuclear data.
**Risk assessment read:** `Docs/WIP/Phase1_Risk_Opportunity_Plan_2026-03-09.md`
**Status:** Both commits approved. 4 follow-up items required before Phase 2 begins (2 MEDIUM, 2 LOW).

---

## Overall Verdict

| Commit | What | Status |
|--------|------|--------|
| `27c4ef44` | B1 seed enrichment + B2 boundary fallback + B5 clustering temp | **Approved with follow-up** |
| `8bef6a91` | B3 verdict prompt + B4 AUTO mode stop | **Approved with follow-up** |

No blockers. Both commits may remain merged. Follow-up items 1 and 2 (MEDIUM) must be resolved before Phase 2 prompt work begins.

---

## Required Follow-up Items

### Item 1 — [MEDIUM] Unsafe `sourceType` cast

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
**Function:** `seedEvidenceFromPreliminarySearch()`
**Line (approx):** The assignment `sourceType: (pe.sourceType as import("./types").SourceType) ?? "other"`

**Problem:** `pe.sourceType` is typed as plain `string` in `CBClaimUnderstanding.preliminaryEvidence`. The `as SourceType` cast is a TypeScript compile-time assertion only — it performs zero runtime validation. If the LLM returns a value that is not in the `SourceType` enum (e.g. `"government_press_release"`, `"academic_paper"`, `"fact_check"` — all plausible LLM outputs), the bad string is silently stored as the `EvidenceItem.sourceType`. Any downstream code that switches or filters on `SourceType` (evidence-filter, source-reliability, aggregation) will either produce incorrect results or silently fall through to a default case.

**Why it matters now:** B1 is the first code path that propagates `sourceType` from a LLM-generated string into the structured `EvidenceItem`. Before B1, seeded items had no `sourceType` at all (fell through to `"other"` implicitly). Now they have one — but it may be wrong.

**Proposal:**

Replace the cast with a validated lookup:

```typescript
// 1. At the top of the file (or in types.ts), define the valid set once:
const VALID_SOURCE_TYPES = new Set<SourceType>([
  "peer_reviewed_study", "news_primary", "news_secondary",
  // ... all values from the SourceType enum in types.ts
]);

// 2. In seedEvidenceFromPreliminarySearch():
sourceType: (pe.sourceType && VALID_SOURCE_TYPES.has(pe.sourceType as SourceType))
  ? (pe.sourceType as SourceType)
  : "other",
```

This converts the silent failure into a deterministic `"other"` fallback, which is the correct behaviour for unknown types.

Alternatively, if `SourceType` is a Zod enum, use `SourceTypeSchema.safeParse(pe.sourceType).data ?? "other"`.

---

### Item 2 — [MEDIUM] Prompt example violates AGENTS.md Analysis Prompt Rules

**File:** `apps/web/prompts/claimboundary.prompt.md`
**Commit:** `8bef6a91` (B3)
**Location:** The second bullet added under "Distinguish factual findings from institutional positions"

**Current text (the problematic parenthetical):**
```
(e.g., a foreign government's diplomatic reaction to another jurisdiction's legal proceedings)
```

**Problem:** AGENTS.md Analysis Prompt Rules state: *"No test-case terms. Prompt examples must be abstract (e.g., 'Entity A did X'). This prevents teaching-to-the-test."*

The parenthetical is not a named entity, but its structural pattern — `"foreign government reacting to another jurisdiction's legal proceedings"` — is a precise description of the Bolsonaro test case scenario (U.S. government reacting to Brazilian STF/TSE proceedings). This is teaching-to-the-test through structural pattern encoding, even without naming the specific entities.

**Severity:** Does not cause functional regression today. **Must be fixed before any Phase 2 prompt work** because:
1. Phase 2 prompts will likely reference or extend the factual-vs-positional distinction introduced here
2. If the parenthetical is still present, Phase 2 drafts will inherit a test-case pattern and make it harder to detect the violation in a larger prompt body

**Proposal:**

The core analytical instruction in the second bullet is sound and must be preserved verbatim. Only the parenthetical changes. Replace:

> `(e.g., a foreign government's diplomatic reaction to another jurisdiction's legal proceedings)`

With an abstract equivalent:

> `(e.g., when an external actor's statement about another institution's internal processes is the only item in a boundary that contradicts the claim)`

This preserves the intent (single-item boundary, external actor, positional rather than factual output) without encoding any specific scenario pattern.

---

### Item 3 — [LOW] Missing test: stub `evidenceScope` fallback path

**File:** `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
**Suite:** `describe("seedEvidenceFromPreliminarySearch")`

**Problem:** The new test `"should preserve preliminary metadata needed downstream"` covers only the case where `pe.evidenceScope` is populated. The fallback stub path — triggered when `pe.evidenceScope` is `null` or `undefined` — produces:
```typescript
{ name: "Preliminary search result", methodology: "Preliminary search result", temporal: "", geographic: "" }
```

This stub path is the **higher-frequency production case**: the entire point of B1 is that preliminary evidence items are currently missing metadata. Items without an `evidenceScope` from the LLM are the majority of seeded items in real runs (28-70% per the data in the consolidated plan). The stub path's correctness is untested.

**Proposal:** Add a test in the `seedEvidenceFromPreliminarySearch` suite:
```typescript
it("should use stub evidenceScope when pe.evidenceScope is missing", () => {
  // build state with a preliminary evidence item that has no evidenceScope
  // seed it
  // assert: seeded item has evidenceScope.name === "Preliminary search result"
  // assert: seeded item has isSeeded === true
  // assert: seeded item has claimDirection === "neutral" (null pe.claimDirection → default)
  // assert: seeded item has sourceType === "other" (null pe.sourceType → default)
});
```

---

### Item 4 — [LOW] Missing test: `constituentScopes` tie-breaker path

**File:** `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
**Suite:** `describe("Stage 3: assignEvidenceToBoundaries")`

**Problem:** The test `"should assign unmatched items to the largest already-assigned boundary"` exercises the item-count discriminator (boundary A has 1 item, boundary B has 0 → unmatched goes to A). It does not cover the tie-break case: two boundaries with identical post-assignment counts, but different `constituentScopes` lengths. The tie-breaker logic is:
```typescript
if (count > maxCount || (count === maxCount && scopes > maxScopes)) { ... }
```
This is untested production logic.

**Proposal:** Add a test scenario where:
- Boundary X and Boundary Y both have 1 assigned scoped item
- Boundary X has `constituentScopes: [scopeA]` (length 1)
- Boundary Y has `constituentScopes: [scopeA, scopeB]` (length 2)
- An unmatched item should be assigned to Boundary Y

---

## Full Checklist Results

### Commit 1 — `27c4ef44` (B1+B2+B5)

#### B1 — Seed enrichment

| Item | Status | Detail |
|------|--------|--------|
| `seedEvidenceFromPreliminarySearch` propagates `claimDirection`, `sourceType`, `evidenceScope` | **PASS** | All three fields correctly mapped from `pe.*` to the seeded `EvidenceItem` |
| `"contextual"` → `"neutral"` mapping | **PASS** | Semantically correct. The `PreliminaryEvidenceItem` direction type includes `"contextual"` which has no equivalent in `EvidenceItem` — mapping to `"neutral"` is the right analytical choice |
| Stub `evidenceScope` fallback (`pe.evidenceScope` null/undefined) | **WARN** | Logic is correct but untested (Item 3 above) |
| `isSeeded` flag excludes items from `allClaimsSufficient` | **PASS** | Correctly forces Stage 2 main research regardless of how much preliminary coverage exists |
| `isSeeded` backward compatibility | **PASS** | Existing `EvidenceItem` objects have `isSeeded: undefined` (falsy) — the `!e.isSeeded` filter treats them as non-seeded, preserving prior behaviour |
| Data propagation chain intact | **PASS** | `extractPreliminaryEvidence` → adds `claimDirection`/`sourceType` to `PreliminaryEvidenceItem`; `extractClaims` → passes all three fields into `CBClaimUnderstanding.preliminaryEvidence`; `seedEvidenceFromPreliminarySearch` → reads them. Chain is complete. |
| `sourceType` type safety | **MEDIUM** | Unsafe `as SourceType` cast (Item 1 above) |

#### B2 — Fallback assignment

| Item | Status | Detail |
|------|--------|--------|
| Two-pass approach correctness | **PASS** | Pass 1 assigns scoped items by fingerprint; Pass 2 picks the largest post-assignment boundary for unmatched items. Counts are computed after Pass 1, so they reflect real assignments |
| Edge case: all boundaries empty | **PASS** | `boundaries[0]` is `undefined` → `fallback = undefined` → `if (fallback)` guard in assignment loop correctly skips. Items remain unassigned (consistent with prior behaviour) |
| Edge case: single boundary | **PASS** | Loop runs once, correctly selects the only boundary |
| Edge case: all items unmatched (all-zero counts) | **PASS** | `boundaryCounts` is all-zero; `count > maxCount` (0 > -1) is true for first boundary; tie-breaker by `constituentScopes` length picks the analytically richer boundary |
| Tie-breaking by `constituentScopes` | **WARN** | Logic is correct but untested (Item 4 above) |

#### B5 — Clustering temperature

| Item | Status | Detail |
|------|--------|--------|
| UCM schema declaration | **PASS** | `boundaryClusteringTemperature: z.number().min(0).max(1).optional()` with clear description |
| Schema transform default | **PASS** | Sets to `0.05` when field absent |
| `DEFAULT_PIPELINE_CONFIG` includes field | **PASS** | `boundaryClusteringTemperature: 0.05` |
| `pipeline.default.json` seeded | **PASS** | `"boundaryClusteringTemperature": 0.05` |
| Pipeline usage with fallback | **PASS** | `temperature: pipelineConfig.boundaryClusteringTemperature ?? 0.05` — the `?? 0.05` is a redundant double-default (schema already guarantees the value) but harmless |
| UCM tier placement | **PASS** | Correctly in pipeline config (UCM), not env var or hardcoded |

#### Tests — Commit 1

| Item | Status | Detail |
|------|--------|--------|
| Test: metadata preservation | **PASS** | Covers `claimDirection`, `sourceType`, `evidenceScope` propagation when all three are present in `pe.*` |
| Test: `isSeeded` exclusion from sufficiency | **PASS** | Correctly verifies that 3 seeded items do not satisfy threshold of 3 |
| Test: largest-boundary fallback | **PASS** | Exercises count-based discriminator (1 vs 0 items) |
| Test: clustering temperature threading | **PASS** | Verifies `generateText` is called with `temperature: 0.23` when config specifies `0.23` |
| Missing: stub evidenceScope fallback | **LOW** | See Item 3 |
| Missing: constituentScopes tie-breaker | **LOW** | See Item 4 |
| No hardcoded keywords | **PASS** | All test identifiers are abstract (`AC_01`, `EV_01`, `Evidence A`); no domain names |

---

### Commit 2 — `8bef6a91` (B3+B4)

#### B3 — Verdict prompt

| Item | Status | Detail |
|------|--------|--------|
| Factual-vs-positional distinction generic enough | **PASS** | First bullet explicitly protects "statistical publications, field measurements, compliance reports" — government data-heavy domains (health, census, environment) are covered |
| Government-data regression risk | **PASS** | The factual/positional split is defined by *output type*, not by *institution type*. A government's census data is factual; its diplomatic statement is positional. This is a sound framework that does not penalise government-as-source |
| AGENTS.md compliance — LLM intelligence | **PASS** | Prompt guides LLM reasoning with no keyword lists or hard classification rules |
| AGENTS.md compliance — no hardcoded keywords | **PASS** | No entity names, domain terms, or topic keywords in the added text |
| AGENTS.md compliance — generic by design | **PASS** | The framework applies identically to any domain |
| AGENTS.md compliance — input neutrality | **PASS** | The guidance does not depend on how the input was phrased |
| AGENTS.md Analysis Prompt Rules — no test-case patterns | **MEDIUM — WARN** | Second bullet parenthetical encodes Bolsonaro scenario pattern (Item 2 above) |
| Evidence-weighted contestation alignment | **PASS** | "Political disagreement alone does not constitute factual contradiction" directly reinforces AGENTS.md: "unsubstantiated objections … MUST NOT reduce a verdict's truth percentage" |
| Risk of over-classifying positional outputs | **PASS** | The prompt asks LLM to *assess* whether evidence is factual or positional — it does not mandate a classification. The LLM retains full reasoning authority |

#### B4 — AUTO mode

| Item | Status | Detail |
|------|--------|--------|
| Stop-on-first-success logic | **PASS** | `if (providerResults.length > 0) break` checks the current provider's results, not the cumulative total. Correct. |
| Supplementary provider gate | **PASS** | `primaryProviderKey !== "auto" \|\| results.length === 0` is a correct three-way gate: non-AUTO (always run), AUTO with results (skip), AUTO without results (run as fallback). Future-proof for when Wikipedia/Semantic Scholar/Google Fact-Check are implemented |
| Race conditions | **PASS** | Provider loop is sequential — no concurrency, no race conditions |
| Error handling | **PASS** | The `catch` block and `SearchProviderError` handling are unchanged from pre-fix code |
| Evidence diversity trade-off | **WARN (acknowledged)** | Stopping on first successful provider reduces per-query diversity. This is an intentional design trade-off (determinism over diversity) acknowledged in the risk plan. Monitor post-deploy evidence pool sizes vs. baseline. Not blocking. |
| Stop-before-filtering nuance | **LOW** | `providerResults.length > 0` is evaluated before any downstream deduplication/filtering. A provider that returns results which are all subsequently filtered could leave the pool thinner than expected. Low probability but worth tracking. |

---

## Cross-cutting

| Item | Status | Detail |
|------|--------|--------|
| Type safety overall | **PASS with exception** | Only the `sourceType` cast is a concern (Item 1). Rest of diff uses proper optional chaining and nullish coalescing throughout |
| Backward compatibility — `EvidenceItem.isSeeded` | **PASS** | Optional field; existing stored data has `undefined` (falsy), backward-compatible |
| Backward compatibility — `boundaryClusteringTemperature` | **PASS** | Optional in schema with default; existing UCM configs without this field will receive `0.05` |
| Backward compatibility — B3 prompt | **PASS** | Existing stored reports are unaffected. New runs will use the updated prompt |
| Backward compatibility — B4 AUTO mode | **PASS** | Non-AUTO search configurations are explicitly preserved (`primaryProviderKey !== "auto"` gate) |
| UCM alignment | **PASS** | `boundaryClusteringTemperature` is the only new configurable parameter; correctly in UCM pipeline config tier. No new env vars. |

---

## Architectural Observations for Phase 2

These are observations emerging from the review, not blocking findings. They are input for the Phase 2 plan.

### 1. Gate 1 is the dominant variance driver — investigate before wiring `minCoreClaimsPerContext`

The Iran nuclear case study (Appendix E, consolidated plan) showed: Haiku 4.5 produced 3 initial claims in both Run 1 and Run 2. Run 2 had 2 claims rejected by Gate 1, leaving only 1. The claim-count variance is in Gate 1 filtering, not in initial decomposition.

**Implication for Phase 2:** Wiring the `minCoreClaimsPerContext` reprompt loop (Phase 2.1) without first understanding why Gate 1 rejected 2/3 claims in Run 2 risks creating an expensive loop that fights an overly aggressive gate rather than fixing the root cause. Recommendation: **investigate Gate 1 threshold behaviour before implementing the reprompt loop**.

Specifically:
- What are the current Gate 1 acceptance criteria?
- What reasons were logged for the 2 rejected claims in Run 2?
- Is the threshold calibrated for compound inputs (multi-facet claims like the Iran case)?

### 2. Seeded mega-boundary: monitor but do not prematurely fix

B1 creates a `"Preliminary search result"` stub scope for all items without real scope data. These items will share an identical scope fingerprint and cluster into a single boundary during Stage 3. This is the "seeded mega-boundary" scenario noted in the risk plan.

This is strictly better than the pre-B1 behaviour (random `boundaries[0]` contamination). However, if the seeded mega-boundary exceeds ~50% of total evidence in a run, it will dominate the verdict and reduce the value of real boundaries.

**Recommendation:** For the first 5-10 post-deploy runs, log: (a) total seeded items, (b) total evidence items, (c) items assigned to any boundary whose `methodology === "Preliminary search result"`. If the ratio exceeds 50%, escalate to Option 1B (re-extract seeded items through Stage 2 with real scope data).

### 3. `sourceType` on preliminary evidence depends on Stage 1 LLM schema

B1's metadata enrichment works end-to-end only if the Stage 1 LLM extraction prompt returns `claimDirection` and `sourceType` for preliminary evidence items. If the Stage 1 extraction schema does not include these fields, `pe.claimDirection` and `pe.sourceType` will always be `undefined`, and the enrichment will silently fall back to `"neutral"` and `"other"` for all seeded items.

**Recommendation:** Verify that the Stage 1 extraction prompt/schema for `PreliminaryEvidenceItem` includes `claimDirection` and `sourceType` as output fields. If not, add them — otherwise B1's enrichment provides no real value.

### 4. AUTO mode stop-on-first-success and multi-provider evidence diversity

The stop-on-first-success change (B4) eliminates provider-mix variance, which is the stated goal. However, it also means that for any given search query, only one provider's index is searched. For topics where provider A (e.g. Bing) tends to return mainstream news and provider B (e.g. Google CSE) tends to return fact-checker sites, a run that happens to start with provider A will have systematically different evidence than a run starting with B.

**Recommendation for Phase 2:** When Brave Search is evaluated as a primary provider (per the search provider roadmap in the consolidated plan), include a comparison of evidence diversity across providers for 2-3 test topics before promoting it to priority 1. A provider that returns the most results is not necessarily the one that returns the most diverse or high-quality evidence.

---

## Summary: What the Next Agent (implementer) Needs to Do

In priority order:

1. **[MEDIUM — do first]** Fix the `sourceType` cast in `seedEvidenceFromPreliminarySearch` with a validated runtime lookup. See Item 1 for proposed implementation pattern.

2. **[MEDIUM — must do before Phase 2 prompt work]** Replace the parenthetical in the B3 verdict prompt second bullet with an abstract example. See Item 2 for proposed replacement text. This is a 1-line edit; the surrounding instruction is correct and unchanged.

3. **[Architectural — do before wiring Phase 2.1 reprompt loop]** Investigate Gate 1 filtering behaviour: why did it reject 2/3 claims in the Iran Run 2 scenario? What are the current thresholds and are they appropriate for compound inputs? Document findings before implementing `minCoreClaimsPerContext` enforcement.

4. **[LOW — next test pass]** Add test for stub `evidenceScope` fallback path in `seedEvidenceFromPreliminarySearch`. See Item 3 for test outline.

5. **[LOW — next test pass]** Add test for `constituentScopes` tie-breaker in `assignEvidenceToBoundaries`. See Item 4 for test scenario.

6. **[Verify — before declaring B1 complete]** Confirm that the Stage 1 LLM extraction schema for `PreliminaryEvidenceItem` includes `claimDirection` and `sourceType` as output fields. If not, B1's enrichment is producing only stub values and the fix is incomplete.
