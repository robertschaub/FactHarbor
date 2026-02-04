# Archive Cleanup Proposal

**Date:** 2026-02-02
**Purpose:** Identify valuable content in ARCHIVE that should be preserved in active documentation
**Status:** High-priority merges COMPLETE (2026-02-02)

---

## Summary

After reviewing 53 archived documents, I identified **6 documents** with content valuable enough to merge into active documentation. The rest are appropriately archived as historical records.

### ✅ Completed High-Priority Merges

| Document | Merged Into | Status |
|----------|-------------|--------|
| Claim Filtering Implementation Prompt | [UCM Guide §5.4](../USER_GUIDES/Unified_Config_Management.md#54-pipelineconfig) | ✅ Done |
| Terminology Catalog | [TERMINOLOGY.md](../REFERENCE/TERMINOLOGY.md#known-issues--migration-status) | ✅ Done |
| Baseless Tangential Claims Investigation | [Evidence_Quality_Filtering.md §2](../ARCHITECTURE/Evidence_Quality_Filtering.md#2-multi-layer-claim-filtering-defense) | ✅ Done |

### Remaining Low-Priority Items

- UCM Onboarding Content → Quick Reference section (deferred)
- EVOLUTION.md verification → Overview.md (deferred)
- UCM Enhancement Recommendations → triage (deferred)
- Final Implementation Review → STATUS/HISTORY.md entry (deferred)

---

## Documents to Merge

### 0. Claim Filtering Implementation Prompt → ARCHIVE (with extraction)

**Source:** `WIP/Claim_Filtering_Enhancements_Implementation_Prompt.md`

**Status:** ✅ **FULLY IMPLEMENTED** (2026-02-02)
- Enhancement 1 (thesisRelevanceConfidence): ✅ Complete
- Enhancement 2 (MIN_EVIDENCE_FOR_TANGENTIAL=2): ✅ Complete
- Enhancement 3 (monitorOpinionAccumulation): ✅ Complete
- Unit Tests: ✅ Complete (30 tests in claim-filtering-enhancements.test.ts)

**Valuable Content to Extract:**

1. **Configuration Summary (lines 871-891)** → Merge into `USER_GUIDES/Unified_Config_Management.md`
   ```json
   {
     "thesisRelevanceValidationEnabled": true,
     "thesisRelevanceLowConfidenceThreshold": 70,
     "thesisRelevanceAutoDowngradeThreshold": 60,
     "minEvidenceForTangential": 2,
     "tangentialEvidenceQualityCheckEnabled": false,
     "maxOpinionFactors": 0,
     "opinionAccumulationWarningThreshold": 70
   }
   ```
   These config options should be documented in the UCM guide under "Pipeline Config Options".

2. **Testing Strategy (lines 696-829)** → Reference in test file comments
   The test cases are already implemented in `claim-filtering-enhancements.test.ts`.

**Action:**
1. Add "Claim Filtering Config Options" section to UCM documentation
2. Move entire file to `ARCHIVE/REVIEWS/Claim_Filtering_Enhancements_Implementation_Prompt.md`
3. Update status to "COMPLETE" at top of archived file

---

### 1. Terminology Catalog → REFERENCE/TERMINOLOGY.md

**Source:** `ARCHIVE/REVIEWS/Terminology_Catalog_Five_Core_Terms.md`

**Valuable Content:**
- Canonical definitions for all 5 core terms (AnalysisContext, EvidenceScope, ArticleFrame, KeyFactor, Fact/EvidenceItem)
- Complete occurrence tables (docs, code, prompts)
- Known issues matrix with status (`[CORRECT]`, `[DEFER]`)
- Migration status tracking

**Action:** Merge the canonical definitions section into `REFERENCE/TERMINOLOGY.md` and add a "Known Issues & Migration Status" section.

**Target Section in TERMINOLOGY.md:**
```markdown
## Canonical Definitions (Authoritative)
[Merge from Terminology_Catalog]

## Known Issues & Migration Status
[Merge status table showing what's CORRECT vs DEFER]
```

---

### 2. Claim Filtering Defense → ARCHITECTURE/Evidence_Quality_Filtering.md

**Source:** `ARCHIVE/REVIEWS/Baseless_Tangential_Claims_Investigation_2026-02-02.md`

**Valuable Content:**
- 7-layer defense system documentation
- Layer-by-layer implementation details
- Configuration locations for each layer
- Filter rules and examples

**Action:** Add a "Multi-Layer Defense System" section to `Evidence_Quality_Filtering.md` with the 7-layer overview diagram and key implementation references.

**Target Section:**
```markdown
## Multi-Layer Claim Filtering Defense

The system implements a 7-layer defense strategy:

1. **Evidence Quality Filtering** - evidence-filter.ts
2. **Provenance Validation** - provenance-validation.ts
3. **Tangential Baseless Pruning** - aggregation.ts
4. **Thesis Relevance Filtering** - getClaimWeight()
5. **Weighted Aggregation** - calculateWeightedVerdictAverage()
6. **Contestation Validation** - validateContestation()
7. **Context-Aware Analysis** - orchestrated.ts

[Brief description of each layer and file locations]
```

---

### 3. UCM Onboarding Content → USER_GUIDES/Unified_Config_Management.md

**Source:** `ARCHIVE/Knowledge_Transfer_UCM_Terminology.md`

**Valuable Content:**
- "High-Level Goals" section (concise overview)
- "Current Behavior Checklist" (operational verification)
- "Terminology Rules" (quick reference)

**Action:** Add a "Quick Reference" or "TL;DR" section at the top of `Unified_Config_Management.md` with these condensed summaries.

**Target Section:**
```markdown
## Quick Reference

### Current Behavior
- Pipeline LLM provider: determined by UCM `pipeline.llmProvider`
- SR evaluation search: controlled by SR config, not env
- Health endpoint: reports provider from UCM
- Defaults: exist for pipeline, search, calc, SR, and lexicons

### Key Terminology
- AnalysisContext = "Context" (NEVER "scope")
- EvidenceScope = per-evidence source metadata
- Legacy keys preserved for backward compatibility
```

---

### 4. Pending Enhancement Recommendations → STATUS/Backlog.md

**Source:** `ARCHIVE/UCM_Enhancement_Recommendations.md`

**Review Status:** Many items marked "COMPLETE" in the sprint (2026-01-31).

**Items to Check:**
| Item | Document Status | Actual Status |
|------|-----------------|---------------|
| Toast Notifications | COMPLETE | ✅ Verified - react-hot-toast in use |
| Config Diff View | COMPLETE | Needs verification |
| Active Config Dashboard | COMPLETE | Needs verification |
| Keyboard Shortcuts | COMPLETE | Needs verification |

**Action:**
1. Verify which enhancements are actually implemented
2. Move any pending items to `STATUS/Backlog.md` with priority
3. Archive the rest

---

### 5. Feature Documentation (v2.2) → Verify in Overview.md

**Source:** `ARCHIVE/EVOLUTION.md`

**Content:** v2.2.0 features (Article Verdict, Two-Panel Summary, Claim Highlighting)

**Action:**
1. Verify these features are documented in `ARCHITECTURE/Overview.md`
2. If missing, add component descriptions
3. Archive EVOLUTION.md (historical versioning doc)

**Verification Checklist:**
- [ ] Article Verdict Problem documented
- [ ] Central vs Supporting Claims documented
- [ ] Two-Panel Summary component documented
- [ ] Claim Highlighting (UN-17) documented

---

### 6. Final Implementation Review → STATUS/HISTORY.md

**Source:** `ARCHIVE/REVIEWS/UCM_Terminology_Implementation_Review_Final.md`

**Valuable Content:**
- Implementation quality rating (9.5/10)
- Key strengths identified
- Minor issues found

**Action:** Add a brief entry to `STATUS/HISTORY.md` referencing this review:
```markdown
### 2026-02-02: UCM + Terminology Implementation Review
- **Rating:** 9.5/10
- **Reviewer:** Claude Opus 4.5
- **Key Findings:** [Brief summary]
- **Full Review:** See ARCHIVE/REVIEWS/UCM_Terminology_Implementation_Review_Final.md
```

---

## Documents to Keep in Archive (No Action Needed)

These documents are appropriately archived as historical records:

### Historical Review Chains
- `Source_Reliability_Service_*.md` (8 files) - SR implementation review chain
- `sequential-llm-refinement-review.md` - Historical proposal review
- `LLM_Delegation_Proposal_Text_Analysis.md` - Completed proposal
- `LLM_Text_Analysis_Pipeline_Deep_Analysis.md` - Completed analysis

### Completed Implementation Plans
- `External_Prompt_File_System_Plan.md` - Implemented
- `Prompt_Import_Export_Plan.md` - Implemented
- `Hardcoded_Heuristics_UCM_Migration_Plan.md` - Implemented
- `Unified_Configuration_Management_Plan.md` - Implemented

### Historical Status/Changelogs
- `STATUS/Changelog_v2.6.38_to_v2.6.40.md` - Historical
- `STATUS/Changelog_v2.6.41_Unified_Config.md` - Historical
- `STATUS/Documentation_Inconsistencies.md` - Resolved

### Workshop/Bug Reports
- `WORKSHOP_REPORT_2026-01-21.md` - Historical workshop notes
- `Mermaid_Fix_Summary.md` - Bug fix record
- `Bolsonaro_*.md` - Bug investigation records

### Superseded Proposals
- `Terminology_Migration_*.md` files - Superseded by current terminology docs

---

## Implementation Order

1. **High Priority - Reference Material:**
   - Merge Terminology Catalog → TERMINOLOGY.md
   - Merge Claim Filtering Defense → Evidence_Quality_Filtering.md

2. **Medium Priority - User Guides:**
   - Add UCM Quick Reference → Unified_Config_Management.md

3. **Low Priority - Status Updates:**
   - Verify EVOLUTION.md features in Overview.md
   - Add history entry for implementation review
   - Review and triage UCM enhancement recommendations

---

## After Merge Actions

1. Update `ARCHIVE/README_ARCHIVE.md` to note which documents had content extracted
2. Add cross-references from merged content back to archived originals
3. Consider adding "Archived" watermark/note to extracted documents

---

## Estimated Effort

| Task | Effort |
|------|--------|
| Claim Filtering Implementation Prompt → archive + extract config docs | 20 min |
| Terminology Catalog merge | 30 min |
| Claim Filtering Defense merge | 45 min |
| UCM Quick Reference | 20 min |
| EVOLUTION.md verification | 15 min |
| History entry | 10 min |
| Enhancement triage | 30 min |
| **Total** | **~2.8 hours** |
