# Evidence Balance Fix Proposal

**Author:** Claude (Principal Architect)
**Status:** PARTIALLY IMPLEMENTED — Direction counting superseded by LLM validation (2026-02-12)
**Created:** 2026-02-07
**Priority:** HIGH (directly affects verdict accuracy)
**Triggered By:** Bolsonaro judgment analysis showing 16 counter vs 4 supporting evidence items

---

## Observed Problems

From analysis job `64393f1a6c2d4664896e3caefd7a02b8` (Bolsonaro judgment fairness):

| Problem | Evidence | Impact |
|---------|----------|--------|
| **Counter-evidence outnumbers evidence 4:1** | 16 counter vs 4 supporting | Verdict auto-corrected to "Leaning False 35%" |
| **Same-source duplication inflates counts** | White House EO → 4 items, BBC → 5 items | One document gets 4x voting power |
| **Dissenting opinion treated as equal to majority** | One judge's dissent weighted same as institution's ruling | Minority view distorts fairness assessment |
| **Foreign political document treated as legal evidence** | US White House EO listed as "criticism" of Brazil's courts | Political retaliation treated as judicial criticism |

---

## Root Cause Analysis

### Root Cause 1: Source-Blind Direction Counting — ✅ SUPERSEDED

> **UPDATE (2026-02-12):** The `totalDirectional` counter-based gate has been **removed**. Direction validation now uses LLM-based per-claim semantic evaluation (`batchDirectionValidationLLM`). The `claimDirection` counters are retained only as `legacyDirectionalMetadata` in warning payloads for debugging. Source deduplication (`countBySourceDeduped`) is still used for diagnostic metadata but no longer gates verdicts.

**File:** ~~[orchestrated.ts:3773-3791](apps/web/src/lib/analyzer/orchestrated.ts#L3773-L3791)~~

```typescript
// HISTORICAL — this code pattern has been replaced:
// const supportCount = linkedEvidence.filter(e => e.claimDirection === "supports").length;
// const contradictCount = linkedEvidence.filter(e => e.claimDirection === "contradicts").length;
// const contradictRatio = contradictCount / totalDirectional; // 16/20 = 80%
// 80% >= 60% threshold → auto-corrects verdict to max 35%
//
// CURRENT: LLM evaluates each sub-claim + evidence + verdict triple semantically.
// Only structural gate remains: linkedEvidence.length >= minEvidenceCount
```

**Problem (historical):** If one URL yields 4 extracted evidence items (all "contradicts"), that URL gets 4x voting power. The White House EO alone contributes 4/16 = 25% of all counter-evidence.

### Root Cause 2: Quantity-Based Prompt Guidance

**File:** [verdict-base.ts:125-128](apps/web/src/lib/analyzer/prompts/base/verdict-base.ts#L125-L128)

```
- Majority [COUNTER-EVIDENCE] → Verdict should be LOW (0-28%)
- Majority [SUPPORTING] → Verdict should be HIGH (72-100%)
```

**Problem:** Instructs LLM to assess by COUNT ("majority"), not by quality/authority of sources. One high-quality court record should outweigh four bullet points from a foreign political document.

### Root Cause 3: No Institutional Majority Guidance

**File:** [verdict-base.ts](apps/web/src/lib/analyzer/prompts/base/verdict-base.ts) - no section on institutional decisions

**Problem:** When a court with 11 judges convicts with a majority, one dissenting opinion should not be treated as stronger than the 10 majority opinions. Currently, if the dissent is extracted as counter-evidence, it gets equal weight to any other evidence item.

### Root Cause 4: Foreign Political Documents Not Filtered

**File:** [extract-evidence-base.ts](apps/web/src/lib/analyzer/prompts/base/extract-evidence-base.ts)

**Problem:** The White House executive order (a political/foreign policy document about Brazil) is extracted as `category: "criticism"` with `sourceAuthority: "primary"`. It should be `sourceAuthority: "opinion"` because it's a foreign government's political position, not a legal analysis of judicial fairness.

---

## Proposed Fixes

### Fix 1: Source-Deduplicated Direction Counting (CRITICAL) — ✅ PARTIALLY IMPLEMENTED, SUPERSEDED

> **UPDATE (2026-02-12):** `countBySourceDeduped` was implemented but the `totalDirectional` gate was removed entirely. Direction validation now uses LLM semantic evaluation. The deduped counts are used only in `legacyDirectionalMetadata` diagnostic payloads.

**File:** `apps/web/src/lib/analyzer/orchestrated.ts`

```typescript
// countBySourceDeduped IS implemented (used for diagnostic metadata)
// But totalDirectional, supportRatio, contradictRatio are NO LONGER used for gating.
// Direction validation is now LLM-based: batchDirectionValidationLLM()
```

**Effect on Bolsonaro example:**
- Before: 16 counter / 20 = 80% → auto-correct to 35%
- After: ~5 unique counter-sources / ~8 unique sources = 62% → still triggers but closer to reality
- White House EO: 4 items → 1 vote. BBC articles: 5 items → 2 votes (2 different URLs).

**Effort:** 1 hour

---

### Fix 2: Quality-Weighted Verdict Prompt (HIGH)

**File:** `apps/web/src/lib/analyzer/prompts/base/verdict-base.ts`
**Location:** Lines 118-128 (COUNTER-EVIDENCE HANDLING section)

**Replace:**
```
**How to use**:
- Majority [COUNTER-EVIDENCE] → Verdict should be LOW (0-28%)
- Majority [SUPPORTING] → Verdict should be HIGH (72-100%)
- Strong counter-evidence significantly lowers verdict
```

**With:**
```
**How to use (QUALITY over QUANTITY)**:
- Assess evidence by AUTHORITY and QUALITY, not by count
- One primary-source court record outweighs multiple commentary articles about the same fact
- Multiple items from the SAME source/document = ONE piece of evidence (don't let extraction granularity inflate weight)
- Foreign government political statements about another country's judicial proceedings are POLITICAL POSITIONS, not legal evidence
- When most UNIQUE high-quality sources contradict → Verdict should be LOW (0-42%)
- When most UNIQUE high-quality sources support → Verdict should be HIGH (58-100%)
- When evidence is balanced across unique sources → Verdict should be MIXED (43-57%)
```

**Effort:** 30 minutes

---

### Fix 3: Institutional Decision Authority (HIGH)

**File:** `apps/web/src/lib/analyzer/prompts/base/verdict-base.ts`
**Location:** After line 98 (after EVIDENCE QUALITY GUIDANCE section)

**Add new section:**

```
## INSTITUTIONAL DECISIONS AND MAJORITY RULINGS

When evaluating fairness of institutional/court decisions:
- **A court ruling by majority IS the institutional finding** - it carries full institutional authority
- **A dissenting opinion** is a single member's view and carries the SAME weight as any other individual member's opinion - it does NOT outweigh or override the majority decision
- **The existence of dissent proves the process worked** - it shows independent deliberation, not unfairness
- **Do NOT treat dissenting votes as counter-evidence** to the fairness of the process itself (dissent within a court is NORMAL judicial function)
- Only treat procedural objections as counter-evidence when they cite specific violations of rules, standards, or established procedures
- A court operating under the rule of law with proper appeals processes has institutional legitimacy that individual disagreements do not override
```

**Effort:** 30 minutes

---

### Fix 4: Foreign Political Document Classification (MEDIUM)

**File:** `apps/web/src/lib/analyzer/prompts/base/extract-evidence-base.ts`
**Location:** In sourceAuthority classification rules

**Add explicit rule:**

```
**sourceAuthority classification for political/foreign government documents:**
- A foreign government's executive order, sanctions, or policy statement about ANOTHER country's judicial proceedings → sourceAuthority: "opinion"
  - These are political/diplomatic actions, NOT legal analysis of judicial fairness
  - Example: US executive order about Brazil's courts = "opinion" (political position)
  - Example: EU sanctions citing human rights concerns = "opinion" (political action)
- ONLY domestic legal documents (court records, appeals rulings, bar association reviews) qualify as sourceAuthority: "primary" for evaluating judicial fairness
```

**Effect:** White House EO would get `sourceAuthority: "opinion"` → deterministic filter removes it (Phase 1 already catches opinion sources).

**Effort:** 30 minutes

---

### Fix 5: Lower Deduplication Threshold (MINOR)

**File:** `apps/web/src/lib/analyzer/evidence-filter.ts`
**Location:** Line 61

Current dedup threshold is 0.85 (85% word overlap). Multiple items from the same source often have 60-80% overlap but don't hit 85%.

**Change:**
```typescript
// From:
deduplicationThreshold: 0.85,
// To:
deduplicationThreshold: 0.75,
```

**Effect:** More aggressive dedup catches overlapping items from same source that are phrased differently.

**Effort:** 5 minutes (but test carefully for false positives)

---

## Implementation Priority

| # | Fix | Priority | Effort | Impact |
|---|-----|----------|--------|--------|
| 1 | Source-deduplicated direction counting | CRITICAL | 1h | Prevents same-source inflation in auto-correction |
| 2 | Quality-weighted verdict prompt | HIGH | 30m | Instructs LLM to weigh by quality, not count |
| 3 | Institutional decision authority | HIGH | 30m | Prevents dissent from being treated as unfairness |
| 4 | Foreign political document classification | MEDIUM | 30m | Removes foreign political docs at extraction layer |
| 5 | Lower dedup threshold | LOW | 5m | More aggressive same-source dedup |

**Total Effort:** ~3 hours
**Recommended implementation order:** Fix 1 → Fix 2 → Fix 3 → Fix 4 → Fix 5

---

## Verification Plan

**Re-run Bolsonaro analysis after fixes and verify:**

- [ ] White House EO items filtered (sourceAuthority: "opinion") or not counted 4x
- [ ] Evidence ratio reflects unique sources, not extracted item count
- [ ] Dissenting opinion does not override majority ruling assessment
- [ ] Verdict is more balanced (not auto-corrected to 35% by inflated counter-evidence count)
- [ ] Check 2-3 other analysis types for regression (vaccine, hydrogen)

---

## Appendix: Bolsonaro Report Evidence Breakdown

**Counter-evidence by source (current - inflated):**

| Source | Items | Should Count As |
|--------|-------|-----------------|
| White House EO | 4 | 0 (foreign political → opinion → filtered) |
| BBC (trial phase article) | 5 | 1 unique source |
| BBC (verdict article) | 1 | 1 unique source |
| Guardian | 1 | 1 unique source |
| CNN | 2 | 1 unique source |
| CS Monitor | 3 | 1 unique source |
| Fair Observer | 0 | - |
| **Total counter** | **16** | **~5 (with Fix 4: ~4)** |

**Supporting evidence by source:**

| Source | Items | Should Count As |
|--------|-------|-----------------|
| Fair Observer | 1 | 1 unique source |
| BBC (trial phase) | 1 | 1 unique source |
| BBC (verdict) | 2 | 1 unique source |
| **Total support** | **4** | **~3** |

**After fixes:** ~4 counter vs ~3 supporting from unique sources = much more balanced assessment.
The LLM still evaluates quality - the documented evidence (coup planning docs, police investigation, 11-0 conviction) would likely maintain a nuanced verdict rather than being overridden by inflated counter-evidence counts.

---

**Approval:**

| Reviewer | Role | Status | Date |
|----------|------|--------|------|
| | Principal Architect | ⏳ PENDING | |
| | Senior Developer | ⏳ PENDING | |
