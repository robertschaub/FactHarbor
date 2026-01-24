# FactHarbor Calculations Documentation

**Version**: 2.6.35  
**Last Updated**: 2026-01-21

## Overview

This document explains how FactHarbor calculates verdicts, handles counter-evidence, aggregates results across different levels, manages confidence scores, and applies source reliability weighting.

## 1. Verdict Scale (7-Point System with MIXED/UNVERIFIED Distinction)

FactHarbor uses a symmetric 7-point scale with truth percentages from 0-100%. The 43-57% range distinguishes between **MIXED** (high confidence, evidence on both sides) and **UNVERIFIED** (low confidence, insufficient evidence):

| Verdict | Range | Confidence | Description |
|---------|-------|------------|-------------|
| **TRUE** | 86-100% | - | Strong support, no credible counter-evidence |
| **MOSTLY-TRUE** | 72-85% | - | Mostly supported, minor gaps |
| **LEANING-TRUE** | 58-71% | - | Mixed evidence, leans positive |
| **MIXED** | 43-57% | >= 60% | Evidence on both sides, roughly equal |
| **UNVERIFIED** | 43-57% | < 60% | Insufficient evidence to judge |
| **LEANING-FALSE** | 29-42% | - | More counter-evidence than support |
| **MOSTLY-FALSE** | 15-28% | - | Strong counter-evidence |
| **FALSE** | 0-14% | - | Direct contradiction |

### MIXED vs UNVERIFIED

- **MIXED** (blue in UI): We have substantial evidence, but it's roughly equal on both sides. High confidence in the mixed state.
- **UNVERIFIED** (orange in UI): We don't have enough evidence to make any judgment. Low confidence due to insufficient information.

### Implementation

**File**: `apps/web/src/lib/analyzer.ts`

**Function**: `percentageToClaimVerdict` (line ~1544)
```typescript
// Confidence threshold to distinguish MIXED from UNVERIFIED
const MIXED_CONFIDENCE_THRESHOLD = 60;

function percentageToClaimVerdict(truthPercentage: number, confidence?: number): ClaimVerdict7Point {
  if (truthPercentage >= 86) return "TRUE";
  if (truthPercentage >= 72) return "MOSTLY-TRUE";
  if (truthPercentage >= 58) return "LEANING-TRUE";
  if (truthPercentage >= 43) {
    // Distinguish MIXED (high confidence, evidence on both sides) 
    // from UNVERIFIED (low confidence, insufficient evidence)
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= MIXED_CONFIDENCE_THRESHOLD ? "MIXED" : "UNVERIFIED";
  }
  if (truthPercentage >= 29) return "LEANING-FALSE";
  if (truthPercentage >= 15) return "MOSTLY-FALSE";
  return "FALSE";
}
```

### Truth Bands

The `truthFromBand` function (line ~1471) converts confidence-adjusted bands to percentages:

```typescript
function truthFromBand(band: "strong" | "partial" | "uncertain" | "refuted", confidence: number): number {
  const conf = normalizePercentage(confidence) / 100;
  switch (band) {
    case "strong":    return Math.round(72 + 28 * conf);  // 72-100%
    case "partial":   return Math.round(50 + 35 * conf);  // 50-85%
    case "uncertain": return Math.round(35 + 30 * conf);  // 35-65%
    case "refuted":   return Math.round(28 * (1 - conf)); // 0-28%
  }
}
```

## 2. AnalysisContext (Bounded Analytical Frame)

A **AnalysisContext** is a bounded analytical frame that should be analyzed separately. It replaces the previous terminology of "proceeding".

Note: **EvidenceScope** is the *per-fact* source methodology/boundaries (`ExtractedFact.evidenceScope`). This section’s AnalysisContext refers to the *top-level* bounded analytical frame.

### Definition

An AnalysisContext is defined by:
- **Boundaries**: What's included/excluded (e.g., "vehicle-only", "full lifecycle")
- **Methodology**: Standards used (e.g., "ISO 14040", "WTW analysis")
- **Temporal**: Time period (e.g., "2020-2025", "January 2023")
- **Subject**: What's being analyzed (e.g., "TSE case", "efficiency comparison")
- **Institution**: Court, agency, or organization (optional)
- **Jurisdiction**: Geographic/legal jurisdiction (optional)

### AnalysisContext Types

| Type | Examples |
|------|----------|
| **Legal** | TSE electoral case, STF criminal proceeding |
| **Methodological** | WTW, TTW, LCA analysis |
| **Regulatory** | EU regulations, US EPA standards |
| **Temporal** | 2023 rollout vs 2024 review |

### Multi-Context Detection

The system detects multiple analysis contexts when an input requires separate analyses:

```typescript
interface AnalysisContext {
  id: string;              // e.g., "CTX_TSE", "CTX_WTW"
  name: string;            // Human-readable name
  shortName: string;       // Abbreviation
  institution?: string;    // Court, agency, organization
  methodology?: string;    // Standard/method used
  boundaries?: string;     // What's included/excluded
  temporal?: string;       // Time period
  subject: string;         // What's being analyzed
  criteria?: string[];     // Evaluation criteria
  outcome?: string;        // Result if known
  status: "concluded" | "ongoing" | "pending" | "unknown";
  decisionMakers?: DecisionMaker[];
}
```

### AnalysisContext Sources

Analysis contexts are determined from:
1. **Input analysis** (understandClaim phase): Explicit or implied analysis contexts in user query
2. **Evidence extraction** (extractFacts phase): Sources may define their own EvidenceScope via `evidenceScope`
3. **Claim decomposition**: Claims tagged with `contextId` (legacy: `relatedProceedingId`)

### EvidenceScope vs AnalysisContext

When evidence defines an EvidenceScope that differs from the AnalysisContext (e.g., WTW data applied to TTW analysis), this is flagged in verdict reasoning.

### Design Decision: evidenceScope Kept Separate

The `evidenceScope` field on facts is intentionally kept separate from top-level analysis contexts. This enables:
- **Provenance tracking**: Distinguishes analysis context detected from input vs EvidenceScope defined by evidence
- **Mismatch detection**: Identifies when EvidenceScope differs from the analysis context
- **Verdict enrichment**: Notes EvidenceScope metadata without modifying detected analysis contexts

## 3. Counter-Evidence Handling

Counter-evidence is distinguished from mere contestation and influences verdict calculations.

### Doubted vs Contested (v2.8)

```mermaid
flowchart TD
    subgraph Input["Opposition/Criticism"]
        OPP[Someone opposes or criticizes the claim]
    end
    
    OPP --> CHECK{Has documented<br/>counter-evidence?}
    
    CHECK -->|No evidence| DOUBTED[DOUBTED<br/>factualBasis: opinion/alleged]
    CHECK -->|Some evidence| DISPUTED[CONTESTED<br/>factualBasis: disputed]
    CHECK -->|Strong evidence| ESTABLISHED[CONTESTED<br/>factualBasis: established]
    
    DOUBTED --> W1[Weight: 1.0x<br/>Full weight]
    DISPUTED --> W2[Weight: 0.5x<br/>Reduced]
    ESTABLISHED --> W3[Weight: 0.3x<br/>Heavily reduced]
    
    style DOUBTED fill:#fff3e0
    style DISPUTED fill:#ffecb3
    style ESTABLISHED fill:#ffcdd2
    style W1 fill:#c8e6c9
    style W2 fill:#fff9c4
    style W3 fill:#ffcdd2
```

**Key Distinction:**
- **DOUBTED** = Political criticism, rhetoric, accusations WITHOUT documented evidence → Full weight (claim remains credible)
- **CONTESTED** = Has actual documented counter-evidence → Reduced weight (genuine uncertainty)

**Implementation (v2.8):**
- `validateContestation()` in `aggregation.ts`: KeyFactor-level validation (orchestrated pipeline)
- `detectClaimContestation()` in `aggregation.ts`: Claim-level heuristic (canonical pipeline)

### Fact Categorization

**File**: `apps/web/src/lib/analyzer.ts` (ExtractedFact interface, line ~1800)

Facts are categorized during extraction:
- `category: "evidence"` - Supporting evidence
- `category: "criticism"` - Counter-evidence or opposing views
- `category: "expert_quote"` - Expert testimony
- `category: "statistic"` - Numerical data
- `category: "legal_provision"` - Legal framework
- `category: "event"` - Factual events

### Contestation Fields

```typescript
interface ExtractedFact {
  category: "legal_provision" | "evidence" | "expert_quote" | "statistic" | "event" | "criticism";
  isContestedClaim?: boolean;  // True if this fact contests a claim
  claimSource?: string;         // Who makes the contested claim
}
```

### Gate 4 Scoping

**Function**: `applyGate4ToVerdicts` (line ~1018)

Counter-evidence is scoped to relevant analysis contexts:

```typescript
// Count contradicting facts (criticism category)
// Only count criticism facts that are:
// 1. In the same context as the verdict, OR
// 2. Not scoped to any specific context (general criticism)
const contradictingFactCount = facts.filter(f =>
  !verdict.supportingFactIds.includes(f.id) &&
  f.category === "criticism" &&
  (!f.contextId || f.contextId === verdict.contextId)
).length;
```

This prevents criticism of one analysis context from penalizing claims about a different analysis context.

### Evidence-Based Contestation

**File**: `apps/web/src/lib/analyzer.ts` (line ~5478)

Contestation with documented evidence reduces verdict scores:

```typescript
const evidenceBasedContestation =
  cv.isContested &&
  (cv.factualBasis === "established" || cv.factualBasis === "disputed");

if (evidenceBasedContestation) {
  const penalty = cv.factualBasis === "established" ? 12 : 8;
  truthPct = Math.max(0, truthPct - penalty);
}
```

- **"established"** counter-evidence: -12 points
- **"disputed"** counter-evidence: -8 points
- **"opinion"** contestation: No penalty (just rhetoric)

## 4. Aggregation Hierarchy

```mermaid
graph TD
    Facts[Extracted Facts] --> ClaimVerdicts[Claim Verdicts]
    ClaimVerdicts --> WeightCalc[Weight Calculation<br/>━━━━━━━━━━━━━<br/>• centrality: 2.0x<br/>• harmPotential: 1.5x<br/>• contested: 0.3-0.5x]
    WeightCalc --> KeyFactors[Key Factor Verdicts]
    KeyFactors --> ContextAnswers[Context Answers]
    ContextAnswers --> OverallAnswer[Overall Answer]
    
    ClaimVerdicts --> ArticleVerdict[Article Verdict]
    
    style WeightCalc fill:#e3f2fd
```

### Weight Calculation (v2.8)

**Function**: `getClaimWeight()` in `aggregation.ts`

```typescript
function getClaimWeight(claim: WeightedClaim): number {
  let weight = 1.0;
  
  // Centrality boost
  if (claim.centrality === "central") weight *= 2.0;
  
  // Harm potential boost
  if (claim.harmPotential === "high") weight *= 1.5;
  
  // Contestation reduction (only for documented counter-evidence)
  if (claim.isContested) {
    if (claim.factualBasis === "established") weight *= 0.3;
    else if (claim.factualBasis === "disputed") weight *= 0.5;
    // "opinion"/"alleged"/"unknown" = full weight (just doubted)
  }
  
  return weight;
}
```

### Level 1: Claim Verdicts

**Source**: LLM verdict generation + source reliability weighting

**Function**: `applyEvidenceWeighting` in `source-reliability.ts`

Source reliability weighting adjusts verdicts based on the credibility of evidence sources. See [Source Reliability Weighting](#10-source-reliability-weighting) for full details.

```typescript
// Calculate effective weight from source reliability data
const effectiveWeight = calculateEffectiveWeight(sourceData);

// Adjust truth toward neutral (50) based on effective weight
const adjustedTruth = Math.round(50 + (verdict.truthPercentage - 50) * avgEffectiveWeight);
const adjustedConfidence = Math.round(verdict.confidence * (0.5 + avgEffectiveWeight / 2));
```

| Source Quality | Effective Weight | Verdict Impact |
|----------------|------------------|----------------|
| High reliability (93% score, consensus) | ~97% | Minimal adjustment |
| Medium reliability (70% score) | ~68% | Moderate pull toward neutral |
| Unknown source (default) | ~41% | Strong pull toward neutral |
| Low reliability (40% score) | ~39% | Strong pull toward neutral |

### Level 2: Key Factor Verdicts

**File**: `apps/web/src/lib/analyzer.ts` (line ~5543)

Key factors aggregate claims mapped to them:

```typescript
const factorClaims = weightedClaimVerdicts.filter(v => v.keyFactorId === factor.id);
const factorAvgTruthPct = dedupeWeightedAverageTruth(factorClaims);

// Determine support based on average
if (factorAvgTruthPct >= 72) supports = "yes";
else if (factorAvgTruthPct < 43) supports = "no";
else supports = "neutral";
```

### Level 3: Context Answers

**File**: `apps/web/src/lib/analyzer.ts` (line ~4700)

Analysis contexts aggregate key factors with contestation correction:

```typescript
// Calculate effective negatives (contested negatives are down-weighted)
const effectiveNegatives = negativeFactors - (contestedNegatives * 0.7);

// If positive factors > effective negatives, boost verdict
if (answerTruthPct >= 72 && positiveFactors > effectiveNegatives) {
  // Already positive, no change needed
} else if (answerTruthPct < 72 && positiveFactors > effectiveNegatives) {
  correctedConfidence = Math.min(correctedConfidence, 78);
  answerTruthPct = truthFromBand("strong", correctedConfidence);
}
```

### Level 4: Overall Answer

**File**: `apps/web/src/lib/analyzer.ts` (line ~4796)

Overall answer averages analysis-context answers (de-duplicated):

```typescript
const avgTruthPct = Math.round(
  correctedContextAnswers.reduce((sum, pa) => sum + pa.truthPercentage, 0) /
    correctedContextAnswers.length
);
```

## 5. Confidence Usage

### LLM Confidence (0-100%)

The LLM provides a confidence score for each verdict, representing its certainty in the assessment.

### Gate 4 Confidence Tiers

**Function**: `validateVerdictGate4` (line ~900)

```typescript
// HIGH: 3+ sources, 5+ facts, reasoning >100 chars
if (sourceCount >= 3 && factCount >= 5 && reasoning.length >= 100) {
  confidenceTier = "HIGH";
}
// MEDIUM: 2+ sources, 3+ facts, reasoning >50 chars
else if (sourceCount >= 2 && factCount >= 3 && reasoning.length >= 50) {
  confidenceTier = "MEDIUM";
}
// LOW: 1+ sources, 1+ facts
else if (sourceCount >= 1 && factCount >= 1) {
  confidenceTier = "LOW";
}
// INSUFFICIENT: Doesn't meet minimum criteria
else {
  confidenceTier = "INSUFFICIENT";
}
```

### Confidence Affects Truth Percentage

Via `truthFromBand`, confidence modulates the final percentage within each band:

- **High confidence** (90%): Verdict near top of band
- **Medium confidence** (60%): Verdict in middle of band
- **Low confidence** (30%): Verdict near bottom of band

Example for "strong" band:
- 90% confidence → 72 + 28×0.9 = 97% (TRUE)
- 60% confidence → 72 + 28×0.6 = 89% (TRUE)
- 30% confidence → 72 + 28×0.3 = 80% (MOSTLY-TRUE)

### Confidence Clamping

**Function**: `clampConfidence` (line ~1450)

```typescript
function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0.0, Math.min(1.0, value));
}
```

Ensures confidence stays in valid range [0.0, 1.0].

## 6. Near-Duplicate Claim Handling

### Problem

If the LLM generates multiple claims expressing the same idea:
- "The Venezuelan takeover of oil assets constituted theft of American property"
- "The Venezuelan oil asset seizure was one of the largest thefts of American property in US history"

Both would influence the overall verdict, effectively double-counting the same evidence.

### Solution: De-Duplication Weighting

**Function**: `dedupeWeightedAverageTruth` (line ~2014)

**Algorithm**:

1. **Tokenize** each claim text (lowercase, remove punctuation, filter short words)
2. **Calculate Jaccard similarity** between token sets
3. **Cluster** claims with similarity ≥ 0.6
4. **Weight** each cluster:
   - Primary claim (highest truth%): weight = 1.0
   - Duplicate claims: share weight = 0.5 / (n-1)
5. **Average** using cluster weights

**Example**:

```
Cluster 1: [Claim A (85%), Claim B (82%), Claim C (80%)]
  - Claim A: 85% × 1.0 = 85.0
  - Claim B: 82% × 0.25 = 20.5
  - Claim C: 80% × 0.25 = 20.0
  - Total weight: 1.5
  - Contribution: 125.5 / 1.5 = 83.7%

Cluster 2: [Claim D (90%)]
  - Claim D: 90% × 1.0 = 90.0
  - Total weight: 1.0
  - Contribution: 90.0 / 1.0 = 90.0%

Overall: (83.7 + 90.0) / 2 = 86.9%
```

### Application

De-duplication is applied at multiple levels:

- **Claims average** (line ~4769, ~5096, ~5478)
- **Key factor aggregation** (line ~5543)

### UI Impact

**All claims are still displayed** in the UI. De-duplication only affects aggregation calculations, not visibility.

## 7. Dependency Handling

**File**: `apps/web/src/lib/analyzer.ts` (line ~5512)

Claims can depend on other claims (e.g., "timing" depends on "attribution"):

```typescript
// Check if any dependency is false (truthPercentage < 43%)
const failedDeps = dependencies.filter((depId: string) => {
  const depVerdict = verdictMap.get(depId);
  return depVerdict && depVerdict.truthPercentage < 43;
});

if (failedDeps.length > 0) {
  verdict.dependencyFailed = true;
  verdict.failedDependencies = failedDeps;
}
```

**Independent verdicts** (line ~5550): Claims with failed dependencies are excluded from aggregation to avoid double-counting the false prerequisite.

## 8. Pseudoscience Escalation

**File**: `apps/web/src/lib/analyzer.ts` (line ~1108)

Claims matching pseudoscience patterns (water memory, homeopathy, etc.) are automatically escalated:

```typescript
if (claimPseudo.isPseudoscience) {
  const escalation = escalatePseudoscienceVerdict(truthPct, finalConfidence, claimPseudo);
  truthPct = escalation.truthPercentage;  // Usually capped at 28% (FALSE)
  finalConfidence = escalation.confidence;
}
```

## 9. Benchmark Guard (Proportionality Claims)

**File**: `apps/web/src/lib/analyzer.ts` (line ~4879)

Claims about proportionality/appropriateness without comparative evidence are forced to "uncertain":

```typescript
const isEvaluativeOutcome = hasNumber && EVALUATIVE_OUTCOME_RE.test(claimText);
const hasBenchmarkEvidence = hasComparativeBenchmarkEvidenceFromFacts(factsById, cv.supportingFactIds);

if (isEvaluativeOutcome && !hasBenchmarkEvidence) {
  truthPct = 50;  // Uncertain
  cv.confidence = Math.min(cv.confidence, 55);
  cv.reasoning += " (Insufficient comparative evidence to assess proportionality; treating as uncertain.)";
}
```

This prevents unsupported judgments like "27-year sentence was proportionate" without benchmark data.

## 10. Source Reliability Weighting

**Version**: v2.6.35+  
**Files**: `source-reliability.ts`, `monolithic-canonical.ts`, `monolithic-dynamic.ts`

Source reliability scores influence verdict calculations by adjusting truth percentages based on the credibility of evidence sources. This applies across **all three analysis pipelines**.

### Score = Verdict Weight

With the 7-band scale, the LLM score directly represents reliability and is used as-is for verdict weighting:

```typescript
function calculateEffectiveWeight(data: SourceReliabilityData): number {
  // Simple: score IS the weight
  // Confidence already filtered out low-quality evaluations (threshold gate)
  return data.score;
}
```

| Component | Purpose |
|-----------|---------|
| **Score** | LLM-evaluated reliability (7-band scale, 0.0-1.0) - used directly as weight |
| **Confidence** | Quality gate (threshold: 65%) - scores below threshold are rejected |
| **Consensus** | Multi-model agreement (Claude + GPT-4 must agree within 15%) |

**Key Design Decisions**:
- **Score = Weight** - No transformation, what LLM says is what we use
- **Confidence is a gate, not a modifier** - If evaluation passes 65% confidence threshold, we trust it
- **Transparency** - A 70% score means 70% weight, no hidden calculations

### Reliability Score Scale (7-Band Credibility)

The source reliability system uses a 7-band credibility scale centered at 0.5:

| Score Range | Band | Label | Impact on Verdict |
|-------------|------|-------|-------------------|
| 0.86-1.00 | Highly Reliable | Verified accuracy | Verdict fully preserved (~95-100% weight) |
| 0.72-0.85 | Reliable | Consistent accuracy | Verdict mostly preserved (~75-90% weight) |
| 0.58-0.71 | Leaning Reliable | Often accurate | Moderate preservation (~60-75% weight) |
| 0.43-0.57 | Mixed | Variable accuracy | Appropriate skepticism (~40-60% weight) |
| 0.29-0.42 | Leaning Unreliable | Often inaccurate | Pulls toward neutral (~30-45% weight) |
| 0.15-0.28 | Unreliable | Pattern of false claims | Strong pull (~15-30% weight) |
| 0.00-0.14 | Highly Unreliable | Fabricates content | Maximum skepticism (~0-15% weight) |

**Key properties**:
- **Centered at 0.5** - Center of "Mixed" band (0.43-0.57)
- **7 bands** for source credibility assessment
- **Score = 0.5** means variable track record - appropriate default skepticism
- **Above 0.58** = verdict preservation (credible source)
- **Below 0.43** = verdict skepticism (low credibility source)

### Score Examples

| Source | Score | Confidence | Consensus | Used in Verdicts |
|--------|-------|------------|-----------|------------------|
| Reuters | 95% | 95% | ✓ | **95%** |
| bag.admin.ch | 93% | 90% | ✓ | **93%** |
| Fox Business | 67% | 83% | ✓ | **67%** |
| xinhuanet.com | 27% | 73% | ✓ | **27%** |
| bild.de | 44% | 73% | ✓ | **44%** |
| Unknown source | 50%* | - | - | **50%** (neutral) |

*Unknown sources use `FH_SR_DEFAULT_SCORE=0.5` (symmetric scale center)

**Key insight**: High confidence → effective weight ≈ score. Low confidence → pulled toward 50%.

### Verdict Adjustment Formula

```typescript
// Average effective weight across all sources for a verdict
const avgWeight = sources.map(s => calculateEffectiveWeight(s)).reduce((a,b) => a+b) / sources.length;

// Pull verdict toward neutral (50) based on reliability
adjustedTruth = Math.round(50 + (originalTruth - 50) * avgWeight);

// Scale confidence by reliability
adjustedConfidence = Math.round(originalConfidence * (0.5 + avgWeight / 2));
```

### Impact Examples

**High Reliability Source (Reuters, 95% score)**
```
Original verdict: 85% (MOSTLY-TRUE)
Adjusted: 50 + (85 - 50) × 0.95 = 83.3% → 83% (MOSTLY-TRUE)
Impact: Verdict mostly preserved
```

**Unknown Source (50% score - neutral)**
```
Original verdict: 85% (MOSTLY-TRUE)
Adjusted: 50 + (85 - 50) × 0.50 = 67.5% → 68% (LEANING-TRUE)
Impact: Strong pull toward neutral (appropriate skepticism)
```

**Low Reliability Source (xinhuanet.com, 27% score)**
```
Original verdict: 85% (MOSTLY-TRUE)
Adjusted: 50 + (85 - 50) × 0.27 = 59.5% → 60% (LEANING-TRUE)
Impact: Strong pull toward neutral (unreliable source)
```

### Multi-Source Averaging

When a verdict uses multiple sources, their scores are averaged:

```
Verdict evidence from:
  - reuters.com: 95% score
  - bild.de: 44% score
  - unknown-blog.xyz: 50% score (default)

Average weight: (95 + 44 + 50) / 3 = 63%

Original: 85% → Adjusted: 50 + (85 - 50) × 0.63 = 72% (LEANING-TRUE)
```

### Unknown Source Handling

Sources not in the reliability cache are assigned a default score:

| Property | Default Value | Rationale |
|----------|---------------|-----------|
| Score | 0.5 (`FH_SR_DEFAULT_SCORE`) | Neutral center (symmetric scale) |

This results in 50% weight (neutral), applying appropriate skepticism without completely discounting evidence.

### Pipeline Integration

Source reliability weighting is applied in all three pipelines:

| Pipeline | Implementation |
|----------|----------------|
| **Orchestrated** | `applyEvidenceWeighting()` function |
| **Monolithic Canonical** | Inline calculation in verdict building |
| **Monolithic Dynamic** | Inline calculation with `adjustedVerdictScore` |

### Design Rationale

1. **Evidence Over Authority**: Source reliability is supplementary—strong evidence from weak sources still matters
2. **Appropriate Skepticism**: Unknown sources receive ~41% weight, not 0% or 100%
3. **Consensus Bonus**: Multi-model agreement slightly boosts confidence
4. **Transparency**: All adjustments logged and available in verdict metadata

## Summary

FactHarbor's calculation system:

1. **Scales verdicts** using a symmetric 7-band reliability system (matches verdict scale)
2. **Distinguishes counter-evidence** from contestation and applies penalties
3. **Aggregates hierarchically** from facts → claims → factors → analysis contexts → overall
4. **Modulates by confidence** using truth bands
5. **De-duplicates near-identical claims** to prevent double-counting
6. **Handles dependencies** to avoid cascading false prerequisites
7. **Applies quality gates** (Gate 1, Gate 4) for evidence sufficiency
8. **Guards against unsupported judgments** (pseudoscience, proportionality without benchmarks)
9. **Applies source reliability weighting** to adjust verdicts based on source credibility (v2.6.35+)

All calculations are designed to be **transparent**, **traceable**, and **deterministic** (when `FH_DETERMINISTIC=true`).

---

*See also: [Source_Reliability.md](Source_Reliability.md) for full Source Reliability system documentation.*
