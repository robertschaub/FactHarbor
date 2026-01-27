# Terminology Audit: "Fact" Entity

**Date**: 2026-01-27
**Status**: Findings documented, awaiting decision
**Scope**: All `apps/web/src/` files

---

## 1. Problem Statement

The codebase uses `ExtractedFact` as the core type name for evidence items extracted from sources. However, these are not verified facts -- they are **extracted evidence** (source claims, statistics, expert quotes, etc.). The name "Fact" implies truth, which contradicts the system's purpose of *verifying* claims.

The prompt layer already uses "Evidence" terminology correctly (see `extract-facts-base.ts`), but the internal TypeScript types and variables still use "Fact".

---

## 2. Current Usage Map

```
                         ExtractedFact (interface)
                               |
              +----------------+----------------+
              |                |                |
         types.ts         orchestrated.ts   monolithic-*.ts
         (definition)     (40+ usages)      (20+ usages)
              |
    +---------+---------+
    |         |         |
  facts[]  fact.id   fact.evidenceScope
    |
    +-- supportingFactIds (in ClaimVerdict)
    +-- factScopeAssignments (in orchestrated)
    +-- FactExtractionSchema (Zod schema)
    +-- renderFactCard / renderFactList (UI)
    +-- keyFactor* CSS classes (UI)
```

### Type Definitions (3)

| Location | Name | Description |
|----------|------|-------------|
| `types.ts:341` | `ExtractedFact` | Core interface: id, fact, category, specificity, sourceId, etc. |
| `types.ts:268` | `facts: ExtractedFact[]` | Field in `ResearchState` |
| `monolithic-canonical.ts:166` | `FactExtractionSchema` | Zod validation schema |

### Field Names Using "Fact" (5 distinct patterns)

| Pattern | Files | Count |
|---------|-------|-------|
| `facts` (array variable) | orchestrated.ts, monolithic-*.ts, types.ts | 50+ |
| `fact` (single item) | orchestrated.ts, page.tsx | 30+ |
| `supportingFactIds` | types.ts, orchestrated.ts, monolithic-canonical.ts | 15+ |
| `factScopeAssignments` | orchestrated.ts | 10+ |
| `factId` / `factIds` | orchestrated.ts, quality-gates.ts | 10+ |

### UI References (20+)

| Pattern | Location |
|---------|----------|
| `renderFactCard()` | page.tsx:793 |
| `renderFactList()` | page.tsx:809 |
| CSS: `factStat*`, `factItem*` | page.module.css |
| CSS: `keyFactor*` | page.module.css (note: "Factor" not "Fact") |

### Prompt Text

The prompts already use "Evidence" not "Fact":
- `extract-facts-base.ts`: "**Evidence**: Information extracted from sources"
- The LLM sees "Evidence" terminology, not "Fact"
- JSON output field name is still `facts` in the schema

---

## 3. Impact Analysis

### What Would Change

```
ExtractedFact      ->  ExtractedEvidence (or Evidence)
facts              ->  evidence (or extractedEvidence)
fact               ->  evidenceItem
supportingFactIds  ->  supportingEvidenceIds
factScopeAssignments -> evidenceScopeAssignments
FactExtractionSchema -> EvidenceExtractionSchema
renderFactCard     ->  renderEvidenceCard
renderFactList     ->  renderEvidenceList
factStat*          ->  evidenceStat* (CSS)
factItem*          ->  evidenceItem* (CSS)
```

### Files Affected

| Category | File Count | Estimated Changes |
|----------|-----------|-------------------|
| Core types | 2 | types.ts, index.ts |
| Analyzers | 4 | orchestrated.ts, monolithic-canonical.ts, monolithic-dynamic.ts, scopes.ts |
| Quality/validation | 3 | quality-gates.ts, verdict-corrections.ts, provenance-validation.ts |
| Config/aggregation | 2 | config.ts, aggregation.ts |
| UI | 2 | page.tsx, page.module.css |
| Prompts/schemas | 3 | extract-facts-base.ts, Zod schemas |
| **Total** | **~16 files** | **~200+ line changes** |

### Backward Compatibility Risks

1. **Stored JSON**: Jobs stored in the database have `facts` arrays in `resultJson`. Reading old jobs would break unless we add fallback parsing.
2. **API responses**: External consumers (if any) may expect `facts` field name.
3. **Zod schemas**: Renaming schema fields changes what the LLM must output -- requires re-testing all pipelines.

---

## 4. Recommendations

### Option A: Full Rename (Recommended for v3.0)

Rename `ExtractedFact` to `ExtractedEvidence` and all related fields. Do this as part of a major version bump.

**Pros**: Clean terminology, matches prompt language
**Cons**: ~200 changes, backward compat handling needed
**Effort**: Medium (mechanical rename + fallback parsing)

### Option B: Alias + Gradual Migration

```typescript
// types.ts
export interface ExtractedEvidence { /* ... */ }
/** @deprecated Use ExtractedEvidence */
export type ExtractedFact = ExtractedEvidence;
```

New code uses `ExtractedEvidence`, old code continues working. Migrate file-by-file.

**Pros**: No breaking changes, incremental
**Cons**: Two names coexist temporarily
**Effort**: Low initial, spread over time

### Option C: Comments Only (Minimum Viable)

Keep all names, add clarifying comments:
```typescript
/**
 * ExtractedEvidence item (legacy name: ExtractedFact).
 * Despite the name, this represents extracted evidence from sources,
 * not verified facts.
 */
export interface ExtractedFact { /* ... */ }
```

**Pros**: Zero risk, immediate
**Cons**: Confusing name persists
**Effort**: Minimal

---

## 5. Related Terminology Issues (Already Fixed)

These issues were found and fixed in the same audit session:

| Issue | Status |
|-------|--------|
| ArticleFrame definition inconsistent | Fixed -- now "Broader frame or topic of the input article" everywhere |
| `analysisContext` (singular) confused with AnalysisContext | Fixed -- added "NOTE: despite the field name, this is NOT an AnalysisContext" |
| `detectedScopes` field documentation misleading | Fixed -- clarified "legacy name, contains AnalysisContext objects" |
| "scope" used ambiguously for AnalysisContext | Fixed -- replaced with "AnalysisContext" in 20+ prompt locations |
| "proceeding" in comments/docs | Fixed -- updated to "AnalysisContext" |
| `proceedingAnswers`/`proceedingSummary` field names | Kept for backward compat, added "(legacy field name)" notes |

---

## 6. Decision Matrix

| Criteria | Option A | Option B | Option C |
|----------|----------|----------|----------|
| Terminology clarity | Best | Good | Poor |
| Breaking risk | High | Low | None |
| Effort | Medium | Low | Minimal |
| Timeline | v3.0 | Gradual | Immediate |
| **Recommendation** | **For v3.0** | **For now** | **Already done** |

**Recommended path**: Apply Option C now (done), then Option B when starting new feature work, then Option A at v3.0.
