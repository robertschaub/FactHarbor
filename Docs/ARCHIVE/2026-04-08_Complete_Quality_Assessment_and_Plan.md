# Complete Quality Assessment and Forward Plan

**Date:** 2026-04-08
**Role:** Senior Developer (Claude Code, Opus 4.6)
**Scope:** All known report quality issues — complete inventory from 100+ Plastik runs, 33+ Bolsonaro runs, 12+ Bundesrat runs, 74 deployed jobs, full git history, and all prior investigation documents
**Status:** Revised per LLM Expert review (2026-04-08)

---

## 1. Executive Summary

After exhaustive analysis of all local and deployed job history, six quality issues are cataloged. The investigation found that the previous implementation focus — prompt-level modifier preservation for one specific German legal term — was the **narrowest** issue, while the **broadest** quality gap (cross-linguistic neutrality) has higher user impact and was not being actively worked.

The recommended reordering puts cross-linguistic neutrality first, Bundesrat structural post-check second, and downstream fixes third.

---

## 2. Statistical Evidence Base

### 2.1 Plastik DE — 105 local runs + 4 deployed

| Metric | Value |
|---|---|
| Total local runs | 105 (+ 8 UNVERIFIED) |
| Truth% range | 15–74 (59pp) |
| Mean | 38.8 |
| Median | 37.0 |
| Stdev | 13.4 |
| Runs in correct direction (≤50%) | 84/105 (80%) |
| Runs in wrong direction (>60%) | 10/105 (10%) |
| Deployed range | LF 29.6 – LT 62 |

**External reality (from OECD, EEA, EPA):** "Plastik recycling bringt nichts" is closer to FALSE/MIXED. Recycling has measurable benefits but is insufficient alone. The local mean (39) is in the correct range. The deployed outlier (`2cf4682c` at LT 62) is factually worse.

### 2.2 Plastik Cross-Linguistic — The Largest Quality Gap

Measured at commit `9459347711a8` (March 2026, 100-job analysis):

| Language | Mean truth% | Direction | Jobs |
|---|---|---|---|
| DE ("bringt nichts") | 37% | Mostly FALSE-side | 12 |
| EN ("is pointless") | 56% | Mostly TRUE-side | 14 |
| FR ("ne sert a rien") | 31% | Mostly FALSE-side | 6 |

**Max cross-language spread: 58pp (DE 33% vs EN 72% vs FR 13%).**

Same semantic claim, three languages, directionally opposite verdicts. English-language web sources return more recycling-criticism evidence (US/UK), while German/French return more recycling-support evidence (EU/DACH infrastructure). This is Stage 2 evidence language bias, not Stage 1.

### 2.3 Bolsonaro EN — 33 local runs + 2 deployed

| Metric | Value |
|---|---|
| Total local runs | 33 (+ 1 UNVERIFIED) |
| Truth% range | 57–77 (20pp) |
| Mean | 65.7 |
| Median | 66.0 |
| Stdev | 5.9 |
| Direction flips | 0 |

**The most stable hard family.** Direction never flips. Phase B produced the best result (MT 74/68, matching deployed MT 73/70). Within EVD-1 amber band. No fix needed.

### 2.4 Bundesrat EU-Vertrag — 12+ local runs + 3 deployed

**"Rechtskräftig" variant (12 local runs):**

| Metric | Value |
|---|---|
| Truth% range | 11–90 (79pp) |
| Mean | 57.7 |
| Stdev | 30.7 |

**Chronology-only variant (5 local runs):**

| Metric | Value |
|---|---|
| Truth% range | 9–89 (80pp) |
| Mean | 45.4 |

**The most unstable input family by far.** The 79pp spread is driven by whether Stage 1 preserves or drops the word "rechtskräftig." When preserved: verdict correctly low (11–31). When dropped: verdict incorrectly high (68–90).

### 2.5 Swiss FC DE — 8 local runs + 2 deployed

Evidence-thin and volatile. Ranges from UNVERIFIED 50/0 to MOSTLY-TRUE 76/65. Dominated by fetch reliability, not pipeline logic. No targeted fix warranted.

---

## 3. Complete Issue Catalog

### Issue 1: Cross-Linguistic Neutrality (NEUTRALITY-1)

**Symptom:** Same semantic claim in different languages produces directionally opposite verdicts. Plastik recycling: DE 37% mean vs EN 56% mean — 58pp max spread.

**Root cause:** Stage 2 evidence language bias. English-language web searches return more recycling-criticism sources (US/UK media, Greenpeace US). German/French searches return more recycling-support sources (EU/DACH institutional reports, Umweltbundesamt).

**Affected families:** All multilingual families. Measured on Plastik DE/EN/FR.

**Current status:** NEUTRALITY-1 exists as a backlog item. Experimental default-off EN supplementary retrieval lane is implemented behind UCM (`supplementaryEnglishLane.enabled: false`). LanguageIntent and reportLanguage threading are shipped. Not yet promoted or A/B tested.

**What was attempted:** Proposal 2 multilingual output/search policy (shipped experimentally). EN supplementary lane code exists but is default-off.

**What was NOT attempted:** A neutrality-focused investigation to characterize whether the divergence is in query language, search provider behavior, source availability, or extraction bias. The existing EN supplementary lane is scarcity-triggered (`triggerMode: "native_scarcity_only"`), not neutrality-balancing — simply enabling it would not reliably address this gap because Plastik DE is not a scarcity case. See revised Priority 2 in §5.

**Prior documentation:**
- `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md` §4a — first measurement of 58pp spread
- `Docs/STATUS/Current_Status.md` — "Cross-linguistic neutrality remains the next quality gap"
- `Docs/STATUS/Backlog.md` — NEUTRALITY-1 item

### Issue 2: Bundesrat Proposition Anchoring

**Symptom:** 79pp verdict spread (FALSE 11 to TRUE 90) on the same input. Three distinct failure modes: keyword omission, interpretation injection, aggregation underweighting.

**Root cause:** Stage 1 claim extraction inconsistently handles truth-condition-bearing modifiers. The German word "rechtskräftig" (legally binding) is the specific failure trigger. When preserved, the verdict is analytically correct. When dropped, the pipeline only verifies trivially-true chronological facts.

**Affected families:** Bundesrat EU-Vertrag. Potentially any input containing a modifier that changes truth conditions.

**Current status:** Two rounds of prompt-level fixes attempted. Anti-inference rule works (4/4 clean). Modifier preservation stuck at 1/3. Contract validator hallucinates approval.

**What was attempted:**
- Round 1 (`6b2f3df8`): truth-condition-bearing modifier rule + anti-inference rule + contract validator check → 1/3 preservation, anti-inference working
- Round 2 (`70d4b9b3`/`4ba0349c`): strengthened with mandatory modifier identification, self-check, structured truthConditionAnchor output → still 1/3 preservation, validator still hallucinated

**What was NOT attempted:**
- **Structural code-level post-check (Option B):** After extraction, programmatically compare `impliedClaim` tokens against atomic claim tokens to detect modifier omission, then force retry with explicit instruction. This is deterministic detection + LLM retry, not a keyword heuristic for analysis decisions.
- **Model tier upgrade for extraction:** Currently uses Haiku. Sonnet might have better semantic understanding of German legal qualifiers.
- **Two-pass extraction with explicit modifier check:** Separate LLM call after extraction to verify modifier coverage.

**Prior documentation:**
- `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Consolidated_Investigation.md` — three failure modes documented with job IDs
- `Docs/WIP/2026-04-08_Proposition_Anchoring_Fix_Plan.md` — Fix 1/2/3 plan with LLM Expert review

### Issue 3: Stage 4 Truth/Misleadingness Leakage

**Symptom:** Factually correct claims scored as FALSE because the framing is misleading. Visible on Bundesrat chronology runs (TRUE chronological claim → FALSE 14) and some Plastik runs.

**Root cause:** Stage 4 advocate/reconciler conflates "the framing is misleading" with "the fact is false." The `misleadingness` field exists as a separate assessment, but truth percentages are still contaminated by misleadingness judgment.

**Affected families:** Bundesrat chronology variant, potentially any input where a true fact has a misleading framing.

**Current status:** Identified. The reconciliation prompt already says misleadingness is independent of truth, but enforcement is inconsistent. Fix 2 from the proposition anchoring plan (advocate-level truth/misleadingness separation) was proposed but deferred per LLM Expert review.

**What was attempted:** Nothing — Fix 2 was deferred pending Fix 1 validation.

**What was NOT attempted:** Strengthening the truth/misleadingness separation in the advocate step (the real gap, per LLM Expert review). The reconciliation already has the right instruction; the advocate doesn't.

### Issue 4: Boundary Concentration

**Symptom:** Single boundaries absorb 60–100% of evidence. Plastik Phase B: 1 boundary with 135 items (share=1.00). Bolsonaro Phase B: 0.82 max share.

**Root cause:** Stage 3 clustering collapses evidence into mega-boundaries, especially when evidence volume is high. Pre-existing issue amplified by Phase B's per-claim iteration floor (more evidence → more material for Stage 3 to mis-cluster).

**Affected families:** Plastik DE, Bolsonaro EN on high-evidence runs. Less affected: Swiss, Misinfo.

**Current status:** Phase C of UPQ-1 is planned but not implemented. The original UPQ-1 proposal correctly sequences Stage 2 before Stage 3.

**Prior documentation:**
- `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`
- `Docs/WIP/2026-04-07_UPQ1_Phase_B_Canary_Measurement.md`

### Issue 5: Stage 1 Classification/Decomposition Instability

**Symptom:** Same input classified as `ambiguous_single_claim` or `single_atomic_claim` across runs, producing different claim counts and different verdicts. SRG SSR family: 33pp within-input spread from classification oscillation. Bundesrat family: 2 vs 3 claims across runs.

**Root cause:** Stage 1 LLM non-deterministically classifies inputs near the boundary between `ambiguous_single_claim` and `single_atomic_claim`. This is broader than the Bundesrat modifier issue — it affects any input whose classification is genuinely ambiguous.

**Affected families:** SRG SSR (documented in March 2026 deep analysis, 33pp spread), Bundesrat (2 vs 3 claim count), potentially Misinfo EN (2 vs 3 claims).

**Current status:** Open. Related to `STG1-DECOMP` backlog item. The Flat-Earth false-ambiguity fix (FLAT-EARTH-1) addresses one narrow subclass but not the general problem.

**Prior documentation:**
- `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md` §4d — SRG SSR classification instability
- `Docs/STATUS/Backlog.md` — STG1-DECOMP item

---

### Accepted / Monitor-Only (not active issues)

**Plastik Within-Language Variance:** 59pp spread across 105 local runs. Mean 39, median 37, 80% correct direction. Accepted under EVD-1 amber band. The variance is inherent topic contestability, not a pipeline bug. No fix needed.

**Grounding Warning Persistence:** ~65% of all jobs carry grounding/direction/baseless warnings at info severity. The alias fix eliminated timestamp-ID false positives. Remaining warnings are genuine internal diagnostics. Not affecting verdicts. No fix needed now.

---

## 4. What Was Learned From the Fix 1 Attempts

### What worked
- **Anti-inference rule:** 4/4 chronology-only runs produced no normative injection. This part of Fix 1 is reliable and should be kept.
- **Phase B per-claim floor:** All claims now receive ≥1 researched iteration. Plastik AC_01 went from 41 seeded/0 researched to productive research. Bolsonaro hit MT 74. Keep Phase B.

### What didn't work
- **Prompt-only modifier preservation:** Two rounds, same 1/3 rate. The LLM (Haiku/Sonnet 4.5) does not treat "rechtskräftig" as a truth-condition-changing modifier regardless of instruction strength. More prompting is unlikely to improve this.
- **Contract validator structured output:** Adding `truthConditionAnchor` with required citations did not prevent hallucination. The validator fabricated references to non-existent claims in both rounds.

### Key lesson
Prompt-level rules for semantic modifier classification showed a 1/3 preservation rate across two rounds. However, the "prompt ceiling" conclusion is **weakened** by a material implementation gap: the runtime `ClaimContractOutputSchema` in `claim-extraction-stage.ts:1655` was never updated to parse the strengthened validator fields (`truthConditionAnchor`, `antiInferenceCheck`). The validator LLM may have correctly identified the modifier, but the pipeline silently dropped the structured answer. The right claim is: **prompt-only evidence is inconclusive until the schema is aligned and remeasured** (Priority 1a). If preservation remains at 1/3 after schema alignment, then a structural detection mechanism is warranted.

---

## 5. Prioritized Forward Plan (Revised Per LLM Expert Review)

### Critical finding: validator schema mismatch

The LLM Expert review identified a **material implementation gap** that changes the forward plan:

The strengthened validator prompt (`70d4b9b3`) asks the LLM to return `truthConditionAnchor` and `antiInferenceCheck` structured fields. But the runtime `ClaimContractOutputSchema` in `claim-extraction-stage.ts:1655` still only parses the legacy fields (`inputAssessment`, `claims`). The new structured fields were silently dropped during Zod parsing.

**This means the second prompt-strengthening round was NOT a clean end-to-end test.** The validator LLM may have correctly identified the modifier — but the pipeline never read the answer. The "prompt ceiling at 1/3" conclusion is weakened.

### Revised priority ordering (hardened per Lead Architect review)

| Priority | Issue | Action | Gate |
|---|---|---|---|
| **1a** | Validator schema alignment | Add `truthConditionAnchor` + `antiInferenceCheck` to `ClaimContractOutputSchema`, wire retry + structural verification | — |
| **1b** | Truth/misleadingness separation | Strengthen VERDICT_ADVOCATE truth/misleadingness independence | — |
| **1a+1b gate** | **Deployment gate** | Bundesrat RK, Bundesrat CH, Plastik DE, Bolsonaro EN canaries | Must pass before deployment |
| **1a.5** | Pass 2 model-tier A/B (conditional) | If 1a preservation still <2/3: rerun Bundesrat with Pass 2 forced from `budget` to `standard` | Only if 1a fails |
| **2** | Neutrality baseline refresh | Rerun Plastik DE/EN/FR on current stack, then run query-language swap experiment | Characterization before intervention |
| **3** | Structural anchor validation (conditional) | LLM anchor mapping + deterministic quote validation | Only if 1a AND 1a.5 both fail |
| **4** | Phase C: Stage 3 concentration | Targeted clustering stabilization | After upstream correctness |

### Stage 1 Fallback Ladder

The plan now defines an explicit gated sequence for modifier preservation, from lowest-cost to highest-cost:

```
1a: Schema alignment + structural retry verification
    ↓ if preservation still <2/3
1a.5: Pass 2 model-tier A/B (budget → standard)
    ↓ if still <2/3
3: New LLM anchor-mapping call + deterministic quote validation
```

Each step is a decision gate. Do NOT advance to the next step without measuring the current step's effect on the Bundesrat family.

### Priority 1a: Validator Schema Alignment

**Why first:** This is a code fix that unblocks a clean test of a prompt change that was never properly evaluated.

**Action:**
1. Add `truthConditionAnchor` and `antiInferenceCheck` to `ClaimContractOutputSchema` in `claim-extraction-stage.ts`
2. Wire the retry logic with **structural verification** (per Lead Architect hardening):
   - Do NOT rely only on the LLM's top-level `rePromptRequired` flag
   - The runtime MUST also force one retry when `truthConditionAnchor.presentInInput` is true AND `preservedInClaimIds` is empty
   - Before accepting the validator's approval, structurally verify: cited claim IDs exist in the claim set, and quoted spans actually appear in the cited claims' text
   - After the single retry, fail open (accept the extraction as-is) but record the failure explicitly in `contractValidationSummary`
3. The retry instruction MUST be explicit and dynamic: quote the `anchorText` identified by the validator — e.g., "Your extraction omitted this truth-condition-bearing anchor from the input: '[anchorText]'. Include it in at least one direct atomic claim." This stays generic-by-design because the anchor text comes from LLM output, not hardcoded logic.
4. Re-run the Bundesrat "rechtskräftig" family (3 RK + 2 CH runs)
5. Measure whether the schema-aligned validator now catches omissions

**Effort:** 1-2 hours (schema + parsing + structural verification + retry wiring).
**Risk:** Low — extends existing schema and retry mechanism, no prompt change needed.

**Success criteria:**
- Validator returns structured `truthConditionAnchor` in every run (schema parses correctly)
- When modifier is absent from all claims, validator returns `rePromptRequired: true` with empty `preservedInClaimIds`
- Zero hallucinated approvals: no citations to non-existent claims, no quoted spans that don't appear in the cited claim text
- Modifier preservation rate ≥2/3 on "rechtskräftig" variant (up from 1/3)

### Priority 1b: Stage 4 Truth/Misleadingness Separation (Fix 2)

**Why parallel with 1a:** This is the cheapest generic fix in the set. Independent of Bundesrat work. Addresses a proven cross-family failure mode (true chronological claims scored FALSE because framing is misleading).

**Action:**
1. Add to VERDICT_ADVOCATE Rules: "truthPercentage must reflect ONLY whether the extracted AtomicClaim's factual assertion is supported by evidence. If the wording is misleading, express that EXCLUSIVELY through misleadingness and reasoning — do NOT reduce truthPercentage to penalize misleading framing."
2. This extends the instruction already present in VERDICT_RECONCILIATION to the advocate step.

**Effort:** 15 minutes prompt-only.
**Risk:** Low. May produce more TRUE + highly_misleading combinations, which is analytically correct.

**Expected behavior after fix (per Lead Architect):** For a pure chronology claim like "the Bundesrat signed before Parliament decided," the target is TRUE-side truth (85-90 if evidence is strong) with misleadingness handled separately. LEANING-TRUE ~70 is only appropriate when the extracted AtomicClaim itself carries ambiguity or evidence is materially mixed.

**User-confusion note:** High-truth + highly-misleading combinations are expected and should NOT be treated as regressions. Misleadingness is already surfaced in the job UI and report output. The plan should explicitly communicate that this is the intended behavior.

### Priority 2: Cross-Linguistic Neutrality — Baseline Refresh + Characterization

**Why redesigned:** The EN supplementary lane is scarcity-triggered (`triggerMode: "native_scarcity_only"`, fires when `primaryNewEvidenceCount < minPrimaryEvidenceItems`). Plastik DE is NOT a scarcity case — it finds plenty of German evidence (mean 39, 80% correct direction). Enabling the lane would either not fire, or import English criticism-heavy evidence that shifts German runs toward the less accurate English profile.

**Critical caveat (per Lead Architect):** The 58pp spread was measured in March 2026 on commit `9459347711a8`. It is NOT a current-stack measurement. Before designing an intervention, the baseline must be refreshed on the current stack.

**Revised action — two steps, not one:**

**Step 2a: Baseline refresh**
1. Run Plastik DE, EN, and FR on the current deployed stack (3 runs each)
2. Measure the current cross-linguistic spread
3. If the spread has materially narrowed since March: re-evaluate whether this is still the top quality gap

**Step 2b: Mechanism characterization (only if spread is still >30pp)**
1. Run a controlled query-language swap experiment on same build, same environment:
   - Submit Plastik DE but force query generation to use English language context
   - Submit Plastik EN but force query generation to use German language context
   - Compare generated queries, result domains, and admitted evidence directions
2. This isolates whether the first-order driver is query language or provider/source ecology
3. Based on findings, design a targeted intervention

**Effort:** Step 2a: 1 hour (canary runs). Step 2b: half a day.
**Risk:** Low for both steps — measurement only.

**Gate:** Do not design a neutrality intervention before Step 2a confirms the spread is still current.

### Priority 1a.5: Pass 2 Model-Tier A/B (Conditional)

**Only if Priority 1a (schema alignment) still leaves modifier preservation below 2/3.**

**Why before Priority 3:** The current Pass 2 extraction runs on the `budget` model tier (Haiku). The modifier preservation failure may be a model-capability issue, not a prompt issue. Testing with `standard` tier (Sonnet) is a simpler lever than adding a new LLM anchor-mapping call.

**Action:**
1. Rerun the Bundesrat "rechtskräftig" canary (3 runs) with Pass 2 temporarily forced from `budget` to `standard` model tier
2. Compare modifier preservation rate against the 1a baseline
3. If Sonnet achieves ≥2/3 preservation: the problem is model capacity, not prompt design. Consider whether the cost increase is acceptable for production.
4. If Sonnet still fails: the problem is deeper than model tier. Proceed to Priority 3.

**Effort:** Config change + 3 canary runs.
**Risk:** Low — temporary tier override, no code change.

### Deployment Gate (after Priority 1a + 1b)

**Per Lead Architect:** Do not wait for the full neutrality investigation. Do wait for Priority 1a and Priority 1b plus a focused canary gate.

**Gate canaries:** Bundesrat RK variant, Bundesrat CH variant, Plastik DE, Bolsonaro EN.

**Pass criteria:**
- Bundesrat RK: modifier preserved ≥2/3, no hallucinated validator approvals
- Bundesrat CH: no normative injection, truth ≥70% on factually correct chronological claims
- Plastik DE: within EVD-1 band, no Phase B regression
- Bolsonaro EN: within EVD-1 band, comparable to deployed

**If gate passes:** Deploy the current stack (including Phase B + Fix 1 + Fix 2 + schema alignment).
**If gate fails:** Address the specific failure before deployment. Do NOT cut a Phase-B-only deployment from an older commit — the deployable unit is the current branch with 1a+1b.

### Priority 3: Bundesrat Structural Anchor Validation (Conditional)

**Only if Priority 1a AND Priority 1a.5 both leave modifier preservation below 2/3.**

**Revised approach (per LLM Expert review):** Replace token-overlap with LLM anchor mapping + deterministic validation:
1. Validator returns anchor-to-claim mappings with exact quoted spans from input and from claims
2. Deterministic check: cited claim IDs must exist, quoted spans must actually appear in cited claims
3. If no claim preserves the identified anchor: trigger retry

**Why this is better than token overlap:** Works across languages, inflections, and compound words. Semantic judgment (identifying the anchor) stays LLM-driven. Only the structural honesty check (do the cited IDs and quotes exist?) is deterministic.

**Effort:** 2-4 hours code.
**Risk:** Medium — depends on validator LLM producing honest quotes.

### Priority 4: Phase C — Stage 3 Boundary Concentration

Unchanged from previous plan. Targeted clustering stabilization after upstream fixes.

### Removed: "Revert Strengthened Fix 1" as a priority

Per LLM Expert review: the schema mismatch means the strengthened prompt was never cleanly tested. Anti-inference continues to work. Without clean A/B evidence that the strengthening harms outcomes, revert is housekeeping, not a priority. Defer revert decision until after Priority 1a re-measurement.

---

## 6. Workstream Structure (per Lead Architect review)

Two linked workstreams, not one monolithic track:

**Workstream A: Stage 1 Hardening** (Issues 2 + 5)
- Proposition anchoring (modifier preservation + anti-inference)
- Classification/decomposition stability (SRG/SRF oscillation, Bundesrat claim count variance)
- Priorities 1a, 1a.5, and 3 belong here

**Workstream B: Verdict Semantics Hardening** (Issue 3)
- Truth/misleadingness separation
- Priority 1b belongs here
- Kept separate because it is a verdict-interpretation problem, not an extraction problem

This separation keeps ownership and success metrics clean. If a bad result occurs, it is clear whether it came from extraction drift (Workstream A) or verdict interpretation (Workstream B).

### What This Plan Does NOT Actively Address

- **Hydrogen tangential claim outlier** — rare (1/8 runs), accepted
- **Stage 4.5 SR calibration** — feature-flagged off, deferred per backlog
- **General broad Stage 1 decomposition redesign** — the fallback ladder is narrow; a broad STG1-DECOMP redesign is a separate future track

---

## 7. Success Criteria (Hardened)

### Priority 1a (Validator schema alignment)
- Validator returns structured `truthConditionAnchor` in every run (schema parses correctly)
- When modifier is absent from all claims AND `presentInInput` is true: runtime forces retry (not just LLM flag)
- Structural verification: cited claim IDs exist, quoted spans appear in cited claim text
- After single retry, fail open but record failure in `contractValidationSummary`
- Modifier preservation rate ≥2/3 on "rechtskräftig" variant (up from 1/3)

### Priority 1b (Truth/misleadingness separation)
- Chronology-only Bundesrat variant scores truth ≥70% (target 85-90 if evidence strong)
- Misleadingness assessment carried in separate field, not contaminating truth%
- High-truth + highly-misleading combinations are expected behavior, not regressions
- No regression on other families

### Deployment gate (after 1a + 1b)
- Bundesrat RK: modifier preserved ≥2/3, no hallucinated approvals
- Bundesrat CH: no injection, truth ≥70% on factually correct claims
- Plastik DE: within EVD-1 band
- Bolsonaro EN: comparable to deployed

### Priority 1a.5 (Pass 2 model-tier A/B, conditional)
- Only measured if 1a preservation <2/3
- Compare budget vs standard tier on 3 Bundesrat RK runs

### Priority 2 (Cross-linguistic neutrality)
- Step 2a: current-stack baseline confirmed (is the 58pp spread still current?)
- Step 2b gate: query-language swap characterizes the first-order driver
- Eventual target: ≤30pp cross-language spread (long-term)

### Priority 3 (Structural anchor validation, conditional)
- Only if 1a AND 1a.5 both fail
- Anchor quoted spans structurally validated (exist in claim text)

### Priority 4 (Boundary concentration)
- Max boundary share ≤0.70 on Plastik and Bolsonaro Phase B runs

---

## 8. Source Documents

| Document | Content |
|---|---|
| `2026-03-25_Report_Quality_Root_Causes_and_Stabilization_Plan.md` | Original root cause model (Stage 1 decomposition variance as primary) |
| `2026-03-30_Report_Quality_Evolution_Deep_Analysis.md` | 100-job analysis, cross-linguistic neutrality discovery (58pp) |
| `2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md` | Boundary concentration + grounding investigation |
| `2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md` | UPQ-1 proposal (Stage 2/3 focus) |
| `2026-04-06_UPQ1_Consolidated_Architecture_Review.md` | Lead Architect + LLM Expert review |
| `2026-04-07_UPQ1_Phase_B_Canary_Measurement.md` | Phase B validation (per-claim floor works) |
| `2026-04-07_f1a372bf_to_HEAD_Consolidated_Investigation.md` | Dual-environment investigation + Bundesrat failures |
| `2026-04-08_Proposition_Anchoring_Fix_Plan.md` | Fix 1/2/3 plan with LLM Expert review |

---

## 9. Corrections to Previous Plans

| Previous position | Correction | Why |
|---|---|---|
| "Stage 3 is the dominant bottleneck" | Stage 3 is an amplifier, not the primary cause | Cross-review + data |
| "Bundesrat modifier preservation is the top priority" | Cross-linguistic neutrality has higher user impact, but validator schema fix comes first as unblocking step | 58pp affects all multilingual users, but schema mismatch must be resolved to get clean data |
| "Prompt approach hit a ceiling at 1/3" | **Weakened** — the validator schema was never updated, so round 2 wasn't a clean test | `ClaimContractOutputSchema` does not parse `truthConditionAnchor` or `antiInferenceCheck` |
| "Enable EN lane for neutrality" | **Wrong mechanism** — the EN lane is scarcity-triggered, not neutrality-balancing; Plastik DE is not a scarcity case | `triggerMode: "native_scarcity_only"` in search config |
| "Token overlap for Bundesrat post-check" | **Too language-dependent** — use LLM anchor mapping + deterministic quote validation instead | German compounds, inflections, and multilingual robustness |
| "Fix 2 is priority 3" | **Should be higher** — cheapest generic fix, broader than Bundesrat, already half-supported by reconciliation | 15 min prompt change, addresses cross-family misleadingness leakage |
| "Revert strengthened Fix 1" | **Defer** — the schema mismatch means the strengthening was never cleanly tested | No clean A/B evidence of harm |
| "Plastik deployed LT 62 is environmental variance" | Deployed LT 62 is factually worse than local runs | OECD/EEA sources confirm recycling has measurable benefits |
| "The strengthened Fix 1 caused a CH regression" | Not a regression — the decomposition improved (preserved "before Parliament") | Round 1 truncated the input; round 2 preserved it |

## 10. LLM Expert Review Outcome

**Judgment:** `revise` — reprioritization directionally correct but two interventions wrong.

**Key corrections incorporated:**
1. EN supplementary lane is scarcity-triggered, not neutrality-balancing — redesigned to a neutrality investigation
2. Token-overlap post-check is too language-dependent — replaced with LLM anchor mapping + deterministic quote validation
3. Validator schema mismatch identified — `ClaimContractOutputSchema` doesn't parse the strengthened fields, invalidating round 2 results
4. Fix 2 should be higher priority — moved to 1b (parallel with schema fix)
5. Revert decision deferred — no clean A/B evidence of harm from strengthening
6. Stage 1 classification instability (SRG/SRF) should be explicitly listed as a separate issue
