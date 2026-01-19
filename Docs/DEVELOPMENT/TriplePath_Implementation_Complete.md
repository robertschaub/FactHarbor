# Triple-Path Pipeline — Implementation Complete

**Date**: 2026-01-17
**Version**: 2.6.33
**Status**: Implementation Complete - All Core Features Working

---

## Executive Summary

The Triple-Path Pipeline architecture has been fully implemented, enabling users to select between three analysis variants. All identified issues from the final audit have been resolved.

---

## Implementation Comparison Table

| Dimension | Orchestrated | Monolithic Canonical | Monolithic Dynamic |
|-----------|--------------|---------------------|-------------------|
| **Report Quality** | ⭐⭐⭐⭐⭐ Highest | ⭐⭐⭐⭐ High | ⭐⭐⭐ Good |
| **Multi-Scope Detection** | Excellent (native) | Good (LLM-inferred) | Limited |
| **Provenance Validation** | Full | Full | Full |
| **Schema Compliance** | Canonical | Canonical | Dynamic (flexible) |
| **UI Integration** | Full | Full | Experimental viewer |
| **LLM Calls** | 15-25 | 3-5 | 2-3 |
| **Estimated Cost** | $0.50-$2.00 | $0.15-$0.60 | $0.10-$0.40 |
| **Speed (typical)** | 2-5 minutes | 30-90 seconds | 20-60 seconds |
| **Token Usage** | High (staged context) | Medium (reset context) | Low (single context) |
| **Scope Separation** | Isolated analysis | Content-based inference | Single context |
| **Fallback Behavior** | N/A (baseline) | Falls back to Orchestrated | Returns experimental result |
| **Best For** | Complex multi-scope claims | Simple to moderate claims | Quick estimates, exploration |

### Recommendation by Use Case

| Use Case | Recommended Variant | Reason |
|----------|---------------------|--------|
| **Legal/regulatory comparisons** | Orchestrated | Best scope isolation |
| **Scientific claims** | Orchestrated | Rigorous evidence tracking |
| **News verification** | Monolithic Canonical | Good quality, faster |
| **Quick fact-check** | Monolithic Canonical | Balance of speed/quality |
| **Exploratory analysis** | Monolithic Dynamic | Fastest, flexible output |
| **Cost-sensitive bulk** | Monolithic Dynamic | Lowest cost per check |

---

## Issues Resolved (from Audit Report)

### 1. Multi-Scope Detection ✅ FIXED
**Problem**: Monolithic paths collapsed findings into single `CTX_MAIN` scope.

**Solution**:
- Updated `VerdictSchema` with `detectedScopes` array
- LLM now identifies distinct analytical frames (legal, scientific, jurisdictional)
- `buildResultJson` maps LLM-detected scopes to result structure
- Content-based `inferScopeForFact()` associates facts with appropriate scopes

### 2. Provenance Validation ✅ FIXED
**Problem**: Monolithic paths skipped URL provenance validation.

**Solution**:
- Both monolithic pipelines now use `filterFactsByProvenance()`
- Facts with invalid/unreachable URLs are filtered before verdict
- Ensures Ground Realism invariant (no synthetic evidence)

### 3. UI Grounding Score ✅ FIXED
**Problem**: Citation density not visible to users.

**Solution**:
- `DynamicResultViewer` now displays grounding score badge
- Shows ratio of citations to narrative sentences
- Color-coded quality indicator (good/moderate/low)

### 4. Claim-Scope Association ✅ FIXED
**Problem**: `contextId` missing from claim verdicts.

**Solution**:
- Added `contextId` field to `claimVerdicts` in `buildResultJson`
- Facts now have `contextId` via content-based scope inference
- Multi-scope display in UI now works correctly

### 5. LLM Tiering ✅ IMPLEMENTED
**Problem**: All tasks used expensive high-tier models.

**Solution**:
- `getModelForTask("understand")` - cheaper model for planning
- `getModelForTask("extract_facts")` - cheaper model for extraction
- `getModelForTask("verdict")` - high-tier model for final synthesis

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Analyze Page: Variant Selector                                 │ │
│  │  [🎯 Orchestrated]  [🔬 Monolithic Beta]  [⚗️ Dynamic Exp.]   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API LAYER                                    │
│  ┌───────────────┐     ┌───────────────┐     ┌───────────────────┐  │
│  │ POST /jobs    │────▶│ JobEntity     │────▶│ PipelineVariant   │  │
│  │               │     │ + variant     │     │ Column (SQLite)   │  │
│  └───────────────┘     └───────────────┘     └───────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        RUNNER DISPATCH                               │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  dispatchByVariant(job.pipelineVariant)                         │ │
│  │    │                                                            │ │
│  │    ├── "orchestrated" ──────▶ runOrchestratedPipeline()        │ │
│  │    │                                                            │ │
│  │    ├── "monolithic_canonical" ▶ runMonolithicCanonical()       │ │
│  │    │   └── on error ──────────▶ fallback to orchestrated       │ │
│  │    │                                                            │ │
│  │    └── "monolithic_dynamic" ──▶ runMonolithicDynamic()         │ │
│  │        └── returns experimental result                          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ ORCHESTRATED  │    │  MONOLITHIC   │    │  MONOLITHIC   │
│   PIPELINE    │    │   CANONICAL   │    │    DYNAMIC    │
├───────────────┤    ├───────────────┤    ├───────────────┤
│ 5 Stages:     │    │ 3 Turns:      │    │ 3 Turns:      │
│ 1. Understand │    │ 1. Understand │    │ 1. Plan       │
│ 2. Research   │    │ 2. Research   │    │ 2. Research   │
│ 3. Synthesize │    │ 3. Verdict    │    │ 3. Analyze    │
│ 4. Verdict    │    │               │    │               │
│ 5. Finalize   │    │ Budget:       │    │ Budget:       │
│               │    │ - 8 searches  │    │ - 6 searches  │
│ Multi-scope   │    │ - 12 fetches  │    │ - 8 fetches   │
│ native        │    │ - 180s max    │    │ - 150s max    │
└───────────────┘    └───────────────┘    └───────────────┘
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────────────────────────────────────────────────────────┐
│                    SHARED PRIMITIVES                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ Budget     │  │ Search/    │  │ Provenance │  │ Truth Scale │  │
│  │ Tracker    │  │ Fetch      │  │ Validation │  │ (7-point)   │  │
│  └────────────┘  └────────────┘  └────────────┘  └─────────────┘  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ LLM        │  │ Config     │  │ Quality    │  │ Scope       │  │
│  │ Tiering    │  │ Manager    │  │ Gates      │  │ Detection   │  │
│  └────────────┘  └────────────┘  └────────────┘  └─────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│                      RESULT STORAGE                                │
│  ┌─────────────────────┐              ┌─────────────────────────┐  │
│  │  CANONICAL PAYLOAD  │              │   DYNAMIC PAYLOAD       │  │
│  │  - verdictSummary   │              │   - rawJson             │  │
│  │  - claimVerdicts    │              │   - citations[]         │  │
│  │  - facts            │              │   - summary             │  │
│  │  - scopes           │              │   - findings[]          │  │
│  │  - sources          │              │   - limitations[]       │  │
│  └─────────────────────┘              └─────────────────────────┘  │
│                │                                  │                │
│                └────────────┬────────────────────┘                │
│                             ▼                                      │
│                  ┌─────────────────────┐                          │
│                  │   RESULT ENVELOPE   │                          │
│                  │   - meta            │                          │
│                  │   - pipelineVariant │                          │
│                  │   - budgetStats     │                          │
│                  └─────────────────────┘                          │
└───────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│                         JOBS UI                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Pipeline Badge: 🎯 Orchestrated | 🔬 Beta | ⚗️ Experimental│  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  CANONICAL VIEWER          │  DYNAMIC VIEWER                │  │
│  │  - Verdict wheel           │  - Grounding score             │  │
│  │  - Multi-scope tabs        │  - Findings list               │  │
│  │  - Facts with sources      │  - Citations                   │  │
│  │  - Quality gates           │  - Experimental badge          │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

---

## Budget Configurations

```typescript
// Orchestrated (via budgets.ts)
{
  maxIterationsPerScope: 3,
  maxTotalIterations: 12,
  maxTotalTokens: 500000,
  enforceBudgets: true
}

// Monolithic Canonical
{
  maxIterations: 4,
  maxSearches: 8,
  maxFetches: 12,
  timeoutMs: 180_000  // 3 minutes
}

// Monolithic Dynamic
{
  maxIterations: 4,
  maxSearches: 6,
  maxFetches: 8,
  timeoutMs: 150_000  // 2.5 minutes
}
```

---

## LLM Tiering Configuration

When `FH_LLM_TIERING=on`:

| Task | Environment Variable | Recommended Model | Purpose |
|------|---------------------|-------------------|---------|
| Understanding | `FH_MODEL_UNDERSTAND` | claude-3-5-haiku | Claim extraction, planning |
| Fact Extraction | `FH_MODEL_EXTRACT_FACTS` | claude-3-5-haiku | Evidence extraction |
| Final Verdict | `FH_MODEL_VERDICT` | claude-sonnet-4 | Synthesis, reasoning |

---

## Files Modified

### Core Pipeline
- `apps/web/src/lib/analyzer/monolithic-canonical.ts`
  - Added `VerdictSchema.detectedScopes` for multi-scope detection (legacy naming)
  - Added `inferScopeForFact()` for fact-scope association
  - Added `contextId` to claim verdicts
  - Integrated provenance validation via `filterFactsByProvenance()`
  - Uses `getModelForTask()` for LLM tiering

- `apps/web/src/lib/analyzer/monolithic-dynamic.ts`
  - Integrated provenance validation
  - Uses `getModelForTask()` for LLM tiering

### UI
- `apps/web/src/app/analyze/page.tsx`
  - Pipeline variant selector with descriptions

- `apps/web/src/app/jobs/[id]/page.tsx`
  - Pipeline variant badge display
  - `DynamicResultViewer` with grounding score, findings, limitations

- `apps/web/src/app/jobs/[id]/page.module.css`
  - Styles for dynamic viewer components

### Tests
- `apps/web/src/lib/analyzer/multi-jurisdiction.test.ts`
  - Scope separation verification
  - Neutrality test (order independence)
  - Cost linearity test

### Configuration
- `apps/web/.env.example`
  - Comprehensive documentation with recommended settings

---

## Testing Checklist

- [x] Pipeline variant selector visible on analyze page
- [x] Orchestrated pipeline works as before
- [x] Monolithic Canonical produces canonical schema
- [x] Monolithic Canonical detects multiple scopes
- [x] Monolithic Dynamic shows experimental warning
- [x] Jobs page shows pipeline variant badge
- [x] Grounding score displays in dynamic viewer
- [x] Provenance validation filters invalid URLs
- [x] LLM tiering uses correct models per task
- [x] Budget limits enforced

---

## Next Steps (Optional Enhancements)

1. **Advanced Scope Detection**: Have LLM return fact-to-scope mappings during extraction phase
2. **Comparative Analysis Mode**: Side-by-side comparison of claims from different scopes
3. **Cost Tracking Dashboard**: Persist and display token usage per variant
4. **A/B Testing Framework**: Compare variant quality on same inputs

---

**Implementation Status**: COMPLETE
**Ready for**: Testing and Production Deployment
