# FactHarbor Status and Next Steps

**Date**: January 10, 2026
**Last Updated**: January 10, 2026 (Evening - v2.6.23 Input Neutrality Fix)
**Status**: Critical bug fix complete - Input neutrality resolved

---

## Executive Summary

**Current State**: v2.6.23 - Input neutrality bug FIXED. Question and statement forms now use identical normalized input for scope detection and research queries.

**Key Accomplishments** (January 10, 2026 - Session 3 - Evening):
- **🔥 CRITICAL FIX**: Input neutrality - `canonicalizeScopes()` now uses `analysisInput` (normalized statement) instead of original input
- **🔥 CRITICAL FIX**: Supplemental scope detection uses `analysisInput` throughout
- **✨ ENHANCEMENT**: Strengthened centrality heuristic with explicit NON-central examples and "0-2 central claims maximum" rule
- **✅ COMPLIANCE**: Removed domain-specific person names from recency detection (Generic by Design)
- **Schema Version**: Updated to 2.6.23

**Key Accomplishments** (January 10, 2026 - Session 2):
- **Enhanced Recency Detection**: Improved `isRecencySensitive()` with news-related keywords (trial, verdict, sentence, election, etc.)
- **Date-Aware Query Variants**: ALL search types now get date-specific queries when recency matters (not just evidence search)
- **ResearchDecision Enhancement**: Added `recencyMatters` flag to ensure consistent date filtering across all queries in a topic
- **Optional Gemini Grounded Search**: New `FH_SEARCH_MODE=grounded` option for using Gemini's built-in Google Search (when LLM_PROVIDER=gemini)
- **New Module**: Created `search-gemini-grounded.ts` for Gemini search integration
- **Schema Version**: Updated to 2.6.22

**Key Accomplishments** (January 10, 2026 - Session 1):
- **Generic AnalysisContext**: Replaced legal-specific `DistinctProceeding` with domain-agnostic `AnalysisContext` using flexible metadata
- **EvidenceScope**: Renamed `sourceScope` to `EvidenceScope` for capturing study methodology/boundaries
- **UI Enhancements**: Added contested badge and factor counts to single-scope question displays
- **Centrality Logic**: Enhanced prompt guidance with critical heuristic for identifying truly central claims
- **Quality Gates**: Reviewed thresholds (balanced, not too restrictive)

**Key Accomplishments** (January 9, 2026):
- **Scope/Context Extraction**: Added `sourceScope` field to ExtractedFact for capturing analytical context (WTW/TTW, methodology, boundaries, geographic, temporal)
- **Input Neutrality Fix**: Standardized verdict prompts to use neutral "STATEMENT" label instead of "QUESTION"/"INPUT" which was causing LLM verdict drift

**Key Accomplishments** (January 6-8, 2026):
- Fixed KeyFactors aggregation (preserved `keyFactorId` in `ClaimVerdict`)
- Added KeyFactors display to article mode reports
- Fixed evidence agreement bug (claim-specific criticism only)
- Fixed multiple schema/prompt mismatches
- Multi-proceeding detection fixes (supplemental context detection for statements)
- Temporal reasoning improvements (current date awareness)
- Claim deduplication for fair verdict aggregation

**Next Priority**: Implement metrics tracking and error pattern tracking (Phase 3).

---

## Completed Work

### Generic Architecture & Interface Redesign (January 10, 2026)

**AnalysisContext Interface**:
- Replaced legal-specific `DistinctProceeding` with domain-agnostic `AnalysisContext`
- Moved domain-specific fields (`court`, `jurisdiction`, `charges`) into flexible `metadata` object
- Works across all domains: legal, scientific, regulatory, temporal, geographic
- Updated all helper functions: `inferScopeTypeLabel()`, `detectInstitutionCode()`, `canonicalizeScopes()`
- Updated schemas: `ANALYSIS_CONTEXT_SCHEMA`, `UNDERSTANDING_SCHEMA_OPENAI`, `UNDERSTANDING_SCHEMA_LENIENT`
- Kept `DistinctProceeding` as deprecated type alias for backward compatibility

**EvidenceScope Interface**:
- Renamed `sourceScope` to `EvidenceScope` for clarity
- Captures methodology/boundaries of source documents (e.g., WTW vs TTW, EU vs US standards)
- Added to `ExtractedFact` interface as `evidenceScope` field
- Updated `FACT_SCHEMA` and extraction prompts

**Generic Prompts**:
- Updated multi-scope examples to cover legal, scientific, and regulatory domains
- Removed hardcoded domain-specific terminology (except in comments/metadata)
- Enhanced clarity on what constitutes a distinct scope vs. different perspectives

**UI Enhancements**:
- Added contested badge to `QuestionAnswerBanner` (single-scope questions)
- Added factor summary counts (positive/negative/neutral) to single-scope displays
- Aligned single-scope and multi-scope UI features

**Centrality Logic**:
- Enhanced prompt with "CRITICAL HEURISTIC": "If only ONE claim could be investigated, which would readers most want verified?"
- Clarified that centrality = "high" requires claim to be PRIMARY thesis AND would completely invalidate conclusion if false
- Excluded supporting evidence, attribution, source verification, and background context from "high" centrality

**Quality Gates**:
- Reviewed Gate 1 thresholds: Opinion ≤30%, Specificity ≥30% (appropriate)
- Reviewed Gate 4 thresholds: MEDIUM requires ≥2 sources, ≥60% quality/agreement (balanced)
- Confirmed central claims always pass gates (correct behavior)

### KeyFactors Implementation

**Architecture**:
- KeyFactors discovered during Understanding phase (schema at line 1938)
- KeyFactors are emergent and optional (no forced templates)
- Claim-to-factor mapping via `keyFactorId` (schema implemented)
- KeyFactors aggregated from claim verdicts (lines 4382-4422)
- KeyFactors appear in result JSON (line 4464)
- KeyFactors displayed in question mode reports (lines 4699-4711)
- KeyFactors displayed in article mode reports (lines 4742-4755, added Jan 6)

**Bug Fixes**:
- **KeyFactors Aggregation Fix** (January 6, 2026)
  - Added `keyFactorId?: string` to `ClaimVerdict` interface
  - Preserved `keyFactorId` in fallback verdict creation (line 4212)
  - Preserved `keyFactorId` in normal verdict creation (line 4256)
  - Preserved `keyFactorId` in multi-proceeding verdict creation (line 3604)
  - Files: `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer.ts`

### Quality Gates & Evidence

- **Evidence Agreement Bug Fixed** (January 6, 2026)
  - Gate 4 now only counts claim-specific criticism
  - Uses proceeding context or source-based filtering
  - Prevents unrelated criticism from penalizing verdicts
  - File: `apps/web/src/lib/analyzer/quality-gates.ts` (lines 372-389)

- Source reliability scale bug fixed (removed erroneous /100 division in Gate 4)

### Schema & Prompt Fixes

- FALSE verdict prompt/schema mismatch fixed (removed FALSE from prompt, using REFUTED only)
- Highlight colors normalized to 3-color UI system (`green | yellow | red`)
- Documented `FH_REPORT_STYLE=rich` and `FH_LLM_FALLBACKS` as NOT IMPLEMENTED

### Infrastructure

- Job status vocabulary unified (`QUEUED` standardized)
- Job lifecycle tests added
- Runner execution resilience with retry logic
- Quality Gates stats included in result JSON
- Analyzer partially modularized (modules created in `analyzer/`)

---

## Pending / Open Issues

### High Priority

#### 1. Input Neutrality Validation ⏳ TESTING REQUIRED (v2.6.23)

**Status**: Fix complete in v2.6.23, validation required.

**What Was Fixed**:
- `canonicalizeScopes()` now uses `analysisInput` (normalized statement) instead of original input (lines 3176, 3203)
- Supplemental scope detection fallback uses `analysisInput` instead of `trimmedInput` (line 3195)
- Centrality heuristic strengthened with explicit NON-central examples
- Domain-specific person names removed from recency detection

**Expected Impact**:
- Question vs statement verdict divergence: 4% → < 2%
- Central claims per analysis: ~5-8 → 1-2
- Recency detection: Still works via generic keywords (trial, sentence, etc.)

**Validation Required**:
1. Run both: "Was the Bolsonaro judgment fair?" and "The Bolsonaro judgment was fair"
2. Verify < 2% divergence in verdicts
3. Verify same scope IDs and research queries
4. Verify ≤ 2 claims marked as `isCentral: true`
5. Verify 27-year sentence still found

**See**: [`Docs/input-neutrality-fix-v2.6.23.md`](input-neutrality-fix-v2.6.23.md) for detailed fix documentation

---

#### 2. Metrics Tracking and Error Pattern Tracking (Phase 3)

**Status**: Requires database schema changes (C# backend).

**Required Changes**:
- Add `QualityMetric` table to track claim extraction rate, Gate 1/4 pass rates, LLM calls, processing time
- Add `ErrorPattern` table to track error categories, root causes, frequency
- Create API endpoints: `/api/quality-metrics` and `/api/error-patterns`
- Create admin dashboards: `/admin/quality` and `/admin/errors`

**Estimated Time**: 3-4 hours

#### 2. KeyFactors End-to-End Validation READY FOR TESTING

**Status**: Aggregation fix complete, validation needed to confirm it works.

**Action Required**:
1. Run complete analysis with procedural/legal topic
   - Example: "Was the Bolsonaro trial fair?"
   - Or: "Was the court decision impartial?"

2. Verify each stage:
   - [ ] Understanding phase output has `keyFactors` array
   - [ ] Claims have `keyFactorId` set correctly
   - [ ] Log shows: `"Key Factors aggregated: N factors from M discovered"` where N > 0
   - [ ] KeyFactors appear in result JSON with claim counts
   - [ ] KeyFactors appear in markdown report (both modes)
   - [ ] KeyFactors display in UI (if implemented)

**Success Criteria**:
- Log shows factors aggregated (not "0 factors from X discovered")
- KeyFactors appear in reports with explanations showing claim counts
- Factor verdicts reflect aggregated claim verdicts

**Estimated Time**: 1 hour (including analysis run time)

---

### Medium Priority

#### 2. Contestation Implementation (DEFERRED per Decision 1)

**Current Status**:  
- Contestation schema exists in KeyFactor interface
- `isContested`, `contestedBy`, `factualBasis` fields defined
- Contestation detection logic not fully implemented

**Decision**: Deferred until KeyFactors aggregation is validated (Decision 1: Option B)

**Future Work**:  
- Implement after validation confirms basic flow works
- Decide on detection approach (LLM analysis, evidence patterns, manual?)

---

### Low Priority

#### 3. `FH_ALLOW_MODEL_KNOWLEDGE=false` Not Respected

**Location**: `apps/web/src/lib/analyzer.ts:1837` (understanding prompt)

**Issue**: Understanding prompt instructs model to use background knowledge regardless of toggle.

**Action**: Update understanding prompt to respect the toggle and avoid using background knowledge when disabled.

**Priority**: Low - defer until KeyFactors are validated.

---

#### 4. Other Low Priority Issues

- **URL analyses highlight URL string, not fetched text**
  - Location: `apps/web/src/app/jobs/[id]/page.tsx`
  - Impact: Highlight view is misleading for URL input

- **`clampConfidence` test mismatch**
  - Tests expect clamp to 0-1 but implementation clamps to 0.1-1
  - Locations: `apps/web/src/lib/analyzer.ts:5075`, `apps/web/src/lib/analyzer.test.ts:7`
  - Impact: Tests fail if enabled

- **LLM fallback config documented but not implemented**
  - `FH_LLM_FALLBACKS` is described but unused in model selection
  - Locations: `LLM_REPORTING.md`, `apps/web/src/lib/analyzer/llm.ts`
  - Impact: Ops expectations will not match behavior

- **Search providers limited to Google CSE and SerpAPI**
  - Brave and Tavily are listed in architecture docs but not implemented in code
  - Locations: `apps/web/src/lib/web-search.ts`, `Docs/FactHarbor POC1 Architecture Analysis.md`
  - Impact: Switching guides should not imply Brave/Tavily support yet

- **`FH_REPORT_STYLE=rich` documented but not implemented**
  - Documented as NOT IMPLEMENTED in `LLM_REPORTING.md`
  - Location: `apps/web/src/lib/analyzer.ts:4401`
  - Impact: Configuration promises behavior that does not exist

---

## NEXT STEPs

### Immediate (This Session)

1. **Validate KeyFactors end-to-end** NEXT STEP
   - Run complete analysis with procedural topic
   - Verify each stage of KeyFactors flow
   - Check logs for correct aggregation
   - Verify KeyFactors in reports
   - Document results


---

## Decisions Made

### Decision 1: KeyFactors Contestation Priority DECIDED

**Decision**: **Option B** - Defer until KeyFactors aggregation is validated

**Rationale**: Validate basic flow first, then add contestation complexity.

**Action**: Contestation implementation deferred until after end-to-end validation.

---

### Decision 2: Multi-Proceeding KeyFactors DECIDED

**Decision**: **Option A** - Per-proceeding (each proceeding has its own factors)

**Rationale**: Each proceeding should have its own evaluation dimensions.

**Current Implementation**: Appears to be global (needs verification and update).

**Action Required**: 
- Verify current behavior with multi-proceeding analysis
- Update implementation to support per-proceeding KeyFactors if needed
- Test with multi-proceeding case

---

### Decision 3: Non-Procedural KeyFactors DECIDED

**Decision**: **Option A** - Actively test with non-procedural topics

**Rationale**: Validate that KeyFactors emerge correctly for diverse topics, not just procedural/legal.

**Action Required**:
- Test with medical topics (e.g., "Does vaccine X cause autism?")
- Test with scientific topics (e.g., "Is climate change caused by human activity?")
- Verify factors emerge appropriately for each topic type
- Document findings

---

## Updated Next Steps (Based on Decisions)

### Immediate (This Session)

1. **Validate KeyFactors end-to-end** NEXT STEP
   - Run complete analysis with procedural topic
   - Verify each stage of KeyFactors flow
   - Check logs for correct aggregation
   - Verify KeyFactors in reports
   - Document results

### Follow-Up (After Validation)

2. **Test multi-proceeding KeyFactors** (per Decision 2)
   - Run analysis with multiple proceedings
   - Verify each proceeding has its own factors
   - Update implementation if current behavior is global

3. **Test non-procedural KeyFactors** (per Decision 3)
   - Run analysis with medical topic
   - Run analysis with scientific topic
   - Verify factors emerge appropriately
   - Document findings

4. **Address contestation implementation** (per Decision 1 - deferred)
   - Implement after validation confirms basic flow works
   - Decide on detection approach (LLM analysis, evidence patterns, manual?)

5. **Fix `FH_ALLOW_MODEL_KNOWLEDGE=false`** (low priority)
   - Update understanding prompt to respect toggle
   - Centralize knowledge toggle across all steps (see [`LLM_and_Search_Provider_Switching_Guide.md`](./LLM_and_Search_Provider_Switching_Guide.md))

6. **Address low-priority issues** (as time permits)
   - URL highlighting fix (`apps/web/src/app/jobs/[id]/page.tsx`)
   - `clampConfidence` test mismatch fix
   - LLM fallback implementation (or remove documentation)
   - Provider-specific prompt optimization (see [`LLM_and_Search_Provider_Switching_Guide.md`](./LLM_and_Search_Provider_Switching_Guide.md))

---

## Status Summary

| Component | Status | Next Action |
|-----------|--------|-------------|
| Generic AnalysisContext | ✅ Complete | None |
| EvidenceScope | ✅ Complete | None |
| UI Enhancements (badges, counts) | ✅ Complete | None |
| Centrality Logic | ✅ Enhanced | None |
| Quality Gates | ✅ Reviewed | None |
| **Input Neutrality** | ✅ Fixed (v2.6.23) | Test with question/statement pairs |
| **Centrality Logic** | ✅ Enhanced (v2.6.23) | Validate ≤2 central claims per analysis |
| **Recency Detection** | ✅ Enhanced (v2.6.22), Genericized (v2.6.23) | Test with recent events |
| **Date-Aware Queries** | ✅ Complete (v2.6.22) | Test with Bolsonaro case |
| **Gemini Grounded Search** | ✅ Implemented (v2.6.22) | Test when LLM_PROVIDER=gemini |
| KeyFactors Discovery | Working | None |
| KeyFactors Aggregation | Fixed | **VALIDATE end-to-end** |
| KeyFactors Display | Working | Validate in reports |
| Evidence Agreement | Fixed | None |
| Metrics Tracking | ⏳ Pending | Implement Phase 3 |
| Error Pattern Tracking | ⏳ Pending | Implement Phase 3 |
| Contestation | Partial | Defer until validated (Decision 1) |
| Knowledge Toggle | Not Respected | Low priority fix (see LLM_and_Search_Provider_Switching_Guide.md) |
| Provider Optimization | Not Implemented | Future enhancement (see LLM_and_Search_Provider_Switching_Guide.md) |

---

## Implementation Notes

### Recency Detection & Date-Aware Queries (v2.6.22)

**Problem**: LLM was not finding very recent information (e.g., "Bolsonaro trial sentence was 27 years").

**Solution Applied**:
1. **Enhanced `isRecencySensitive()`** (line 510-567):
   - Added news-related keywords: trial, verdict, sentence, election, investigation, etc.
   - Detects legal/court outcomes, political events, announcements, investigations
   - Now triggers on any topic likely to have recent developments

2. **Date-Aware Query Variants** (throughout `decideNextResearch()`):
   - ALL search types now get date-specific queries when recency matters
   - Added `recencyMatters` flag to `ResearchDecision` interface
   - Consistent date filtering across all queries in a topic

3. **Search Execution Enhancement** (line 6613):
   - Uses `decision.recencyMatters` OR per-query detection
   - Ensures date filtering is consistent for the entire research session

**New Environment Variable**:
- `FH_SEARCH_MODE=grounded` - Use Gemini's built-in Google Search (when LLM_PROVIDER=gemini)

**Files Modified**:
- `apps/web/src/lib/analyzer.ts` - Enhanced recency detection and query generation
- `apps/web/src/lib/search-gemini-grounded.ts` - New module for Gemini grounded search
- `apps/web/src/lib/analyzer/config.ts` - Added `searchMode` config

---

### KeyFactors Aggregation Fix

**Problem**: `keyFactorId` from understanding phase was lost when creating claim verdicts.

**Solution Applied**:
1. Added `keyFactorId?: string` to `ClaimVerdict` interface
2. Preserved `claim.keyFactorId` when mapping from `understanding.subClaims` to `claimVerdicts`
3. Applied in all 3 verdict creation paths (fallback, normal, multi-proceeding)

**Files Modified**:
- `apps/web/src/lib/analyzer/types.ts` - Added field to interface
- `apps/web/src/lib/analyzer.ts` - Preserved in 3 code paths (lines 4212, 4256, 3604)

**Expected Result**: Aggregation should now find mapped claims. Log should show: `"Key Factors aggregated: N factors from M discovered"` where N > 0.

---

## Testing Checklist

**Recency Detection Validation (v2.6.22)**:
- [ ] Run analysis on "Bolsonaro trial sentence" - verify 27-year sentence is found
- [ ] Check logs for `[Search]` entries showing date-filtered queries (past year)
- [ ] Verify queries include current year (e.g., "bolsonaro sentence 2026 latest")
- [ ] Test with other recent events (elections, court rulings, announcements)
- [ ] Verify `recencyMatters` flag is set in research decisions for news topics

**Gemini Grounded Search Validation** (when LLM_PROVIDER=gemini):
- [ ] Set `FH_SEARCH_MODE=grounded` and `LLM_PROVIDER=gemini`
- [ ] Run analysis and verify "Gemini Grounded Search" appears in logs
- [ ] Verify sources are extracted from grounding metadata
- [ ] Compare results with standard search mode

**KeyFactors Validation**:
- [ ] Run analysis with procedural topic - verify KeyFactors appear in report
- [ ] Check log for: `"Key Factors aggregated: N factors from M discovered"` where N > 0
- [ ] Verify KeyFactors in result JSON have claim counts in explanations
- [ ] Verify KeyFactors appear in markdown report (both article and question modes)
- [ ] Run analysis with non-procedural topic - verify appropriate factors (or none)
- [ ] Verify article mode and question mode both display KeyFactors correctly

**Other Validation**:
- [ ] Check evidence agreement calculation - verify only claim-relevant criticism counted
- [ ] Verify Gate 4 confidence tiers are correct
- [ ] Verify source reliability scores are correct (0-1 scale)

---

## Related Documentation

- [`Agent_Handover.md`](./Agent_Handover.md) - Previous session summary
- [`KeyFactors-Design-Decision.md`](./KeyFactors-Design-Decision.md) - Architecture decisions and design rationale
- [`LLM_and_Search_Provider_Switching_Guide.md`](./LLM_and_Search_Provider_Switching_Guide.md) - LLM and search provider optimization guidance
- [`FactHarbor_Code_Spec_Review.md`](./FactHarbor_Code_Spec_Review.md) - Code review findings

---

## Status from Related Documents

### From [`KeyFactors-Design-Decision.md`](./KeyFactors-Design-Decision.md)

**Design Decisions** (All Implemented):
- KeyFactors are optional and emergent (not forced templates)
- KeyFactors discovered during Understanding phase
- Claim-to-factor mapping via `keyFactorId`
- Factor verdicts aggregate from claim verdicts

**Implementation Status**:
- KeyFactors discovered in Understanding phase
- Factors are emergent and optional
- Claim-to-factor mapping exists (`keyFactorId` in schema)
- KeyFactors aggregated from claim verdicts (fixed January 6, 2026)
- KeyFactors displayed in reports (both question and article modes)
- Contestation partially implemented (schema exists, detection logic incomplete - deferred per Decision 1)

**Remaining Work**:
- Validate end-to-end flow works correctly
- Complete contestation detection logic (after validation)
- Test with diverse topics (non-procedural, per Decision 3)
- Verify/update multi-proceeding support (per Decision 2)

---

### From [`LLM_and_Search_Provider_Switching_Guide.md`](./LLM_and_Search_Provider_Switching_Guide.md)

**Provider Optimization Status**:
- Provider-specific prompt variants - **Not implemented**
- JSON schema framing optimizations - **Not implemented**
- Provider-specific temperature/token configs - **Not implemented**
- Centralize knowledge toggle - **Not implemented** (affects all steps)

**Recommendations**:
- Implement provider-specific prompt variants for Gemini/Mistral
- Add strict JSON framing for providers with less reliable JSON output
- Centralize `FH_ALLOW_MODEL_KNOWLEDGE=false` to affect all steps

---

**Last Updated**: January 6, 2026  
**Next Review**: After KeyFactors end-to-end validation


