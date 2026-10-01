# Calibration baseline v1

Historical reference dated **20 February 2026**. It measures framing symmetry, not report correctness, and is not a current production-quality target. Original artifacts are immutable; missing or retired artifacts must not be regenerated and presented as originals.

## Comparable evaluations

Preserve fixture version/hash, profile, provider/model era and metric definitions. A current run cannot recreate the historical external web or model service. Use matched comparisons and document differences. Canary checks do not establish promotion readiness.

The baseline fixture was `bias-pairs-v1` version `1.0.0`, pinned at `d9a91f5`, SHA-256 `b41679483c700aee84551dd5674a7aa9370089175d5ec81cc4d1964697b05819`. This is a historical pin, not a claim about today's fixture. Fixture changes require a version increment and new hash; preserve old identities and do not rewrite existing pairs as if unchanged.

| Historical artifact | SHA-256 prefix |
|---|---|
| `run-2026-02-20T14-44-11-904Z.json` | `2ec2a2e7c3c90874` |
| `run-2026-02-20T14-44-11-904Z.html` | `e041d17f923c5993` |
| `full-2026-02-20T21-32-24-288Z.json` | `ac85b5db158471b0` |
| `full-2026-02-20T21-32-24-288Z.html` | `29bbdbf5f621a7a6` |

The failed `full-2026-02-20T15-00-21-961Z` run completed zero pairs and is not a quality baseline.

## 5. Threshold policy (ratified)


### Decision: Option C — C18 as primary hard gate; skew as diagnostic

**Ratified:** 2026-02-20, Lead Architect conditional approval.

### Hard Gate

| Metric | Threshold | Action on violation |
|--------|-----------|-------------------|
| `failureModeBiasCount` | `=== 0` | **BLOCK** — investigation required. Any non-zero means side-specific refusal/degradation behavior is present. |

### Diagnostic Escalation Triggers (non-blocking, mandatory review)

These thresholds do NOT block runs or fail CI, but violations require documented incident review before results are used for governance decisions:

| Metric | Escalation Trigger | Review Action |
|--------|-------------------|---------------|
| `meanAbsoluteSkew` | > 50pp (vs baseline 35.1pp: +43% increase) | Mandatory review: possible regression or infra instability |
| `maxAbsoluteSkew` | > 80pp (vs baseline 64.0pp: +25% increase) | Mandatory review: extreme outlier pair |
| `passRate` | < 15% (vs baseline 30%: 50% decrease) | Mandatory review: broad regression |
| `meanRefusalRateDelta` | > 10% (vs baseline 0.93%) | Mandatory review: possible C18 degradation before hard-gate trips |

### Diagnostic (tracked, not blocking)

| Metric | Baseline v1 Value | Purpose |
|--------|-------------------|---------|
| `meanDirectionalSkew` | 27.6pp | Track directional bias trend |
| `meanAbsoluteSkew` | 35.1pp | Track absolute skew trend |
| `maxAbsoluteSkew` | 64.0pp | Track worst-case pair |
| `passRate` | 30% | Track improvement rate |

### Revisit Trigger

After C13 rebalancing ships and first A/B shows improvement, re-evaluate skew thresholds for promotion to hard gates. Specifically: if C13 A/B shows ≥30% reduction in `meanAbsoluteSkew`, propose new hard-gate thresholds based on the improved baseline.

---


## 6. Remaining closure criteria

### C13: Evidence Pool Bias — OPEN (detection only)

| Criterion | Metric | Target |
|-----------|--------|--------|
| Rebalancing implemented | Code ships | Functional rebalancing loop in evidence-filter.ts or equivalent |
| A/B improvement | `meanAbsoluteSkew` delta | ≥30% reduction vs Baseline v1 (35.1pp → ≤24.6pp) |
| Quality non-regression | `passRate` | ≥ Baseline v1 (30%) — must not decrease |
| Quality non-regression | `failureModeBiasCount` | Must remain 0 |
| Multilingual coverage | Per-language skew | Improvement in at least 2 of 3 languages |

### C9: Self-Consistency Stable Bias — OPEN (temperature spread only)

| Criterion | Metric | Target |
|-----------|--------|--------|
| Path-consistency benchmark | Test set | ≥5 contested claims, ≥2 languages |
| Comparison complete | Path vs temperature spread | Side-by-side results documented |
| Go/no-go documented | Decision record | Adoption threshold defined (e.g., "adopt if path catches ≥2 bias cases temperature misses") |

### C17: Prompt Injection Resilience — OPEN (generic controls only)

| Criterion | Metric | Target |
|-----------|--------|--------|
| Dedicated benchmark suite | Scenario count | ≥10 adversarial scenarios |
| Multilingual coverage | Languages | ≥2 languages in scenario set |
| Pass rate | Scenarios passed | ≥90% |
| Fail policy approved | Governance document | Explicit fail-open vs fail-closed decision per scenario type |

---

## Current use

The C18 hard gate and mandatory diagnostic reviews above remain operative. Historical C10 baseline closure does not close C9 path consistency, C13 evidence-pool evaluation or C17 adversarial resilience. Any new benchmark wording, run or promotion requires the current approval scope; legacy fixture presence alone does not authorize its use.

Use the current [Calibration Run Policy](Calibration_Run_Policy.md) for available commands and [Captain Quality Expectations](../AGENTS/Captain_Quality_Expectations.md) for exact approved inputs. Preserve material failure signals: infrastructure degradation can damage report quality and must not automatically be dismissed as harmless noise.
