# PR Summary: Context vs Scope Terminology Clarification

## Problem Statement

The codebase had a terminology confusion issue where `factScopeAssignments` and `claimScopeAssignments` incorrectly used "Scope" terminology when they were actually assigning facts and claims to **AnalysisContexts** (top-level analytical frames), not to **EvidenceScope** (per-evidence source metadata).

This violated the critical AGENTS.md rule:
> **NEVER** use "scope" when referring to AnalysisContext - always say "context"

## What Are These Concepts?

### AnalysisContext
- **Top-level analytical frame** requiring separate analysis
- Examples: Different court cases, different methodologies, different jurisdictions
- Gets its own verdict/assessment
- Shown as separate cards in UI
- Stored in `analysisContexts[]` array

### EvidenceScope  
- **Per-evidence source metadata** about methodology/boundaries
- Examples: Study methodology, measurement boundaries, data timeframe
- Attached to individual evidence items
- Does NOT get its own verdict
- Stored in `evidenceItem.evidenceScope`

### Why They're Different
- **AnalysisContext**: "What question am I answering?" (top-level)
- **EvidenceScope**: "How did this source measure its data?" (per-item metadata)

## Changes Made

### 1. Field Renames (v2.9)

**Before:**
```typescript
factScopeAssignments: Array<{factId, contextId}>
claimScopeAssignments: Array<{claimId, contextId}>
```

**After:**
```typescript
factContextAssignments: Array<{factId, contextId}>
claimContextAssignments: Array<{claimId, contextId}>
```

### 2. Files Updated

- ✅ `apps/web/src/lib/analyzer/orchestrated.ts` - Core orchestration logic (7 changes)
- ✅ `apps/web/src/lib/analyzer/prompts/base/scope-refinement-base.ts` - Base prompt template (2 changes)
- ✅ `apps/web/src/lib/analyzer/prompts/providers/openai.ts` - OpenAI variant (2 changes)
- ✅ `apps/web/src/lib/analyzer/prompts/providers/anthropic.ts` - Anthropic variant (1 change)
- ✅ `apps/web/src/lib/analyzer/prompts/providers/mistral.ts` - Mistral variant (1 change)
- ✅ `apps/web/src/lib/analyzer/prompts/providers/google.ts` - Google variant (1 change)

### 3. Documentation Created

- ✅ `Docs/ARCHITECTURE/Context_vs_Scope.md` - Comprehensive 200+ line guide explaining:
  - Clear definitions with examples
  - Type definitions with explanations
  - When to split into multiple contexts vs when not to
  - Terminology rules (correct vs incorrect usage)
  - Variable naming conventions
  - Migration notes for v2.9
  - Examples from legal and scientific domains

- ✅ Updated `AGENTS.md` - Added reference to new documentation and clarified assignment field names

## Impact

### ✅ No Breaking Changes to Core Logic
- Field names changed but functionality remains identical
- Assignments still map facts/claims to contexts (same behavior)
- All LLM prompts updated with consistent terminology

### ⚠️ JSON Field Name Changes
- Stored job analyses using old field names may need migration
- LLM responses will use new field names going forward
- Consider backward compatibility layer if needed

### ✅ Improved Clarity
- Developers will no longer confuse contexts with scopes
- LLM prompts use consistent, unambiguous terminology
- Future code will follow clear naming conventions

## Verification

### What Was Tested
- ✅ All field references found and updated (grep confirmed 0 remaining old references)
- ✅ No test files reference old field names
- ✅ Git diff shows clean, surgical changes
- ✅ Documentation is comprehensive and clear

### What Needs Testing (Requires Dependencies)
- ⚠️ Full test suite (requires `npm install` + vitest)
- ⚠️ End-to-end analysis pipeline
- ⚠️ LLM responses with new field names

## Terminology Reference

### ✅ CORRECT

```typescript
// Variables
const contexts = understanding.analysisContexts;
const evidenceScope = fact.evidenceScope;
const assignments = refinement.factContextAssignments;

// Comments
// Assign this fact to an AnalysisContext
// Capture EvidenceScope from the source
```

### ❌ INCORRECT

```typescript
// Variables
const scopes = understanding.analysisContexts;  // Confusing!
const context = fact.evidenceScope;              // Wrong!
const assignments = refinement.factScopeAssignments; // Old!

// Comments  
// Assign this fact to a scope                    // Ambiguous!
```

## Migration Path

For existing code/data using old field names:

1. **Code**: Search and replace `factScopeAssignments` → `factContextAssignments`
2. **Code**: Search and replace `claimScopeAssignments` → `claimContextAssignments`
3. **Data**: Consider compatibility layer or migration script for stored analyses
4. **Prompts**: Already updated in this PR

## Related Documentation

- [Context_vs_Scope.md](../Docs/ARCHITECTURE/Context_vs_Scope.md) - Full explanation
- [AGENTS.md](../AGENTS.md) - Core terminology rules (updated)
- [types.ts](../apps/web/src/lib/analyzer/types.ts) - Type definitions (already clear)

## Commits

1. `cfbcc73` - Initial plan
2. `7b5d617` - Rename factScopeAssignments to factContextAssignments for clarity
3. `2e256f1` - Add comprehensive Context vs Scope documentation

---

**Version**: v2.9
**Date**: 2026-02-01
**Author**: Copilot Agent (terminology clarification initiative)
