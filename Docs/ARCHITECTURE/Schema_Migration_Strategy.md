> **MOVED TO xWiki** (2026-02-06)
> 
> This document has been consolidated into the xWiki documentation system.
> The xWiki version is now the authoritative source.
> 
> **xWiki file**: `Docs/xwiki-pages/FactHarbor_Spec_and_Impl/FactHarbor/Specification/Implementation/Schema Migration Strategy/WebHome.xwiki`
> 
> This .md file is kept for reference only. Do not edit - edit the .xwiki file instead.

---


# Schema Migration Strategy

**Version**: 1.0
**Date**: 2026-01-29
**Status**: Active
**Related**: [Terminology Migration Plan](../ARCHIVE/REVIEWS/Terminology_Migration_Plan_UPDATED.md)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Current Approach](#2-current-approach)
3. [CalcConfig Versioning Strategy](#3-calcconfig-versioning-strategy)
4. [Job JSON Backward Compatibility](#4-job-json-backward-compatibility)
5. [External API Considerations](#5-external-api-considerations)
6. [Testing Requirements](#6-testing-requirements)
7. [When to Use Deprecated Aliases](#7-when-to-use-deprecated-aliases)
8. [Migration Phases](#8-migration-phases)

---

## 1. Introduction

### Why Schema Evolution Matters

As FactHarbor evolves, we must change data structures without breaking:
- **Stored job results** (SQLite database: `ResultJson` column)
- **Stored configuration profiles** (UCM database: CalcConfig, SearchConfig, PromptConfig)
- **External API consumers** (if any integrations depend on our JSON schemas)
- **In-flight analysis jobs** (during rolling deploys)

A naive "find and rename" approach would cause:
- Old job results to become unparseable → UI breaks for historical jobs
- Stored config profiles to fail validation → admins lose custom settings
- External integrations to break silently → data pipelines fail

This document defines our **schema evolution strategy** to maintain backward compatibility while improving terminology and structure.

---

## 2. Current Approach

### Principle: Additive Changes Only (Phase 2)

During Phase 0-2.5 (terminology migration), all schema changes are **additive**:

#### 2.1 Optional Fields

New fields are added with **optional** (`?`) suffix in TypeScript:

```typescript
// Before (Phase 0)
interface EvidenceItem {
  id: string;
  fact: string;
  category: string;
  sourceId: string;
  // ...
}

// After (Phase 2)
interface EvidenceItem {
  id: string;
  fact: string;
  category: string;
  sourceId: string;
  // NEW: Phase 2 fields (optional)
  probativeValue?: "high" | "medium" | "low";
  evidenceScope?: {
    name: string;
    sourceType?: SourceType;
  };
  // ...
}
```

**Benefits**:
- Old data without these fields still validates ✓
- Code can use `??` operator for defaults ✓
- No database migration required ✓

#### 2.2 Deprecated Aliases

Old names remain as **type aliases** during gradual migration:

```typescript
// Phase 2: Both names work
export interface EvidenceItem { /* ... */ }

/**
 * @deprecated Use EvidenceItem instead (v2.6.41+)
 */
export type ExtractedFact = EvidenceItem;
```

**Benefits**:
- Old code keeps working during transition ✓
- Gradual file-by-file migration possible ✓
- Clear deprecation warnings for developers ✓

#### 2.3 Fallback Defaults

Code uses `??` operator to provide defaults when fields missing:

```typescript
// Handles both old and new data
const probativeValue = evidence.probativeValue ?? "medium";
const sourceType = evidence.evidenceScope?.sourceType ?? "other";
```

**Benefits**:
- No runtime errors for missing fields ✓
- Explicit default values in code ✓
- Works with old and new data ✓

---

## 3. CalcConfig Versioning Strategy

### 3.1 Problem: Admin Configuration Evolution

Admin-editable configurations (CalcConfig, SearchConfig, PromptConfig) are stored as:
- JSON in SQLite database (UCM system)
- Loaded at runtime for analysis jobs
- Edited via `/admin/config` UI

When we add new config fields (Phase 2):
- Old stored profiles lack these fields
- Code needs to provide sensible defaults
- Admin UI should show defaults when fields missing

### 3.2 Solution: Optional Fields + Default Merging

#### CalcConfig Interface (Phase 2)

```typescript
interface CalcConfig {
  // Phase 0-1 fields (required)
  verdictBands: { ... };
  aggregation: { ... };
  sourceReliability: { ... };
  qualityGates: { ... };
  contestationPenalties: { ... };
  deduplication: { ... };
  mixedConfidenceThreshold: number;

  // Phase 2 fields (optional)
  probativeValueWeights?: {
    high: number;
    medium: number;
    low: number;
  };
  sourceTypeCalibration?: {
    peer_reviewed_study: number;
    fact_check_report: number;
    // ... 7 more types
  };
  evidenceFilter?: {
    minStatementLength: number;
    maxVaguePhraseCount: number;
    requireSourceExcerpt: boolean;
    minExcerptLength: number;
    requireSourceUrl: boolean;
    deduplicationThreshold: number;
  };
}
```

#### Default Values (Phase 2)

```typescript
// apps/web/src/app/admin/config/page.tsx
const DEFAULT_CALC_CONFIG: CalcConfig = {
  // Phase 0-1 defaults...
  mixedConfidenceThreshold: 60,

  // Phase 2 defaults (always present in DEFAULT)
  probativeValueWeights: {
    high: 1.0,
    medium: 0.8,
    low: 0.5,
  },
  sourceTypeCalibration: {
    peer_reviewed_study: 1.0,
    fact_check_report: 1.05,
    // ... 7 more
  },
  evidenceFilter: {
    minStatementLength: 20,
    maxVaguePhraseCount: 2,
    requireSourceExcerpt: true,
    minExcerptLength: 30,
    requireSourceUrl: true,
    deduplicationThreshold: 0.85,
  },
};
```

#### Runtime Merging (Phase 2)

```typescript
// When loading stored profile
function loadCalcConfig(storedJson: string): CalcConfig {
  const stored = JSON.parse(storedJson) as Partial<CalcConfig>;

  // Merge with defaults (new fields filled in if missing)
  return {
    ...DEFAULT_CALC_CONFIG,
    ...stored,
  };
}
```

**Result**:
- Old profiles without `probativeValueWeights` get defaults
- Admin UI shows default values for missing fields
- User can edit and save, which populates the new fields

### 3.3 Admin UI Handling

```typescript
// Admin config form component
<input
  type="number"
  value={config.probativeValueWeights?.high ?? 1.0}
  onChange={(e) => {
    onChange({
      ...config,
      probativeValueWeights: {
        ...config.probativeValueWeights,
        high: parseFloat(e.target.value) || 1.0,
      },
    });
  }}
/>
```

**Behavior**:
- If field missing: shows default (1.0)
- If field present: shows stored value
- On edit: creates/updates the field
- No validation errors for missing fields

---

## 4. Job JSON Backward Compatibility

### 4.1 Problem: Stored Job Results

Job results are stored in ASP.NET API database:
- SQLite table: `AnalysisJobs`
- Column: `ResultJson` (TEXT, JSON blob)
- Loaded by `/jobs/[id]` UI for display

Schema:
```typescript
interface AnalysisResult {
  input: string;
  facts: EvidenceItem[];  // Array of evidence
  claimVerdicts: ClaimVerdict[];
  // ... other fields
}
```

**Risk**: If Phase 3 changes field names in output:
- Old jobs have `facts[]` with `fact` field
- New code expects `evidence[]` with `statement` field
- UI breaks when loading old jobs

### 4.2 Solution: Keep Output Schema Stable (Phase 2)

During Phase 2, **output JSON schema unchanged**:
- Still write `facts[]` array (not `evidence[]`)
- Still write `fact` field (not `statement`)
- Only internal TypeScript types use new names

```typescript
// Phase 2: Internal type is EvidenceItem
function extractEvidence(source: Source): EvidenceItem[] {
  // ... extraction logic
}

// Phase 2: Serialize with legacy field names
function saveJobResult(evidence: EvidenceItem[]): string {
  const result = {
    facts: evidence.map(e => ({
      id: e.id,
      fact: e.fact,  // Still use legacy field name in output
      category: e.category,
      // ... all fields
    })),
  };
  return JSON.stringify(result);
}
```

**Result**: Old and new jobs have identical JSON schema.

### 4.3 Future: Schema Versioning (Phase 3)

When Phase 3 renames fields in output, add schema version:

```typescript
interface VersionedResult {
  schemaVersion: string;  // "2.6", "2.7", "3.0"
  // ... rest of result
}

function parseJobResult(json: string): AnalysisResult {
  const raw = JSON.parse(json);
  const version = raw.schemaVersion || "2.6"; // Legacy default

  if (semver.lt(version, "3.0.0")) {
    // Apply transformations for legacy data
    return transformLegacyResult(raw);
  }

  return raw as AnalysisResult;
}

function transformLegacyResult(raw: any): AnalysisResult {
  return {
    ...raw,
    // Map old field names to new
    evidence: raw.facts?.map((f: any) => ({
      ...f,
      statement: f.fact,
    })),
    // Remove old fields
    facts: undefined,
  };
}
```

**Benefits**:
- Old jobs load correctly via transformation ✓
- New jobs use clean schema ✓
- Version detection automatic (missing = legacy) ✓

---

## 5. External API Considerations

### 5.1 Current API Exposure

```
GET /api/fh/jobs/[id]
→ Returns: { ResultJson: string }

GET /api/fh/analyze
→ Returns: AnalysisResult (JSON)
```

**Assumption**: No external integrations currently depend on our schema.

**If integrations exist**:
- They depend on `facts[]` array structure
- Changing to `evidence[]` would break them silently

### 5.2 Mitigation: API Versioning (If Needed)

If external consumers identified:

**Option A: Versioned Endpoints** (Recommended)
```
/api/v1/analyze → Legacy schema (facts[])
/api/v2/analyze → New schema (evidence[])
```

**Option B: Deprecation Headers**
```
HTTP/1.1 200 OK
X-Deprecated-Field: facts (use evidence in v2.0)
X-Schema-Version: 2.6
```

**Option C: Dual Output**
```json
{
  "schemaVersion": "2.6",
  "facts": [...],       // Legacy (deprecated)
  "evidence": [...],    // New (preferred)
  "_deprecationNotice": "facts field will be removed in v3.0"
}
```

### 5.3 Action Required Before Phase 3

1. **Audit external consumers**: Check logs, ask stakeholders
2. **If none**: Proceed with field renames
3. **If exist**: Implement API versioning strategy

---

## 6. Testing Requirements

### 6.1 Backward Compatibility Test Suite

**Location**: `apps/web/test/unit/lib/analyzer/schema-backward-compatibility.test.ts`

**Required Tests**:

#### Type Compatibility Tests
```typescript
it("EvidenceItem accepts required fields", () => {
  const evidence: EvidenceItem = { /* ... */ };
  expect(evidence.statement).toBe(...);
});
```

#### Optional Field Tests
```typescript
it("Missing new fields have safe defaults", () => {
  const legacy: EvidenceItem = {
    id: "E1",
    statement: "Statement",
    // probativeValue: missing
  };
  const value = legacy.probativeValue ?? "medium";
  expect(value).toBe("medium");
});
```

#### CalcConfig Merging Tests
```typescript
it("Old CalcConfig without new fields loads correctly", () => {
  const legacy = { mixedConfidenceThreshold: 60 };
  const effective = { ...DEFAULT_CALC_CONFIG, ...legacy };
  expect(effective.probativeValueWeights).toBeDefined();
});
```

#### JSON Parsing Tests
```typescript
it("JSON.parse handles v3 job results", () => {
  const json = '{"evidenceItems":[{"statement":"Test"}]}';
  const parsed = JSON.parse(json);
  expect(parsed.evidenceItems[0].probativeValue).toBeUndefined();
});
```

### 6.2 Test Execution Frequency

- **Before each Phase completion**: Verify no regressions
- **Before Phase 3 field renames**: Full suite must pass
- **CI/CD pipeline**: Run on every commit

---

## 7. When to Use Deprecated Aliases

### 7.1 ExtractedFact Alias

**Current Status** (Phase 2):
```typescript
export interface EvidenceItem { /* ... */ }

/**
 * @deprecated Use EvidenceItem instead (v2.6.41+)
 */
export type ExtractedFact = EvidenceItem;
```

**Use Cases for Deprecated Alias**:

❌ **DON'T use in new code**:
```typescript
// Bad: Using deprecated alias in new file
import type { ExtractedFact } from "@/lib/analyzer/types";
function newFeature(facts: ExtractedFact[]) { ... }
```

✅ **DO use temporarily during migration**:
```typescript
// Good: Legacy file not yet migrated
import type { ExtractedFact } from "@/lib/analyzer/types";
function legacyFeature(facts: ExtractedFact[]) { ... }
// TODO: Migrate to EvidenceItem in Phase 2.1
```

✅ **DO use in tests for legacy behavior**:
```typescript
// Good: Testing backward compatibility
it("ExtractedFact alias still works", () => {
  const fact: ExtractedFact = { ... };
  processEvidence(fact); // Should work
});
```

### 7.2 When to Remove Aliases

**Phase 2-2.5**: Keep alias (gradual migration ongoing)
**Phase 3**: Remove alias (breaking change, major version)

**Prerequisites for removal**:
1. All code migrated to EvidenceItem ✓
2. All stored data uses new schema ✓
3. External APIs versioned ✓
4. Major version bump (v3.0) ✓

---

## 8. Migration Phases

### Phase 0: Documentation Updates (Complete)
- Update docs to use "evidence" terminology ✓
- No code changes ✓

### Phase 1: Comments and Labels (Complete)
- Update code comments and UI labels ✓
- No schema changes ✓

### Phase 1.5: Layer 2 Filter (Complete)
- Add `evidence-filter.ts` with probativeValue enforcement ✓
- Additive change (no breaking changes) ✓

### Phase 2: New Fields (Complete)
- Add optional fields: `probativeValue`, `sourceType` ✓
- Extend CalcConfig with new parameters ✓
- Add EvidenceItem type, keep ExtractedFact alias ✓
- **Output JSON schema unchanged** ✓

### Phase 2.1: Gradual Code Migration (In Progress)
- File-by-file migration from ExtractedFact to EvidenceItem
- Test files already migrated ✓
- Production code migration ongoing (~1-2 months)
- **Output JSON schema still unchanged**

### Phase 2.5: Source Type Prompts (Complete)
- Add sourceType extraction to prompts ✓
- Additive change ✓

### Phase 3: Field Renames (Planned for v3.0)
- **Breaking change**: Output JSON schema changes
- Rename `facts[]` → `evidence[]`
- Rename `fact` field → `statement`
- Rename `supportingFactIds` → `supportingEvidenceIds`
- Add schema versioning for backward compatibility
- Remove deprecated aliases

**Prerequisites for Phase 3**:
1. ☐ All Priority 0-1 tasks complete
2. ☐ Backward compatibility tests passing
3. ☐ Schema migration strategy documented ✓
4. ☐ External API consumers audited
5. ☐ Major version bump (v2.x → v3.0)
6. ☐ Transformation logic for legacy data tested

---

## Appendix A: Schema Version History

| Version | Date | Schema Changes | Migration Required? |
|---------|------|----------------|---------------------|
| 2.6.17 | 2025-11 | Initial UCM system, base schema | N/A (baseline) |
| 2.6.33 | 2025-12 | Source reliability fields added | No (additive) |
| 2.6.38 | 2026-01 | Triple-path pipeline (no schema change) | No |
| 2.6.41 | 2026-01 | Phase 2: probativeValue, sourceType (optional) | No (optional fields) |
| 3.0.0 | TBD | Phase 3: Field renames (facts → evidence) | Yes (transformation) |

---

## Appendix B: Related Documents

- [Terminology Migration Plan](../ARCHIVE/REVIEWS/Terminology_Migration_Plan_UPDATED.md) - Comprehensive migration plan
- [Terminology Migration Summary](../ARCHIVE/REVIEWS/Terminology_Migration_SUMMARY.md) - Current status
- [Terminology Migration Compliance Audit](../ARCHIVE/REVIEWS/Terminology_Migration_Compliance_Audit.md) - Requirements audit
- [Baseline Quality Measurements](../ARCHIVE/REVIEWS/Baseline_Quality_Measurements.md) - Quality metrics
- [Backward Compatibility Test Suite](../../apps/web/test/unit/lib/analyzer/schema-backward-compatibility.test.ts) - Test implementation

---

**Document Version**: 1.0
**Last Updated**: 2026-01-29
**Next Review**: Before Phase 3 planning
**Maintained by**: Plan Coordinator

