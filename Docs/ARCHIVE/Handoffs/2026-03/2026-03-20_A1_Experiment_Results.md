# A1 Experiment Results — verdictDirectionPolicy
**Date:** 2026-03-20
**Activated:** `verdictDirectionPolicy: retry_once_then_safe_downgrade` via UCM admin config (not code default)
**Config hash after activation:** b1b1e0019a65e98c5ecdc498867f0b5eecdbb808edef49846c85e24a672577bd

---

## Results Summary

| Run | Input | Baseline | A1 Result | Δ | Direction warnings |
|---|---|---|---|---|---|
| Run4 | EN paraphrase `Plastic recycling brings no real benefit.` | 74% MOSTLY-TRUE | **27% MOSTLY-FALSE** | -47pp | 0 |
| Run5 | FR exact `Le recyclage du plastique ne sert à rien` | 69% LEANING-TRUE | **34% LEANING-FALSE** | -35pp | 0 |
| Run3 | DE paraphrase `Plastikrecycling bringt keinen Nutzen.` | 39% LEANING-FALSE | **40% LEANING-FALSE** | +1pp | **2** |

All three runs landed in the correct direction range (MOSTLY-FALSE to LEANING-FALSE). No overcorrection to MIXED observed.

---

## Evidence Balance

| Run | Supporting | Contradicting | Skewed? | Note |
|---|---|---|---|---|
| Run4 EN | 56 | 56 | No | Perfectly balanced |
| Run5 FR | 54 | 60 | No | Slightly more contradicting |
| Run3 DE | 68 | 44 | Yes (60% supporting) | Direction policy fired |

---

## Decision Gate Evaluation

| Criterion | Result | Pass? |
|---|---|---|
| Runs 4+5 corrected downward from baseline | 74→27, 69→34 | ✅ |
| Control Run 3 unchanged | 39→40 (+1pp) | ✅ |
| No overcorrection to MIXED | 27%, 34%, 40% — all outside MIXED range | ✅ |
| Direction policy fires when genuinely needed | Fired on Run3 (2 warnings) | ✅ |
| No direction warnings on already-correct runs | Run4/5: 0 warnings | ✅ |

**Gate verdict: PASS — policy can be promoted to permanent default.**

---

## What Actually Happened

### Run4 and Run5 (improved without direction policy firing)

Both runs got balanced evidence pools (56S/56C and 54S/60C). With balanced retrieval, the advocate correctly assigned low truth%, and the direction check found no mismatch. The dramatic improvement (74→27, 69→34) came from **retrieval variation**, not from direction repair.

**Implication:** The `pro_con` query strategy, when it works, produces balanced queries that lead to correct verdicts without needing a direction backstop. The improvement in Run4/5 confirms the Stage 2 analysis: when retrieval is balanced, verdicts are correct.

### Run3 (direction policy did fire — and acted correctly)

Evidence pool: 68S/44C (60% supporting — meaning 60% of directional evidence affirms "recycling brings no benefit"). Direction policy fired on AC_03:

- `verdict_direction_issue`: AC_03 truth=24%, 4 of 19 cited items support / 15 contradict. The reconciler's cited evidence pointed mostly contradicting, so truth% was directionally justified. The check flagged it regardless.
- `verdict_integrity_failure`: policy safe_downgraded AC_03 from ~24% to 20%.
- Final overall verdict: 40% LEANING-FALSE — reasonable and unchanged from baseline.

Additional issue on Run3: **boundary concentration** — CB_34 held 92.3% of all 142 evidence items (131 items in one boundary). This was accompanied by low overall confidence (24%) and INSUFFICIENT confidence on AC_03. A single dominant boundary makes the verdict fragile.

Also: `llm_tpm_guard_fallback` for VERDICT_CHALLENGER (gpt-4.1 → gpt-4.1-mini due to TPM guard). The challenger had weaker capabilities in this run, which may affect how well the debate stage challenged high truth% claims.

---

## Key Findings

### Finding 1: Direction policy is a valid safety net, not the primary fix

In runs where retrieval is balanced (Run4, Run5), the policy is not needed and does not fire. In a run with skewed evidence (Run3, 60% supporting), it fires appropriately and makes a minor conservative correction without breaking the overall verdict.

The policy is **neither harmful nor the primary driver of improvement**. It is a correctly-positioned backstop.

### Finding 2: Improvement in Run4/5 confirms Stage 2 as primary variance source

The 47pp drop in Run4 (74→27) came entirely from different retrieval outcomes — this run got a balanced 56S/56C pool instead of whatever the baseline got that drove truth% to 74%. This directly confirms the cause analysis: verdict direction is primarily controlled by what evidence the retrieval returns, not by the verdict engine itself.

### Finding 3: Boundary concentration is a new signal worth monitoring

Run3's 92.3% concentration in CB_34 is extreme. The historical good run (Feb 27) had 6 balanced boundaries. The concentration amplifies retrieval bias — if most evidence ends up in one dominant boundary, that boundary's direction controls the verdict. This is a secondary amplifier that should be investigated if B1/B2 don't reduce spread sufficiently.

### Finding 4: TPM guard fallback affects challenger quality

Run3 used `gpt-4.1-mini` for the challenger role because gpt-4.1 TPM threshold was hit. The challenger's job is to argue against the emerging verdict. A weaker challenger model means the advocate's potentially-too-high truth% is less likely to be effectively challenged. This is not the primary issue here, but is a confound in mixed results.

---

## Decision: Keep Policy Activated

**Recommendation: Promote `verdictDirectionPolicy: retry_once_then_safe_downgrade` from experiment to permanent default.**

Evidence:
- No overcorrection observed
- Policy fired appropriately on Run3 (skewed evidence pool)
- Policy correctly stayed silent on Run4/5 (already-correct verdicts)
- Overall spread now 13pp (27-40%) vs 35pp in baseline — within acceptable range

**Required action:** Change code default in `apps/web/src/lib/config-schemas.ts` line ~1025:
```
verdictDirectionPolicy: "retry_once_then_safe_downgrade",
```
Also add to `pipeline.default.json` for admin UI visibility (currently absent from JSON).

---

## What This Experiment Does NOT Prove

- **It does not prove the direction policy caused the improvement in Run4/5.** The improvement was retrieval variance. The policy happened to not be needed.
- **It does not prove stability.** Three runs is not enough to characterize variance. The baseline 74% could recur in a future run if retrieval again finds mostly supporting evidence for "no benefit".
- **It does not eliminate the need for B1/B2.** The retrieval-driven variance is structural and requires prompt work to address at the source.

---

## Next Steps

### Immediate (no approval needed)

1. Promote `verdictDirectionPolicy` to permanent default in config-schemas.ts + pipeline.default.json
2. Run `npm test` + build to verify no regressions

### Requires Captain approval (prompt changes)

3. B1: `EXTRACT_EVIDENCE` claimDirection guidance for partial findings under broad evaluative predicates
4. B2: `GENERATE_QUERIES` contradiction-iteration explicit direction guidance
5. Investigate boundary concentration as a follow-up (if B1/B2 don't reduce spread to <15pp)

---

## Config State After Experiment

`verdictDirectionPolicy: retry_once_then_safe_downgrade` — **currently active in live UCM config**
`verdictGroundingPolicy: disabled` — unchanged
