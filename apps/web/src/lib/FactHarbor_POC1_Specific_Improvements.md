# FactHarbor POC1 — Specific Code Improvements

**Date**: December 30, 2025  
**Based on**: Source code analysis of `FactHarbor-main.zip`  
**Goal**: Fix quality issues and improve performance

---

## Executive Summary

After analyzing the source code, I've identified **8 specific issues** with concrete fixes:

| Issue | File | Impact | Fix Effort |
|-------|------|--------|------------|
| Sequential source fetching | `source-bundle.ts` | 38s → ~8s | Low |
| No contradiction search | `source-bundle.ts`, `analyzer.ts` | Poor quality | Medium |
| LLM allows "opinion" escape | `analyzer.ts` | Broken analysis | Medium |
| Quality gates not enforced | `analyzer.ts` | Spec violation | Medium |
| Confidence can be 0 | `analyzer.ts` | Broken verdicts | Low |
| Insufficient prompt engineering | `analyzer.ts` | Generic output | High |
| No source credibility rating | `source-bundle.ts` | Missing metadata | Medium |
| 6 source limit too low | `source-bundle.ts` | Insufficient evidence | Low |

---

## Issue 1: Sequential Source Fetching (PERFORMANCE)

### Problem
`source-bundle.ts` lines 107-129 fetch sources **one at a time**:

```typescript
// CURRENT: Sequential (SLOW)
for (let i = 0; i < trimmed.length; i += 1) {
  const source = trimmed[i];
  try {
    const text = await extractTextFromUrl(source.url);  // Blocks for each URL
    // ...
  }
}
```

This causes the 38-second source fetching bottleneck.

### Fix
Replace with parallel fetching using `Promise.allSettled`:

```typescript
// NEW: Parallel with timeout (source-bundle.ts lines 106-133)
const FETCH_TIMEOUT_MS = 8000; // 8 second timeout per source

const fetchPromises = trimmed.map(async (source, i) => {
  try {
    const text = await Promise.race([
      extractTextFromUrl(source.url),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), FETCH_TIMEOUT_MS)
      )
    ]);
    const excerpt = text.slice(0, excerptChars);
    return {
      id: `S${i + 1}`,
      url: source.url,
      title: source.title ?? null,
      sourceType: source.sourceType ?? null,
      trackRecordScore: source.trackRecordScore ?? null,
      excerpt,
      fetchStatus: 'success' as const
    };
  } catch (err) {
    return {
      id: `S${i + 1}`,
      url: source.url,
      title: source.title ?? null,
      sourceType: source.sourceType ?? null,
      trackRecordScore: source.trackRecordScore ?? null,
      excerpt: "",
      fetchStatus: 'failed' as const,
      error: err instanceof Error ? err.message : 'unknown'
    };
  }
});

const settled = await Promise.allSettled(fetchPromises);
const results = settled
  .filter((r): r is PromiseFulfilledResult<typeof fetchPromises[0] extends Promise<infer T> ? T : never> => 
    r.status === 'fulfilled')
  .map(r => r.value);
```

**Expected improvement**: 38s → 8-12s (3-5x faster)

---

## Issue 2: No Contradiction Search (QUALITY - CRITICAL)

### Problem
The spec requires **mandatory contradiction search** but `source-bundle.ts` only performs a single search:

```typescript
// CURRENT: Single search only (source-bundle.ts line 78)
const query = (process.env.FH_SEARCH_QUERY ?? opts.inputText).slice(0, 400).trim();
const results = await searchWeb({ query, maxResults: 6 });
```

### Fix
Add explicit contradiction search queries:

```typescript
// NEW: Add to source-bundle.ts after line 96

// MANDATORY: Search for opposing/contradicting views
if (enableSearch && hasSearchKey) {
  await onEvent("Searching for opposing views", 28);
  
  // Extract key terms for contradiction search
  const keyTerms = opts.inputText
    .slice(0, 200)
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4)
    .slice(0, 5)
    .join(' ');
  
  const contradictionQueries = [
    `${keyTerms} criticism problems`,
    `${keyTerms} controversy false misleading`,
    `"${keyTerms}" debunked fact-check`
  ];
  
  for (const cQuery of contradictionQueries) {
    if (sources.length >= maxSources) break;
    
    const contraResults = await searchWeb({
      query: cQuery,
      maxResults: 3,
      domainWhitelist
    });
    
    for (const r of contraResults) {
      if (!sources.some((s) => s.url === r.url) && sources.length < maxSources) {
        sources.push({ 
          url: r.url, 
          title: r.title,
          // Tag as contradiction search result for later weighting
          _searchType: 'contradiction' 
        });
      }
    }
  }
}
```

**Expected improvement**: Balanced evidence gathering, proper methodology compliance

---

## Issue 3: LLM Allows "Opinion" Escape Hatch (QUALITY - CRITICAL)

### Problem
The schema allows `claimType: 'opinion'` which lets the LLM classify testable claims as opinions and skip analysis:

```typescript
// CURRENT: analyzer.ts line 11
const ClaimTypeEnum = z.enum(["factual", "opinion", "prediction", "ambiguous"]);
```

The Claude report showed it classified the entire Bolsonaro claim as "opinion" with 0 scenarios.

### Fix A: Require claim decomposition before type classification

```typescript
// NEW: Add to system prompt in analyzer.ts (around line 227)
const system = [
  "You are FactHarbor POC1.",
  "Task: analyze the input text according to the FactHarbor model.",
  "",
  "CRITICAL RULES (you MUST follow these):",
  "1. NEVER classify an entire input as 'opinion' if ANY part contains testable factual components.",
  "2. ALWAYS decompose complex claims into sub-claims. Example:",
  "   - Input: 'The trial was fair and based on law'",
  "   - Sub-claims: (a) 'trial based on law' [factual], (b) 'trial was fair' [evaluative but can examine procedure]",
  "3. For EVERY claim, you MUST generate at least 1 scenario with evidence.",
  "4. NEVER return 0 scenarios for any claim.",
  "5. Confidence MUST be between 0.1 and 1.0 - never exactly 0.",
  "",
  // ... rest of system prompt
].join("\n");
```

### Fix B: Add validation to reject empty scenarios

```typescript
// NEW: Add after line 334 in analyzer.ts
// Validate that we have actual analysis, not cop-outs
const totalScenarios = result.claims.reduce((sum, c) => sum + c.scenarios.length, 0);
if (totalScenarios === 0) {
  throw new Error('Analysis produced no scenarios - LLM avoided analysis');
}

const opinionOnlyClaims = result.claims.filter(c => 
  c.claimType === 'opinion' && c.scenarios.length === 0
);
if (opinionOnlyClaims.length === result.claims.length && result.claims.length > 0) {
  throw new Error('All claims classified as opinion with no analysis - retry required');
}
```

---

## Issue 4: Quality Gates Not Enforced (SPEC VIOLATION)

### Problem
The POC1 spec defines Gate 1 (Claim Validation) and Gate 4 (Verdict Confidence) but they're not implemented.

From the spec:
- Gate 4 requires "minimum 2 independent sources"
- Confidence tiers: HIGH (80-100%), MEDIUM (50-79%), LOW (0-49%), INSUFFICIENT (<2 sources)
- "Minimum MEDIUM confidence required" for publication

### Fix
Add quality gate validation:

```typescript
// NEW: Add to analyzer.ts after line 130

type QualityGateResult = {
  passed: boolean;
  gate: string;
  failures: string[];
};

function validateGate1ClaimValidation(claim: z.infer<typeof ClaimSchema>): QualityGateResult {
  const failures: string[] = [];
  
  // Gate 1: Claim must be fact-checkable
  if (claim.claimType === 'opinion' && claim.scenarios.length === 0) {
    failures.push(`Claim "${claim.text.slice(0, 50)}..." has no scenarios`);
  }
  
  // Each scenario must have evidence
  for (const scenario of claim.scenarios) {
    const evidenceCount = scenario.evidence.filter(e => e.source.type !== 'unknown').length;
    if (evidenceCount === 0) {
      failures.push(`Scenario "${scenario.title}" has no evidence`);
    }
  }
  
  return {
    passed: failures.length === 0,
    gate: 'Gate 1: Claim Validation',
    failures
  };
}

function validateGate4VerdictConfidence(scenario: z.infer<typeof ScenarioSchema>): QualityGateResult {
  const failures: string[] = [];
  
  // Minimum 2 sources requirement
  const sourceCount = scenario.evidence.filter(e => e.source.type !== 'unknown').length;
  if (sourceCount < 2) {
    failures.push(`Only ${sourceCount} sources (minimum 2 required)`);
  }
  
  // Average source quality check
  const qualities = scenario.evidence
    .map(e => e.source.reliability)
    .filter((r): r is number => r !== null);
  
  if (qualities.length > 0) {
    const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
    if (avgQuality < 0.6) {
      failures.push(`Average source quality ${avgQuality.toFixed(2)} below 0.6 threshold`);
    }
  }
  
  // Confidence threshold (MEDIUM = 50%)
  if (scenario.verdict.confidence < 0.5) {
    failures.push(`Confidence ${scenario.verdict.confidence} below MEDIUM threshold (0.5)`);
  }
  
  return {
    passed: failures.length === 0,
    gate: 'Gate 4: Verdict Confidence',
    failures
  };
}

function runQualityGates(result: z.infer<typeof ResultSchema>): {
  passed: boolean;
  results: QualityGateResult[];
  summary: {
    totalClaims: number;
    passedClaims: number;
    totalScenarios: number;
    passedScenarios: number;
  };
} {
  const gateResults: QualityGateResult[] = [];
  let passedClaims = 0;
  let passedScenarios = 0;
  
  for (const claim of result.claims) {
    const gate1 = validateGate1ClaimValidation(claim);
    gateResults.push(gate1);
    if (gate1.passed) passedClaims++;
    
    for (const scenario of claim.scenarios) {
      const gate4 = validateGate4VerdictConfidence(scenario);
      gateResults.push(gate4);
      if (gate4.passed) passedScenarios++;
    }
  }
  
  const totalScenarios = result.claims.reduce((sum, c) => sum + c.scenarios.length, 0);
  
  return {
    passed: gateResults.every(r => r.passed),
    results: gateResults,
    summary: {
      totalClaims: result.claims.length,
      passedClaims,
      totalScenarios,
      passedScenarios
    }
  };
}
```

Then integrate into the main analysis:

```typescript
// NEW: Add after line 336 in analyzer.ts
const qualityGates = runQualityGates(result);

// Add quality gate results to output
const resultWithGates = {
  ...result,
  qualityGates: {
    passed: qualityGates.passed,
    summary: qualityGates.summary,
    failures: qualityGates.results.filter(r => !r.passed)
  }
};
```

---

## Issue 5: Confidence Can Be 0 (BROKEN VERDICTS)

### Problem
The schema allows confidence values of 0, which defeats the purpose:

```typescript
// CURRENT: analyzer.ts line 79
confidence: z.number().min(0).max(1),
```

All three LLM providers returned 0 or broken confidence values.

### Fix
Enforce minimum confidence and validate:

```typescript
// NEW: Replace analyzer.ts line 79
confidence: z.number().min(0.1).max(1),  // Minimum 0.1, never 0

// NEW: Add validation in clampConfidence function (line 111)
export function clampConfidence(value: number): number {
  // Ensure minimum 0.1 - a confidence of 0 means "no opinion" which isn't a verdict
  const clamped = Math.max(0.1, Math.min(1, value));
  
  // Log warning if we had to clamp from 0
  if (value === 0 || value < 0.1) {
    console.warn(`Confidence value ${value} clamped to minimum 0.1`);
  }
  
  return clamped;
}
```

And add prompt guidance:

```typescript
// NEW: Add to system prompt
"Confidence scoring rules:",
"- Confidence MUST be between 0.1 and 1.0",
"- 0.1-0.3 = Very low confidence (minimal evidence)",
"- 0.4-0.5 = Low confidence (conflicting or weak evidence)", 
"- 0.5-0.7 = Medium confidence (reasonable evidence, some gaps)",
"- 0.7-0.9 = High confidence (strong evidence, minor caveats)",
"- 0.9-1.0 = Very high confidence (overwhelming evidence)",
"- NEVER use 0.0 - that means 'I refuse to analyze' which is not allowed",
```

---

## Issue 6: Insufficient Prompt Engineering (GENERIC OUTPUT)

### Problem
The current system prompt is too permissive and doesn't enforce the FactHarbor methodology.

### Fix
Complete rewrite of the system prompt:

```typescript
// NEW: Replace system prompt in analyzer.ts (lines 227-241)
const system = `You are FactHarbor POC1 - a rigorous fact-checking analysis system.

## MANDATORY REQUIREMENTS (failure to follow = invalid output)

1. CLAIM DECOMPOSITION
   - Complex claims MUST be split into testable sub-claims
   - Example: "Trial was fair and legal" → separate claims for "legal basis" and "procedural fairness"
   - NEVER classify an entire complex input as single "opinion"

2. EVIDENCE GATHERING
   - EVERY scenario MUST cite evidence from the provided SOURCE BUNDLE
   - Use source.type='url' and include source.url when citing sources
   - If citing input text directly, use source.type='text' with excerpt in source.ref
   - NEVER claim "insufficient evidence" if sources are provided

3. MANDATORY CONTRADICTION ANALYSIS
   - For EVERY claim, you MUST consider opposing viewpoints
   - Include at least ONE counter_evidence item per scenario
   - If no counter-evidence exists, explicitly state why

4. SOURCE CREDIBILITY ASSESSMENT
   - Assess each source's reliability (0.0-1.0 scale):
     * 0.9-1.0: Official government, peer-reviewed journals, courts
     * 0.7-0.89: Quality journalism (Reuters, AP), universities
     * 0.5-0.69: Think tanks, established NGOs
     * 0.3-0.49: Partisan sources, advocacy groups
     * 0.1-0.29: Social media, anonymous sources

5. CONFIDENCE SCORING
   - Range: 0.1 to 1.0 (NEVER 0.0)
   - Must include confidenceRange with meaningful spread
   - List specific uncertaintyFactors (not generic statements)

6. VERDICT SELECTION
   - supported: Clear preponderance of quality evidence
   - refuted: Clear evidence contradicts the claim
   - mixed: Significant evidence on both sides
   - unclear: Insufficient evidence to determine
   - misleading: Technically true but deceptive framing

## OUTPUT REQUIREMENTS
- Return structured JSON matching the schema
- Every claim needs ≥1 scenario
- Every scenario needs ≥1 evidence item
- Confidence must be 0.1-1.0 with ranges
- Include specific uncertainty factors
`;
```

---

## Issue 7: No Source Credibility Rating (MISSING METADATA)

### Problem
Sources are fetched but not rated for credibility. The `trackRecordScore` field exists but isn't populated.

### Fix
Add automatic credibility assessment:

```typescript
// NEW: Add to source-bundle.ts after line 40

const KNOWN_SOURCES: Record<string, { type: SourceInput['sourceType']; score: number }> = {
  // Highest credibility (0.9-1.0)
  'reuters.com': { type: 'NewsOutlet', score: 0.95 },
  'apnews.com': { type: 'NewsOutlet', score: 0.95 },
  'who.int': { type: 'InternationalOrg', score: 0.95 },
  'cdc.gov': { type: 'GovernmentAgency', score: 0.95 },
  'nih.gov': { type: 'GovernmentAgency', score: 0.95 },
  'supremecourt.gov': { type: 'Court', score: 0.98 },
  'nature.com': { type: 'AcademicJournal', score: 0.95 },
  'science.org': { type: 'AcademicJournal', score: 0.95 },
  
  // High credibility (0.7-0.89)
  'nytimes.com': { type: 'NewsOutlet', score: 0.85 },
  'washingtonpost.com': { type: 'NewsOutlet', score: 0.85 },
  'bbc.com': { type: 'NewsOutlet', score: 0.88 },
  'bbc.co.uk': { type: 'NewsOutlet', score: 0.88 },
  'theguardian.com': { type: 'NewsOutlet', score: 0.82 },
  'economist.com': { type: 'NewsOutlet', score: 0.85 },
  'ft.com': { type: 'NewsOutlet', score: 0.85 },
  
  // Medium credibility (0.5-0.69)
  'brookings.edu': { type: 'ThinkTank', score: 0.75 },
  'cfr.org': { type: 'ThinkTank', score: 0.75 },
  'hrw.org': { type: 'NGO', score: 0.70 },
  'amnesty.org': { type: 'NGO', score: 0.70 },
  
  // Lower credibility (explicitly known partisan)
  'breitbart.com': { type: 'NewsOutlet', score: 0.35 },
  'huffpost.com': { type: 'NewsOutlet', score: 0.50 },
};

function assessSourceCredibility(url: string): { type: SourceInput['sourceType'] | null; score: number | null } {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    
    // Check known sources
    if (KNOWN_SOURCES[hostname]) {
      return KNOWN_SOURCES[hostname];
    }
    
    // Heuristic assessment for unknown sources
    if (hostname.endsWith('.gov')) return { type: 'GovernmentAgency', score: 0.85 };
    if (hostname.endsWith('.edu')) return { type: 'AcademicJournal', score: 0.80 };
    if (hostname.endsWith('.org')) return { type: 'NGO', score: 0.60 };
    if (hostname.includes('wikipedia')) return { type: 'Other', score: 0.65 };
    
    // Unknown - default to medium-low
    return { type: null, score: 0.50 };
  } catch {
    return { type: null, score: null };
  }
}
```

Then use it when building sources:

```typescript
// NEW: Modify source-bundle.ts around line 112
const credibility = assessSourceCredibility(source.url);
results.push({
  id: `S${i + 1}`,
  url: source.url,
  title: source.title ?? null,
  sourceType: source.sourceType ?? credibility.type ?? null,
  trackRecordScore: source.trackRecordScore ?? credibility.score ?? null,
  excerpt
});
```

---

## Issue 8: 6 Source Limit Too Low (INSUFFICIENT EVIDENCE)

### Problem
Default `FH_SOURCE_BUNDLE_MAX_SOURCES=6` is too low for comprehensive analysis.

### Fix

```typescript
// NEW: Update DEFAULT_MAX_SOURCES in source-bundle.ts line 34
const DEFAULT_MAX_SOURCES = 10;  // Was 6

// Also increase default search results
// Update web-search call in source-bundle.ts line 88
maxResults: Math.max(1, parseInt(process.env.FH_SEARCH_MAX_RESULTS ?? "", 10) || 8),  // Was 6
```

---

## Complete Implementation Plan

### Phase 1: Quick Wins (Day 1)

1. **Parallel fetching** - Replace sequential loop with Promise.allSettled
2. **Minimum confidence** - Change min from 0 to 0.1
3. **Increase source limit** - 6 → 10 sources

### Phase 2: Quality Gates (Days 2-3)

4. **Add Gate 1 & Gate 4 validation** - New functions
5. **Source credibility assessment** - New lookup table
6. **Validation for empty scenarios** - Reject cop-out responses

### Phase 3: Prompt Engineering (Days 4-5)

7. **Rewrite system prompt** - Enforce methodology
8. **Add contradiction search** - Multiple search queries
9. **Update schema constraints** - Stricter validation

---

## File-by-File Change Summary

### `apps/web/src/lib/source-bundle.ts`

| Line(s) | Change |
|---------|--------|
| 34 | `DEFAULT_MAX_SOURCES = 10` (was 6) |
| 40-80 | Add `KNOWN_SOURCES` lookup and `assessSourceCredibility()` |
| 88 | `maxResults: 8` (was 6) |
| 96-130 | Add contradiction search queries |
| 107-133 | Replace sequential fetch with parallel `Promise.allSettled` |
| 112 | Add credibility assessment to results |

### `apps/web/src/lib/analyzer.ts`

| Line(s) | Change |
|---------|--------|
| 79 | `confidence: z.number().min(0.1).max(1)` |
| 111-113 | Update `clampConfidence()` to enforce minimum 0.1 |
| 130+ | Add `validateGate1ClaimValidation()` |
| 150+ | Add `validateGate4VerdictConfidence()` |
| 170+ | Add `runQualityGates()` |
| 227-257 | Complete rewrite of system prompt |
| 334+ | Add validation for empty scenarios |
| 336+ | Add quality gate results to output |

### `apps/web/src/lib/retrieval.ts`

| Line(s) | Change |
|---------|--------|
| 7 | `FETCH_TIMEOUT_MS = 8000` (was 15000, but now we parallelize) |

---

## Expected Results

### Performance

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Source fetch time | ~38s | ~8-12s | 3-5x faster |
| Total analysis time | ~56s | ~25-35s | ~2x faster |

### Quality

| Metric | Before | After |
|--------|--------|-------|
| Empty scenarios | Common | 0 (blocked) |
| Zero confidence | Common | Impossible (min 0.1) |
| Contradiction search | None | Mandatory |
| Source credibility | Not rated | Auto-rated |
| Quality gates | None | Gate 1 & 4 enforced |

---

## Testing Checklist

After implementation:

- [ ] Run with Bolsonaro test case - should produce decomposed claims
- [ ] Verify no scenarios have 0 confidence
- [ ] Verify source credibility scores are populated
- [ ] Verify contradiction search is called (check logs)
- [ ] Verify parallel fetching (check timing)
- [ ] Run quality gates - verify failures are flagged
- [ ] Test with OpenAI, Claude, Mistral - all should pass validation

---

## Appendix: Environment Variable Updates

Add to `.env.example`:

```env
# Quality settings (NEW)
FH_MINIMUM_CONFIDENCE=0.1
FH_REQUIRE_CONTRADICTION_SEARCH=true
FH_QUALITY_GATES_ENABLED=true

# Updated defaults
FH_SOURCE_BUNDLE_MAX_SOURCES=10
FH_SEARCH_MAX_RESULTS=8
```
