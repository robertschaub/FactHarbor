# Pipeline Quality Investigation — Phase 7: Post-Fix Validation

**Date:** 2026-02-14
**Investigator:** Claude Opus 4.6 (Lead Architect)
**Status:** Investigation complete, proposals pending Captain approval
**Predecessor:** Phase 6 (`Pipeline_Quality_Phase6_Verdict_and_HarmPotential.md`)

---

## 1. Objective

Re-run all previously investigated jobs **after Phase 6 fixes** (maxOutputTokens 16384, partial JSON recovery, decontextualized harmPotential) to validate fixes and discover remaining or new issues.

## 2. Jobs Submitted

| # | JobId | Input | Pipeline | Status |
|---|-------|-------|----------|--------|
| 1 | `71d90b2b` | Is climate change primarily caused by human activities? | Orchestrated | SUCCEEDED |
| 2 | `2e1ada42` | Sind die Medien der SRG vertrauenswürdige Informationsquellen? (question) | Orchestrated | SUCCEEDED |
| 3 | `402fcd1e` | Die Medien der SRG sind vertrauenswürdige Informationsquellen. (statement) | Orchestrated | SUCCEEDED |
| 4 | `170bc598` | https://srg-initiative.ch/initiative/argumentarium/ | Dynamic | SUCCEEDED |
| 5 | `01810ab0` | https://srg-initiative.ch/initiative/argumentarium/ | Orchestrated | SUCCEEDED |
| 6 | `73449657` | Using hydrogen for cars is more efficient than using electricity | Orchestrated | SUCCEEDED |
| 7 | `476cf382` | Was the Bolsonaro judgment (trial) fair and based on Brazil's law? | Orchestrated | SUCCEEDED |

**Note:** Jobs 2 & 3 initially failed with "Job timed out waiting in queue (exceeded 5 minute limit)" due to all 7 jobs competing for 3 concurrency slots. They were re-submitted sequentially and succeeded.

## 3. Phase 6 Fix Validation

### 3.1 P0 Fix: maxOutputTokens 16384 + Partial JSON Recovery — CONFIRMED FIXED

**Test case:** SRG URL Orchestrated (Job #5) — previously 25 claims all 50/50.

| Metric | Before (Phase 6) | After (Phase 7) |
|--------|-------------------|-----------------|
| Claims | 25, ALL at 50% | 21, range 32–81% |
| Verdict recovery | None (blanket fallback) | Full verdict generation |
| Warnings | `structured_output_failure` | `recency_evidence_gap`, `grounding_check` |

**Verdict: FIXED.** The token limit increase was sufficient — no partial recovery was triggered (the output fit within 16384 tokens). Verdicts now span a healthy range.

### 3.2 P1 Fix: Decontextualized harmPotential — PARTIALLY EFFECTIVE

**Test case:** H2 vs EV (Job #6) — previously 8/13 HIGH (62%).

| Metric | Before (Phase 6) | After (Phase 7) |
|--------|-------------------|-----------------|
| Total claims | 13 | 20 (6 initial + 14 outcome) |
| HIGH harmPotential | 8/13 (62%) | 14/20 (70%) — WORSE |
| Initial claims (6) | — | 6/6 medium (decontextualized FIX WORKS) |
| Outcome claims (14) | — | 14/14 HIGH (NOT fixed) |

**Root cause identified:** See ISSUE-1 below.

**Test case:** Bolsonaro (Job #7) — previously 3/6 HIGH (50%).

| Metric | Before (Phase 6) | After (Phase 7) |
|--------|-------------------|-----------------|
| Total claims | 6 | 9 |
| HIGH harmPotential | 3/6 (50%) | 4/9 (44%) — improved |
| HIGH claims | Sentencing-related | Sentencing/proportionality (appropriate) |

**Verdict: PARTIALLY FIXED.** Decontextualization works for initial claims but outcome claims bypass it entirely.

---

## 4. Issues Found

### ISSUE-1 [P0/CRITICAL]: Outcome claims hardcoded to `harmPotential: "high"`

**Severity:** P0 — affects every analysis that discovers outcome claims (most non-trivial analyses)
**File:** `orchestrated.ts:5718`
**Evidence:** H2 vs EV: 14 outcome claims all HIGH regardless of content

**Root cause:**
`extractOutcomeClaimsFromEvidence()` at line 5718 hardcodes `harmPotential: "high"` on every outcome claim:
```typescript
outcomeClaims.push({
  // ...
  harmPotential: "high",    // <-- hardcoded, not classified
  // ...
});
```

The `classifyHarmPotentialDecontextualized()` call runs at line ~10781, which is **before** outcome claims are added at line ~11962. So the 14 outcome claims never go through decontextualized classification.

**Impact:** Technical/efficiency claims like "Fuel cell system efficiency remains within 50-55% under WLTC" are incorrectly classified as HIGH, inflating the harm profile of the analysis.

**Proposed fix:**
Run `classifyHarmPotentialDecontextualized()` a second time after outcome claims are added (around line 11975), targeting only the newly added outcome claims.

```typescript
// After line 11973 ("Added X outcome-related claims"):
if (outcomeClaims.length > 0) {
  const outcomeHarm = await classifyHarmPotentialDecontextualized(
    outcomeClaims, understandModelInfo.model, state.pipelineConfig
  );
  state.llmCalls++;
  for (let i = 0; i < outcomeClaims.length; i++) {
    const idx = state.understanding!.subClaims.findIndex(sc => sc.id === outcomeClaims[i].id);
    if (idx >= 0) state.understanding!.subClaims[idx].harmPotential = outcomeHarm[i];
  }
}
```

**Cost:** ~$0.003 per analysis (one additional Haiku call). Zero cost when no outcome claims are generated.

---

### ISSUE-2 [P1/HIGH]: SRG Statement catastrophic failure (0 evidence, fallback verdicts)

**Severity:** P1 — complete analysis failure for a valid input
**JobId:** `402fcd1e`
**Input:** "Die Medien der Schweizerischen Radio- und Fernsehgesellschaft (SRG) sind vertrauenswürdige Informationsquellen."

**Symptoms:**
- Only 2 claims extracted (vs 8 from the question form of the same input)
- 0 evidence items across all research iterations
- Both claims received 50/50 fallback verdicts
- Warnings: `structured_output_failure`, `report_damaged`, `verdict_fallback_partial` (x2), `low_source_count`

**Root causes (compound failure):**

1. **Shallow claim decomposition for simple statements:** The LLM decomposes "X sind vertrauenswürdig" into only 2 claims, while "Sind X vertrauenswürdig?" generates 8. The question form triggers the LLM to consider multiple dimensions (editorial standards, independence, track record, public trust, etc.) while the statement form is taken at face value.

2. **Source fetch failures in research:** 0/1 fetched in iteration 1, 1/2 in iteration 2. The reutersinstitute.politics.ox.ac.uk URL consistently fails to fetch, and it was the primary candidate in iteration 1.

3. **Zero evidence extracted from fetched sources:** Even the 1 source that did fetch (reddit.com) yielded 0 evidence items. With 0 evidence, verdicts had nothing to work with.

4. **Verdict generation failure with thin input:** With only 2 claims and 0 evidence, the structured output generation failed entirely, triggering `structured_output_failure` and `report_damaged`.

**Proposed fixes:**

**(a) Minimum claim threshold with re-decomposition (Medium effort):**
After Step 1, if claim count < N (e.g., 4), re-prompt the LLM asking it to decompose the claim into sub-dimensions. This ensures adequate analytical depth regardless of input phrasing.

**(b) Source fetch retry with fallback URLs (Low effort):**
When a source fetch fails (especially for academic/institutional URLs), try alternative cached or archived versions (e.g., Google Cache, Wayback Machine). This is a general resilience improvement.

**(c) Verdict graceful degradation instead of `report_damaged` (Low effort):**
When evidence count is 0 but claims exist, the verdict should explicitly state "insufficient evidence to assess" with an appropriate confidence level, rather than triggering `structured_output_failure` with 50/50 defaults.

---

### ISSUE-3 [P1/HIGH]: Search loop wastes API calls on saturated contexts

**Severity:** P1 — wastes 25+ search API calls per analysis with no information gain
**Evidence:** SRG URL Orchestrated: Steps 2.2–2.7 repeat identical searches for "Fee Equity Across Household Types" 6 times

**Observed behavior:**
- 71 total searches performed, only 4 evidence items collected (0.056 items/search)
- Steps 2.2–2.7: Same context researched 6 times with identical queries
- Each iteration: 5 queries returning same 6 results, 0 new candidates → "adaptive fallback step 3: broad search (0/5 candidates)"
- Other 5 of 7 contexts were never individually researched

**Root cause:**
In `decideNextResearch()` (line 6108-6146), the code iterates through contexts and returns the **first** context with < 2 evidence items. If the search for that context yields no new sources, the next call to `decideNextResearch()` selects the **same** context again (it still has < 2 items). There's no tracking of which contexts have already been attempted.

The loop continues until `state.iterations.length >= contextBudget` (line 6106), which can be 4-6 for a 7-context analysis.

**Result:** 16/21 claims had "reasoning present but no cited evidence" (16% grounding ratio), and Gate 4 showed 20/21 claims with "insufficient" confidence.

**Proposed fix:**

**(a) Track attempted contexts (Low effort, high impact):**
Add a `Set<string>` of context IDs already attempted. In `decideNextResearch()`, skip contexts that have been attempted and still have < 2 evidence. Move to the next under-evidenced context instead of retrying the same one.

```typescript
// In decideNextResearch(), around line 6108:
for (const context of contexts) {
  if (state.attemptedContextIds?.has(context.id)) continue; // Skip already-tried contexts
  // ... existing logic ...
}
```

**(b) Query variation on retry (Medium effort):**
If a context must be retried, generate varied queries (different terms, different search strategy) rather than the same 5 queries. This could leverage the LLM to generate alternative search strategies.

---

### ISSUE-4 [P2/MEDIUM]: Input neutrality violation (SRG question vs statement)

**Severity:** P2 — violates the ≤4% tolerance requirement (AGENTS.md)
**Tolerance violation:** 300% claim count difference (8 vs 2)

| Metric | Question form | Statement form | Delta |
|--------|--------------|----------------|-------|
| Claims | 8 | 2 | 300% |
| Contexts | 3 | 1 | 200% |
| Evidence items | >0 | 0 | ∞ |
| Verdict quality | Varied (35-57%) | All fallback (50/50) | N/A |

**Root cause:** The understand step (LLM claim decomposition) produces significantly different outputs depending on whether the input is phrased as a question vs. a declarative statement. The question form triggers multi-dimensional decomposition while the statement form is taken literally.

**This is partially the same root cause as ISSUE-2(a).** The minimum claim threshold fix would address this.

**Additional proposed fix:**

**(a) Input normalization in understand prompt:**
Add explicit instruction in the UNDERSTAND prompt that both questions and statements about the same topic should produce equivalent analytical depth. Include examples showing "Is X true?" and "X is true" should yield the same claim structure.

---

### ISSUE-5 [P2/MEDIUM]: SRG URL evidence drought (16% grounding, 71 searches → 4 evidence items)

**Severity:** P2 — 84% of claims lack evidence grounding
**JobId:** `01810ab0` (SRG URL Orchestrated)

**Metrics:**
- 71 searches → 4 sources → 4 evidence items → 21 claims
- Grounding ratio: 16% (16/21 claims ungrounded)
- Gate 4: 20/21 "insufficient" confidence
- Quality gate: FAILED

**Root cause:** Compound:
1. **ISSUE-3** (search loop) wastes search budget on one context
2. **Topic specificity:** Swiss broadcasting fees is a niche topic with limited English-language online coverage
3. **Search language mismatch:** Queries are constructed in English (e.g., "whether household structure disproportionately") for a German-language topic. The source page is in German but search queries don't leverage the original language.
4. **Source fetch failures:** Key academic sources (reutersinstitute) consistently fail to fetch

**Proposed fix:**
- ISSUE-3 fix (search loop) would immediately redistribute search budget across all 7 contexts
- Dual-language search queries for non-English inputs (search in both source language and English)
- Source fetch resilience improvements (retry, fallback)

---

### ISSUE-6 [P3/LOW]: Queue timeout on concurrent bulk submission

**Severity:** P3 — operational, not a code quality issue
**Evidence:** Jobs 2 & 3 initially FAILED with "Job timed out waiting in queue (exceeded 5 minute limit)"

**Root cause:** `FH_RUNNER_MAX_CONCURRENCY=3`. When 7 jobs submitted simultaneously, 4 queue and 2 time out (each analysis takes 8-15 minutes).

**Proposed fix:** Increase queue timeout from 5 minutes to 30 minutes. The timeout exists to catch stuck jobs, but 5 minutes is too short when analyses take 8-15 minutes and the queue depth can exceed concurrency.

---

## 5. Healthy Baselines (No Issues)

### Climate Change (Job #1) — EXCELLENT
- 5 claims, all 88-90% (strong consensus topic)
- All harmPotential: medium (correct — climate science ≠ direct physical harm claims)
- No warnings

### Bolsonaro (Job #7) — GOOD
- 9 claims, range 52-81%
- 4/9 HIGH harmPotential — all on sentencing/imprisonment claims (correct)
- 5/9 medium — procedural/legal claims (correct)
- Decontextualized harmPotential is working correctly for initial claims

---

## 6. Priority Matrix and Execution Plan

| Priority | Issue | Effort | Impact | Fix |
|----------|-------|--------|--------|-----|
| **P0** | ISSUE-1: Outcome claims hardcoded harmPotential | Low (15 min) | Critical — affects all analyses with outcome claims | Re-run decontextualized classifier after outcome claims |
| **P1** | ISSUE-3: Search loop on saturated contexts | Low (30 min) | High — 25+ wasted API calls per analysis | Track attempted contexts, skip repeats |
| **P1** | ISSUE-2: Statement catastrophic failure | Medium (1-2h) | High — complete failure for valid input | Minimum claim threshold + re-decomposition |
| **P2** | ISSUE-4: Neutrality violation (question vs statement) | Medium (1h) | Medium — violates ≤4% tolerance | Prompt normalization + claim threshold |
| **P2** | ISSUE-5: Evidence drought / grounding failure | Medium (2h) | Medium — low grounding ratio | Dual-language search + ISSUE-3 fix |
| **P3** | ISSUE-6: Queue timeout | Low (5 min) | Low — operational | Increase timeout |

### Recommended Execution Order

**Phase 7a (immediate, before next analysis batch):**
1. ISSUE-1: Add second `classifyHarmPotentialDecontextualized()` call after outcome claims
2. ISSUE-3: Add `attemptedContextIds` tracking in `decideNextResearch()`

**Phase 7b (next session):**
3. ISSUE-2(a) + ISSUE-4: Minimum claim threshold with re-decomposition
4. ISSUE-6: Queue timeout increase

**Phase 7c (research needed):**
5. ISSUE-5: Dual-language search strategy
6. ISSUE-2(b): Source fetch resilience

---

## 7. Comparison with Previous Runs

| Job | Phase 6 (before fixes) | Phase 7 (after fixes) | Δ |
|-----|----------------------|----------------------|---|
| SRG URL Orch. | 25 claims, ALL 50/50 | 21 claims, 32-81% | P0 FIXED |
| H2 vs EV | 13 claims, 8 HIGH (62%) | 20 claims, 14 HIGH (70%) | Worse (outcome claims) |
| Bolsonaro | 6 claims, 3 HIGH (50%) | 9 claims, 4 HIGH (44%) | Improved |
| Climate Change | — (not tested Phase 6) | 5 claims, 88-90%, 0 warnings | Baseline: excellent |

---

## 8. Additional Deep-Dive Findings (Post-Initial Report)

### 8.1 Evidence Linking: Working Correctly

Initial check using wrong field name (`evidenceIds`) showed 0 links across all jobs. **Corrected:** The actual field is `supportingEvidenceIds`. Results:

| Job | Evidence Linked | Total Evidence Items |
|-----|----------------|---------------------|
| Climate Change | 5/5 (100%) — 31 links | 29 |
| SRG Question (DE) | 6/8 (75%) — 16 links | 16 |
| SRG URL (Orch) | 5/21 (24%) — 6 links | 4 |
| H2 vs EV | 20/20 (100%) — 34 links | 40 |
| Bolsonaro | 9/9 (100%) — 29 links | 34 |

SRG URL's low linking rate is due to evidence drought (ISSUE-5), not a linking bug.

### 8.2 Decontextualized harmPotential: CONFIRMED Working for Initial Claims

The `understanding.subClaims` in H2 show:
- Claims #1-6 (initial): ALL `medium` — decontextualization succeeded
- Claims #7-20 (outcome): ALL `high` — hardcoded at `orchestrated.ts:5718`, never re-classified

This confirms ISSUE-1: the fix works but only covers initial claims.

### 8.3 SRG URL 50% Verdicts: Legitimate (Not Residual P0)

The 3 claims at exactly 50% (#4, #9, #10) are **NOT fallback failures**:
- Each has thoughtful reasoning ("plausible but cannot be verified from the provided evidence")
- All have 0 evidence, INSUFFICIENT confidence (28-30)
- These are correct UNVERIFIED assessments for claims lacking evidence support
- The P0 fix is fully effective — no blanket fallback behavior remains

### 8.4 ISSUE-7 [P2/MEDIUM]: Outcome claims dilute analysis quality metrics

**New issue discovered during deep dive.**

H2 Gate 4 breakdown:
- Initial claims (#1-6): 5/6 publishable (HIGH/MEDIUM/LOW tier)
- Outcome claims (#7-20): only 4/14 publishable, **10/14 INSUFFICIENT**

Root cause: Outcome claims are added AFTER research is complete (`orchestrated.ts:~11962`), so they never get dedicated research. Each outcome claim has only 1 linked evidence item (inherited from context), vs 2-3 for researched initial claims.

**Impact:** Adding 14 outcome claims inflated H2 from 6 to 20 claims, but 10 of the 14 additions fail Gate 4. This makes the analysis appear less confident (9/20 publishable vs 5/6 would have been publishable without outcomes).

**Proposed fix options:**
- **(a) Research outcome claims:** After outcome extraction, run a lightweight research round targeting each outcome claim. Cost: 1-2 additional searches per outcome claim.
- **(b) Mark outcome claims separately:** Add `claimOrigin: "outcome"` field so the UI can distinguish researched vs. outcome-discovered claims. Don't count them equally in quality metrics.
- **(c) Gate outcome claims more strictly:** Require outcome claims to have ≥2 evidence items to pass Gate 4, and exclude below-threshold ones from the final result.

**Recommendation:** Option (b) is lowest effort and most transparent. Combined with ISSUE-1 fix, it makes outcome claims properly classified and clearly labeled.

### 8.5 SRG Question (German): Direction Correction Working

The `verdict_direction_mismatch` warning for claim SC6 shows the LLM-based direction validation working correctly:
- Original verdict: 46% for "Public trust in SRG is high"
- LLM assessment: "Evidence points to declining trust and political influence perceptions"
- Auto-corrected to: 35%
- This feature is functioning as designed

### 8.6 Context-Level Answer Fields: By Design

Context objects in the result don't have `answer`/`confidence` fields — they use `outcome` (text description) and `status` ("concluded"). Context-level claim verdicts and evidence are embedded within the context object. This is the designed schema, not a bug.

---

## 9. Updated Priority Matrix

| Priority | Issue | Effort | Impact | Status |
|----------|-------|--------|--------|--------|
| **P0** | ISSUE-1: Outcome claims hardcoded harmPotential | Low (15 min) | Critical | **CONFIRMED** — decontextualization works for initial claims, outcome claims bypass it |
| **P1** | ISSUE-3: Search loop on saturated contexts | Low (30 min) | High | **CONFIRMED** — 71 searches for 4 evidence items |
| **P1** | ISSUE-2: Statement catastrophic failure | Medium (1-2h) | High | CONFIRMED |
| **P2** | ISSUE-7: Outcome claims dilute quality metrics | Low (30 min) | Medium | **NEW** — 10/14 outcome claims INSUFFICIENT in H2 |
| **P2** | ISSUE-4: Neutrality violation | Medium (1h) | Medium | CONFIRMED |
| **P2** | ISSUE-5: Evidence drought / grounding | Medium (2h) | Medium | CONFIRMED |
| **P3** | ISSUE-6: Queue timeout | Low (5 min) | Low | CONFIRMED |
| **OK** | SRG URL 50% verdicts | — | — | NOT A BUG — legitimate UNVERIFIED assessments |
| **OK** | Evidence linking | — | — | NOT A BUG — correct field is `supportingEvidenceIds` |
| **OK** | Context answer fields | — | — | NOT A BUG — by design (`outcome`/`status` fields) |
| **OK** | Direction correction | — | — | WORKING — auto-corrected SRG SC6 from 46% to 35% |

---

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ISSUE-1 fix causes all outcome harmPotential to drop to medium | Medium | Low — better than all-HIGH | Monitor distribution post-fix |
| ISSUE-3 fix causes under-researched contexts | Low | Medium | Keep contextBudget logic, just skip saturated ones |
| ISSUE-2 re-decomposition produces redundant claims | Medium | Low | Deduplicate after re-decomposition |
| Dual-language search increases search API costs | High | Low — 2x queries per context | Only for non-English inputs |
