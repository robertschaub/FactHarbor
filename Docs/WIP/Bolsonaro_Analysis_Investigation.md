# Bolsonaro Trial Analysis - Deep Investigation Report

**Status:** INVESTIGATION COMPLETE
**Date:** 2026-02-05
**Investigator:** Claude (Lead Architect)
**Priority:** High

---

## Executive Summary

Investigation of the Bolsonaro trial analysis revealed **variable quality** across runs. The system CAN correctly detect both trials (TSE electoral + STF criminal), but exhibits inconsistent behavior including:

1. **Irrelevant US Government content contamination** - Trump's executive orders being used as "evidence"
2. **Context naming pollution** - COVID-19/clinical study language appearing in TSE context names
3. **Inconsistent multi-context detection** - Sometimes detecting US Government response as an AnalysisContext

---

## 1. Analyses Compared

### Analysis 55f2961... (BEFORE fix)

| Context | Name | Verdict | Issue |
|---------|------|---------|-------|
| STF_ecc8 | Brazilian Supreme Federal Court Criminal Trial | 75% | ✅ Correct |
| **US_af14** | **US Government Response to Brazilian Trial** | 15% | ❌ **INVALID** - Third-party reaction |
| TSE_6305 | Analysis of **clinical study reports**, trial registries... | 45% | ❌ **CONTAMINATED** name |

**Problems:**
- US Government context violates the "SAME QUESTION RULE" in prompts
- TSE context name includes irrelevant COVID/clinical study language

### Analysis bcadfa0... (AFTER fix)

| Context | Name | Verdict | Issue |
|---------|------|---------|-------|
| STF_51c4 | Supreme Federal Court Criminal Trial | 72% | ✅ Correct |
| STF_95b7 | Jurisdictional Authority and Procedural Fairness Challenges | 35% | ⚠️ Over-split (same trial) |
| TSE_6305 | Brazil (COVID-19 pandemic period...) | 45% | ❌ **CONTAMINATED** name |

**Improvements:**
- No US Government context ✅
- Both STF and TSE present ✅

**Remaining Issues:**
- TSE context still has COVID contamination
- STF split into two contexts (over-splitting)

### Analysis c9472e5... (Fresh test - 2026-02-05)

| Context | Name | Verdict | Issue |
|---------|------|---------|-------|
| TSE_5316 | Brazilian Electoral Court Disqualification Proceedings | 78% | ✅ **CORRECT** |
| STF_980d | Brazilian Supreme Court Criminal Trial Proceedings | varies | ✅ **CORRECT** |
| TSE_0c69 | Brazil (Application of existing Brazilian electoral laws...) | - | ⚠️ Redundant? |

**Best result so far:**
- Both trials correctly identified ✅
- No US Government context ✅
- No COVID contamination ✅
- But has a third slightly redundant context

---

## 2. Root Causes Identified

### ROOT CAUSE 1: Irrelevant Sources in "Criticism and Opposing Views" Search

**Location:** [orchestrated.ts:5975-5993](apps/web/src/lib/analyzer/orchestrated.ts#L5975)

**Problem:** The search for criticism/controversy returns US Government documents that mention "Bolsonaro" but are completely irrelevant to Brazilian legal proceedings.

```typescript
// Current search queries
const baseQueries = [
  `${entityStr} criticism concerns`,  // ← Finds Trump executive orders
  `${entityStr} controversy disputed unfair`,
];
```

**Evidence from logs:**
```
extractFacts: Calling LLM for S5 | {
  "title": "Addressing Threats to The United States by the Gov",
  "focus": "Criticism and opposing views"
}
```

**Impact:** Trump's characterization of the trial as a "witch hunt" is being used as evidence against the trial's fairness.

### ROOT CAUSE 2: No Geographic/Jurisdictional Filtering

**Problem:** When searching for criticism/counter-evidence, there's no filter to ensure sources are relevant to the JURISDICTION of the proceeding being analyzed.

**Example:** A Brazilian court's fairness should only consider:
- ✅ Brazilian legal experts
- ✅ Brazilian constitutional analysis
- ✅ International legal organizations (OAS, etc.)
- ❌ NOT: Foreign political opinions (Trump, Rubio)
- ❌ NOT: Foreign sanctions as "evidence"

### ROOT CAUSE 3: LLM Non-Determinism in Context Detection

**Problem:** The same input produces different contexts on different runs:
- Run 1: STF + US Response + TSE (contaminated)
- Run 2: STF (split) + TSE (contaminated)
- Run 3: TSE + STF + TSE (redundant) ← Best

The prompt rule exists but isn't consistently followed:
```
❌ Third-party reactions/responses/sanctions are NEVER valid AnalysisContexts
```

### ROOT CAUSE 4: Evidence Source Relevance Not Validated

**Location:** Evidence extraction happens for ALL fetched sources without checking:
1. Is the source about the SAME JURISDICTION?
2. Is the source a legal/factual analysis vs political opinion?
3. Does the source actually address the fairness of the BRAZILIAN trial?

---

## 3. Proposed Fixes

### FIX 1: Add Geographic/Jurisdictional Filter to Search Queries (Priority: HIGH)

For legal/trial questions, add jurisdiction keywords to searches:

```typescript
// If analysisContext.jurisdiction is set
if (contexts[0]?.metadata?.jurisdiction) {
  const jurisdiction = contexts[0].metadata.jurisdiction;
  baseQueries = baseQueries.map(q => `${q} ${jurisdiction}`);
}

// Example result:
// "Bolsonaro criticism concerns Brazil" instead of "Bolsonaro criticism concerns"
```

### FIX 2: Source Relevance Pre-Filter (Priority: HIGH)

Before extracting evidence, check if the source is relevant to the claim's jurisdiction:

```typescript
interface SourceRelevanceCheck {
  isRelevantJurisdiction: boolean;
  isLegalAnalysis: boolean;  // vs political opinion
  relevanceScore: number;
}

function isSourceRelevant(source: FetchedSource, contexts: AnalysisContext[]): boolean {
  const jurisdiction = contexts[0]?.metadata?.jurisdiction;
  if (!jurisdiction) return true;  // No jurisdiction constraint

  // Check if source is about the right country/legal system
  const sourceJurisdiction = inferJurisdiction(source);
  if (sourceJurisdiction && sourceJurisdiction !== jurisdiction) {
    console.log(`[Relevance] Skipping source "${source.title}" - wrong jurisdiction (${sourceJurisdiction} vs ${jurisdiction})`);
    return false;
  }

  return true;
}
```

### FIX 3: Strengthen Context Relevance Validation (Priority: MEDIUM)

Add a post-processing step to validate detected contexts:

```typescript
function validateContextRelevance(
  contexts: AnalysisContext[],
  originalQuestion: string
): AnalysisContext[] {
  return contexts.filter(ctx => {
    // Rule: Third-party reactions are invalid
    if (ctx.name.toLowerCase().includes('response') ||
        ctx.name.toLowerCase().includes('reaction') ||
        ctx.subject.toLowerCase().includes('sanctions')) {
      console.warn(`[Context] Filtering invalid third-party context: "${ctx.name}"`);
      return false;
    }

    // Rule: Context must answer the original question
    const answersQuestion = isContextRelevantToQuestion(ctx, originalQuestion);
    if (!answersQuestion) {
      console.warn(`[Context] Filtering irrelevant context: "${ctx.name}"`);
      return false;
    }

    return true;
  });
}
```

### FIX 4: Evidence Source Type Classification (Priority: MEDIUM)

Classify sources by type and weight accordingly:

```typescript
type SourceType =
  | 'legal_analysis'      // Academic, legal experts
  | 'official_document'   // Court records, government reports
  | 'news_reporting'      // Factual news coverage
  | 'political_opinion'   // Statements from politicians
  | 'advocacy'            // Partisan advocacy
  | 'foreign_government'; // Foreign government statements

// Weight evidence based on source type
const sourceTypeWeights: Record<SourceType, number> = {
  'legal_analysis': 1.0,
  'official_document': 1.0,
  'news_reporting': 0.8,
  'political_opinion': 0.3,  // Reduced weight
  'advocacy': 0.2,
  'foreign_government': 0.1,  // Very low weight for foreign political opinions
};
```

### FIX 5: Add "Exclude Foreign Political Opinions" Config Option (Priority: LOW)

```typescript
interface PipelineConfig {
  // ... existing

  // Evidence relevance filtering
  excludeForeignPoliticalOpinions?: boolean;  // Default: true
  requiredJurisdictionMatch?: boolean;        // Default: false (strict mode)
}
```

---

## 4. Implementation Priority

| Fix | Priority | Effort | Impact |
|-----|----------|--------|--------|
| FIX 1: Jurisdiction filter on search | HIGH | Low | High |
| FIX 2: Source relevance pre-filter | HIGH | Medium | High |
| FIX 3: Context validation | MEDIUM | Low | Medium |
| FIX 4: Source type classification | MEDIUM | Medium | Medium |
| FIX 5: Config option | LOW | Low | Low |

---

## 5. Verification Queries

To verify the fixes work, use these test queries:

1. **Bolsonaro query:** "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"
   - Should detect: TSE electoral trial + STF criminal trial
   - Should NOT detect: US Government response
   - Evidence should NOT include: Trump executive orders, US sanctions

2. **Control query:** "Was the Trump impeachment trial fair?"
   - Should include US-related sources
   - Should NOT include Brazilian sources

---

## 6. Immediate Workaround

Until fixes are implemented, users can:
1. Be more specific in queries: "Was the Bolsonaro **TSE electoral court** judgment fair?"
2. Manually review and discount foreign political opinions in the output

---

## 7. Files to Modify

| File | Changes |
|------|---------|
| `orchestrated.ts` | Add jurisdiction to search queries, source relevance filter |
| `evidence-filter.ts` | Add source type classification |
| `config-schemas.ts` | Add new config options |
| `orchestrated-understand.ts` | Strengthen context relevance rules |

---

**Investigation Status:** ✅ COMPLETE
**Next Step:** Implement generic evidence quality rules (see Section 8)

---

## 8. TRULY GENERIC Principles for Evidence Quality

**CRITICAL**: These principles must be COMPLETELY ABSTRACT and apply to ANY analysis, not just legal/political cases.

### PRINCIPLE 1: Opinion ≠ Evidence (Universal)

**Rule:** An entity's CHARACTERIZATION of something is NOT evidence about that thing.

| Source Type | Example | Probative Value |
|-------------|---------|-----------------|
| Direct observation/measurement | "The document contains 47 pages" | HIGH |
| Expert analysis with methodology | "Analysis of data shows X correlates with Y" | HIGH |
| Official records from the subject | Court filings, audit reports, lab results | HIGH |
| Third-party characterization | "Entity X says Y is bad/good" | LOW |
| Emotional/rhetorical language | "witch hunt", "persecution", "unfair" | LOW |

**Key insight:** The DISTANCE between the source and the subject determines reliability:
- **Direct**: Source IS the subject or directly measured it → HIGH
- **Expert**: Source analyzed the subject with transparent methodology → MEDIUM-HIGH
- **Reported**: Source reports facts with citations → MEDIUM
- **Opinion**: Source expresses view without evidence → LOW
- **Hearsay**: Source reports what others say → VERY LOW

### PRINCIPLE 2: LLM Knowledge Has a Cutoff Date (Universal)

**Fundamental truth:** LLMs are trained on data from the past. They do NOT know:
- Current events (anything after training cutoff)
- Recent changes to laws, policies, organizations
- Current status of ongoing proceedings
- Recent scientific discoveries or corrections

**Generic solution:**
1. Web search provides current information
2. BUT web search results are still just TEXT that needs evaluation
3. Apply the same evidence quality rules to web results
4. Recency of source does NOT automatically make it reliable

### PRINCIPLE 3: Source Type Classification (Universal)

Every piece of potential evidence should be classified:

```
## EVIDENCE SOURCE TYPES

**CATEGORY A - Direct/Primary Sources (HIGH weight):**
- Official documents from the subject entity
- Peer-reviewed research with methodology
- Court records, filings, official rulings
- Audit reports, inspection records
- Raw data with provenance

**CATEGORY B - Expert Analysis (MEDIUM-HIGH weight):**
- Analysis by credentialed experts in the relevant field
- Methodology is stated and verifiable
- Sources are cited

**CATEGORY C - Factual Reporting (MEDIUM weight):**
- News articles with specific facts, quotes, documents
- Clear attribution of claims
- Multiple independent sources corroborate

**CATEGORY D - Opinion/Commentary (LOW weight - typically DISCARD):**
- Characterizations without supporting evidence
- Rhetorical language ("unfair", "biased", "corrupt")
- One entity's opinion about another entity
- Diplomatic/political statements about other entities
- Advocacy materials with clear agenda

**CATEGORY E - Unreliable (DISCARD):**
- Anonymous sources
- "Some say", "critics claim", "many believe"
- Social media posts without verification
- Obvious propaganda or satire
```

### PRINCIPLE 4: Jurisdiction/Subject Relevance (Universal)

**Rule:** Evidence must be ABOUT the subject being analyzed.

| Scenario | Relevance |
|----------|-----------|
| Source directly discusses subject X | RELEVANT |
| Source discusses similar subject Y | POSSIBLY RELEVANT (with caution) |
| Source mentions subject X tangentially | LOW RELEVANCE |
| Source is about different subject entirely | IRRELEVANT - DISCARD |

**Generic implementation:**
- When searching for counter-evidence/criticism, constrain to subject's domain
- A document about Entity A is NOT evidence about Entity B just because both are mentioned
- Geographic, temporal, and topical scope must match

### PRINCIPLE 5: probativeValue Enforcement (Universal)

**Current state:** `evidence-filter.ts` discards low probativeValue items.
**Enhancement needed:** Ensure the LLM correctly ASSIGNS probativeValue in the first place.

Add to extraction prompts:
```
CRITICAL: Assign probativeValue based on SOURCE TYPE, not content agreement.

- A well-sourced article that DISAGREES with the claim → HIGH probativeValue
- An opinion piece that AGREES with the claim → LOW probativeValue

The question is "How reliable is this source?" NOT "Does this support the conclusion?"
```

---

## 9. Implementation Plan (Generic)

| Change | File | Description |
|--------|------|-------------|
| Source type classification prompt | `orchestrated.ts` | Add guidance to extract prompts |
| Jurisdiction relevance filter | `orchestrated.ts` | Constrain criticism search to subject's domain |
| probativeValue assignment rules | Extract prompts | Explicit source type → probativeValue mapping |
| Strengthen filter | `evidence-filter.ts` | Log WHY items are discarded |

---

## 10. Verification (Generic Test Cases)

To verify these rules work correctly, test with DIVERSE cases:

1. **Legal proceeding analysis** - Evidence should be legal documents, not political opinions
2. **Scientific claim analysis** - Evidence should be peer-reviewed research, not popular articles
3. **Corporate action analysis** - Evidence should be filings, audits, not competitor statements
4. **Historical event analysis** - Evidence should be primary sources, not later interpretations

Each test should verify:
- [ ] Direct/primary sources have HIGH probativeValue
- [ ] Third-party opinions have LOW probativeValue
- [ ] Irrelevant jurisdiction sources are filtered
- [ ] Rhetorical characterizations are not treated as evidence

---

**Investigation Status:** ✅ COMPLETE
**Next Step:** Implement generic evidence quality rules in extraction prompts

