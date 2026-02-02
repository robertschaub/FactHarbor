# FactHarbor POC1 Evolution Documentation

**Version**: 2.2.0  
**Date**: December 30, 2025  
**Status**: Implements UN-3, UN-17, and Article Verdict Problem

---

## Executive Summary

Version 2.2 addresses three critical requirements:

1. **Article Verdict Problem**: Article credibility ≠ simple average of claim verdicts
2. **UN-3**: Two-Panel Summary (Input Summary + FactHarbor Analysis)
3. **UN-17**: In-Article Claim Highlighting with color-coded verdicts

### What's New in v2.2

| Feature | Description | User Need |
|---------|-------------|-----------|
| Article Verdict | Separate article-level verdict that may differ from claim average | Article Verdict Problem |
| Central vs Supporting Claims | Classification of claim importance | Article Verdict Problem |
| Logical Fallacy Detection | Detects correlation→causation, cherry-picking, etc. | Article Verdict Problem |
| Two-Panel Summary | Side-by-side: What they claim vs Our assessment | UN-3 |
| Claim Positions | Character offsets for each claim in original text | UN-17 |
| Claim Highlighting | Color-coded highlighting with hover tooltips | UN-17 |

---

## The Article Verdict Problem

### Problem Statement

> "An analysis and verdict of the whole article is not the same as a summary of the analysis and verdicts of the parts (the claims)."

### Example: The Misleading Article

```
Article: "Coffee Cures Cancer!"

Individual Claims:
[1] Coffee contains antioxidants → ✅ WELL-SUPPORTED (95%)
[2] Antioxidants fight cancer → ✅ WELL-SUPPORTED (85%)
[3] Coffee cures cancer → ❌ REFUTED (10%)

Simple Aggregation:
- 2 supported, 1 refuted = 67% accurate
- Naive conclusion: "Mostly accurate article"

Reality:
- The MAIN CLAIM (coffee cures cancer) is FALSE
- Article commits logical fallacy (correlation ≠ causation)
- Article is MISLEADING despite accurate supporting facts

FactHarbor v2.2 Assessment:
- Individual verdicts: As shown above
- Article Verdict: MISLEADING
- Reason: Central claim is unsupported; accurate facts used to reach false conclusion
- Fallacy detected: Correlation presented as causation
```

### Solution: Central vs Supporting Claims

v2.2 classifies each claim as:

- **CENTRAL**: The main conclusion or argument. If false, the article is misleading.
- **SUPPORTING**: Background facts that support the central claim.

The article verdict considers:
1. Are the CENTRAL claims supported?
2. Does the conclusion logically follow from the evidence?
3. Are there logical fallacies?

### Implementation

```typescript
interface ClaimUnderstanding {
  articleThesis: string;  // Main argument
  subClaims: Array<{
    id: string;
    text: string;
    isCentral: boolean;  // Central vs Supporting
    // ...
  }>;
}

interface ArticleAnalysis {
  articleThesis: string;
  thesisSupported: boolean;
  logicalFallacies: Array<{
    type: string;  // "Correlation→Causation", "Cherry-picking", etc.
    description: string;
    affectedClaims: string[];
  }>;
  articleVerdict: "CREDIBLE" | "MOSTLY-CREDIBLE" | "MISLEADING" | "FALSE";
  verdictDiffersFromClaimAverage: boolean;
  verdictDifferenceReason?: string;
}
```

### Logical Fallacies Detected

| Fallacy | Description |
|---------|-------------|
| Correlation→Causation | Assuming cause from correlation |
| Cherry-picking | Selective use of evidence |
| False equivalence | Treating unequal things as equal |
| Hasty generalization | Broad conclusions from limited data |
| Appeal to authority | Using authority instead of evidence |
| Straw man | Misrepresenting the opposing view |

---

## UN-3: Two-Panel Summary

### Requirement

> Show an article summary (what they claim) side-by-side with FactHarbor's analysis summary (our assessment)

### Implementation

```typescript
interface TwoPanelSummary {
  // Left panel: What the article claims
  articleSummary: {
    title: string;
    source: string;
    mainArgument: string;
    keyFindings: string[];
    reasoning: string;
    conclusion: string;
  };
  // Right panel: FactHarbor's analysis
  factharborAnalysis: {
    sourceCredibility: string;
    claimVerdicts: Array<{
      claim: string;
      verdict: string;
      confidence: number;
    }>;
    methodologyAssessment: string;
    overallVerdict: string;
    analysisId: string;
  };
}
```

### GUI Component

The `TwoPanelSummary` component displays:

```
┌─────────────────────────┬─────────────────────────┐
│ 📄 What the Article     │ 🔍 FactHarbor Analysis  │
│    Claims               │                         │
├─────────────────────────┼─────────────────────────┤
│ Title: ...              │ Source Credibility: ... │
│ Source: ...             │                         │
│ Main Argument: ...      │ Claim Verdicts:         │
│ Key Findings:           │ - Claim 1: ✅ SUPPORTED │
│   • Finding 1           │ - Claim 2: 🟡 UNCERTAIN │
│   • Finding 2           │ - Claim 3: ❌ REFUTED   │
│ Conclusion: ...         │                         │
│                         │ Methodology: ...        │
│                         │ Overall: MISLEADING     │
│                         │ ID: FH-ABC123           │
└─────────────────────────┴─────────────────────────┘
```

---

## UN-17: In-Article Claim Highlighting

### Requirement

> Highlight claims within articles with color-coded credibility indicators

### Implementation

```typescript
interface ClaimVerdict {
  claimId: string;
  claimText: string;
  verdict: string;
  confidence: number;
  // Position in original text
  startOffset?: number;
  endOffset?: number;
  highlightColor: "green" | "yellow" | "red";
}
```

### Color Coding

| Color | Verdict | Meaning |
|-------|---------|---------|
| 🟢 Green | WELL-SUPPORTED | Strong evidence supports this claim |
| 🟡 Yellow | UNCERTAIN / PARTIALLY-SUPPORTED | Mixed or insufficient evidence |
| 🔴 Red | REFUTED | Evidence contradicts this claim |

### GUI Component

The `ClaimHighlighter` component:

1. Parses original text
2. Identifies claim positions
3. Renders highlighted text
4. Shows tooltip on hover/click with:
   - Verdict and confidence
   - Central/Supporting indicator
   - Reasoning
   - Risk tier

### Example Output

```
Regular article text flows normally...

[🟢 This claim is well-supported by evidence] and you can continue reading...

More context and explanation...

[🟡 This claim is uncertain with conflicting evidence] but the article continues...

Additional information...

[🔴 This claim has been refuted by research] and understanding that helps readers...
```

---

## API Response Schema (v2.2.0)

```typescript
{
  meta: {
    schemaVersion: "2.2.0",
    analysisId: string,
    // ... other meta fields
  },
  
  // UN-3: Two-Panel Summary
  twoPanelSummary: TwoPanelSummary,
  
  // Article Verdict Problem
  articleAnalysis: {
    articleThesis: string,
    thesisSupported: boolean,
    logicalFallacies: Array<LogicalFallacy>,
    articleVerdict: string,
    articleConfidence: number,
    verdictDiffersFromClaimAverage: boolean,
    verdictDifferenceReason?: string,
    claimPattern: {
      total: number,
      supported: number,
      uncertain: number,
      refuted: number,
      centralClaimsSupported: number,
      centralClaimsTotal: number
    }
  },
  
  // UN-17: Claims with positions
  claimVerdicts: Array<{
    claimId: string,
    claimText: string,
    isCentral: boolean,
    verdict: string,
    confidence: number,
    reasoning: string,
    startOffset?: number,
    endOffset?: number,
    highlightColor: string
  }>,
  
  // ... other fields (understanding, facts, sources, etc.)
}
```

---

## GUI Components

### New Components

| Component | File | Purpose |
|-----------|------|---------|
| `ArticleVerdictBanner` | `components/ArticleVerdictBanner.tsx` | Shows article-level verdict with claim pattern |
| `TwoPanelSummary` | `components/TwoPanelSummary.tsx` | UN-3 two-panel layout |
| `ClaimHighlighter` | `components/ClaimHighlighter.tsx` | UN-17 claim highlighting |

### Updated Pages

| Page | File | Changes |
|------|------|---------|
| Job Results | `app/jobs/[id]/page.tsx` | New tabs: Summary, Article View; integrates all components |

### Tab Structure

```
📊 Summary     - ArticleVerdictBanner + TwoPanelSummary + Claims List
📖 Article    - ClaimHighlighter (UN-17)
📝 Full Report - Markdown report (existing)
🔧 JSON       - Raw JSON (existing)
📋 Events     - Processing events (existing)
```

---

## File Structure

```
apps/web/src/
├── lib/
│   └── analyzer.ts           # v2.2 with Article Verdict + UN-3 + UN-17
├── components/
│   ├── ArticleVerdictBanner.tsx   # Article-level verdict display
│   ├── TwoPanelSummary.tsx        # UN-3 two-panel layout
│   └── ClaimHighlighter.tsx       # UN-17 highlighting
├── app/
│   └── jobs/[id]/
│       └── page.tsx          # Updated results page
└── EVOLUTION.md              # This documentation
```

---

## Migration from v2.1

### New Fields

| Field | Type | Description |
|-------|------|-------------|
| `understanding.articleThesis` | string | Main argument of the article |
| `understanding.subClaims[].isCentral` | boolean | Central vs supporting |
| `understanding.subClaims[].startOffset` | number | Position in text |
| `twoPanelSummary` | object | UN-3 structure |
| `articleAnalysis` | object | Article-level verdict |
| `claimVerdicts[].isCentral` | boolean | Central indicator |
| `claimVerdicts[].startOffset/endOffset` | number | Text positions |
| `claimVerdicts[].highlightColor` | string | Color for highlighting |

### Breaking Changes

None - v2.2 is backward compatible. New fields are additions.

### Consumer Updates

```typescript
// Check for v2.2 features
if (result.meta.schemaVersion.startsWith("2.2")) {
  // Use new features
  const { twoPanelSummary, articleAnalysis, claimVerdicts } = result;
} else {
  // Fall back to report view
}
```

---

## Testing Checklist

### Article Verdict Problem

- [ ] Central claims correctly identified
- [ ] Article verdict differs from claim average when appropriate
- [ ] Logical fallacies detected
- [ ] Verdict difference reason provided
- [ ] Claim pattern summary accurate

### UN-3: Two-Panel Summary

- [ ] Article summary populated correctly
- [ ] FactHarbor analysis populated correctly
- [ ] Side-by-side display works
- [ ] Mobile responsive (stacks vertically)

### UN-17: Claim Highlighting

- [ ] Claim positions extracted
- [ ] Highlights render correctly
- [ ] Color coding matches verdicts
- [ ] Tooltip shows on hover
- [ ] Toggle to disable highlights works
- [ ] Central claim badge (🔑) displays

---

## Success Criteria (from Spec)

### Article Verdict Problem (POC1 Experimental)

- [ ] ≥70% accuracy detecting misleading articles
- [ ] ≤30% false positives on straightforward articles
- [ ] Reasoning is comprehensible

### UN-3

- [ ] Both panels visible simultaneously
- [ ] Clear distinction between "what they claim" and "our analysis"
- [ ] Verdict colors match claim status

### UN-17

- [ ] Highlighting renders within 500ms
- [ ] Color-blind friendly (icons + colors)
- [ ] Screen reader compatible

---

## Appendix: CODEX Review Compliance

v2.2 maintains all v2.1 compliance:

| CODEX Concern | Status | Implementation |
|---------------|--------|----------------|
| Hallucination risk | ✅ | `sourceExcerpt` required |
| Source credibility | ✅ | Metadata lookup only |
| Breaking API | ✅ | Schema versioned |
| Runtime | ✅ | Quick/deep modes |
| Contradiction search | ✅ | Mandatory search |

New in v2.2:

| Feature | Status | Notes |
|---------|--------|-------|
| Article Verdict | ✅ | Separate from claim average |
| Central claims | ✅ | Classified in understanding |
| Fallacy detection | ✅ | 6 fallacy types |
| Two-panel | ✅ | UN-3 structure |
| Claim positions | ✅ | For UN-17 highlighting |
