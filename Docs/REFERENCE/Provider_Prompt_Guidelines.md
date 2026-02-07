> **MOVED TO xWiki** (2026-02-06)
> 
> This document has been consolidated into the xWiki documentation system.
> The xWiki version is now the authoritative source.
> 
> **xWiki file**: `Docs/xwiki-pages/FactHarbor_Spec_and_Impl/FactHarbor/Specification/Reference/Prompt Engineering/Prompt Guidelines/WebHome.xwiki`
> 
> This .md file is kept for reference only. Do not edit - edit the .xwiki file instead.

---


# Provider-Specific Prompt Guidelines

**Version**: 2.6.41
**Last Updated**: 2026-02-02
**Status**: Implementation Complete

---

## Overview

This document describes the provider-specific prompt optimizations implemented in FactHarbor v2.8. Each LLM provider has unique strengths and tendencies that can be leveraged (or compensated for) through tailored prompt engineering.

---

## Provider Optimization Summary

| Provider | Strengths | Compensations | Key Techniques |
|----------|-----------|---------------|----------------|
| **Claude (Anthropic)** | Nuanced reasoning, context detection | Over-hedging tendency | XML tags, thinking blocks |
| **GPT (OpenAI)** | Fast structured output, examples | Over-splitting, balanced drift | Few-shot examples, calibration |
| **Gemini (Google)** | Large context, factual extraction | Verbosity | Length limits, checklists |
| **Mistral** | Fast, rule-following | Less nuanced | Step-by-step, templates |

---

## Claude (Anthropic)

### Model Variants
- **Premium**: `claude-sonnet-4-20250514` (verdict, reasoning)
- **Budget**: `claude-3-5-haiku-20241022` (extraction)

### Optimization Techniques

#### 1. XML Structure Tags
Claude excels with XML-structured prompts. Use tags to organize sections:

```xml
<claude_optimization>
## PROMPT STRUCTURE
This prompt uses XML tags for optimal Claude comprehension.

<thinking_process>
Before generating output, work through:
1. What type of input is this?
2. Are there multiple analytical frames?
3. Which claims need attribution separation?
</thinking_process>

<output_rules>
- Return valid JSON matching schema
- Use empty strings "" for optional fields
</output_rules>
</claude_optimization>
```

#### 2. Thinking Blocks
Encourage explicit reasoning before output:

```xml
<thinking_process>
For each context, reason through:
1. What does the USER'S CLAIM state?
2. What does the EVIDENCE show?
3. Do they MATCH or CONTRADICT?
</thinking_process>
```

#### 3. Prefill Technique
Start the assistant response with JSON structure to guide output:

```typescript
// In llm.ts
getClaudePrefill('understand') // Returns: '{"impliedClaim":'
```

### Compensation Strategies
- **Avoid over-hedging**: Instruct to be "direct and confident"
- **Prevent peripheral claims**: Focus on "verifiable assertions"
- **Limit query redundancy**: "Each search query should be distinct"

---

## GPT (OpenAI)

### Model Variants
- **Premium**: `gpt-4o` (verdict, reasoning)
- **Budget**: `gpt-4o-mini` (extraction)

### Optimization Techniques

#### 1. Few-Shot Examples
GPT responds exceptionally well to concrete examples:

```typescript
`### FEW-SHOT EXAMPLE (Follow this pattern)

Input: "The WHO spokesperson stated that the new variant is more transmissible"
Output:
{
  "subClaims": [
    {
      "id": "SC1",
      "text": "A WHO spokesperson made a public statement...",
      "claimRole": "attribution",
      "centrality": "low"
    },
    {
      "id": "SC2",
      "text": "The new variant is more transmissible...",
      "claimRole": "core",
      "centrality": "high"
    }
  ]
}`
```

#### 2. Explicit Field Lists
Always enumerate required fields:

```typescript
`### REQUIRED OUTPUT FIELDS (All must be present)
- impliedClaim: string (neutral summary)
- articleThesis: string (what input asserts)
- subClaims: array with id, text, claimRole, centrality, isCentral
- researchQueries: array of 4-6 distinct search strings`
```

#### 3. Calibration Tables
Use tables to guide verdict scoring:

```typescript
`### VERDICT CALIBRATION TABLE
| Evidence Pattern | Verdict Range |
|-----------------|---------------|
| 3+ supporting, 0 counter | 80-95% (TRUE/MOSTLY TRUE) |
| 2-3 supporting, 1 counter | 65-79% (LEANING TRUE) |
| Balanced evidence | 43-57% (MIXED) |
| 1 supporting, 2-3 counter | 21-35% (LEANING FALSE) |
| 0-1 supporting, 3+ counter | 5-20% (FALSE/MOSTLY FALSE) |`
```

### Compensation Strategies
- **Prevent over-splitting**: Include "If ANY answer is 'no' → Don't create that context"
- **Counter balance drift**: "Do NOT artificially center at 50%"
- **Ensure schema compliance**: "Use '' for empty strings, NEVER null"

---

## Gemini (Google)

### Model Variants
- **Premium**: `gemini-1.5-pro` (verdict, reasoning)
- **Budget**: `gemini-1.5-flash` (extraction)

### Optimization Techniques

#### 1. Explicit Length Limits
Gemini tends toward verbosity. Always specify limits:

```typescript
`### OUTPUT LENGTH LIMITS (MUST FOLLOW)
| Field | Maximum |
|-------|---------|
| impliedClaim | 150 characters |
| claim text | 150 characters |
| keyFactors.factor | 12 words |
| keyFactors.explanation | 20 words |
| shortAnswer | 25 words |`
```

#### 2. Numbered Processes
Structure complex tasks as numbered steps:

```typescript
`### NUMBERED PROCESS
1. Read input completely
2. Identify claim type (statement vs article)
3. Extract claims with attribution separation
4. Assess centrality (expect 1-4 HIGH max)
5. Detect context boundaries if present
6. Generate 4-6 search queries
7. Output JSON`
```

#### 3. Schema Checklists
Force validation before output:

```typescript
`### SCHEMA CHECKLIST (Verify before output)
- [ ] id: string (SC1, SC2, etc.)
- [ ] text: string (≤150 chars)
- [ ] claimRole: "attribution" | "source" | "timing" | "core"
- [ ] centrality: "high" | "medium" | "low"
- [ ] dependsOn: array of claim IDs (or empty [])`
```

### Compensation Strategies
- **Prevent verbosity**: "Keep all text fields concise"
- **Force schema compliance**: "Arrays must be arrays (even single items)"
- **Explicit enum values**: List exact allowed strings

---

## Mistral

### Model Variants
- **Premium**: `mistral-large-latest` (verdict, reasoning)
- **Budget**: `mistral-small-latest` (extraction)

### Optimization Techniques

#### 1. Step-by-Step Instructions
Mistral excels at following explicit sequences:

```typescript
`### STEP-BY-STEP PROCESS (Follow exactly)

**Step 1:** Read input completely

**Step 2:** Identify input type
- Statement about facts → "claim"
- News article/long text → "article"

**Step 3:** Extract claims using template
For each claim found:
- id: SC{n}
- text: [the claim statement]
- claimRole: [pick: attribution | source | timing | core]
- centrality: [pick: high | medium | low]`
```

#### 2. Field Templates
Provide exact structure to fill in:

```typescript
`**Step 2c:** Fill verdict template
{
  "contextId": "[context ID]",
  "answer": [0-100 integer],
  "confidence": [0-100 integer],
  "shortAnswer": "[complete sentence, ≤25 words]",
  "keyFactors": [array of 3-5 items]
}`
```

#### 3. Validation Checklists
Include explicit pre-output verification:

```typescript
`### VALIDATION CHECKLIST
[ ] All claims have unique IDs (SC1, SC2, etc.)
[ ] Core claims separated from attribution
[ ] Only 1-4 claims marked as "high" centrality
[ ] 4-6 search queries included
[ ] JSON is valid`
```

### Compensation Strategies
- **Add explicit guidance**: More detailed than other providers
- **Use enumerated rules**: List options explicitly
- **Include examples**: For each classification decision

---

## Budget Model Optimization

When pipeline config enables tiering, fast-tier models receive simplified prompts:

### Token Reduction (~40%)
| Component | Full Prompt | Budget Prompt |
|-----------|-------------|---------------|
| Examples | 2-3 per task | 1 per task |
| Glossaries | Full terminology | Inline definitions only |
| Provider variant | Full section | Single-line hint |
| Reasoning guidance | Detailed | Skip complex reasoning |

### Budget Model Detection
```typescript
// In prompt-builder.ts
const budgetModels = [
  'claude-3-5-haiku', 'claude-3-haiku',
  'gpt-4o-mini', 'gpt-3.5-turbo',
  'gemini-1.5-flash', 'gemini-flash',
  'mistral-small', 'mistral-medium',
];
```

### Budget Prompt Example
```typescript
`## FAST MODE

**Task**: Extract claims, generate queries. Skip complex reasoning.

**Example**:
Input: "Expert X says Y is harmful"
Output: 2 claims
1. {id: "SC1", text: "Expert X made statements about Y", claimRole: "attribution", centrality: "low"}
2. {id: "SC2", text: "Y is harmful", claimRole: "core", centrality: "high"}

**Rules**:
- Separate WHO SAID from WHAT THEY SAID
- Only 1-2 claims = "high" centrality
- Generate 4 queries (2 supporting, 2 contradicting)
- Output valid JSON`
```

---

## Structured Output Hardening

### Provider-Specific JSON Guidance
Each provider receives tailored JSON output instructions:

| Provider | Key Guidance |
|----------|--------------|
| Claude | Empty strings "" not null, array fields as arrays |
| GPT | Include ALL required fields, use "" not null |
| Gemini | Length limits, no explanatory text outside JSON |
| Mistral | Field naming exact match, correct JSON syntax |

### Schema Retry Prompts
When schema validation fails, provider-specific retry prompts include:
- Summary of errors found
- Excerpt of original output
- Provider-specific fix guidance

### Claude Prefill Strings
```typescript
getClaudePrefill('understand')    // '{"impliedClaim":'
getClaudePrefill('extract_evidence') // '{"evidenceItems":['
getClaudePrefill('verdict')       // '{"contextId":'
```

---

## Testing

### Test Coverage
All provider optimizations are validated by `prompt-optimization.test.ts`:

| Test Category | Tests |
|---------------|-------|
| Provider variant generation | 16 |
| XML tags (Claude) | 3 |
| Few-shot examples (GPT) | 3 |
| Length limits (Gemini) | 2 |
| Step-by-step (Mistral) | 2 |
| Budget model optimization | 17 |
| Structured output | 16 |
| Critical guidance | 12 |
| Provider detection | 5 |
| Token estimation | 3 |
| Standard test cases | 4 |
| **Total** | **83** |

---

## File Reference

| File | Purpose |
|------|---------|
| `prompts/providers/anthropic.ts` | Claude-specific variants |
| `prompts/providers/openai.ts` | GPT-specific variants |
| `prompts/providers/google.ts` | Gemini-specific variants |
| `prompts/providers/mistral.ts` | Mistral-specific variants |
| `prompts/config-adaptations/tiering.ts` | Budget model prompts |
| `prompts/config-adaptations/structured-output.ts` | JSON guidance, retry prompts |
| `prompts/prompt-builder.ts` | Prompt composition logic |
| `prompts/prompt-testing.ts` | A/B testing utilities |
| `prompts/prompt-optimization.test.ts` | Comprehensive test suite |

---

## Best Practices

### Do
- ✅ Use provider-specific optimization techniques
- ✅ Include explicit examples for GPT
- ✅ Add length limits for Gemini
- ✅ Use step-by-step for Mistral
- ✅ Use XML tags for Claude
- ✅ Test prompts with `generateTestPrompt()`

### Don't
- ❌ Use same prompt for all providers
- ❌ Skip schema compliance guidance
- ❌ Assume LLMs handle null correctly (use "")
- ❌ Send verbose prompts to fast-tier models
- ❌ Skip validation checklists

---

**Document Status**: Living document - update as provider behaviors change
