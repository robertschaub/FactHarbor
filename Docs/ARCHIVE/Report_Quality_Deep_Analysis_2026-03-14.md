# Report Quality Deep Analysis — Cross-Pipeline Historical Investigation

**Generated:** 2026-03-14
**Scope:** 933 unique jobs across 11 databases, Dec 2025 – Mar 2026
**Pipelines:** Orchestrated (removed Feb 16) and ClaimAssessmentBoundary (current)

---

## Executive Summary

Analysis of 933 historical jobs reveals two distinct quality peaks and one active regression:

| Pipeline | Peak Date | Peak Avg Score | Best Individual | Current State |
|----------|-----------|---------------|-----------------|---------------|
| **Orchestrated** | Jan 11-13 | 97-108 | 200 (Bolsonaro, `0c7721b3`) | Removed Feb 16 |
| **CB** | Mar 8-9 | 187 | 279 (Plastik recycling, `cee9b5a7`) | **Declining since Mar 12** |

The CB pipeline at its peak (Mar 8-9) significantly outperformed the best orchestrated results: 2x more evidence items, structured probativeValue/claimDirection, and higher confidence. However, a quality regression beginning Mar 12 afternoon has eroded confidence by ~30 points and evidence yield by ~50%, correlating with SR weighting integration and jurisdiction filtering commits.

**Report generation remains unimplemented** — all CB reports are 82-char stubs.

---

## 1. Quality Scoring Methodology

```
score = min(evidence_count, 100)    # Evidence items (capped)
      + source_count × 2            # Sources
      + confidence / 5              # Confidence bonus
      + 10 if truth > 0             # Has truth value
      + 15 if has_directions         # Evidence has claimDirection
      + 15 if pv_high + pv_med > 0  # probativeValue populated
      + 10 if report > 1000 chars   # Report exists
      + 10 if report > 5000 chars   # Substantial report
```

Note: Orchestrated reports get +10/+20 for report length (real reports generated), while CB always gets +0 (82-char stub). This means CB scores of 187 are comparable to orchestrated scores of ~207 if CB had report generation.

---

## 2. Daily Quality Evolution

### Orchestrated Pipeline (Dec 27, 2025 – Jan 13, 2026)

| Date | Runs | Avg Score | Avg Conf | Avg Evidence | Avg Sources | Schema |
|------|------|-----------|----------|--------------|-------------|--------|
| Dec 27 | 10 | 10 | 0 | 0 | 0 | ? (pre-schema) |
| Dec 30 | 14 | 42 | 0 | 19 | 4 | 2.2.0, 2.3.0 |
| Jan 1 | 23 | 46 | 0 | 25 | 6 | 2.5.0, 2.6.14 |
| Jan 5 | 57 | 70 | 0 | 37 | 10 | 2.6.15, 2.6.17 |
| Jan 6 | 38 | 85 | 0 | 52 | 10 | 2.6.18 |
| Jan 7 | 116 | 77 | 0 | 44 | 10 | 2.6.18 |
| Jan 10 | 51 | 82 | 0 | 48 | 9 | 2.6.23, 2.6.24 |
| **Jan 11** | **35** | **97** | **0** | **59** | **11** | 2.6.23, 2.6.25 |
| **Jan 12** | **157** | **86** | **84** | **38** | **10** | 2.6.24, 2.6.25 |
| **Jan 13** | **9** | **108** | **79** | **43** | **12** | **2.6.28** |

Notes:
- Pre-Jan 12: truth/confidence fields not populated in verdictSummary (schema limitation)
- Jan 11 has highest avg evidence count (59) but no truth/confidence in result schema
- Jan 13 has highest avg score (108) with all fields populated (schema 2.6.28)
- probativeValue was NOT populated in orchestrated pipeline at any schema version

### ClaimAssessmentBoundary Pipeline (Feb 18 – Mar 14, 2026)

| Date | Runs | Avg Score | Avg Truth | Avg Conf | Avg Evidence | Avg PvH | Avg Sources | Schema |
|------|------|-----------|-----------|----------|--------------|---------|-------------|--------|
| Feb 18 | 18 | 149 | 67 | 69 | 60 | 21 | 19 | 3.0.0-cb |
| Feb 19 | 18 | 131 | 47 | 69 | 48 | 15 | 15 | 3.0.0-cb |
| Feb 25 | 8 | **164** | 34 | **85** | 66 | 23 | 21 | 3.2.0-cb |
| Feb 27 | 44 | 126 | 48 | 68 | 48 | 26 | 13 | 3.2.0-cb |
| Mar 1 | 14 | 136 | 47 | 71 | 53 | 31 | 14 | 3.2.0-cb |
| Mar 2 | 7 | 172 | 46 | 78 | 80 | 51 | 18 | 3.2.0-cb |
| Mar 3 | 9 | 152 | 50 | 73 | 63 | 47 | 19 | 3.2.0-cb |
| Mar 5 | 21 | 133 | 50 | 69 | 50 | 25 | 15 | 3.2.0-cb |
| Mar 8 | 15 | **161** | 59 | 71 | 71 | 41 | 22 | 3.2.0-cb |
| **Mar 9** | **12** | **187** | **63** | **79** | **95** | **67** | **24** | 3.2.0-cb |
| Mar 10 | 2 | 157 | 76 | 69 | 70 | 35 | 17 | 3.2.0-cb |
| Mar 11 | 2 | 148 | 63 | 62 | 61 | 38 | 18 | 3.2.0-cb |
| **Mar 12** | **12** | **135** | **57** | **51** | 48 | 23 | 18 | 3.2.0-cb |
| **Mar 13** | **23** | **126** | **56** | **51** | 44 | 24 | 17 | 3.2.0-cb |
| Mar 14 | 5 | 146 | 49 | 58 | 53 | 28 | 20 | 3.2.0-cb |

---

## 3. Best 6-Hour Quality Windows

| Rank | Window Start | Window End | Avg Score | Runs | Pipeline |
|------|-------------|-----------|-----------|------|----------|
| 1 | **2026-03-09 08:22** | **14:02** | **186.9** | 5 | CB |
| 2 | 2026-03-09 19:13 | 22:42 | 186.2 | 7 | CB |
| 3 | 2026-03-09 21:35 | 22:42 | 178.7 | 6 | CB |
| 4 | 2026-03-08 09:37 | 15:01 | 175.8 | 8 | CB |
| 5 | 2026-03-09 21:56 | 22:42 | 167.6 | 5 | CB |
| 6 | 2026-03-08 13:52 | 19:28 | 165.7 | 14 | CB |
| 7 | 2026-02-25 14:47 | 17:36 | 164.4 | 8 | CB |
| 8 | 2026-03-03 11:37 | 17:05 | 158.8 | 6 | CB |

All top windows are CB pipeline. Best orchestrated daily was Jan 11 (avg 97) and Jan 13 (avg 108), but these don't appear in the top 6-hour windows because the orchestrated peak is ~50% lower than the CB peak.

---

## 4. Top 20 Individual Reports

| Rank | JobId | Pipeline | Date | Input | Score | Truth | Conf | Evidence | PvH | Sources |
|------|-------|----------|------|-------|-------|-------|------|----------|-----|---------|
| 1 | `cee9b5a7` | CB | Mar 8 | Plastik recycling bringt nichts | 279 | 21% | 73% | 180 | 91 | 62 |
| 2 | `2661e624` | CB | Mar 9 | Was Iran actually making nukes? | 234 | 79% | 80% | 154 | 117 | 39 |
| 3 | `37594d23` | CB | Mar 9 | Plastik Recycling bringt nichts | 231 | 22% | 74% | 114 | 64 | 38 |
| 4 | `0543f74f` | CB | Mar 3 | Global warming is a reality... | 228 | 94% | 91% | 142 | 124 | 35 |
| 5 | `3bae686f` | CB | Mar 5 | Plastik recycling bringt nichts | 224 | 37% | 71% | 124 | 61 | 35 |
| 6 | `62fd4b46` | CB | Mar 2 | Plastik recycling ist ökologisch sinnvoll | 223 | 71% | 58% | 97 | 44 | 37 |
| 7 | `d466c351` | CB | Mar 8 | Was Iran actually making nukes? | 219 | 90% | 86% | 136 | 110 | 31 |
| 8 | `44121718` | CB | Mar 5 | Was Iran actually making nukes? | 216 | 75% | 80% | 103 | 86 | 30 |
| 9 | `4a915d52` | CB | Feb 18 | The sky is blue | 216 | 87% | 80% | 104 | 38 | 30 |
| 10 | `26c4d9a4` | CB | Mar 8 | Was Iran actually making nukes? | 213 | 87% | 86% | 112 | 94 | 28 |
| 11 | `10e57f5c` | CB | Feb 18 | The sky is blue | 213 | 81% | 73% | 105 | 50 | 29 |
| 12 | `2a6c1abe` | CB | Mar 9 | Was Iran actually making nukes? | 210 | 82% | 82% | 136 | 119 | 27 |
| 13 | `f26e50ce` | CB | Mar 9 | Was Iran actually making nukes? | 209 | 82% | 86% | 120 | 93 | 26 |
| 14 | `53579d41` | CB | Mar 9 | Venezuela's economy under Maduro... | 209 | 6% | 85% | 114 | 74 | 26 |
| 15 | `0d543936` | CB | Feb 27 | Facts and misinformation are not... | 208 | 73% | 73% | 85 | 55 | 34 |
| 16 | `14d4bf64` | CB | Feb 27 | Plastik Recycling bringt nichts | 207 | 15% | 75% | 114 | 64 | 26 |
| 17 | `cdbef4e1` | CB | Feb 18 | O julgamento de Bolsonaro foi justo... | 206 | 89% | 81% | 102 | 64 | 25 |
| 18 | `cb66387f` | CB | Feb 27 | Neutralität wird für die Schweiz... | 202 | 55% | 68% | 102 | 64 | 24 |
| 19 | `6d46e87e` | CB | Mar 9 | Was Iran actually making nukes? | 197 | 77% | 76% | 101 | 70 | 21 |
| 20 | `cf89dc28` | CB | Feb 25 | Wird Südkorea in 50 Jahren aussterben? | 196 | 76% | 88% | 74 | 33 | 32 |

**All top 20 are CB pipeline.** Best orchestrated individual: `0c7721b3` (Jan 13, score ~200) — would rank ~#9 if CB report generation existed (its score includes +20 for report length).

---

## 5. Deep-Dive: What Makes a High-Quality Report

### Anatomy of the #1 Report (`cee9b5a7` — Plastik recycling, Score 279)

| Metric | Value |
|--------|-------|
| Evidence items | 180 (highest in entire dataset) |
| probativeValue | high: 91, medium: 89 (100% classified, 0 unknown) |
| claimDirection | supports: 31, contradicts: 63, neutral: 43, unknown: 43 |
| Categories | evidence: 104, statistic: 56, expert_quote: 20 |
| Source types | organization_report: 67, government_report: 31, expert_statement: 24 |
| Sources | 62 (highest in dataset) |
| Search queries | 28 |
| Claim boundaries | 6 |
| Warnings | 0 |

Key quality drivers: massive evidence yield from 28 diverse queries, authoritative source mix (organization + government reports dominating), and full probativeValue classification.

### High-Quality vs Poor-Quality Comparison

| Metric | Top 3 Reports (Mar 8-9) | Recent Poor (Mar 13) | Delta |
|--------|------------------------|---------------------|-------|
| Evidence count | 142–180 | 23–46 | **3-7x fewer** |
| High probativeValue % | 64–87% | 23–50% | **Halved** |
| claimDirection neutral % | 24–38% | 46–96% | **2-3x more neutral** |
| Source count | 35–62 | 10–17 | **2-4x fewer** |
| Search queries | 18–28 | 10–18 | **Fewer, less diverse** |
| Confidence | 73–91% | 40–55% | **~30 points lower** |
| Dominant source type | organization_report, government_report | news_secondary, legal_document | **Weaker sourcing** |
| Warnings | 0 | 0 | (No warning system signal) |

The clearest quality differentiators:
1. **Evidence volume** — top reports gather 3-7x more evidence items
2. **Directional resolution** — top reports resolve most evidence to supports/contradicts; poor reports stay neutral
3. **Source authority** — top reports draw from organization/government/peer-reviewed; poor reports dominated by news_secondary
4. **Query breadth** — more search queries yield more diverse evidence and sources

---

## 6. Orchestrated Pipeline Peak Analysis (Jan 11-13)

### Best Orchestrated Reports

| JobId | Date | Truth | Conf | Facts | Sources | Report Length | Input |
|-------|------|-------|------|-------|---------|-------------|-------|
| `0c7721b3` | Jan 13 20:19 | 76% | 77% | 100 | 20 | 11,044 | Was the Bolsonaro judgment fair? |
| `63d0157e` | Jan 13 21:50 | 77% | 80% | 99 | 20 | 9,367 | The Bolsonaro judgment was fair |
| `9538c1d6` | Jan 13 20:39 | 65% | 74% | 98 | 20 | 11,727 | Was the Bolsonaro judgment fair? |
| `22a66c96` | Jan 13 22:29 | 75% | 76% | 97 | 20 | 9,310 | The Bolsonaro judgment was fair |
| `232d86cf` | Jan 13 19:19 | 43% | 84% | 94 | 20 | 11,064 | Was the Bolsonaro judgment fair? |

**Schema limitations of orchestrated peak:**
- probativeValue: NOT populated (all `?`) — field existed but wasn't assigned by the pipeline
- claimDirection: populated (supports/contradicts/neutral distribution)
- verdictLabel: NOT in JSON — only in report markdown
- Schema version: 2.6.28
- Report generation: fully functional (9-12K char reports with structured analysis)

**Neutrality observation:** The question form ("Was...fair?") and statement form ("...was fair") produce different truth percentages (43-76% vs 75-77%), suggesting input neutrality wasn't yet stable at this schema version. However, confidence is stable (74-84%).

### Orchestrated vs CB Pipeline Comparison

| Dimension | Orchestrated Peak (Jan 13) | CB Peak (Mar 9) |
|-----------|---------------------------|-----------------|
| Avg score (raw) | 108 | 187 |
| Avg score (adjusted for report) | ~88 | 187 |
| Evidence count | 43-100 | 95-180 |
| probativeValue | Not populated | Fully classified |
| claimDirection | Populated | Populated |
| Sources | ~20 (capped) | 21-62 |
| Search queries | ~20 | 18-30 |
| Report generation | Yes (9-12K chars) | No (82-char stub) |
| Confidence | 74-84% | 73-91% |
| Warnings | 0 | 0 |

**CB pipeline at its Mar 9 peak is substantially superior** in evidence gathering and classification. The only area where orchestrated still leads is report generation (fully implemented vs stub).

---

## 7. Quality Regression Analysis (Mar 12+)

### Timeline of Decline

| Timestamp | Score | Confidence | Evidence | PvH | Observation |
|-----------|-------|------------|----------|-----|-------------|
| Mar 9 22:42 | 167 | 85% | 114 | 74 | Last pre-decline batch |
| Mar 10 08:40 | 138 | 68% | 62 | 36 | Transitional — moderate drop |
| Mar 11 21:51 | 145 | 65% | 52 | 31 | Further dip |
| **Mar 12 08:09** | **148** | **75%** | **57** | **27** | Morning still OK |
| **Mar 12 16:04** | **110** | **42%** | **42** | **13** | **Afternoon cliff** |
| Mar 12 22:01 | 111 | **16%** | 42 | 13 | Extreme outlier |
| Mar 13 00:33 | 126 | 48-53% | 23-42 | 9-30 | Sustained low |
| Mar 13+ | 126 avg | 51% avg | 44 avg | 24 avg | New baseline |

### Causal Commits

The decline correlates with two commit clusters deployed Mar 10-12:

**Cluster 1: SR Weighting Integration (Mar 10-11)**
- `2cff1bee` — `feat(sr): add evidence quality assessment with probativeValue enrichment`
- `9550eb26` — `feat(sr): wire applyEvidenceWeighting into the verdict pipeline`
- `8c4cfdf8` — `fix(sr): backfill SR scores after prefetch and fix category display`
- Multiple SR eval config changes (`de7efc98`, `81eaaa2f`, `02d9ee32`, `6220cf3c`)

**Cluster 2: Jurisdiction Contamination Fixes (Mar 12)**
- `7ed71a05` — `fix(pipeline): wire inferredGeography into Pass 2` (Fix 0)
- `c11110e8` + `f2c14da8` — Add then revert jurisdiction constraints to GENERATE_QUERIES (Fix 2)
- `172bba3d` — `feat(pipeline): jurisdiction-aware relevance classification` (Fix 1, Phase B)
- `fa06cfc3` — `feat(sr): post-extraction applicability filter` (Fix 3)

### Root Cause Hypothesis

Two compounding effects:

1. **SR weighting suppressing confidence:** `applyEvidenceWeighting` (`9550eb26`) introduced SR-based weighting into the verdict pipeline. When SR scores are low or missing (new/uncached sources), evidence weight drops, causing the verdict stage to report lower confidence. This is architecturally correct but may be too aggressive.

2. **Jurisdiction filtering reducing evidence pool:** The jurisdiction fixes (Fixes 0-3) filter evidence by geographic relevance. While solving the contamination problem (Trump executive orders appearing in Bolsonaro analysis), they may be over-filtering, especially for topics with legitimate cross-jurisdiction relevance.

The **C=0 failures** (3 runs on Mar 13) suggest the combined effect can completely drain the effective evidence pool in edge cases.

### Regression Severity Assessment

| Metric | Pre-regression (Mar 8-9) | Post-regression (Mar 12-14) | Impact |
|--------|-------------------------|----------------------------|--------|
| Avg confidence | 75% | 51% | -24 points |
| Avg evidence | 83 items | 47 items | -43% |
| Avg PvH | 54 items | 24 items | -56% |
| Avg sources | 23 | 17 | -26% |
| C=0 failures | 0 | 3+ | New failure mode |
| Avg score | 174 | 132 | -24% |

---

## 8. Commit-to-Quality Mapping

### Peak Quality Commits

| Quality Peak | HEAD Commit | Key Features at This Commit |
|-------------|------------|----------------------------|
| **CB Peak (Mar 9 morning)** | `8bef6a91` | Verdict factual-vs-positional guidance, AUTO mode stop-on-first-success |
| **CB Peak (Mar 9 evening)** | `9c165f29` | SR migration, prompt abstraction, Phase 2.5 scope normalization |
| **CB secondary (Feb 25)** | ~`2bb1b534` | Phase 2.2 features, docs, hotfix completion |
| **Orch Peak (Jan 13)** | `48e1e2b8` | Input neutrality removal, smart verdict weighting, counter-evidence |
| **Orch Peak (Jan 11)** | `8a7bf71c` | Audit report, proceeding fixes |

### Decline Boundary Commits

| Boundary | Commit | Description |
|----------|--------|-------------|
| **Last good CB** | `9c165f29` (Mar 9) | SR migration, prompt abstraction |
| **First decline** | `883a0b5e` (Mar 10) | MT-1 + MT-3 sufficiency guard |
| **Cliff edge** | `9550eb26` (Mar 12) | Wire applyEvidenceWeighting into verdict pipeline |
| **Sustained low** | `fa06cfc3` (Mar 12) | Post-extraction applicability filter (Fix 3) |

---

## 9. Known Quality Gaps (All Timeframes)

1. **Report generation not implemented** — All 300+ CB runs produce 82-char stub reports. This is the largest user-visible quality gap.

2. **Input neutrality inconsistency** — Flying/driving analysis showed ~62 percentage point truth delta (far exceeding 4% tolerance). Bolsonaro question vs statement forms also show variability (43% vs 77% in orchestrated).

3. **Hydrogen bimodal pattern** — Paired runs produce wildly different truth scores (~20% vs ~80%) for the same hydrogen input, suggesting non-deterministic claim decomposition.

4. **Warning system not signaling** — 0 warnings across all quality levels (including C=0 failures). The warning system is not detecting genuine quality degradation.

5. **sourceType classification gaps** — Even in top reports, 25-30% of evidence items may have `?` sourceType (especially in 3.0.0-cb schema).

---

## 10. Experiment Plan (Reviewed & Reconciled)

*Reviewed 2026-03-14. Incorporates findings from code review (Gemini), reconciliation (Sonnet), and architectural verification.*

### Suspects (ranked by likelihood)

| # | Suspect | UCM Toggle | Default | Disable Value |
|---|---------|-----------|---------|---------------|
| S1 | SR evidence weighting | `evidenceWeightingEnabled` | `true` | `false` |
| S2a | Jurisdiction relevance cap (Stage 2) | `foreignJurisdictionRelevanceCap` | `0.35` | `1.0` |
| S2b | Applicability filter (post-extraction) | `applicabilityFilterEnabled` | `true` | `false` |
| S3 | Verdict config drift | `mixedConfidenceThreshold` / `contradictionReservedIterations` | `45` / `1` | `40` / `2` |

**Removed:** `maxIterationsPerContext` — confirmed deprecated and not enforced in CB pipeline (`config-schemas.ts` line 415). The earlier restoration plan's proposal to set it to 5 is a no-op.

**Not yet covered (Phase 3):** Search-stack drift (Brave→Serper swap). If Phases 1-2 do not close the gap, this becomes the next suspect.

**Architectural note:** S2a and S2b are **independent mechanisms** operating on different objects at different pipeline stages. S2a caps relevance scores on search result metadata (Stage 2, pre-fetch). S2b filters fully-extracted EvidenceItems after all research completes. A source blocked by S2a might still enter via a different query; S2b is a safety net, not a downstream consumer of S2a. They must be tested independently.

### Benchmark Inputs

| # | Input | Language | Characteristic |
|---|-------|----------|---------------|
| B1 | "Plastik recycling bringt nichts" | German | Top scorer (279), strong evidence yield |
| B2 | "Was Iran actually making nukes?" | English | Cross-jurisdiction topic, high source diversity |
| B3 | "O julgamento de Bolsonaro foi justo e baseado na legislação vigente" | Portuguese | Jurisdiction-sensitive, tests geo filtering |

### Phase 1: Binary Gate (is the regression in these suspects?)

**Protocol:** 2 runs per input with all suspects disabled. Tiebreaker third run if the two diverge by >25 points.

**Config (Admin → Pipeline):**
```json
{
  "evidenceWeightingEnabled": false,
  "applicabilityFilterEnabled": false,
  "foreignJurisdictionRelevanceCap": 1.0,
  "contradictionReservedIterations": 2,
  "mixedConfidenceThreshold": 40
}
```

**Same-session control:** Also run 2 runs with current production config (all defaults) in the same session to establish same-day baseline. This accounts for search provider variability and temporal factors.

**Expected outcome:**
- If disabled-profile scores ≥ 170 avg AND control scores ≤ 140 avg → regression is confirmed in these suspects. Proceed to Phase 2.
- If both profiles score similarly → regression is elsewhere (search-stack drift, MT guards, or external factors). Skip to Phase 3.

**Cost:** 12-18 runs × ~$1-2 = $12-36.

### Phase 2: Isolate Root Cause

Starting from the "all disabled" baseline, re-enable one suspect group at a time. **3 runs per input per cell** (median-of-3 to account for LLM non-determinism).

**Cell design:**

| Cell | S1 (SR weight) | S2a (cap) | S2b (filter) | S3 (verdict) | Question |
|------|:-:|:-:|:-:|:-:|----------|
| A | ON | off | off | off | Does SR weighting alone cause the drop? |
| B | off | ON | off | off | Does the relevance cap alone cause the drop? |
| C | off | off | ON | off | Does the applicability filter alone cause the drop? |
| D | off | off | off | ON | Does verdict config drift cause the drop? |

**Note:** S2a and S2b are tested independently (not as a 2×2) because they operate on different objects. If both B and C show partial degradation, that indicates both are miscalibrated and need per-mechanism tuning.

**Cost:** 4 cells × 3 inputs × 3 runs = 36 runs × ~$1-2 = $36-72.

### Phase 3: Search-Stack Drift (if Phases 1-2 inconclusive)

If disabling all suspects does not restore quality, investigate search provider changes:
- `search.default.json`: Serper replaced Brave as primary fallback
- Query generation prompt changes may yield different search terms
- Different search providers return different source sets → different evidence

Toggle: Swap Serper/Brave priority back via Admin → Search Config.

### Phase 4: Decide Per Suspect

Each suspect falls into one of three buckets based on Phase 2 results:

| Result | Action |
|--------|--------|
| No quality impact (median score within ±10 of baseline) | Re-enable permanently |
| Moderate impact (median score 15-30 below baseline) | Tune the parameter (softer cap, confidence floor, etc.) |
| Major impact (median score >30 below baseline or C=0 failure) | Leave disabled or redesign approach |

### Other Recommendations

1. **Add C=0 warning:** The warning system emitted 0 warnings during 3 complete verdict failures. At minimum, `confidence === 0` should trigger a `severe` warning.

2. **Implement report generation** — 300+ CB runs with 82-char stubs. This blocks user value delivery.

3. **Automated quality regression tests** — Run the 3 benchmark inputs against each commit to detect quality changes before deployment.
