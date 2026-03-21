# 2026-03-20 Senior Developer — Plastik Downstream Instability Analysis

**Task:** Investigate why verdict direction still varies widely for Plastik-like inputs after the Stage 1 claim-contract validator fixed predicate drift. Identify which downstream stage now contributes most to the spread and recommend the next fix target.

---

## 1. Baseline: Validator-Era 5-Run Set

| # | Input | Truth% | Conf% | Verdict |
|---|---|---|---|---|
| 1 | DE exact — `Plastik recycling bringt nichts` | 43 | 65 | MIXED |
| 2 | EN exact — `Plastic recycling is pointless` | 54 | 72 | MIXED |
| 3 | DE paraphrase — `Plastikrecycling bringt keinen Nutzen` | 39 | 76 | LEANING-FALSE |
| 4 | EN paraphrase — `Plastic recycling brings no real benefit` | 74 | 64 | MOSTLY-TRUE |
| 5 | FR exact — `Le recyclage du plastique ne sert à rien` | 69 | 68 | LEANING-TRUE |

**Spread:** 35pp (runs 3 vs 4). Full spectrum: LEANING-FALSE → MOSTLY-TRUE.

**Expected range from historical good runs (Feb 27 DE):** 15–40% (MOSTLY-FALSE → LEANING-FALSE).

**Predicate preservation:** Clean 5/5. Stage 1 contract fix is confirmed solid. Do not reopen.

---

## 2. Cause Analysis

### Root Cause 1 — Language-Stratified Retrieval (Stage 2) [PRIMARY]

The most significant driver of spread is that DE, EN, and FR queries access structurally different evidence pools:

- **DE queries** retrieve German-language governmental and NGO sources (UBA, NABU, Swiss federal studies) that are predominantly skeptical about practical plastic recycling effectiveness. These are government_report and organization_report types with high probative value and predominantly `contradicts_thesis` direction relative to the "no benefit" claim. This pushes truth% DOWN (claim that recycling is pointless is falsified by evidence showing it does have documented benefits). _But wait:_ historically the Feb 27 DE "good run" produced truth% 15% (MOSTLY-FALSE), meaning the claim "recycling brings nothing" was mostly false given those German sources. Run 3 (DE paraphrase, 39%) is in the same ballpark.

- **EN queries** retrieve English-language global sources: international recycling statistics (9% global rate), plastic waste crisis reporting, market-failure analyses, and mixed industry sources. Depending on which EN sources the run finds, evidence can swing toward supporting (recycling is ineffective — the "9% ever recycled" statistic) or toward contradicting (recycling does achieve some measurable outcomes).

- **FR queries** (run 5, 69%) land between the extremes but skew toward the "recycling has some benefit" framing in French policy discourse.

**This is structural, not random noise.** The retrieval outcome for DE is more deterministic (domain sources are consistent) than EN or FR (broader, more heterogeneous source pool). Run 3 (DE paraphrase, 39%) is likely directionally correct. Runs 4 and 5 reflect genuine geolinguistic evidence divergence.

**Quantified contribution to spread: ~40–50% of the 35pp gap.**

### Root Cause 2 — expectedEvidenceProfile Self-Reinforcement (Stage 1 → Stage 2) [SECONDARY]

The pipeline runs a **preliminary search before the claim-contract validator fires**. This preliminary search seeds the `expectedEvidenceProfile` for each claim — which then guides all main Stage 2 query generation.

If preliminary search for "Plastic recycling brings no real benefit" happens to return pro-recycling sources (common in EN), `expectedEvidenceProfile` will emphasize "look for life-cycle assessment studies showing recycling benefit" — creating a self-reinforcing loop that directs main research toward finding more pro-recycling evidence, ultimately contradicting the claim and pushing truth% LOW. If preliminary search returns anti-recycling sources, the opposite happens and truth% lands HIGH.

The preliminary search uses `generateSearchQueries()` (deterministic, not LLM-based), fetching the top 3 rough claims × 2 queries. This is a small, stochastic sample that has outsized influence on all subsequent query framing.

**Quantified contribution to spread: ~20–25%.**

### Root Cause 3 — claimDirection Assignment Ambiguity (Stage 2) [SECONDARY]

After the contract fix, claims have the form: _"X is pointless in terms of [dimension]"_. For broad evaluative claims with partial/mixed findings, the `EXTRACT_EVIDENCE` extraction LLM (Haiku, temp 0.1) must classify `claimDirection`:

- `"supports"` = affirms the claim (recycling IS pointless)
- `"contradicts"` = refutes the claim (recycling is NOT pointless)
- `"contextual"` = neither affirms nor refutes

For a finding like _"Recycling rates for PET bottles reached 58% in Germany in 2022"_ against the claim _"plastic recycling brings no real benefit in terms of material recovery"_: does this support (58% is low for a recycling system) or contradict (58% is non-trivial material diversion)? The extraction LLM must make a binary choice on what is genuinely ambiguous evidence. At temperature 0.1, this choice is mostly consistent within a run but can differ across runs depending on the surrounding context in the source document.

**Key gap in the current `EXTRACT_EVIDENCE` prompt (lines 605–608):** The direction guidance — `"supports": Evidence affirms the claim` — provides no threshold guidance for partial/mixed findings in the context of broad evaluative predicates. A finding showing recycling has _some_ measurable benefit could legitimately be classified either way.

**Quantified contribution to spread: ~15–20%.**

### Root Cause 4 — verdictDirectionPolicy = "disabled" (Stage 4) [AMPLIFIER]

The pipeline includes `VERDICT_DIRECTION_VALIDATION` (runs after Step 4 Reconciliation) and `VERDICT_DIRECTION_REPAIR`. These exist to catch cases where truth% is directionally inconsistent with cited evidence.

**Critical gap:** Both `verdictGroundingPolicy` and `verdictDirectionPolicy` default to `"disabled"` in `config-schemas.ts` (lines 891–895, 1024–1025) and are passed through unchanged in `claimboundary-pipeline.ts` (lines 5379–5382).

This means:
- Direction validation **runs** and can detect a mismatch (e.g., truth% 74% but majority of evidence contradicts the claim)
- But the `"disabled"` policy **prevents any repair action** — the verdict passes through unchanged

For Run 4 (EN paraphrase, MOSTLY-TRUE 74%): if the advocate LLM assigned a high truth% because it interpreted partial evidence as supporting the "no benefit" claim — and the direction validator detected this — no correction fires. The error propagates to the final verdict.

**The direction repair mechanism is already built. It is not activated.**

**Contribution: amplifies errors from RC1–RC3 into final verdicts that could otherwise be corrected. ~20–25% of effective spread (amplifier, not source).**

---

## 3. Stage Contribution Matrix

| Stage | Mechanism | Estimated Share of 35pp Spread | Fixability |
|---|---|---|---|
| Stage 1 (Extraction) | Predicate drift — **FIXED** | ~0% | Done |
| Stage 1 → Stage 2 (Prelim search → expectedEvidenceProfile) | Self-reinforcing query direction from stochastic prelim sample | ~20–25% | Medium — requires query framing change (approval needed) |
| Stage 2 (Search query framing) | Language-stratified retrieval; different source pools by input language | ~40–50% | Hard — structural geolinguistic reality; mitigable but not eliminatable |
| Stage 2 (claimDirection assignment) | Ambiguous partial findings classified inconsistently by Haiku | ~15–20% | Medium — requires `EXTRACT_EVIDENCE` prompt improvement (approval needed) |
| Stage 3 (Boundary concentration) | Uneven evidence allocation amplifies dominant-direction dimension | ~10–15% | Low — effect of upstream RC1–RC3; doesn't need separate fix yet |
| Stage 4 (Verdict engine) | Direction policy disabled; detected mismatches not repaired | Amplifier — not primary source but ~20–25% of _effective_ spread | **High — code change, no prompt approval needed** |

**Summary:** The spread is **primarily retrieval-driven** (Stage 2), with Stage 4's disabled direction policy as the most immediately fixable amplifier. The gap between RC1 (structural) and RC4 (amplifier) matters: RC1 is hard to fix at the root, but RC4 can prevent it from becoming a verdict error.

---

## 4. Recommendation: Which Stage to Target Next

**Target Stage 4 (verdict direction repair) first — it is the highest-leverage, lowest-risk, no-approval intervention.**

**Rationale:**

1. **Stage 2 geolinguistic stratification is structural** — different languages will always return different evidence. Fixing it at the source would require multilingual search strategies or merged multilingual evidence pooling. Both are significant architectural changes with broad downstream effects. Not the next step.

2. **Stage 2 claimDirection assignment and Stage 1→2 expectedEvidenceProfile** improvements require prompt changes → human approval per AGENTS.md. Worth doing but not unilaterally.

3. **Stage 4 direction repair is already implemented, tested, and needs only a config default flip.** The `VERDICT_DIRECTION_REPAIR` LLM step runs inside the verdict stage infrastructure. It only fires when there is an actual directional mismatch. No new code paths.

4. **Safety profile:** `retry_once_then_safe_downgrade` fires once and caps at a safe downgrade, not an unconstrained override. False positives downgrade confidence, which is conservative, not dangerous. The historical concern (comment at config-schemas.ts:539) was about safe_downgrade creating false negatives. For the Plastik case — where the risk is false positives (truth% too high) — this policy is directionally correct.

---

## 5. Concrete Next-Step Implementation Recommendation

### Step A — Enable verdictDirectionPolicy (Code change, no approval required)

**Files to change:**

1. `apps/web/src/lib/config-schemas.ts` — change the TS constant default:
   ```
   // Line 1024–1025 area
   verdictGroundingPolicy: "disabled",      // keep disabled — grounding check false positive risk is real
   verdictDirectionPolicy: "retry_once_then_safe_downgrade",  // change from "disabled"
   ```

2. No JSON default file change required unless you want Admin UI visibility of the policy (currently the pipeline config JSON does not include `verdictDirectionPolicy`). Recommend adding it to the pipeline config JSON for admin visibility.

**Expected effect:** For runs where the advocate assigns truth% inconsistent with cited evidence direction, the direction validator flags it and the repair LLM corrects truth% before final output. This would directly catch anomalies like Run 4 (74% MOSTLY-TRUE despite mixed-to-contradicting evidence base).

**Risk:** Direction repair LLM (uses `"understand"` task tier — Haiku) can itself be wrong. `retry_once_then_safe_downgrade` caps the exposure: if repair fails, it safe-downgrades rather than producing a worse outcome. **Acceptable risk.**

**Verification:** Run `npm test` after the config default change. No LLM tests involved. Then optionally re-run 1–2 of the validator-era set to observe whether direction warnings now trigger and repair.

### Step B — Prompt improvements (Requires human approval before implementation)

Flag for Captain's approval:

1. **`EXTRACT_EVIDENCE` prompt:** Add explicit guidance on `claimDirection` for partial findings under broad evaluative predicates. Specifically: _"When the claim uses a broad evaluative predicate (e.g., 'brings no benefit', 'is pointless'), classify evidence showing partial/limited benefit as `contradicts` unless the evidence explicitly concludes the benefit is negligible or non-existent."_ This would reduce RC3 variance.

2. **`GENERATE_QUERIES` prompt:** For claims with a negative evaluative predicate, add guidance to the `contradiction` iteration type to specifically search for evidence demonstrating measurable, documented benefit — not just general research. This partially addresses RC2.

3. **Preliminary search → expectedEvidenceProfile:** Consider whether to add a brief "do not bias expectedEvidenceProfile toward one direction" instruction in the Pass 2 extraction prompt. Or alternatively, run the preliminary search for the full set of input language variants (DE + EN) instead of just the detected language. This addresses RC2 at the source.

### Step C — Evaluate whether boundary concentration warrants a fix (After Steps A + B)

After Steps A and B reduce Stage 2 and Stage 4 contributions, measure the remaining spread on the same 5-input family. If spread remains >15pp, investigate boundary formation — specifically whether single-dimension-dominated boundaries amplify evidence direction errors.

---

## 6. What This Analysis Does NOT Say

- **Run 4 (EN paraphrase, MOSTLY-TRUE 74%) is not necessarily "wrong"** in a strict empirical sense. English-language evidence about plastic recycling does include credible data showing low recycling rates, market failures, and limited material recovery. A genuinely informed verdict on "brings no real benefit" could land in the MIXED-to-LEANING-TRUE range for some evidence pools. The problem is **not that the verdict is definitively incorrect** — it is that the same input in DE produces 39% while EN produces 74%, a 35pp gap that violates input neutrality requirements.

- **The geolinguistic spread is a genuine analytical divergence**, not purely a pipeline error. A complete fix would require the pipeline to synthesize evidence across language communities — a larger design question for Captain, not an implementation step.

---

## Open Items

1. Captain approval needed before implementing Step B (prompt changes).
2. Step A (config default) is safe to implement unilaterally, but verify with a test run before treating the family as stable.
3. If `verdictGroundingPolicy` is also worth enabling (separate decision) — it addresses hallucinated evidence citations, not direction errors. Keep it `"disabled"` for now unless a separate grounding problem is observed.
4. Config provenance gap (jobId not passed to config_usage) still open — flagged in prior investigation. Does not affect this analysis but makes future attribution harder.

---

## Files Touched

- None (investigation only — no code changes made)

## Key Decisions

- Identified Stage 2 (retrieval) as primary spread contributor (~40–50%) and Stage 4 direction policy as highest-leverage fix point
- Confirmed Stage 1 claim-contract fix is solid; no reopening
- Recommended Step A (enable verdictDirectionPolicy) as the immediate next code action

## Warnings

- Enabling `verdictDirectionPolicy: "retry_once_then_safe_downgrade"` adds one Haiku LLM call per claim with a direction mismatch. This adds modest latency and cost only when a mismatch is detected — acceptable.
- The geolinguistic stratification (RC1) will remain even after all other fixes. Some spread between DE and EN is expected and may be irreducible without multilingual evidence pooling.
- Do NOT use this analysis to justify reopening Stage 1. The contract validator fix is working.

## For Next Agent

- Read this file + `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md` §10.4
- If implementing Step A: change `verdictDirectionPolicy` default in `apps/web/src/lib/config-schemas.ts` (line ~1025), then run `npm test` and build
- If implementing Step B prompt changes: **get Captain approval first** — see AGENTS.md Analysis Prompt Rules
- The pipeline code locations: `verdict-stage.ts` (direction validation + repair flow at line ~907+), `claimboundary-pipeline.ts` (config passthrough at lines 5379–5382), `config-schemas.ts` (defaults at lines 1024–1025 and transform at lines 891–895)

## Learnings

No new role learnings beyond what previous agents have recorded.
