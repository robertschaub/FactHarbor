# QLT-4 Preflight Verification — Feature Never Triggered

**Date:** 2026-03-26
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)

---

## 1. Executive Summary

**QLT-4 full rerun is NOT justified.** The per-claim contrarian retrieval mechanism addresses a root cause that doesn't exist in practice.

The preflight found:
1. Code is present (b3e85c54 is ancestor of HEAD)
2. Config was OFF in UCM (`perClaimContrarianRetrievalEnabled: False`) — this was the original execution-integrity bug
3. After enabling config AND lowering thresholds (skew 0.85→0.75, minDirectional 8→6, minMinority 2→3), the feature STILL did not trigger
4. **Root cause: Plastik EN evidence is NOT one-sided at the per-claim level.** AC_01 in a real run shows ratio 0.62 with 21 minority items — far below any reasonable skew threshold

The feature cannot fire because the problem it targets (per-claim evidence direction skew) doesn't exist. The actual Plastik EN variance is driven by evidence content/quality variation, not direction imbalance.

**Recommendation:** Close QLT-4 as inconclusive. The feature should remain default-off. Revert config to pre-preflight state (done).

---

## 2. Stack Integrity Check

| Check | Result |
|-------|--------|
| HEAD commit | `4c2c2720` (docs: QLT-4 experiment inconclusive) |
| Feature commit `b3e85c54` | Ancestor of HEAD ✓ |
| Feature code in working tree | Present (claimboundary-pipeline.ts:476-537) ✓ |
| Job commit hash | `cbc4cde47c2b` (all 3 preflight jobs) |

The recorded commit hash (`cbc4cde4`) differs from HEAD (`4c2c2720`) because HEAD is a docs-only commit — the API binary was built from an earlier code commit. The QLT-4 feature code is included in both.

---

## 3. Active Config Check

**Before preflight (original state):**

| Parameter | Value | Issue |
|-----------|-------|-------|
| `perClaimContrarianRetrievalEnabled` | **False** | Feature OFF — this is why it never triggered in the original QLT-4 batch |
| `perClaimBalanceSkewThreshold` | 0.85 | Original default |
| `perClaimBalanceMinDirectional` | 8 | Original default |
| `perClaimMinMinoritySources` | 2 | Original default |

**The original QLT-4 handoff stated config was set to `true`** via UCM during that batch. Either it was reverted afterward, or the config.db was reset. In either case, the prior batch ran with the flag OFF.

**During preflight (after enabling + lowering thresholds):**

| Parameter | Value |
|-----------|-------|
| `perClaimContrarianRetrievalEnabled` | True |
| `perClaimBalanceSkewThreshold` | 0.75 (lowered from 0.85) |
| `perClaimBalanceMinDirectional` | 6 (lowered from 8) |
| `perClaimMinMinoritySources` | 3 (debate-proposed) |

Config activation verified via admin API readback.

---

## 4. Preflight Job Table

| # | Job ID | Input | Truth% | Conf% | Commit | QLT-4 Triggered |
|---|--------|-------|--------|-------|--------|-----------------|
| 1 | `25b1b02b` | Plastic recycling is pointless | 57.8 | 69.5 | cbc4cde4 | **NO** |
| 2 | `8fb68339` | Plastic recycling is pointless | 51.9 | 76.0 | cbc4cde4 | **NO** |
| 3 | `26643fd7` | Ist die Erde flach? | 2.5 | 95.0 | cbc4cde4 | **NO** |

Zero `per_claim_contrarian_triggered` warnings across all 3 jobs.

---

## 5. Why QLT-4 Cannot Trigger

Inspected per-claim evidence balance for job `25b1b02b` (Plastik EN):

| Claim | Items | Supports | Contradicts | Directional | Ratio | Minority |
|-------|-------|----------|-------------|-------------|-------|----------|
| AC_01 | 68 | 34 | 21 | 55 | 0.62 | 21 |

**Trigger conditions (ALL must be true):**
- Skew ratio > 0.75 → 0.62 is **below** 0.75 ❌
- Directional items ≥ 6 → 55 ≥ 6 ✓
- Minority sources < 3 → 21 is **far above** 3 ❌

The evidence is actually well-balanced at the per-claim level. The 47pp environmental claim truth% swing (from QLT-2) is NOT caused by evidence direction imbalance — both directions have substantial representation. The variance comes from differences in evidence content, quality, and source mix across runs.

**This is a fundamental mismatch.** QLT-4 assumes per-claim verdict variance correlates with per-claim evidence direction skew. The data shows it doesn't — balanced evidence (ratio 0.62) still produces a 47pp truth% swing because the verdict depends on evidence quality and specificity, not just direction counts.

---

## 6. Decision

**Full rerun is NOT justified.**

| Criterion | Status |
|-----------|--------|
| Job commit matches intended code | ✓ (code present, commit traceable) |
| Config is active | ✓ (enabled and verified during preflight) |
| Feature path executes | **✗ — feature never fires because trigger conditions are not met in practice** |
| Credible evidence feature is live | **✗ — zero telemetry across 3 preflight + 11 prior jobs** |

**The blocker is not config or code — it is that the feature targets the wrong root cause.** Lowering thresholds further would require going below a 0.62 ratio, which would mean triggering on evidence that is already reasonably balanced. That would add search cost without addressing the actual variance driver.

---

## 7. Recommendation

1. **Close QLT-4 as inconclusive — feature never triggered.** The mechanism is correctly implemented but targets the wrong root cause for Plastik EN variance.
2. **Keep feature default-off.** Do not invest more validation time on a mechanism that cannot fire.
3. **Config reverted** to pre-preflight state (perClaimContrarianRetrievalEnabled: false).
4. **Update status/backlog** to reflect QLT-4 closure if the Captain approves.
5. **The actual Plastik EN variance root cause** (evidence content/quality variation, not direction imbalance) remains an open research question — it is not addressable by contrarian retrieval.

---

*3 preflight jobs, config verified, feature code confirmed present but unable to trigger on real data.*
