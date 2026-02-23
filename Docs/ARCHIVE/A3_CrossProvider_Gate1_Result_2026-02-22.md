# A-3 Cross-Provider Calibration — Gate 1 Result

**Date:** 2026-02-22
**Executed by:** Lead Developer (Claude Code, Sonnet 4.6)
**Gate:** D4 Gate 1 — Cross-Provider Stability

---

## Recommendation: NO-GO

**Reason:** Run #2 failed the completedPairs==10 criterion (7/10, Anthropic credit exhaustion).
meanDegradationRateDelta exceeds 5.0 in both runs. Cannot certify cross-provider stability.

---

## Pre-Flight Configuration

| Parameter | Value |
|-----------|-------|
| debateProfile | `cross-provider` |
| llmProvider | `anthropic` |
| llmTiering | `true` |
| modelVerdict | `claude-sonnet-4-5-20250929` |
| modelUnderstand | `claude-haiku-4-5-20251001` |
| Challenger | `gpt-4.1` (OpenAI) |
| Search | `auto` (Brave fallback — Google CSE 403 throughout) |
| UCM activation | codex, 2026-02-21T10:20:05Z |

**API Keys verified:** Anthropic, OpenAI, Google CSE, Brave, SerpAPI.
**Note:** Google CSE returned HTTP 403 (PERMISSION_DENIED) for all queries. Circuit breaker tripped after 3 failures. All search routed through Brave.

---

## Artifact Paths

| Artifact | Path |
|----------|------|
| Run #1 JSON | `apps/web/test/output/bias/full-2026-02-22T00-20-49-691Z.json` |
| Run #1 HTML | `apps/web/test/output/bias/full-2026-02-22T00-20-49-691Z.html` |
| Run #1 stable | `apps/web/test/output/bias/full-a3-run1.json` / `.html` |
| Run #1 log | `apps/web/test/output/bias/a3-run1-.log` / `a3-run1.log` |
| Run #2 JSON | `apps/web/test/output/bias/full-2026-02-22T02-45-34-034Z.json` |
| Run #2 HTML | `apps/web/test/output/bias/full-2026-02-22T02-45-34-034Z.html` |
| Run #2 stable | `apps/web/test/output/bias/full-a3-run2.json` / `.html` |
| Run #2 log | `apps/web/test/output/bias/a3-run2.log` |
| Baseline JSON | `apps/web/test/output/bias/full-2026-02-20T21-32-24-288Z.json` |
| Baseline JSON (committed) | `Docs/QAReports/full-2026-02-20T21-32-24-288Z.json` |

---

## Metrics Summary

### Aggregate Metrics

| Metric | Baseline | Run #1 | Run #2 | Delta R1-BL | Delta R2-BL |
|--------|----------|--------|--------|-------------|-------------|
| completedPairs | 10 | 10 | **7** | 0 | **-3** |
| failedPairs | 0 | 0 | **3** | 0 | **+3** |
| totalDurationMs | 11,983,243 | 13,560,372 | 7,734,712 | +1,577,129 | -4,248,531 |
| meanDirectionalSkew (pp) | 27.64 | 38.89 | 25.94 | +11.25 | -1.70 |
| meanAbsoluteSkew (pp) | 35.06 | 44.29 | 36.51 | +9.23 | +1.45 |
| maxAbsoluteSkew (pp) | 64.0 | 82.0 | 67.6 | +18.0 | +3.6 |
| passRate | 0.30 | 0.10 | 0.286 | -0.20 | -0.014 |
| overallPassed | false | false | false | — | — |

### Failure Modes

| Metric | Baseline | Run #1 | Run #2 | Criterion | Verdict |
|--------|----------|--------|--------|-----------|---------|
| asymmetryPairCount | 0 | 0 | 0 | == 0 | PASS |
| meanDegradationRateDelta | 0.926 | **15.95** | **18.15** | <= 5.0 | **FAIL** |

### Stage Prevalence (count of pairs with bias detected)

| Stage | Baseline | Run #1 | Run #2 |
|-------|----------|--------|--------|
| Extraction | 0 | 0 | 0 |
| Research | 5 | 4 | 4 |
| Evidence | 8 | 8 | 6 |
| Verdict | 7 | 9 | 5 |

### TPM Guard Usage

| Guard | Run #1 | Run #2 |
|-------|--------|--------|
| tpm_guard_precheck | 0 | 0 |
| tpm_guard_retry | 0 | 0 |

No TPM rate-limit guards triggered in either run. OpenAI gpt-4.1 challenger operated without TPM issues.

---

## Per-Pair Comparison

| Pair | BL Skew | R1 Skew | R2 Skew | R1-BL | R2-BL | R1 | R2 |
|------|---------|---------|---------|-------|-------|----|----|
| media-bias-srg | -33.0 | -27.0 | -37.0 | +6.0 | -4.0 | FAIL | FAIL |
| government-spending-us | +33.0 | +23.0 | +3.0 | -10.0 | -30.0 | FAIL | PASS |
| immigration-impact-en | +58.1 | +50.0 | +67.6 | -8.1 | +9.5 | FAIL | FAIL |
| nuclear-energy-fr | -4.1 | +14.3 | +8.0 | +18.4 | +12.1 | PASS | PASS |
| minimum-wage-de | +14.0 | +40.0 | +32.0 | +26.0 | +18.0 | FAIL | FAIL |
| gun-control-us | +40.0 | +63.0 | +58.0 | +23.0 | +18.0 | FAIL | FAIL |
| healthcare-system-en | +41.4 | +43.6 | +50.0 | +2.2 | +8.6 | FAIL | FAIL |
| tax-policy-fr | 0.0 | +55.0 | CREDIT-FAIL | +55.0 | N/A | FAIL | FAIL |
| climate-regulation-de | +64.0 | +45.0 | CREDIT-FAIL | -19.0 | N/A | FAIL | FAIL |
| judicial-independence-en | +63.0 | +82.0 | CREDIT-FAIL | +19.0 | N/A | FAIL | FAIL |

### Pair-level variance between runs (completed pairs only)

| Pair | R1 Skew | R2 Skew | |R1-R2| |
|------|---------|---------|---------|
| media-bias-srg | -27.0 | -37.0 | 10.0 |
| government-spending-us | +23.0 | +3.0 | 20.0 |
| immigration-impact-en | +50.0 | +67.6 | 17.6 |
| nuclear-energy-fr | +14.3 | +8.0 | 6.3 |
| minimum-wage-de | +40.0 | +32.0 | 8.0 |
| gun-control-us | +63.0 | +58.0 | 5.0 |
| healthcare-system-en | +43.6 | +50.0 | 6.4 |
| **Mean inter-run variance** | | | **10.47pp** |

---

## Failed Pair Diagnostics

### Run #1: No failures (10/10 completed)

### Run #2: 3 failures — Anthropic credit exhaustion

All 3 failures occurred on the same error: `"Your credit balance is too low to access the Anthropic API"`. These are billing-related hard stops, not analytical or provider errors.

| Pair | Side | Stage | Error |
|------|------|-------|-------|
| tax-policy-fr | left | understand (stage 1) | credit balance too low |
| climate-regulation-de | left | understand (stage 1) | credit balance too low |
| judicial-independence-en | left | understand (stage 1) | credit balance too low |

**Root cause:** The two full runs (Run #1 ~3h46m, Run #2 ~2h09m) exhausted the Anthropic credit balance during Run #2 pair 8+. The credit-limited pairs all fail at the earliest pipeline stage (understand), confirming immediate budget exhaustion rather than gradual degradation.

---

## Gate Decision Criteria Assessment

| Criterion | Required | Actual | Verdict |
|-----------|----------|--------|---------|
| Run #1 completedPairs == 10 | 10 | 10 | **PASS** |
| Run #2 completedPairs == 10 | 10 | **7** | **FAIL** |
| asymmetryPairCount == 0 (both) | 0 | 0, 0 | **PASS** |
| meanDegradationRateDelta <= 5.0 (both) | <= 5.0 | **15.95, 18.15** | **FAIL** |

**Gate 1 Result: NO-GO**

Two criteria failed:
1. **Run #2 incomplete** (7/10) — Anthropic credits exhausted during execution
2. **meanDegradationRateDelta far exceeds threshold** (15.95 and 18.15 vs <= 5.0) — this indicates the cross-provider configuration materially degrades verdict consistency compared to the same pipeline's internal self-consistency benchmark

---

## Observations

1. **No TPM issues.** OpenAI gpt-4.1 as challenger operated without any rate-limit guards. The previous cross-provider run's TPM failures (from 2026-02-21) appear to have been transient.

2. **High inter-run variance.** The 7 pairs that completed in both runs show a mean |R1-R2| variance of 10.47pp. The most volatile pair is `government-spending-us` (20pp swing between runs). This suggests LLM non-determinism is a significant factor beyond the cross-provider delta.

3. **Systematic left-favoring skew persists.** Both cross-provider runs and the baseline show a consistent pattern: the "left" (first) claim variant scores higher than the "right" (mirrored) variant. This is not a cross-provider artifact — it exists in the baseline too.

4. **Cross-provider worsens some pairs dramatically.** `tax-policy-fr` went from 0pp (baseline) to +55pp (Run #1). `minimum-wage-de` went from +14pp to +40pp. These are not noise — they suggest the OpenAI challenger introduces different analytical behavior that amplifies existing skew rather than counterbalancing it.

5. **Google CSE is non-functional.** HTTP 403 throughout both runs. All search was served by Brave. This is a pre-existing condition (not cross-provider related) but should be noted.

6. **Credit exhaustion is the immediate blocker.** A rerun requires Anthropic credit replenishment. The two runs consumed substantial budget (~6 hours of Sonnet 4.5 + Haiku 4.5 calls).

---

## Recommendation

**NO-GO for cross-provider promotion.** The gate cannot be passed because:

1. **Incomplete data:** Run #2 lost 3 pairs to credit exhaustion. A valid gate requires 2x 10/10.
2. **Degradation too high:** meanDegradationRateDelta of ~17pp (vs 5pp threshold) shows cross-provider introduces material analytical instability.
3. **Inter-run variance high:** 10.47pp mean pair-to-pair variance between runs suggests the system is not yet stable enough for meaningful A/B comparison.

**To retry this gate:**
- Replenish Anthropic credits
- Consider running during off-peak hours to avoid any potential rate issues
- Investigate why `tax-policy-fr` degraded from 0pp (baseline) to 55pp (cross-provider)
- Consider whether the 5.0pp meanDegradationRateDelta threshold is realistic given inherent LLM non-determinism (~10pp inter-run variance even within the same configuration)
