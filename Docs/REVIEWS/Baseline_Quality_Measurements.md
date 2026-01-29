# Evidence Quality Baseline Measurements

**Purpose**: Track evidence extraction quality metrics over time to validate Phase 1.5 and Phase 2 improvements

**Created**: 2026-01-29
**Script**: `scripts/measure-evidence-quality.ts`

---

## Overview

This document explains the baseline quality measurement system for evidence extraction. The measurements validate that Phase 1.5 (probative value enforcement) and Phase 2 (EvidenceItem interface, sourceType classification) improvements are working as intended.

---

## Metrics Measured

### 1. Probative Value Metrics

**What it measures**: How well the LLM and filter layers assess evidence quality

| Metric | Definition | Target | Phase |
|--------|-----------|--------|-------|
| **probativeValue Coverage** | % of evidence items with probativeValue field populated | >80% | Phase 1.5 |
| **High probativeValue Rate** | % of evidence rated "high" | >60% | Phase 2 |
| **Low probativeValue Rate** | % of evidence rated "low" | <10% | Phase 2 |

**Why it matters**: Low-quality evidence ("some say", "many believe") pollutes verdicts. The two-layer enforcement strategy (prompt + filter) should keep probativeValue coverage high and low-value items rare.

**Success Criteria** (Phase 2.0 Gate):
- ✅ probativeValue coverage >80%
- ✅ Low probativeValue rate <10%

---

### 2. Claim Direction Metrics

**What it measures**: How consistently evidence is labeled with its relationship to the user's claim

| Metric | Definition | Target | Phase |
|--------|-----------|--------|-------|
| **claimDirection Coverage** | % of evidence with claimDirection field populated | >95% | Phase 1.5 |
| **Missing Rate** | % of evidence without claimDirection | <5% | Phase 1.5 |
| **Direction Balance** | Distribution of supports/contradicts/neutral | Contextual | Phase 1.5 |

**Why it matters**: Verdict generation depends on knowing which evidence supports vs contradicts the claim. Missing claimDirection forces the LLM to re-infer direction from text, reducing accuracy.

**Success Criteria** (Phase 1.5 Gate):
- ✅ claimDirection missing rate <5%
- ✅ Per-source telemetry shows consistent extraction

---

### 3. Category Distribution

**What it measures**: Usage of evidence categories, especially "direct_evidence" vs legacy "evidence"

| Metric | Definition | Target | Phase |
|--------|-----------|--------|-------|
| **Direct Evidence Usage** | % using "direct_evidence" vs "evidence" | Increasing | Phase 2 |
| **Category Balance** | Distribution across all categories | Contextual | Ongoing |

**Why it matters**: The legacy category value "evidence" is tautological when the entity is called `EvidenceItem`. Phase 2 adds "direct_evidence" as the preferred value.

**Tracking**: Monitor gradual adoption of "direct_evidence" over "evidence" during Phase 2.1+ migration.

---

### 4. EvidenceScope & sourceType Metrics

**What it measures**: Population of source methodology metadata

| Metric | Definition | Target | Phase |
|--------|-----------|--------|-------|
| **EvidenceScope Coverage** | % of evidence with evidenceScope present | Contextual | Phase 1 |
| **sourceType Coverage** | % of EvidenceScope items with sourceType | >70% | Phase 2.5 |
| **sourceType Distribution** | Breakdown by source type | Contextual | Phase 2.5 |

**Why it matters**:
- EvidenceScope enables analytical boundary detection (e.g., "WTW vs TTW" in EV analysis)
- sourceType enables better source reliability calibration (peer-reviewed studies vs news articles)

**Success Criteria** (Phase 2.0 Gate):
- ✅ sourceType coverage >70% (of items with EvidenceScope)
- ✅ Distribution reflects actual source mix

---

### 5. Source Statistics

**What it measures**: Evidence extraction efficiency per source

| Metric | Definition | Baseline | Phase |
|--------|-----------|----------|-------|
| **Avg Evidence per Source** | Mean evidence items extracted per source | ~5-8 | Ongoing |
| **Distribution** | Min, 25th, median, 75th, max | Contextual | Ongoing |

**Why it matters**: Too few items per source suggests under-extraction. Too many suggests over-extraction or low filtering. Target: 3-8 high-quality items per source.

---

## How to Use the Script

### Running Measurements

```bash
# Measure from a directory of analysis job JSON files
npx tsx scripts/measure-evidence-quality.ts ./path/to/jobs

# Save report to file
npx tsx scripts/measure-evidence-quality.ts ./path/to/jobs baseline-2026-01-29.txt
```

### Input Format

The script analyzes JSON files from completed analysis jobs. Each file should contain:

```json
{
  "input": "user claim text",
  "facts": [
    {
      "id": "S1-F1",
      "fact": "statement text",
      "category": "direct_evidence",
      "specificity": "high",
      "sourceId": "S1",
      "sourceUrl": "https://...",
      "sourceExcerpt": "...",
      "claimDirection": "supports",
      "probativeValue": "high",
      "evidenceScope": {
        "name": "WTW",
        "sourceType": "peer_reviewed_study"
      }
    }
  ]
}
```

### Output Format

```
================================================================================
EVIDENCE QUALITY BASELINE MEASUREMENT
================================================================================

Measurement Date: 2026-01-29T...
Total Evidence Items: 450
Total Sources: 87

## PROBATIVE VALUE METRICS

Coverage: 92.4% (416/450 items)

Distribution:
  High:       280 (62.2%)
  Medium:     136 (30.2%)
  Low:          0 (0.0%)
  Missing:     34 (7.6%)

✅ SUCCESS: probativeValue coverage >80%

## CLAIM DIRECTION METRICS

Coverage: 97.1% (437/450 items)

Distribution:
  Supports:     312 (69.3%)
  Contradicts:   89 (19.8%)
  Neutral:       36 (8.0%)
  Missing:       13 (2.9%)

✅ SUCCESS: claimDirection missing rate <5%

...
```

---

## Baseline Measurements

### Pre-Phase 1.5 Baseline (Estimated)

| Metric | Value | Status |
|--------|-------|--------|
| probativeValue Coverage | 0% | (field didn't exist) |
| claimDirection Coverage | ~60-70% | Inconsistent extraction |
| Category: "evidence" usage | 100% | Only category for general evidence |
| sourceType Coverage | 0% | (field didn't exist) |

### Post-Phase 2 Target

| Metric | Target | Gate |
|--------|--------|------|
| probativeValue Coverage | >80% | Phase 2.0 |
| probativeValue Low Rate | <10% | Phase 2.0 |
| claimDirection Missing | <5% | Phase 1.5 |
| sourceType Coverage | >70% | Phase 2.5 |

---

## Interpreting Results

### Green Flags ✅

- **High probativeValue coverage (>80%)**: Prompt instructions working, LLM consistently assessing quality
- **Low missing claimDirection (<5%)**: Direction extraction reliable, verdicts can trust the labels
- **Balanced direction distribution**: Evidence includes both supporting and contradicting items (not one-sided)
- **High sourceType coverage (>70%)**: Source classification working, reliability calibration enabled

### Yellow Flags ⚠️

- **Medium probativeValue coverage (60-80%)**: May need prompt tuning or stricter instructions
- **Missing claimDirection (5-10%)**: Acceptable but watch for patterns (specific sources, categories)
- **Low direct_evidence usage**: Expected during Phase 2.1 gradual migration, should increase over time
- **Low sourceType coverage (50-70%)**: Acceptable for complex sources, watch for improvement trends

### Red Flags ❌

- **Low probativeValue coverage (<60%)**: Prompt instructions not working, may need schema fixes
- **High missing claimDirection (>10%)**: Serious reliability issue, verdicts will be inaccurate
- **High low probativeValue rate (>20%)**: Filter layer not working, low-quality evidence polluting verdicts
- **Very low sourceType coverage (<50%)**: Prompt engineering issue, may need examples or clarification

---

## Validation Gates

### Phase 1.5 Gate (Before Phase 2)

**Required**:
- ✅ claimDirection missing rate <5%
- ✅ Per-source telemetry shows consistent extraction

**Action if not met**: Review prompt instructions, add examples, test on sample sources

### Phase 2.0 Gate (Before Phase 2.1)

**Required**:
- ✅ probativeValue coverage >80%
- ✅ Low probativeValue rate <10%
- ✅ Probative filter false positive rate <5%

**Action if not met**: Tune filter thresholds, adjust category-specific rules, add/remove vague phrases

### Phase 2.5 Gate (Before Phase 3)

**Required**:
- ✅ sourceType coverage >70% (of EvidenceScope items)
- ✅ Distribution reflects expected source mix

**Action if not met**: Add sourceType examples to prompt, clarify classification criteria

---

## Continuous Monitoring

### Recommended Schedule

1. **Before major changes**: Capture baseline before modifying extraction logic
2. **After Phase completion**: Validate improvements meet success criteria
3. **Monthly**: Track trends during Phase 2.1 gradual migration
4. **Before releases**: Ensure no regression in quality metrics

### Trend Analysis

Track metrics over time to identify:
- **Improvements**: Coverage increasing, missing rates decreasing
- **Regressions**: Sudden drops in coverage or spikes in missing data
- **Patterns**: Category-specific or source-specific quality issues

---

## Related Documents

- **[Terminology_Migration_Plan_UPDATED.md](Terminology_Migration_Plan_UPDATED.md)** - Full migration plan with phases
- **[Terminology_Migration_RISK_ANALYSIS.md](Terminology_Migration_RISK_ANALYSIS.md)** - Risk mitigation strategies
- **[Terminology_Migration_SUMMARY.md](Terminology_Migration_SUMMARY.md)** - Executive summary with status

---

**Document Version**: 1.0
**Last Updated**: 2026-01-29
**Next Review**: After first production measurements
