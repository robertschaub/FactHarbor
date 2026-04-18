# Bolsonaro EN — sufficiencyMinMainIterations Experiment

**Date:** 2026-04-05
**Role:** Senior Developer (Claude Code, Opus 4.6)
**Status:** Experiment not run — pre-analysis found the proposed change would have zero effect

---

## 1. Hypothesis

Raising `sufficiencyMinMainIterations` from 1 to 2 would force more research iterations on Bolsonaro EN, producing a deeper evidence pool that narrows the gap to deployed (64/58 local vs 73/70 deployed).

## 2. Finding: The experiment would have no effect

### Config location

| Location | Value |
|---|---|
| `apps/web/configs/pipeline.default.json:157` | `"sufficiencyMinMainIterations": 1` |
| `apps/web/src/lib/config-schemas.ts:1160` | `sufficiencyMinMainIterations: 1` |
| Zod schema (`config-schemas.ts:575`) | `z.number().int().min(0).max(10).optional()` |
| UCM-configurable | Yes (admin-tunable via pipeline config) |

### Why 1 → 2 has no effect

The `allClaimsSufficient` function at `research-orchestrator.ts:1194` computes:

```
effectiveMinIterations = max(sufficiencyMinMainIterations, distinctEventCount - 1)
```

The local Bolsonaro baseline canary (`703c261d`) found **5 distinct events**, so:

```
effectiveMinIterations = max(1, 4) = 4
```

Changing to `sufficiencyMinMainIterations: 2` would give:

```
effectiveMinIterations = max(2, 4) = 4    ← unchanged
```

The MT-3 rule (coverage for distinct events) already dominates. The baseline canary ran exactly 4 main iterations and then sufficiency fired because all 3 claims had sufficient evidence + diversity.

### The deployed run's advantage

The deployed comparator (`eb02cd2e`) found **7 distinct events** (more granular decomposition):

```
effectiveMinIterations = max(1, 6) = 6
```

This forced 6 main iterations, producing 97 evidence items from 26 queries vs local's 95 items from 21 queries.

**Distinct event comparison:**

| Local (5 events) | Deployed (7 events) |
|---|---|
| Federal Police raid | Federal Investigation Launch and Report |
| Judicial restrictive measures | Attorney General Accusation |
| Criminal trial proceedings | Preliminary Judicial Orders |
| Verdict and sentencing | Trial Proceedings and Witness Testimony |
| Publication of conviction ruling | Verdict and Sentencing |
| | First Panel Ratification of Arrest Decisions |
| | Appellate Process Initiation |

Both are reasonable decompositions. The deployed run separated the investigation/accusation, trial/verdict, and appellate phases into finer events.

## 3. Root cause reclassification

The remaining Bolsonaro EN local-vs-deployed gap is **not** caused by:
- ~~sufficiencyMinMainIterations being too low~~ (MT-3 already dominates)
- ~~config difference~~ (same codebase and defaults)
- ~~grounding false positives~~ (eliminated by alias fix)

The gap is caused by:
- **Stage 1 distinct-event detection variance**: the LLM non-deterministically produces 5-7 events for this input, which directly controls research depth via MT-3
- **Run-to-run retrieval variance**: different search results, source availability, and provider ordering across runs

This is inherent LLM non-determinism at Stage 1, not a tuning problem.

## 4. Per-claim evidence analysis (baseline canary)

| Claim | Items | S/C/N | Source types | Domains |
|---|---|---|---|---|
| AC_01 (Brazilian procedural law) | 43 | 20/3/20 | 5 | 10 |
| AC_02 (International procedural law) | 14 | 2/6/6 | 4 | 5 |
| AC_03 (Fair trial standards) | 40 | 13/20/7 | 6 | 17 |

AC_02 has notably fewer items (14 vs 40-43 for the other claims). This claim's thinner evidence pool may be the main per-claim contributor to the lower aggregate truth.

## 5. Judgment

**`no_clear_help`** — the proposed experiment would produce identical behavior because MT-3 already forces the effective minimum above the proposed threshold.

## 6. What would actually help

If the Bolsonaro gap needs to be narrowed further (it's currently within EVD-1 amber band), the credible next options are:

1. **Accept run-to-run variance** (recommended). The 64/58 → 73/70 gap is 9pp truth and 12pp confidence. Historical Bolsonaro 5-run measurement (EVD-1, 2026-03-26) showed 25pp spread at amber band. The current gap is smaller than the documented variance band.

2. **Raise the per-claim evidence threshold** (e.g., `claimSufficiencyThreshold: 3 → 5` or `evidenceSufficiencyMinItems: 3 → 5`). This would keep research running until each claim has more items. Risk: slower runs, higher cost, may not improve verdict quality if the additional evidence is redundant.

3. **Investigate Stage 1 distinct-event stability**. If the 5-vs-7 event variance is a consistent pattern, a minimum-event-count floor could reduce iteration-depth variance. But this would be a Stage 1 design change, not a simple config knob.

## 7. AC_02 Evidence Check (2026-04-05, post-experiment)

Requested by Captain to determine whether AC_02's 14-item pool is genuine scarcity or per-claim starvation before deployment.

### Per-claim evidence decomposition

| Claim | Local (seeded + researched = total) | Deployed (seeded + researched = total) |
|---|---|---|
| AC_01 (Brazilian procedural law) | 36 + 7 = **43** | 44 + 16 = **60** |
| AC_02 (International procedural law) | 0 + 14 = **14** | 0 + 21 = **21** |
| AC_03 (Fair trial standards) | 9 + 31 = **40** | 5 + 11 = **16** |

### Findings

1. **AC_02 gets zero seeded items in BOTH local and deployed.** This is consistent — the preliminary search does not yield evidence that the LLM maps to the "international procedural law" claim. It is not a local-specific problem.

2. **AC_02's 14 vs 21 item gap is proportional to iteration count.** Local ran 4 main iterations, deployed ran 6. AC_02 gains ~3.5 items per iteration in both runs. The 7-item gap exactly tracks the 2-iteration difference.

3. **AC_02 has unique sources (zero overlap with AC_01/AC_03).** Its 5 source domains do not overlap with either sibling claim's sources. This rules out per-claim starvation — AC_02 is finding its own evidence from its own sources. There is no budget competition with siblings.

4. **The evidence yield per iteration is consistent.** Both runs produce similar items-per-iteration for AC_02. The difference is purely iteration count, which is driven by Stage 1 event-count variance (5 vs 7 events → 4 vs 6 iterations via MT-3).

5. **AC_03 is inverted: local has MORE items (40 vs 16).** This confirms the gap is not systematic — some claims do better locally, some worse. The aggregate gap happens to be dominated by AC_02 because AC_01 is seeded-heavy and AC_03 is locally richer.

### Verdict: Genuine source scarcity, not starvation

AC_02 ("international procedural law compliance") is an inherently harder evidence target than domestic procedural law (AC_01) or fair trial standards (AC_03). International procedural law sources are sparser in web search results. Both local and deployed runs show the same pattern: zero seeded, moderate research yield. The local run simply had fewer iterations due to Stage 1 event-count variance.

This is **not** a bug, design flaw, or budget coupling problem. It is an inherent property of this claim's evidence landscape, modulated by run-to-run iteration count.

## 8. Deployment Readiness — Final Assessment

| Check | Result |
|---|---|
| Grounding false positives | Eliminated (`cbb364ec` + `ffaa4fdd`) |
| `sufficiencyMinMainIterations` config | No effect (MT-3 dominates) |
| AC_02 evidence thinness | Genuine scarcity, consistent across environments |
| Aggregate gap (64 vs 73) | Within EVD-1 amber band (25pp historical) |
| Warnings | Zero grounding/direction warnings |

**Recommendation: Deploy.** The local build is clean. The remaining gap is explained by two well-understood, non-actionable factors:
1. Stage 1 event-count non-determinism (5 vs 7 events)
2. AC_02's inherent evidence scarcity (consistent across environments)

Neither factor represents a code regression or a tunable config problem. The MT-3 per-claim iteration floor is a valid future workstream but is a design change, not a deployment blocker.
