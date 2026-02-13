# Prompt Architecture

**Version**: 2.8.2
**Last Updated**: February 13, 2026
**Audience**: Developers, Prompt Engineers
**Purpose**: Document the prompt management system used across all pipelines

---

## Overview

FactHarbor uses **UCM-managed prompt files** (`.prompt.md`) as the single source of truth for all LLM prompts at runtime. Per AGENTS.md String Usage Boundary, all text that goes into LLM prompts must be UCM-managed, not hardcoded in TypeScript.

### Runtime Architecture (Production)

Both pipelines load prompts via `loadAndRenderSection()` from UCM-managed `.prompt.md` files:

1. **Section-based prompts** — Each `.prompt.md` file contains named sections (`## SECTION_NAME`) with variable substitution (`${variableName}`)
2. **Provider-specific structured output** — Separate sections per provider (e.g., `STRUCTURED_OUTPUT_ANTHROPIC`)
3. **UCM database backing** — Prompt files are seeded into SQLite config DB on first use and can be edited via Admin UI

### Legacy Testing Harness (Test-Only)

A separate TypeScript prompt composition system exists under `apps/web/src/lib/analyzer/prompts/` but is **only used by the `prompt-testing.ts` test harness**. It is NOT called by any production pipeline.

---

## Directory Structure

### Runtime Prompts (UCM-Managed)

```
apps/web/prompts/
├── orchestrated.prompt.md          # Orchestrated pipeline prompts (all sections)
├── monolithic-dynamic.prompt.md    # Monolithic Dynamic pipeline prompts
├── source-reliability.prompt.md    # Source reliability evaluation prompts
└── text-analysis/                  # LLM text analysis pipeline prompts
    ├── *.prompt.md
    └── README.md
```

Each `.prompt.md` file has YAML frontmatter (version, pipeline, variables, requiredSections) followed by `## SECTION_NAME` headers with prompt content. The `loadAndRenderSection(pipeline, sectionName, variables)` function extracts and renders sections with variable substitution.

### Testing Harness (TypeScript, Not Used in Production)

```
apps/web/src/lib/analyzer/prompts/  # TESTING HARNESS ONLY — not used at runtime
├── prompt-builder.ts              # Composition engine (testing only)
├── prompt-testing.ts              # Testing utilities
├── OUTPUT_SCHEMAS.md              # Schema documentation
├── base/                          # Task-specific base prompts (testing only)
├── providers/                     # LLM-specific variants (testing only)
└── config-adaptations/            # Configuration adaptations (testing only)
```

---

## Prompt Loading Flow (Runtime)

```
┌─────────────────────────────────────────────────────────────────┐
│                   loadAndRenderSection()                         │
│                                                                  │
│  Input:                                                          │
│  ├─ pipeline: 'orchestrated' | 'monolithic-dynamic' | ...       │
│  ├─ sectionName: 'DYNAMIC_PLAN' | 'UNDERSTAND' | ...            │
│  └─ variables: { currentDate, TEXT_TO_ANALYZE, ... }            │
│                                                                  │
│  Flow:                                                           │
│  ┌──────────────────┐                                           │
│  │  UCM Database    │ ← Config DB with seeded prompt content    │
│  │  (config_blobs)  │                                           │
│  └────────┬─────────┘                                           │
│           │ loadPromptConfig()                                   │
│  ┌────────▼─────────┐                                           │
│  │  Parse Sections  │ ← Extract ## SECTION_NAME headers         │
│  │  (extractSections)│                                           │
│  └────────┬─────────┘                                           │
│           │ renderSection()                                      │
│  ┌────────▼─────────┐                                           │
│  │ Variable Subst.  │ ← Replace ${currentDate}, etc.            │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│     Rendered Prompt Section                                      │
└─────────────────────────────────────────────────────────────────┘
```

Provider-specific structured output is loaded as a separate section (e.g., `STRUCTURED_OUTPUT_ANTHROPIC`) and concatenated to the main prompt.

---

## Pipeline Prompt Sections

### Monolithic Dynamic Pipeline (`monolithic-dynamic.prompt.md`)

| Section | Purpose | Variables |
|---------|---------|-----------|
| `DYNAMIC_PLAN` | System prompt for planning/research phase | `${currentDate}` |
| `DYNAMIC_ANALYSIS` | System prompt for analysis/verdict phase | `${currentDate}` |
| `DYNAMIC_ANALYSIS_USER` | User message template with input + sources | `${TEXT_TO_ANALYZE}`, `${SOURCE_SUMMARY}` |
| `STRUCTURED_OUTPUT_ANTHROPIC` | JSON output guidance for Claude | (none) |
| `STRUCTURED_OUTPUT_OPENAI` | JSON output guidance for GPT | (none) |
| `STRUCTURED_OUTPUT_GOOGLE` | JSON output guidance for Gemini | (none) |
| `STRUCTURED_OUTPUT_MISTRAL` | JSON output guidance for Mistral | (none) |

### Orchestrated Pipeline (`orchestrated.prompt.md`)

Uses many more sections — see the prompt file for the complete list. Key sections include `UNDERSTAND`, `EXTRACT_EVIDENCE`, `VERDICT`, `CONTEXT_REFINEMENT`, `SEARCH_RELEVANCE_*`, etc.

---

## Provider-Specific Optimizations

Provider-specific structured output guidance is embedded as named sections in each `.prompt.md` file. The pipeline code dynamically selects the right section based on the detected provider:

```typescript
const provider = detectProvider(model.modelName);  // "anthropic" | "openai" | "google" | "mistral"
const section = `STRUCTURED_OUTPUT_${provider.toUpperCase()}`;
const rendered = await loadAndRenderSection("monolithic-dynamic", section, {});
```

### Anthropic (Claude)
- JSON format rules (valid JSON, empty strings, no null)
- Field validation (id formats, enum values, boolean/number types)

### OpenAI (GPT)
- Field completeness (all required fields even if empty)
- Common GPT errors to avoid (omitting fields, null vs "", casing)

### Google (Gemini)
- Length enforcement (verify field limits before output)
- No explanatory text outside JSON structure

### Mistral
- Validation checklist format (field types, presence)

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
import { loadAndRenderSection } from './prompt-loader';
import { detectProvider } from './prompts/prompt-builder';

// Runtime prompt loading (production):
const currentDate = new Date().toISOString().split('T')[0];
const provider = detectProvider(model.modelName);

const rendered = await loadAndRenderSection("monolithic-dynamic", "DYNAMIC_PLAN", {
  currentDate,
});
const structuredOutput = await loadAndRenderSection(
  "monolithic-dynamic",
  `STRUCTURED_OUTPUT_${provider.toUpperCase()}`,
  {},
);
const systemPrompt = rendered.content + (structuredOutput?.content || "");
```

---

## Adding a New Provider

1. Add a `STRUCTURED_OUTPUT_NEWPROVIDER` section to the relevant `.prompt.md` files
2. Update `detectProvider()` in `prompt-builder.ts` to recognize new model IDs
3. Update `isBudgetModel()` if the provider has fast-tier models
4. Test with `prompt-optimization.test.ts` and `monolithic-dynamic-prompt.test.ts`

---

## Prompt Content Improvements

### v2.8.2: Prompt Externalization to UCM (Feb 13, 2026)

**Achievement**: All runtime LLM prompts now load from UCM-managed `.prompt.md` files, compliant with AGENTS.md String Usage Boundary.

**Changes**:
- Monolithic-dynamic system prompts moved from `buildPrompt()` → `loadAndRenderSection()` (commit 0d05947)
- Orchestrated search relevance mode instructions moved from inline code → prompt file sections (commit ef2def6)
- 4 provider-specific structured output sections added to `monolithic-dynamic.prompt.md`
- TypeScript prompt modules under `prompts/` retained for testing harness only

**Impact**:
- All LLM prompt text is now admin-configurable via UCM without code changes
- Both orchestrated and monolithic-dynamic pipelines load prompts from UCM database
- 27 new CI-safe tests validate prompt file structure and content

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

**Critical Guidance Preserved**:
- Death/injury claims = MANDATORY HIGH centrality
- Attribution/source/timing = LOW centrality
- Incidental temporal mentions ≠ multi-context (unless time IS the subject)
- Measurement frameworks = distinct analytical boundaries

---

### v2.6.38: Temporal Guidance Clarification

**Problem**: Base prompts had conflicting guidance about when temporal differences create distinct contexts:
- "Different time periods alone do not create separate contexts"
- "Time period (e.g., '2000s' vs '1970s') → DISTINCT"

**Solution**: Clarified distinction between:
- **Incidental temporal mentions** (e.g., "in 2020, the court...") - Do NOT create separate contexts
- **Time period as primary subject** (e.g., "2000s event" vs "1970s event" as distinct historical events) - DO create separate contexts

---

## Related Documentation

- [OUTPUT_SCHEMAS.md](../../apps/web/src/lib/analyzer/prompts/OUTPUT_SCHEMAS.md) - Centralized JSON schema reference for all LLM phases
- [LLM Configuration Guide](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Subsystems%20and%20Components/LLM%20Configuration/WebHome.xwiki) - User-facing provider setup
- [LLM Schema Mapping](../xwiki-pages/FactHarbor/Product Development/Specification/Reference/Data%20Models%20and%20Schemas/LLM%20Schema%20Mapping/WebHome.xwiki) - TypeScript to LLM output mapping
- [Pipeline Architecture](../xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep%20Dive/Pipeline%20Variants/WebHome.xwiki) - Overall pipeline design
- [Calculations](./Calculations.md) - Verdict calculation methodology including multi-context averaging
