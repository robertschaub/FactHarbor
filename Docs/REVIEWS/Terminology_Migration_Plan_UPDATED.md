# Terminology Migration Plan - UPDATED 2026-01-28

**Status**: Phase 0 complete, Phase 1 in progress
**Coordinator**: Multi-agent effort (Claude Sonnet 4.5 + GPT 5.2 High)
**Foundation documents**:
- `Docs/REVIEWS/Terminology_Audit_Fact_Entity.md` (original audit + phased approach)
- `Docs/REVIEWS/Terminology_Audit_Evidence_Entity_Proposal.md` (entity model + probative rule)

---

## Executive Summary

**Problem**: The codebase uses `ExtractedFact` terminology, but these are unverified evidence items, not facts. This creates semantic confusion and subtle quality risks.

**Solution**: Four-phase migration from "Fact" to "Evidence" terminology:
- **Phase 0** (COMPLETE): Documentation fixes
- **Phase 1** (IN PROGRESS): Code comments + UI labels
- **Phase 2** (PLANNED): TypeScript aliases + gradual migration
- **Phase 3** (PLANNED @ v3.0): Full rename with backward compatibility

**New additions** (from GPT 5.2 High proposal):
- Formal Evidence entity model (EvidenceItem + EvidenceClaimLink)
- Probative value rule: "0 evidence must not be used"
- Two-layer enforcement strategy (prompt + deterministic filter)

**⚠️ IMPORTANT - Risk Analysis Complete**:
A comprehensive risk assessment has identified **12 critical risks** and **8 opportunities** in the execution of this plan. **Before proceeding with Phase 1 completion, review the risk analysis document**:

📋 **[Terminology_Migration_RISK_ANALYSIS.md](Terminology_Migration_RISK_ANALYSIS.md)**

**Key Findings from Risk Analysis**:
- 🚨 **HIGH RISK**: Category rename coordination (R1) - mitigated via dual parsing
- 🚨 **HIGH RISK**: EvidenceClaimLink migration path unclear (R6) - estimate revised to 15-20 days
- ⚠️ **MEDIUM RISK**: Uncommitted changes (R3) - **MUST commit GPT 5.2 High's work immediately**
- 🚀 **4 Immediate Actions** identified (32 minutes total) - low risk, high value
- 📊 **Revised Execution Order** with explicit phase gates and validation
- ✅ **8/12 Risks** resolved or mitigated

**Immediate Action Required** (before continuing Phase 1):
1. Commit GPT 5.2 High's uncommitted changes (3 files)
2. Add optional `probativeValue` and `extractionConfidence` fields
3. Enable dual category parsing (`"evidence"` + `"direct_evidence"`)
4. Add EvidenceScope field clarification comments

See risk analysis document for complete details and revised timeline.

---

## Phase 0: Documentation ✅ COMPLETE

### Completed Deliverables

1. **xWiki Architecture Document** (`Docs/FactHarbor POC1 Architecture Analysis.xwiki`)
   - ✅ Both ERDs now use `EVIDENCE` entity name consistently
   - ✅ Renamed field `fact` → `statement` in both ERDs
   - ✅ Changed category `"evidence"` → `"direct_evidence"`
   - ✅ Changed `supportingFactIds` → `supportingEvidenceIds`
   - ✅ Added terminology info box at document top

2. **XAR Exports** (`Docs/xwiki-export/`)
   - ✅ Delta XAR: `FactHarbor-POC1-Architecture-Terminology-Fix.xar` (9.1 KB)
   - ✅ Full XAR: `FactHarbor-Full-Export-v2.6.17.xar` (350.6 KB, 98 pages)
   - ✅ Import instructions in README.md

3. **Audit Extension** (`Docs/REVIEWS/Terminology_Audit_Fact_Entity.md`)
   - ✅ Added Section 2.2: Documentation Inconsistency (xWiki)
   - ✅ Updated status to reflect Phase 0 completion

4. **Git Repository**
   - ✅ Committed Phase 0 changes
   - ✅ .gitignore aligned (only .xar packages tracked)

---

## Phase 1: Code Comments + UI Labels 🔄 IN PROGRESS

### Objective
Add clarifying comments and update user-facing labels WITHOUT changing code structure or breaking compatibility.

### Completed (by GPT 5.2 High)

#### A. Type Definitions (`apps/web/src/lib/analyzer/types.ts`)
- ✅ Added comprehensive JSDoc to `ExtractedFact` interface:
  ```typescript
  /**
   * Extracted evidence item from a source (legacy name: `ExtractedFact`).
   * Despite the name, this is NOT a verified fact...
   */
  ```
- ✅ Added field-level comment to `fact: string`:
  ```typescript
  /**
   * The extracted statement text (legacy field name: `fact`).
   * This represents an unverified evidence statement from a source.
   */
  ```
- ✅ Added comment to `ClaimVerdict.supportingFactIds`:
  ```typescript
  /**
   * IDs of supporting evidence items (legacy field name: `supportingFactIds`).
   * These point into the analysis `facts[]` array...
   */
  ```

#### B. Prompt Text Updates (`apps/web/src/lib/analyzer/orchestrated.ts`)
- ✅ Changed terminology comments from "per-fact" → "per-evidence-item"
- ✅ Changed section headers:
  - `FACTS (evidence):` → `EVIDENCE (unverified extracted statements):`
  - `FACTS DISCOVERED DURING RESEARCH:` → `EVIDENCE DISCOVERED DURING RESEARCH (unverified extracted statements):`
  - `## FACTS` → `## EVIDENCE (UNVERIFIED EXTRACTED STATEMENTS)`
- ✅ Updated instructions:
  - `Facts in the FACTS section` → `Evidence items in the EVIDENCE section`
  - References to "facts" → "evidence items" throughout counter-evidence handling

#### C. UI Labels (`apps/web/src/app/jobs/[id]/page.tsx`)
- ✅ Stats panel: `"Facts Extracted"` → `"Evidence Extracted"`
- ✅ Component comment: `Facts Panel` → `Evidence Panel (legacy field name: facts)`
- ✅ Display text: `"more background facts"` → `"more background items"`

### Remaining Phase 1 Tasks

#### D. Additional Prompt Files (7-10 files)
Files that likely contain "fact" terminology to be updated with clarifying comments:
- [ ] `apps/web/src/lib/analyzer/prompts/extract-facts-base.ts`
- [ ] `apps/web/src/lib/analyzer/prompts/` (other prompt templates)
- [ ] `apps/web/src/lib/analyzer/monolithic-canonical.ts`
- [ ] `apps/web/src/lib/analyzer/monolithic-dynamic.ts`
- [ ] `apps/web/src/lib/analyzer/scopes.ts`
- [ ] `apps/web/src/lib/analyzer/quality-gates.ts`
- [ ] `apps/web/src/lib/analyzer/verdict-corrections.ts`

**Action**: Search for prompt text and comments containing "fact" terminology, add "(legacy field name)" notes where appropriate.

#### E. UI Component Comments (`apps/web/src/app/jobs/[id]/page.tsx`)
Remaining UI rendering functions:
- [ ] `renderFactCard()` - add comment: "(legacy function name, renders evidence item)"
- [ ] `renderFactList()` - add comment: "(legacy function name, renders evidence list)"
- [ ] CSS class comments in the render logic explaining `factItem*` and `factStat*` classes

#### F. Regression Report Diagrams (`Docs/REVIEWS/Orchestrated_Report_Quality_Regression_Analysis.md`)
Update Mermaid diagrams to use "Evidence" terminology:
- [ ] Change `Facts[ExtractedFact_List]` → `Evidence[ExtractedEvidence_List]`
- [ ] Change `EvidenceScope_PerFactMetadata` → `EvidenceScope_PerItemMetadata`
- [ ] Change `Facts_JSON with EvidenceScope per fact` → `Evidence_JSON with EvidenceScope per item`
- [ ] Add legacy field name notes where needed

#### G. Schema Comments (`apps/web/src/lib/analyzer/monolithic-canonical.ts`)
- [ ] Add comment to `FactExtractionSchema`:
  ```typescript
  /**
   * Legacy schema name: FactExtractionSchema
   * Extracts evidence items (unverified statements) from sources.
   */
  ```

### Phase 1 Verification Checklist
- [ ] All prompt text uses "Evidence" or "Evidence items" for user-facing labels
- [ ] All code comments clarify "(legacy field name)" where "fact" persists
- [ ] UI labels use "Evidence" terminology
- [ ] No breaking changes to JSON field names or TypeScript interfaces
- [ ] Regression report diagrams updated

### Estimated Effort
**Remaining**: 8-12 hours (search, comment, verify)

---

## Phase 2: TypeScript Aliases + Gradual Migration 📋 PLANNED

### Objective
Introduce new TypeScript names while maintaining backward compatibility via type aliases.

### Approach (Option B from Audit)

#### A. Create Type Aliases (`apps/web/src/lib/analyzer/types.ts`)
```typescript
/**
 * Extracted evidence item from a source.
 * See detailed field descriptions in the EvidenceItem interface.
 */
export interface EvidenceItem {
  id: string;
  /**
   * The extracted statement text.
   * Represents an unverified evidence statement from a source.
   */
  statement: string;  // Future: migrate from `fact`
  category: "legal_provision" | "direct_evidence" | "expert_quote" | "statistic" | "event" | "criticism";
  specificity: "high" | "medium" | "low";  // Note: consider adding "low"
  source: {
    id: string;
    url: string;
    title: string;
    excerpt: string;
  };
  evidenceScope?: EvidenceScope;
  contextId?: string;
  thesisDirection?: "supports" | "contradicts" | "neutral";  // Future: rename from claimDirection
  fromOppositeClaimSearch?: boolean;
  isContestedClaim?: boolean;
  claimSource?: string;
  // Future: add probative?: { score: number; reason?: string }
}

/**
 * @deprecated Use EvidenceItem instead.
 * Legacy type alias for backward compatibility.
 */
export type ExtractedFact = EvidenceItem & {
  fact: string;  // Alias for statement field
  claimDirection?: "supports" | "contradicts" | "neutral";  // Alias for thesisDirection
};
```

#### B. Gradual Function Migration Strategy
1. **New feature work**: Use `EvidenceItem` type
2. **Existing functions**: Keep `ExtractedFact` until natural refactor opportunity
3. **Hybrid approach**: Functions can accept both types via union or overload

#### C. UI Function Aliases (`apps/web/src/app/jobs/[id]/page.tsx`)
```typescript
/**
 * Renders an evidence item card.
 * @deprecated Use renderEvidenceCard (legacy name: renderFactCard)
 */
const renderFactCard = (item: ExtractedFact) => { /* ... */ };

// New function name (same implementation initially)
const renderEvidenceCard = renderFactCard;
```

#### D. Evidence-Claim Link Entity (Optional - Deferred)
Per the proposal document, introduce `EvidenceClaimLink` for future normalization:
```typescript
/**
 * Links an evidence item to a specific claim with directional support.
 * (Not yet implemented in storage; currently inferred from supportingFactIds)
 */
export interface EvidenceClaimLink {
  claimId: string;
  evidenceId: string;
  supportsClaim: number;  // [-1, +1]
  strength: number;       // [0, 1]
  contestingEvidenceIds?: string[];
  rationale?: string;
}
```

### Phase 2 Migration Priorities
1. **High Priority**: New LLM prompt engineering code
2. **Medium Priority**: Quality gates and validation logic
3. **Low Priority**: UI rendering (continue using renderFactCard with alias)
4. **Deferred**: Full evidence-claim link implementation

### Phase 2 Verification
- [ ] Type aliases compile without errors
- [ ] Old code continues working with `ExtractedFact`
- [ ] New code can use `EvidenceItem` type
- [ ] No runtime behavior changes
- [ ] IDE provides deprecation warnings for old names

### Estimated Effort
**Initial setup**: 4-6 hours
**Gradual migration**: Spread over 2-3 months as new features are added

---

## Phase 3: Full Rename + Backward Compatibility 🎯 PLANNED @ v3.0

### Objective
Complete the terminology migration with a clean break, handling backward compatibility for stored data.

### Approach (Option A from Audit)

#### A. Breaking Changes
```typescript
// Remove ExtractedFact type alias
// Rename all occurrences to EvidenceItem

export interface EvidenceItem {
  id: string;
  statement: string;  // No longer `fact`
  // ... rest of fields with new names
}
```

#### B. JSON Field Name Migration
Two strategies (choose one):

**Strategy 1: Dual field support (safer)**
```typescript
// Parser accepts both old and new field names
{
  statement: json.statement || json.fact,  // Try new name first
  thesisDirection: json.thesisDirection || json.claimDirection
}
```

**Strategy 2: Database migration script (cleaner)**
```sql
-- Update all stored job results
UPDATE jobs
SET result_json = json_set(
  result_json,
  '$.facts[*].statement',
  json_extract(result_json, '$.facts[*].fact')
)
WHERE result_json IS NOT NULL;
```

#### C. API Version Handling
If external consumers exist:
- Version the API endpoint: `/api/v3/jobs/{id}`
- v2 endpoint returns old field names (adapter layer)
- v3 endpoint returns new field names

#### D. UI Migration
- Rename CSS classes: `factItem*` → `evidenceItem*`
- Rename functions: `renderFactCard` → `renderEvidenceCard` (remove alias)
- Update all display text

### Phase 3 Prerequisites
- [ ] Phase 2 complete (all new code using EvidenceItem)
- [ ] Backward compatibility strategy chosen
- [ ] Database migration script tested
- [ ] Release notes prepared
- [ ] User communication about v3.0 breaking changes

### Phase 3 Verification
- [ ] All TypeScript types use Evidence terminology
- [ ] All JSON field names use Evidence terminology
- [ ] Old job results still parse correctly
- [ ] UI uses Evidence terminology throughout
- [ ] API versioning works (if applicable)
- [ ] No references to "Fact" except in deprecation notes

### Estimated Effort
**Implementation**: 12-16 hours
**Testing**: 8-12 hours
**Total**: 3-4 days

---

## NEW: Probative Value Enforcement 🚨 HIGH PRIORITY

### Background
From `Terminology_Audit_Evidence_Entity_Proposal.md`:
> Evidence items with probative value ~0 should NOT be used by the system.

### Problem
Current implementation may treat any extracted item as "some evidence exists", even when:
- Too vague to be actionable
- Missing meaningful provenance (no excerpt)
- Pure meta-commentary ("debate exists") without concrete content
- Duplicates of other items

### Two-Layer Enforcement Strategy

#### Layer 1: Prompt-Side Enforcement (IMMEDIATE)
Update extraction prompts to explicitly require minimum quality:

**File**: `apps/web/src/lib/analyzer/prompts/extract-facts-base.ts` (and similar)

**Add to instructions**:
```
MINIMUM EVIDENCE QUALITY REQUIREMENTS:
- Each extracted item must contain a concrete assertion (not just sentiment)
- Include a source excerpt that supports the extracted statement
- Include enough specificity to be used for reasoning
- Do NOT emit vague or purely rhetorical items
- Do NOT emit items just to reach extraction quotas

OMIT items that:
- Are too vague or non-falsifiable
- Lack actionable provenance
- Are obvious duplicates of other items
- Are purely meta-commentary without concrete content
```

#### Layer 2: Deterministic Post-Process Filter (FOLLOW-UP)
Create a filter function to catch low-quality items the LLM still emits.

**New file**: `apps/web/src/lib/analyzer/evidence-filter.ts`

```typescript
export interface ProbativeFilterResult {
  kept: ExtractedFact[];
  dropped: Array<{
    item: ExtractedFact;
    reason: "missing_excerpt" | "too_vague" | "duplicate" | "irrelevant";
  }>;
  stats: {
    totalExtracted: number;
    kept: number;
    dropped: number;
    dropReasonCounts: Record<string, number>;
  };
}

/**
 * Filters extracted evidence by probative value.
 * Removes items that fail minimum usability criteria.
 */
export function filterEvidenceByProbativeValue(
  items: ExtractedFact[],
  options?: {
    minStatementLength?: number;       // Default: 20
    requireExcerpt?: boolean;          // Default: true
    minExcerptLength?: number;         // Default: 30
    deduplicationThreshold?: number;   // Similarity [0,1], default: 0.9
  }
): ProbativeFilterResult {
  // Implementation:
  // 1. Check statement length
  // 2. Check excerpt presence and length
  // 3. Check for near-duplicates (simple string similarity)
  // 4. Log dropped items with reasons
  // 5. Return kept items + statistics
}
```

**Integration point**: `apps/web/src/lib/analyzer/orchestrated.ts`

```typescript
// After extractFacts() call
const rawFacts = await extractFacts(...);
const filterResult = filterEvidenceByProbativeValue(rawFacts);

// Log for transparency
console.log(`Evidence filtering: kept ${filterResult.stats.kept}/${filterResult.stats.totalExtracted}`);
console.log(`Drop reasons:`, filterResult.stats.dropReasonCounts);

// Use filtered facts
state.facts = filterResult.kept;
```

### Probative Value Enforcement Tasks

#### Immediate (Phase 1.5)
- [ ] Update extraction prompt instructions (Layer 1)
- [ ] Test with a known low-quality source to verify LLM compliance

#### Follow-up (Phase 2)
- [ ] Implement `filterEvidenceByProbativeValue()` function (Layer 2)
- [ ] Add structured logging for dropped items
- [ ] Create UI indicator for filtered evidence counts
- [ ] Add admin dashboard showing drop statistics

### Verification
- [ ] Test with vague/low-quality sources
- [ ] Verify meaningful evidence is kept
- [ ] Verify junk items are dropped
- [ ] Logging shows why items were dropped
- [ ] No false positives (legitimate evidence dropped)

### Estimated Effort
**Prompt updates**: 2-3 hours
**Filter implementation**: 6-8 hours
**Testing**: 4-6 hours
**Total**: 12-17 hours

---

## Timeline and Sequencing

**⚠️ NOTE**: This timeline has been revised based on risk analysis. See [Terminology_Migration_RISK_ANALYSIS.md](Terminology_Migration_RISK_ANALYSIS.md) for detailed execution order and risk mitigation steps.

### **IMMEDIATE** (Today - 32 minutes)
0. **🚨 CRITICAL**: Commit GPT 5.2 High's uncommitted changes (3 files)
1. **🚀 Quick Win**: Add optional quality fields (`probativeValue`, `extractionConfidence`)
2. **🚀 Quick Win**: Enable dual category parsing (`"evidence"` + `"direct_evidence"`)
3. **🚀 Quick Win**: Add EvidenceScope field clarification comments

**Status**: Not started - **requires immediate action before Phase 1 completion**

### Phase 1 Completion (Next 1-2 days, 6-8 hours)
4. ✅ Phase 0: Documentation (COMPLETE)
5. 🔄 Phase 1: Complete remaining code comments and UI labels
   - Additional prompt files (7-10 files)
   - UI component comments
   - Regression report diagram updates
   - Schema comments

**Phase 1 Gate**: All terminology updated, no TODOs, git committed

### Phase 1.5: Risk Mitigation (Next 3-5 days, 10-13 hours)
6. 🚨 Probative value enforcement - Layer 1 (prompt updates)
7. 🚨 claimDirection validation telemetry
8. 📊 Measure current quality baselines (validation)
9. 🔄 Category rename preparation (update prompts)

**Phase 1.5 Gate**: Baselines measured, probative value working, category prompts tested

### Short Term (Phase 2.0: 1 week core work)
10. Phase 2: TypeScript aliases setup (4-6 hours)
11. Phase 1.5: Probative value enforcement - Layer 2 (filter implementation, 8-10 hours)
12. Simple EvidenceScope clustering (3-4 hours)
13. Add `sourceType` to EvidenceScope (12-16 hours, split into 4 sub-phases)

**Phase 2.0 Gate**: Probative filter validated (FP <5%), sourceType populated (>70%)

### Medium Term (Phase 2.1: 1-2 months gradual)
14. Gradual migration: Use EvidenceItem in new code as features are added
15. Category value monitoring: Track % using "direct_evidence"

### Long Term (v3.0 release, 3-6 months)
16. Phase 2: Majority of codebase migrated to EvidenceItem
17. Phase 3: EvidenceClaimLink implementation (**REVISED**: 15-20 days, not 5-10)
18. Phase 3: Full rename + backward compatibility handling (12-16 hours)
19. Phase 3: Remove legacy category value "evidence" (1 hour)

---

## Risk Management

**📋 DETAILED RISK ANALYSIS**: See [Terminology_Migration_RISK_ANALYSIS.md](Terminology_Migration_RISK_ANALYSIS.md) for comprehensive risk assessment with 12 identified risks, mitigation strategies, and revised execution order.

### Risk Summary (12 Risks Identified)

#### ✅ Resolved/Mitigated (8 risks)
- **R1 (HIGH)**: Category rename coordination → Mitigated via dual parsing support
- **R2 (MEDIUM)**: claimDirection optional→required → Mitigated via telemetry-first approach
- **R3 (MEDIUM)**: Uncommitted changes conflict → **Action required: Commit immediately**
- **R4 (LOW)**: probativeValue schema timing → Clarified: Add as optional in Phase 1.5
- **R7 (MEDIUM)**: Phase boundary dependencies → Mitigated via explicit phase gates
- **R8 (LOW)**: No baseline measurements → Resolved: Measure in Phase 1.5
- **R10 (MEDIUM)**: Probative filter false positives → Mitigated via validation gate (FP <5%)
- **R11 (MEDIUM)**: Multi-agent coordination → Resolved: Clear ownership assigned

#### 🔄 Planned/In Progress (4 risks)
- **R5 (MEDIUM)**: EvidenceScope sourceType prompts → Planned: Split into 4 sub-phases
- **R6 (HIGH)**: EvidenceClaimLink migration unclear → **Revised estimate: 15-20 days** (was 5-10)
- **R9 (LOW)**: Vague phrase detection complexity → Deferred to Phase 2.2 (experimental)
- **R12 (LOW)**: Regression report scope unknown → Planned: Audit task in Phase 1

**Risk Mitigation Rate**: 67% (8/12 resolved or mitigated)

### Risk by Phase

#### Low Risk (Immediate - Today)
- ✅ Commit uncommitted changes (R3 resolution)
- ✅ Add optional fields (R4 resolution)
- ✅ Dual category parsing (R1 mitigation)
- ✅ EvidenceScope comments (documentation only)

#### Medium Risk (Phase 1-1.5, Testing Required)
- ⚠️ claimDirection telemetry (R2 mitigation)
- ⚠️ Category prompt updates (R1 mitigation)
- ⚠️ Probative value filter (R10 mitigation with validation gate)
- ⚠️ Baseline measurements (R8 resolution, measurement only)

#### High Risk (Phase 2-3, Requires Planning)
- 🚨 EvidenceScope sourceType prompt engineering (R5, split into 4 sub-phases)
- 🚨 EvidenceClaimLink implementation (R6, 15-20 days with detailed sub-tasks)
- 🚨 JSON field name changes (Phase 3)
- 🚨 Database migration (Phase 3)

### Key Mitigation Strategies

1. **Dual Parsing**: Accept both old and new values during transition (category, field names)
2. **Explicit Phase Gates**: No phase starts until previous phase validation passes
3. **Telemetry Before Enforcement**: Log issues before making breaking changes
4. **Validation Gates**: Test on representative jobs before broader rollout
5. **Revised Estimates**: Realistic timelines based on complexity analysis (R6: 15-20 days)
6. **Clear Ownership**: Designated agent/team for each phase

---

## Success Metrics

### Phase 1 Success
- [ ] Zero "Fact" references in user-facing text
- [ ] All code has clarifying comments
- [ ] Developers understand the terminology distinction

### Phase 2 Success
- [ ] New code uses EvidenceItem type
- [ ] No compilation errors
- [ ] IDE shows deprecation warnings for old names
- [ ] Low-quality evidence is filtered out (probative rule)

### Phase 3 Success
- [ ] Codebase uses "Evidence" terminology consistently
- [ ] Old job results still parse
- [ ] Clean separation between "extracted evidence" and "verified facts"
- [ ] User documentation reflects correct terminology

---

## Open Questions

1. **EvidenceItem vs Evidence**: Should the TypeScript type be `EvidenceItem` or just `Evidence`?
   - Recommendation: `EvidenceItem` (more specific, avoids confusion with the abstract concept)

2. **Probative score explicit field**: Should we add `probative: { score: number; reason?: string }` to the schema?
   - Recommendation: Not initially - use deterministic filter first, add LLM-scored probative field later if needed

3. **EvidenceClaimLink storage**: Should we normalize claim-evidence edges in the database?
   - Recommendation: Defer until v3.0+ - current `supportingFactIds` is sufficient for POC1/POC2

4. **Statement vs Text**: Should the field be named `statement` or `text`?
   - Recommendation: `statement` (matches xWiki documentation and is more semantically specific)

5. **Specificity levels**: Should we expand `specificity` to include `"low"`?
   - Recommendation: Yes, in Phase 2 - helpful for downstream filtering and weighting

---

## References

- **Original Audit**: `Docs/REVIEWS/Terminology_Audit_Fact_Entity.md`
- **Entity Proposal**: `Docs/REVIEWS/Terminology_Audit_Evidence_Entity_Proposal.md`
- **xWiki Documentation**: `Docs/FactHarbor POC1 Architecture Analysis.xwiki`
- **XAR Exports**: `Docs/xwiki-export/` (delta and full packages)

---

**Plan Version**: 1.2
**Last Updated**: 2026-01-28 (Risk Analysis Added)
**Next Review**: After Phase 1.5 completion
**Risk Analysis**: See `Terminology_Migration_RISK_ANALYSIS.md` for detailed risk assessment and revised execution order

---

## ARCHITECTURAL REVIEW: Evidence Entity & Related Entities

**Reviewer**: Claude Opus 4.5 (Senior Software Architect)
**Date**: 2026-01-28
**Scope**: Deep analysis of Evidence entity (ExtractedFact), EvidenceScope, Claim, Source, and pipeline integration

---

### Executive Summary

After thorough codebase exploration, I confirm the migration plan is well-designed and addresses real architectural concerns. However, I've identified several **additional considerations** and **future-proofing opportunities** that should be incorporated, particularly around `EvidenceScope` which is currently underutilized relative to its potential for real-world evidence documentation.

**Key Findings**:
1. ✅ Current `ExtractedFact` → `EvidenceItem` migration path is sound
2. ⚠️ `EvidenceScope` is underutilized - only captures methodology boundaries, not broader evidence provenance
3. ⚠️ The `supportingFactIds` link is unidirectional and lacks strength/direction metadata
4. 🔮 Future opportunity: `EvidenceScope` could hold rich metadata from studies, fact-check reports, observation reports

---

### Review Summary (TL;DR)

#### Confirmed Strengths
- The `ExtractedFact` → `EvidenceItem` migration path is well-designed
- Current pipeline correctly uses `claimDirection` and `EvidenceScope` for verdict generation
- LLM prompts already use "Evidence" terminology correctly
- Clear separation between `AnalysisContext` (analytical frames) and `EvidenceScope` (source methodology)

#### Key Architectural Recommendations

| # | Recommendation | Phase | Risk |
|---|----------------|-------|------|
| 1 | **EvidenceScope Evolution** - Extend to capture richer provenance metadata (study metadata, fact-check metadata, legal metadata) | Phase 3+ | Low |
| 2 | **Category Rename** - Change `"evidence"` → `"direct_evidence"` to avoid tautology with `EvidenceItem` | Phase 2 | Medium |
| 3 | **EvidenceClaimLink** - Add per-link strength/direction metadata to replace flat `supportingFactIds` | Phase 3 | Medium |
| 4 | **Probative Filter** - Add category-specific thresholds (stats need longer excerpts, quotes need attribution) | Phase 2 | Low |
| 5 | **EvidenceScope.sourceType** - Add simple `sourceType` field as stepping stone to rich metadata | Phase 2 | Low |

#### Risk Assessment Updates

| Item | Original Risk | Revised Risk | Reason |
|------|---------------|--------------|--------|
| Category "evidence" → "direct_evidence" | Not listed | **Medium** | Affects LLM output parsing, stored JSON |
| EvidenceScope extension | Not listed | **Low** | Optional fields, backward compatible |
| EvidenceClaimLink | Low | **Medium** | Requires schema changes, affects verdict logic |
| Probative filter | Medium | **Low** | Post-process only, no schema changes |

#### Immediate Action Items
1. Complete remaining Phase 1 comment/label updates
2. Implement probative value prompt instructions (Layer 1)
3. Add clarifying comments to `EvidenceScope.geographic` and `EvidenceScope.temporal` fields

---

### 1. Current Entity Relationships (Code Analysis)

#### 1.1 ExtractedFact (Evidence Entity) - [types.ts:352-385](apps/web/src/lib/analyzer/types.ts#L352-L385)

**Current Structure**:
```typescript
interface ExtractedFact {
  id: string;
  fact: string;                    // The extracted statement (legacy name)
  category: "legal_provision" | "evidence" | "expert_quote" | "statistic" | "event" | "criticism";
  specificity: "high" | "medium";  // Missing "low" - correctly excluded from extraction
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceExcerpt: string;
  contextId?: string;              // Links to AnalysisContext
  claimDirection?: "supports" | "contradicts" | "neutral";  // Thesis-level direction
  fromOppositeClaimSearch?: boolean;
  evidenceScope?: EvidenceScope;   // Per-fact source methodology
  isContestedClaim?: boolean;
  claimSource?: string;
}
```

**Assessment**: Well-designed for current needs. The `claimDirection` field (v2.6.29) is crucial for proper verdict aggregation. The `evidenceScope` optional field enables methodology-aware comparisons.

#### 1.2 EvidenceScope - [types.ts:194-200](apps/web/src/lib/analyzer/types.ts#L194-L200)

**Current Structure**:
```typescript
interface EvidenceScope {
  name: string;           // Short label (e.g., "WTW", "TTW", "EU-LCA")
  methodology?: string;   // Standard referenced (e.g., "ISO 14040")
  boundaries?: string;    // What's included/excluded
  geographic?: string;    // Geographic scope
  temporal?: string;      // Time period
}
```

**Assessment**: Currently focused ONLY on analytical boundaries (methodology/geography/time). This is correct for preventing apples-to-oranges comparisons, but **misses an opportunity** to capture richer evidence provenance metadata.

#### 1.3 ClaimVerdict - [types.ts:405-444](apps/web/src/lib/analyzer/types.ts#L405-L444)

**Critical Link**: `supportingFactIds: string[]`

```typescript
interface ClaimVerdict {
  claimId: string;
  verdict: number;           // 0-100 truth percentage
  confidence: number;
  supportingFactIds: string[];  // Links to ExtractedFact IDs
  isCounterClaim?: boolean;     // v2.6.31: Inverts aggregation logic
  // ... other fields
}
```

**Assessment**: The `supportingFactIds` linkage is functional but lacks:
- Per-link strength (how strongly does this evidence support?)
- Per-link direction (the array name implies "supporting" but may include refuting evidence)
- Rationale (why was this evidence selected?)

This is acknowledged in the `EvidenceClaimLink` proposal (Section 4.3 of Evidence_Entity_Proposal.md).

#### 1.4 FetchedSource - [types.ts:387-399](apps/web/src/lib/analyzer/types.ts#L387-L399)

```typescript
interface FetchedSource {
  id: string;
  url: string;
  title: string;
  trackRecordScore: number | null;      // Source reliability 0-1
  trackRecordConfidence?: number | null;
  trackRecordConsensus?: boolean | null;
  fullText: string;
  fetchedAt: string;
  category: string;
  fetchSuccess: boolean;
  searchQuery?: string;
}
```

**Assessment**: Good design. The `trackRecordScore` enables evidence weighting by source reliability (implemented in `applyEvidenceWeighting()`).

---

### 2. Pipeline Flow Analysis

#### 2.1 Evidence Extraction Flow

**Location**: [orchestrated.ts](apps/web/src/lib/analyzer/orchestrated.ts)

```
Source → extractFacts() → filterFactsByProvenance() → state.facts[]
                ↓
        [LLM extracts with EvidenceScope, claimDirection]
```

**Observations**:
1. ✅ EvidenceScope is extracted when the LLM detects significant analytical boundaries
2. ✅ `claimDirection` is assessed for every fact (supports/contradicts/neutral)
3. ✅ Provenance validation filters out facts without real sources (Ground Realism gate)
4. ⚠️ No probative value filtering exists yet (proposed in Phase 1.5)

#### 2.2 Verdict Generation Flow

**Key Function**: `generateVerdicts()` → formats facts with direction labels

```typescript
// From orchestrated.ts (approximate lines 6138-6156)
const factsFormatted = factsForVerdicts.map((f: ExtractedFact) => {
  let factLine = `[${f.id}]`;
  if (f.contextId) factLine += ` (${f.contextId})`;
  if (f.claimDirection === "contradicts") {
    factLine += ` [COUNTER-EVIDENCE]`;
  } else if (f.claimDirection === "supports") {
    factLine += ` [SUPPORTING]`;
  }
  factLine += ` ${f.fact} (Source: ${f.sourceTitle})`;
  // EvidenceScope metadata is also appended when present
  return factLine;
});
```

**Assessment**: The LLM sees evidence labeled with direction and EvidenceScope, enabling proper verdict reasoning.

#### 2.3 LLM Prompt Alignment

**Extract Facts Prompt** ([extract-facts-base.ts](apps/web/src/lib/analyzer/prompts/base/extract-facts-base.ts)):
- ✅ Uses "Evidence" terminology correctly
- ✅ Instructs selective EvidenceScope extraction (only significant boundaries)
- ✅ Requires claimDirection assessment for every item

**Verdict Prompt** ([verdict-base.ts](apps/web/src/lib/analyzer/prompts/base/verdict-base.ts)):
- ✅ Uses "EvidenceScope" terminology
- ✅ Instructs compatibility checking between scopes
- ✅ Explains SUPPORTING vs COUNTER-EVIDENCE labels

---

### 3. Architectural Recommendations

#### 3.1 EvidenceScope Evolution (Future Enhancement)

**Current State**: EvidenceScope captures only analytical boundaries (methodology/geography/time).

**Opportunity**: Real-world evidence sources often provide richer provenance metadata that could significantly improve verdict quality:

| Source Type | Additional Metadata |
|-------------|---------------------|
| **Peer-reviewed studies** | Sample size, confidence intervals, funding source, peer review status, replication status |
| **Fact-check reports** | Verdict from original fact-checker, sources cited, methodology used |
| **Government reports** | Issuing agency, report classification, statutory basis |
| **Court documents** | Case number, jurisdiction, appeal status, binding authority level |
| **News articles** | Publication date, reporter expertise, editorial standards |

**Proposed Extended EvidenceScope** (for Phase 3+):

```typescript
interface EvidenceScope {
  // Current fields (keep)
  name: string;
  methodology?: string;
  boundaries?: string;
  geographic?: string;
  temporal?: string;

  // NEW: Source provenance metadata
  sourceType?: "study" | "fact_check" | "government" | "legal" | "news" | "expert" | "other";

  // For studies
  studyMetadata?: {
    sampleSize?: number;
    confidenceLevel?: number;      // e.g., 0.95 for 95% CI
    peerReviewed?: boolean;
    replicationStatus?: "replicated" | "not_replicated" | "unknown";
    fundingSource?: string;
    publicationVenue?: string;     // Journal name, conference
  };

  // For fact-check reports
  factCheckMetadata?: {
    originalVerdict?: string;      // e.g., "Mostly False"
    factChecker?: string;          // e.g., "Snopes", "PolitiFact"
    checkDate?: string;
    sourcesCount?: number;
  };

  // For legal documents
  legalMetadata?: {
    caseNumber?: string;
    jurisdiction?: string;
    bindingAuthority?: "binding" | "persuasive" | "none";
    appealStatus?: "final" | "pending_appeal" | "reversed";
  };

  // Generic quality indicators
  qualityIndicators?: {
    primarySource?: boolean;       // Is this a primary vs secondary source?
    dateAccuracy?: "exact" | "approximate" | "unknown";
    editorialStandards?: "high" | "medium" | "low" | "unknown";
  };
}
```

**Why This Matters**:
1. **Verdict confidence**: A fact from a replicated peer-reviewed study with n=10,000 should carry more weight than a single news article
2. **Contradiction resolution**: When two sources conflict, provenance metadata helps determine which to trust
3. **Transparency**: Users can understand WHY a verdict was reached based on source quality

**Implementation Path**:
- Phase 1: No changes (current EvidenceScope is sufficient for boundary detection)
- Phase 2: Add `sourceType` field (low risk, optional)
- Phase 3+: Add specialized metadata objects based on actual usage patterns

#### 3.2 Evidence → Claim Linkage (EvidenceClaimLink)

**Current State**: `supportingFactIds: string[]` is a flat array without metadata.

**Problem**: The array name implies "supporting" but actually contains ALL relevant evidence including counter-evidence. The LLM must re-interpret direction from fact content.

**Recommended Enhancement** (aligned with proposal doc):

```typescript
interface EvidenceClaimLink {
  claimId: string;
  evidenceId: string;
  supportsClaim: number;           // [-1, +1] direction and strength
  relevanceScore: number;          // [0, 1] how relevant to this specific claim
  rationale?: string;              // Brief explanation of why this evidence matters
}
```

**Implementation Path**:
- Phase 2: Keep `supportingFactIds` but add optional `evidenceLinks?: EvidenceClaimLink[]`
- Phase 3: Migrate fully to `evidenceLinks`, deprecate `supportingFactIds`

#### 3.3 Probative Value Enforcement (Validate Existing Proposal)

**Assessment of Proposed Approach**: The two-layer strategy (prompt + deterministic filter) is correct.

**Additional Recommendation**: The deterministic filter should also consider:

```typescript
interface ProbativeFilterConfig {
  // Current proposed
  minStatementLength: number;      // Default: 20
  requireExcerpt: boolean;         // Default: true
  minExcerptLength: number;        // Default: 30
  deduplicationThreshold: number;  // Default: 0.9

  // Additional recommendations
  requireSourceUrl: boolean;       // Default: true (prevent fabricated sources)
  maxVaguenessScore: number;       // LLM-scored vagueness 0-1, drop if > threshold
  dropMetaCommentary: boolean;     // Default: true (filter "debate exists" without content)

  // Category-specific thresholds
  categoryMinimums: {
    statistic: { minExcerptLength: 50 };    // Stats need more context
    expert_quote: { requireAttribution: true }; // Quotes need named expert
    event: { requireDate: boolean };         // Events should have temporal anchor
  };
}
```

---

### 4. Category Field: Evidence vs Evidence

**Current Issue**: The `category` field includes `"evidence"` as one option:

```typescript
category: "legal_provision" | "evidence" | "expert_quote" | "statistic" | "event" | "criticism";
```

This creates semantic confusion when we rename `ExtractedFact` to `EvidenceItem` — an `EvidenceItem` with `category: "evidence"` is tautological.

**Recommendation**: In Phase 2, rename the category value:

```typescript
// Phase 2
category: "legal_provision" | "direct_evidence" | "expert_quote" | "statistic" | "event" | "criticism";
//                            ^^^^^^^^^^^^^^^^
//                            Changed from "evidence"
```

This aligns with the xWiki documentation fix already made in Phase 0.

---

### 5. AnalysisContext vs EvidenceScope Clarity

**Current State**: The terminology block in [types.ts:98-126](apps/web/src/lib/analyzer/types.ts#L98-L126) clearly distinguishes:
- **AnalysisContext**: Top-level bounded analytical frame (e.g., different legal cases)
- **EvidenceScope**: Per-fact source methodology metadata (e.g., WTW vs TTW)

**Assessment**: ✅ Well-documented. The distinction is critical and correctly maintained throughout the codebase.

**Potential Confusion Point**: Both can have `geographic` and `temporal` fields:
- `AnalysisContext.metadata.geographic`: The jurisdiction being analyzed
- `EvidenceScope.geographic`: The geographic scope of a specific source's data

**Recommendation**: Add a clarifying comment in Phase 1:

```typescript
// In EvidenceScope interface:
geographic?: string;  // Geographic scope OF THE SOURCE'S DATA (not the analysis jurisdiction)
temporal?: string;    // Time period OF THE SOURCE'S DATA (not the analysis timeframe)
```

---

### 6. Integration Checklist for Phase 2

When implementing Phase 2 (TypeScript aliases), ensure these touchpoints are updated:

| Component | File | Action |
|-----------|------|--------|
| Type definition | `types.ts` | Add `EvidenceItem` interface, alias `ExtractedFact` |
| Extraction schema | `orchestrated.ts` | Update Zod schema comments |
| Prompt builder | `extract-facts-base.ts` | Already uses "Evidence" ✅ |
| Verdict prompt | `verdict-base.ts` | Already uses "EvidenceScope" ✅ |
| Quality gates | `quality-gates.ts` | Update function parameter types |
| Provenance filter | `provenance-validation.ts` | Update type references |
| Scope detection | `scopes.ts` | Update comments only |
| UI rendering | `page.tsx` | Add function aliases |
| Aggregation | `aggregation.ts` | Update type references |

---

### 7. Risk Assessment Update

Based on code analysis, I recommend adjusting risk levels:

| Item | Original Risk | Revised Risk | Reason |
|------|---------------|--------------|--------|
| Category "evidence" → "direct_evidence" | Not listed | **Medium** | Affects LLM output parsing, stored JSON |
| EvidenceScope extension | Not listed | **Low** | Optional fields, backward compatible |
| EvidenceClaimLink | Low | **Medium** | Requires schema changes, affects verdict logic |
| Probative filter | Medium | **Low** | Post-process only, no schema changes |

---

### 8. Open Questions (Updated)

**Original questions** (answers confirmed):

1. **EvidenceItem vs Evidence**: Use `EvidenceItem` ✅ (avoids confusion with abstract concept)
2. **Probative score explicit field**: Defer to filter first ✅ (correct approach)
3. **EvidenceClaimLink storage**: Defer to v3.0+ ✅ (current `supportingFactIds` sufficient)
4. **Statement vs Text**: Use `statement` ✅ (matches documentation)
5. **Specificity levels**: Add `"low"` in Phase 2 ✅ (for downstream filtering)

**New questions for team discussion**:

6. **EvidenceScope extension timing**: Should rich provenance metadata (study metadata, fact-check metadata) be added in Phase 2 or deferred to Phase 3+?
   - Recommendation: Add `sourceType` field in Phase 2 (low risk), defer rich metadata to Phase 3+

7. **Category rename coordination**: Should `"evidence"` → `"direct_evidence"` be done in Phase 2 (with alias support) or Phase 3 (breaking change)?
   - Recommendation: Phase 2 with dual parsing support (accept both values)

8. **EvidenceClaimLink adoption**: Should we implement the full `EvidenceClaimLink` model, or continue with enhanced `supportingFactIds` plus optional metadata?
   - Recommendation: Hybrid approach in Phase 2, full model in Phase 3

---

### 9. Conclusion

The terminology migration plan is architecturally sound and addresses the core semantic confusion between "facts" (implies truth) and "evidence" (implies material to be evaluated).

**Immediate priorities** (Phase 1):
- Complete remaining comment/label updates
- Implement probative value prompt instructions (Layer 1)

**Near-term enhancements** (Phase 2):
- TypeScript aliases as documented
- Add `sourceType` to EvidenceScope
- Rename category `"evidence"` → `"direct_evidence"` with backward compat
- Implement probative value filter (Layer 2)

**Future considerations** (Phase 3+):
- Rich EvidenceScope metadata for different source types
- Full EvidenceClaimLink model implementation
- Complete terminology migration with JSON field renames

The codebase is well-structured for this migration, with clear type definitions and good separation of concerns between AnalysisContext (analytical frames) and EvidenceScope (source methodology).

---

---

## DESIGN IMPROVEMENT PROPOSAL: Evidence-Centric Report Quality Enhancement

**Author**: Claude Opus 4.5 (Senior Software Architect)
**Date**: 2026-01-28
**Goal**: Significant improvement in report quality through Evidence entity enhancements

---

### 10. Cross-System Analysis: Where Evidence Impacts Report Quality

After comprehensive codebase and documentation review, I've identified the key points where Evidence entity design directly affects final report quality. This section provides a unified view of how the proposed improvements will flow through the system.

#### 10.1 Evidence Quality Chain

```
Source → Evidence Extraction → Evidence Filtering → Evidence-Claim Linking → Verdict Generation → Report
                ↓                      ↓                      ↓                      ↓
         [EvidenceScope]      [Probative Filter]    [EvidenceClaimLink]     [Source Reliability]
                ↓                      ↓                      ↓                      ↓
         (methodology)        (quality gate)        (direction/strength)     (weight adjustment)
```

**Current gaps identified**:
1. **No probative filter** - Low-quality evidence can pollute verdicts
2. **Flat supportingFactIds** - Loses direction and strength information
3. **Limited EvidenceScope** - Only captures methodology, not broader provenance
4. **No Evidence-Claim strength** - All evidence weighted equally per claim

#### 10.2 Report Quality Bottlenecks (from Regression Analysis)

| Bottleneck | Root Cause | Evidence Entity Fix |
|------------|------------|---------------------|
| Weak verdicts | Low-quality evidence pollutes LLM reasoning | **Probative filter** (Layer 2) |
| Wrong direction | Counter-evidence not properly labeled | **claimDirection field** (already exists, needs enforcement) |
| "Contested" false positives | Keyword-based detection | **EvidenceClaimLink with counterEvidenceFactIds** |
| Low-confidence verdicts | Unknown source reliability | **EvidenceScope.sourceType** for better weighting |
| Context confusion | EvidenceScope not used in context detection | **Better EvidenceScope → AnalysisContext flow** |

---

### 11. Improved Evidence Entity Design

#### 11.1 Enhanced EvidenceItem (Phase 2)

```typescript
/**
 * EvidenceItem - Extracted evidence from a source (replacing ExtractedFact)
 *
 * CRITICAL: This is NOT a verified fact. It is material to be evaluated.
 * The name "EvidenceItem" clarifies this semantic distinction.
 */
export interface EvidenceItem {
  // === Identity ===
  id: string;                              // "E1", "E2", etc. (changing from "F1")

  // === Content ===
  statement: string;                       // The extracted statement (renamed from "fact")
  category: EvidenceCategory;              // Type of evidence
  specificity: "high" | "medium" | "low";  // Adding "low" for filtering

  // === Source Linkage ===
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceExcerpt: string;                   // Original text context

  // === Analysis Frame Linkage ===
  contextId?: string;                      // Links to AnalysisContext

  // === Thesis Direction (v2.6.29+) ===
  claimDirection: "supports" | "contradicts" | "neutral";  // REQUIRED, not optional
  fromOppositeClaimSearch?: boolean;       // Provenance tracking

  // === Source Methodology (Enhanced) ===
  evidenceScope?: EvidenceScope;           // Per-evidence source methodology

  // === Contested Status ===
  isContestedClaim?: boolean;
  claimSource?: string;

  // === NEW: Quality Indicators (Phase 2) ===
  probativeValue?: "high" | "medium" | "low";  // LLM-assessed during extraction
  extractionConfidence?: number;               // 0-100, how confident in extraction
}

type EvidenceCategory =
  | "legal_provision"
  | "direct_evidence"    // Renamed from "evidence"
  | "expert_quote"
  | "statistic"
  | "event"
  | "criticism";
```

#### 11.2 Enhanced EvidenceScope (Phased)

**Phase 2 Addition** (low risk):

```typescript
export interface EvidenceScope {
  // Current fields (unchanged)
  name: string;
  methodology?: string;
  boundaries?: string;
  geographic?: string;      // Clarified: scope OF THE SOURCE'S DATA
  temporal?: string;        // Clarified: time period OF THE SOURCE'S DATA

  // NEW Phase 2: Source type classification
  sourceType?: SourceType;
}

type SourceType =
  | "peer_reviewed_study"
  | "fact_check_report"
  | "government_report"
  | "legal_document"
  | "news_primary"        // Original reporting
  | "news_secondary"      // Wire service / aggregation
  | "expert_statement"
  | "organization_report"
  | "other";
```

**Phase 3+ Addition** (richer provenance):

```typescript
export interface EvidenceScope {
  // ... Phase 2 fields ...

  // Phase 3+: Rich provenance metadata (optional sub-objects)
  studyMetadata?: StudyMetadata;
  factCheckMetadata?: FactCheckMetadata;
  legalMetadata?: LegalMetadata;
  qualityIndicators?: QualityIndicators;
}

interface StudyMetadata {
  sampleSize?: number;
  confidenceLevel?: number;        // e.g., 0.95
  peerReviewed?: boolean;
  replicationStatus?: "replicated" | "not_replicated" | "contested" | "unknown";
  fundingSource?: string;
  publicationVenue?: string;
  publicationDate?: string;
}

interface FactCheckMetadata {
  factChecker?: string;            // "Snopes", "PolitiFact", "CORRECTIV", etc.
  originalVerdict?: string;        // The fact-checker's own verdict
  checkDate?: string;
  sourcesCount?: number;
  methodology?: string;            // How they verified
}

interface LegalMetadata {
  caseNumber?: string;
  jurisdiction?: string;
  court?: string;
  bindingAuthority?: "binding" | "persuasive" | "none";
  appealStatus?: "final" | "pending_appeal" | "reversed" | "remanded";
  decisionDate?: string;
}

interface QualityIndicators {
  primarySource?: boolean;         // Primary vs secondary source
  dateAccuracy?: "exact" | "approximate" | "unknown";
  editorialStandards?: "high" | "medium" | "low" | "unknown";
  independentlyVerified?: boolean;
}
```

#### 11.3 Enhanced EvidenceClaimLink (Phase 3)

```typescript
/**
 * EvidenceClaimLink - Structured relationship between evidence and claims
 *
 * Replaces the flat supportingFactIds array with rich metadata.
 * This enables better aggregation and transparency.
 */
export interface EvidenceClaimLink {
  claimId: string;
  evidenceId: string;

  // Direction and strength
  direction: "supports" | "contradicts" | "contextual";
  strength: number;                // [0, 1] how strongly this evidence relates
  relevance: number;               // [0, 1] how relevant to THIS specific claim

  // Rationale (for transparency)
  rationale?: string;              // Brief explanation of why this evidence matters

  // Counter-evidence tracking (v2.8 improvement)
  isCounterEvidence?: boolean;     // Explicit flag for counter-evidence
  counterEvidenceType?: "factual" | "methodological" | "opinion";
}

// In ClaimVerdict:
export interface ClaimVerdict {
  // ... existing fields ...

  // Phase 2: Keep supportingFactIds for backward compat, add evidenceLinks
  supportingFactIds: string[];     // Legacy, kept for compatibility
  evidenceLinks?: EvidenceClaimLink[];  // NEW: Rich linkage (optional in Phase 2)

  // Phase 3: Migrate fully to evidenceLinks
  // supportingFactIds becomes deprecated alias
}
```

---

### 12. Two-Layer Probative Value Enforcement

#### 12.1 Layer 1: Prompt Instructions (Phase 1.5)

Add to `extract-facts-base.ts`:

```
## PROBATIVE VALUE REQUIREMENT

Only extract evidence items that have PROBATIVE VALUE for the analysis:

**DO extract**:
- Specific statements with verifiable content
- Statistics with source attribution
- Expert quotes with named experts
- Documented events with dates/locations
- Legal provisions with citations

**DO NOT extract**:
- Vague assertions ("some say", "many believe")
- Meta-commentary ("this is debated", "opinions vary")
- Statements without attributable source
- Redundant/duplicate information
- Predictions without supporting evidence

**For each item, assess:**
- probativeValue: "high" | "medium" | "low"
- Only return items rated "high" or "medium"
```

#### 12.2 Layer 2: Deterministic Filter (Phase 2)

```typescript
// In apps/web/src/lib/analyzer/evidence-filter.ts (new file)

export interface ProbativeFilterConfig {
  // Statement quality
  minStatementLength: number;           // Default: 20 characters
  maxVaguePhraseCount: number;          // Default: 2

  // Source linkage
  requireSourceExcerpt: boolean;        // Default: true
  minExcerptLength: number;             // Default: 30 characters
  requireSourceUrl: boolean;            // Default: true

  // Deduplication
  deduplicationThreshold: number;       // Default: 0.85 (semantic similarity)

  // Category-specific rules
  categoryRules: {
    statistic: { requireNumber: boolean; minExcerptLength: number };
    expert_quote: { requireAttribution: boolean };
    event: { requireTemporalAnchor: boolean };
    legal_provision: { requireCitation: boolean };
  };
}

export function filterByProbativeValue(
  evidence: EvidenceItem[],
  config: ProbativeFilterConfig
): { kept: EvidenceItem[]; filtered: EvidenceItem[]; stats: FilterStats } {
  // Implementation: deterministic post-LLM filter
}
```

#### 12.3 Vague Phrase Detection

```typescript
const VAGUE_PHRASES = [
  /\bsome\s+(say|believe|argue|claim)\b/i,
  /\bmany\s+(people|experts|critics)\b/i,
  /\bit\s+is\s+(said|believed|argued)\b/i,
  /\bopinions\s+(vary|differ)\b/i,
  /\bthe\s+debate\s+continues\b/i,
  /\bcontroversy\s+exists\b/i,
  /\ballegedly\b/i,
  /\breportedly\b/i,
  /\bpurportedly\b/i,
];

function countVaguePhrases(statement: string): number {
  return VAGUE_PHRASES.filter(p => p.test(statement)).length;
}
```

---

### 13. EvidenceScope → AnalysisContext Flow

#### 13.1 Current Gap

The `refineScopesFromEvidence()` function uses facts but doesn't fully leverage `EvidenceScope` metadata to detect when distinct AnalysisContexts are needed.

#### 13.2 Enhanced Flow

```typescript
// In refineScopesFromEvidence():

// 1. Cluster evidence by EvidenceScope patterns
const scopeClusters = clusterEvidenceByScope(facts);

// 2. For each cluster, check if it represents a distinct analytical frame
for (const cluster of scopeClusters) {
  const scopePattern = cluster.representativeScope;

  // Check: Is this scope incompatible with existing contexts?
  if (isIncompatibleScope(scopePattern, existingContexts)) {
    // Candidate for new AnalysisContext
    candidates.push({
      scopePattern,
      supportingEvidence: cluster.evidence,
      confidence: calculateContextConfidence(cluster)
    });
  }
}

// 3. Only create AnalysisContext if supported by evidence
for (const candidate of candidates) {
  if (candidate.supportingEvidence.length >= 1) {
    createOrMergeContext(candidate);
  }
}
```

#### 13.3 Incompatibility Detection (Principle-Based)

```typescript
function isIncompatibleScope(
  scope: EvidenceScope,
  contexts: AnalysisContext[]
): boolean {
  // THE SINGLE TEST (from Context_Detection_via_EvidenceScope.md):
  // "Would combining findings from this source with other sources be MISLEADING
  //  because they measure or analyze fundamentally different things?"

  for (const ctx of contexts) {
    // Check methodology incompatibility
    if (scope.methodology && ctx.methodology) {
      if (areMethodologiesIncompatible(scope.methodology, ctx.methodology)) {
        return true;
      }
    }

    // Check boundary incompatibility
    if (scope.boundaries && ctx.boundaries) {
      if (areBoundariesIncompatible(scope.boundaries, ctx.boundaries)) {
        return true;
      }
    }
  }

  return false;
}
```

---

### 14. Source Reliability Integration with EvidenceScope

#### 14.1 Current State

Source reliability (`trackRecordScore`) is evaluated per-domain but not connected to EvidenceScope metadata.

#### 14.2 Enhanced Integration

```typescript
// When evaluating source reliability, use EvidenceScope.sourceType for better calibration

function calibrateReliabilityBySourceType(
  baseScore: number,
  sourceType: SourceType | undefined
): number {
  if (!sourceType) return baseScore;

  // Source type can inform reliability expectations
  switch (sourceType) {
    case "peer_reviewed_study":
      // Higher expectation for academic rigor
      return baseScore; // Already well-calibrated by fact-checker lookup

    case "fact_check_report":
      // Fact-checkers from IFCN signatories get slight boost
      return Math.min(1, baseScore * 1.05);

    case "government_report":
      // Official but may have institutional bias
      return baseScore; // Neutral

    case "news_secondary":
      // Aggregation/wire service - slightly lower than primary
      return baseScore * 0.95;

    default:
      return baseScore;
  }
}
```

---

### 15. Verdict Weighting with Evidence Metadata

#### 15.1 Current Weighting

```typescript
// Current: All supporting evidence weighted equally
const avgWeight = sources.map(s => s.trackRecordScore).average();
adjustedTruth = 50 + (originalTruth - 50) * avgWeight;
```

#### 15.2 Enhanced Weighting (Phase 3)

```typescript
function calculateVerdictAdjustment(
  originalTruth: number,
  evidenceLinks: EvidenceClaimLink[],
  evidence: Map<string, EvidenceItem>,
  sources: Map<string, FetchedSource>
): number {
  let totalWeight = 0;
  let weightedTruth = 0;

  for (const link of evidenceLinks) {
    const ev = evidence.get(link.evidenceId);
    if (!ev) continue;

    const source = sources.get(ev.sourceId);
    const sourceReliability = source?.trackRecordScore ?? 0.5;

    // Weight factors:
    // 1. Source reliability (0-1)
    // 2. Link strength (0-1)
    // 3. Link relevance (0-1)
    // 4. EvidenceScope.sourceType calibration
    // 5. Evidence probativeValue

    const sourceTypeCalibration = calibrateReliabilityBySourceType(
      sourceReliability,
      ev.evidenceScope?.sourceType
    );

    const probativeMultiplier =
      ev.probativeValue === "high" ? 1.0 :
      ev.probativeValue === "medium" ? 0.8 : 0.5;

    const evidenceWeight =
      sourceTypeCalibration *
      link.strength *
      link.relevance *
      probativeMultiplier;

    // Direction-aware contribution
    const truthContribution = link.direction === "contradicts"
      ? 100 - originalTruth  // Counter-evidence inverts
      : originalTruth;

    weightedTruth += truthContribution * evidenceWeight;
    totalWeight += evidenceWeight;
  }

  if (totalWeight === 0) return originalTruth;

  return Math.round(weightedTruth / totalWeight);
}
```

---

### 16. Implementation Roadmap for Report Quality Improvement

#### Phase 1.5: Probative Value Prompt (1 day)

| Task | File | Risk |
|------|------|------|
| Add probative value extraction to schema | `orchestrated.ts` | Low |
| Add probative value instructions | `extract-facts-base.ts` | Low |
| Add probativeValue field to ExtractedFact | `types.ts` | Low |

**Expected Impact**: 10-20% reduction in low-quality evidence reaching verdicts

#### Phase 2: Evidence Entity Enhancements (3-5 days)

| Task | File | Risk |
|------|------|------|
| Add `sourceType` to EvidenceScope | `types.ts` | Low |
| Add `specificity: "low"` support | `types.ts`, schemas | Low |
| Add EvidenceItem alias | `types.ts` | Low |
| Implement probative filter (Layer 2) | New: `evidence-filter.ts` | Medium |
| Rename category `evidence` → `direct_evidence` | `types.ts`, prompts | Medium |
| Add optional `evidenceLinks` to ClaimVerdict | `types.ts` | Low |
| Enhance EvidenceScope → context flow | `orchestrated.ts` | Medium |

**Expected Impact**: 25-40% improvement in verdict accuracy for complex topics

#### Phase 3: Full Evidence-Centric Architecture (5-10 days)

| Task | File | Risk |
|------|------|------|
| Full EvidenceClaimLink model | `types.ts`, aggregation | High |
| Rich EvidenceScope metadata (study, legal, fact-check) | `types.ts`, prompts | Medium |
| Enhanced verdict weighting with all metadata | `aggregation.ts` | High |
| Migrate supportingFactIds → evidenceLinks | All verdict handling | High |
| JSON field renames (fact → statement, etc.) | All files | High |

**Expected Impact**: 40-60% improvement in report quality for evidence-heavy topics

---

### 17. Success Metrics

| Metric | Current Baseline | Phase 2 Target | Phase 3 Target |
|--------|------------------|----------------|----------------|
| Evidence quality (% high probative) | ~60% | >80% | >90% |
| Context detection accuracy | ~70% | >85% | >95% |
| Counter-evidence correctly labeled | ~65% | >80% | >90% |
| "Contested" false positive rate | ~20% | <10% | <5% |
| Verdict confidence (avg) | ~65% | >75% | >85% |

---

### 18. Dependencies and Coordination

This design improvement connects with several ongoing initiatives:

| Initiative | Document | Coordination Point |
|------------|----------|-------------------|
| Report Quality Regression | `Orchestrated_Report_Quality_Regression_Analysis.md` | Batch 3 (contested/doubted fix) uses EvidenceClaimLink |
| Context Detection | `Context_Detection_via_EvidenceScope.md` | EvidenceScope → AnalysisContext flow |
| Source Reliability | `Source_Reliability.md` | sourceType calibration integration |
| Calculations | `Calculations.md` | Enhanced verdict weighting formula |

---

### 19. Final Recommendation

**Implement in this order for maximum quality impact with minimum risk**:

1. **Immediate** (Phase 1.5): Probative value prompt instructions
2. **Near-term** (Phase 2): EvidenceScope.sourceType + probative filter + category rename
3. **Medium-term** (Phase 3): EvidenceClaimLink + rich provenance metadata

This phased approach ensures:
- Each phase delivers measurable quality improvement
- No single phase has high enough risk to destabilize the system
- Backward compatibility is maintained throughout
- Clear success metrics guide go/no-go decisions between phases

**The central insight**: Report quality is fundamentally limited by evidence quality. Investing in the Evidence entity model pays dividends across the entire pipeline - from extraction to weighting to verdict generation.
