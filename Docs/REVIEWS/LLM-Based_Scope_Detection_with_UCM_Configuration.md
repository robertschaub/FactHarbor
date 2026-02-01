# Implementation Plan: LLM-Based Scope Detection with UCM Configuration

**Date:** 2026-01-31
**Version:** v1.0.0
**Status:** PENDING REVIEW
**Author:** Claude Opus 4.5
**Related:** [Hardcoded Heuristics UCM Migration Implementation Report](./Hardcoded_Heuristics_UCM_Migration_Implementation_Report.md)

---

## Review Checklist

- [ ] Architecture design reviewed
- [ ] UCM schema design approved
- [ ] Integration points validated
- [ ] Testing strategy approved
- [ ] Rollout plan approved
- [ ] Risk mitigation reviewed
- [ ] Terminology cleanup deferred to separate PR

---

## Executive Summary

**Goal:** Replace 3 hardcoded scope detection patterns with configurable LLM-based semantic detection.

**Approach:** Hybrid architecture (heuristic seeds + LLM refinement) with gradual rollout via UCM config.

**Impact:**
- ✅ Extensible to all domains (not just 3 patterns)
- ✅ Configurable via UCM hot-reload
- ✅ Backward compatible (zero breaking changes)
- ⚠️ Fixes critical bug (missing function name on line 53)

**Files Modified:** 3 core files (scopes.ts, config-schemas.ts, orchestrated.ts)

**Rollout:** 3-week phased deployment (shadow → opt-in → default)

---

## Quick Reference

| Aspect | Current | Proposed |
|--------|---------|----------|
| **Detection Method** | Hardcoded regex (3 patterns) | Configurable LLM + heuristic |
| **Domains Covered** | Comparative, Legal, Environmental | All domains (extensible) |
| **Configuration** | None (code only) | UCM Pipeline Config |
| **Backward Compat** | N/A | ✅ Full (feature flag) |
| **Critical Bug** | Line 53 missing function name | ✅ Fixed |

---

## Overview

Transition scope detection from hardcoded regex patterns to configurable LLM-based detection while maintaining backward compatibility and deterministic seed forcing logic.

## Problem Statement

**Current State:**
- [scopes.ts:53-129](c:\DEV\FactHarbor\apps\web\src\lib\analyzer\scopes.ts#L53-L129) contains 3 hardcoded patterns:
  1. Comparative efficiency → SCOPE_PRODUCTION, SCOPE_USAGE
  2. Legal fairness → SCOPE_LEGAL_PROC, SCOPE_OUTCOMES, SCOPE_INTL_PERSPECTIVE
  3. Environmental/health → SCOPE_DIRECT, SCOPE_LIFECYCLE
- **Critical Bug:** Line 53 has missing function name: `export function   (text: string)`
- Limited to these 3 domain patterns, not extensible to new domains

**Desired State:**
- LLM detects scopes semantically from input text
- Configurable via UCM (method, patterns, confidence thresholds)
- Extensible to all domains (legal, scientific, regulatory, temporal, geographic)
- Maintains deterministic behavior for reproducibility

## Architecture Design

### Hybrid Approach (Recommended)
```
Input Text
    ↓
detectScopesHybrid(input, config)
    ├─> Heuristic Detection (fast, deterministic seeds)
    ├─> LLM Detection (semantic understanding, configurable)
    └─> Merge & Deduplicate → DetectedScope[]
        ↓
    formatDetectedScopesHint() → Inject into main analysis prompt
```

**Why Hybrid?**
- Fast heuristic patterns provide deterministic seeds for reproducibility
- LLM extends beyond hardcoded patterns with semantic understanding
- Gradual rollout via config flag (heuristic → hybrid → llm)
- Backward compatible with existing seed forcing logic [orchestrated.ts:4441-4485](c:\DEV\FactHarbor\apps\web\src\lib\analyzer\orchestrated.ts#L4441-L4485)

## Implementation Steps

### Step 1: Fix Critical Bug ⚠️
**File:** [scopes.ts:53](c:\DEV\FactHarbor\apps\web\src\lib\analyzer\scopes.ts#L53)

**Current:**
```typescript
export function   (text: string): DetectedScope[] | null {
```

**Fix:**
```typescript
export function detectScopesHeuristic(text: string, config?: PipelineConfig): DetectedScope[] | null {
```

**Rationale:** Rename to `detectScopesHeuristic` for clarity, add optional config parameter for custom patterns

### Step 2: Add UCM Configuration Schema
**File:** [config-schemas.ts](c:\DEV\FactHarbor\apps\web\src\lib\config-schemas.ts)

**Location:** Add after line 93 (scopeDedupThreshold) in PipelineConfigSchema

**New Fields:**
```typescript
// === Scope Detection Settings ===
scopeDetectionMethod: z.enum(["heuristic", "llm", "hybrid"])
  .describe("Scope detection method: heuristic (patterns only), llm (AI only), hybrid (patterns + AI)"),

scopeDetectionEnabled: z.boolean()
  .describe("Enable scope detection (if false, use single general scope)"),

scopeDetectionMinConfidence: z.number().min(0).max(1)
  .describe("Minimum confidence threshold for LLM-detected scopes (0-1)"),

scopeDetectionMaxScopes: z.number().int().min(1).max(10)
  .describe("Maximum number of scopes to detect per input"),

scopeDetectionCustomPatterns: z.array(z.object({
  id: z.string().regex(/^SCOPE_[A-Z_]+$/),
  name: z.string(),
  type: z.enum(["methodological", "legal", "scientific", "general", "regulatory", "temporal", "geographic"]),
  triggerPattern: z.string(),
  keywords: z.array(z.string()),
  metadata: z.record(z.any()).optional(),
})).optional().describe("Custom scope detection patterns (extends built-in)"),

scopeFactorHints: z.array(z.object({
  scopeType: z.string(),
  evaluationCriteria: z.string(),
  factor: z.string(),
  category: z.string(),
})).optional().describe("Hints for LLM scope-specific factor generation"),
```

**Update DEFAULT_PIPELINE_CONFIG** (around line 111):
```typescript
scopeDetectionMethod: "hybrid",
scopeDetectionEnabled: true,
scopeDetectionMinConfidence: 0.7,
scopeDetectionMaxScopes: 5,
scopeDetectionCustomPatterns: undefined,
scopeFactorHints: undefined,
```

### Step 3: Implement LLM Scope Detection
**File:** [scopes.ts](c:\DEV\FactHarbor\apps\web\src\lib\analyzer\scopes.ts)

**Add after line 26 (DetectedScope interface):**

```typescript
// Zod schema for LLM scope detection output
export const ScopeDetectionOutputSchema = z.object({
  scopes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["methodological", "legal", "scientific", "general", "regulatory", "temporal", "geographic"]),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    metadata: z.record(z.any()).optional(),
  })),
  requiresSeparateAnalysis: z.boolean(),
  rationale: z.string(),
});

export type ScopeDetectionOutput = z.infer<typeof ScopeDetectionOutputSchema>;
```

**Add after line 129 (end of heuristic function):**

```typescript
/**
 * Detect scopes using LLM with semantic understanding.
 * Falls back to heuristic seeds on error.
 */
export async function detectScopesLLM(
  text: string,
  heuristicSeeds: DetectedScope[] | null,
  config: PipelineConfig
): Promise<DetectedScope[]> {
  const model = getModelForTask('understand', config);

  const seedHint = heuristicSeeds?.length > 0
    ? `\n\nHEURISTIC SEED SCOPES:\n${heuristicSeeds.map(s =>
        `- ${s.id}: ${s.name} (${s.type})`).join('\n')}`
    : '';

  const entities = extractCoreEntities(text);
  const entityHint = entities.length > 0
    ? `\n\nCORE ENTITIES: ${entities.join(', ')}`
    : '';

  const systemPrompt = `You are analyzing an input to identify distinct analytical scopes (AnalysisContexts).

INCOMPATIBILITY TEST: Split scopes ONLY if combining them would be MISLEADING (evaluating fundamentally different things).

WHEN TO SPLIT:
- Different formal authorities (e.g., TSE vs STF courts)
- Different measurement boundaries (e.g., production vs usage phase)
- Different regulatory regimes or time periods

DO NOT SPLIT ON:
- Pro vs con viewpoints
- Different evidence types
- Incidental geographic/temporal mentions
- Public perception scopes (unless core topic)

OUTPUT: For each scope, provide id, name, type, confidence (0-1), reasoning, metadata.${seedHint}${entityHint}`;

  const userPrompt = `Analyze and detect distinct scopes:\n\n${text}`;

  try {
    const result = await generateText({
      model: model.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.2, config),
      output: Output.object({ schema: ScopeDetectionOutputSchema }),
    });

    const output = extractStructuredOutput<ScopeDetectionOutput>(result);

    const minConfidence = config.scopeDetectionMinConfidence ?? 0.7;
    const maxScopes = config.scopeDetectionMaxScopes ?? 5;

    return output.scopes
      .filter(s => s.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxScopes)
      .map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        metadata: { ...s.metadata, confidence: s.confidence, detectionMethod: 'llm' },
      }));
  } catch (error) {
    console.error('LLM scope detection failed:', error);
    return heuristicSeeds || [];
  }
}

/**
 * Hybrid scope detection: heuristic seeds + LLM refinement.
 */
export async function detectScopesHybrid(
  text: string,
  config: PipelineConfig
): Promise<DetectedScope[]> {
  if (!config.scopeDetectionEnabled) return null;

  const method = config.scopeDetectionMethod ?? 'hybrid';
  const heuristic = detectScopesHeuristic(text, config);

  if (method === 'heuristic') return heuristic;

  const llmSeeds = method === 'hybrid' ? heuristic : null;
  const llm = await detectScopesLLM(text, llmSeeds, config);

  if (method === 'llm') return llm;

  // Hybrid: merge and deduplicate
  return mergeAndDeduplicateScopes(heuristic, llm, config);
}

function mergeAndDeduplicateScopes(
  heuristic: DetectedScope[] | null,
  llm: DetectedScope[],
  config: PipelineConfig
): DetectedScope[] {
  const merged = new Map<string, DetectedScope>();

  for (const scope of heuristic || []) {
    merged.set(scope.id, { ...scope, metadata: { ...scope.metadata, detectionMethod: 'heuristic' }});
  }

  for (const scope of llm) {
    merged.set(scope.id, scope); // LLM scopes override
  }

  const threshold = config.scopeDedupThreshold ?? 0.85;
  const deduplicated: DetectedScope[] = [];

  for (const scope of merged.values()) {
    const isDuplicate = deduplicated.some(existing =>
      calculateTextSimilarity(scope.name, existing.name) >= threshold
    );

    if (!isDuplicate) deduplicated.push(scope);
  }

  return deduplicated.sort((a, b) => {
    const aConf = (a.metadata?.confidence as number) ?? 0.5;
    const bConf = (b.metadata?.confidence as number) ?? 0.5;
    return bConf - aConf;
  });
}

/**
 * Backward-compatible synchronous wrapper.
 * Used by deterministic seed forcing logic.
 */
export function detectScopes(text: string): DetectedScope[] | null {
  return detectScopesHeuristic(text);
}
```

**Import additions needed at top of file:**
```typescript
import { generateText, Output } from '@ai-sdk/provider';
import { getModelForTask, getDeterministicTemperature } from './llm';
import type { PipelineConfig } from '../config-schemas';
```

### Step 4: Update Integration Points
**File:** [orchestrated.ts](c:\DEV\FactHarbor\apps\web\src\lib\analyzer\orchestrated.ts)

**Change 1 - Line 3452 (understandClaim function):**

**Current:**
```typescript
const preDetectedScopes = detectScopes(analysisInput);
```

**New:**
```typescript
const preDetectedScopes = state.pipelineConfig?.scopeDetectionMethod === 'heuristic'
  ? detectScopes(analysisInput)
  : await detectScopesHybrid(analysisInput, state.pipelineConfig || DEFAULT_PIPELINE_CONFIG);
```

**Change 2 - Line 169 (refineScopesFromEvidence function):**

**Current:**
```typescript
const seedScopes = detectScopes(analysisInput) || [];
```

**New:**
```typescript
const seedScopes = config.scopeDetectionMethod === 'heuristic'
  ? detectScopes(analysisInput) || []
  : await detectScopesHybrid(analysisInput, config) || [];
```

**Note:** Lines 4441-4485 (deterministic seed forcing) remain UNCHANGED - they work with any detection method.

### Step 5: Add Import to orchestrated.ts
**File:** [orchestrated.ts](c:\DEV\FactHarbor\apps\web\src\lib\analyzer\orchestrated.ts)

**Add to imports section:**
```typescript
import { detectScopes, detectScopesHybrid, formatDetectedScopesHint, /* existing imports */ } from './scopes';
```

## Critical Files to Modify

| File | Lines | Change Summary |
|------|-------|----------------|
| [scopes.ts](c:\DEV\FactHarbor\apps\web\src\lib\analyzer\scopes.ts) | 53, 26+, 129+ | Fix bug, add schema, add LLM/hybrid functions |
| [config-schemas.ts](c:\DEV\FactHarbor\apps\web\src\lib\config-schemas.ts) | 93+, 111+ | Add scope detection config fields + defaults |
| [orchestrated.ts](c:\DEV\FactHarbor\apps\web\src\lib\analyzer\orchestrated.ts) | 169, 3452 | Update integration points (async hybrid calls) |

## Testing & Verification

### Unit Tests
Create `apps/web/src/lib/analyzer/__tests__/scope-detection-llm.test.ts`:
- Test heuristic mode (existing behavior)
- Test LLM mode (new behavior)
- Test hybrid mode (recommended)
- Test confidence filtering
- Test custom patterns
- Test deduplication

### Regression Tests
**Inputs to test:**
1. "Electric cars are more efficient than gas cars in production" → SCOPE_PRODUCTION, SCOPE_USAGE
2. "The trial was unfair according to international observers" → SCOPE_LEGAL_PROC, SCOPE_OUTCOMES, SCOPE_INTL_PERSPECTIVE
3. "Wind energy has better environmental impact than coal" → SCOPE_DIRECT, SCOPE_LIFECYCLE

**Verify:**
- Heuristic mode produces same scopes as current implementation
- Hybrid/LLM modes produce equal or more relevant scopes
- Deterministic seed forcing still works [orchestrated.ts:4441-4485](c:\DEV\FactHarbor\apps\web\src\lib\analyzer\orchestrated.ts#L4441-L4485)

### Admin UI Verification
1. Navigate to `/admin/config`
2. Edit Pipeline Config
3. Verify new scope detection fields render correctly
4. Test validation (e.g., confidence must be 0-1)
5. Save and activate configuration
6. Run analysis job and verify config is used

### End-to-End Testing
1. **Heuristic mode:** Set `scopeDetectionMethod: "heuristic"` → should behave exactly like current system
2. **Hybrid mode:** Set `scopeDetectionMethod: "hybrid"` → should produce heuristic seeds + LLM refinements
3. **LLM mode:** Set `scopeDetectionMethod: "llm"` → should use pure LLM detection
4. Check analysis job logs for scope detection results
5. Verify verdict quality is maintained or improved
6. Monitor LLM token usage (should be <10% increase)

## Rollout Strategy

### Phase 1 - Shadow Mode (Week 1)
- Deploy with default `scopeDetectionMethod: "heuristic"`
- No user-facing changes
- Monitor stability

### Phase 2 - Opt-In Testing (Week 2)
- Allow admins to switch to "hybrid" via config
- Collect feedback on scope quality
- Monitor error rates and LLM costs

### Phase 3 - Default Switch (Week 3)
- Change default to `scopeDetectionMethod: "hybrid"`
- Document new configuration options
- Add examples to UCM Administrator Handbook

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking deterministic seed forcing | Keep `detectScopes()` synchronous wrapper unchanged |
| LLM costs escalate | Use budget model (Haiku), confidence threshold ≥0.7, feature flag |
| Scope quality degrades | Regression tests, manual review of 100 samples, confidence filtering |
| Custom pattern regex injection | Validate syntax on save, timeout execution (1s max) |

## Success Criteria

- [ ] Bug on line 53 fixed
- [ ] Config schema validates correctly
- [ ] Admin UI renders new fields
- [ ] LLM detection returns scopes for 95%+ of inputs
- [ ] No regression in existing test suite
- [ ] Deterministic seed forcing still works
- [ ] LLM token usage within budget (+10-20%)
- [ ] Documentation updated

## Documentation Updates

**File:** `Docs/USER_GUIDES/UCM_Administrator_Handbook.md`

Add section:
```markdown
## Scope Detection Configuration

### scopeDetectionMethod
- **heuristic**: Pattern-based detection (fast, deterministic)
- **llm**: AI-based semantic detection (flexible, extensible)
- **hybrid**: Patterns seed LLM refinement (recommended)

### scopeDetectionMinConfidence
Minimum confidence (0-1) for LLM-detected scopes. Lower = more scopes. Default: 0.7

### scopeDetectionCustomPatterns
Extend built-in patterns with domain-specific detection rules.

Example:
{
  "id": "SCOPE_REGULATORY",
  "name": "Regulatory Compliance Analysis",
  "type": "regulatory",
  "triggerPattern": "\\b(regulation|compliance|violation)\\b",
  "keywords": ["FDA", "EPA", "OSHA"]
}
```

## Dependencies & Assumptions

### Existing Functions (Reused, No Changes Needed)
- `canonicalizeScopes()` - Post-processing for deterministic IDs
- `ensureAtLeastOneScope()` - Fallback scope injection
- `extractCoreEntities()` - Entity extraction for LLM prompts
- `canonicalizeInputForScopeDetection()` - Input normalization
- `calculateTextSimilarity()` - Used in deduplication (already exists in analyzer/utils.ts)
- `extractStructuredOutput()` - LLM output extraction (already exists in llm.ts)

### External Dependencies
- `@ai-sdk/provider` - Already installed (generateText, Output)
- `zod` - Already installed (schema validation)
- Admin UI - Already supports new config fields automatically via Zod introspection

### Known Limitations
- LLM detection requires async/await (functions become async)
- Custom regex patterns need validation to prevent injection
- LLM token costs increase by estimated 10-20% (mostly from understand phase)
- Deterministic seed forcing logic (lines 4441-4485) stays synchronous - uses heuristic wrapper

### Future Enhancements (Not in Scope)
- Provider-specific prompt optimizations (Anthropic vs OpenAI vs Google)
- Scope factor hints integration with keyFactorHints system
- Confidence score visualization in UI
- A/B testing framework for scope quality comparison
- Custom pattern builder UI (drag-and-drop regex constructor)

---

## Terminology Confusion: EvidenceScope vs AnalysisContext

### Critical Finding (2026-01-31 Audit)

The codebase has **pervasive terminology confusion** between:
- **AnalysisContext** = top-level analytical frame (what the analysis evaluates)
- **EvidenceScope** = per-evidence source metadata (methodology/boundaries/time/geo)

The code documentation (`orchestrated.ts:183-197`) correctly defines both concepts, but the **code naming doesn't follow its own documentation**.

### Issues Found

| Location | Problem | Correct Name |
|----------|---------|--------------|
| `scopes.ts:26` | `DetectedScope` type | `DetectedAnalysisContext` |
| `scopes.ts:33` | `ScopeDetectionOutputSchema` | `ContextDetectionOutputSchema` |
| `scopes.ts:83,165,230` | `detectScopes*()` functions | `detectContexts*()` |
| `orchestrated.ts:178-183` | `*ScopeAssignments` fields | `*ContextAssignments` |
| `config-schemas.ts` | `scopeDetection*` config keys | `contextDetection*` |
| `text-analysis-scope.prompt.md:89-94` | `scopeA`/`scopeB` JSON fields | `contextA`/`contextB` |
| `budgets.ts:21,41` | `maxIterationsPerScope` | `maxIterationsPerContext` |
| `config.ts:277,305` | `inferScopeTypeLabel()`, `scopeTypeRank()` | `inferContextTypeLabel()`, `contextTypeRank()` |

### Recommended Fix (Separate PR)

**Phase 1: Type & Function Renames** (breaking, requires migration)
```typescript
// Before
interface DetectedScope { ... }
function detectScopesHeuristic(): DetectedScope[]

// After
interface DetectedAnalysisContext { ... }
function detectContextsHeuristic(): DetectedAnalysisContext[]

// Backward compat aliases (deprecated)
export type DetectedScope = DetectedAnalysisContext;
export const detectScopes = detectContexts;
```

**Phase 2: Config Key Migration**
```typescript
// Add new keys with correct names
contextDetectionMethod: z.enum([...]),
contextDetectionEnabled: z.boolean(),
contextDetectionMinConfidence: z.number(),

// Keep old keys as aliases (deprecated warnings)
scopeDetectionMethod: z.enum([...]).deprecated("Use contextDetectionMethod"),
```

**Phase 3: Variable/Field Renames**
- `seedScopes` → `seedContexts`
- `preDetectedScopes` → `preDetectedContexts`
- `*ScopeAssignments` → `*ContextAssignments`

**Impact:** ~60 variable/function renames across 8+ files. Should be a separate focused PR.

### Current Status

The LLM-based scope detection implementation (this plan) was completed using the existing "Scope" terminology for consistency with the current codebase. A follow-up terminology cleanup PR is recommended but **not blocking** for the UCM migration work.

---

## Related Documents

- [Hardcoded Heuristics UCM Migration Plan](./Hardcoded_Heuristics_UCM_Migration_Plan.md)
- [Hardcoded Heuristics UCM Migration Implementation Report](./Hardcoded_Heuristics_UCM_Migration_Implementation_Report.md)
- [UCM Administrator Handbook](../USER_GUIDES/UCM_Administrator_Handbook.md)

---

**Author:** Claude Opus 4.5
**Review Status:** Pending review
