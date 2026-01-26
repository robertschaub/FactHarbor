# Prompt Architecture

**Version**: 2.6.38  
**Last Updated**: January 26, 2026  
**Audience**: Developers, Prompt Engineers  
**Purpose**: Document the modular prompt composition system used across all pipelines

---

## Overview

FactHarbor uses a modular prompt architecture that separates:

1. **Base prompts** - Task-specific instructions (understand, extract facts, verdict)
2. **Provider variants** - LLM-specific optimizations (Claude, GPT, Gemini, Mistral)
3. **Configuration adaptations** - Runtime adjustments (budget models, knowledge mode)

This separation ensures:
- Consistent behavior across pipelines
- Provider-specific optimizations without code duplication
- Easy maintenance and testing of prompt components

---

## Directory Structure

```
apps/web/src/lib/analyzer/prompts/
├── prompt-builder.ts              # Central builder that composes prompts
│
├── base/                          # Task-specific base prompts
│   ├── understand-base.ts         # Claim understanding (shared)
│   ├── extract-facts-base.ts      # Fact extraction (shared)
│   ├── verdict-base.ts            # Verdict generation (shared)
│   ├── scope-refinement-base.ts   # Scope refinement (shared)
│   ├── dynamic-plan-base.ts       # Dynamic pipeline planning
│   ├── dynamic-analysis-base.ts   # Dynamic pipeline analysis
│   ├── orchestrated-understand.ts # Orchestrated pipeline understanding
│   └── orchestrated-supplemental.ts # Supplemental claims/scopes
│
├── providers/                     # LLM provider-specific variants
│   ├── anthropic.ts              # Claude optimizations
│   ├── openai.ts                 # GPT optimizations
│   ├── google.ts                 # Gemini optimizations
│   └── mistral.ts                # Mistral optimizations
│
└── config-adaptations/            # Configuration-based adaptations
    ├── tiering.ts                # Budget model simplifications
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
│  ├─ task: 'understand' | 'extract_facts' | 'verdict' | ...      │
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
│  │ Config Adaptations│ ← Budget model, knowledge mode           │
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
- **Thinking blocks** - Explicit reasoning steps (`<thinking_process>`)
- **Prefill technique** - For structured output guidance
- **Nuanced reasoning** - Trust judgment on complex assessments

```typescript
// Example: Claude-optimized prompt structure
<claude_optimization>
<thinking_process>
Before generating output, work through these steps internally:
1. What type of input is this?
2. Identify the core factual assertions
...
</thinking_process>
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
| `extract_facts` | Canonical, Orchestrated | `extract-facts-base.ts` |
| `verdict` | Canonical, Orchestrated | `verdict-base.ts` |
| `scope_refinement` | Orchestrated | `scope-refinement-base.ts` |
| `dynamic_plan` | Dynamic | `dynamic-plan-base.ts` |
| `dynamic_analysis` | Dynamic | `dynamic-analysis-base.ts` |
| `orchestrated_understand` | Orchestrated | `orchestrated-understand.ts` |
| `supplemental_claims` | Orchestrated | `orchestrated-supplemental.ts` |
| `supplemental_scopes` | Orchestrated | `orchestrated-supplemental.ts` |

---

## Configuration Adaptations

### Tiering Mode (`isLLMTiering`)

When using tiered models (different models for different tasks):
- Adjusts complexity expectations per task
- Optimizes token usage for budget models

### Budget Model Mode (`isBudgetModel`)

For cost-effective models (Haiku, Mini, Flash):
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

### v2.6.38: Temporal Guidance Clarification

**Problem**: Base prompts had conflicting guidance about when temporal differences create distinct contexts:
- "Different time periods alone do not create separate contexts"
- "Time period (e.g., '2000s' vs '1970s') → DISTINCT"

**Solution**: Clarified distinction between:
- **Incidental temporal mentions** (e.g., "in 2020, the court...") - Do NOT create separate contexts
- **Time period as primary subject** (e.g., "2000s event" vs "1970s event" as distinct historical events) - DO create separate contexts

**Files Updated**:
- `base/understand-base.ts`
- `base/scope-refinement-base.ts`
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

- [LLM Configuration Guide](../USER_GUIDES/LLM_Configuration.md) - User-facing provider setup
- [LLM Schema Mapping](../REFERENCE/LLM_Schema_Mapping.md) - TypeScript to LLM output mapping
- [Pipeline Architecture](./Pipeline_TriplePath_Architecture.md) - Overall pipeline design
- [Calculations](./Calculations.md) - Verdict calculation methodology including multi-context averaging
