# FactHarbor Documentation Inconsistency Report

**Generated**: 2026-01-20  
**Purpose**: Comprehensive audit of inconsistencies between documentation (.md files), source code, and xWiki specification  
**Status**: ✅ RESOLVED (2026-01-20)

---

## Table of Contents

- [1. Critical Version Inconsistencies](#1-critical-version-inconsistencies)
- [2. Terminology Inconsistencies](#2-terminology-inconsistencies)
- [3. xWiki Specification vs Implementation Gaps](#3-xwiki-specification-vs-implementation-gaps)
- [4. Missing Referenced Files](#4-missing-referenced-files)
- [5. Feature Status Contradictions](#5-feature-status-contradictions)
- [6. Self-Contradictions Within Documents](#6-self-contradictions-within-documents)
- [7. Outdated Documentation Files](#7-outdated-documentation-files)
- [8. Recommended Fixes](#8-recommended-fixes)

---

## 1. Critical Version Inconsistencies

### 1.1 Schema Version Chaos

The codebase and documentation claim multiple conflicting version numbers:

| Source | Version Claimed | File Path |
|--------|-----------------|-----------|
| **Actual Code** | `"2.6.33"` | `apps/web/src/lib/analyzer/config.ts:99` |
| orchestrated.ts header | `@version 2.6.33` | `apps/web/src/lib/analyzer/orchestrated.ts:35` |
| analyzer.ts header | `@version 2.7.0` | `apps/web/src/lib/analyzer.ts:9` |
| metrics.ts hardcoded | `'2.6.33'` | `apps/web/src/lib/analyzer/metrics.ts:144` |
| AGENTS.md | v2.6.33 | `AGENTS.md:130` |
| Current_Status.md header | v2.6.33 (Code) \| 2.7.0 (Schema) | `Docs/STATUS/Current_Status.md:3` |
| Current_Status.md footer | v2.6.33 (Code) \| 2.7.0 (Schema) | `Docs/STATUS/Current_Status.md:425` |
| HISTORY.md | v2.6.33 | `Docs/STATUS/HISTORY.md:4` |
| Overview.md | v2.6.33 / Schema v2.7.0 | `Docs/ARCHITECTURE/Overview.md:3-4` |
| Calculations.md | v2.6.33 | `Docs/ARCHITECTURE/Calculations.md:3` |
| KeyFactors_Design.md | v2.6.33 | `Docs/ARCHITECTURE/KeyFactors_Design.md:4` |
| TERMINOLOGY.md | v2.6.33 | `Docs/REFERENCE/TERMINOLOGY.md:3` |
| Pipeline_TriplePath_Architecture.md | v2.6.33 | `Docs/ARCHITECTURE/Pipeline_TriplePath_Architecture.md:4` |
| Prompt_Architecture.md | v2.6.33 | `Docs/ARCHITECTURE/Prompt_Architecture.md:3` |
| KNOWN_ISSUES.md | v2.6.33 | `Docs/STATUS/KNOWN_ISSUES.md:4` |
| Improvement_Recommendations.md | v2.6.21 | `Docs/STATUS/Improvement_Recommendations.md:3` |
| EVOLUTION.md | v2.2.0 | `Docs/DEVELOPMENT/EVOLUTION.md:3` |

**Root Issue**: ✅ RESOLVED - All versions now aligned to `2.6.33`.

### 1.2 ERD Schema Version Outdated - ✅ RESOLVED

`Docs/ARCHITECTURE/Overview.md` ERD diagrams now show `schemaVersion "2.6.33"`.

### 1.3 v2.8.2 Configuration References

`Docs/STATUS/HISTORY.md` describes "Configuration Tuning for Better Analysis (v2.8.2)" with specific changes:
- `maxResearchIterations`: 2 → 4
- `maxTotalSources`: 8 → 12

Note: v2.8.x references in HISTORY.md describe planned/future features, not current implementation. Current code version is `2.6.33`.

---

## 2. Terminology Inconsistencies - ✅ BY DESIGN

### 2.1 Mixed Legacy/New Field Names in Code

The terminology uses new names for types/interfaces but legacy names for JSON fields (for backward compatibility):

| Concept | v2.7 Term (per Docs) | Legacy Term Still in Code | Location |
|---------|----------------------|---------------------------|----------|
| Multi-context flag | `hasMultipleContexts` | `hasMultipleProceedings` | `types.ts:431` |
| Context array | `analysisContexts` | `proceedings` | `types.ts:432` (ArticleAnalysis) |
| Target context ref | `contextId` | `targetProceedingId` | `types.ts:509-510` (ResearchDecision) |

### 2.2 Scope vs Context vs Proceeding

Different documents use different primary terms:

| Document | Primary Term Used |
|----------|-------------------|
| AGENTS.md | "Scope" |
| TERMINOLOGY.md | "AnalysisContext" (with "Scope" as alias) |
| types.ts interfaces | `AnalysisContext` type name |
| types.ts fields | Mixed: `contextId`, `relatedProceedingId`, `targetProceedingId` |

### 2.3 TERMINOLOGY.md Clarification - ✅ RESOLVED

TERMINOLOGY.md now documents that:
- Type/interface names use new terms (`AnalysisContext`, `EvidenceScope`)
- JSON field names retain legacy names for **backward compatibility** with stored data
- This is intentional design, not incomplete migration

---

## 3. xWiki Specification vs Implementation Gaps - ✅ DOCUMENTED

The xWiki exports contain the original POC specification with **implementation status notes**:
- **Current**: `Docs/FactHarbor_Spec_and_Impl_20.Jan.26.xar` (January 20, 2026)

**Status**: The xWiki spec correctly maintains the original specification design with `{{warning}}` blocks documenting where current implementation differs. This is intentional - the spec serves as both historical reference and target architecture for future versions.

### 3.0 xWiki Version Comparison (Jan 1 → Jan 20)

The core specification files are **identical** between versions. Changes:

**New pages added (now obsolete - already implemented):**
| Page | Status |
|------|--------|
| `Roadmap/Development Guidance/Source Reliability Bundle` | ✅ Already in `Docs/ARCHITECTURE/Source_Reliability.md` |
| `Roadmap/Zero-Cost Hosting Implementation Guide` | ✅ Already in `Docs/DEPLOYMENT/Zero_Cost_Hosting_Guide.md` |
| `Roadmap/Specification vs. Implementation Analysis 1.Jan.26` | ⚠️ Outdated analysis (references v2.6.17) |

**Removed pages (example content, not spec):**
- `FH Analysis Reports/` - Example analysis outputs
- `License and Disclaimer/` - License page

Several significant deviations exist between the xWiki specification and current implementation:

### 3.1 Verdict Scale Mismatch

**xWiki Specification (POC Requirements)**:
```
WELL-SUPPORTED / PARTIALLY SUPPORTED / UNCERTAIN / REFUTED
```

**Actual Implementation** (types.ts):
```typescript
"TRUE" | "MOSTLY-TRUE" | "LEANING-TRUE" | "MIXED" | "UNVERIFIED" | 
"LEANING-FALSE" | "MOSTLY-FALSE" | "FALSE"
```

The 4-point scale was expanded to a 7-point symmetric scale with MIXED/UNVERIFIED distinction.

### 3.2 Scenario Entity Rejected

**xWiki Specification**: Defines detailed `Scenario` entity with fields:
- `id`, `claim_id`, `description`, `assumptions`, `extracted_from`, `created_at`, `updated_at`
- One-to-many relationship with Claims

**Implementation Reality**: `KeyFactors_Design.md` explicitly states:
> "Scenario was rejected as a first-class entity (derivable from existing data)"

KeyFactors replaced Scenarios as the decomposition mechanism.

### 3.3 Quality Gates Numbering Mismatch

**xWiki Specification**:
| Gate | Purpose |
|------|---------|
| Gate 1 | Source Quality |
| Gate 2 | Contradiction Search |
| Gate 3 | Uncertainty Quantification |
| Gate 4 | Structural Integrity |

**Current Implementation**:
| Gate | Purpose |
|------|---------|
| Gate 1 | Claim Validation (filters opinions/predictions) |
| Gate 4 | Verdict Confidence Assessment |
| Gates 2-3 | Not implemented |

The gates have different purposes and Gates 2-3 are missing.

### 3.4 Data Model Not Normalized

**xWiki Specification**: Describes normalized PostgreSQL tables for:
- `Claim`, `Evidence`, `Source`, `Scenario`, `Verdict`, `User`, `Edit`, `Flag`, `QualityMetric`, `ErrorPattern`

**Current_Status.md** (line 163):
> "Normalized Data Model: ❌ Not implemented - All data stored as JSON blobs"

### 3.5 Cache Architecture Not Implemented

**xWiki Specification**: Describes Redis cache design:
- Key format: `claim:v1norm1:{language}:{sha256(canonical_claim)}`
- TTL: 90 days
- Canonicalization algorithm

**Current_Status.md** (line 162):
> "Claim Caching: ❌ Not implemented"

### 3.6 Input Type Definition

**types.ts**:
```typescript
export type InputType = "claim" | "article";
```

**xWiki and Documentation**: Mention detecting `question | statement | article` as input types.

The `question` type exists conceptually but not in the TypeScript type definition.

---

## 4. Missing Referenced Files - ✅ RESOLVED

All broken references have been removed:
- `Claim_Caching_Overview.md` reference removed from Overview.md
- `Separated_Architecture_Guide.md` references removed
- `ADR_001` references replaced with inline documentation notes

---

## 5. Feature Status Contradictions - ⚠️ ACKNOWLEDGED

### 5.1 Built But Not Integrated

`Current_Status.md` lists these as "BUILT BUT NOT INTEGRATED":
- Metrics Collection System
- Observability Dashboard (`/admin/metrics`)
- Baseline Test Suite
- A/B Testing Framework
- Schema Retry Logic
- Parallel Verdict Generation
- Tiered LLM Routing

`Docs/STATUS/HISTORY.md` section "v2.8.0" describes these as planned/future major changes. **Note**: v2.8.x in HISTORY.md represents planned future work, not current implementation (current: v2.6.33).

### 5.2 Working Features Section Outdated - ✅ RESOLVED

`Overview.md` Working Features section now shows "(v2.6.33)" matching the document header.

### 5.3 Prompt Optimization Validation Status

`HISTORY.md` line 538:
> "Status: ❌ NEVER VALIDATED - No A/B testing performed"

But the same document lists v2.8.0 as having "Shared Module Architecture" as an implemented major change.

---

## 6. Self-Contradictions Within Documents

### 6.1 Current_Status.md Version Conflict - ✅ RESOLVED

Header and footer now both show `2.6.33 (Code) | 2.7.0 (Schema Output)`.

### 6.2 Analyzer Line Count - ✅ RESOLVED

AGENTS.md Key Files table now lists modular analyzer structure:
- `orchestrated.ts` (~9000 lines)
- `monolithic-canonical.ts`
- `types.ts`
- `aggregation.ts`
- `scopes.ts`

---

## 7. Outdated Documentation Files

| File | Version | Status |
|------|---------|--------|
| `Docs/DEVELOPMENT/EVOLUTION.md` | v2.2.0 (December 2025) | Historical document - intentionally frozen at v2.2.0 (describes that release) |
| `Docs/STATUS/Improvement_Recommendations.md` | v2.6.21 | Recommendations still valid; version indicates analysis baseline |
| `Docs/REFERENCE/METRICS_SCHEMA.md` | v2.6.33 | ✅ Updated |

---

## 8. Recommended Fixes

### Priority 1: Version Alignment (Critical) - ✅ RESOLVED

1. **Canonical version decided**: `2.6.33`
   - Updated `config.ts` schemaVersion from `2.6.32` to `2.6.33`
   - Updated `metrics.ts` schemaVersion from `2.8.0` to `2.6.33`

2. **All version references updated** to 2.6.33:
   - Overview.md, Calculations.md, KeyFactors_Design.md, Pipeline_TriplePath_Architecture.md
   - Prompt_Architecture.md, TERMINOLOGY.md, LLM_Schema_Mapping.md, Provider_Prompt_Guidelines.md
   - Current_Status.md (header and footer now consistent), HISTORY.md

3. **ERD schema versions fixed** in `Overview.md` (changed `2.6.18` to `2.6.33`)

### Priority 2: Terminology Migration (High) - ✅ RESOLVED

4. **Terminology migration is INTENTIONALLY COMPLETE**
   - Type/interface names use new terms (`AnalysisContext`, `EvidenceScope`)
   - JSON field names retain legacy names (`hasMultipleProceedings`, `proceedings`, `targetProceedingId`) for **backward compatibility** with stored data and API consumers
   - This is documented in types.ts comments and TERMINOLOGY.md
   - **No code changes needed** - this is the intended final state

5. **Backward compatibility** ✅ Already preserved via comments in types.ts

### Priority 3: Documentation Cleanup (Medium) - ✅ RESOLVED

6. **References to non-existent files removed**:
   - `Claim_Caching_Overview.md` reference removed from Overview.md
   - `Separated_Architecture_Guide.md` references removed from Overview.md and Zero_Cost_Hosting_Guide.md
   - `ADR_001_Scope_Context_Terminology_Refactoring.md` references replaced with inline notes in TERMINOLOGY.md and LLM_Schema_Mapping.md

7. **Outdated docs**: Low priority - EVOLUTION.md and Improvement_Recommendations.md can be updated separately

8. **Self-contradictions in Current_Status.md fixed**:
   - Header and footer now both show `2.6.33 (Code) | 2.7.0 (Schema)`

### Priority 4: Spec Alignment Documentation (Low)

9. **Document spec deviations officially**
   - Create ADR explaining Scenario → KeyFactors decision
   - Document Quality Gate renumbering rationale
   - Note verdict scale expansion (4-point → 7-point)

10. **Update xWiki spec** or mark sections as superseded

---

## Appendix: Files Analyzed

### Source Code
- `apps/web/src/lib/analyzer/config.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/analyzer/orchestrated.ts`
- `apps/web/src/lib/analyzer/monolithic-canonical.ts`
- `apps/web/src/lib/analyzer/aggregation.ts`
- `apps/web/src/lib/analyzer/scopes.ts`
- `apps/web/src/lib/analyzer/metrics.ts`

### Documentation
- `AGENTS.md`
- `Docs/ARCHITECTURE/Overview.md`
- `Docs/ARCHITECTURE/Calculations.md`
- `Docs/ARCHITECTURE/KeyFactors_Design.md`
- `Docs/ARCHITECTURE/Pipeline_TriplePath_Architecture.md`
- `Docs/ARCHITECTURE/Prompt_Architecture.md`
- `Docs/ARCHITECTURE/Source_Reliability.md`
- `Docs/REFERENCE/TERMINOLOGY.md`
- `Docs/REFERENCE/LLM_Schema_Mapping.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/KNOWN_ISSUES.md`
- `Docs/STATUS/Improvement_Recommendations.md`
- `Docs/STATUS/HISTORY.md`
- `Docs/DEVELOPMENT/EVOLUTION.md`

### xWiki Specification
- `Docs/FactHarbor_Spec_and_Impl_20.Jan.26.xar` (current)
- `Docs/FactHarbor_Organisation_20.Jan.26.xar` (organisation subtree, separate)
  - `FactHarbor/Specification/POC/Specification.xml`
  - `FactHarbor/Specification/POC/Requirements.xml`
  - `FactHarbor/Specification/Data Model/WebHome.xml`

---

**Report Generated By**: Documentation Audit Process  
**Last Updated**: 2026-01-20  
**Fixes Applied**: 2026-01-20 (Priority 1, 2, 3 resolved)  
**Status**: Resolved - Version aligned to 2.6.33, terminology migration documented, missing file references removed
