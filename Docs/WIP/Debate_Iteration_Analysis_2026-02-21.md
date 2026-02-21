# Debate Iteration Analysis — Should FactHarbor Change Its Debate Structure?

**Date:** 2026-02-21
**Role:** Lead Architect
**Status:** Analysis complete. No code changes proposed. One B-3 add-on candidate identified for Captain review.

---

## 1) Current Debate Structure (Code-Verified)

Source: `apps/web/src/lib/analyzer/verdict-stage.ts`

**Fixed 5-step pattern, 7 LLM calls per claim batch, no adaptation:**

| Step | Prompt key | Tier | Calls | Runs parallel with |
|------|-----------|------|-------|--------------------|
| 1 Advocate | `VERDICT_ADVOCATE` | Sonnet | 1 | — |
| 2 Self-Consistency | `VERDICT_ADVOCATE` (temp 0.3) | Sonnet | 2 | Step 3 |
| 3 Challenger | `VERDICT_CHALLENGER` | Sonnet | 1 | Step 2 |
| 4 Reconciliation | `VERDICT_RECONCILIATION` | Sonnet | 1 | — |
| 5 Validation | `GROUNDING` + `DIRECTION` | Haiku | 2 | each other |
| | | **Total** | **5 Sonnet + 2 Haiku** | |

Critical path: Step 1 → max(Step 2, Step 3) → Step 4 → Step 5 → Gate 4

**Instability handling** (`verdict-stage.ts:810-820`): When self-consistency spread exceeds thresholds, a confidence multiplier is applied:

| Spread | Classification | Multiplier | Effect |
|--------|---------------|------------|--------|
| ≤5pp | Highly stable | 1.0 | No change |
| ≤12pp | Moderately stable | 0.9 | Mild penalty |
| ≤20pp | Unstable | 0.7 | Significant penalty |
| >20pp | Highly unstable | **0.4** | Near-kill (60% conf → 24%) |

**The 0.4x case is the problem.** The system detects genuine uncertainty but responds by penalizing rather than investigating. A claim rated 60% confidence with 25pp spread becomes 24% adjusted confidence → likely `INSUFFICIENT` classification. The instability information is lost — the user sees "low confidence" instead of "the evidence genuinely points both ways."

---

## 2) Climinator Comparison

Source: `Docs/Knowledge/Climinator_Lessons_for_FactHarbor.md` §2, Lessons 2, 4, 7

| Dimension | Climinator | FactHarbor |
|-----------|-----------|------------|
| Rounds per claim | 0-18, adaptive | Fixed 1 |
| Trigger for more rounds | Advocate disagreement | None |
| Mediator behavior | Generates follow-up questions | Decides in one shot |
| Cost on clear claims | 0 extra rounds | Same 7 calls |
| Convergence as metadata | Yes (rounds = controversy signal) | No |
| Accuracy on contested claims | >95% after 2 rounds (NIPCC test) | Unknown — spread penalty applied |

**Climinator's key lesson:** Most claims need zero extra rounds. Only contested claims need 2+. The debate system adapts to claim difficulty.

---

## 3) Relationship to D3 and C-1

**D3 decision** (Decision Log): "Debate V2 topology reset stays in backlog. Re-evaluate gate: after B-2 conclusion memo is approved."

**C-1 scope** (Continuation Plan §c):
1. Dual independent advocates (symmetric)
2. Cross-examination round with evidence-ID constraints
3. Judge/reconciler scoring rubric
4. Keep evidence-weighted contestation policy

**This analysis does NOT propose pulling C-1 forward.** The rationale from D3 holds:
- Dominant signal is C13 evidence pool bias (8/10 pairs), not debate structure
- French pairs (near-zero skew) prove the current structure works with balanced evidence
- No data yet on post-D5 spread (knowledge-diversity-lite not implemented)

---

## 4) What the Data Says

### Evidence supporting "don't change the debate structure now"

1. **C13 is the bottleneck.** 8/10 baseline pairs show evidence pool bias. Fixing input quality (D5) logically comes before fixing debate depth.
2. **French pairs.** mean=2.0pp with the fixed 5-step debate. The structure is not the limiting factor when evidence is balanced.
3. **C18 is clean.** failureModeBias 0/10. The model isn't politically refusing — it's working with asymmetric evidence.
4. **Cost risk.** Climinator observed up to 18 rounds. At Sonnet pricing that's $2-5 per contested claim.

### Evidence supporting "consider a narrow adjustment alongside B-3"

1. **C9 concern** (Stammbach §3): "Self-consistency rewards stable bias — illusory control providing false assurance." The current 3-run temperature spread may detect instability but doesn't resolve it.
2. **The 0.4x penalty destroys information.** High spread = the model genuinely sees both sides. Penalizing confidence doesn't help the user — it just hides the disagreement behind a low-confidence label.
3. **D5 creates new evidence.** After contrarian retrieval (D5 control #3), the reconciler will have evidence it didn't have before. But the current single-pass reconciliation was designed before contrarian evidence existed — it doesn't know to give this new evidence special attention.
4. **Climinator's 2-round sweet spot.** 95.3% accuracy after 2 rounds on contested claims. One additional targeted round resolves most genuine controversy.

---

## 5) Recommendation: Conditional Re-Reconciliation (B-3 Add-On Candidate)

**Not a new work item — a scoped addition to B-3 (knowledge-diversity-lite).**

### Mechanism

After Step 4 (reconciliation), check two conditions:
1. Self-consistency spread > `unstableThreshold` (default 20pp)
2. Contrarian evidence was injected by D5 (i.e., `searchStrategy: "contrarian"` items exist in evidence pool)

If BOTH conditions met: re-run Step 4 (reconciliation) **once** with an addendum to the prompt directing the reconciler to explicitly address the contrarian evidence and the spread.

If either condition is false: proceed as current. No extra call.

```
Current:  Step 1 → max(2, 3) → Step 4 ──────────────────→ Step 5 → Gate 4

Proposed: Step 1 → max(2, 3) → Step 4 → [re-reconcile?] → Step 5 → Gate 4
                                               │
                                    Only if: spread > 20pp
                                         AND contrarian evidence present
```

### Cost

| Scenario | Extra LLM calls | Trigger |
|----------|----------------|---------|
| Stable claim (spread ≤20pp) | 0 | — |
| Unstable claim, no contrarian evidence | 0 | — |
| Unstable claim + contrarian evidence | 1 Sonnet | Both conditions |

Estimated trigger rate: Based on baseline, ~30% of claims have verdictBias (7/10 pairs). Of those, only claims with both high spread AND `evidence_pool_imbalance` would trigger. Conservative estimate: 10-20% of claims per run.

### Why this is NOT Debate V2 (C-1)

| Property | This proposal | Debate V2 (C-1) |
|----------|--------------|-----------------|
| Max extra rounds | 1 (hard cap) | Unbounded (until convergence) |
| New prompt keys | 0 (reuses `VERDICT_RECONCILIATION` with addendum) | 3+ (dual advocate, cross-exam, judge rubric) |
| New topology | No | Yes (symmetric advocates, cross-examination) |
| New debate roles | No | Yes (independent second advocate) |
| Trigger | Dual condition (spread + contrarian evidence) | Always-on new topology |
| Feature flag | Yes (UCM `reDeliberationEnabled`, default off) | Feature-flagged per C-1 spec |

### Metadata output

Per-claim: `reDeliberationTriggered: boolean`, `reDeliberationSpreadBefore: number`, `reDeliberationSpreadAfter: number`

This becomes a quality signal for the B-3 A/B: did re-reconciliation reduce spread? If yes, it resolves instability (good). If no, the instability is genuine and the spread should widen the `truthPercentageRange` (also good — honest uncertainty).

### Implementation location

`verdict-stage.ts:runVerdictStage()` between lines 228 and 230 (after reconciliation, before baseless challenge enforcement). ~30 lines of conditional logic.

---

## 6) Decision for Captain

| Option | Description | Architect recommendation |
|--------|-------------|------------------------|
| **A** | Do nothing — wait for B-3 A/B results, then reassess | Safe. Risk: misses opportunity to measure re-deliberation effect in the same A/B run. |
| **B** | Scope re-reconciliation into B-3 as an optional sub-control (UCM-disabled by default) | **Recommended.** Adds one measurable variable to the B-3 A/B at near-zero additional scope. Can be turned on/off per run. |
| **C** | Pull Debate V2 (C-1) forward | Not recommended. Premature — no evidence that current topology is the bottleneck after D5. |

If **Option B** is approved: add re-reconciliation as Action #9b in the D1-D5 Action Register (depends on #9, same owner: LLM Expert + Lead Dev, same due date as #9).

---

## Cross-References

- D3 decision: `Docs/WIP/Decision_Log_D1-D5_Calibration_Debate_2026-02-21.md`
- C-1 Debate V2 spec: `Docs/WIP/Debate_System_Continuation_Plan_2026-02-21.md` §c
- C9 concern: `Docs/Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md` §3 Weaknesses #2
- Climinator Lessons 2, 4, 7: `Docs/Knowledge/Climinator_Lessons_for_FactHarbor.md`
- Spread multiplier code: `apps/web/src/lib/analyzer/verdict-stage.ts:810-820`
- Reconciliation code: `apps/web/src/lib/analyzer/verdict-stage.ts:470-518`
- Phase 1 spec (current focus): `Docs/WIP/Phase1_Immediate_Execution_Spec_2026-02-21.md`
