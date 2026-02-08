# Terminology Cleanup: AnalysisContext vs EvidenceScope

**Date:** 2026-01-31
**Updated:** 2026-02-01
**Version:** v2.0.0
**Status:** `[PHASE 1 COMPLETE]` ✅ - Aliases Implemented
**Author:** Claude Opus 4.5
**Priority:** MEDIUM (deferred for backward compatibility)
**Breaking Changes:** DEFERRED (add aliases first, renames later)
**Phase 1 Implementation:** Complete (42 aliases + 2 prompt updates across 17 files)

---

## ⚠️ Review Findings (2026-02-01)

> **Based on catalog review at [Terminology_Catalog_Five_Core_Terms.md](./Terminology_Catalog_Five_Core_Terms.md)**

### Key Findings

| Term | Review Status | Action |
|------|---------------|--------|
| **AnalysisContext** | `[DEFER]` | Scope→Context renames require backward-compat aliases FIRST |
| **EvidenceScope** | `[CORRECT]` | **NO CHANGES NEEDED** - usage is correct throughout codebase |
| **ArticleFrame** | `[DEFER]` | Field name collision - addressed in SEPARATE PLAN |
| **KeyFactor** | `[CORRECT]` | No changes needed - addressed in SEPARATE PLAN |
| **Fact/EvidenceItem** | `[DEFER]` | Phased migration ongoing - addressed in SEPARATE PLAN |

### Scope of This Document

This document covers ONLY:
- ✅ Renaming "Scope" → "Context" where it refers to AnalysisContext (NOT EvidenceScope)
- ✅ Adding backward-compatible aliases before any breaking changes

**OUT OF SCOPE (see separate plans):**
- ❌ ArticleFrame field name collision (`analysisContext` singular storing ArticleFrame)
- ❌ KeyFactor terminology (already correct)
- ❌ Fact/EvidenceItem migration (ongoing in separate phases)

### Backward Compatibility Requirement

**CRITICAL:** All breaking changes are DEFERRED. Phase 1 ONLY adds aliases and deprecation warnings.
Actual renames (Phase 2+) require explicit approval and will be scheduled after alias adoption period.

---

## Review Checklist

- [x] Terminology definitions reviewed and approved (2026-02-01)
- [x] EvidenceScope usage verified as CORRECT (no changes needed)
- [x] Phase 1: Alias-first strategy approved ✅
- [x] Type/interface alias strategy approved ✅
- [x] Function alias strategy approved ✅
- [x] Config key alias strategy approved ✅
- [x] UCM lexicon schema migration approved (v1.1 with alias) ✅
- [x] Prompt file updates approved ✅
- [x] Phase 1 Implementation COMPLETE (2026-02-01) ✅
- [ ] Rollout phases 2+ approved (deferred - requires stability period)

### Reviewer Notes (Historical - Pre-Implementation)

**The following issues were identified during initial review and have been RESOLVED in Phase 1:**

- ✅ **Prompt file path mismatch:** RESOLVED - Both prompts updated at correct paths (`apps/web/prompts/text-analysis/text-analysis-scope.prompt.md` and `apps/web/prompts/promptfoo/text-analysis-scope-prompt.txt`).
- ✅ **EvidenceScope usage conflation:** RESOLVED - `text-analysis-scope-prompt.txt` line 1 corrected to "AnalysisContext similarity specialist" with terminology clarification added.
- ✅ **Prompt terminology partially corrected:** CONFIRMED - `text-analysis-scope.prompt.md` now includes terminology clarification header. JSON output fields (`scopeA/scopeB`) remain unchanged per Phase 3 deferral.
- ✅ **Config aliasing not yet implemented:** RESOLVED - `PipelineConfigSchema` now includes `context*` keys with `scope*` aliases and `.transform()` migration. Environment variables (`FH_CONTEXT_*`) implemented with precedence over old names.

### 🔍 Additional Review Comments (2026-02-01)

> **Comprehensive codebase review performed - see below for findings**

#### ✅ Verification of Reviewer Notes
All four reviewer notes above have been **VERIFIED AS ACCURATE** through source code inspection:
1. Path mismatch confirmed: [apps/web/prompts/text-analysis/text-analysis-scope.prompt.md](../../apps/web/prompts/text-analysis/text-analysis-scope.prompt.md) (note the nested `/text-analysis/` directory)
2. Promptfoo conflation confirmed: Line 1 of [text-analysis-scope-prompt.txt](../../apps/web/prompts/promptfoo/text-analysis-scope-prompt.txt) says "evidence scopes" when it analyzes AnalysisContext similarity
3. Partial correction confirmed: Markdown prompt has correct terminology docs (lines 24-26) but outputs `scopeA/scopeB` (lines 89-90)
4. No aliases confirmed: [config-schemas.ts:76-161](../../apps/web/src/lib/config-schemas.ts#L76-L161) has only `scope*` keys, no `context*` aliases exist yet

#### 🔴 Critical Findings - Missing from Migration Plan

1. **Additional Functions Not Listed** ([scopes.ts](../../apps/web/src/lib/analyzer/scopes.ts)):
   - `canonicalizeScopes()` - line 571 → should add alias `canonicalizeContexts()`
   - `canonicalizeScopesWithRemap()` - line 667 → should add alias `canonicalizeContextsWithRemap()`
   - `ensureAtLeastOneScope()` - line 757 → should add alias `ensureAtLeastOneContext()`
   - `generateDeterministicScopeId()` - line 714 (listed in plan ✅)

2. **Prompt Provider Functions Missing** (not in Phase 1 alias list):
   - `getMistralScopeRefinementVariant()` - [providers/mistral.ts:207](../../apps/web/src/lib/analyzer/providers/mistral.ts#L207)
   - `getSupplementalScopesPrompt()` - [orchestrated-supplemental.ts:66](../../apps/web/src/lib/analyzer/orchestrated-supplemental.ts#L66)

3. **Local Type Alias Not Mentioned** ([orchestrated.ts:2038](../../apps/web/src/lib/analyzer/orchestrated.ts#L2038)):
   ```typescript
   interface Scope {
     id: string;
     name: string;
     // ... matches AnalysisContext
   }
   ```
   - This local `Scope` interface should be deprecated in favor of importing `AnalysisContext` type
   - Not mentioned anywhere in the migration plan

4. **Environment Variables Missing**:
   - `FH_SCOPE_PROMPT_MAX_FACTS` → needs `FH_CONTEXT_PROMPT_MAX_FACTS` alias
   - `FH_LLM_SCOPE_SIMILARITY` → needs `FH_CONTEXT_SIMILARITY` alias (mentioned in reviewer note but not in Phase 1 detailed plan)
   - Environment variable migration strategy not documented

5. **Additional Functions in orchestrated.ts** (not fully listed):
   - `refineScopesFromEvidence()` - line 142 → `refineContextsFromEvidence()`
   - `deduplicateScopes()` - line 979 → `deduplicateContexts()`
   - `enforceMinimumDirectClaimsPerScope()` - line 2807 → `enforceMinimumDirectClaimsPerContext()`

#### ⚠️ Medium Priority Gaps

6. **Database & API Response Format** (not addressed):
   - What happens to stored `analysisContexts[]` field in database?
   - Do API response field names change? If so, when?
   - GraphQL schema updates (if applicable)?
   - Client SDK compatibility considerations?

7. **Test Fixtures & Mock Data**:
   - No mention of test file updates
   - Mock data may have hardcoded `scope*` field names
   - Integration test scenarios should verify alias compatibility

8. **UCM Lexicon File Storage**:
   - Plan covers schema changes but not file migration
   - Existing stored UCM configs at runtime need migration function (mentioned but not detailed)
   - What happens to configs stored in database vs file system?

#### 💡 Suggestions for Improvement

9. **Alias Count Accuracy**:
   - Document states "~40 aliases" but actual count appears higher
   - Functions: 31 found (vs 25 listed in appendix)
   - Types: 6 listed ✅
   - Config keys: 9 listed ✅
   - **Suggested total: ~46 aliases needed**

10. **Phase 1 Completeness Checklist Should Include**:
    - [ ] Environment variable aliases (FH_SCOPE_* → FH_CONTEXT_*)
    - [ ] Local type interfaces (orchestrated.ts `Scope` interface)
    - [ ] All canonicalization functions (3 functions)
    - [ ] All prompt provider functions (5 providers, not 4)
    - [ ] Supplemental prompt functions

11. **Backward Compatibility Testing**:
    - Document should specify testing mixed configs (both old and new keys present)
    - Test priority: new key takes precedence when both specified
    - Verify migration function logs warnings without breaking

#### ✅ Document Strengths

12. **What's Done Well**:
    - Excellent alias-first strategy (minimal breaking changes)
    - Comprehensive phase breakdown with clear deferral points
    - Strong backward compatibility focus
    - Accurate terminology definitions reference [types.ts:98-126](../../apps/web/src/lib/analyzer/types.ts#L98-L126)
    - Clear delineation between AnalysisContext and EvidenceScope
    - Good use of deprecation patterns (JSDoc @deprecated tags)

#### 📋 Recommended Additions to Appendix

13. **Complete Function List** (update Appendix line 723-751):
    - Add missing canonicalization functions (3)
    - Add missing prompt provider (Mistral)
    - Add supplemental prompt function
    - Add environment variables section
    - Add local type aliases section (orchestrated.ts Scope interface)

14. **Update File Count** (line 103-111):
    - Current: 8 files, ~40 aliases
    - Suggested: **9 files** (add orchestrated-supplemental.ts), **~46 aliases**

#### 🎯 Priority Actions Before Phase 1 Implementation

**Must Address:**
1. Add missing functions to Phase 1.2 alias list (6 additional functions)
2. Document environment variable migration strategy
3. Add local `Scope` interface deprecation to Phase 4 plan
4. Update alias count to ~46 (from ~40)

**Should Address:**
5. Add database/API response format considerations
6. Add test fixture migration notes
7. Clarify UCM file vs database storage migration

**Nice to Have:**
8. Expand testing requirements with mixed config scenarios
9. Add rollback strategy in case Phase 1 causes issues
10. Document monitoring/observability for deprecation warnings (Phase 2)

---

## Executive Summary

The codebase has **terminology confusion** where "Scope" is incorrectly used to mean "AnalysisContext" (top-level analytical frame). However, the term "EvidenceScope" is used **correctly** for per-evidence source metadata.

**This plan adds ~40+ backward-compatible aliases first, with actual renames deferred to a later phase.**

### Correct Terminology (from types.ts:98-126)

| Term | Definition | Stored In | Status |
|------|------------|-----------|--------|
| **AnalysisContext** | Top-level bounded analytical frame (what the analysis evaluates) | `analysisContexts[]` | Rename "Scope" refs |
| **EvidenceScope** | Per-evidence source metadata (methodology/boundaries/time/geo) | `evidenceItem.evidenceScope` | `[CORRECT]` ✅ |

### Problem Summary

The code documentation correctly defines both concepts, but **some code naming doesn't follow its own documentation**:
- Functions named `detectScopes*()` actually detect AnalysisContexts
- Types named `DetectedScope` actually represent detected AnalysisContexts
- Config keys use `scope*` when they configure AnalysisContext detection
- UCM lexicon uses `scopeHeuristics` for AnalysisContext detection patterns

**NOTE:** EvidenceScope usage IS correct throughout - only "Scope" used for AnalysisContext needs fixing.

---

## Impact Analysis

### Scope Clarification

| What | Needs Change? | Notes |
|------|---------------|-------|
| `DetectedScope` type | YES → add alias | Actually detects AnalysisContext |
| `detectScopes*()` functions | YES → add alias | Actually detect AnalysisContext |
| `EvidenceScope` type | **NO** ✅ | Used correctly for per-evidence metadata |
| `evidenceItem.evidenceScope` field | **NO** ✅ | Used correctly |
| EvidenceScope in prompts | **NO** ✅ | Used correctly |

### Files Modified (Phase 1 Implementation Complete) ✅

| Category | Files | Changes |
|----------|-------|---------|
| **Core analyzer files** | 6 files | 23 function + 5 type aliases |
| - scopes.ts | | 2 type + 12 function aliases |
| - config.ts | | 2 function aliases |
| - budgets.ts | | 1 function alias + fallback logic |
| - text-analysis-types.ts | | 3 type aliases |
| - orchestrated.ts | | 1 env var alias |
| - text-analysis-service.ts | | 1 env var alias |
| **Config & validation** | 3 files | 8 config + 2 env var + 2 lexicon aliases |
| - config-schemas.ts | | Schema aliases + migrations |
| - lexicon-utils.ts | | Lexicon fallback logic |
| - config-validation-warnings.ts | | Validation with new keys |
| **Prompt files** | 6 files | Function aliases + terminology updates |
| - scope-refinement-base.ts | | 1 function alias |
| - orchestrated-supplemental.ts | | 2 function aliases |
| - anthropic.ts | | 1 function alias |
| - openai.ts | | 1 function alias |
| - google.ts | | 1 function alias |
| - mistral.ts | | 1 function alias |
| **Prompt content** | 2 files | Terminology clarifications |
| - text-analysis-scope.prompt.md | | Terminology header added |
| - text-analysis-scope-prompt.txt | | Line 1 + header corrected |
| **Total Phase 1** | **17 files** | **42 aliases + 2 prompt updates** |

> **✅ IMPLEMENTATION COMPLETE:** Phase 1 implemented with 42 aliases across 17 files (6 core, 3 config/validation, 6 prompt providers, 2 prompt content). Excluded internal/non-exported functions from orchestrated.ts (9 functions) that don't require public aliases.

### Deferred Breaking Changes (Phase 2+)

| Change Type | Impact | Status |
|-------------|--------|--------|
| Type renames (DetectedScope → DetectedAnalysisContext) | Import statements break | `[DEFERRED]` - add alias first |
| Function renames (detectScopes* → detectContexts*) | Call sites break | `[DEFERRED]` - add alias first |
| Config key renames (scope* → context*) | Existing configs invalid | `[DEFERRED]` - add alias first |
| UCM schema changes (scopeHeuristics → contextHeuristics) | Stored configs invalid | `[DEFERRED]` - add alias first |
| File renames (scopes.ts → contexts.ts) | Import paths break | `[DEFERRED]` - last phase |

---

## Detailed Migration Plan (Alias-First Approach)

> **IMPORTANT:** Phase 1 (Aliases Only) is the current active phase. All other phases are DEFERRED.

### Phase 0: Preparation (Complete)
- [x] Document correct terminology (types.ts:98-126)
- [x] Catalog all occurrences (Terminology_Catalog_Five_Core_Terms.md)
- [x] Review and confirm EvidenceScope is CORRECT (no changes needed)
- [x] Identify "Scope" used for AnalysisContext (this document)

---

### Phase 1: Add Aliases Only (NON-BREAKING) ← CURRENT PHASE

**Goal:** Add new correctly-named types/functions as ALIASES, keeping existing names working.

#### 1.1 Type Aliases

**File: `scopes.ts`** (keep file name for now)

```typescript
// NEW: Correctly-named types (PRIMARY)
export interface DetectedAnalysisContext {
  id: string;
  name: string;
  type: "methodological" | "legal" | "scientific" | "general" | "regulatory" | "temporal" | "geographic";
  metadata?: Record<string, any>;
}

// DEPRECATED: Old name kept for backward compatibility
/** @deprecated Use DetectedAnalysisContext instead - "Scope" here means AnalysisContext, not EvidenceScope */
export type DetectedScope = DetectedAnalysisContext;

// NEW: Correctly-named schema
export const ContextDetectionOutputSchema = z.object({ ... });

// DEPRECATED: Old name kept for backward compatibility
/** @deprecated Use ContextDetectionOutputSchema instead */
export const ScopeDetectionOutputSchema = ContextDetectionOutputSchema;
```

#### 1.2 Function Aliases

**File: `scopes.ts`** (keep file name for now)

```typescript
// NEW: Correctly-named functions (PRIMARY)
export function detectContextsHeuristic(text: string, config?: PipelineConfig): DetectedAnalysisContext[] | null {
  // ... implementation
}

// DEPRECATED: Old name kept for backward compatibility
/** @deprecated Use detectContextsHeuristic instead */
export const detectScopesHeuristic = detectContextsHeuristic;

// Repeat pattern for all functions:
export const detectContextsLLM = /* implementation */;
/** @deprecated */ export const detectScopesLLM = detectContextsLLM;

export const detectContextsHybrid = /* implementation */;
/** @deprecated */ export const detectScopesHybrid = detectContextsHybrid;

export const detectContexts = /* implementation */;
/** @deprecated */ export const detectScopes = detectContexts;

export const formatDetectedContextsHint = /* implementation */;
/** @deprecated */ export const formatDetectedScopesHint = formatDetectedContextsHint;
```

**Functions to alias (scopes.ts):**

| Add New Name | Keep Old Name As Alias |
|--------------|------------------------|
| `setContextHeuristicsLexicon()` | `setScopeHeuristicsLexicon()` |
| `getContextHeuristicsPatternsConfig()` | `getScopeHeuristicsPatternsConfig()` |
| `detectContextsHeuristic()` | `detectScopesHeuristic()` |
| `detectContextsLLM()` | `detectScopesLLM()` |
| `detectContextsHybrid()` | `detectScopesHybrid()` |
| `detectContexts()` | `detectScopes()` |
| `formatDetectedContextsHint()` | `formatDetectedScopesHint()` |
| `canonicalizeInputForContextDetection()` | `canonicalizeInputForScopeDetection()` |
| `generateContextDetectionHint()` | `generateScopeDetectionHint()` |
| `generateDeterministicContextId()` | `generateDeterministicScopeId()` |
| **`canonicalizeContexts()`** ⚠️ | **`canonicalizeScopes()`** (scopes.ts:571) |
| **`canonicalizeContextsWithRemap()`** ⚠️ | **`canonicalizeScopesWithRemap()`** (scopes.ts:667) |
| **`ensureAtLeastOneContext()`** ⚠️ | **`ensureAtLeastOneScope()`** (scopes.ts:757) |

**Note:** `contextTypeRank` alias already exists at config.ts:328 ✅

> **⚠️ REVIEW FINDING:** Lines marked with ⚠️ were missing from the original list but exist in scopes.ts and need aliases

**Functions to alias (other files):**

| File | Add New Name | Keep Old Name As Alias |
|------|--------------|------------------------|
| config.ts | `inferContextTypeLabel()` | `inferScopeTypeLabel()` ✅ |
| config.ts | `sanitizeContextShortAnswer()` | `sanitizeScopeShortAnswer()` ✅ |
| budgets.ts | `checkContextIterationBudget()` | `checkScopeIterationBudget()` ✅ |
| ~~orchestrated.ts~~ | ~~`refineContextsFromEvidence()`~~ | ~~`refineScopesFromEvidence()`~~ ❌ NOT APPLICABLE |
| ~~orchestrated.ts~~ | ~~`selectFactsForContextRefinementPrompt()`~~ | ~~`selectFactsForScopeRefinementPrompt()`~~ ❌ NOT APPLICABLE |
| ~~orchestrated.ts~~ | ~~`calculateContextSimilarity()`~~ | ~~`calculateScopeSimilarity()`~~ ❌ NOT APPLICABLE |
| ~~orchestrated.ts~~ | ~~`mergeContextMetadata()`~~ | ~~`mergeScopeMetadata()`~~ ❌ NOT APPLICABLE |
| ~~orchestrated.ts~~ | ~~`deduplicateContexts()`~~ | ~~`deduplicateScopes()`~~ ❌ NOT APPLICABLE |
| ~~orchestrated.ts~~ | ~~`validateAndFixContextNameAlignment()`~~ | ~~`validateAndFixScopeNameAlignment()`~~ ❌ NOT APPLICABLE |
| ~~orchestrated.ts~~ | ~~`enforceMinimumDirectClaimsPerContext()`~~ | ~~`enforceMinimumDirectClaimsPerScope()`~~ ❌ NOT APPLICABLE |
| ~~orchestrated.ts~~ | ~~`generateMultiContextVerdicts()`~~ | ~~`generateMultiScopeVerdicts()`~~ ❌ NOT APPLICABLE |
| ~~orchestrated.ts~~ | ~~`generateSingleContextVerdicts()`~~ | ~~`generateSingleScopeVerdicts()`~~ ❌ NOT APPLICABLE |
| orchestrated-supplemental.ts | `getSupplementalContextsPrompt()` | `getSupplementalScopesPrompt()` ✅ |
| orchestrated-supplemental.ts | `getSupplementalContextsPromptForProvider()` | `getSupplementalScopesPromptForProvider()` ✅ |
| text-analysis-types.ts | `ContextPair` | `ScopePair` ✅ |
| text-analysis-types.ts | `ContextSimilarityRequest` | `ScopeSimilarityRequest` ✅ |
| text-analysis-types.ts | `ContextSimilarityResult` | `ScopeSimilarityResult` ✅ |
| ~~text-analysis-types.ts~~ | ~~`analyzeContextSimilarity()`~~ | ~~`analyzeScopeSimilarity()`~~ ❌ NOT EXPORTED |
| ~~text-analysis-llm.ts~~ | ~~`ContextSimilarityResultSchema`~~ | ~~`ScopeSimilarityResultSchema`~~ ❌ INTERNAL CONST |
| ~~text-analysis-llm.ts~~ | ~~`ContextSimilarityResponseSchema`~~ | ~~`ScopeSimilarityResponseSchema`~~ ❌ INTERNAL CONST |
| providers/mistral.ts | `getMistralContextRefinementVariant()` | `getMistralScopeRefinementVariant()` ✅ |

> **⚠️ IMPLEMENTATION NOTE:** orchestrated.ts functions are NOT exported (internal helpers only). No public aliases needed. text-analysis-llm.ts schemas are internal constants (not exported). Strikethrough entries are NOT APPLICABLE to Phase 1.

#### 1.3 Config Key Aliases

**File: `config-schemas.ts` - PipelineConfigSchema**

```typescript
// PHASE 1: Add new keys, keep old keys working (both accepted)
export const PipelineConfigSchema = z.object({
  // NEW: Correctly-named keys (PRIMARY)
  contextDedupThreshold: z.number().min(0).max(1).optional()
    .describe("Threshold for AnalysisContext deduplication (0-1)"),
  contextDetectionMethod: z.enum(["heuristic", "llm", "hybrid"]).optional()
    .describe("AnalysisContext detection method"),
  contextDetectionEnabled: z.boolean().optional()
    .describe("Enable AnalysisContext detection"),
  contextDetectionMinConfidence: z.number().min(0).max(1).optional()
    .describe("Minimum confidence for LLM-detected AnalysisContexts"),
  maxIterationsPerContext: z.number().int().min(1).optional()
    .describe("Max iterations per AnalysisContext"),

  // DEPRECATED: Old keys still accepted for backward compatibility
  /** @deprecated Use contextDedupThreshold */
  scopeDedupThreshold: z.number().min(0).max(1).optional(),
  /** @deprecated Use contextDetectionMethod */
  scopeDetectionMethod: z.enum(["heuristic", "llm", "hybrid"]).optional(),
  /** @deprecated Use contextDetectionEnabled */
  scopeDetectionEnabled: z.boolean().optional(),
  /** @deprecated Use contextDetectionMinConfidence */
  scopeDetectionMinConfidence: z.number().min(0).max(1).optional(),
  /** @deprecated Use maxIterationsPerContext */
  maxIterationsPerScope: z.number().int().min(1).optional(),
});

// Runtime migration function (logs deprecation warnings)
function migrateDeprecatedConfigKeys(config: any): PipelineConfig {
  const migrated = { ...config };
  const warnings: string[] = [];

  if ('scopeDedupThreshold' in config && !('contextDedupThreshold' in config)) {
    migrated.contextDedupThreshold = config.scopeDedupThreshold;
    warnings.push('scopeDedupThreshold → contextDedupThreshold');
  }
  // ... repeat for all deprecated keys

  if (warnings.length > 0) {
    console.warn(`[DEPRECATED] Config keys migrated: ${warnings.join(', ')}`);
  }
  return migrated;
}
```

**Config keys to add (with old keys kept as aliases):**

| Add New Key | Keep Old Key Working |
|-------------|---------------------|
| `contextDedupThreshold` | `scopeDedupThreshold` |
| `contextDetectionMethod` | `scopeDetectionMethod` |
| `contextDetectionEnabled` | `scopeDetectionEnabled` |
| `contextDetectionMinConfidence` | `scopeDetectionMinConfidence` |
| `contextDetectionCustomPatterns` | `scopeDetectionCustomPatterns` |
| `contextFactorHints` | `scopeFactorHints` |
| `maxIterationsPerContext` | `maxIterationsPerScope` |
| `llmContextSimilarity` | `llmScopeSimilarity` |

**Note:** `scopeDetectionMaxContexts` is already correctly named ✅

**Environment variables to add (with old names kept working):** ⚠️

| Add New Env Var | Keep Old Env Var Working |
|-----------------|-------------------------|
| **`FH_CONTEXT_PROMPT_MAX_FACTS`** | `FH_SCOPE_PROMPT_MAX_FACTS` |
| **`FH_LLM_CONTEXT_SIMILARITY`** | `FH_LLM_SCOPE_SIMILARITY` |

> **⚠️ REVIEW FINDING:** Environment variables were mentioned in reviewer notes but not included in Phase 1 detailed plan. These need alias handling in the config loading code.

#### 1.4 UCM Lexicon Schema Aliases

**File: `config-schemas.ts` - AggregationLexiconSchema**

```typescript
// PHASE 1: Accept both old and new paths (v1.1 schema - backward compatible)
export const AggregationLexiconSchema = z.object({
  // NEW: Correctly-named section (PRIMARY)
  contextHeuristics: z.object({
    comparisonPatterns: z.array(z.string()).optional(),
    efficiencyKeywords: z.array(z.string()).optional(),
    // ... other patterns
  }).optional(),

  // DEPRECATED: Old section name still accepted
  /** @deprecated Use contextHeuristics */
  scopeHeuristics: z.object({ /* same shape */ }).optional(),

  // NEW: Correctly-named section (PRIMARY)
  contextCanonicalization: z.object({
    predicateStarters: z.array(z.string()).optional(),
    // ... other fields
  }).optional(),

  // DEPRECATED: Old section name still accepted
  /** @deprecated Use contextCanonicalization */
  scopeCanonicalization: z.object({ /* same shape */ }).optional(),
});

// Runtime merge function (v1 → v1.1 compatibility)
function mergeDeprecatedLexiconKeys(lexicon: any): AggregationLexicon {
  const merged = { ...lexicon };

  // If old keys exist and new don't, copy over
  if (lexicon.scopeHeuristics && !lexicon.contextHeuristics) {
    merged.contextHeuristics = lexicon.scopeHeuristics;
    console.warn('[DEPRECATED] scopeHeuristics → contextHeuristics');
  }
  if (lexicon.scopeCanonicalization && !lexicon.contextCanonicalization) {
    merged.contextCanonicalization = lexicon.scopeCanonicalization;
    console.warn('[DEPRECATED] scopeCanonicalization → contextCanonicalization');
  }

  return merged;
}
```

**Schema Version Strategy:**
- Current: `aggregation-lexicon.v1` (old keys only)
- Phase 1: `aggregation-lexicon.v1.1` (accepts both old and new keys)
- Phase 2 (DEFERRED): `aggregation-lexicon.v2` (new keys only)

**UCM paths to add (with old paths kept working):**

| Add New Path | Keep Old Path Working |
|--------------|----------------------|
| `contextHeuristics.comparisonPatterns` | `scopeHeuristics.comparisonPatterns` |
| `contextHeuristics.efficiencyKeywords` | `scopeHeuristics.efficiencyKeywords` |
| `contextHeuristics.legalFairnessPatterns` | `scopeHeuristics.legalFairnessPatterns` |
| `contextHeuristics.legalProcessKeywords` | `scopeHeuristics.legalProcessKeywords` |
| `contextHeuristics.internationalCuePatterns` | `scopeHeuristics.internationalCuePatterns` |
| `contextHeuristics.envHealthPatterns` | `scopeHeuristics.envHealthPatterns` |
| `contextCanonicalization.predicateStarters` | `scopeCanonicalization.predicateStarters` |
| `contextCanonicalization.fillerWords` | `scopeCanonicalization.fillerWords` |
| `contextCanonicalization.legalTerms` | `scopeCanonicalization.legalTerms` |
| `contextCanonicalization.jurisdictionIndicators` | `scopeCanonicalization.jurisdictionIndicators` |

#### 1.5 Prompt File Updates (Phase 1 - Comments Only)

**Phase 1 (Non-Breaking):** Add terminology clarification comments to prompts.

**File: `apps/web/prompts/text-analysis/text-analysis-scope.prompt.md`** ⚠️

```markdown
## TERMINOLOGY CLARIFICATION
- "Scope" in this prompt refers to AnalysisContext (top-level analytical frame)
- This is NOT the same as EvidenceScope (per-evidence source metadata)
- See types.ts:98-126 for canonical definitions
```

> **⚠️ REVIEW FINDING:** Original plan had incorrect path `text-analysis-scope.prompt.md` - corrected to include nested `/text-analysis/` directory

**File: `apps/web/prompts/promptfoo/text-analysis-scope-prompt.txt`**

Add header clarification (same as above).

**CRITICAL FIX NEEDED:** Line 1 currently says "scope analysis specialist determining semantic relationships between evidence scopes" - this conflates EvidenceScope with AnalysisContext. Should say:
```
You are an AnalysisContext similarity specialist determining semantic relationships between AnalysisContexts.
```

**DEFERRED (Phase 2+):** JSON field renames (`scopeA` → `contextA`) require LLM output parser updates.

---

### Phase 2: Deprecation Warnings (DEFERRED)

> **Status:** DEFERRED until Phase 1 aliases are deployed and stable.

**Goal:** Emit console warnings when deprecated names are used.

```typescript
// Example: Add runtime warnings
export function detectScopesHeuristic(...args) {
  console.warn('[DEPRECATED] detectScopesHeuristic() is deprecated, use detectContextsHeuristic()');
  return detectContextsHeuristic(...args);
}
```

**Criteria to proceed to Phase 2:**
- [ ] Phase 1 aliases deployed to production
- [ ] No breaking changes reported for 2+ weeks
- [ ] Internal code migrated to use new names

---

### Phase 3: Prompt JSON Field Renames (DEFERRED)

> **Status:** DEFERRED - Requires parser updates and LLM output format changes.

**File: `text-analysis-scope.prompt.md` → `text-analysis-context-similarity.prompt.md`**

| Current | Correct | Status |
|---------|---------|--------|
| `"scopeA": "..."` | `"contextA": "..."` | `[DEFERRED]` |
| `"scopeB": "..."` | `"contextB": "..."` | `[DEFERRED]` |
| File name | `text-analysis-context-similarity.prompt.md` | `[DEFERRED]` |

**Criteria to proceed:**
- [ ] Phase 2 deprecation warnings active
- [ ] LLM output parsers updated to accept both formats
- [ ] Prompt version bumped (e.g., 2.0.0)

---

### Phase 4: Variable/Field Renames (DEFERRED)

> **Status:** DEFERRED - Breaking changes to internal code.

**File: `orchestrated.ts` (~80 variable renames)**

| Pattern | Count | Status |
|---------|-------|--------|
| `scope*` variables | ~40 | `[DEFERRED]` |
| `*Scope*` variables | ~20 | `[DEFERRED]` |
| `*scope*` in comments | ~20 | Can update in Phase 1 |

**Local Type Alias Removal:** ⚠️

The file `orchestrated.ts` (line 2038) contains a local `Scope` interface that duplicates `AnalysisContext`:

```typescript
interface Scope {
  id: string;
  name: string;
  // ... matches AnalysisContext structure
}
```

**Phase 4 Action:**
- [ ] Remove local `Scope` interface
- [ ] Replace all usages with imported `AnalysisContext` type from types.ts
- [ ] Update function signatures using local `Scope` type

> **⚠️ REVIEW FINDING:** This local interface was not mentioned in the original plan but should be addressed in Phase 4

**Criteria to proceed:**
- [ ] All external interfaces use new names
- [ ] Deprecation period complete (4+ weeks)

---

### Phase 5: Database Prompt Table Updates (DEFERRED)

> **Status:** DEFERRED - Requires Phase 3 (JSON field renames) first.

**Required Updates (when Phase 3 is approved):**

1. **Prompt profiles table:**
   - Rename profile `text-analysis-scope` → `text-analysis-context-similarity`
   - Or: Keep old name, update content only

2. **Prompt content updates:**
   - Update JSON output schema in stored prompts
   - Bump prompt version (e.g., 1.3.0 → 2.0.0)
   - Regenerate content hash

3. **Reseed script:**
   ```bash
   cd apps/web
   npx tsx scripts/reseed-text-analysis-prompts.ts
   ```

---

### Phase 6: File Renames (DEFERRED - LAST PHASE)

> **Status:** DEFERRED - Most disruptive change, requires all other phases complete.

| Current File | New File | Status |
|--------------|----------|--------|
| `scopes.ts` | `contexts.ts` | `[DEFERRED]` |
| `text-analysis-scope.prompt.md` | `text-analysis-context-similarity.prompt.md` | `[DEFERRED]` |
| `scope-refinement-base.ts` | `context-refinement-base.ts` | `[DEFERRED]` |
| `text-analysis-scope-prompt.txt` | `text-analysis-context-similarity-prompt.txt` | `[DEFERRED]` |

**Criteria to proceed:**
- [ ] All phases 1-5 complete
- [ ] Deprecation period complete (6+ weeks)
- [ ] Explicit approval from team

---

### Phase 7: Remove Deprecated Aliases (FUTURE)

> **Status:** FUTURE - Not scheduled. Requires extended deprecation period.

**Actions:**
1. Remove all `scope*` type aliases
2. Remove all `scope*` function aliases
3. Remove all `scope*` config key aliases
4. Remove UCM v1 schema support
5. Remove JSON field backward compat in parsers

**Criteria to proceed:**
- [ ] All internal code uses new names
- [ ] External integrators notified (if any)
- [ ] 3+ month deprecation period complete

---

## Backward Compatibility Strategy

### Core Principle: Alias-First, Rename-Never (Until Approved)

1. **Phase 1:** Add new correctly-named exports as PRIMARY, keep old names as ALIASES
2. **Phase 2:** Add deprecation warnings when old names are used
3. **Phase 3+:** DEFERRED - Requires explicit approval

### Type Aliases Pattern

```typescript
// In scopes.ts (keep file name for now)

// PRIMARY: New correctly-named type
export interface DetectedAnalysisContext {
  id: string;
  name: string;
  type: "methodological" | "legal" | "scientific" | "general" | "regulatory" | "temporal" | "geographic";
  metadata?: Record<string, any>;
}

// ALIAS: Old name for backward compatibility (no deprecation warning in Phase 1)
export type DetectedScope = DetectedAnalysisContext;
```

### Function Aliases Pattern

```typescript
// PRIMARY: New correctly-named function
export function detectContextsHeuristic(text: string, config?: PipelineConfig): DetectedAnalysisContext[] | null {
  // ... implementation
}

// ALIAS: Old name for backward compatibility
export const detectScopesHeuristic = detectContextsHeuristic;
```

### Config Key Aliases Pattern

```typescript
// In config-schemas.ts - accept both keys
export const PipelineConfigSchema = z.object({
  // Both keys accepted, new key is primary
  contextDedupThreshold: z.number().min(0).max(1).optional(),
  scopeDedupThreshold: z.number().min(0).max(1).optional(), // alias
  // ... etc
}).refine(data => {
  // Merge old keys into new keys at runtime
  if (data.scopeDedupThreshold && !data.contextDedupThreshold) {
    data.contextDedupThreshold = data.scopeDedupThreshold;
  }
  return true;
});
```

### UCM Schema Coexistence Pattern

```typescript
// v1.1 schema accepts both old and new section names
export const AggregationLexiconSchemaV1_1 = z.object({
  contextHeuristics: z.object({ /* patterns */ }).optional(),
  scopeHeuristics: z.object({ /* patterns */ }).optional(), // alias
  // ... merge at runtime
});
```

---

## Rollout Plan (Alias-First Approach)

### Phase 1: Add Aliases (Week 1-2) ← CURRENT

**Branch:** `terminology-aliases-phase1`

**Week 1:**
- [ ] Create feature branch
- [ ] Add type aliases (DetectedAnalysisContext + DetectedScope alias)
- [ ] Add function aliases (detectContexts* + detectScopes* alias)
- [ ] Run full test suite - MUST PASS with zero changes to call sites

**Week 2:**
- [ ] Add config key aliases (contextDetection* + scopeDetection* alias)
- [ ] Add UCM lexicon aliases (contextHeuristics + scopeHeuristics alias)
- [ ] Add terminology clarification comments to prompts
- [ ] Deploy to staging
- [ ] Verify all analysis jobs work

### Phase 1 Completion Criteria
- [ ] All tests pass
- [ ] No breaking changes to existing code
- [ ] Old names continue to work exactly as before
- [ ] New names are available for new code

### Phase 1 Deployment (Week 3)
- [ ] Deploy to production
- [ ] Monitor for 2+ weeks
- [ ] Confirm stability

---

### Phase 2: Deprecation Warnings (DEFERRED - Week 5+)

**NOT SCHEDULED** - Requires Phase 1 stability period.

**When approved:**
- [ ] Add console.warn() to all deprecated aliases
- [ ] Update internal code to use new names
- [ ] Monitor deprecation warning logs

---

### Phase 3+: Breaking Changes (DEFERRED - Month 2+)

**NOT SCHEDULED** - Requires extended deprecation period.

**When approved:**
- [ ] Prompt JSON field renames (scopeA → contextA)
- [ ] Database prompt table updates
- [ ] File renames (scopes.ts → contexts.ts)

---

### Future: Remove Aliases (NOT SCHEDULED)

**Criteria to consider:**
- 3+ month deprecation period complete
- All internal code uses new names
- No external integrators using old names
- Explicit team approval

---

## Testing Requirements (Phase 1 Only)

### Unit Tests

1. **Type compatibility:**
   - `DetectedScope` alias resolves to `DetectedAnalysisContext`
   - `DetectedAnalysisContext` is the primary type
   - Both names are interchangeable in type annotations

2. **Function compatibility:**
   - `detectScopesHeuristic()` calls same implementation as `detectContextsHeuristic()`
   - Both function names produce identical results
   - All deprecated function aliases call correct primary functions

3. **Config compatibility:**
   - Old config keys (`scopeDedupThreshold`) still work
   - New config keys (`contextDedupThreshold`) work
   - Mixed configs (both keys) work (new key takes precedence)

4. **Environment variable compatibility:** ⚠️
   - Old env vars (`FH_SCOPE_PROMPT_MAX_FACTS`, `FH_LLM_SCOPE_SIMILARITY`) still work
   - New env vars (`FH_CONTEXT_PROMPT_MAX_FACTS`, `FH_LLM_CONTEXT_SIMILARITY`) work
   - New env var takes precedence when both are set

> **⚠️ REVIEW FINDING:** Environment variable testing was missing from original plan

5. **UCM lexicon compatibility:**
   - Old section names (`scopeHeuristics`) still work
   - New section names (`contextHeuristics`) work
   - Mixed configs (both sections) work

### Integration Tests

1. **Full analysis pipeline:**
   - Run analysis with old config → works (no changes needed)
   - Run analysis with new config → works
   - Run analysis with mixed config → works

2. **Zero Breaking Changes:**
   - All existing tests pass WITHOUT modification
   - No import statements need updating
   - No call sites need updating

### Regression Tests

Use existing test inputs:
1. "Electric cars are more efficient than gas cars" → same contexts detected
2. "The trial was unfair according to international observers" → same contexts detected
3. All promptfoo test cases pass unchanged

---

## Success Criteria (Phase 1 Only)

- [ ] All new correctly-named types/functions exported
- [ ] All old names continue to work as aliases
- [ ] Zero test failures (no test modifications needed)
- [ ] Zero breaking changes to existing code
- [ ] Existing stored UCM configs continue to work unchanged
- [ ] New code can use new names
- [ ] Documentation updated with terminology clarification

---

## Related Documents

- [types.ts:98-126](../apps/web/src/lib/analyzer/types.ts#L98-L126) - Correct terminology definitions
- [Terminology_Catalog_Five_Core_Terms.md](./Terminology_Catalog_Five_Core_Terms.md) - Complete catalog with review status
- [Hardcoded Heuristics UCM Migration Implementation Report](./Hardcoded_Heuristics_UCM_Migration_Implementation_Report.md)
- [LLM-Based Scope Detection Plan](./LLM-Based_Scope_Detection_with_UCM_Configuration.md)

### Separate Plans (Out of Scope)

These terminology issues are documented in the catalog but addressed in separate plans:

| Issue | Document | Status |
|-------|----------|--------|
| ArticleFrame field name collision | TBD | `[DEFER]` |
| Fact/EvidenceItem migration | Ongoing phases | `[DEFER]` |
| KeyFactor terminology | N/A (correct) | `[CORRECT]` |

---

## Appendix: Complete Identifier List

> **Note:** These are identifiers where "Scope" incorrectly refers to AnalysisContext.
> **EvidenceScope** usage is CORRECT and NOT included here.

### Types & Schemas (6 aliases implemented) ✅
| Add Primary Name | Keep As Alias | File | Status |
|------------------|---------------|------|--------|
| `DetectedAnalysisContext` | `DetectedScope` | scopes.ts | ✅ |
| `ContextDetectionOutputSchema` | `ScopeDetectionOutputSchema` | scopes.ts | ✅ |
| `ContextDetectionOutput` | `ScopeDetectionOutput` | scopes.ts | ✅ |
| `ContextPair` | `ScopePair` | text-analysis-types.ts | ✅ |
| `ContextSimilarityRequest` | `ScopeSimilarityRequest` | text-analysis-types.ts | ✅ |
| `ContextSimilarityResult` | `ScopeSimilarityResult` | text-analysis-types.ts | ✅ |

### Functions (23 aliases implemented) ✅
| Add Primary Name | Keep As Alias | Status |
|------------------|---------------|--------|
| `setContextHeuristicsLexicon` | `setScopeHeuristicsLexicon` | ✅ |
| `getContextHeuristicsPatternsConfig` | `getScopeHeuristicsPatternsConfig` | ✅ |
| `detectContextsHeuristic` | `detectScopesHeuristic` | ✅ |
| `detectContextsLLM` | `detectScopesLLM` | ✅ |
| `detectContextsHybrid` | `detectScopesHybrid` | ✅ |
| `detectContexts` | `detectScopes` | ✅ |
| `formatDetectedContextsHint` | `formatDetectedScopesHint` | ✅ |
| `canonicalizeInputForContextDetection` | `canonicalizeInputForScopeDetection` | ✅ |
| `generateContextDetectionHint` | `generateScopeDetectionHint` | ✅ |
| ~~`generateDeterministicContextId`~~ | ~~`generateDeterministicScopeId`~~ | ❌ NOT EXPORTED |
| `canonicalizeContexts` | `canonicalizeScopes` | ✅ |
| `canonicalizeContextsWithRemap` | `canonicalizeScopesWithRemap` | ✅ |
| `ensureAtLeastOneContext` | `ensureAtLeastOneScope` | ✅ |
| `inferContextTypeLabel` | `inferScopeTypeLabel` | ✅ |
| `contextTypeRank` | `scopeTypeRank` | ✅ (already existed) |
| `sanitizeContextShortAnswer` | `sanitizeScopeShortAnswer` | ✅ |
| `checkContextIterationBudget` | `checkScopeIterationBudget` | ✅ |
| ~~`refineContextsFromEvidence`~~ | ~~`refineScopesFromEvidence`~~ | ❌ NOT EXPORTED |
| ~~`selectFactsForContextRefinementPrompt`~~ | ~~`selectFactsForScopeRefinementPrompt`~~ | ❌ NOT EXPORTED |
| ~~`calculateContextSimilarity`~~ | ~~`calculateScopeSimilarity`~~ | ❌ NOT EXPORTED |
| ~~`mergeContextMetadata`~~ | ~~`mergeScopeMetadata`~~ | ❌ NOT EXPORTED |
| ~~`deduplicateContexts`~~ | ~~`deduplicateScopes`~~ | ❌ NOT EXPORTED |
| ~~`validateAndFixContextNameAlignment`~~ | ~~`validateAndFixScopeNameAlignment`~~ | ❌ NOT EXPORTED |
| ~~`enforceMinimumDirectClaimsPerContext`~~ | ~~`enforceMinimumDirectClaimsPerScope`~~ | ❌ NOT EXPORTED |
| ~~`generateMultiContextVerdicts`~~ | ~~`generateMultiScopeVerdicts`~~ | ❌ NOT EXPORTED |
| ~~`generateSingleContextVerdicts`~~ | ~~`generateSingleScopeVerdicts`~~ | ❌ NOT EXPORTED |
| ~~`analyzeContextSimilarity`~~ | ~~`analyzeScopeSimilarity`~~ | ❌ NOT EXPORTED |
| `getContextRefinementBasePrompt` | `getScopeRefinementBasePrompt` | ✅ |
| `getAnthropicContextRefinementVariant` | `getAnthropicScopeRefinementVariant` | ✅ |
| `getOpenAIContextRefinementVariant` | `getOpenAIScopeRefinementVariant` | ✅ |
| `getGeminiContextRefinementVariant` | `getGeminiScopeRefinementVariant` | ✅ |
| `getMistralContextRefinementVariant` | `getMistralScopeRefinementVariant` | ✅ |
| `getSupplementalContextsPrompt` | `getSupplementalScopesPrompt` | ✅ |
| `getSupplementalContextsPromptForProvider` | `getSupplementalScopesPromptForProvider` | ✅ |

> **✅ IMPLEMENTATION NOTE:** Implemented 23 function aliases. Strikethrough entries are internal functions (not exported from their modules) and do not need public aliases.

### Config Keys & Environment Variables (10 aliases implemented) ✅
| Add Primary Key | Keep As Alias | File | Status |
|-----------------|---------------|------|--------|
| `contextDedupThreshold` | `scopeDedupThreshold` | config-schemas.ts | ✅ |
| `contextDetectionMethod` | `scopeDetectionMethod` | config-schemas.ts | ✅ |
| `contextDetectionEnabled` | `scopeDetectionEnabled` | config-schemas.ts | ✅ |
| `contextDetectionMinConfidence` | `scopeDetectionMinConfidence` | config-schemas.ts | ✅ |
| `contextDetectionCustomPatterns` | `scopeDetectionCustomPatterns` | config-schemas.ts | ✅ |
| `contextFactorHints` | `scopeFactorHints` | config-schemas.ts | ✅ |
| `maxIterationsPerContext` | `maxIterationsPerScope` | config-schemas.ts | ✅ |
| `llmContextSimilarity` | `llmScopeSimilarity` | config-schemas.ts | ✅ |
| `FH_CONTEXT_PROMPT_MAX_FACTS` | `FH_SCOPE_PROMPT_MAX_FACTS` | orchestrated.ts | ✅ |
| `FH_LLM_CONTEXT_SIMILARITY` | `FH_LLM_SCOPE_SIMILARITY` | text-analysis-service.ts | ✅ |

> **✅ IMPLEMENTATION NOTE:** Implemented 8 config key aliases with `.transform()` migration + 2 environment variable aliases with precedence logic.

### UCM Lexicon Schema Sections (2 aliases implemented) ✅
| Add Primary Section | Keep As Alias | File | Status |
|---------------------|---------------|------|--------|
| `contextHeuristics` | `scopeHeuristics` | config-schemas.ts | ✅ |
| `contextCanonicalization` | `scopeCanonicalization` | config-schemas.ts | ✅ |

> **✅ IMPLEMENTATION NOTE:** Implemented in `AggregationLexiconSchema` with `.transform()` migration. Fallback logic added to `lexicon-utils.ts`.

### Prompt JSON Fields (DEFERRED - Phase 3)
| Add Primary Field | Keep As Alias | Status |
|-------------------|---------------|--------|
| `contextA` | `scopeA` | `[DEFERRED]` |
| `contextB` | `scopeB` | `[DEFERRED]` |

### File Renames (DEFERRED - Phase 6)
| Current File | New File | Status |
|--------------|----------|--------|
| `scopes.ts` | `contexts.ts` | `[DEFERRED]` |
| `text-analysis-scope.prompt.md` | `text-analysis-context-similarity.prompt.md` | `[DEFERRED]` |
| `scope-refinement-base.ts` | `context-refinement-base.ts` | `[DEFERRED]` |
| `text-analysis-scope-prompt.txt` | `text-analysis-context-similarity-prompt.txt` | `[DEFERRED]` |

---

## NOT IN SCOPE (Correct Usage)

The following use "Scope" correctly for **EvidenceScope** (per-evidence metadata) - NO CHANGES NEEDED:

| Identifier | File | Why Correct |
|------------|------|-------------|
| `EvidenceScope` interface | types.ts | Correct type for per-evidence metadata |
| `evidenceItem.evidenceScope` field | types.ts | Correct field name |
| `EvidenceScope` in prompts | *.prompt.md | Correct terminology in prompt text |
| `sourceType` in EvidenceScope | types.ts | Correct field |

---

## 📝 Review Summary (2026-02-01)

**Reviewed By:** Claude Sonnet 4.5
**Review Type:** Comprehensive source code verification + document accuracy check
**Overall Assessment:** ✅ **APPROVED WITH MINOR CORRECTIONS**

### Review Scope

✅ **Verified:**
- All file paths and line numbers referenced in the document
- All function/type/config names mentioned in migration plan
- All reviewer notes on lines 57-63 (confirmed accurate)
- Terminology definitions in [types.ts:98-126](../../apps/web/src/lib/analyzer/types.ts#L98-L126)
- Current state of codebase (no aliases exist yet - Phase 1 not implemented)

### Key Findings Summary

**Document Strengths:**
- Excellent alias-first strategy minimizing breaking changes
- Comprehensive phase breakdown with clear deferral points
- Strong backward compatibility focus
- Accurate identification of terminology confusion (Scope vs AnalysisContext)
- Correct verification that EvidenceScope usage is already correct

**Corrections Applied:**
- ✅ Updated function count: 25 → **31 functions** (6 missing functions added)
- ✅ Updated config count: 9 → **11 keys** (2 environment variables added)
- ✅ Updated file count: 8 → **9 files** (orchestrated-supplemental.ts added)
- ✅ Updated total alias count: ~40 → **~48 aliases**
- ✅ Fixed prompt file path: Added missing `/text-analysis/` directory in path
- ✅ Added environment variable migration strategy
- ✅ Added local `Scope` interface (orchestrated.ts:2038) to Phase 4 plan
- ✅ Added missing prompt provider functions (Mistral, Supplemental)
- ✅ Added missing canonicalization functions (3 functions)
- ✅ Added environment variable testing requirements

**Recommended Actions Before Implementation:**
1. ✅ Review and approve the 8 additional aliases identified (now documented in plan)
2. ⚠️ Decide on database/API response format strategy (out of scope but should be documented)
3. ⚠️ Plan test fixture migration approach
4. ⚠️ Consider rollback strategy for Phase 1 deployment

**Approval Status:**
✅ **READY FOR PHASE 1 IMPLEMENTATION** (with corrections applied)

The document now accurately reflects the codebase state and provides a comprehensive migration plan. All critical missing items have been identified and added to the appropriate phases.

### Implementation Risk Snapshot

- **Low risk**: Alias-only changes (types/functions/config keys) if done as pure re-exports and backward-compatible merges; no behavior changes expected.
- **Medium risk**: Prompt updates (comment-only + terminology fixes in promptfoo) due to potential prompt hash changes—ensure prompt reseeding procedures are followed where applicable.
- **Watch-outs**: Environment variable precedence and mixed-config key precedence must be tested to avoid silent behavior drift.

---

**Author:** Claude Opus 4.5
**Review Status:** ✅ REVIEWED 2026-02-01 - Updated to alias-first approach
**Comprehensive Review:** ✅ COMPLETED 2026-02-01 by Claude Sonnet 4.5 - All corrections applied inline
**Catalog Reference:** [Terminology_Catalog_Five_Core_Terms.md](./Terminology_Catalog_Five_Core_Terms.md)
