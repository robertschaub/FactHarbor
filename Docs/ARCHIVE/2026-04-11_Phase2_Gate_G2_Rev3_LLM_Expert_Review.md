---
title: Phase 2 Gate G2 Rev 3 — LLM Expert Review
date: 2026-04-11
reviewer: LLM Expert (subagent)
parent: Docs/WIP/2026-04-11_Phase2_Gate_G2_Replay_Plan.md
status: Review complete — Rev 4 required before execution
verdict: APPROVE-WITH-MODIFICATIONS (8 required fixes, 3 strongly recommended)
---

# LLM Expert Review — Gate G2 Rev 3

Received 2026-04-11. Complementary to the Captain Deputy strategic review.

## Verdict

**APPROVE-WITH-MODIFICATIONS.** Rev 3 resolves all four Rev 2 blockers and correctly implements the Captain Deputy rescope. One operational risk in the commit sequence and two measurement additions remain — all fixable without structural changes.

## Rev 2 requirement status

| Rev 2 Required Item | Rev 3 Status |
|---|---|
| 1. Commit-count labels + C1 swap | **ADDRESSED.** `82d8080d` verified as last pre-prompt-downgrade code commit. C0 vs C1 = comparator downgrade + Option G + contract-preservation hardening. Minor: it's really "Apr 9–10 wave" (comparator is Apr 9 23:07), not "Apr 10 wave alone". |
| 2. R2 at 5 runs | **ADDRESSED** for Shape B's rescoped question. Mean-level commit comparison usable. Modal-frequency claims would need ≥12 runs (out of scope). |
| 3. Measurements | **ADDRESSED.** Two additions still recommended (M7, M8 — see §new findings). |
| 4. Stop rule | **ADDRESSED** but slightly under-calibrated on Wave 1A clause and cap-trigger denominator. |
| Wave 1A dilemma | **FULLY RESOLVED.** Stash-A2 + run-on-fail-open is the correct choice. Preserves apples-to-apples with 4 historical R2 jobs. |

## New findings specific to Rev 3

### Q-V1 is more weakly measurable than Rev 3 acknowledges

With no R7/R8 inverse pair in Shape B, Q-V1 has **one partial signal source** (R4 with n=2). That is not enough to detect Q-V1 regression — barely enough to detect Q-V1 **presence**.

**Q-V1 in Shape B can confirm direction-plausibility failures but cannot confirm direction-plausibility restoration.** Strong recommendation: add R7+R8 at 2 runs/commit (+12 jobs, ~$5) to strengthen.

### P5 (Q-S1.3 predicate preservation) is the strongest-measured criterion

11 runs/commit across R2 + R3 + R3b. **This is the criterion the replay most reliably answers.** Phase 3 should anchor its narrative on P5 first.

## Measurable-criteria-vs-Shape-B check

| Criterion | Shape B sample | Verdict |
|---|---|---|
| P1 Q-HF5 | 7 runs/commit (R2 + R4) | Well-measured |
| P2 Q-ST1 | 13 runs/commit | Well-measured on R2; directional on R3/R3b |
| P3 Q-ST5 | 9 pair comparisons/commit | Well-measured — targets 58pp Plastik gap |
| P4 Q-S1.1 | R4 n=2, weakly R3 | Under-powered — borderline |
| **P5 Q-S1.3** | 11 runs/commit | **Strongest-measured** |
| P6 Q-S1.5 | R4 n=2 | Weakly measured |
| P7 Q-V1 | R4 n=2 | **Very weakly measured** — named scope limitation needed |

## Commit-sequence check — two real risks

### Risk 5a: stash silent-failure

`git stash push -- <paths>` with zero modified files matching the pathspec succeeds silently (exit 0 + empty stash). If any A2 file is accidentally already in the staging area, or run from wrong directory, the stash is empty and A2 files contaminate A1/B commits.

**Required**: after `git stash push`, add `git stash list` verification that the A2 stash exists + `git diff --cached --name-only` before step 2 to confirm A2 files are NOT in the A1 staging area.

### Risk 5b: types.ts / claim-extraction-stage.ts overlap

Rev 3 puts `types.ts` in A1 (removing `DominanceAssessment` types) and `claim-extraction-stage.ts` in A2. **If any A2 code imports the removed types**, A1 breaks A2's build. The A2 stash pop at Phase 2 close would then require hand-fixing.

**Required**: `grep -r "DominanceAssessment\|dominance_adjusted" apps/web/src/lib/analyzer/claim-extraction-stage.ts` before committing A1. If hits, either leave types in A1 for later removal or fix stashed file before popping.

## Phase 2B activation gap

**Missing trigger**: uniform 10–15pp regression across ≥3 of 4 families in the same commit-pair. Example: clean C0 vs C1 (<15pp per family, stop rule doesn't fire) + suspicious C1 vs C3 (12pp on all 4 families) = wide-but-shallow regression pattern. Per-family threshold misses this.

**Required**: add as third Phase 2B trigger condition.

## Strong-priors framing — one borderline case

Prior 4 (Apr 1 rollback wave) currently says "already cleaned up the Mar 29–31 regressions" — that's a conclusion, not a prior.

**Required**: reword to "was intended to clean up; we believe it succeeded, but this is not verified by replay data."

## 8 Required fixes before first job runs

1. Reword Wave 1A stop-rule clause from "≥2× increase" to "any nonzero termination across any commit" (2×0 = 0)
2. Clarify cap-trigger denominator: 50% across full 13-job batch, NOT per-family
3. Add measurement M7: atomicClaim text + count per run (tri-modal regime detection on R2)
4. Add measurement M8: cited evidence supporting/opposing split per boundary (Q-V1 signal + distinguishing cap-short-circuit from cap-sanity-rail)
5. Add commit-sequence preflight checks (stash list verify + DominanceAssessment grep)
6. Add Phase 2B third trigger: uniform 10–15pp regression across ≥3 of 4 families
7. Reword Prior 4 from "already cleaned up" to "was intended to clean up; not verified"
8. Promote Q-V1 caveat to named scope limitation: "can confirm failures but cannot confirm restoration"

## 3 Strongly recommended (not blocking)

9. Add R7+R8 at 2 runs/commit (+12 jobs, +$5) — cheapest way to give Q-V1 real measurement
10. Post-first-commit R2 variance check: if stdev >25pp, pause before next commit
11. Relabel windows: C0 vs C1 = "Apr 9–10 wave", C0 vs C3 = "post-UPQ-1 Phase B wave"

## Residual concerns for Phase 3

- **Q-ST6 (Stage 1 classification stability)** is not measured in Shape B (SRG R9 dropped). Phase 3 conclusions should not extrapolate.
- **Multilingual coverage** is DE+EN only. Don't generalize to FR/PT/other.
- **P7/Q-V1 restoration** cannot be concluded from Shape B alone — always conditional on Phase 2B or follow-up.

## Go / No-go

**GO, with the 8 required fixes applied.** The rescope from Rev 2 to Rev 3 is a substantial improvement. This is a plan the LLM Expert would run.
