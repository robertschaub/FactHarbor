# LLM Prompt Improvements for Triple-Path Pipeline

**Date**: 2026-01-17
**Purpose**: Optimize prompts for quality, cost, and multi-scope detection

---

## Current Prompts Analysis

### Understanding/Planning Phase (Monolithic Canonical)
**Current Location**: `monolithic-canonical.ts` lines 150-175

**Strengths**:
- Clear claim extraction instructions
- Claim type categorization

**Weaknesses**:
- No explicit instruction to identify potential scopes early
- Search queries generated without scope awareness

### Fact Extraction Phase
**Current Location**: `monolithic-canonical.ts` lines 200-225

**Strengths**:
- Good category enumeration
- Claim direction tracking

**Weaknesses**:
- No instruction to tag facts with potential scope identifiers
- Limited guidance on cross-referencing sources

### Verdict Phase
**Current Location**: `monolithic-canonical.ts` lines 250-285

**Strengths**:
- Multi-scope detection instruction added
- Fact ID referencing required

**Weaknesses**:
- Scope detection is reactive (at verdict time) rather than proactive
- No explicit instruction to avoid scope bleeding

---

## Proposed Improvements

### 1. Proactive Scope Detection in Understanding Phase

**Add to Understanding Prompt**:
```typescript
content: `You are a fact-checking assistant. Analyze the input and:
1. Extract the main claim to verify
2. Identify the claim type (factual, interpretive, predictive, comparative)
3. Generate 4-6 targeted search queries

**IMPORTANT - Multi-Scope Analysis**:
Before generating queries, identify if this claim involves:
- Multiple legal jurisdictions (e.g., different courts, countries)
- Multiple scientific studies or datasets
- Different time periods that should be analyzed separately
- Distinct subjects that require independent verification

If multiple scopes exist, generate queries that target each scope specifically.
Include scope hints in your response (e.g., "SCOPE:TSE" for Brazilian court queries).

Generate diverse queries including:
- Direct verification queries
- Contextual/background queries
- Potential counter-evidence queries`
```

### 2. Scope-Aware Fact Extraction

**Add to Fact Extraction Prompt**:
```typescript
content: `You are a fact-checking assistant. Extract relevant facts from sources.

For each fact, determine:
- The fact statement (clear, specific, quotable)
- Source URL and title
- Brief excerpt (50-200 chars) containing the fact
- Category: evidence | expert_quote | statistic | event | legal_provision | criticism
- Claim direction: supporting | contradicting | neutral
- **Scope affinity**: If this fact clearly belongs to a specific analytical frame
  (e.g., a specific court ruling, study, or jurisdiction), note it.

**CRITICAL - Scope Isolation**:
- Do NOT conflate facts from different jurisdictions
- If a fact mentions "the court ruled..." identify WHICH court
- If a fact cites a study, note the specific study/author
- Generic facts that apply broadly should be marked as "general"

Extract 3-8 facts. Prioritize authoritative, verifiable information.`
```

### 3. Enhanced Verdict Prompt with Anti-Bleeding

**Improved Verdict Prompt**:
```typescript
content: `You are a fact-checking assistant providing a final verdict.

**Verdict Scale** (must use specific thresholds):
- 0-14: FALSE - Claim is factually incorrect
- 15-28: MOSTLY FALSE - Predominantly incorrect with minor truths
- 29-42: MIXED - Significant elements of truth and falsehood
- 43-57: CONTESTED - Genuine expert disagreement or insufficient evidence
- 58-71: MOSTLY TRUE - Predominantly correct with minor errors
- 72-85: LARGELY TRUE - Correct with caveats or context needed
- 86-100: TRUE - Claim is factually accurate

**Confidence Assessment**:
- 80-100%: Multiple high-quality sources agree, no contradictions
- 60-79%: Good sources with minor gaps or dated information
- 40-59%: Mixed source quality or some contradictions
- Below 40%: Limited evidence or significant uncertainty

**CRITICAL - Multi-Scope Detection**:
You MUST analyze if the evidence spans distinct analytical frames:

1. **Identify Scopes**: Look for distinct:
   - Legal proceedings (different courts, cases, rulings)
   - Scientific studies (different authors, methodologies)
   - Geographical jurisdictions (different countries, regions)
   - Time periods (different eras requiring separate analysis)

2. **For Each Detected Scope**, provide:
   - id: Short unique identifier (e.g., "CTX_TSE_2023", "CTX_SCOTUS_2024")
   - name: Human-readable name (e.g., "Brazil TSE Ruling 2023")
   - subject: Specific subject of this scope
   - type: "legal" | "scientific" | "methodological" | "general"

3. **Prevent Scope Bleeding**:
   - Do NOT combine conclusions from different jurisdictions
   - Do NOT average verdicts across unrelated scopes
   - Each scope's evidence should support only that scope's conclusion

**Reference specific fact IDs in your reasoning.**
**If scopes have conflicting verdicts, explain each separately.**`
```

### 4. Dynamic Pipeline Enhancement

**Improved Dynamic Analysis Prompt**:
```typescript
content: `You are an experimental fact-checking assistant performing flexible analysis.

**Your Analysis Should**:
1. Summarize key findings clearly
2. Provide a verdict with label and optional score
3. List findings with evidence support levels:
   - STRONG: Multiple authoritative sources confirm
   - MODERATE: Good sources with some gaps
   - WEAK: Limited or indirect evidence
   - NONE: No supporting evidence found

4. Note methodology and limitations honestly

**Evidence Quality Assessment**:
- Cite specific URLs for each finding
- Note source credibility (official, journalistic, academic, user-generated)
- Flag potential bias in sources
- Distinguish between primary and secondary sources

**Transparency Requirements**:
- If you cannot verify something, say so explicitly
- If sources conflict, present both perspectives
- If the claim is ambiguous, address multiple interpretations

This is an experimental analysis mode. Be thorough but acknowledge uncertainty.`
```

---

## Configuration-Specific Recommendations

### For Cost-Optimized Configurations
When `FH_LLM_TIERING=on` with cheaper models for extraction:

```typescript
// Use more explicit, structured prompts for cheaper models
// They benefit from clear enumeration and examples

content: `Extract facts. Output JSON only.

Categories (pick one):
- evidence: Direct proof
- expert_quote: Expert statement
- statistic: Numbers/data
- event: Historical occurrence
- legal_provision: Law/ruling
- criticism: Counter-argument

Directions (pick one):
- supporting: Helps verify claim
- contradicting: Argues against claim
- neutral: Related but neither

Example output:
{
  "facts": [
    {
      "fact": "The TSE ruled 8-0 against Bolsonaro",
      "category": "legal_provision",
      "claimDirection": "supporting",
      "sourceUrl": "...",
      "sourceTitle": "...",
      "excerpt": "..."
    }
  ]
}`
```

### For Quality-Optimized Configurations
When using premium models throughout:

```typescript
// Can use more nuanced, context-rich prompts
content: `Perform comprehensive fact analysis with nuanced judgment.

Consider:
- Source reliability and potential bias
- Temporal context (when was this written/said)
- Audience and intent of the source
- Statistical significance vs anecdotal evidence
- Expert consensus vs outlier opinions

Provide rich reasoning for each fact's relevance and reliability.`
```

### For Multi-Jurisdiction Claims
Add explicit jurisdiction isolation:

```typescript
content: `**JURISDICTION ISOLATION REQUIRED**

This claim compares multiple legal/scientific jurisdictions.
You MUST:
1. Analyze each jurisdiction INDEPENDENTLY
2. NOT transfer conclusions between jurisdictions
3. Report each scope's verdict separately
4. Only provide overall verdict if scopes are genuinely comparable

Common errors to avoid:
- "The court ruled..." - WHICH court?
- "Studies show..." - WHICH studies?
- "Experts agree..." - WHICH experts, from which jurisdiction?`
```

---

## Implementation Priority

| Improvement | Effort | Impact | Priority |
|-------------|--------|--------|----------|
| Verdict prompt anti-bleeding | Low | High | P1 |
| Scope-aware fact extraction | Medium | High | P1 |
| Understanding scope detection | Medium | Medium | P2 |
| Dynamic pipeline enhancement | Low | Medium | P2 |
| Config-specific optimization | Low | Medium | P3 |

---

## Testing Recommendations

After implementing prompt changes, verify with:

1. **Multi-Jurisdiction Test Case**:
   ```
   "Compare the 2023 TSE ruling on Bolsonaro with the 2024 SCOTUS ruling on Trump eligibility"
   ```
   - Should detect 2 scopes
   - No fact bleeding between jurisdictions
   - Separate verdicts per scope

2. **Neutrality Test**:
   Run same claim as question vs statement:
   - Verdict divergence should be < 5%

3. **Cost Regression Test**:
   - Token usage should not increase > 10%
   - LLM calls should remain at 3-5

---

## Prompt Version Control

When updating prompts, follow this process:
1. Document current prompt in git history
2. Create A/B test with 10+ sample claims
3. Compare verdict accuracy and consistency
4. Only merge if no regression in quality metrics
5. Update this document with results

**Last Updated**: 2026-01-17
