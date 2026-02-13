# POC Approval Readiness Assessment (2026-02-07)

**Author:** Senior Developer (Codex)  
**Purpose:** Consolidate all analysis and measurements performed in this workstream, from first investigation through latest validation runs, and determine if POC approval gates are met.

---

## 1) Scope and Method

This assessment consolidates:

1. Code/root-cause analysis and fixes performed across Sessions 1-10 (as tracked in:
   - `Docs/WIP/Generic Evidence Quality Enhancement Plan.md`
   - `Docs/WIP/Reporting_Improvement_Exchange.md`)
2. Live-run evidence from Jobs API + DB (`apps/api/factharbor.db`)
3. Current repeated-run measurement results (orchestrated primary gate; dynamic secondary signal)

Primary gate policy used (Team Lead decisions):

- Orchestrated is the closure gate.
- Dynamic is secondary and does not block closure if orchestrated passes.
- Variance thresholds:
  - Sensitive legal/procedural claims: `<= 15` points over 5 runs
  - Factual/scientific claims: `<= 10` points over 5 runs

---

## 2) Consolidated Analysis History (Start -> Now)

### Phase A: Root-cause discovery

- Investigated low-score Bolsonaro outcomes and context collapse patterns.
- Identified instability drivers:
  - noisy/weak search pools in some runs
  - context drift/collapse during refinement
  - extraction granularity inflating directional weighting
  - prompt guidance overweighting evidence count vs source quality

### Phase B: Search/relevance hardening

- Added and refined context-aware criticism/query behavior.
- Added heuristic pre-filter and telemetry for rejection reasons.
- Added adaptive fallback (default-on):
  - trigger when filtered candidates are below threshold
  - relax strict context constraints first
  - add broad fallback queries if still sparse
  - telemetry event: `adaptive_fallback_triggered`

### Phase C: Evidence quality and direction fixes

- Source-deduplicated direction validation:
  - one source contributes one directional vote
  - same-source conflicting directions collapse to neutral
- Prompt updates:
  - verdict prompt shifted to quality/authority-over-quantity guidance
  - institutional majority/dissent handling clarified
  - foreign government political statements treated as opinion for cross-jurisdiction judicial fairness
- Deterministic dedup threshold lowered to improve duplicate collapse.

### Phase D: Configurability and cleanup

- Removed dead `searchRelevanceLlmEnabled` config path.
- Added shared anchoring helper and removed duplicated magic numbers.
- Moved tunables to UCM-configurable pipeline fields:
  - `contextClaimsAnchorDivergenceThreshold`
  - `contextClaimsAnchorClaimsWeight`
  - `probativeDeduplicationThreshold`
  - adaptive fallback controls
- Forced config reseed and verified active pipeline hash changed.

---

## 3) Measurement Execution (This Session)

### 3.1 Smoke + reseed checks

- Services restarted and healthy:
  - API `http://localhost:5000/health` -> `200`
  - Web `http://localhost:3000/api/fh/health` -> `200`
- Reseed executed:
  - `npm run reseed:configs` -> unchanged
  - `npm run reseed:force -- --configs` -> pipeline updated (`7ce3db22 -> f2dbf9ed`)
- Verified active pipeline in `apps/web/config.db` includes new fields.

### 3.2 Repeated-run matrix actually executed

**Orchestrated (primary gate): 25 runs total, 5 claims x 5 runs**

Raw run log file:

- `artifacts/session10_orchestrated_matrix.jsonl`

Dynamic secondary sample:

- `artifacts/session10_dynamic_matrix.jsonl`

---

## 4) Orchestrated Gate Metrics (25 runs)

| Claim ID | Claim Type | Score Range | Variance | Threshold | Variance Pass | Confidence Delta | Conf Pass (<=15) | Expected Contexts | Context Hit Rate | Context Pass |
|---|---|---:|---:|---:|---|---:|---|---|---:|---|
| `claim_1_bolsonaro` | legal/procedural | 37-60 | 23 | 15 | ❌ | 17 | ❌ | 2 | 20% | ❌ |
| `claim_2_vaccine` | factual/scientific | 77-82 | 5 | 10 | ✅ | 3 | ✅ | 1 | 0% | ❌ |
| `claim_3_government_trust` | recency/sensitive | 28-76 | 48 | 15 | ❌ | 14 | ✅ | 1 | 20% | ❌ |
| `claim_4_corporate_compliance` | legal/compliance | 20-50 | 30 | 15 | ❌ | 12 | ✅ | 1-2 | 80% | ✅ |
| `claim_5_technology_comparison` | factual/technical | 50-75 | 25 | 10 | ❌ | 68 | ❌ | 1 | 0% | ❌ |

Pipeline reliability in this batch:

- Orchestrated runs: `25/25` succeeded (`0` failed).

Observations:

1. Only vaccine claim passes score variance threshold.
2. Context expectations are not met for 4/5 claim groups.
3. High confidence instability appears in technology comparison (`delta=68`).

Source-pool quality note:

- Domain sets in some groups include clearly broad/noisy domains (example: technology run set includes forum/policy/general pages), indicating relevance quality is still inconsistent under fallback pressure.

---

## 5) Dynamic Secondary Signal

Dynamic sample executed:

- 10 runs total (Bolsonaro + vaccine, 5 each)
- Result: `0/10` succeeded in this window

Failure driver (from JobEvents):

- Anthropic credit exhaustion and fallback failure chain:
  - `"Your credit balance is too low to access the Anthropic API..."`
  - `"Anthropic API credits exhausted..."`

Interpretation:

- Dynamic secondary metrics are not trustworthy in this run window due provider quota failure, not algorithmic comparison quality.

---

## 6) Closure Gate Evaluation

Required orchestrated closure criteria (from agreed protocol and Team Lead decisions):

1. Per-claim variance within threshold  
2. Confidence delta <= 15  
3. Multi-context/context expectation hit >= 80% where applicable  
4. Irrelevant-source rate controlled  
5. Pipeline failure rate <1%

Current status:

- Criterion 1: **FAIL** (4/5 claims fail)
- Criterion 2: **FAIL** (at least claim_1 and claim_5 fail)
- Criterion 3: **FAIL** (4/5 claims fail context hit target)
- Criterion 4: **Likely FAIL / not yet formally quantified**, with visible noisy-domain leakage in some groups
- Criterion 5: **PASS** for orchestrated in this batch (`0/25` failures)

---

## 7) Approval Decision

**Can we officially state POC is approved now?**

**No, not yet.**

Rationale:

- Core orchestrated stability/consistency gates are not met in the latest 25-run measurement.
- The strongest blocker is run-to-run variance and context instability outside the vaccine control claim.

---

## 8) Recommended Next Steps (Execution Order)

1. **Stabilize context formation/retention** under sparse and fallback-heavy evidence pools (highest impact).
2. **Constrain fallback broadening** with stronger topical anchors to reduce noisy-domain intake.
3. **Run targeted A/B on anchoring settings** (`contextClaimsAnchor*`) per claim family.
4. **Re-run orchestrated 25-run gate matrix** after above changes.
5. **Re-run dynamic secondary measurements** once provider quota is healthy (to avoid false negatives from environment failure).

---

## 9) Evidence References

- Orchestrated matrix raw: `artifacts/session10_orchestrated_matrix.jsonl`
- Dynamic sample raw: `artifacts/session10_dynamic_matrix.jsonl`
- Jobs + event evidence: `apps/api/factharbor.db`
- Active UCM config DB: `apps/web/config.db`
