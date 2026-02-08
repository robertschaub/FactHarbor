# Bolsonaro Trial Analysis - Deep Investigation Report

**Status:** INVESTIGATION COMPLETE
**Date:** 2026-02-05
**Investigator:** Claude (Lead Architect)
**Priority:** High

> **Note**: Generic evidence quality principles extracted from this investigation are maintained in `Docs/WIP/Generic_Evidence_Quality_Principles.md`.

---

## Executive Summary

Investigation of the Bolsonaro trial analysis revealed **variable quality** across runs. The system CAN correctly detect both trials (TSE electoral + STF criminal), but exhibits inconsistent behavior including:

1. **Irrelevant US Government content contamination** - Trump's executive orders being used as "evidence"
2. **Context naming pollution** - COVID-19/clinical study language appearing in TSE context names
3. **Inconsistent multi-context detection** - Sometimes detecting US Government response as an AnalysisContext

---

## 1. Analyses Compared

### Analysis 55f2961... (BEFORE fix)

| Context | Name | Verdict | Issue |
|---------|------|---------|-------|
| STF_ecc8 | Brazilian Supreme Federal Court Criminal Trial | 75% | Correct |
| **US_af14** | **US Government Response to Brazilian Trial** | 15% | **INVALID** - Third-party reaction |
| TSE_6305 | Analysis of **clinical study reports**, trial registries... | 45% | **CONTAMINATED** name |

**Problems:**
- US Government context violates the "SAME QUESTION RULE" in prompts
- TSE context name includes irrelevant COVID/clinical study language

### Analysis bcadfa0... (AFTER fix)

| Context | Name | Verdict | Issue |
|---------|------|---------|-------|
| STF_51c4 | Supreme Federal Court Criminal Trial | 72% | Correct |
| STF_95b7 | Jurisdictional Authority and Procedural Fairness Challenges | 35% | Over-split (same trial) |
| TSE_6305 | Brazil (COVID-19 pandemic period...) | 45% | **CONTAMINATED** name |

**Improvements:**
- No US Government context
- Both STF and TSE present

**Remaining Issues:**
- TSE context still has COVID contamination
- STF split into two contexts (over-splitting)

### Analysis c9472e5... (Fresh test - 2026-02-05)

| Context | Name | Verdict | Issue |
|---------|------|---------|-------|
| TSE_5316 | Brazilian Electoral Court Disqualification Proceedings | 78% | **CORRECT** |
| STF_980d | Brazilian Supreme Court Criminal Trial Proceedings | varies | **CORRECT** |
| TSE_0c69 | Brazil (Application of existing Brazilian electoral laws...) | - | Redundant? |

**Best result so far:**
- Both trials correctly identified
- No US Government context
- No COVID contamination
- But has a third slightly redundant context

---

## 2. Root Causes Identified

### ROOT CAUSE 1: Irrelevant Sources in "Criticism and Opposing Views" Search

**Location:** orchestrated.ts

**Problem:** The search for criticism/controversy returns US Government documents that mention "Bolsonaro" but are completely irrelevant to Brazilian legal proceedings.

**Impact:** Trump's characterization of the trial as a "witch hunt" is being used as evidence against the trial's fairness.

### ROOT CAUSE 2: No Geographic/Jurisdictional Filtering

**Problem:** When searching for criticism/counter-evidence, there's no filter to ensure sources are relevant to the JURISDICTION of the proceeding being analyzed.

### ROOT CAUSE 3: LLM Non-Determinism in Context Detection

**Problem:** The same input produces different contexts on different runs:
- Run 1: STF + US Response + TSE (contaminated)
- Run 2: STF (split) + TSE (contaminated)
- Run 3: TSE + STF + TSE (redundant) — Best

### ROOT CAUSE 4: Evidence Source Relevance Not Validated

Evidence extraction happens for ALL fetched sources without checking jurisdiction, source type, or actual subject relevance.

---

## 3. Proposed Fixes

### FIX 1: Add Geographic/Jurisdictional Filter to Search Queries (Priority: HIGH)
For legal/trial questions, add jurisdiction keywords to searches.

### FIX 2: Source Relevance Pre-Filter (Priority: HIGH)
Before extracting evidence, check if the source is relevant to the claim's jurisdiction.

### FIX 3: Strengthen Context Relevance Validation (Priority: MEDIUM)
Add a post-processing step to validate detected contexts against the original question.

### FIX 4: Evidence Source Type Classification (Priority: MEDIUM)
Classify sources by type and weight accordingly (legal_analysis, official_document, news_reporting, political_opinion, advocacy, foreign_government).

### FIX 5: Add "Exclude Foreign Political Opinions" Config Option (Priority: LOW)

---

## 4. Implementation Priority

| Fix | Priority | Effort | Impact |
|-----|----------|--------|--------|
| FIX 1: Jurisdiction filter on search | HIGH | Low | High |
| FIX 2: Source relevance pre-filter | HIGH | Medium | High |
| FIX 3: Context validation | MEDIUM | Low | Medium |
| FIX 4: Source type classification | MEDIUM | Medium | Medium |
| FIX 5: Config option | LOW | Low | Low |

---

## 5. Verification Queries

1. **Bolsonaro query:** "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"
2. **Control query:** "Was the Trump impeachment trial fair?"

---

## 6. Immediate Workaround

Until fixes are implemented, users can:
1. Be more specific in queries
2. Manually review and discount foreign political opinions in the output

---

## 7. Files to Modify

| File | Changes |
|------|---------|
| `orchestrated.ts` | Add jurisdiction to search queries, source relevance filter |
| `evidence-filter.ts` | Add source type classification |
| `config-schemas.ts` | Add new config options |
| `orchestrated-understand.ts` | Strengthen context relevance rules |

---

**Investigation Status:** COMPLETE
**Archived:** 2026-02-08
