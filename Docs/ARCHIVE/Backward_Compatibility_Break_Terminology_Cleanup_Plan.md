# Backward Compatibility Break - Terminology Cleanup Plan

**Status:** ✅ APPROVED
**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Author Role:** Senior Developer
**Reviewed By:** Lead Developer (2026-02-04)

---

## Context

We are now allowed to break backward compatibility to eliminate remaining terminology confusion and align all layers (LLM prompts, TypeScript types, schemas, UI, docs, and stored results) to the canonical terms:

- **AnalysisContext** = top-level bounded analytical frame requiring separate verdicts  
- **EvidenceScope** = per‑evidence source methodology metadata  
- **EvidenceItem** = extracted evidence (NOT a verified fact)  
- **Background details** = narrative framing or non‑verdict background (formerly `analysisContext` singular)

The goal is to remove **all remaining legacy/ambiguous names** (e.g., `fact`, `facts`, `detectedScopes`, `factScopeAssignments`, `supportingFactIds`) and replace them with clear, consistent naming.

---

## References

- `AGENTS.md`
- `Docs/REFERENCE/TERMINOLOGY.md`
- `Docs/ARCHITECTURE/Prompt_Architecture.md`
- `Docs/REFERENCE/Provider_Prompt_Formatting.md`
- `Docs/DEVELOPMENT/Coding_Guidelines.md`

---

## Pre‑Work Completed (Execution)

1. **Created snapshot branch**: `Before-Backward-Compatibility-Break`  
   - Note: Git does not allow spaces in branch names; hyphenated name used.
2. **Captured current DB state** in snapshot branch:
   - `apps/api/factharbor.db` committed to that branch.
3. **Main branch DB cleanup (non‑SR data)**:
   - Cleared all records in `apps/api/factharbor.db` (jobs/events only).
   - **Source Reliability data preserved** in `apps/web/source-reliability.db` (untouched).

**Decision:** Clear `apps/web/config.db` and `apps/web/prompt-versions.db`, then re‑seed defaults.
**Action taken:** Deleted both files and re‑initialized defaults by running `npm run build` in `apps/web`
(`config.db` recreated with default search/calculation/pipeline/sr configs; prompt‑versions removed).

---

## Comprehensive Analysis (Where Confusion Still Exists)

### A) Legacy field names in JSON/LLM output
Still present across prompts, parsing, and schemas:
- `detectedScopes` (should be `analysisContexts`)
- `factScopeAssignments` (should be `evidenceContextAssignments` or similar)
- `supportingFactIds` (should be `supportingEvidenceIds`)
- `facts[]` / `fact` (should be `evidenceItems[]` / `statement` or `evidenceText`)
- `analysisContext` (singular) is used as background framing but collides with AnalysisContext terminology

### B) Code & schema surface area
Primary hotspots (non‑exhaustive):
- Types & schemas: `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/config-schemas.ts`
- Core pipelines: `apps/web/src/lib/analyzer/{orchestrated,monolithic-*,aggregation,quality-gates,scopes}.ts`
- Prompt builder & prompt files: `apps/web/src/lib/analyzer/prompts/**` and `apps/web/prompts/*.md`
- UI/UX: `apps/web/src/app/jobs/[id]/**`, `apps/web/src/components/**`
- API endpoints & storage: `apps/api/**` and job result JSON schemas
- Tests: `apps/web/test/unit/lib/analyzer/**`

### C) Evidence vs Fact terminology
Evidence is still labeled as “fact” in:
- Type fields (`fact`, `facts`)
- Prompt schemas and output examples
- Aggregation fields (e.g., `supportingFactIds`)
- UI copy (e.g., “facts” labels)

### D) Scope vs AnalysisContext terminology
“Scope” is still used as a synonym for AnalysisContext in:
- Config keys (`scopeDetection*`, `scopeDedupThreshold`, etc.)
- Function names (`detectScopes`, `formatDetectedScopesHint`)
- Prompt tasks (`scope_refinement`, `scope-refinement-base.ts`)

### E) Background framing collision
`analysisContext` (singular) is used for background framing, but collides with AnalysisContext terminology.

---

## Target Terminology (Post‑Break)

### Canonical terms
- **AnalysisContext** (array field: `analysisContexts`)
- **EvidenceScope** (per‑Evidence metadata field: `evidenceScope`)
- **EvidenceItem** (array field: `evidenceItems`)
- **Evidence statement field**: `statement`
- **Background framing**: `backgroundDetails` (string; replaces `analysisContext` singular)

### Canonical field naming (proposed)
| Legacy | New |
|---|---|
| `detectedScopes` | `analysisContexts` |
| `factScopeAssignments` | `evidenceContextAssignments` |
| `claimScopeAssignments` | `claimContextAssignments` |
| `supportingFactIds` | `supportingEvidenceIds` |
| `facts[]` | `evidenceItems[]` |
| `fact` | `statement` |
| `analysisContext` (singular) | `backgroundDetails` |
| `scope_refinement` (task) | `analysis_context_refinement` |

---

## Implementation Plan (Breaking Change)

### Phase 0 — Prerequisites (DONE)
- Snapshot branch created: `Before-Backward-Compatibility-Break`
- Database snapshot committed in branch
- Main DB cleared (non‑SR data)

### Phase 1 — Types, Schemas, and Core Models
- Replace `fact` with `statement`, `facts` with `evidenceItems` in:
  - `apps/web/src/lib/analyzer/types.ts`
  - Zod schemas / validator objects
- Remove `ExtractedFact` alias and all `facts`-based legacy types
- Rename `supportingFactIds` → `supportingEvidenceIds` in claim and verdict models
- Rename `factScopeAssignments` / `claimScopeAssignments` to context‑named equivalents
- Rename `analysisContext` (singular background field) → `backgroundDetails`

### Phase 2 — Pipeline Logic & Prompt Composition
- Update pipeline logic to use new field names end‑to‑end:
  - orchestrated + monolithic pipelines
  - aggregation / quality‑gates / provenance / verdict corrections
  - evidence filters and assignment logic
- Update all prompts (base, provider, config adaptation, markdown prompts) to output:
  - `analysisContexts`, `evidenceItems`, `statement`, `supportingEvidenceIds`, `backgroundDetails`
- Rename prompt task labels and functions:
  - `scope_refinement` → `analysis_context_refinement`
  - `scope-refinement-base.ts` → `analysis-context-refinement-base.ts` (or similar)
  - `scopes.ts` → `analysis-contexts.ts` (or similar)

### Phase 3 — UI & API Alignment
- Update UI labels and data bindings:
  - “Facts” → “Evidence”
  - “Scope” → “AnalysisContext”
  - “Context” (bare) removed unless explicitly AnalysisContext
- Update API payloads / response schemas
- Adjust report generation outputs to use new names

### Phase 4 — Tests, Fixtures, and Docs
- Update all tests referencing legacy names
- Update documentation (Terminology, Prompt Architecture, API/Schema docs)
- Remove backward‑compatibility guidance from prompts & docs

### Phase 5 — Verification & Cleanup
- Build web app
- Run unit tests
- Manual smoke test on 2–3 sample inputs (non‑domain‑specific)
- Confirm source reliability remains intact
- Remove any remaining legacy references (`detectedScopes`, `facts`, `supportingFactIds`)

---

## Data Handling & Migration

Since the main DB has been cleared and SR data preserved separately, **no data migration is required** for historical results.  
If historical JSON payloads are needed later, they remain recoverable from the snapshot branch.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Missing a legacy field in UI or pipeline | Use repo‑wide search + compile errors as safety net |
| Prompt/schema mismatch | Update prompt tests and run build |
| Confusion between AnalysisContext vs EvidenceScope | Enforce canonical terms in prompts and code, remove “scope” alias |

---

## Review Log

| Date | Reviewer Role | Status | Comments |
|------|---------------|--------|----------|
| 2026-02-04 | Lead Developer | **APPROVED WITH COMMENTS** | See detailed review below |

---

## Lead Developer Review (2026-02-04)

### Overall Assessment: ✅ APPROVED

The plan is comprehensive, well-structured, and addresses all major terminology confusion points. The phased approach is sensible. Proceeding with implementation is approved.

### Decision Record

#### 1. Final Names — APPROVED

| Legacy Field | Approved New Name | Notes |
|--------------|-------------------|-------|
| `facts[]` | `evidenceItems[]` | ✅ Clear, matches our "Evidence" terminology |
| `fact` | `statement` | ✅ Neutral, avoids "fact" confusion |
| `analysisContext` (singular) | `backgroundDetails` | ✅ Eliminates collision with AnalysisContext |
| `detectedScopes` | `analysisContexts` | ✅ Already our canonical term |
| `factScopeAssignments` | `evidenceContextAssignments` | ✅ Clear mapping |
| `claimScopeAssignments` | `claimContextAssignments` | ✅ Consistent pattern |
| `supportingFactIds` | `supportingEvidenceIds` | ✅ Matches Evidence terminology |

#### 2. Config DB Clearing — APPROVED (Already Done)

The decision to clear `config.db` and `prompt-versions.db` and re-seed is correct. This avoids migration complexity and ensures a clean start.

#### 3. File Rename Strategy — APPROVED WITH PREFERENCES

| Current | Recommended New Name | Rationale |
|---------|---------------------|-----------|
| `scopes.ts` | `analysis-contexts.ts` | ✅ Matches canonical term |
| `scope-refinement-base.ts` | `context-refinement-base.ts` | Shorter; "context" is unambiguous in prompts directory |
| `scope_refinement` (task) | `context_refinement` | Shorter; consistent with file name |
| `getScopeRefinementBasePrompt` | `getContextRefinementBasePrompt` | Already have aliases; remove `Scope` variants |

**Note:** The `getXxxScopeRefinementVariant` functions already have `getXxxContextRefinementVariant` aliases. After migration, remove the `Scope` versions entirely.

### Additional Recommendations

#### A. Schema Version Bumps (REQUIRED)

When changing field names in config schemas, bump versions:
- `PipelineConfigSchema`: 2.1.0 → 3.0.0 (breaking change)
- `SearchConfigSchema`: 2.0.0 → 3.0.0
- `CalculationConfigSchema`: 2.0.0 → 3.0.0

This prevents old configs from being loaded with incompatible field expectations.

#### B. LLM Output Parsing (CRITICAL)

Update all JSON parsing logic in:
- `monolithic-canonical.ts` - Extract facts parsing
- `monolithic-dynamic.ts` - If applicable
- `orchestrated.ts` - Understand/ExtractFacts/ScopeRefinement parsing
- `aggregation.ts` - Fact ID references

**Pattern to follow:**
```typescript
// Before
const facts = response.facts || [];

// After
const evidenceItems = response.evidenceItems || [];
```

#### C. Prompt Output Schema Documentation

Create a clear OUTPUT SCHEMA section in each base prompt that explicitly lists the new field names. Example for extract-facts-base.ts:

```
## OUTPUT SCHEMA (v3.0)

{
  "evidenceItems": [
    {
      "id": "E1",
      "statement": "...",
      "sourceAuthority": "primary",
      "evidenceBasis": "documented",
      ...
    }
  ]
}
```

#### D. Test Coverage Checklist

Before Phase 5 verification, ensure tests cover:
- [ ] Understand phase outputs `analysisContexts` (not `detectedScopes`)
- [ ] ExtractFacts outputs `evidenceItems` with `statement` field
- [ ] ScopeRefinement outputs `evidenceContextAssignments`
- [ ] Verdict outputs `supportingEvidenceIds`
- [ ] Aggregation correctly references new field names
- [ ] UI renders "Evidence" labels (not "Facts")

#### E. Grep Verification Commands

Run these after implementation to catch stragglers:

```bash
# Legacy field names that should not exist
grep -r "detectedScopes" apps/web/src --include="*.ts" --include="*.tsx"
grep -r "factScopeAssignments" apps/web/src --include="*.ts"
grep -r "supportingFactIds" apps/web/src --include="*.ts"
grep -r '"facts"' apps/web/src --include="*.ts"  # Careful: may have false positives
grep -r '"fact"' apps/web/src --include="*.ts"   # Check context

# Legacy function names
grep -r "getScopeRefinement" apps/web/src --include="*.ts"  # Should only have aliases
grep -r "detectScopes" apps/web/src --include="*.ts"
```

### Risk Additions

| Risk | Mitigation |
|------|------------|
| LLM returns old field names during transition | Parsing should check for BOTH old and new names temporarily, log warnings for old names |
| Config schema version mismatch | Validate schema version on load, reject incompatible versions |
| UI hardcoded strings | Search for "fact", "Fact", "Facts", "scope", "Scope" in UI components |

### Implementation Order Recommendation

1. **Types first** (types.ts) - Establishes the contract
2. **Parsing logic** (monolithic-canonical.ts, orchestrated.ts) - Must handle both old/new during transition
3. **Prompts** - Update output schemas
4. **Tests** - Update expectations
5. **UI** - Update labels and bindings
6. **Final cleanup** - Remove old aliases and dual-parsing

### Sign-Off

| Reviewer | Role | Decision | Date |
|----------|------|----------|------|
| Claude | Lead Developer | **APPROVED** | 2026-02-04 |

**Proceed with Phase 1 implementation.** Report back after types.ts changes for intermediate review.
