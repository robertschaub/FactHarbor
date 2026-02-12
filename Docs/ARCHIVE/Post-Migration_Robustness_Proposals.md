# Post-Migration Robustness Proposals

**Status:** Draft for Review
**Date:** 2026-02-03
**Context:** Enhancements to lexicon-to-LLM migration for production robustness
**Priority:** Medium (migration is functionally correct; these add safety/observability)

---

## Executive Summary

The lexicon-to-LLM migration (Phases 1-4) is complete and functionally correct. These proposals address robustness, observability, and long-term maintainability gaps identified during review.

**Key Priorities:**
1. **P0 (Critical):** Fallback handling for missing LLM classifications
2. **P1 (High):** Edge case test coverage
3. **P2 (Medium):** Classification monitoring/logging
4. **P3 (Low):** Confidence scoring and documentation updates

---

## Proposal 1: LLM Classification Fallback Strategy

**Priority:** P0 (Critical)
**Effort:** 2-3 hours
**Risk if not implemented:** Runtime errors or undefined behavior when LLM fails to classify

### Problem

Current implementation assumes LLM always provides classification fields. When LLM:
- Times out or errors
- Refuses to classify (content policy)
- Returns malformed JSON
- Omits optional fields

The system has `undefined` values, leading to unpredictable behavior in aggregation logic.

### Proposed Solution

Implement a three-tier fallback strategy:

```typescript
// Location: apps/web/src/lib/analyzer/orchestrated.ts

/**
 * Get classification with fallback strategy
 * 1. Use LLM-provided value (preferred)
 * 2. Retry with clarified prompt (if missing)
 * 3. Use safe default (if retry fails)
 */
function getFactualBasisWithFallback(
  llmValue: string | undefined,
  keyFactor: KeyFactor
): "established" | "disputed" | "opinion" | "unknown" {
  // Tier 1: Trust LLM
  if (llmValue && ["established", "disputed", "opinion", "unknown"].includes(llmValue)) {
    return llmValue as any;
  }

  // Tier 2: Safe default (no retry in alpha - too complex)
  logger.warn('Missing factualBasis from LLM, defaulting to unknown', {
    keyFactorText: keyFactor.text,
    llmValue
  });

  return "unknown";
}

function getHarmPotentialWithFallback(
  llmValue: string | undefined,
  claimText: string
): "high" | "medium" | "low" {
  // Tier 1: Trust LLM
  if (llmValue && ["high", "medium", "low"].includes(llmValue)) {
    return llmValue as any;
  }

  // Tier 2: Safety-critical fallback (non-semantic keyword check)
  // This is NOT intelligence - just a safety net for critical cases
  const lowerText = claimText.toLowerCase();
  const criticalKeywords = [
    'death', 'died', 'killed', 'fatal', 'murder',
    'cancer', 'poison', 'deadly', 'lethal'
  ];

  if (criticalKeywords.some(kw => lowerText.includes(kw))) {
    logger.warn('LLM failed to classify harm, using safety fallback: high', {
      claimText,
      llmValue
    });
    return "high";
  }

  logger.warn('Missing harmPotential from LLM, defaulting to medium', {
    claimText,
    llmValue
  });

  return "medium"; // Safe default
}

function getSourceAuthorityWithFallback(
  llmValue: string | undefined,
  sourceText: string
): "primary" | "secondary" | "opinion" {
  // Tier 1: Trust LLM
  if (llmValue && ["primary", "secondary", "opinion"].includes(llmValue)) {
    return llmValue as any;
  }

  // Tier 2: Safe default
  logger.warn('Missing sourceAuthority from LLM, defaulting to secondary', {
    sourceText,
    llmValue
  });

  return "secondary"; // Safest neutral default
}
```

### Implementation Locations

**1. KeyFactor factualBasis** (apps/web/src/lib/analyzer/orchestrated.ts)
```typescript
// Around line 8900 (after KeyFactor extraction)
const normalizedKeyFactors = rawKeyFactors.map(kf => ({
  ...kf,
  factualBasis: getFactualBasisWithFallback(kf.factualBasis, kf),
  isContested: kf.isContested ?? false,
  contestedBy: kf.contestedBy ?? ""
}));
```

**2. Claim harmPotential** (apps/web/src/lib/analyzer/orchestrated.ts)
```typescript
// Around line 8200 (after claim extraction)
const normalizedClaims = claims.map(claim => ({
  ...claim,
  harmPotential: getHarmPotentialWithFallback(claim.harmPotential, claim.text)
}));
```

**3. Evidence sourceAuthority** (apps/web/src/lib/analyzer/orchestrated.ts)
```typescript
// Around line 7800 (after evidence extraction)
const normalizedEvidence = evidence.map(ev => ({
  ...ev,
  sourceAuthority: getSourceAuthorityWithFallback(ev.sourceAuthority, ev.text),
  evidenceBasis: ev.evidenceBasis ?? "anecdotal" // Safe default for missing basis
}));
```

### Success Criteria

- [ ] All classification fields have defined values (no `undefined`)
- [ ] Logger captures all fallback events with context
- [ ] Fallback rate < 5% in production (indicates LLM is working)
- [ ] No runtime errors from missing classification fields
- [ ] Build and tests pass

### Testing

Create test cases in `apps/web/test/unit/lib/analyzer/orchestrated.test.ts`:

```typescript
describe('LLM Classification Fallbacks', () => {
  test('factualBasis defaults to unknown when missing', async () => {
    const keyFactor = { text: 'Some claim', factualBasis: undefined };
    const result = getFactualBasisWithFallback(keyFactor.factualBasis, keyFactor);
    expect(result).toBe('unknown');
  });

  test('harmPotential uses safety fallback for death keywords', async () => {
    const result = getHarmPotentialWithFallback(undefined, 'This causes death');
    expect(result).toBe('high');
  });

  test('harmPotential defaults to medium for generic claims', async () => {
    const result = getHarmPotentialWithFallback(undefined, 'This is inefficient');
    expect(result).toBe('medium');
  });

  test('sourceAuthority defaults to secondary when missing', async () => {
    const result = getSourceAuthorityWithFallback(undefined, 'Reuters reported');
    expect(result).toBe('secondary');
  });
});
```

---

## Proposal 2: Edge Case Test Coverage

**Priority:** P1 (High)
**Effort:** 4-6 hours
**Risk if not implemented:** Unknown behavior in production edge cases

### Problem

Current test suite validates basic LLM behavior but lacks edge case coverage for:
- Ambiguous classifications (borderline high/medium harm)
- Conflicting evidence (scientific + pseudoscientific)
- Low-confidence LLM outputs
- Circular contestation scenarios
- Missing required fields

### Proposed Test Suite

Create `apps/web/test/unit/lib/analyzer/llm-classification-edge-cases.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { analyzeArticle } from '@/lib/analyzer/orchestrated';

describe('LLM Classification Edge Cases', () => {

  describe('Harm Potential - Ambiguous Cases', () => {
    test('economic harm to businesses classified as high', async () => {
      const article = {
        title: 'Policy Analysis',
        content: 'This policy will bankrupt thousands of small businesses'
      };
      const result = await analyzeArticle(article);
      const claim = result.claims.find(c => c.text.includes('bankrupt'));
      expect(claim?.harmPotential).toBeOneOf(['high', 'medium']);
      expect(claim?.harmPotential).toBeDefined();
    });

    test('reputational harm without specifics classified as medium', async () => {
      const article = {
        title: 'Criticism',
        content: 'This violates international norms and damages credibility'
      };
      const result = await analyzeArticle(article);
      const claim = result.claims.find(c => c.text.includes('violates'));
      expect(claim?.harmPotential).toBeOneOf(['medium', 'low']);
    });

    test('mental health claims classified as high', async () => {
      const article = {
        title: 'Health Impact',
        content: 'This causes severe anxiety and depression in patients'
      };
      const result = await analyzeArticle(article);
      const claim = result.claims.find(c => c.text.includes('anxiety'));
      expect(claim?.harmPotential).toBe('high'); // Mental health = health harm
    });
  });

  describe('Factual Basis - Circular Contestation', () => {
    test('entity cannot contest its own decision', async () => {
      const article = {
        title: 'Court Case',
        content: `The court ruled the permit was invalid.
                  The company claims the ruling is wrong.`
      };
      const result = await analyzeArticle(article);
      const verdict = result.verdicts.find(v => v.claim.includes('permit was invalid'));

      // Company's contestation should be marked as "opinion" not "established"
      // because the entity being evaluated (company) cannot provide evidence against the court
      expect(verdict?.factualBasis).toBeOneOf(['opinion', 'unknown']);
    });

    test('third party can provide documented counter-evidence', async () => {
      const article = {
        title: 'Court Case Review',
        content: `The court ruled the permit was invalid.
                  Independent auditors found the permit met all legal requirements.`
      };
      const result = await analyzeArticle(article);
      const verdict = result.verdicts.find(v => v.claim.includes('permit was invalid'));

      // Independent auditors provide documented evidence
      expect(verdict?.factualBasis).toBeOneOf(['established', 'disputed']);
    });
  });

  describe('Source Authority - Opinion vs Evidence', () => {
    test('executive order is opinion not evidence', async () => {
      const article = {
        title: 'Policy Declaration',
        content: 'Executive Order 123 declares the program constitutes persecution'
      };
      const result = await analyzeArticle(article);
      const evidence = result.evidence.find(e => e.text.includes('Executive Order'));

      expect(evidence?.sourceAuthority).toBe('opinion'); // Political statement, not proof
    });

    test('court ruling with documented findings is primary evidence', async () => {
      const article = {
        title: 'Court Decision',
        content: 'Court documents show 12 violations were found during the audit'
      };
      const result = await analyzeArticle(article);
      const evidence = result.evidence.find(e => e.text.includes('violations'));

      expect(evidence?.sourceAuthority).toBeOneOf(['primary', 'secondary']);
      expect(evidence?.sourceAuthority).not.toBe('opinion');
    });

    test('dissenting opinion is opinion not evidence', async () => {
      const article = {
        title: 'Court Case',
        content: 'The dissenting opinion argues the majority got it wrong'
      };
      const result = await analyzeArticle(article);
      const evidence = result.evidence.find(e => e.text.includes('dissenting'));

      expect(evidence?.sourceAuthority).toBe('opinion');
    });
  });

  describe('Evidence Basis - Mixed Quality', () => {
    test('claim with both scientific and pseudoscientific evidence', async () => {
      const article = {
        title: 'Treatment Claims',
        content: `Peer-reviewed study found the treatment effective (n=500).
                  Homeopathic practitioners also claim it works through energy balancing.`
      };
      const result = await analyzeArticle(article);

      // Should have evidence items with different basis values
      const scientificEvidence = result.evidence.filter(e => e.evidenceBasis === 'scientific');
      const pseudoEvidence = result.evidence.filter(e => e.evidenceBasis === 'pseudoscientific');

      expect(scientificEvidence.length).toBeGreaterThan(0);
      expect(pseudoEvidence.length).toBeGreaterThan(0);

      // Verdict should lean toward scientific evidence
      const verdict = result.verdicts.find(v => v.claim.includes('treatment effective'));
      expect(verdict?.confidenceRating).toBeGreaterThan(50); // Should pass due to scientific evidence
    });
  });

  describe('Missing Fields - Fallback Behavior', () => {
    test('handles missing harmPotential with fallback', async () => {
      // Mock LLM response with missing harmPotential
      const result = await analyzeArticle({
        title: 'Generic Claim',
        content: 'This policy was announced yesterday'
      });

      // All claims should have harmPotential (fallback to medium if missing)
      result.claims.forEach(claim => {
        expect(claim.harmPotential).toBeDefined();
        expect(['high', 'medium', 'low']).toContain(claim.harmPotential);
      });
    });

    test('handles missing factualBasis with fallback to unknown', async () => {
      const result = await analyzeArticle({
        title: 'Contested Claim',
        content: 'Critics say this is problematic'
      });

      // All verdicts should have factualBasis
      result.verdicts.forEach(verdict => {
        expect(verdict.factualBasis).toBeDefined();
        expect(['established', 'disputed', 'opinion', 'unknown']).toContain(verdict.factualBasis);
      });
    });
  });
});

// Helper matcher
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () => `expected ${received} to be one of ${expected.join(', ')}`
    };
  }
});
```

### Success Criteria

- [ ] All 15+ edge case tests pass
- [ ] Coverage includes: ambiguous harm, circular contestation, opinion vs evidence, mixed quality, missing fields
- [ ] Tests run in CI/CD pipeline
- [ ] No unexpected failures in edge cases

---

## Proposal 3: Classification Monitoring & Logging

**Priority:** P2 (Medium)
**Effort:** 3-4 hours
**Risk if not implemented:** No visibility into LLM classification behavior in production

### Problem

Currently no monitoring for:
- How often each classification category is used
- Fallback usage rate (indicates LLM reliability)
- Classification distribution over time
- Processing time per classification
- Cost per article

Without this data, cannot identify:
- Prompt drift (classifications changing over time)
- LLM failures requiring fallback
- Cost increases from prompt changes
- Bias in classifications

### Proposed Solution

Add lightweight classification telemetry to orchestrated analysis.

**1. Create telemetry logger** (`apps/web/src/lib/analyzer/classification-telemetry.ts`):

```typescript
import { Logger } from '@/lib/logger';

interface ClassificationTelemetry {
  jobId: string;
  articleId: string;
  timestamp: Date;

  // Classification distributions
  harmPotential: {
    high: number;
    medium: number;
    low: number;
    fallbackUsed: number;
  };

  factualBasis: {
    established: number;
    disputed: number;
    opinion: number;
    unknown: number;
    fallbackUsed: number;
  };

  sourceAuthority: {
    primary: number;
    secondary: number;
    opinion: number;
    contested: number;
    fallbackUsed: number;
  };

  evidenceBasis: {
    scientific: number;
    documented: number;
    anecdotal: number;
    theoretical: number;
    pseudoscientific: number;
    fallbackUsed: number;
  };

  // Performance metrics
  processingTimeMs: number;
  totalTokensUsed: number;
  estimatedCostUSD: number;
}

export class ClassificationTelemetryCollector {
  private data: Partial<ClassificationTelemetry> = {
    harmPotential: { high: 0, medium: 0, low: 0, fallbackUsed: 0 },
    factualBasis: { established: 0, disputed: 0, opinion: 0, unknown: 0, fallbackUsed: 0 },
    sourceAuthority: { primary: 0, secondary: 0, opinion: 0, fallbackUsed: 0 },
    evidenceBasis: { scientific: 0, documented: 0, anecdotal: 0, theoretical: 0, pseudoscientific: 0, fallbackUsed: 0 }
  };

  recordHarmPotential(value: string, wasFallback: boolean = false) {
    if (wasFallback) this.data.harmPotential!.fallbackUsed++;
    else if (value in this.data.harmPotential!) {
      (this.data.harmPotential as any)[value]++;
    }
  }

  recordFactualBasis(value: string, wasFallback: boolean = false) {
    if (wasFallback) this.data.factualBasis!.fallbackUsed++;
    else if (value in this.data.factualBasis!) {
      (this.data.factualBasis as any)[value]++;
    }
  }

  recordSourceAuthority(value: string, wasFallback: boolean = false) {
    if (wasFallback) this.data.sourceAuthority!.fallbackUsed++;
    else if (value in this.data.sourceAuthority!) {
      (this.data.sourceAuthority as any)[value]++;
    }
  }

  recordEvidenceBasis(value: string, wasFallback: boolean = false) {
    if (wasFallback) this.data.evidenceBasis!.fallbackUsed++;
    else if (value in this.data.evidenceBasis!) {
      (this.data.evidenceBasis as any)[value]++;
    }
  }

  finalize(jobId: string, articleId: string, processingTimeMs: number, tokensUsed: number) {
    this.data.jobId = jobId;
    this.data.articleId = articleId;
    this.data.timestamp = new Date();
    this.data.processingTimeMs = processingTimeMs;
    this.data.totalTokensUsed = tokensUsed;
    this.data.estimatedCostUSD = this.estimateCost(tokensUsed);

    Logger.info('Classification telemetry', this.data);

    // Optional: Write to database for analysis
    // await saveTelemetryToDatabase(this.data);
  }

  private estimateCost(tokens: number): number {
    // Rough estimate: $3 per 1M input tokens, $15 per 1M output tokens for Claude Sonnet
    // Assume 70/30 split input/output
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    return (inputTokens * 3 / 1_000_000) + (outputTokens * 15 / 1_000_000);
  }
}
```

**2. Integrate into orchestrated.ts**:

```typescript
// At start of analyzeArticle()
const telemetry = new ClassificationTelemetryCollector();
const startTime = Date.now();

// After claim extraction
claims.forEach(claim => {
  telemetry.recordHarmPotential(
    claim.harmPotential,
    claim.harmPotential === undefined // was fallback used?
  );
});

// After KeyFactor extraction
keyFactors.forEach(kf => {
  telemetry.recordFactualBasis(
    kf.factualBasis,
    kf.factualBasis === undefined
  );
});

// After evidence extraction
evidence.forEach(ev => {
  if (ev.sourceAuthority) {
    telemetry.recordSourceAuthority(ev.sourceAuthority, false);
  }
  if (ev.evidenceBasis) {
    telemetry.recordEvidenceBasis(ev.evidenceBasis, false);
  }
});

// At end of analysis
const processingTime = Date.now() - startTime;
telemetry.finalize(jobId, articleId, processingTime, totalTokensUsed);
```

**3. Create telemetry query endpoint** (`apps/web/src/app/api/admin/telemetry/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTelemetryStats } from '@/lib/analyzer/classification-telemetry';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Aggregate telemetry over date range
  const stats = await getTelemetryStats({ startDate, endDate });

  return NextResponse.json({
    period: { startDate, endDate },
    summary: {
      totalArticles: stats.count,
      avgProcessingTimeMs: stats.avgProcessingTime,
      totalCostUSD: stats.totalCost,
      fallbackRate: stats.fallbackUsageRate,

      distributions: {
        harmPotential: stats.harmPotentialDist,
        factualBasis: stats.factualBasisDist,
        sourceAuthority: stats.sourceAuthorityDist,
        evidenceBasis: stats.evidenceBasisDist
      }
    }
  });
}
```

### Success Criteria

- [ ] Telemetry captured for every article analysis
- [ ] No performance impact (logging is async)
- [ ] Fallback rate visible in logs
- [ ] Classification distribution trackable over time
- [ ] Admin endpoint returns telemetry stats

### Future Enhancements (Beta)

- Dashboard visualization of telemetry data
- Alerting when fallback rate > 5%
- Prompt performance comparison (before/after changes)
- Cost tracking and budget alerts

---

## Proposal 4: Confidence Scoring (Optional)

**Priority:** P3 (Low)
**Effort:** 3-4 hours
**Risk if not implemented:** Cannot identify low-confidence classifications that may need review

### Problem

LLM classifications have varying confidence levels. Currently no way to:
- Identify borderline classifications (LLM uncertain)
- Flag low-confidence cases for human review
- Track classification quality over time
- Adjust weights based on confidence

### Proposed Solution

Add confidence fields to classification outputs and adjust aggregation logic.

**1. Schema updates** (`apps/web/src/lib/analyzer/types.ts`):

```typescript
export interface KeyFactor {
  // Existing fields...
  factualBasis: "established" | "disputed" | "opinion" | "unknown";

  // NEW: Confidence in factualBasis classification (0-100)
  factualBasisConfidence?: number;
}

export interface Claim {
  // Existing fields...
  harmPotential?: "high" | "medium" | "low";

  // NEW: Confidence in harmPotential classification (0-100)
  harmPotentialConfidence?: number;
}

export interface EvidenceItem {
  // Existing fields...
  sourceAuthority?: "primary" | "secondary" | "opinion";
  evidenceBasis?: "scientific" | "documented" | "anecdotal" | "theoretical" | "pseudoscientific";

  // NEW: Confidence in source/evidence classification (0-100)
  classificationConfidence?: number;
}
```

**2. Prompt updates** (add to all classification prompts):

```
For each classification, also provide a confidence score (0-100):
- 90-100: Very confident, clear indicators present
- 70-89: Confident, some ambiguity but decision is sound
- 50-69: Moderate confidence, borderline case
- 30-49: Low confidence, significant ambiguity
- 0-29: Very uncertain, insufficient information

If confidence < 50, prefer conservative classifications:
- harmPotential: default to "medium" or "high" (safety)
- factualBasis: default to "unknown" (avoid false certainty)
- sourceAuthority: default to "secondary" (neutral)
```

**3. Aggregation adjustments** (`apps/web/src/lib/analyzer/aggregation.ts`):

```typescript
export function getClaimWeight(claim: Claim, verdict: ClaimVerdict): number {
  let weight = 100;

  // Existing logic for harmPotential, isContested, factualBasis...

  // NEW: Reduce weight for low-confidence classifications
  if (verdict.factualBasisConfidence && verdict.factualBasisConfidence < 50) {
    weight *= 0.8; // 20% reduction for uncertain factualBasis
  }

  if (claim.harmPotentialConfidence && claim.harmPotentialConfidence < 50) {
    weight *= 0.9; // 10% reduction for uncertain harmPotential
  }

  return weight;
}
```

**4. Admin flagging** (flag low-confidence articles for review):

```typescript
export function shouldFlagForHumanReview(result: AnalysisResult): boolean {
  // Flag if any high-harm claim has low-confidence classification
  const lowConfidenceHighHarm = result.claims.some(claim =>
    claim.harmPotential === 'high' &&
    (claim.harmPotentialConfidence ?? 100) < 60
  );

  // Flag if multiple contested claims with low factualBasis confidence
  const lowConfidenceContested = result.verdicts.filter(v =>
    v.isContested &&
    (v.factualBasisConfidence ?? 100) < 60
  ).length >= 2;

  return lowConfidenceHighHarm || lowConfidenceContested;
}
```

### Success Criteria

- [ ] All classifications include confidence scores
- [ ] Low-confidence cases flagged for review
- [ ] Aggregation weights adjusted for uncertainty
- [ ] Confidence distribution tracked in telemetry
- [ ] Prompts explicitly request confidence scores

### Deferred to Beta

Full confidence-weighted aggregation system with probabilistic reasoning.

---

## Proposal 5: Documentation Updates

**Priority:** P3 (Low)
**Effort:** 2-3 hours
**Risk if not implemented:** Team lacks understanding of new LLM-based system

### Documentation Updates Needed

**1. Update: `Docs/ARCHITECTURE/Analyzer_Pipeline.md`**

Remove references to pattern-based classification. Add section:

```markdown
## Classification System (Post-v2.9.2)

FactHarbor uses LLM-based classification for all semantic judgments:

### Claim-Level Classifications
- **harmPotential** (high/medium/low): Assessed by LLM based on potential consequences
- **isContested**: Determined by LLM analyzing counter-arguments
- **factualBasis** (established/disputed/opinion/unknown): Quality of counter-evidence

### Evidence-Level Classifications
- **sourceAuthority** (primary/secondary/opinion): Reliability of source
- **evidenceBasis** (scientific/documented/anecdotal/theoretical/pseudoscientific): Type of evidence

### Fallback Strategy
If LLM fails to classify:
1. Log warning with context
2. Use safe defaults (unknown, medium, secondary)
3. For safety-critical fields (harmPotential), minimal keyword fallback

### No Pattern-Based Intelligence
Removed in v2.9.2:
- detectPseudoscience() - LLM identifies unscientific claims
- detectHarmPotential() - LLM assesses harm level
- detectClaimContestation() - LLM determines contestation
- opinionSourcePatterns - LLM classifies source types

Patterns remain ONLY for non-semantic operations (URL validation, string length).
```

**2. Create: `Docs/ARCHITECTURE/LLM_Classification_System.md`**

Comprehensive guide to LLM-based classification:

```markdown
# LLM Classification System

## Overview
All semantic classification is performed by the LLM (Claude Sonnet 4.5) based on explicit prompt guidance.

## Classification Fields

### 1. Harm Potential
[Detail each classification, with examples, decision criteria, prompt location]

### 2. Factual Basis
[...]

### 3. Source Authority
[...]

### 4. Evidence Basis
[...]

## Prompt Engineering

### Classification Prompt Structure
[Show how prompts are structured with examples and decision trees]

### Preventing Over-Classification
[Counter-examples and safeguards]

## Monitoring & Quality Control

### Telemetry
[How classification distributions are tracked]

### Fallback Behavior
[What happens when LLM fails]

### Human Review Triggers
[When to flag for manual review]

## Comparison: Pattern-Based vs LLM-Based

| Aspect | Pattern-Based (removed) | LLM-Based (current) |
|--------|-------------------------|---------------------|
| Accuracy | Limited by keyword lists | Context-aware |
| Maintainability | Hard to update | Easy to refine prompts |
| Edge cases | Fails on ambiguous text | Handles nuance better |
| Cost | Free | ~$0.01-0.05 per article |
| Transparency | Clear patterns | Requires monitoring |
```

**3. Update: `Docs/DEVELOPMENT/Testing_Guide.md`**

Add section on testing LLM classifications:

```markdown
## Testing LLM Classifications

### Edge Case Test Suite
Location: `apps/web/test/unit/lib/analyzer/llm-classification-edge-cases.test.ts`

Tests cover:
- Ambiguous harm potential (economic harm, mental health)
- Circular contestation (entity cannot contest self)
- Opinion vs evidence (executive orders, dissenting opinions)
- Mixed evidence quality (scientific + pseudoscientific)
- Missing fields (fallback behavior)

### Running Classification Tests
```bash
npm run test -- llm-classification
```

### Adding New Test Cases
[Template for new edge case tests]
```

### Success Criteria

- [ ] Architecture docs updated (no pattern references)
- [ ] LLM Classification System doc created
- [ ] Testing guide includes edge case examples
- [ ] Team trained on new system
- [ ] All docs reviewed and approved

---

## Implementation Priority & Sequencing

**Recommended order:**

1. **Week 1: Critical Safety**
   - P0: Fallback Strategy (2-3 hours) ← **DO FIRST**
   - Deploy and monitor for 48 hours

2. **Week 2: Quality Assurance**
   - P1: Edge Case Tests (4-6 hours)
   - Verify no unexpected failures

3. **Week 3: Observability**
   - P2: Classification Monitoring (3-4 hours)
   - Track distributions for 1 week

4. **Week 4+: Enhancements**
   - P3: Confidence Scoring (3-4 hours) - if needed based on monitoring
   - P3: Documentation Updates (2-3 hours)

**Total Estimated Effort:** 14-20 hours across 4 weeks

---

## Success Metrics

**After all proposals implemented:**

- [ ] Fallback rate < 5% (indicates LLM reliability)
- [ ] Zero runtime errors from missing classifications
- [ ] 95%+ edge case test pass rate
- [ ] Classification telemetry available for all analyses
- [ ] Documentation complete and team trained

---

**Status:** Ready for review and prioritization
**Next Step:** Review with team and approve implementation sequence
