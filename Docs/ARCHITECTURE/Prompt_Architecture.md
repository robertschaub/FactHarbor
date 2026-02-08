# Prompt Architecture

**Version**: 2.8.1
**Last Updated**: February 5, 2026
**Audience**: Developers, Prompt Engineers
**Purpose**: Document the modular prompt composition system used across all pipelines

---

## Overview

FactHarbor uses a modular prompt architecture that separates:

1. **Base prompts** - Task-specific instructions (understand, extract facts, verdict)
2. **Provider variants** - LLM-specific optimizations (Claude, GPT, Gemini, Mistral)
3. **Configuration adaptations** - Runtime adjustments (fast-tier models, knowledge mode)

This separation ensures:
- Consistent behavior across pipelines
- Provider-specific optimizations without code duplication
- Easy maintenance and testing of prompt components

---

## Directory Structure

```
apps/web/src/lib/analyzer/prompts/
├── prompt-builder.ts              # Central builder that composes prompts
├── OUTPUT_SCHEMAS.md              # Centralized JSON schema reference (v2.10.2)
│
├── base/                          # Task-specific base prompts
│   ├── understand-base.ts         # Claim understanding (shared)
│   ├── extract-evidence-base.ts   # Evidence extraction (shared)
│   ├── verdict-base.ts            # Verdict generation (shared)
│   ├── scope-refinement-base.ts   # Context refinement (shared)
│   ├── dynamic-plan-base.ts       # Dynamic pipeline planning
│   ├── dynamic-analysis-base.ts   # Dynamic pipeline analysis
│   ├── orchestrated-understand.ts # Orchestrated pipeline understanding
│   └── orchestrated-supplemental.ts # Supplemental claims/contexts
│
├── providers/                     # LLM provider-specific variants
│   ├── anthropic.ts              # Claude optimizations
│   ├── openai.ts                 # GPT optimizations
│   ├── google.ts                 # Gemini optimizations
│   └── mistral.ts                # Mistral optimizations
│
└── config-adaptations/            # Configuration-based adaptations
    ├── tiering.ts                # Fast-tier model simplifications
    ├── knowledge-mode.ts         # Model knowledge on/off
    └── structured-output.ts      # Output format guidance
```

---

## Prompt Composition Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        buildPrompt()                             │
│                                                                  │
│  Input:                                                          │
│  ├─ task: 'understand' | 'extract_evidence' | 'verdict' | ...   │
│  ├─ provider: 'anthropic' | 'openai' | 'google' | 'mistral'     │
│  ├─ modelName: string                                            │
│  ├─ config: { allowModelKnowledge, isLLMTiering, isBudgetModel } │
│  └─ variables: { currentDate, originalClaim, ... }              │
│                                                                  │
│  Composition:                                                    │
│  ┌──────────────────┐                                           │
│  │   Base Prompt    │ ← Task-specific instructions              │
│  │ (understand-base)│                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│  ┌────────▼─────────┐                                           │
│  │ Provider Variant │ ← LLM-specific optimizations              │
│  │   (anthropic)    │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│  ┌────────▼─────────┐                                           │
│  │ Config Adaptations│ ← Fast-tier model, knowledge mode        │
│  │   (tiering)      │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│     Final Prompt                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Provider-Specific Optimizations

### Anthropic (Claude)

- **XML-structured prompts** - Claude excels with XML tags for clarity
- **Format-only variants** - Content guidance stays in base prompts
- **Output structure hints** - JSON validity and empty-string rules
- **Nuanced reasoning** - Trust judgment on complex assessments

```typescript
// Example: Claude-optimized prompt structure (format-only)
<claude_optimization>
## FORMAT
Use XML tags. Follow schema precisely.

## OUTPUT
- Valid JSON matching schema
- Empty strings "" for missing optional fields
- All arrays as arrays (even if empty)

## STRENGTHS
Apply nuanced reasoning. Be direct and confident.
</claude_optimization>
```

### OpenAI (GPT)

- **Step-by-step instructions** - Sequential numbered steps
- **Format examples** - Concrete output examples
- **System/user separation** - Clear role delineation
- **JSON mode guidance** - Explicit JSON formatting instructions

### Google (Gemini)

- **Concise prompts** - Gemini prefers brevity
- **Grounded references** - Citation format guidance
- **Multi-turn context** - Conversation history handling
- **Safety guidance** - Content policy alignment

### Mistral

- **Structured brevity** - Short, direct instructions
- **Output templates** - Clear structure expectations
- **French language awareness** - Better multilingual support

---

## Task Types

| Task | Pipeline(s) | Base Prompt File |
|------|-------------|------------------|
| `understand` | Canonical, Orchestrated | `understand-base.ts` |
| `extract_evidence` | Canonical, Orchestrated | `extract-evidence-base.ts` |
| `verdict` | Canonical, Orchestrated | `verdict-base.ts` |
| `context_refinement` | Orchestrated | `context-refinement-base.ts` |
| `dynamic_plan` | Dynamic | `dynamic-plan-base.ts` |
| `dynamic_analysis` | Dynamic | `dynamic-analysis-base.ts` |
| `orchestrated_understand` | Orchestrated | `orchestrated-understand.ts` |
| `supplemental_claims` | Orchestrated | `orchestrated-supplemental.ts` |
| `supplemental_contexts` | Orchestrated | `orchestrated-supplemental.ts` |

---

## Configuration Adaptations

### Tiering Mode (`isLLMTiering`)

When using tiered models (different models for different tasks):
- Adjusts complexity expectations per task
- Optimizes token usage for fast-tier models

### Fast-Tier Model Mode (`isBudgetModel`)

For fast-tier models (Haiku, Mini, Flash):
- Simplified instructions
- Reduced output expectations
- Focused on core task completion

### Knowledge Mode (`allowModelKnowledge`)

- **Enabled**: LLM may use training knowledge to supplement search results
- **Disabled**: LLM must only use provided source evidence

---

## Usage Example

```typescript
import { buildPrompt, detectProvider } from './prompts/prompt-builder';

// In a pipeline:
const understandPrompt = buildPrompt({
  task: 'understand',
  provider: detectProvider(model.modelId),  // Auto-detect from model ID
  modelName: model.modelId,
  config: {
    allowModelKnowledge: false,
    isLLMTiering: true,
    isBudgetModel: model.modelId.includes('haiku'),
  },
  variables: {
    currentDate: new Date().toISOString().split('T')[0],
    originalClaim: userInput,
  },
});
```

---

## Adding New Provider Support

1. Create `providers/newprovider.ts` with variant functions:
   ```typescript
   export function getNewProviderUnderstandVariant(): string { ... }
   export function getNewProviderExtractFactsVariant(): string { ... }
   export function getNewProviderVerdictVariant(): string { ... }
   ```

2. Add imports and cases to `prompt-builder.ts`

3. Update `detectProvider()` to recognize new model IDs

4. Test with prompt optimization tests in `prompt-optimization.test.ts`

---

## Prompt Content Improvements

### v2.8.0: Token Optimization - Estimated 20-30% Reduction (Feb 3, 2026)

**Achievement**: Estimated 20-30% reduction in prompt token counts through two-phase optimization while maintaining quality.

**Phase 1 Changes** (Commit c1a768c):
- Removed attribution duplication from provider variants (4 files)
- Inlined terminology definitions from 6 lines to 2 lines (3 files)
- Removed legacy schema field explanations (3 files)
- **Token savings**: ~550-700 tokens per prompt (estimated 15-20% reduction)

**Phase 2 Changes** (Commit 2ae2a42):
- Condensed centrality assignment rules from 36 to 20 lines
- Simplified multi-context "Do NOT Split" guidance from 13 to 7 bullets
- **Additional token savings**: ~230 tokens per prompt (estimated 5-10% reduction)
- **Cumulative reduction**: estimated 20-30% across all prompts

**Files Modified**:
- **Provider variants** (Phase 1): `providers/{anthropic,openai,google,mistral}.ts`
- **Base prompts** (Phase 1): `base/{understand-base,scope-refinement-base,extract-facts-base,orchestrated-understand}.ts`
- **Condensed content** (Phase 2): `base/{understand-base,orchestrated-understand}.ts`

**Critical Guidance Preserved**:
- Death/injury claims = MANDATORY HIGH centrality
- Attribution/source/timing = LOW centrality
- Incidental temporal mentions ≠ multi-context (unless time IS the subject)
- Measurement frameworks = distinct analytical boundaries

**Quality Validation**:
- ✅ Build verification: All code compiles successfully
- ✅ Manual review: Prompts remain coherent and complete
- ✅ Test file updated: `prompt-optimization.test.ts`
- ✅ Quality tests created: `prompt-quality.test.ts`

**Impact**:
- Estimated LLM API cost reduction of ~20-30% per analysis
- Faster prompt processing and response times
- Maintained analytical quality and accuracy
- Improved prompt readability through condensation

---

### v2.6.38: Temporal Guidance Clarification

**Problem**: Base prompts had conflicting guidance about when temporal differences create distinct contexts:
- "Different time periods alone do not create separate contexts"
- "Time period (e.g., '2000s' vs '1970s') → DISTINCT"

**Solution**: Clarified distinction between:
- **Incidental temporal mentions** (e.g., "in 2020, the court...") - Do NOT create separate contexts
- **Time period as primary subject** (e.g., "2000s event" vs "1970s event" as distinct historical events) - DO create separate contexts

**Files Updated**:
- `base/understand-base.ts`
- `base/scope-refinement-base.ts` (legacy name)
- `base/orchestrated-understand.ts`

**New Guidance**:
```
CRITICAL - Do NOT split for:
- Incidental temporal mentions (e.g., "in 2020, the court..." - when not central to the claim)

KEEP SEPARATE when ANY of these differ:
- Time period AS PRIMARY SUBJECT (e.g., "2000s event" vs "1970s event" - comparing distinct historical events) → DISTINCT
```

This ensures consistent behavior across all three pipelines while preventing both under-splitting (missing genuine temporal contexts) and over-splitting (creating contexts for incidental date mentions).

---

## Related Documentation

- [OUTPUT_SCHEMAS.md](../../apps/web/src/lib/analyzer/prompts/OUTPUT_SCHEMAS.md) - Centralized JSON schema reference for all LLM phases
- [LLM Configuration Guide](../xwiki-pages/FactHarbor/User%20Guides/LLM%20Configuration/WebHome.xwiki) - User-facing provider setup
- [LLM Schema Mapping](../xwiki-pages/FactHarbor/Specification/Reference/Data%20Models%20and%20Schemas/LLM%20Schema%20Mapping/WebHome.xwiki) - TypeScript to LLM output mapping
- [Pipeline Architecture](../xwiki-pages/FactHarbor/Specification/Implementation/Pipeline%20Architecture/TriplePath%20Architecture/WebHome.xwiki) - Overall pipeline design
- [Calculations](./Calculations.md) - Verdict calculation methodology including multi-context averaging
