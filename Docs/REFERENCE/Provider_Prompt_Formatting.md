# Provider-Specific Prompt Formatting

**Version**: 2.6.41 (v2.8.0 prompt architecture)
**Date**: 2026-01-29
**Status**: Implemented
**Related**: [Evidence Quality Filtering](../ARCHITECTURE/Evidence_Quality_Filtering.md)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Overview](#2-architecture-overview)
3. [Provider-Specific Optimizations](#3-provider-specific-optimizations)
4. [Prompt Composition Strategy](#4-prompt-composition-strategy)
5. [Configuration Adaptations](#5-configuration-adaptations)
6. [Testing and Validation](#6-testing-and-validation)

---

## 1. Introduction

### Purpose

FactHarbor's v2.8 prompt architecture uses **provider-specific formatting** to maximize performance across different LLM providers. Each provider (Anthropic, OpenAI, Google, Mistral) has unique strengths and preferred prompt structures.

### Problem Statement

Generic prompts perform sub-optimally across providers:
- Claude excels with XML-structured prompts
- GPT-4 prefers markdown with clear headings
- Gemini benefits from example-heavy prompts
- Mistral requires explicit reasoning guidance

A one-size-fits-all approach leaves significant performance gains untapped.

### Solution

**Dynamic prompt composition** with provider-specific variants:

```typescript
// Base prompt (universal logic)
const basePrompt = getExtractFactsBasePrompt();

// Provider variant (format optimization)
const providerVariant = getAnthropicExtractFactsVariant();  // or OpenAI, Gemini, Mistral

// Config adaptation (tiering, knowledge mode)
const configAdaptation = getTieringExtractFactsAdaptation(tier);

// Final composed prompt
const finalPrompt = basePrompt + providerVariant + configAdaptation;
```

---

## 2. Architecture Overview

### Prompt Builder Module

**Location**: [apps/web/src/lib/analyzer/prompts/prompt-builder.ts](../../apps/web/src/lib/analyzer/prompts/prompt-builder.ts)

**Supported Providers**:
- **Anthropic** (Claude Sonnet 4, Sonnet 3.5, Haiku 3.5)
- **OpenAI** (GPT-4, GPT-4 Turbo, GPT-3.5 Turbo)
- **Google** (Gemini 1.5 Pro, Gemini 1.5 Flash)
- **Mistral** (Mistral Large, Mistral Medium)

### Task Types

Prompts are composed for 7 task types:
1. **understand** - Initial claim understanding and decomposition
2. **extract_facts** - Evidence extraction from sources
3. **verdict** - Claim evaluation and verdict assignment
4. **scope_refinement** - AnalysisContext boundary detection
5. **dynamic_plan** - Dynamic analysis planning (monolithic mode)
6. **dynamic_analysis** - Dynamic analysis execution (monolithic mode)
7. **orchestrated_understand** - Combined understanding (orchestrated mode)

### Composition Layers

```
┌─────────────────────────────────────────┐
│ Base Prompt (universal logic)           │  ← Task requirements, schema, rules
├─────────────────────────────────────────┤
│ Provider Variant (format optimization)  │  ← XML tags, markdown, examples
├─────────────────────────────────────────┤
│ Config Adaptation (runtime tuning)      │  ← Tiering, knowledge mode, budget
└─────────────────────────────────────────┘
                  ↓
         Final Composed Prompt
```

---

## 3. Provider-Specific Optimizations

### 3.1 Anthropic Claude

**File**: [apps/web/src/lib/analyzer/prompts/providers/anthropic.ts](../../apps/web/src/lib/analyzer/prompts/providers/anthropic.ts)

**Optimizations**:
- ✅ **XML-structured prompts** - Claude excels with XML tags for clarity
- ✅ **Thinking blocks** - Explicit `<thinking_process>` sections for reasoning
- ✅ **Prefill technique** - Structured output guidance with examples
- ✅ **Nuanced reasoning** - Trust Claude's judgment on complex assessments
- ✅ **AnalysisContext detection** - Strong at detecting implicit scope boundaries

**Example Optimization**:
```xml
<claude_optimization>
## REASONING APPROACH
<thinking_process>
Before generating output, work through these steps internally:
1. What type of input is this? (claim vs article)
2. Identify the core factual assertions that need verification
3. Are there multiple analytical frames?
4. Which claims require attribution separation?
5. What search queries would find supporting AND contradicting evidence?
</thinking_process>

## ATTRIBUTION SEPARATION (CRITICAL)
<attribution_rule>
ALWAYS separate attribution claims from content claims:
- Input: "Expert X claims Y is dangerous"
- Output TWO claims:
  1. "Expert X made statements about Y" (attribution, LOW centrality)
  2. "Y is dangerous" (core, HIGH centrality)
</attribution_rule>
</claude_optimization>
```

**Why This Works**:
- Claude's training prioritizes XML tag recognition
- Thinking blocks align with Claude's internal reasoning process
- Attribution separation leverages Claude's nuanced understanding

### 3.2 OpenAI GPT-4

**File**: [apps/web/src/lib/analyzer/prompts/providers/openai.ts](../../apps/web/src/lib/analyzer/prompts/providers/openai.ts)

**Optimizations**:
- ✅ **Markdown headings** - Clear H2/H3 structure with `##` and `###`
- ✅ **Numbered lists** - Explicit step-by-step instructions
- ✅ **Code block examples** - JSON schema with inline comments
- ✅ **Explicit constraints** - "NEVER", "ALWAYS", "MUST" keywords
- ✅ **Function calling** - Structured output via JSON mode

**Example Optimization**:
```markdown
## OpenAI Optimization - Extract Facts Task

### Step-by-Step Process

1. **Read the source content** - Scan for verifiable statements
2. **Extract specific claims** - Look for concrete facts, not opinions
3. **Assign probativeValue** - Rate quality (high/medium/low)
4. **Link to source** - Include excerpt + URL for attribution
5. **Categorize evidence** - Classify as statistic, expert_quote, event, etc.

### Output Requirements

**REQUIRED Fields**:
- `id`: Unique identifier (format: "S{sourceId}-F{number}")
- `fact`: The extracted statement (20+ characters)
- `category`: Evidence category (see schema)
- `sourceUrl`: Full URL of source
- `sourceExcerpt`: Relevant excerpt (30+ characters)

**NEVER Extract**:
- Vague statements ("some say", "many believe")
- Opinions without attribution
- Speculative language ("might", "could", "possibly")

```json
{
  "id": "S1-F1",
  "fact": "The study found a 25% increase in efficiency",
  "category": "statistic",
  "probativeValue": "high",
  "sourceUrl": "https://example.com/study",
  "sourceExcerpt": "Published in Nature (2023), the peer-reviewed study documented..."
}
```
```

**Why This Works**:
- GPT-4's training emphasizes markdown structure
- Numbered lists provide clear execution order
- Code blocks with comments aid JSON schema comprehension

### 3.3 Google Gemini

**File**: [apps/web/src/lib/analyzer/prompts/providers/google.ts](../../apps/web/src/lib/analyzer/prompts/providers/google.ts)

**Optimizations**:
- ✅ **Example-heavy prompts** - Multiple before/after examples
- ✅ **Visual formatting** - Use of emojis and bullets for emphasis
- ✅ **Repetition for clarity** - Key rules stated 2-3 times
- ✅ **Concrete over abstract** - Specific examples > general principles
- ✅ **Short paragraphs** - Break complex instructions into small chunks

**Example Optimization**:
```markdown
## Gemini Optimization - Extract Facts Task

### 📋 What You'll Do

Extract verifiable facts from sources. Each fact needs:
- ✅ A clear statement (what was claimed)
- ✅ Source attribution (where it came from)
- ✅ Quality rating (high/medium/low)

### ✅ Good Example

**Input Source**: "The WHO report found COVID-19 mortality rate of 2.1% in 2023"

**Output**:
```json
{
  "fact": "WHO report documented COVID-19 mortality rate of 2.1% in 2023",
  "probativeValue": "high",
  "sourceUrl": "https://who.int/reports/2023",
  "sourceExcerpt": "The World Health Organization annual report documented a COVID-19 mortality rate of 2.1%..."
}
```

### ❌ Bad Example

**Input Source**: "Some experts say COVID-19 is concerning"

**Output**: *DO NOT EXTRACT* (vague attribution, no concrete fact)

### 📊 Quality Ratings

**High probativeValue**:
- Specific data with attribution ("Study X found Y%")
- Expert testimony with credentials ("Dr. Smith, Harvard professor...")
- Official documents with citations ("Court ruling 2023-456...")

**Medium probativeValue**:
- General claims with reasonable attribution ("Recent studies suggest...")
- Moderate specificity ("Performance improved last quarter")

**Low probativeValue** (DO NOT EXTRACT):
- Vague attribution ("Some say...", "Many believe...")
- Speculation ("Could be...", "Might have...")
```

**Why This Works**:
- Gemini benefits from visual anchors (emojis, bullets)
- Multiple examples provide pattern recognition
- Repetition reinforces key rules

### 3.4 Mistral

**File**: [apps/web/src/lib/analyzer/prompts/providers/mistral.ts](../../apps/web/src/lib/analyzer/prompts/providers/mistral.ts)

**Optimizations**:
- ✅ **Explicit reasoning steps** - Chain-of-thought guidance
- ✅ **French-language examples** - Mistral's training includes French corpus
- ✅ **Formal tone** - Academic-style instructions
- ✅ **Strict schema adherence** - Emphasis on JSON structure
- ✅ **Error prevention** - Common pitfalls highlighted

**Example Optimization**:
```markdown
## Mistral Optimization - Extract Facts Task

### Reasoning Chain (Chaîne de Raisonnement)

For each source passage:

1. **Identify** verifiable statements (Identifier les déclarations vérifiables)
2. **Evaluate** probative value (Évaluer la valeur probante)
3. **Extract** with source linkage (Extraire avec attribution de source)
4. **Validate** against schema (Valider selon le schéma)

### Schema Adherence (Respect du Schéma)

CRITICAL: Every extracted fact MUST conform to this structure:

```typescript
interface EvidenceItem {
  id: string;               // Required: "S{sourceId}-F{number}"
  fact: string;             // Required: Minimum 20 characters
  category: string;         // Required: From allowed categories
  sourceUrl: string;        // Required: Full HTTP/HTTPS URL
  sourceExcerpt: string;    // Required: Minimum 30 characters
  probativeValue?: string;  // Optional: "high" | "medium" | "low"
}
```

### Common Errors to Avoid (Erreurs Courantes à Éviter)

❌ Missing required fields → Schema validation will fail
❌ Empty strings for required fields → Use meaningful content
❌ Relative URLs → Use absolute URLs (https://...)
❌ Too-short excerpts → Minimum 30 characters required
```

**Why This Works**:
- Mistral performs well with formal, academic prompting
- Explicit reasoning chain aids structured thinking
- Bilingual examples leverage training corpus

---

## 4. Prompt Composition Strategy

### Base Prompts (Universal Layer)

**Directory**: [apps/web/src/lib/analyzer/prompts/base/](../../apps/web/src/lib/analyzer/prompts/base/)

**Files**:
- `understand-base.ts` - Core understanding logic
- `extract-facts-base.ts` - Evidence extraction rules
- `verdict-base.ts` - Verdict evaluation criteria
- `scope-refinement-base.ts` - AnalysisContext boundary detection

**Content**:
- Task requirements
- JSON schema definitions
- Universal rules (Ground Realism, quality gates)
- Terminology guidance (EvidenceItem, AnalysisContext)

### Provider Variants (Format Layer)

**Directory**: [apps/web/src/lib/analyzer/prompts/providers/](../../apps/web/src/lib/analyzer/prompts/providers/)

**Files**:
- `anthropic.ts` - Claude-specific optimizations
- `openai.ts` - GPT-4 optimizations
- `google.ts` - Gemini optimizations
- `mistral.ts` - Mistral optimizations

**Content**:
- Format adaptations (XML vs markdown)
- Examples in provider-preferred style
- Reasoning guidance tailored to provider strengths
- Output structure hints

### Config Adaptations (Runtime Layer)

**Directory**: [apps/web/src/lib/analyzer/prompts/config-adaptations/](../../apps/web/src/lib/analyzer/prompts/config-adaptations/)

**Files**:
- `tiering.ts` - Budget tier adaptations (premium/standard/budget)
- `knowledge-mode.ts` - Model knowledge mode (with/without knowledge)
- `structured-output.ts` - JSON mode guidance

**Content**:
- Tier-specific constraints (token limits, search quotas)
- Knowledge mode instructions (use/ignore model knowledge)
- Structured output validation

### Composition Function

**Location**: [apps/web/src/lib/analyzer/prompts/prompt-builder.ts:buildPrompt()](../../apps/web/src/lib/analyzer/prompts/prompt-builder.ts)

```typescript
export function buildPrompt(
  taskType: TaskType,
  provider: 'anthropic' | 'openai' | 'google' | 'mistral',
  config?: { tier?: string; knowledgeMode?: string; }
): string {
  // 1. Get base prompt (universal logic)
  const base = getBasePromptForTask(taskType);

  // 2. Get provider variant (format optimization)
  const variant = getProviderVariantForTask(taskType, provider);

  // 3. Get config adaptation (runtime tuning)
  const adaptation = getConfigAdaptation(taskType, config);

  // 4. Compose final prompt
  return base + '\n\n' + variant + '\n\n' + adaptation;
}
```

---

## 5. Configuration Adaptations

### 5.1 Tiering Adaptations

**Purpose**: Adjust prompts based on budget tier (premium/standard/budget)

**Premium Tier**:
- Full reasoning guidance
- Multiple examples
- Extended search quotas
- No token limits

**Standard Tier**:
- Essential reasoning guidance
- Key examples only
- Standard search quotas
- Moderate token limits

**Budget Tier**:
- Minimal reasoning guidance
- No examples (schema only)
- Reduced search quotas
- Strict token limits

**Example**:
```typescript
// Premium tier (full guidance)
const premium = `
## REASONING APPROACH (Premium)
Use your full capabilities to:
1. Deeply analyze input for implicit claims
2. Detect subtle AnalysisContext boundaries
3. Generate comprehensive search queries (up to 12)
4. Extract all relevant evidence (no artificial limits)
`;

// Budget tier (minimal guidance)
const budget = `
## INSTRUCTIONS (Budget Mode)
1. Identify core claims only (max 5)
2. Generate essential search queries (max 6)
3. Extract most critical evidence only (max 20 items)
Token limit: 8000 tokens
`;
```

### 5.2 Knowledge Mode Adaptations

**Purpose**: Control whether LLM can use internal knowledge vs. sources-only

**With Model Knowledge**:
- LLM can use training data for context
- Useful for well-known topics
- Risk: May inject outdated knowledge

**Without Model Knowledge** (Sources-Only):
- LLM must base all claims on provided sources
- Required for Ground Realism enforcement
- Prevents hallucination

**Example**:
```typescript
// With knowledge
const withKnowledge = `
You may use your training knowledge to contextualize claims, but all EVIDENCE
must come from provided sources with proper attribution.
`;

// Without knowledge (sources-only)
const withoutKnowledge = `
CRITICAL: You MUST base all evidence exclusively on the provided sources.
DO NOT use your training knowledge. If sources don't contain information,
state that evidence is insufficient rather than using model knowledge.
`;
```

---

## 6. Testing and Validation

### Test Suite Location

**File**: [apps/web/test/unit/lib/analyzer/prompts/prompt-optimization.test.ts](../../apps/web/test/unit/lib/analyzer/prompts/prompt-optimization.test.ts)

**Coverage**:
- Provider-specific variant generation
- Prompt composition correctness
- Config adaptation merging
- Schema validation

### Validation Checks

**Automated Checks**:
1. **Prompt length** - Ensure prompt doesn't exceed provider limits
   - Claude: 200k tokens
   - GPT-4: 128k tokens
   - Gemini: 2M tokens
   - Mistral: 128k tokens

2. **Schema inclusion** - Verify JSON schema present in all prompts

3. **Required fields** - Check that all required fields documented

4. **Provider-specific markers** - Validate XML tags (Claude), markdown (GPT-4), etc.

### Manual Review Process

**Before deploying prompt changes**:
1. ✅ Test with representative inputs (3-5 samples per task type)
2. ✅ Compare outputs across providers (consistency check)
3. ✅ Validate JSON schema adherence
4. ✅ Check for unintended behavior changes
5. ✅ Review with domain expert (if terminology changes)

---

## Appendix A: Provider Feature Matrix

| Feature | Anthropic | OpenAI | Google | Mistral |
|---------|-----------|--------|--------|---------|
| **XML Tags** | ✅ Excellent | ❌ Poor | ⚠️ Moderate | ❌ Poor |
| **Markdown** | ✅ Good | ✅ Excellent | ✅ Good | ✅ Good |
| **Thinking Blocks** | ✅ Native | ⚠️ Simulated | ⚠️ Simulated | ⚠️ Simulated |
| **Prefill** | ✅ Supported | ❌ No | ❌ No | ❌ No |
| **JSON Mode** | ✅ Structured | ✅ Structured | ✅ Structured | ✅ Structured |
| **Examples Heavy** | ⚠️ Moderate | ✅ Good | ✅ Excellent | ⚠️ Moderate |
| **Nuanced Reasoning** | ✅ Excellent | ✅ Excellent | ⚠️ Good | ⚠️ Good |
| **Schema Adherence** | ✅ Excellent | ✅ Excellent | ⚠️ Good | ⚠️ Moderate |
| **AnalysisContext Detection** | ✅ Excellent | ✅ Good | ⚠️ Moderate | ⚠️ Moderate |
| **Attribution Separation** | ✅ Excellent | ✅ Good | ⚠️ Moderate | ⚠️ Moderate |

**Legend**:
- ✅ Excellent - Strong native support, highly effective
- ✅ Good - Reliable support, effective
- ⚠️ Moderate - Acceptable support, requires careful prompting
- ❌ Poor/No - Weak support, avoid using

---

## Appendix B: Related Documents

- [Evidence Quality Filtering](../ARCHITECTURE/Evidence_Quality_Filtering.md) - Layer 1 prompt enforcement
- [AGENTS.md](../../AGENTS.md) - LLM agent rules and guidance
- [Unified Config Management](../USER_GUIDES/Unified_Config_Management.md) - Runtime configuration
- [prompt-builder.ts](../../apps/web/src/lib/analyzer/prompts/prompt-builder.ts) - Implementation

---

**Document Version**: 1.0
**Last Updated**: 2026-01-29
**Next Review**: When adding new providers or major prompt changes
**Maintained by**: Plan Coordinator
