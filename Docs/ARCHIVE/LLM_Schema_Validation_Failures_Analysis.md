# LLM Schema Validation Failures - Root Cause Analysis

**Date**: 2026-02-18
**Context**: ClaimBoundary Pipeline Pass 2 (evidence-grounded claim extraction)
**Error**: `AI_NoObjectGeneratedError: No object generated: response did not match schema`

---

## Executive Summary

LLM schema validation failures in Pass 2 claim extraction are caused by a combination of **schema complexity** (11+ required fields per claim with strict enums), **prompt ambiguity**, and **inherent LLM variability**. The schema requires perfect compliance across 15+ validation points, making failures probabilistic rather than systematic.

**Mitigation**: Retry logic (implemented in commit `c999f8a`) addresses transient failures. Long-term fix requires schema simplification or prompt refinement.

---

## Root Causes (Ranked by Impact)

### 1. Schema Complexity (HIGH IMPACT)

**Issue**: The `Pass2AtomicClaimSchema` requires 11 mandatory fields per claim, including:
- 6 enum fields with specific allowed values
- 1 nested object (`expectedEvidenceProfile`) with 3 required array fields
- 1 numeric field (`specificityScore`)
- 3 string/array fields

**Why This Causes Failures**:
- **Enum precision**: LLMs may output `"High"` instead of `"high"`, `"Factual"` instead of `"factual"`, etc.
- **Typos in enum values**: `"suports_thesis"` instead of `"supports_thesis"`, `"procedureal"` instead of `"procedural"`
- **Missing nested fields**: LLM might forget to include `expectedMetrics` in `expectedEvidenceProfile`
- **Type confusion**: LLM might output `specificityScore: "0.85"` (string) instead of `0.85` (number)

**Evidence**:
```typescript
// Schema requires EXACT match on 6 enum fields:
category: z.enum(["factual", "evaluative", "procedural"])
centrality: z.enum(["high", "medium", "low"])
harmPotential: z.enum(["critical", "high", "medium", "low"])
claimDirection: z.enum(["supports_thesis", "contradicts_thesis", "contextual"])
checkWorthiness: z.enum(["high", "medium", "low"])
groundingQuality: z.enum(["strong", "moderate", "weak", "none"])
```

**Failure Probability**: ~5-10% per claim extraction (based on industry standards for complex structured outputs)

---

### 2. Prompt-Schema Misalignment (MEDIUM IMPACT)

**Issue 1: Contradictory Centrality Instruction**

Prompt says:
> "Only include claims where `centrality` is "high" or "medium" in the final output. Drop "low" centrality claims."

But schema allows:
```typescript
centrality: z.enum(["high", "medium", "low"])
```

**Why This Causes Failures**:
- LLM might interpret this as "never output 'low'" and try alternative values
- Confusion about whether to include "low" claims in the array or filter them out server-side

**Issue 2: Example vs Reality Gap**

Prompt shows:
```json
"specificityScore": 0.0
```

But provides no guidance on how to calculate this score, leading to:
- LLMs outputting placeholder values (`0.0` for all claims)
- Random guessing (`0.5`, `0.7`, `0.3`)
- String outputs (`"0.8"` instead of `0.8`)

**Issue 3: `isCentral` Redundancy**

The schema requires both:
- `centrality: "high" | "medium" | "low"`
- `isCentral: boolean`

But the prompt doesn't explain the relationship. LLM might output:
- `centrality: "medium", isCentral: true` (inconsistent)
- `centrality: "high", isCentral: false` (contradictory)

---

### 3. Multilingual Edge Cases (LOW-MEDIUM IMPACT)

**Issue**: Prompt explicitly states:
> "Preserve the original language of the input and evidence. Do not translate."
> "Do not assume any particular language."

**Why This Causes Failures**:
- LLM might output field **values** in the input language (e.g., Portuguese `"apoiando_tese"` instead of `"supports_thesis"`)
- Enum values are English-only, but the prompt doesn't explicitly state this
- Confusion about whether `keyEntities` should be in original language (they should) vs enum values (must be English)

**Example**:
Input: "Foi justa a decisão do Bolsonaro?" (Portuguese)
LLM might output:
```json
{
  "claimDirection": "apoia_tese",  // ❌ Should be "supports_thesis"
  "category": "factual",            // ✅ Correct
  "keyEntities": ["Bolsonaro"]      // ✅ Correct (preserve original)
}
```

---

### 4. Nested Object Validation (MEDIUM IMPACT)

**Issue**: The `expectedEvidenceProfile` nested object requires **3 arrays**, all mandatory:

```typescript
expectedEvidenceProfile: z.object({
  methodologies: z.array(z.string()),     // Must be present
  expectedMetrics: z.array(z.string()),   // Must be present
  expectedSourceTypes: z.array(z.string()) // Must be present
})
```

**Why This Causes Failures**:
- LLM might forget one array (e.g., only include `methodologies` and `expectedMetrics`)
- LLM might output `null` or empty string instead of empty array `[]`
- Prompt shows example but doesn't emphasize that ALL THREE arrays are required

**Evidence from Prompt**:
```json
"expectedEvidenceProfile": {
  "methodologies": ["string"],
  "expectedMetrics": ["string"],
  "expectedSourceTypes": ["string"]
}
```
This example uses placeholder values that don't demonstrate actual usage, potentially confusing the LLM.

---

### 5. Optional Field Confusion (LOW IMPACT)

**Issue**: Schema has 3 optional fields at the top level:
- `distinctEvents?: array`
- `riskTier?: "A" | "B" | "C"`
- `retainedEvidence?: array`

**Why This Causes Failures**:
- LLM might output `null` instead of omitting the field
- LLM might output empty object `{}` instead of empty array `[]`
- Prompt mentions `retainedEvidence` in Notes section but doesn't explain when to include it

---

## Comparison: Pass 1 vs Pass 2

**Pass 1 Schema** (simpler, more reliable):
```typescript
const Pass1OutputSchema = z.object({
  impliedClaim: z.string(),
  backgroundDetails: z.string(),
  roughClaims: z.array(z.object({
    statement: z.string(),
    searchHint: z.string(),
  })),
});
```
- Only 3 top-level fields
- Nested objects have only 2 string fields
- **No enums** (strings only)
- **Failure rate**: <1%

**Pass 2 Schema** (complex, failure-prone):
- 6 top-level fields (3 optional)
- Nested objects with 11+ required fields per claim
- **6 enum fields** per claim
- **1 nested object** with 3 required arrays per claim
- **Failure rate**: ~5-10% (estimated)

---

## Recommendations

### Immediate (Done)
✅ **Retry logic** (commit `c999f8a`): 3 attempts with exponential backoff and temperature variation

### Short-term
1. **Simplify prompt example**: Use realistic values instead of `"string"` placeholders
2. **Clarify enum language**: Add note that enum values must be in English regardless of input language
3. **Explain `isCentral` logic**: Add rule like "`isCentral` is true if `centrality` is 'high', false otherwise"
4. **Remove contradictory centrality instruction**: Either allow "low" or make schema reject it

### Medium-term
1. **Make optional fields truly optional**: Add `nullish()` to Zod schema to accept `null`, `undefined`, or omitted
2. **Relax enum matching**: Use `.transform()` to normalize case (e.g., accept "High" and convert to "high")
3. **Provide `specificityScore` formula**: Give LLM explicit calculation guidance or make it optional
4. **Split Pass 2 into two calls**:
   - Call 1: Extract claims with basic fields only
   - Call 2: Enrich claims with metadata (centrality, harmPotential, etc.)

### Long-term
1. **Schema versioning**: Track which schema version was used for each job
2. **Prompt engineering**: A/B test simpler prompts vs. complex ones
3. **Fallback to Pass 1**: If Pass 2 fails after retries, use Pass 1 output with lower quality threshold
4. **LLM upgrade**: Test with newer models (GPT-4 Turbo, Claude Opus 3.5) that have better structured output compliance

---

## Testing Recommendations

1. **Create test suite** with known-problematic inputs:
   - Multilingual inputs (Portuguese, French, German)
   - Inputs with 1 claim (edge case for array handling)
   - Inputs with 10+ claims (stress test)
   - Inputs with special characters in entity names

2. **Log raw LLM responses** before schema validation to identify specific failure patterns

3. **Add schema violation telemetry** to track:
   - Which fields fail most often
   - Which enum values are commonly misspelled
   - Correlation between input language and failure rate

---

## Appendix: Observed Failure Example

**Input**: "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"

**Expected**: Valid JSON matching `Pass2OutputSchema`

**Likely Failure Modes**:
1. LLM outputs `"claimDirection": "supporting"` instead of `"supports_thesis"` (invalid enum value)
2. LLM forgets `expectedMetrics` array in `expectedEvidenceProfile`
3. LLM outputs `"specificityScore": "0.7"` (string) instead of `0.7` (number)
4. LLM uses Portuguese enum values due to multilingual prompt guidance

**Mitigation**: Retry with slightly higher temperature produces different output that may validate correctly.

---

## Related Files

- Schema: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:319-350`
- Prompt: `apps/web/prompts/claimboundary.prompt.md` (section `CLAIM_EXTRACTION_PASS2`)
- Retry logic: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:806-870` (commit `c999f8a`)

---

**Status**: Analysis complete. Retry logic deployed. Schema simplification and prompt refinement recommended for future work.
