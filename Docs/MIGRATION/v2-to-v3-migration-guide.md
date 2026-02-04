# FactHarbor v2.x to v3.0 Migration Guide

**Version:** 3.0.0
**Date:** 2026-02-04
**Breaking Change:** Yes

---

## Overview

FactHarbor v3.0 introduces a **terminology cleanup** to eliminate confusion between similar concepts. This is a **breaking change** that affects:

- TypeScript types and interfaces
- JSON field names (LLM input/output)
- Configuration schema fields
- UI labels and components

**Key Principle:** "Evidence" replaces "Fact" terminology throughout the codebase.

---

## Quick Reference: Field Name Changes

### Core Data Fields

| v2.x Field | v3.0 Field | Description |
|------------|------------|-------------|
| `facts[]` | `evidenceItems[]` | Array of extracted evidence |
| `fact` | `statement` | The evidence text content |
| `analysisContext` (singular) | `backgroundDetails` | Article narrative framing |
| `detectedScopes` | `analysisContexts` | Top-level analytical frames |
| `factScopeAssignments` | `evidenceContextAssignments` | Evidence-to-context mapping |
| `claimScopeAssignments` | `claimContextAssignments` | Claim-to-context mapping |
| `supportingFactIds` | `supportingEvidenceIds` | Evidence IDs supporting a verdict |

### Configuration Fields

| v2.x Config Field | v3.0 Config Field |
|-------------------|-------------------|
| `scopeDetectionMethod` | `contextDetectionMethod` |
| `scopeDetectionEnabled` | `contextDetectionEnabled` |
| `scopeDetectionMinConfidence` | `contextDetectionMinConfidence` |
| `scopeDedupThreshold` | `contextDedupThreshold` |

### Schema Versions

| Schema | v2.x Version | v3.0 Version |
|--------|--------------|--------------|
| PipelineConfigSchema | 2.1.0 | 3.0.0 |
| SearchConfigSchema | 2.0.0 | 3.0.0 |
| CalculationConfigSchema | 2.0.0 | 3.0.0 |

---

## Terminology Glossary

### Canonical Terms (v3.0)

| Term | Definition |
|------|------------|
| **AnalysisContext** | Top-level bounded analytical frame requiring a separate verdict (e.g., "Legal Case A" vs "Legal Case B") |
| **EvidenceScope** | Per-evidence metadata describing the source's methodology/boundaries (e.g., "WTW analysis", "EU standards") |
| **EvidenceItem** | A single piece of extracted evidence from a source |
| **statement** | The text content of an EvidenceItem |
| **backgroundDetails** | Article-level narrative framing (NOT an AnalysisContext) |

### Retired Terms

| Retired Term | Replaced By | Notes |
|--------------|-------------|-------|
| `ExtractedFact` | `EvidenceItem` | Type alias removed |
| `DistinctProceeding` | `AnalysisContext` | Type alias removed |
| `fact` (field) | `statement` | Field renamed |
| `ArticleFrame` | `backgroundDetails` | Concept renamed |
| `scope` (for AnalysisContext) | `context` | Config fields renamed |

---

## Migration Steps

### Step 1: Clear Existing Data

FactHarbor v3.0 requires a clean database due to schema changes.

```bash
# Backup existing data if needed
cp apps/api/factharbor.db apps/api/factharbor.db.v2-backup

# The v3.0 build will automatically re-seed default configs
# Old job results are incompatible and should be cleared
```

**Note:** Source Reliability data (`apps/web/source-reliability.db`) is preserved and compatible.

### Step 2: Update Custom Configurations

If you have custom pipeline/search/calculation configurations:

1. Export your current configs
2. Update field names per the mapping table above
3. Update `schemaVersion` to `"3.0.0"`
4. Re-import after upgrading

**Example config update:**

```json
// Before (v2.x)
{
  "schemaVersion": "2.1.0",
  "scopeDetectionEnabled": true,
  "scopeDetectionMethod": "llm"
}

// After (v3.0)
{
  "schemaVersion": "3.0.0",
  "contextDetectionEnabled": true,
  "contextDetectionMethod": "llm"
}
```

### Step 3: Update Custom Code/Integrations

If you have custom code that reads FactHarbor output:

```typescript
// Before (v2.x)
const facts = result.understanding.facts;
const context = result.understanding.analysisContext;
const scopes = result.understanding.detectedScopes;

// After (v3.0)
const evidenceItems = result.understanding.evidenceItems;
const background = result.understanding.backgroundDetails;
const contexts = result.understanding.analysisContexts;
```

### Step 4: Rebuild and Verify

```bash
cd apps/web
npm run build

# Verify no schema errors
npm run test
```

---

## Backward Compatibility

### LLM Output Parsing

The v3.0 codebase includes **dual-parsing fallbacks** for LLM responses. If an LLM returns old field names, they will be accepted with a warning logged:

```
[WARN] Legacy field name used: "facts" → use "evidenceItems"
```

This ensures gradual transition as LLM prompts are updated.

### API Responses

API responses now use the new field names. If you have external integrations, update them to expect:
- `evidenceItems` instead of `facts`
- `statement` instead of `fact`
- `backgroundDetails` instead of `analysisContext`
- `analysisContexts` instead of `detectedScopes`

---

## Common Issues

### Issue: "Schema version mismatch" error

**Cause:** Old config file with v2.x schema version

**Solution:** Update `schemaVersion` field to `"3.0.0"` in your config files, or delete config.db to re-seed defaults.

### Issue: TypeScript errors for `ExtractedFact` or `DistinctProceeding`

**Cause:** These type aliases were removed

**Solution:** Replace with `EvidenceItem` and `AnalysisContext` respectively.

### Issue: UI shows "undefined" for background details

**Cause:** Old stored results use `analysisContext` field

**Solution:** Clear old job results and re-run analysis. The v3.0 UI falls back to legacy field names for display.

---

## v3.1 (In Progress)

The following changes are being implemented in v3.1:

| Item | Status | Description |
|------|--------|-------------|
| ID prefix F→E | ✅ DONE | Evidence IDs now use E1,E2 prefix |
| Task name changes | ✅ DONE | `extract_facts` → `extract_evidence`, `scope_refinement` → `context_refinement` |

**Note:** v3.1 maintains backward compatibility with v3.0 during transition (dual-parsing for IDs, dual-read for metrics).

---

## Support

If you encounter migration issues:
1. Check this guide for common issues
2. Review the [TERMINOLOGY.md](../REFERENCE/TERMINOLOGY.md) reference
3. File an issue at the project repository

---

## Changelog Summary

### v3.0.0 (2026-02-04)

**Breaking Changes:**
- Renamed `facts[]` → `evidenceItems[]`
- Renamed `fact` → `statement`
- Renamed `analysisContext` (singular) → `backgroundDetails`
- Renamed `detectedScopes` → `analysisContexts`
- Renamed `factScopeAssignments` → `evidenceContextAssignments`
- Renamed `claimScopeAssignments` → `claimContextAssignments`
- Renamed `supportingFactIds` → `supportingEvidenceIds`
- Renamed config fields `scopeDetection*` → `contextDetection*`
- Removed type aliases: `ExtractedFact`, `DistinctProceeding`
- Schema versions bumped to 3.0.0

**Files Renamed:**
- `scopes.ts` → `analysis-contexts.ts`
- `scope-refinement-base.ts` → `context-refinement-base.ts`
- `ArticleFrameBanner.tsx` → `BackgroundBanner.tsx`

**UI Changes:**
- "Article context" label → "Background"
- "Facts" labels → "Evidence"
- "Cross-scope" badge → "Cross-context"
