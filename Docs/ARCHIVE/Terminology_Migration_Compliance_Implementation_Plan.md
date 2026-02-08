# Plan: Comprehensive Terminology Migration Compliance Audit & Update

## Context

After completing Phase 0-2.5 of the Terminology Migration (ExtractedFact → EvidenceItem), this plan ensures all supporting systems are aligned:
- Prompts and search terms use correct terminology
- Admin-editable configurations are in sync with code changes
- Tests cover new features (evidence-filter, probativeValue, sourceType)
- Code comments are accurate
- Agent hints/rules reference current entities
- Documentation is current, consistent, and properly cross-referenced

## Audit Findings Summary

### ✅ What's Working Well
- **Prompts**: extract-facts-base.ts has excellent Phase 1 terminology updates
- **Configs**: Admin panel properly references new types
- **Agent Rules**: AGENTS.md and extract-facts-base.ts have clear guidelines
- **Core Docs**: Migration docs (SUMMARY, PLAN, RISK_ANALYSIS) are current and excellent

### ❌ Critical Gaps Found (Original Audit)
1. **NO TEST FILE for evidence-filter.ts** - 309-line module with zero test coverage
2. **Test files use deprecated ExtractedFact** - 24 occurrences across 3 test files
3. **Zero test coverage for probativeValue and sourceType** - New fields not tested
4. **Stale documentation versions** - KNOWN_ISSUES.md at v2.6.33 (should be v2.6.41)
5. **Missing cross-references** - Baseline_Quality_Measurements.md not linked from navigation docs

### ❌ Critical Gaps Found (Senior Architect Review - Sections 21-28)
6. **CalcConfig NOT extended for probativeValue weights** - Requirement #3 not met
7. **CalcConfig NOT extended for sourceType calibration** - Requirement #3 not met
8. **CalcConfig NOT extended for evidence filter rules** - Requirement #3 not met
9. **AGENTS.md missing EvidenceItem guidance** - Requirement #7 partially met
10. **AGENTS.md missing probativeValue guidance** - Requirement #7 partially met
11. **AGENTS.md missing SourceType guidance** - Requirement #7 partially met
12. **No schema migration strategy documented** - Backward compatibility risk
13. **No backward compatibility tests** - Schema change validation gap

### ⚠️ Minor Issues
- orchestrated.prompt.md line 37 references "ExtractedFact" (should note deprecation)
- TERMINOLOGY.md, Overview.md have old version tags
- SearchConfig not extended for sourceType (LOW priority, document as future)

---

## Plan Update Summary (2026-01-29)

**Status**: REVISED after senior architect review (Claude Opus 4.5)

**What Changed**:
- **New Priority 0 Phase Added**: 6 tasks addressing requirements coverage gaps (7.5 hours)
- **Effort Revised**: 11.5-14 hrs → 19-21.5 hrs (+65% increase)
- **Critical Gaps Identified**: CalcConfig not extended, AGENTS.md incomplete, schema migration undocumented
- **Risk Assessment Updated**: 5 new architectural risks added from senior review
- **Requirements Coverage**: 2 of 10 original requirements had gaps (now closed by Priority 0)

**Why the Revision**:
The senior architect review (Sections 14-28 of audit document) identified that the original plan did not fully satisfy the user's Requirement #3 (CalcConfig extension) and Requirement #7 (Agent hints). Priority 0 tasks close these gaps before Phase 2 can be considered complete.

**Approval Required For**:
- Extending CalcConfig interface (breaking change if not backward compatible)
- Exposing evidence filter rules to admin panel (UX complexity)
- Adding ~8 hours to timeline

---

## Implementation Plan

### Priority 0: Requirements Coverage (CRITICAL - Before Phase 2 Completion)

These tasks address gaps identified in the senior architect review (Sections 21-28 of audit document). Must be completed before Phase 2 can be considered complete.

#### Task 0.1: Extend AGENTS.md with New Entities
**File**: `Docs/AGENTS/AGENTS_xWiki.md`
**Lines to add after**: Line 31 (after EvidenceScope section)

**New Content**:
```markdown
### EvidenceItem (replaces ExtractedFact)
**Status**: Current (v2.6.41+), ExtractedFact deprecated
**Purpose**: Represents extracted evidence items (unverified material) to be evaluated for claim support

**Key Fields**:
- `statement`: The evidence statement text (legacy name: `fact`)
- `category`: Evidence category (direct_evidence, expert_quote, statistic, etc.)
- `claimDirection`: How evidence relates to claim (supports/contradicts/neutral)
- `probativeValue`: Evidence quality assessment (high/medium/low)
- `evidenceScope`: Source methodology metadata (optional)

**LLM Guidance**:
- Use "EvidenceItem" in all new code, not "ExtractedFact"
- Evidence is unverified material to be weighted, not authoritative facts
- Always populate `claimDirection` (required for verdict aggregation)
- Only extract high/medium probativeValue items (low filtered by deterministic layer)

### probativeValue Field
**Status**: Current (v2.6.41+)
**Purpose**: Assesses evidence quality for filtering and weighting

**Values**:
- `high`: Specific, well-attributed, concrete evidence (default weight: 1.0)
- `medium`: Moderately specific, reasonable attribution (default weight: 0.8)
- `low`: Vague, unattributed, speculative (filtered out, weight: 0.5 if retained)

**LLM Guidance**:
- Assign high: specific claims with clear sources, studies with data
- Assign medium: general claims with attribution, reasonable specificity
- DO NOT extract low probativeValue items (prompt instruction)
- Deterministic filter removes items with vague phrases ("some say", "many believe")

### SourceType Enum
**Status**: Current (v2.6.41+)
**Purpose**: Classifies source types for reliability calibration

**Categories**:
- `peer_reviewed_study`: Academic journals, peer-reviewed research (calibration: 1.0)
- `fact_check_report`: Snopes, PolitiFact, FactCheck.org (calibration: 1.05)
- `government_report`: Official government publications (calibration: 1.0)
- `legal_document`: Court rulings, legislation (calibration: 1.0)
- `news_primary`: Primary source journalism (calibration: 1.0)
- `news_secondary`: News aggregation, secondary reporting (calibration: 0.95)
- `expert_statement`: Expert opinions, credentials verified (calibration: 0.9)
- `organization_report`: NGO, think tank reports (calibration: 0.95)
- `other`: Unclassified sources (calibration: 0.8)

**LLM Guidance**:
- Extract sourceType when EvidenceScope is present
- Base classification on publication venue, credentials, organizational affiliation
- Default to "other" if unsure
```

**Time**: 30 minutes
**Priority**: CRITICAL (Requirement #7)

#### Task 0.2: Extend CalcConfig for probativeValue Weights
**File**: `apps/web/src/app/admin/config/page.tsx`
**Lines to add**: After line 120 (end of current CalcConfig interface)

**Interface Extension**:
```typescript
  // Evidence Quality Weighting (v2.6.41+)
  probativeValueWeights?: {
    high: number;     // Default: 1.0
    medium: number;   // Default: 0.8
    low: number;      // Default: 0.5
  };
```

**Default Values** (add to DEFAULT_CALC_CONFIG):
```typescript
  probativeValueWeights: {
    high: 1.0,
    medium: 0.8,
    low: 0.5,
  },
```

**Admin UI** (add to form):
```tsx
<div className="space-y-2">
  <Label>Probative Value Weights</Label>
  <div className="grid grid-cols-3 gap-2">
    <Input type="number" step="0.1" label="High" value={config.probativeValueWeights?.high ?? 1.0} />
    <Input type="number" step="0.1" label="Medium" value={config.probativeValueWeights?.medium ?? 0.8} />
    <Input type="number" step="0.1" label="Low" value={config.probativeValueWeights?.low ?? 0.5} />
  </div>
  <p className="text-sm text-muted-foreground">
    How much to weight evidence by probativeValue (high/medium/low quality)
  </p>
</div>
```

**Time**: 1.5 hours
**Priority**: CRITICAL (Requirement #3)

#### Task 0.3: Extend CalcConfig for sourceType Calibration
**File**: `apps/web/src/app/admin/config/page.tsx`
**Lines to add**: After probativeValueWeights section

**Interface Extension**:
```typescript
  // Source Type Reliability Calibration (v2.6.41+)
  sourceTypeCalibration?: {
    peer_reviewed_study: number;    // Default: 1.0
    fact_check_report: number;      // Default: 1.05
    government_report: number;      // Default: 1.0
    legal_document: number;         // Default: 1.0
    news_primary: number;           // Default: 1.0
    news_secondary: number;         // Default: 0.95
    expert_statement: number;       // Default: 0.9
    organization_report: number;    // Default: 0.95
    other: number;                  // Default: 0.8
  };
```

**Default Values** (add to DEFAULT_CALC_CONFIG):
```typescript
  sourceTypeCalibration: {
    peer_reviewed_study: 1.0,
    fact_check_report: 1.05,
    government_report: 1.0,
    legal_document: 1.0,
    news_primary: 1.0,
    news_secondary: 0.95,
    expert_statement: 0.9,
    organization_report: 0.95,
    other: 0.8,
  },
```

**Admin UI** (add to form):
```tsx
<div className="space-y-2">
  <Label>Source Type Calibration Factors</Label>
  <div className="grid grid-cols-3 gap-2">
    <Input type="number" step="0.05" label="Peer Reviewed" value={config.sourceTypeCalibration?.peer_reviewed_study ?? 1.0} />
    <Input type="number" step="0.05" label="Fact Check" value={config.sourceTypeCalibration?.fact_check_report ?? 1.05} />
    <Input type="number" step="0.05" label="Government" value={config.sourceTypeCalibration?.government_report ?? 1.0} />
    {/* ... 6 more inputs ... */}
  </div>
  <p className="text-sm text-muted-foreground">
    Reliability multipliers by source type (EvidenceScope.sourceType)
  </p>
</div>
```

**Time**: 1 hour
**Priority**: CRITICAL (Requirement #3)

#### Task 0.4: Extend CalcConfig for Evidence Filter Rules
**File**: `apps/web/src/app/admin/config/page.tsx`
**Lines to add**: After sourceTypeCalibration section

**Interface Extension**:
```typescript
  // Evidence Filter Configuration (v2.6.41+)
  evidenceFilter?: {
    minStatementLength: number;       // Default: 20
    maxVaguePhraseCount: number;      // Default: 2
    requireSourceExcerpt: boolean;    // Default: true
    minExcerptLength: number;         // Default: 30
    requireSourceUrl: boolean;        // Default: true
    deduplicationThreshold: number;   // Default: 0.85 (similarity 0-1)
  };
```

**Default Values** (add to DEFAULT_CALC_CONFIG):
```typescript
  evidenceFilter: {
    minStatementLength: 20,
    maxVaguePhraseCount: 2,
    requireSourceExcerpt: true,
    minExcerptLength: 30,
    requireSourceUrl: true,
    deduplicationThreshold: 0.85,
  },
```

**Admin UI** (add to form - collapsible advanced section):
```tsx
<Collapsible>
  <CollapsibleTrigger>Evidence Filter Rules (Advanced)</CollapsibleTrigger>
  <CollapsibleContent>
    <div className="space-y-4 p-4 border rounded">
      <Input type="number" label="Min Statement Length" value={config.evidenceFilter?.minStatementLength ?? 20} />
      <Input type="number" label="Max Vague Phrase Count" value={config.evidenceFilter?.maxVaguePhraseCount ?? 2} />
      <Checkbox label="Require Source Excerpt" checked={config.evidenceFilter?.requireSourceExcerpt ?? true} />
      <Input type="number" label="Min Excerpt Length" value={config.evidenceFilter?.minExcerptLength ?? 30} />
      <Checkbox label="Require Source URL" checked={config.evidenceFilter?.requireSourceUrl ?? true} />
      <Input type="number" step="0.05" label="Deduplication Threshold" value={config.evidenceFilter?.deduplicationThreshold ?? 0.85} />
    </div>
  </CollapsibleContent>
</Collapsible>
```

**Time**: 1.5 hours
**Priority**: HIGH (Requirement #3)

#### Task 0.5: Add Backward Compatibility Test
**File**: `apps/web/test/unit/lib/analyzer/schema-backward-compatibility.test.ts` (NEW)

**Test Suite**:
```typescript
describe('Schema Backward Compatibility', () => {
  describe('ExtractedFact → EvidenceItem migration', () => {
    test('EvidenceItem accepts all ExtractedFact fields', () => {
      // Test that old job JSONs parse correctly
    });

    test('ExtractedFact type alias still works', () => {
      // Test deprecated alias compiles and works
    });

    test('Missing new fields have safe defaults', () => {
      // Test probativeValue, sourceType optional
    });
  });

  describe('CalcConfig schema evolution', () => {
    test('Old CalcConfig without new fields loads correctly', () => {
      // Test stored profiles without probativeValueWeights
    });

    test('Partial new fields merge with defaults', () => {
      // Test incomplete config merges with DEFAULT_CALC_CONFIG
    });
  });
});
```

**Time**: 1 hour
**Priority**: HIGH (Risk mitigation)

#### Task 0.6: Document Schema Migration Strategy
**File**: `Docs/ARCHITECTURE/Schema_Migration_Strategy.md` (NEW)

**Content Outline**:
1. Introduction: Why schema evolution matters
2. Current approach: Optional fields + deprecated aliases
3. CalcConfig versioning strategy
4. Job JSON backward compatibility guarantees
5. External API considerations
6. Testing requirements for schema changes
7. When to use deprecated aliases vs new names

**Time**: 2 hours
**Priority**: HIGH (Risk mitigation, Requirement #8)

---

### Phase 1: Test Coverage (HIGHEST PRIORITY)

#### Task 1.1: Create evidence-filter.test.ts
**File**: `apps/web/test/unit/lib/analyzer/evidence-filter.test.ts` (NEW)
**Time**: 3-4 hours

**Test Suite Structure**:
```typescript
describe('filterByProbativeValue', () => {
  // Statement quality tests
  describe('statement length filtering', () => {
    // Test minStatementLength threshold (default 20 chars)
  });

  describe('vague phrase detection', () => {
    // Test maxVaguePhraseCount (default 2)
    // Test all VAGUE_PHRASES patterns
  });

  // Source linkage tests
  describe('source excerpt requirements', () => {
    // Test requireSourceExcerpt flag
    // Test minExcerptLength (default 30 chars)
  });

  describe('source URL requirements', () => {
    // Test requireSourceUrl flag
  });

  // Category-specific tests
  describe('category-specific rules', () => {
    describe('statistic category', () => {
      // Test requireNumber
      // Test minExcerptLength for stats
    });

    describe('expert_quote category', () => {
      // Test requireAttribution
    });

    describe('event category', () => {
      // Test requireTemporalAnchor
    });

    describe('legal_provision category', () => {
      // Test requireCitation
    });
  });

  // Deduplication tests
  describe('deduplication', () => {
    // Test similarity threshold (default 0.85)
    // Test exact duplicates
    // Test near-duplicates
  });

  // Integration tests
  describe('filter statistics', () => {
    // Test FilterStats return values
    // Test filter reason counting
  });
});

describe('calculateFalsePositiveRate', () => {
  // Test FP rate calculation
  // Test with zero filtered items
  // Test with high probativeValue items filtered
});
```

**Coverage Goals**:
- All filter rules: statement quality, source linkage, category-specific
- Edge cases: empty arrays, all items filtered, none filtered
- Config variations: custom thresholds, disabled rules
- **Target**: >90% code coverage for evidence-filter.ts

#### Task 1.2: Update Test Files to Use EvidenceItem
**Files**:
- `apps/web/test/unit/lib/analyzer/verdict-corrections.test.ts` (lines 3, 6)
- `apps/web/test/unit/lib/analyzer/provenance-validation.test.ts` (lines 12, 26, 44, 64)
- `apps/web/test/unit/lib/analyzer/source-reliability.integration.test.ts` (lines 24, 96)

**Changes**:
```typescript
// Before
import type { ExtractedFact } from "@/lib/analyzer/types";

// After
import type { EvidenceItem } from "@/lib/analyzer/types";
// Note: ExtractedFact still works as deprecated alias, but prefer EvidenceItem

// Update all type references from ExtractedFact to EvidenceItem
```

**Time**: 30 minutes

#### Task 1.3: Add probativeValue Test Coverage
**File**: `apps/web/test/unit/lib/analyzer/v2.8-verification.test.ts` (extend existing)

**New Test Cases**:
```typescript
describe('probativeValue extraction', () => {
  test('assigns high probativeValue to well-attributed statements', () => {
    // Test with specific statement, clear source
  });

  test('assigns medium probativeValue to moderately specific statements', () => {
    // Test with moderate attribution
  });

  test('does not extract low probativeValue items', () => {
    // Test prompt instruction: "only extract high/medium"
  });
});
```

**Time**: 1 hour

#### Task 1.4: Add sourceType Test Coverage
**File**: `apps/web/test/unit/lib/analyzer/v2.8-verification.test.ts` (extend existing)

**New Test Cases**:
```typescript
describe('sourceType classification', () => {
  test('classifies peer-reviewed study correctly', () => {
    // Mock source with journal publication indicators
  });

  test('classifies fact-check report correctly', () => {
    // Mock source from Snopes/PolitiFact
  });

  test('omits sourceType when no EvidenceScope extracted', () => {
    // Test conditional extraction
  });
});
```

**Time**: 1 hour

---

### Phase 2: Prompt & Configuration Updates

#### Task 2.1: Update orchestrated.prompt.md
**File**: `apps/web/prompts/orchestrated.prompt.md`
**Line 37**: Change from:
```markdown
attached to individual facts (ExtractedFact.evidenceScope)
```
To:
```markdown
attached to individual facts (EvidenceItem.evidenceScope, legacy name: ExtractedFact)
```

**Time**: 2 minutes

#### Task 2.2: Verify Admin Configuration Sync
**Files to check**:
- `apps/web/src/app/admin/config/page.tsx` - CalcConfig, SearchConfig interfaces
- Verify new types (sourceType, probativeValue) are exposed if admin-tunable

**Already verified as correct** - no changes needed based on audit

**Time**: 10 minutes (verification only)

#### Task 2.3: Review Calculation Configuration
**Check if admin needs access to**:
- probativeValue thresholds (currently in DEFAULT_FILTER_CONFIG)
- sourceType reliability calibration factors
- Evidence filter rules (minStatementLength, maxVaguePhraseCount, etc.)

**Decision needed**: Should evidence filter config be admin-editable or code-only?

**Recommendation**: Keep filter config code-only for now (v2.8), consider admin exposure in Phase 3

**Time**: 15 minutes (review + document decision)

---

### Phase 3: Code Comment Updates

#### Task 3.1: Review and Update Code Comments
**Already excellent** based on audit:
- types.ts has comprehensive legacy field comments
- extract-facts-base.ts has clear terminology explanations
- AGENTS.md has precise usage guidelines

**No changes needed** - Phase 1 comment updates are complete

**Time**: 10 minutes (verification only)

---

### Phase 4: Documentation Updates

#### Task 4.1: Update Stale Version Numbers
**Files**:
- `Docs/STATUS/KNOWN_ISSUES.md` - Update from v2.6.33 to v2.6.41
- `Docs/REFERENCE/TERMINOLOGY.md` - Update version tag to v2.6.41
- `Docs/ARCHITECTURE/Overview.md` - Update from v2.6.38 to v2.6.41
- `Docs/ARCHITECTURE/Pipeline_TriplePath_Architecture.md` - Change status from "desired" to "implemented"

**Time**: 20 minutes

#### Task 4.2: Create Missing Documentation
**New Files**:

1. **`Docs/ARCHITECTURE/Evidence_Quality_Filtering.md`**
   - Document evidence-filter.ts architecture
   - Explain two-layer strategy (prompt + deterministic filter)
   - List all filter rules with rationale
   - Document configuration options
   - Include integration points (orchestrated.ts line 5893)

2. **`Docs/REFERENCE/Provider_Prompt_Formatting.md`**
   - Document v2.8 provider-specific prompt optimizations
   - Explain format differences (OpenAI, Anthropic, Google, etc.)

3. **`Docs/USER_GUIDES/Unified_Config_Management.md`**
   - Explain v2.6.41 UCM system
   - Profile management (create, edit, import, export)
   - Prompt, search, and calc config integration

4. **`Docs/DEVELOPMENT/Scope_Definition_Guidelines.md`**
   - Define when to use EvidenceScope vs AnalysisContext
   - Provide decision tree
   - Include code examples

**Time**: 4-6 hours total

#### Task 4.3: Fix Cross-References
**Updates**:
- `Docs/ARCHIVE/REVIEWS/README.md` - Add link to Baseline_Quality_Measurements.md
- `Docs/STATUS/Current_Status.md` - Link to new evidence-filter docs
- `Docs/USER_GUIDES/LLM_Configuration.md` - Link to Provider_Prompt_Formatting.md
- `Docs/REFERENCE/TERMINOLOGY.md` line 597 - Fix broken reference (file doesn't exist)

**Time**: 30 minutes

#### Task 4.4: Update Terminology Migration Status
**File**: `Docs/ARCHIVE/REVIEWS/Terminology_Migration_SUMMARY.md`

**Updates**:
- Mark Phase 2 as fully complete (all tasks done including filter integration)
- Update progress percentage to 40% (was 35%)
- Add note about test coverage completion
- Update "Next Action" to Phase 2.1 gradual migration only

**Time**: 10 minutes

---

### Phase 5: Archive & Cleanup

#### Task 5.1: Create Archive Structure
**New directory**: `Docs/ARCHIVE/Source_Reliability_Service_Reviews/`

**Move files** (8 historical review files):
- Source_Reliability_Service_Proposal.md
- Source_Reliability_Service_Proposal.LeadDevReview.md
- Source_Reliability_Service_Architecture_Review.md
- Source_Reliability_Service_Final_Review.md
- Source_Reliability_Service_Security_Review.md
- Source_Reliability_Service_Project_Lead_Review.md
- Source_Reliability_Implementation_Review.md
- Source_Reliability_Review_Summary.md

**Create**: `Docs/ARCHIVE/README_ARCHIVE.md` explaining what's archived and why

**Time**: 30 minutes

#### Task 5.2: Deduplicate xWiki Exports
**Decision**: Keep `Docs/xwiki-export/temp-full/`, delete `Docs/extracted_spec_21/` (duplicate)

**Document**: Add note to README explaining canonical xWiki export location

**Time**: 10 minutes

---

## Files Modified Summary

### New Files (10)
**Priority 0 (Requirements Coverage):**
1. `apps/web/test/unit/lib/analyzer/schema-backward-compatibility.test.ts` - Backward compatibility tests
2. `Docs/ARCHITECTURE/Schema_Migration_Strategy.md` - Schema evolution documentation

**Phase 1 (Test Coverage):**
3. `apps/web/test/unit/lib/analyzer/evidence-filter.test.ts` - Comprehensive test suite

**Phase 4 (Documentation):**
4. `Docs/ARCHITECTURE/Evidence_Quality_Filtering.md` - Evidence filter architecture
5. `Docs/REFERENCE/Provider_Prompt_Formatting.md` - Provider-specific formats
6. `Docs/USER_GUIDES/Unified_Config_Management.md` - UCM user guide
7. `Docs/DEVELOPMENT/Scope_Definition_Guidelines.md` - Scope definition guide

**Phase 5 (Archive):**
8. `Docs/ARCHIVE/README_ARCHIVE.md` - Archive explanation
9. `Docs/ARCHIVE/Source_Reliability_Service_Reviews/` - New directory

### Updated Files (16)
**Priority 0 (Requirements Coverage):**
1. `apps/web/src/app/admin/config/page.tsx` - Extend CalcConfig (probativeValue, sourceType, evidenceFilter)
2. `Docs/AGENTS/AGENTS_xWiki.md` - Add EvidenceItem, probativeValue, SourceType guidance

**Phase 1 (Test Coverage):**
3. `apps/web/test/unit/lib/analyzer/verdict-corrections.test.ts` - Use EvidenceItem
4. `apps/web/test/unit/lib/analyzer/provenance-validation.test.ts` - Use EvidenceItem
5. `apps/web/test/unit/lib/analyzer/source-reliability.integration.test.ts` - Use EvidenceItem
6. `apps/web/test/unit/lib/analyzer/v2.8-verification.test.ts` - Add probativeValue/sourceType tests

**Phase 2 (Prompts & Configs):**
7. `apps/web/prompts/orchestrated.prompt.md` - Line 37 (ExtractedFact → EvidenceItem note)

**Phase 4 (Documentation):**
8. `Docs/STATUS/KNOWN_ISSUES.md` - Update version to v2.6.41
9. `Docs/REFERENCE/TERMINOLOGY.md` - Update version tag
10. `Docs/ARCHITECTURE/Overview.md` - Update version to v2.6.41
11. `Docs/ARCHITECTURE/Pipeline_TriplePath_Architecture.md` - Change to "implemented"
12. `Docs/ARCHIVE/REVIEWS/README.md` - Add Baseline_Quality_Measurements.md link
13. `Docs/STATUS/Current_Status.md` - Link to evidence-filter docs, schema migration docs
14. `Docs/USER_GUIDES/LLM_Configuration.md` - Link to provider formats
15. `Docs/ARCHIVE/REVIEWS/Terminology_Migration_SUMMARY.md` - Update Phase 2 status

### Moved Files (8)
- All Source Reliability Service review files → `Docs/ARCHIVE/Source_Reliability_Service_Reviews/`

### Deleted (1)
- `Docs/extracted_spec_21/` directory (duplicate of xwiki-export/temp-full/)

---

## Verification Steps

### Priority 0 Verification (Requirements Coverage)
```bash
# Test admin panel loads with extended CalcConfig
npm run dev
# Navigate to /admin/config and verify:
# - probativeValueWeights section renders
# - sourceTypeCalibration section renders
# - evidenceFilter advanced section renders (collapsible)
# - All inputs have correct default values
# - Form saves without errors

# Test backward compatibility
npm test apps/web/test/unit/lib/analyzer/schema-backward-compatibility.test.ts
# Verify:
# - Old CalcConfig profiles load with new defaults
# - ExtractedFact type alias still works
# - Missing new fields handled gracefully

# Review AGENTS.md update
# Check that AGENTS_xWiki.md includes:
# - EvidenceItem entity documentation
# - probativeValue field guidance
# - SourceType enum categories
```

### Test Verification
```bash
# Run new evidence-filter tests
npm test apps/web/test/unit/lib/analyzer/evidence-filter.test.ts

# Verify coverage
npm run test:coverage -- evidence-filter

# Run all analyzer tests to ensure no regressions
npm test apps/web/test/unit/lib/analyzer/

# Run probativeValue and sourceType tests
npm test apps/web/test/unit/lib/analyzer/v2.8-verification.test.ts
```

### Documentation Verification
1. Check all cross-references resolve (no broken links)
2. Verify version numbers are consistent across all docs
3. Confirm Mermaid diagrams still render correctly
4. Review new documentation for clarity and completeness
5. **NEW**: Verify Schema_Migration_Strategy.md explains backward compatibility approach
6. **NEW**: Confirm AGENTS_xWiki.md has complete coverage of new entities

### Integration Verification
1. Run full analysis job and check evidence filter statistics in logs
2. Verify probativeValue field populates in extracted evidence
3. Confirm sourceType appears in EvidenceScope when applicable
4. Check admin config panel loads without errors
5. **NEW**: Test that stored CalcConfig profiles without new fields load correctly
6. **NEW**: Verify probativeValue weights are applied during verdict aggregation
7. **NEW**: Confirm sourceType calibration factors affect evidence weighting

---

## Time Estimates

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| **0** | **Requirements Coverage** | **7.5 hrs** | **CRITICAL** |
| 0.1 | Extend AGENTS.md with new entities | 30 min | Critical |
| 0.2 | Extend CalcConfig for probativeValue | 1.5 hrs | Critical |
| 0.3 | Extend CalcConfig for sourceType | 1 hr | Critical |
| 0.4 | Extend CalcConfig for filter rules | 1.5 hrs | High |
| 0.5 | Add backward compatibility test | 1 hr | High |
| 0.6 | Document schema migration strategy | 2 hrs | High |
| **1** | **Test Coverage** | **5.5-6.5 hrs** | **CRITICAL** |
| 1.1 | Create evidence-filter.test.ts | 3-4 hrs | High |
| 1.2 | Update test files to EvidenceItem | 30 min | High |
| 1.3 | Add probativeValue tests | 1 hr | Medium |
| 1.4 | Add sourceType tests | 1 hr | Medium |
| **2** | **Prompts & Configs** | **27 min** | **Medium** |
| 2.1 | Update orchestrated.prompt.md | 2 min | Low |
| 2.2 | Verify admin config sync | 10 min | Low |
| 2.3 | Review calc config | 15 min | Low |
| **3** | **Code Comments** | **10 min** | **Low** |
| 3.1 | Verify comment accuracy | 10 min | Low |
| **4** | **Documentation** | **5.5-7 hrs** | **High** |
| 4.1 | Update stale versions | 20 min | Medium |
| 4.2 | Create missing docs (4 files) | 4-6 hrs | High |
| 4.3 | Fix cross-references | 30 min | Medium |
| 4.4 | Update migration status | 10 min | Low |
| **5** | **Archive & Cleanup** | **40 min** | **Low** |
| 5.1 | Create archive structure | 30 min | Low |
| 5.2 | Deduplicate xWiki exports | 10 min | Low |
| **TOTAL** | | **19-21.5 hrs** | |

**Revised from original estimate**: 11.5-14 hrs → 19-21.5 hrs (+7.5 hrs for Requirements Coverage)

---

## Risk Assessment

### Original Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing tests | LOW | Run full test suite after changes |
| Documentation inconsistencies | LOW | Systematic cross-reference check |
| Missing edge cases in evidence-filter tests | MEDIUM | Comprehensive test suite with >90% coverage target |
| Admin config changes affecting stored profiles | LOW | Schema migration with defaults, backward compatibility tests |

### New Risks from Senior Architect Review

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Stored CalcConfig profiles incompatible** | HIGH | Task 0.5: Backward compatibility test; Task 0.6: Schema migration docs; Use optional fields + defaults |
| **LLM confusion from terminology drift** | MEDIUM | Task 0.1: Update AGENTS.md; Consistent terminology in prompts; Phase 1 completed successfully |
| **External API consumers break** | HIGH (if exists) | Task 0.6: Document API versioning; Maintain ExtractedFact alias; Add deprecation warnings |
| **Test suite fragility** | MEDIUM | Task 0.5: Schema compatibility tests; Gradual migration approach in Phase 2.1 |
| **Documentation drift over time** | MEDIUM | Task 4.3: Fix cross-references; Systematic review schedule; Version tags in all docs |
| **CalcConfig UI complexity** | MEDIUM | Task 0.4: Use collapsible advanced sections; Clear help text; Sensible defaults |
| **probativeValue weight tuning unclear** | LOW | Task 4.2: Document weighting strategy; Include examples in admin UI |

**Overall Risk Level**: MEDIUM (mitigated through phased approach + backward compatibility)

---

## Success Criteria

### Priority 0: Requirements Coverage ✅

**Maps to Original Requirements:**
- **Requirement #3**: CalcConfig extended for probativeValue, sourceType, evidenceFilter
- **Requirement #7**: AGENTS.md covers EvidenceItem, probativeValue, SourceType
- **Requirement #8**: Schema migration strategy documented

**Checklist:**
- [ ] AGENTS.md includes EvidenceItem, probativeValue, SourceType (Task 0.1)
- [ ] CalcConfig has probativeValueWeights interface + UI (Task 0.2)
- [ ] CalcConfig has sourceTypeCalibration interface + UI (Task 0.3)
- [ ] CalcConfig has evidenceFilter interface + UI (Task 0.4)
- [ ] Backward compatibility test suite created (Task 0.5)
- [ ] Schema migration strategy documented (Task 0.6)
- [ ] Admin panel loads without errors with extended config
- [ ] Stored profiles without new fields load with defaults

### Phase 1: Test Coverage ✅

**Maps to Original Requirements:**
- **Requirement #5**: Related existing tests updated, test coverage reasonably good

**Checklist:**
- [ ] evidence-filter.test.ts created with >90% code coverage (Task 1.1)
- [ ] All test files use EvidenceItem (zero ExtractedFact references) (Task 1.2)
- [ ] probativeValue has test coverage (high/medium/low assignment) (Task 1.3)
- [ ] sourceType has test coverage (classification logic) (Task 1.4)
- [ ] All tests pass without regressions

### Phase 2: Prompts & Configs ✅

**Maps to Original Requirements:**
- **Requirement #1**: Prompts and search terms are up to date
- **Requirement #2**: Admin editable configurations in sync with code

**Checklist:**
- [ ] orchestrated.prompt.md references EvidenceItem with deprecation note (Task 2.1)
- [ ] Admin config verified as in sync with code (Task 2.2)
- [ ] Calculation config reviewed for new type exposure (Task 2.3)

### Phase 3: Code Comments ✅

**Maps to Original Requirements:**
- **Requirement #6**: Comments in code are correct

**Checklist:**
- [ ] All legacy field comments verified as accurate (Task 3.1)
- [ ] No misleading "fact" terminology in comments (except factualBasis field)

### Phase 4: Documentation ✅

**Maps to Original Requirements:**
- **Requirement #8**: All related documentation up to date
- **Requirement #10**: Documentation consistent with cross-links

**Checklist:**
- [ ] All version numbers current (v2.6.41) (Task 4.1)
- [ ] 4 new documentation files created and reviewed (Task 4.2)
- [ ] All cross-references working (no broken links) (Task 4.3)
- [ ] Terminology Migration SUMMARY updated with Phase 2 complete (Task 4.4)

### Phase 5: Archive & Cleanup ✅

**Maps to Original Requirements:**
- **Requirement #9**: Docs only needed for lookback are in archive

**Checklist:**
- [ ] Historical SR service reviews archived (Task 5.1)
- [ ] Duplicate xWiki export removed (Task 5.2)
- [ ] Archive README explains what and why

---

## Requirements Coverage Matrix

| Original Requirement | Status | Tasks Addressing |
|---------------------|--------|------------------|
| 1. Prompts and search terms up to date | ✅ Covered | Task 2.1 (orchestrated.prompt.md) |
| 2. Admin configs in sync with code | ✅ Covered | Task 2.2 (verification) |
| 3. CalcConfig extended for new types | ⚠️ **GAP CLOSED** | Task 0.2, 0.3, 0.4 (CalcConfig extensions) |
| 4. SearchConfig extended for new types | 📋 LOW Priority | Document as future consideration |
| 5. Tests updated, coverage good | ✅ Covered | Task 1.1, 1.2, 1.3, 1.4 (test suite) |
| 6. Code comments correct | ✅ Covered | Task 3.1 (verification) |
| 7. Agent hints cover main entities | ⚠️ **GAP CLOSED** | Task 0.1 (AGENTS.md extension) |
| 8. Documentation up to date | ✅ Covered | Task 4.1, 4.2, 4.3, 4.4, 0.6 (schema docs) |
| 9. Lookback docs archived | ✅ Covered | Task 5.1, 5.2 (archive) |
| 10. Documentation cross-linked | ✅ Covered | Task 4.3 (cross-references) |

**Coverage**: 10/10 requirements addressed (2 gaps closed by Priority 0 tasks)

---

## Notes

### Decision Points Resolved
1. **Evidence filter admin config**: ~~Keep code-only for v2.8~~ **REVISED**: Expose via Task 0.4 (senior architect review identified as Requirement #3 gap)
2. **Test migration strategy**: Migrate from ExtractedFact to EvidenceItem but keep deprecated alias working
3. **Documentation archive**: Move historical reviews to dedicated subfolder, keep for reference
4. **CalcConfig extensions**: probativeValue weights, sourceType calibration, evidenceFilter rules all admin-tunable (senior architect recommendation)
5. **Schema migration**: Use optional fields + defaults for backward compatibility; document strategy in Task 0.6

### Phase Completion Markers
After this plan executes:
- **Phase 0-2.5**: ✅ Complete with full test coverage + requirements compliance
- **Phase 2.1+**: 🔄 Ongoing gradual file migration (1-2 months)
- **Phase 3**: 📋 Planned for v3.0 (EvidenceClaimLink, full rename)

### Review History
- **2026-01-29 Initial Audit**: Identified 5 critical gaps (test coverage, stale docs)
- **2026-01-29 Senior Architect Review (Claude Opus 4.5)**: Added Sections 14-28 to audit document
  - Identified 3 additional critical gaps (CalcConfig extension, AGENTS.md, schema migration)
  - Revised risk assessment (5 new risks)
  - Increased effort estimate from 11.5-14 hrs to 19-21.5 hrs
  - Created Priority 0 phase to address requirements coverage
- **2026-01-29 Plan Update**: This revision incorporates all senior architect findings

### Related Documents
- [Terminology_Migration_SUMMARY.md](Terminology_Migration_SUMMARY.md) - Current status
- [Terminology_Migration_Plan_UPDATED.md](Terminology_Migration_Plan_UPDATED.md) - Comprehensive plan
- [Terminology_Migration_Compliance_Audit.md](Terminology_Migration_Compliance_Audit.md) - **FULL AUDIT** (includes senior review Sections 14-28)
- [Baseline_Quality_Measurements.md](Baseline_Quality_Measurements.md) - Metrics validation
- [AGENTS_xWiki.md](../AGENTS/AGENTS_xWiki.md) - LLM guidance (to be extended in Task 0.1)

