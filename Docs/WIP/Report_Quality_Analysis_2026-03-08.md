# Report Quality Analysis — Variability & Imperfections (Consolidated)

**Date:** 2026-03-08
**Author:** Lead Architect (Claude Code, Opus 4.6) — consolidated from dual-agent analysis
**Status:** Phase 2.3 complete (commit `5120b864`). Phase 2.4 (SR Cache TTL) next. Phase 1 code fixes deployed.
**Reviews:** Review 1 (Sr. Developer + LLM Expert): endorsed all architect recommendations, validated root causes. Review 2 (Implementation review): confirmed correct files, functions, and execution sequence. Review 3 (discarded): hallucinated implementation, no real code changes.
**Scope:** Systematic analysis of report variability and recurring imperfections across local and deployed systems
**Prerequisite:** Builds on Phase 1 fixes from `Report_Variability_Consolidated_Plan_2026-03-07.md`
**Methodology:** Three rounds of dual-agent analysis (Opus + Sonnet). Round 1: data patterns + code deep-dive. Round 2: temporal reliability + fix conflicts. Round 3: boundary structural instability. Disagreements resolved through code verification.

---

## 0. Captain's Brief

> **Captain's input (verbatim):**
>
> Now after some improvements, there are still concerning variations and also clear imperfections with reports, look into the reports, analyze in detail and find out what could be the reason.
> See current data on both systems — local and on deployed app.factharbor.ch
>
> 1. Equal inputs produce clearly different reports.
>    There are still often differences within one system but also between systems.
>
> 2. On the Bolsonaro legal cases input, there are sometimes recurring imperfections:
>    a) "U.S. government assessment" contradicting evidence are downgrading the verdict — this should not happen, these are clearly baseless and should be treated accordingly. But make sure you respect the Agent rules!
>    b) Sometimes it is not detected that there were more than one legal cases (STF and TSE).
>    c) Sometimes it happens again that it's not recognized that there was a verdict on the Coup trial.

**Captain explicitly requires:** Fixes must respect AGENTS.md rules (LLM intelligence, no hardcoded keywords, generic by design, input neutrality).

---

## 1. Executive Summary

The dual-agent analysis reveals the issues are deeper than initially thought. The dominant problem is **not prompt quality or LLM judgment** — it's a **data quality gap in the evidence pipeline** that corrupts everything downstream.

**Critical discovery:** `seedEvidenceFromPreliminarySearch()` creates evidence items missing `sourceType`, `claimDirection`, and `evidenceScope`. These items (28-70% of ALL evidence in every report) then:
1. Fall through to `boundaries[0]` in assignment — whichever boundary is first gets ALL the scopeless items (explains the 40-item U.S. boundary in one report)
2. Count as "neutral" in evidence balance checks — breaking contrarian retrieval detection
3. Pass through evidence filters unexamined — no `sourceAuthority` means opinion sources aren't caught

This single code issue is the root cause of multiple symptoms the Captain reported.

**Five root causes, ranked by impact:**

| # | Root Cause | Impact | Captain Issues |
|---|-----------|--------|---------------|
| RC-1 | **Seeded evidence data gap** (code bug) | Every run affected, 28-70% of evidence | 1, 2a, 2b, 2c |
| RC-2 | **Boundary fallback assignment** (code bug) | Randomly assigns scopeless items to boundaries[0] | 2a (40-item U.S. boundary) |
| RC-3 | **Third-party political evidence in verdict** (prompt gap) | 15-40 pp verdict degradation | 2a |
| RC-4 | **Claim decomposition instability** (LLM variance) | Up to 37 pp truth swing | 1 |
| RC-5 | **AUTO mode provider mixing** (code behavior) | Adds noise to evidence pool | 1 |

---

## 2. Data Collection

### 2.1 Local system (7 Bolsonaro reports)

| Job ID | Lang | Truth | Verdict | Conf | Claims | STF | TSE | U.S. Boundary |
|--------|------|-------|---------|------|--------|-----|-----|---------------|
| `4a3740ed` | EN | 69 | LEANING-TRUE | 71 | 2 | Yes | Yes | truth=8 (!) |
| `2a867099` | EN | 85 | MOSTLY-TRUE | 78 | 1 | Yes | Yes | No |
| `2c7e10c2` | PT | 82 | MOSTLY-TRUE | 85 | 1 | Yes | No | No |
| `1a4f7f33` | PT | 85 | MOSTLY-TRUE | 78 | 1 | Yes | No | No |
| `2acb6420` | EN | 73 | MOSTLY-TRUE | 75 | 1 | Yes | No | truth=65 |
| `b32cbcaf` | EN | 68 | LEANING-TRUE | 68 | 1 | Yes | Yes | truth=65, **40 items(!)** |
| `a62db574` | EN | 72 | MOSTLY-TRUE | 65 | 1 | Yes | Yes | No |

### 2.2 Deployed system (app.factharbor.ch)

| Job ID | Truth | Verdict | Conf | U.S. Boundary |
|--------|-------|---------|------|---------------|
| `1acfe98d` | 78 | MOSTLY-TRUE | 70 | truth=20, contradicts |

### 2.3 Seeded evidence data quality (critical finding)

| Report | Total Evidence | Scopeless (seeded) | % Missing Metadata |
|--------|---------------|--------------------|--------------------|
| `1a4f7f33` | 74 | 21 | 28% |
| `2a867099` | 53 | 32 | 60% |
| `2acb6420` | 55 | 34 | 62% |
| `2c7e10c2` | 51 | 26 | 51% |
| `4a3740ed` | 57 | 29 | 51% |
| `a62db574` | 51 | 36 | 70% |
| `b32cbcaf` | 63 | 39 | 62% |

**Every report has 28-70% of evidence items missing `sourceType`, `claimDirection`, and `evidenceScope`.** These are all from `seedEvidenceFromPreliminarySearch()` (line 2430-2442 of `claimboundary-pipeline.ts`).

### 2.4 SRG/Iran variability (context)

- SRG "Linksdrall": 38 pp spread (18-56), provider mix contributes but 31 pp spread remains with pure CSE
- Iran "nukes": 37 pp spread (55-92), all Google-CSE only. Driven by claim count instability (1 vs 3 claims)

---

## 3. Root Causes (ranked by impact)

### RC-1: Seeded evidence data gap (CRITICAL — code bug)

**Impact:** Every single analysis run. 28-70% of all evidence lacks core metadata.
**Captain issues:** Contributes to all four (1, 2a, 2b, 2c).

`seedEvidenceFromPreliminarySearch()` at line 2398-2449 creates evidence items with only: `statement`, `category` (hardcoded "evidence"), `sourceUrl`, `probativeValue`, and `relevantClaimIds`.

**Missing fields and their consequences:**

| Missing Field | Consequence |
|--------------|-------------|
| `evidenceScope` | Items cannot match any boundary's constituent scopes → fall to `boundaries[0]` (RC-2) |
| `claimDirection` | Items count as "neutral" in `assessEvidenceBalance()` → contrarian retrieval never triggers |
| `sourceType` | Items bypass source-type-based routing in verdict stage; can't be filtered by type |
| `sourceAuthority` | Items bypass opinion source filter in `evidence-filter.ts` (line 127) |

**Code location:** `claimboundary-pipeline.ts:2430-2442`

### RC-2: Boundary fallback assignment (HIGH — code bug)

**Impact:** In `b32cbcaf`, 39 Brazilian court evidence items landed in the "U.S. government statements" boundary because it happened to be `boundaries[0]`.

`assignEvidenceToBoundaries()` at line 4024-4053 assigns scopeless items to:
```typescript
const fallback = boundaries.find((b) => b.id === "CB_GENERAL") ?? boundaries[0];
```

Since `CB_GENERAL` is never created by the clustering stage, ALL scopeless items go to whichever boundary the LLM returned first. This is **non-deterministic** — the same evidence pool can produce different boundary assignments depending on LLM boundary ordering.

**This explains the "40-item U.S. boundary"** in `b32cbcaf` that the Captain flagged. The boundary name came from 1 legitimately U.S.-sourced item; the other 39 items are Brazilian court evidence misclassified by the fallback.

**Code location:** `claimboundary-pipeline.ts:4047-4051`

### RC-3: Third-party political evidence in verdict (HIGH — prompt gap)

**Impact:** 15-40 pp verdict degradation on Bolsonaro-type cases. Confirmed on both local AND deployed systems.

This has **two distinct mechanisms** (Sonnet finding):

**Mechanism A — Legitimate U.S. EO items properly extracted but overweighted:**
- Research stage finds U.S. government reactions (Executive Orders, State Department)
- Extraction assigns `sourceType: government_report`, `probativeValue: medium`
- Clustering creates a boundary for them
- Verdict LLM treats this boundary as substantive contradicting evidence
- Impact: boundary truth=8 (worst case, `4a3740ed`) or truth=20 (deployed)

**Mechanism B — Scopeless items miscategorized into U.S. boundary:**
- 39 seeded items (PBS, BBC, Brazilian court sources) with NO metadata land in the U.S. boundary via RC-2
- The boundary becomes the dominant evidence pool but its NAME suggests U.S. political evidence
- Impact: `b32cbcaf` boundary has 40 items, truth=65, direction=mixed

**The extraction prompt already says "exclude opinions" (line 434)** but the LLM doesn't consistently apply this to government documents containing political opinions (an Executive Order IS a government_report by sourceType).

**Existing pipeline rule violated:** Per AGENTS.md: "Unsubstantiated objections (opinion, political criticism, denial without counter-evidence) are classified as 'doubted' — they MUST NOT reduce a verdict's truth percentage."

### RC-4: Claim decomposition instability (MEDIUM-HIGH — LLM variance)

**Impact:** Up to 37 pp truth swing (Iran), 17 pp on Bolsonaro.

Same input produces different numbers of atomic claims. The prompt has extensive guidance (lines 150-166) including "A question like 'Was X fair?' contains ONE aspect" — but the LLM inconsistently follows this.

**Key data:**
- Iran: 1-claim runs → truth 88-92 (4 pp spread). 3-claim runs → truth 55-90 (35 pp spread)
- Bolsonaro: 1-claim runs → truth 68-85 (17 pp). 2-claim run → truth 69

**Note on Fix C2 conflict** (Opus finding): The prompt at line 164 says "do not expand [a fairness question] into multiple claims about sub-events discovered in evidence." Adding guidance to decompose multi-proceeding inputs into separate claims would contradict this. The fix needs careful framing.

### RC-5: AUTO mode provider mixing (MEDIUM — code behavior)

**Impact:** Adds noise but not the dominant factor. SRG still has 31 pp spread without provider mix.

AUTO mode fills remaining result slots from fallback providers when the primary returns fewer than `maxResults`. Creates inconsistent evidence pools within a single run.

**Code location:** `web-search.ts:286-293`

### RC-6: Boundary structural instability (MEDIUM — LLM variance + design gap)

**Impact:** Boundary names, count (4-6), and conceptual framing vary across runs with the same input. Noticeable to users but verdict impact is limited when contamination bugs (RC-1/RC-2/RC-3) are fixed.
**Captain issue:** "ClaimBoundaries were different very often I ran another analysis with same input."

**Data:** Across 8 Bolsonaro reports, the mega-boundary (30-45 items) is named differently every time: "STF jurisprudence", "Electoral Superior Court", "Supreme Court proceedings", "Criminal Code provisions", "Journalistic reporting", "U.S. bilateral relations". Smaller boundaries (1-10 items) also vary in framing.

**Root causes (from Round 3 dual-agent analysis):**

1. **Free-form EvidenceScope text (PRIMARY):** The EXTRACT_EVIDENCE prompt produces scope descriptions as unconstrained free text. The same source about the same court proceeding generates different methodology wording each run (e.g., "Criminal court proceedings under Brazilian Penal Code" vs "STF judicial analysis of criminal charges"). The `scopeFingerprint()` function (line 3835) uses exact JSON.stringify comparison — any wording difference creates a different fingerprint, different UniqueScope, and different clustering input.

2. **Clustering LLM non-determinism (SECONDARY):** Clustering runs at temperature 0.15 (line 3934). Even with identical inputs, this produces variation. Additionally, the congruence rules allow LLM judgment on whether two legal proceedings are "same methodology" or "different methodology."

3. **No scope taxonomy:** The extraction prompt gives no constraints on methodology naming. The LLM freely frames scopes by court, by legal instrument, by source type, or by content — producing different boundary structures depending on the framing choice.

4. **Seeded evidence amplification (RC-1):** 28-70% of items are invisible to clustering → clustering decisions based on 30-72% of evidence → scopeless items all fall to `boundaries[0]`, creating a random mega-boundary.

**Verdict impact assessment:** Reports with the same claim count (1) and no U.S. contamination range 72-85 **regardless of boundary structure**. The verdict LLM synthesizes across all boundaries and produces similar results. Boundary instability is **more cosmetic than analytical** — EXCEPT when it triggers contamination bugs (RC-2: wrong items in wrong boundary, RC-3: political boundary gets contradicts direction).

**Conclusion:** Boundary instability is a real quality issue for report consistency but not a verdict-accuracy issue once RC-1/RC-2/RC-3 are fixed. Fixes target Phase 1 (quick win: lower clustering temperature) and Phase 2 (scope normalization).

### Additional finding: Evidence balance check broken (Sonnet Finding 7)

`assessEvidenceBalance()` counts items by `claimDirection`. Since 50-70% of items have no `claimDirection` (RC-1), they all count as "neutral." The function almost never detects skew, even when actual evidence is heavily one-directional. This means contrarian retrieval doesn't trigger when it should.

### Additional finding: Self-consistency amplification (Sonnet Finding 6)

When contaminated evidence (like U.S. EO boundary) is present, the self-consistency check at different temperatures sometimes discounts it and sometimes doesn't. This INCREASES measured spread, DECREASES confidence, and makes the final verdict MORE uncertain — the contamination poisons the consistency measurement too.

---

## Captain Issue Traceability

| Captain Issue | Root Causes | Primary Fix | Supporting Fixes |
|---------------|-----------|-------------|-----------------|
| 1. Equal inputs produce different reports | RC-1 (data gap), RC-4 (claim instability), RC-5 (provider mix), RC-6 (boundary instability) | Fix 1 (seed enrichment) | Fix 4 (AUTO mode), Fix 5 (claim stability), Fix 7 (scope normalization) |
| 2a. U.S. evidence downgrading verdict | RC-1 (data gap → Mechanism B), RC-2 (fallback assignment → Mechanism B), RC-3 (prompt gap → Mechanism A) | Fix 1 + Fix 2 (assignment) | Fix 3 (verdict prompt) |
| 2b. STF/TSE not detected as separate | RC-1 (poor evidence metadata → poor scope diversity → merged boundaries) | Fix 1 (seed enrichment) | Fix 5 (decomposition guidance) |
| 2c. Coup trial verdict not recognized | RC-1 (same as 2b) | Fix 1 (seed enrichment) | Fix 5 (decomposition guidance) |
| 3. Boundaries different every run | RC-6 (free-form scopes, clustering non-determinism, no taxonomy) | Fix 7 (scope normalization) | Clustering temp reduction, Fix 1 (seed enrichment) |

---

## 4. Proposed Fixes (re-prioritized after dual-agent analysis)

### Fix 1: Enrich seeded evidence items (RC-1) — HIGHEST PRIORITY

**Priority:** Implement first — root cause of multiple Captain issues
**Risk:** MEDIUM — touches the evidence pipeline
**Files:** `claimboundary-pipeline.ts` (~20 lines in `seedEvidenceFromPreliminarySearch`)

Populate the missing fields on seeded items. The preliminary evidence from Pass 1 already contains some of this data. Two approaches:

**Option 1A (minimal — populate from available data):**
Add `claimDirection`, `sourceType`, and a stub `evidenceScope` to seeded items using whatever the Pass 1 LLM provided:
```typescript
state.evidenceItems.push({
  // ... existing fields ...
  claimDirection: pe.claimDirection ?? "contextual",  // From Pass 1 if available
  sourceType: pe.sourceType ?? "other",               // From Pass 1 if available
  evidenceScope: pe.evidenceScope ?? {                 // Minimal stub
    methodology: "Preliminary search result",
    temporal: "",
    geographic: "",
  },
});
```

**Option 1B (full — re-extract through Stage 2 prompt):**
Pass seeded items back through the EXTRACT_EVIDENCE prompt to get proper metadata. More expensive (additional LLM calls) but produces complete, high-quality metadata.

**Recommendation:** Start with 1A. If evidence quality remains insufficient, upgrade to 1B for a subset.

**Implementation note — stub scope clustering (from Round 2 review):**
With Option 1A, ALL seeded items share the same stub scope fingerprint (`"Preliminary search result"`). During `collectUniqueScopes()` (line 3848), they deduplicate to a single UniqueScope. The clustering LLM will assign this scope to one boundary. Result: all 20-40 seeded items end up in ONE boundary together. This is **better than the current `boundaries[0]` random assignment** but means seeded items form a coherent block rather than distributing across domain-appropriate boundaries. If this "seeded evidence" mega-boundary causes problems in practice, upgrade to Option 1B.

**Captain decision required:** Option 1A (minimal, no extra LLM cost) vs 1B (full, ~10% cost increase)?

### Fix 2: Fix boundary fallback assignment (RC-2) — SAFETY NET

**Priority:** Implement alongside Fix 1 (low effort, prevents edge cases)
**Risk:** LOW — isolated function, deterministic change
**Files:** `claimboundary-pipeline.ts` (~5 lines in `assignEvidenceToBoundaries`)

**Note on interaction with Fix 1:** After Fix 1 adds stub `evidenceScope` to seeded items, most items will fingerprint-match to a boundary via the clustering stage (see Fix 1 implementation note). However, the fallback path at line 4047 should still be improved because: (a) edge cases may still produce scopeless items from extraction failures, (b) `CB_GENERAL` is dead code that will never match, and (c) `boundaries[0]` is non-deterministic — it depends on LLM boundary ordering.

**Recommendation:** Option 2C (change fallback from `boundaries[0]` to the boundary with the most evidence items). 5 lines, minimal risk, prevents the `b32cbcaf`-type anomaly from recurring in edge cases.

### Fix 3: Verdict prompt — evidence weighting by output type and source role (RC-3 + temporal reliability)

**Priority:** Phase 1 — addresses both Mechanism A of U.S. evidence contamination AND the Captain's temporal reliability concern
**Risk:** MEDIUM — prompt change affects all analyses
**Files:** `claimboundary.prompt.md` (VERDICT_ADVOCATE section)

**Merged fix:** Round 2 review identified that the original Fix 3 (third-party evidence), Fix 3B-i (`government_statement` sourceType), and Fix 3B-iii (output-type weighting) all target the same LLM decision at the same prompt location. They are now merged into a single, comprehensive verdict prompt addition.

**Why `government_statement` sourceType was dropped:** Sonnet's Round 2 analysis showed that (a) nothing currently consumes sourceType for weighting decisions — only for evidence partitioning routing, (b) adding it requires schema changes across 3+ files with no consumption logic, and (c) the verdict prompt guidance achieves the same goal without touching the type system. The prompt approach also generalizes to NGOs, think tanks, and media outlets — not just government sources.

**Single prompt addition covering three concepts:**

> **Evidence output-type and source-role awareness:**
>
> For any source, distinguish between its **factual outputs** (research, data, investigations, compliance reports, legal analyses) and its **positional outputs** (executive orders, diplomatic statements, sanctions, press releases, political declarations). Positional outputs represent institutional positions, not factual findings — their probative value for factual claims is LOW regardless of the source's overall reliability rating.
>
> Evidence from entities **not party to the proceedings, events, or phenomena being assessed** constitutes commentary, not substantive evidence. Foreign government reactions, diplomatic statements, and political declarations about another jurisdiction's legal proceedings are positional outputs with low probative value for whether those proceedings followed applicable law. Such evidence should receive `evidenceDirection: neutral`.
>
> When evidence suggests a source's institutional independence, editorial direction, or leadership has recently changed (government transition, leadership change, editorial restructuring), weight recent positional outputs from that source with appropriate skepticism — institutional change increases the risk that positional outputs reflect new political orientation rather than factual analysis.

**Key design decisions (from dual-agent consensus):**
- Generic — applies to any institution in any country (governments, NGOs, think tanks, media)
- No hardcoded entity names or keywords
- Uses LLM judgment, not deterministic filtering
- Distinguishes factual vs. positional outputs, not source-level trust vs. distrust
- Covers the Captain's temporal reliability concern ("institutional change increases risk")

**This fix is still needed** even after Fix 1+2, because properly-extracted political evidence items (those WITH full metadata) will still form their own boundary and potentially get `contradicts` direction from the advocate LLM.

**Captain decision required:** This is a prompt change affecting analysis behavior.

### Fix 3B: SR cache TTL for institutional sources (Phase 2) + SR validity windowing (Phase 3)

**Context:** Captain raised: "If sources had high reliability in the past, and there was a change (like US government change), it could mean reliability has dropped since that change and statements from that entity cannot be trusted anymore."

**Current state:** SR evaluates domains with a single score, cached 90 days. Rule 6 in the SR prompt already handles institutional independence shifts ("recent evidence outweighs historical reputation, government sources are NOT automatically reliable"). But the 90-day cache means stale scores persist after institutional changes.

**Phase 2: Shorter SR cache TTL for institutional sources (3B-ii)**

Add a UCM-configurable `institutionalCacheTtlDays` (default: 30) separate from the general `cacheTtlDays` (90). Applied to SR cache entries where `category` is `government` or `state_media`. This forces more frequent re-evaluation as evidence of institutional changes accumulates.

**Implementation note (from Sonnet Round 2):** The SR cache table already stores a `category` field (e.g., `"government"`, `"state_media"`, `"editorial_publisher"`). The implementation applies a conditional TTL at `setCachedScore()` line 361 based on `category IN ('government', 'state_media')`. No architectural refactoring needed.

**Phase 3: SR validity windowing (3B-iv)**

Full temporal windowing: add `validFrom`/`validUntil` to SR cache entries. When the SR LLM detects institutional change evidence, it sets a validity window. The pipeline checks if evidence items' temporal scope falls within the SR validity window. Architecturally significant — deferred.

**Captain decisions required:**
- D5: Reduce SR cache TTL for government/state-media sources to 30 days? (Phase 2)
- D6: Full SR temporal windowing? (Phase 3 — design needed)

### Fix 4: AUTO mode — stop on first successful provider (RC-5)

**Priority:** Phase 1 — quick win, low risk
**Risk:** LOW
**Files:** `web-search.ts` (~5 lines)

Stop after the first provider that returns any results. Only fall back on zero results or error.

**No Captain decision needed** — code behavior fix.

### Fix 5: Claim decomposition stability (RC-4)

**Priority:** Phase 2
**Risk:** MEDIUM

Two sub-approaches:

**5A. Stability gate:** Run extraction twice at different temperatures. If claim count differs, retry at lower temperature. Detects instability.

**5B. Decomposition guidance in understanding prompt:** Must be carefully worded to NOT contradict the existing rule at line 164 ("A question like 'Was X fair?' contains ONE aspect"). Proposed framing: "When the input references 'various' or 'multiple' proceedings/events, the `distinctEvents` field (not atomicClaims) is the mechanism for ensuring coverage. Prefer fewer, broader claims with richer `distinctEvents` over more claims."

This redirects multi-event coverage from claim decomposition (where it causes instability) to the `distinctEvents` mechanism (where it informs research queries without fragmenting verdicts).

**Captain decision required:** Prompt change.

### Fix 7: Scope normalization for boundary stability (RC-6) — NEW from Round 3

**Priority:** Phase 2 — addresses boundary structural instability
**Risk:** MEDIUM — prompt change affects scope generation
**Files:** `claimboundary.prompt.md` (EXTRACT_EVIDENCE section) + optionally `claimboundary-pipeline.ts` (clustering temperature)

**Quick win (Phase 1):** Reduce clustering temperature from 0.15 to 0.05 at line 3934. Clustering is structural, not creative — lower temperature reduces non-determinism. 1 line, zero risk.

**Scope normalization (Phase 2):** Add methodology category guidance to the EXTRACT_EVIDENCE prompt. Instead of unconstrained free-text methodology descriptions, guide the LLM to use a primary category:

> "For `methodology`, use a primary analytical category followed by specific detail. Categories: `judicial_proceeding`, `legislative_analysis`, `statistical_study`, `expert_assessment`, `journalistic_investigation`, `government_report`, `field_observation`, `document_review`, `comparative_analysis`. Format: `<category>: <specific detail>`. Example: `judicial_proceeding: Supreme Court criminal trial panel of five justices`."

This makes `scopeFingerprint()` more stable — scopes from the same analytical approach share the same category prefix, producing consistent fingerprints even when detail wording varies.

**Dual-agent consensus on boundary instability:**
- Boundary structure varies wildly (4-6 boundaries with different framing each run)
- But verdict quality is stable (72-85 truth range) once contamination bugs are fixed
- Boundary instability is **cosmetic more than analytical** — the verdict LLM synthesizes across all boundaries effectively
- Still worth fixing for user-facing report consistency, but lower priority than RC-1/RC-2/RC-3 fixes

**Captain decision required:** Prompt change (Phase 2).

### Fix 6: STF/TSE and Coup trial coverage (RC-1 downstream)

**Priority:** Phase 2 — largely resolved by Fix 1
**Risk:** LOW

After Fix 1 enriches seeded evidence with `evidenceScope`, the clustering stage will have proper scope diversity to create separate boundaries for STF and TSE proceedings. Fix 5B ensures `distinctEvents` covers both proceedings, driving search queries to find TSE-specific evidence.

If Fix 1 + Fix 5B don't resolve this, then add clustering prompt guidance (former Fix E). But per Sonnet's Finding 5, the clustering LLM is mostly correct — it merges when evidence lacks distinct scopes, not when the prompt is wrong.

---

## 5. Implementation Plan

### Phase 1: Code fixes + prompt (this week)

| Step | Fix | Action | Addresses | Risk | Captain Approval |
|------|-----|--------|-----------|------|-----------------|
| 1.1 | 1 (1A) | Enrich seeded evidence with `claimDirection`, `sourceType`, stub `evidenceScope` | Issues 1, 2a, 2b, 2c | MEDIUM | No — code bug fix |
| 1.2 | 2 (2C) | Change fallback assignment from `boundaries[0]` to largest boundary | Issue 2a (safety net) | LOW | No — code bug fix |
| 1.3 | 3 | Verdict prompt: evidence weighting by output type and source role (merged: third-party evidence + positional vs factual outputs + institutional change awareness) | Issue 2a + temporal reliability | MEDIUM | **Yes — prompt change** |
| 1.4 | 4 | Change AUTO mode to stop on first successful provider | Issue 1 (variance) | LOW | No — code behavior fix |
| 1.5 | 7 (quick) | Reduce clustering temperature from 0.15 to 0.05 | Issue 3 (boundary instability) | LOW | No — 1-line config change |

### Phase 2: Stability improvements (next 1-2 weeks)

| Step | Fix | Action | Addresses | Risk | Captain Approval |
|------|-----|--------|-----------|------|-----------------|
| 2.1 | 5A | Implement claim-extraction stability gate | Issue 1 (variance) | MEDIUM | No — new validation layer |
| 2.2 | 5B | Add decomposition guidance favoring `distinctEvents` over claim splitting | Issues 1 + 2b + 2c | MEDIUM | **Yes — prompt change** |
| 2.3 | 6 | Evaluate STF/TSE coverage after Fix 1+5B; add clustering guidance if needed | Issues 2b + 2c | LOW | Conditional |
| 2.4 | 3B-ii | Shorter SR cache TTL for government/state-media sources (UCM config) | Temporal reliability | LOW | No — config change |
| 2.5 | 7 | Add scope normalization guidance to extraction prompt | Issue 3 (boundary instability) | MEDIUM | **Yes — prompt change** |

### Phase 3: Long-term robustness

| Step | Action | Addresses |
|------|--------|-----------|
| 3.1 | Multilingual decomposition quality | Issue 2b (non-English) |
| 3.2 | Consider Fix 1B (re-extract seeded items through Stage 2) if 1A insufficient | All |
| 3.3 | Self-consistency check review (Sonnet Finding 6 — contaminated evidence amplifies spread) | Issue 1 |
| 3.4 | SR validity windowing (Fix 3B-iv) — add `validFrom`/`validUntil` to SR cache | Temporal reliability |

---

## 6. Validation

### After Fix 1+2 (seeded evidence + fallback assignment)

Run Bolsonaro input 3x. Check:
- [ ] No evidence items with empty `sourceType`, `claimDirection`, or `evidenceScope`
- [ ] No boundary with >30 evidence items (the 40-item anomaly should be impossible)
- [ ] `assessEvidenceBalance()` shows meaningful supporting/contradicting counts (not mostly neutral)
- [ ] Boundary evidence distribution is proportional to actual evidence relevance

### After Fix 3 (verdict prompt)

Run Bolsonaro input 3x. Check:
- [ ] Any boundary containing third-party political commentary has `evidenceDirection: neutral` (not `contradicts`)
- [ ] Overall truth is in 75-90 range for all runs
- [ ] No regression on non-political inputs (run Iran 1x as control)

### After Fix 4 (AUTO mode)

Run SRG 3x. Check:
- [ ] Single search provider per run (no mixed providers)

### After Fix 5 (claim stability)

Run Iran 5x. Check:
- [ ] Stable claim count across runs
- [ ] Truth spread < 15 pp

---

## 7. Decision Log

| # | Decision | Addresses | Options | Captain Decision |
|---|----------|-----------|---------|-----------------|
| D1 | Seeded evidence enrichment approach | Issues 1, 2a-c | **Option 1A (minimal, no cost)** / Option 1B (full, ~10% more LLM cost) | **1A approved** (reviewer endorsed) |
| D2 | Fallback assignment strategy | Issue 2a | **Option 2C (largest boundary)** / Option 2A (URL matching) / Option 2B (CB_GENERAL) | **2C approved** (reviewer endorsed) |
| D3 | Merged verdict prompt (output-type + source-role + institutional change)? | Issue 2a + temporal reliability | **Yes** / No / Modified | **Yes — approved** (reviewer endorsed) |
| D4 | Decomposition stability approach (Phase 2) | Issues 1, 2b-c | 5A only / 5B only / **Both** | Pending (Phase 2) |
| D5 | Reduce SR cache TTL for government/state-media to 30 days? (Phase 2) | Temporal reliability | **Yes** / No / Different value | Pending (Phase 2, reviewer endorsed) |
| D6 | Full SR temporal windowing? (Phase 3) | Temporal reliability | Yes / **Defer** | Pending (Phase 3) |
| D7 | Scope normalization for boundary stability? (Phase 2) | Issue 3 (boundary instability) | **Yes** / No | Pending (Phase 2, reviewer endorsed) |

**Bold** = architect recommendation.

---

## 8. Dual-Agent Analysis Record

### Methodology
- **Opus (Lead Architect):** Analyzed all 7 local + 1 deployed Bolsonaro reports, SRG and Iran data. Reviewed prompts. Found evidence contamination patterns, claim instability, provider mix variance.
- **Sonnet (Independent Analyst):** Deep code review of pipeline, verdict stage, aggregation, evidence filter. Found seeded evidence data gap, boundary fallback bug, evidence balance dysfunction, self-consistency amplification.

### Key disagreements resolved

| Point | Opus Initial | Sonnet Challenge | Resolution |
|-------|-------------|-----------------|------------|
| Root cause of 40-item U.S. boundary | "Clustering LLM grouped too aggressively" | "Code bug: `boundaries[0]` fallback" | **Sonnet correct** — verified at line 4047 |
| Fix B priority | Phase 1, #2 priority | Phase 1 but #3 — seed enrichment is more impactful | **Sonnet correct** — Fix B only addresses Mechanism A |
| Fix E (clustering prompt) | Phase 1, #3 priority | LOW priority — clustering LLM works correctly, problem is upstream | **Sonnet correct** — demoted to Phase 2 conditional |
| Evidence balance function | Not analyzed | "Mostly useless due to data gap" | **Sonnet correct** — verified at line 3524 |
| STF/TSE root cause | "Clustering/understanding stage issue" | "Research/evidence quality issue" | **Sonnet mostly correct** — enriched metadata enables better clustering |

### Opus findings Sonnet confirmed
- U.S. EO contamination patterns and quantified impact (truth=8 worst case)
- Claim count instability as major variance driver
- Provider mix as contributing factor
- Extraction prompt already says "exclude opinions" but inconsistently applied

### Sonnet findings validated by Opus
- `seedEvidenceFromPreliminarySearch()` missing fields — confirmed via data (28-70% items incomplete)
- `assignEvidenceToBoundaries()` fallback to `boundaries[0]` — confirmed in code
- `assessEvidenceBalance()` dysfunction — confirmed: `default: neutral++` at line 3524

### Round 2 disagreements resolved

| Point | Opus Position | Sonnet Round 2 Challenge | Resolution |
|-------|-------------|-------------------------|------------|
| Fix 3B-i (`government_statement` sourceType) | Add to type system + routing | Drop — nothing consumes it for weighting; prompt guidance is sufficient and generalizes to NGOs/media | **Sonnet correct** — dropped. Merged into verdict prompt (Fix 3) |
| Fix 2 priority after Fix 1 | Still HIGH — stub scope won't match real boundary fingerprints | Near-redundant — stub scope creates one UniqueScope that clustering assigns to a boundary | **Both partially right** — stub scope enters clustering, but `assignEvidenceToBoundaries` fingerprint matching works. Fix 2 demoted to safety net |
| Fix 3 + 3B-iii redundancy | Noted overlap in pre-review | Should be merged into single prompt section | **Agree** — merged |
| Government-only temporal focus | Focused on government sources | Too narrow — should cover NGOs, think tanks, media editorial changes | **Sonnet correct** — broadened to "institutional change awareness" |
| Fix 1A stub scope mega-boundary | Not fully analyzed | All seeded items cluster into one boundary | **Sonnet correct** — added implementation note, acceptable tradeoff for 1A |

### Round 3: Boundary structural instability

**Sonnet R3 findings:**
- Primary driver: free-form EvidenceScope text → exact-string fingerprinting → different UniqueScopes each run → different clustering inputs
- Secondary: clustering temperature 0.15, no scope taxonomy
- Proposed Fix 7A (scope normalization prompt) + Fix 8 (boundary stability gate) + Fix 9 (name normalization)

**Opus R3 assessment:**
- Confirmed `scopeFingerprint` exact-match behavior (line 3835-3841)
- Confirmed clustering temperature at 0.15 (line 3934)
- Key insight: boundary instability is **cosmetic more than analytical** — verdict truth is stable (72-85) across wildly different boundary structures once contamination is fixed
- Agreed on Fix 7A (scope normalization) as Phase 2
- Agreed on reducing clustering temp as Phase 1 quick win
- Deferred Fix 8 (stability gate) and Fix 9 (name normalization) to Phase 3 — lower value

**Consensus:** Add RC-6 to root causes. Clustering temp reduction in Phase 1 (1 line). Scope normalization in Phase 2 (prompt change). Boundary instability is noticeable to users but doesn't degrade verdicts once the data quality bugs are fixed.

---

## Appendix A: Code References

| Location | Function | Issue |
|----------|----------|-------|
| `claimboundary-pipeline.ts:2430-2442` | `seedEvidenceFromPreliminarySearch` | Missing `sourceType`, `claimDirection`, `evidenceScope`, `sourceAuthority` |
| `claimboundary-pipeline.ts:4047-4051` | `assignEvidenceToBoundaries` | Fallback to `boundaries[0]` instead of intelligent assignment |
| `claimboundary-pipeline.ts:3517-3527` | `assessEvidenceBalance` | Items without `claimDirection` count as "neutral" |
| `evidence-filter.ts:127` | `filterByProbativeValue` | Only checks `sourceAuthority === "opinion"` — seeded items have no `sourceAuthority` |
| `claimboundary.prompt.md:434` | EXTRACT_EVIDENCE prompt | Says "exclude opinions" but LLM inconsistently applies to government docs containing opinions |
| `claimboundary.prompt.md:164` | UNDERSTAND prompt | Rule about "Was X fair? = ONE aspect" conflicts with potential decomposition guidance |
| `web-search.ts:286-293` | AUTO mode loop | Continues to next provider to fill remaining slots |
| `verdict-stage.ts:553-645` | Self-consistency check | Contaminated evidence amplifies measured spread |

## Appendix B: Evidence Contamination — Two Mechanisms

### Mechanism A: Properly extracted U.S. political evidence overweighted

Occurs in: `4a3740ed` (truth=8), `2acb6420` (truth=65), deployed `1acfe98d` (truth=20)

Flow: Search finds U.S. EO → Extraction creates items with `sourceType: government_report`, `probativeValue: medium` → Clustering creates U.S. boundary → Verdict LLM assigns `contradicts`, low truth → Drags overall verdict down

**Fix:** Verdict prompt guidance (Fix 3)

### Mechanism B: Scopeless items misassigned to U.S.-named boundary

Occurs in: `b32cbcaf` (39 items in U.S. boundary)

Flow: `seedEvidenceFromPreliminarySearch` creates items without `evidenceScope` → `assignEvidenceToBoundaries` can't match to any boundary → Falls back to `boundaries[0]` → In this run, `boundaries[0]` was the U.S. boundary → 39 Brazilian items classified as U.S. evidence

**Fix:** Seed enrichment (Fix 1) + fallback assignment (Fix 2)
