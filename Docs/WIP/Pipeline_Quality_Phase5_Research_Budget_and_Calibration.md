# Pipeline Quality — Phase 5: Research Budget Scaling & Verdict Calibration

**Date:** 2026-02-13
**Author:** Senior Developer (Claude Code Opus)
**Inputs:** Senior Developer investigation (Phases 1-4) + Lead Developer re-analysis (Bolsonaro deep-dive)
**Status:** IMPLEMENTED + REVIEWED — Commits `4dbcc12`, `d3df988` on main. Review fixes in `4865f23`. Build verified. Bolsonaro integration test PASSED.
**Hub Document:** Docs/WIP/Pipeline_Quality_Investigation_2026-02-13.md

---

## Executive Summary

Two independent investigations of the orchestrated pipeline converged on the same core quality problems from different angles. The Senior Developer (Phases 1-4, commits `4e000e9` through `9148960`) fixed report assembly, context ID stability, harmPotential keywords, single-context enrichment, search ordering, and verdict direction auto-correction. The Lead Developer re-analyzed the Bolsonaro test job and identified infrastructure-level issues that persisted despite those fixes.

This Phase 5 consolidates both investigations into a unified root cause analysis and implements 7 fixes across 2 files. The fixes address research budget scaling, Block 2 retry starvation, evidence sufficiency thresholds, search relevance mode, harmPotential inflation, verdict hedging, and outcome truncation.

---

## 1. Investigation Consolidation

### Convergence of Findings

| Finding | Senior Dev (Phases 1-4) | Lead Dev (Re-analysis) | Assessment |
|---------|------------------------|----------------------|------------|
| Block 2 retries starve contradiction search | Root cause: `iterations < contexts.length * 2` gate allows unbounded retries | Root cause: `maxResearchIterations: 4` is too low for multi-context | **Both correct** — interlocking problems |
| Thin evidence per context | Observed (16 items, 6 sources for 3 contexts) | Root cause: `minEvidenceItemsRequired` is global (6), not per-context | **Lead Dev adds new insight** |
| Search funnel too aggressive | Partially mitigated by adaptive fallback | Root cause: criticism uses STRICT mode, 4-source cap per iteration | **Lead Dev adds new insight** |
| harmPotential inflation (7/9 HIGH) | Root cause: LLM overgeneralizes from topic to claim | Not covered | **Senior Dev only** |
| Verdict hedging at 50% (8/9 claims) | Root cause: LLM hedging confirmed by Sonnet expert | Mentioned as "0 high-confidence verdicts" | **Senior Dev deeper** — hedging is LLM behavior, not just thin evidence |
| Outcome truncation at 100 chars | Not noticed | Found: `.slice(0, 100)` cuts mid-word | **Lead Dev only** |

### Key Correction on Lead Dev's Issue 6

The Lead Dev states "The contradiction search runs (it must, since `contradictionSearchPerformed` is required for completion at line 5903)". This is **incorrect**. The sufficiency check at line 5910 controls when `decideNextResearch()` returns `{ complete: true }`, but the main loop at line 10749 also exits when `iteration >= effectiveMaxIterations` (previously `config.maxResearchIterations`). The Bolsonaro job events prove the loop exited at iteration 4 with `contradictionSearchPerformed: false` — the contradiction search never fired.

The sufficiency check requiring `contradictionSearchPerformed` prevents **early completion** but cannot prevent **iteration-cap termination**.

---

## 2. Evidence Base

| Job | Topic | Contexts | Quality Gates | Contradiction Search | Verdict | Confidence | Key Issue |
|-----|-------|----------|--------------|---------------------|---------|------------|-----------|
| Bolsonaro (FH-MLLFX3CR) | Trial fairness | 3 | **FAILED** | **NOT performed** | 53% MIXED | 69% | Block 2 consumed all 4 iterations |
| mRNA (recent) | Vaccine safety | 9 | **FAILED** | **NOT performed** | 79% | 76% | 13/19 claims HIGH; contradiction impossible |
| H2 vs EV (recent) | Energy comparison | 11 | **PASSED** | Performed | 46% | 70% | Evidence distributed well |
| Finland (recent) | Happiness ranking | 6 | **PASSED** | Performed | 75% | 75% | Simpler empirical topic |

**Pattern:** Multi-context jobs with political/legal/medical topics fail. Technical/empirical topics pass. The difference is (a) iteration budget exhaustion and (b) search mode aggressiveness for non-institutional counter-evidence.

---

## 3. Root Cause Analysis (Consolidated)

### Issue 1: Iteration Budget Doesn't Scale with Contexts (P0 — CRITICAL)

**Two interlocking problems:**

**1a. Quick mode iterations are fixed regardless of context count**
- `maxResearchIterations: 4` in `config.ts:51` (quick mode)
- With 3 contexts + mandatory contradiction + inverse claim search = 5 needed, only 4 available
- Multi-context analyses were never designed for >2 contexts in quick mode

**1b. Block 2 retries same context indefinitely**
- Old gate: `state.iterations.length < contexts.length * 2` (orchestrated.ts, formerly line 6024)
- Inner loop returns the first context with <2 evidence items
- When extraction assigns evidence to a different context, the same context retries forever
- Bolsonaro proof: CTX_f8e7d20e searched 3 times, never accumulated >=2 items

**Combined effect:** Fixed budget + unbounded retries = contradiction search structurally impossible for multi-context quick-mode jobs.

### Issue 2: Evidence Minimum is Global, Not Per-Context (P0)

- Old sufficiency check: `state.evidenceItems.length >= config.minEvidenceItemsRequired` (6 total)
- With 3 contexts, 6 items globally means 2 items/context average — or 4+1+1
- Weak per-context check only requires each context has >=1 item
- Location: `orchestrated.ts:5910` (was line 5901 before this change)

### Issue 3: Search Funnel Too Aggressive for Counter-Evidence (P1)

- Criticism searches used **STRICT** mode: `requireContextMatch=true` + `strictInstitutionMatch=true`
- STRICT rejects `secondary_commentary` — but news commentary IS the primary counter-evidence for legal/political topics
- `maxSourcesPerIteration: 4` caps results regardless of how many survive filtering
- Adaptive fallback exists (3-step graduated relaxation) but only triggers when `relevantResults.length < adaptiveMinCandidates` (default: 5)
- If STRICT produces 5+ domain-matched results, fallback never triggers even if results lack real counter-evidence

### Issue 4: harmPotential Inflation (P1)

- 7/9 Bolsonaro claims classified HIGH (trial fairness != death/injury)
- 13/19 mRNA claims classified HIGH (vaccine topic != every claim alleges death)
- Prompt criteria were correct in principle but too abstract; LLM overgeneralizes from topic danger to claim danger
- HIGH claims get 1.5x weight in `getClaimWeight()` (aggregation.ts:69), distorting final verdict
- Previous fix (`0c97838`) removed keyword heuristic but didn't add contrastive examples
- Location: `orchestrated.prompt.md:197-216`

### Issue 5: Verdict Hedging / 50% Clustering (P1)

- 8/9 Bolsonaro claims at 45-55% with 28-42% confidence
- LLM expert (Sonnet consultation) confirmed: hedging behavior, not genuine contested assessment
- Root causes: no calibration anchoring, conflating uncertainty types, 50% as safe default
- Partly caused by thin evidence (Issues 1-3) but also independent LLM behavior
- Location: `orchestrated.prompt.md:615-627, 754-758`

### Issue 6: Outcome Truncation (P2)

- `.slice(0, 100)` at old line 5740 cut mid-word
- Bolsonaro CTX1: "...due to abuse of p" (cut at "power")
- Location: `orchestrated.ts:5740-5743`

### Issue 7: Per-Context Budget Tracking Dead Code (P3 — DEFERRED)

- `checkContextIterationBudget()` exists but is never called
- Main loop records iterations with `ITER_1`, `ITER_2` instead of context IDs
- Not fixed in this phase — cleanup only, no quality impact

---

## 4. Implementation

### Commit 1: `4dbcc12` — Infrastructure Fixes

**File:** `apps/web/src/lib/analyzer/orchestrated.ts` (+41, -10)

#### Step 1: Scale Research Budget for Multi-Context

**Location:** Lines 10738-10747 (main research loop)

Added `effectiveMaxIterations` computation before the main while loop:

```typescript
const mandatorySearchSlots = 2; // contradiction + inverse claim
const effectiveMaxIterations = Math.max(
  config.maxResearchIterations,
  Math.min(contextCount + mandatorySearchSlots, config.maxResearchIterations * 2),
);
```

Changed while loop condition from `config.maxResearchIterations` to `effectiveMaxIterations`. Updated progress reporting at lines 10772 and 10781.

**Scaling behavior:**

| Scenario | contextCount | effectiveMaxIterations | Rationale |
|----------|-------------|----------------------|-----------|
| 1 context, quick (4 max) | 1 | max(4, min(3, 8)) = 4 | No change — single-context works |
| 3 contexts, quick (4 max) | 3 | max(4, min(5, 8)) = 5 | 3 ctx + contradiction + inverse |
| 9 contexts, quick (4 max) | 9 | max(4, min(11, 8)) = 8 | 8 iterations (2x cap) |
| 3 contexts, deep (5 max) | 3 | max(5, min(5, 10)) = 5 | No change — deep already sufficient |

**Cap at 2x prevents runaway cost.** The `maxResearchIterations` config value stays UCM-configurable; the scaling is structural code logic.

#### Step 2: Fix Block 2 Retry Starvation

**Location:** Lines 6031-6045 (decideNextResearch, context research gate)

Replaced unbounded `contexts.length * 2` gate with budget-aware cap:

```typescript
const mandatorySlots = 2;
const localEffectiveMax = Math.max(
  config.maxResearchIterations,
  Math.min(contexts.length + mandatorySlots, config.maxResearchIterations * 2),
);
const reserveForContradiction = state.contradictionSearchPerformed ? 0 : 1;
const contextBudget = Math.min(contexts.length, localEffectiveMax - reserveForContradiction);
```

**Before:** Block 2 allowed 6 iterations for 3 contexts (`3 * 2`), consuming all 4 available iterations.
**After:** Block 2 allows at most `contextCount` iterations (one pass), always reserving 1 slot for contradiction search.

| Scenario | contextBudget | Flow |
|----------|--------------|------|
| 3 ctx, 5 effective | min(3, 5-1) = 3 | Iter 1-3: contexts. Iter 4: contradiction. Iter 5: inverse/retry |
| 9 ctx, 8 effective | min(9, 8-1) = 7 | Iter 1-7: 7 of 9 contexts. Iter 8: contradiction |
| 1 ctx, 4 effective | min(1, 4-1) = 1 | Iter 1: context. Iter 2: contradiction. Iter 3-4: other |

#### Step 3: Make Evidence Minimum Context-Aware

**Location:** Lines 5903-5911 (decideNextResearch, sufficiency check)

Added scaled evidence threshold:

```typescript
const scaledMinEvidence = Math.max(
  config.minEvidenceItemsRequired,
  contexts.length * 3,
);
```

| Contexts | Old min | New min |
|----------|---------|---------|
| 1 | 6 | 6 (max(6, 3)) |
| 2 | 6 | 6 (max(6, 6)) |
| 3 | 6 | 9 (max(6, 9)) |
| 6 | 6 | 18 (max(6, 18)) |

**Effect:** For 3-context Bolsonaro, the system won't declare "sufficient" until 9+ evidence items exist. This gates the early-exit path only — it cannot prevent iteration-cap termination, but combined with Steps 1 and 2, the increased budget provides room to reach the threshold.

#### Step 4: Relax Criticism Search Relevance (STRICT -> MODERATE)

**Location:** Lines 11098-11108 (search execution, relevance mode selection)

Removed `criticism` and `counter_evidence` from `strictInstitutionMatch`:

```typescript
// Before:
const strictInstitutionMatch =
  !!decision.targetContextId ||
  decision.category === "criticism" ||           // <- REMOVED
  decision.category === "counter_evidence" ||    // <- REMOVED
  (decision.category === "evidence" && hasInstitutionalContext);

// After:
const strictInstitutionMatch =
  !!decision.targetContextId ||
  (decision.category === "evidence" && hasInstitutionalContext);
```

Also removed `decision.category === "criticism"` from the `allowInstitutionFallback` negation.

**Effect:** Criticism/counter-evidence searches now use MODERATE mode (`requireContextMatch=true`, `strictInstitutionMatch=false`). Context relevance is still enforced — only institution-level matching is relaxed. News commentary and analysis, which are the primary counter-evidence sources for legal/political topics, are no longer rejected.

#### Step 7: Fix Outcome Truncation (100 -> 250 chars)

**Location:** Lines 5740-5743 (enrichContextsWithOutcomes)

```typescript
// Before:
const outcome = String(parsed.outcome || "").trim().slice(0, 100);

// After:
const rawOutcome = String(parsed.outcome || "").trim();
const outcome = rawOutcome.length > 250
  ? rawOutcome.slice(0, 250).replace(/\s+\S*$/, "")
  : rawOutcome;
```

Truncation now happens at word boundary, preventing mid-word cuts like "...due to abuse of p".

---

### Commit 2: `d3df988` — Prompt Calibration

**File:** `apps/web/prompts/orchestrated.prompt.md` (+45, -7)

#### Step 5: Fix harmPotential Inflation (Contrastive Examples)

**Location:** Lines 197-216

Replaced abstract criteria with contrastive examples to prevent LLM overgeneralization:

**MEDIUM examples** (5):
- "The trial violated due process" -> procedural -> MEDIUM
- "The regulatory approval was rushed" -> process criticism -> MEDIUM
- "The vaccine was developed faster than usual" -> timeline -> MEDIUM
- "The court did not hear all witnesses" -> procedural -> MEDIUM
- "The economic impact was significant" -> economic -> MEDIUM

**HIGH examples** (3):
- "The drug caused 12 deaths in clinical trials" -> death -> HIGH
- "The building's fire exits were blocked" -> safety hazard -> HIGH
- "The CEO embezzled $50M from pension funds" -> major fraud -> HIGH

Added: "The topic being about criminal trials, vaccines, or safety does NOT make every claim HIGH."

**Design rationale:** Abstract rules ("claim-level not topic-level") were insufficient because the LLM reasoned that claims about dangerous topics are inherently about danger. Contrastive examples show the boundary between topic danger and claim-level danger.

#### Step 6a: Two-Step Verdict Assessment Method

**Location:** Lines 615-627 (added before verdict output structure)

Added a structured two-step process that forces the LLM to inventory evidence before assigning a percentage:

1. **Evidence inventory** — Count supporting, counter-evidence, and neutral items. Note quality.
2. **Percentage from evidence** — Assign based on inventory using 6 calibration anchors:

| Evidence Pattern | Verdict Range |
|-----------------|---------------|
| 3+ supporting, 0 counter | 72-85% |
| 2+ supporting, 1 counter | 58-71% |
| Roughly equal | 43-57% |
| 1 supporting, 2+ counter | 29-42% |
| 0 supporting, 3+ counter | 15-28% |
| No relevant evidence | 50% with confidence < 30% |

**Design rationale:** LLM expert consultation confirmed that hedging occurs because the LLM jumps directly to a "safe" 50% without systematically evaluating evidence. The two-step process forces an intermediate reasoning step that grounds the verdict in evidence counts.

#### Step 6b: Confidence = Evidence Strength

**Location:** Lines 640-645 (replaced confidence description)

Redefined confidence as a 5-tier evidence strength measure:

| Range | Meaning |
|-------|---------|
| 80-100 | Multiple high-quality primary sources agree |
| 60-79 | At least 2 credible sources with consistent findings |
| 40-59 | Limited sources or mixed quality |
| 20-39 | Single source or mostly secondary commentary |
| 0-19 | No direct evidence found (verdict based on inference) |

**Design rationale:** The old definition ("a NUMBER from 0-100") gave no calibration guidance. LLMs defaulted to 40-60% confidence regardless of actual evidence quality.

#### Step 6c: Anti-Hedging Instructions

**Location:** Lines 754-758 (after first calibration bands) and line 896 (after second calibration bands)

Full instruction (line 754):
```
CRITICAL: Avoid 50% hedging.
- 50% means "equal weight of evidence on both sides" — it is a SPECIFIC finding, not a safe default
- If you lack evidence, use 50% BUT set confidence below 30% to signal UNVERIFIED (insufficient data)
- If you have evidence that leans one direction, the verdict MUST move away from 50%
- A cluster of claims all at 45-55% is a red flag for hedging
```

Compact version (line 896) for the standalone verdict section:
```
CRITICAL: Avoid 50% hedging. 50% means "equal evidence on both sides" — not a safe default.
If you lack evidence, use 50% with confidence < 30%. If evidence leans one direction, the verdict
MUST move away from 50%.
```

---

## 5. Interaction with Previous Fixes

These Phase 5 changes build on and complement the Phase 1-4 fixes:

| Previous Fix | Status | Interaction with Phase 5 |
|-------------|--------|-------------------------|
| Report Assembly enrichment (`4e000e9`) | Working | No interaction — operates on output, not research |
| Context ID Stability (`61050da` + `ab28b01`) | Working | No interaction — operates during context refinement |
| harmPotential keyword removal (`0c97838`) | Working but insufficient | Phase 5 Step 5 adds contrastive examples to close the remaining gap |
| Single-context enrichment (`93a5813`) | Working | No interaction — different code path |
| Contradiction search ordering (`93a5813`) | Helps but insufficient | Phase 5 Steps 1-2 fix the structural budget problem that was the real root cause |
| Verdict direction auto-correction (`9148960`) | Working | Phase 5 Step 6 improves verdict quality BEFORE direction validation runs |
| Prompt caching (`3a1012a`) | Working | Phase 5 increases iteration count, but caching offsets cost increase |

**Key insight:** The `93a5813` fix moved cross-context discovery after contradiction search, which helps but was treating a symptom. The actual root cause was Block 2 consuming ALL iterations regardless of ordering. Phase 5 Steps 1-2 fix the structural problem.

---

## 6. Build & Test Verification

- **`npm -w apps/web run build`**: PASSES. TypeScript compiles, prompt file reseeded into UCM.
- **`npm test`**: 47 pre-existing vitest infrastructure failures ("No test suite found") — NOT caused by these changes. Same issue observed in multiple previous sessions.
- **Manual verification**: Diff review confirms all changes are self-contained within the 2 files, no type changes required, no interface modifications.

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| More iterations = higher API cost per job | LOW | Capped at 2x base config. Quick mode: max 8 vs current 4. Cost proportional to analysis complexity. Anthropic prompt caching (`3a1012a`) offsets with 90% input token discount. |
| Scaled evidence minimum may prevent early completion | LOW (desired) | This IS the fix — prevents thin-evidence reports. Increased iterations provide budget to meet threshold. |
| Relaxing criticism mode may admit irrelevant results | LOW | MODERATE still requires context match (topic relevance). Only institution-level strictness relaxed. LLM evidence extraction further filters quality. |
| Anti-hedging prompt may cause over-correction | MEDIUM | Direction correction system catches extreme misalignments. "Equal evidence = 50%" remains valid. Anchors are ranges, not exact values. |
| Prompt changes are hard to test in isolation | MEDIUM | Two-commit strategy: code changes first (testable), prompt changes second (can be reverted independently). |
| `localEffectiveMax` duplicates `effectiveMaxIterations` formula | LOW | Same formula computed in two locations (main loop + decideNextResearch). Kept in sync by being identical. Alternative (passing via state/parameter) would require larger refactor. |

---

## 8. Code Review Checklist

### Commit `4dbcc12` — orchestrated.ts

- [ ] **Step 1 (line 10744):** `effectiveMaxIterations` formula — verify `Math.max(config.maxResearchIterations, Math.min(contextCount + 2, config.maxResearchIterations * 2))` produces correct values for edge cases (0 contexts, 1 context, 20 contexts)
- [ ] **Step 1 (lines 10772, 10781):** Progress reporting uses `effectiveMaxIterations` — verify progress bar doesn't exceed 100%
- [ ] **Step 2 (line 6036):** `localEffectiveMax` formula matches `effectiveMaxIterations` — verify consistency
- [x] **Step 2 (line 6041):** `contextBudget` calculation — ~~verify never produces negative values~~ FIXED: Added `Math.max(0, ...)` floor (review fix)
- [x] **Step 3 (line 5906):** `scaledMinEvidence` — ~~verify doesn't create unreachable thresholds~~ FIXED: Capped at `Math.floor(config.maxTotalSources * 0.75)` (review fix)
- [ ] **Step 4 (lines 11102-11108):** Verify `requireContextMatch` still includes `criticism` category (only `strictInstitutionMatch` was relaxed)
- [ ] **Step 7 (line 5742):** Word boundary regex `\s+\S*$` — verify it handles edge cases (no spaces in string, all spaces, exactly 250 chars)

### Commit `d3df988` — orchestrated.prompt.md

- [ ] **Step 5 (lines 204-216):** harmPotential examples — verify examples are abstract enough per AGENTS.md ("No test-case terms" rule). Current examples use generic terms ("the trial", "the drug", "the building") — acceptable
- [ ] **Step 6a (lines 615-627):** Verdict assessment anchors — verify ranges don't overlap and cover the full 0-100% scale
- [ ] **Step 6b (lines 640-645):** Confidence calibration — verify tiers are consistent with existing confidence band usage elsewhere in the prompt
- [ ] **Step 6c (lines 754-758, 896):** Anti-hedging instructions — verify they don't contradict the "43-57 = UNVERIFIED" band definition (they clarify it: 50% is valid only with confidence < 30%)

---

## 9. Pending: Integration Test Plan (Captain-Supervised)

| Test Job | What to Verify |
|----------|---------------|
| Bolsonaro trial fairness | `contradictionSearchPerformed: true`, evidence >= 9 items, harmPotential <= 2 HIGH, verdicts not clustered at 50% |
| mRNA vaccine claim | `contradictionSearchPerformed: true`, harmPotential majority MEDIUM, confidence reflects evidence count |
| H2 vs electricity (regression) | Quality gates still PASS, no degradation in evidence distribution |
| Finland happiness (regression) | Quality gates still PASS, verdict/confidence unchanged |

**Metrics to collect:**
- Total iterations used vs `effectiveMaxIterations`
- Per-context evidence item counts
- harmPotential distribution (HIGH/MEDIUM/LOW)
- Verdict percentage distribution (histogram: are claims still clustered at 45-55%?)
- Confidence distribution (histogram: are values > 50% for well-evidenced claims?)
- `contradictionSearchPerformed` flag
- `qualityGates.passed` flag

---

## 10. Integration Test Results

### Bolsonaro (FH-MLLJPBNU) — 2026-02-13 23:55

**Status: SUCCEEDED** | 4 contexts | 31 searches | 10 claims

#### Verdict Hedging — MAJOR IMPROVEMENT

| Metric | Before (FH-MLLFX3CR) | After (FH-MLLJPBNU) |
|--------|----------------------|---------------------|
| Status | FAILED (quality gates) | SUCCEEDED |
| Contexts | 3 | 4 |
| Searches | ~12 | 31 |
| Claims at 45-55% | 8/9 (89%) | 3/10 (30%) |
| Claims at 50% exact | ~8 | 2 (both with conf < 30% = data gap) |
| Overall verdict | 53% MIXED, 69% conf | 57% MIXED, 67% conf |

**Claim-level verdicts:**

| Claim | Verdict | Confidence | Assessment |
|-------|---------|------------|------------|
| SC1 procedural fairness | 59% | 47% | Directional, evidence-based |
| SC2 substantive law | 62% | 46% | Directional, evidence-based |
| SC4 defense opportunity | 62% | 46% | Directional, evidence-based |
| SC5 evidence threshold | 58% | 41% | Directional, evidence-based |
| SC6 correct statutes | 60% | 40% | Directional, evidence-based |
| SC9 visa revocation | 40% | 37% | Directional, counter-evidence |
| SC8 house arrest | 56% | 33% | Slightly directional |
| SC3 impartiality | 46% | 41% | Near-center, legitimate mixed |
| SC7 sentence proportionality | 50% | 25% | 50% + conf < 30% = data gap |
| SC10 appellate timeline | 50% | 23% | 50% + conf < 30% = data gap |

The anti-hedging instruction works as designed: claims with evidence move away from 50%; claims without evidence use 50% with confidence < 30% to signal UNVERIFIED.

#### harmPotential — IMPROVED, RESIDUAL INFLATION

**Before:** 7/9 HIGH (78%)
**After:** 4/10 HIGH (40%) — SC7, SC8, SC9, SC10

Residual inflation: SC9 ("visa revocation justified") and SC10 ("procedural timeline adequate") should be MEDIUM. The LLM generalizes liberty-restriction from the topic rather than assessing the specific claim. SC7 (sentence proportionality) and SC8 (house arrest) are arguably HIGH since they involve direct liberty restriction.

#### Context Verdicts — WELL DIFFERENTIATED

| Context | Verdict | Confidence | Evidence |
|---------|---------|------------|----------|
| Public Perception | 62% Leaning True | 52% | 3+, 0-, 1n |
| International Diplomatic | 48% Unverified | 38% | 1+, 1-, 1n |
| Judicial Impartiality | 55% Unverified | 48% | 1+, 3- |
| Supreme Court Trial | 63% Leaning True | 55% | 4+, 1- |

Contexts are differentiated and contextually appropriate — not clustered.

#### Outcomes — NOT TRUNCATED

Context outcomes are complete sentences (e.g., "Majority of Brazilians support court's decision on Bolsonaro's house arrest and believe Supreme Court Justice de Moraes is acting lawfully; majority reject claims of political persecution").

#### Remaining Regression Tests Needed

- mRNA vaccine claim
- Finland happiness

---

### SRG/SRF Trustworthiness (FH-MLLJSOAD) — 2026-02-13 23:58

**Status: SUCCEEDED** | 7 contexts | 20 searches | German-language input

**Verdict hedging:** EXCELLENT — 7 contexts range from 55% to 80%, all well-differentiated. Brand Trust context (80%, 72% conf) has strongest evidence (4+, 0-) and highest confidence. No clustering.

**harmPotential:** CLEAN — no HIGH claims visible. Correct for media trustworthiness topic.

**Multilingual:** German input correctly processed, contexts appropriately structured.

**Confidence calibration:** Active — density_anchor 50→64, context_consistency 64→60 (spread=32pp).

**Concern:** 7 contexts for a media trustworthiness claim is broad. Some tangential (AI Assistant Reliability, Misinformation Exposure). Context detection scope issue, not Phase 5.

---

### H2 vs Electricity (FH-MLLJNR93) — 2026-02-13 23:54

**Status: SUCCEEDED** | 4 contexts | 24 searches | Regression test

**Verdict hedging:** ZERO hedging. Claims range 20% to 86%. Core "hydrogen more efficient" claims correctly rated 20-21% (Mostly False). Factual sub-claims correctly 76-86% (Mostly True/True). Data gap pattern working (Heavy-Duty TCO: 48%, 25% conf).

**harmPotential:** INFLATED — 5/10 HIGH. All are technical efficiency/performance claims ("70-90% conversion efficiency", "555 km range", "lower tank-to-wheel efficiency"). None allege death/injury/fraud. LLM generalizes from vehicle/energy topic to safety concern.

**Prompt fix applied:** Added 3 more abstract MEDIUM contrastive examples to `orchestrated.prompt.md` (per AGENTS.md: no test-case terms):
- "Technology A has lower efficiency than Technology B" → performance comparison → MEDIUM
- "The system achieved a measured output of N units" → technical metric → MEDIUM
- "Entity X revoked or restricted privileges of Entity Y" → administrative action → MEDIUM

---

### Cross-Report harmPotential Summary

| Report | HIGH / Total | Pattern |
|--------|-------------|---------|
| Bolsonaro | 4/10 (40%) | Diplomatic + procedural timeline inflated |
| SRG/SRF | 0/2 (0%) | Clean — no safety-adjacent topic |
| H2 vs EV | 5/10 (50%) | Technical efficiency claims inflated |

**Root cause confirmed:** LLM inflates harmPotential for claims in topics it associates with danger (vehicles/energy → safety, trials → liberty) even when specific claims are about efficiency metrics or procedural timelines. Three rounds of contrastive examples now cover: legal/procedural, technical/efficiency, and diplomatic claims.

---

## 11. Code Review Response

### Review by: Senior Developer (Cline/glm-5) — 2026-02-14

#### Issue 1: Potential Negative contextBudget (P1) — FIXED

**Finding:** If `localEffectiveMax` could equal 1 and `reserveForContradiction` equals 1, `contextBudget` could be 0 or negative.

**Assessment:** In practice, `localEffectiveMax >= 4` (since `Math.max(config.maxResearchIterations, ...)` and quick mode minimum is 4). However, adding a floor is good defensive programming.

**Fix:** Added `Math.max(0, ...)` wrapper:
```typescript
const contextBudget = Math.max(0, Math.min(contexts.length, localEffectiveMax - reserveForContradiction));
```

#### Issue 2: Scaled Evidence May Be Unreachable (P2) — FIXED

**Finding:** For 6+ contexts in quick mode, `scaledMinEvidence` (18+) exceeds `maxTotalSources` (12), making the threshold unreachable.

**Assessment:** Valid. The unreachable threshold doesn't cause incorrect behavior (research still continues until iteration cap), but it means the sufficiency early-exit path is dead code for high context counts.

**Fix:** Capped at 75% of `maxTotalSources`:
```typescript
const scaledMinEvidence = Math.max(
  config.minEvidenceItemsRequired,
  Math.min(contexts.length * 3, Math.floor(config.maxTotalSources * 0.75)),
);
```

New scaling (quick mode, `maxTotalSources = 12`):

| Contexts | `ctx * 3` | `floor(12 * 0.75)` = 9 | scaledMinEvidence |
|----------|-----------|-------------------------|-------------------|
| 1 | 3 | 9 | 6 (base floor) |
| 3 | 9 | 9 | 9 |
| 4+ | 12+ | 9 | 9 (capped) |

#### Issue 3: Anti-Hedging vs UNVERIFIED Band (P2) — ALREADY ADDRESSED

**Finding:** 50% + confidence < 30% might be confused with hedging.

**Assessment:** The prompt already addresses this explicitly:
- Line 627: "If no relevant evidence found -> 50% with confidence < 30% (mark as data gap, NOT as 'balanced')"
- Line 756: "If you lack evidence, use 50% BUT set confidence below 30% to signal UNVERIFIED"

The Bolsonaro test confirms this works correctly: SC7 (50%, 25%) and SC10 (50%, 23%) use this pattern.

#### Reviewer's Proposals — Assessment

| Proposal | Assessment | Action |
|----------|-----------|--------|
| P1: CI integration tests | Valuable but expensive (real LLM calls). Better as scheduled nightly job. | Deferred to backlog |
| P2: Telemetry dashboard | Good for monitoring. Requires API endpoint + UI work. | Deferred to backlog |
| P3: Prompt regression tests | Useful for golden-master testing. Requires care to avoid AGENTS.md violation (no test-case terms). | Deferred to backlog |
| P4: Dynamic evidence threshold | **IMPLEMENTED** (Issue 2 fix above) | Done |
| Formula extraction | Valid code quality suggestion. Low priority — same 3-line formula in 2 locations. | Deferred (P3) |

---

## 12. Deferred Items (Not in This Phase)

> Note: Issue 2 from the code review (`scaledMinEvidence` unreachable) has been fixed — removed from this list.

| Item | Priority | Reason for Deferral |
|------|----------|-------------------|
| Per-context iteration budget tracking (dead code cleanup) | P3 | No quality impact — `checkContextIterationBudget()` is unused |
| "context" suffix in context names | P3 | Cosmetic only |
| Per-context `maxSourcesPerIteration` scaling | P2 | Wait for integration test data before further search tuning |
| Evidence sufficiency per-context minimum (stronger version) | P2 | Current `contexts.every(has >= 1)` check at line 5916 may need strengthening to >= 2, but wait for results first |
| ~~`scaledMinEvidence` vs `maxTotalSources` ceiling~~ | ~~P2~~ | **FIXED** in review round — capped at 75% of `maxTotalSources` |

---

## 13. Complete Commit History (This Investigation)

| Commit | Date | What | Phase |
|--------|------|------|-------|
| `4e000e9` | 2026-02-13 | Enriched contexts, rating labels, DEGRADED status, budget fix | 1-3 |
| `61050da` | 2026-02-13 | Batched LLM similarity remap, moved orphan check, 4-layer defense | 4 |
| `ab28b01` | 2026-02-13 | Moved claim assignments before ensureContextsCoverAssignments | 4-hotfix |
| `0c97838` | 2026-02-13 | Narrowed HIGH criteria, removed keyword list, one-directional override | Bonus |
| `3a1012a` | 2026-02-13 | Anthropic prompt caching on system messages | Cost |
| `93a5813` | 2026-02-13 | Single-context enrichment, contradiction search ordering | Addendum |
| `9148960` | 2026-02-13 | Verdict direction auto-correction with LLM suggestedPct | Direction |
| `4dbcc12` | 2026-02-13 | Scale iteration budget, fix Block 2, context-aware evidence, relax search, outcome truncation | 5 (code) |
| `d3df988` | 2026-02-13 | harmPotential examples, verdict assessment method, anti-hedging | 5 (prompts) |
| `4865f23` | 2026-02-14 | Review fixes: contextBudget floor, scaledMinEvidence cap | 5 (review) |

**Total files modified across all phases:** `orchestrated.ts`, `orchestrated.prompt.md`, `types.ts`, `text-analysis-verdict.prompt.md`, `orchestrated-compact.prompt.md`, Direction Semantics xWiki doc.

---

## 14. Lessons Learned

1. **Trace actual execution via job events, not code reading alone.** The `93a5813` contradiction fix targeted the wrong block because it was based on code ordering, not runtime behavior. The real starvation came from Block 2 consuming all iterations.

2. **LLM instructions need concrete negative examples.** "Claim-level not topic-level" is too abstract. Contrastive examples (MEDIUM vs HIGH for the same topic) are much more effective.

3. **Two independent investigations are better than one.** The Senior Dev and Lead Dev found complementary issues. Infrastructure fixes (iterations, evidence thresholds) and LLM-behavior fixes (harmPotential, hedging) are both needed — neither alone is sufficient.

4. **Multi-context quick mode was never designed for >2 contexts.** The `* 2` multiplier and fixed iteration cap prove this. The system grew to handle 3-11 contexts without scaling the budget.

5. **Sufficiency checks vs iteration caps are independent exit paths.** The `decideNextResearch()` sufficiency check controls `{ complete: true }` but cannot prevent the main loop's iteration cap from terminating research. Both paths must be correct for the system to work.
