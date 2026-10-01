# Source Reliability: Architecture and Verdicts

## Architecture

### System Overview

# Source Reliability Overview

![Source Reliability Overview diagram 1](../../../../../../diagrams/diagram-e2c82872e958bf09.svg)

[Full-size diagram](../../../../../../diagrams/diagram-e2c82872e958bf09.svg) · [Mermaid source](../../../../../../diagrams/diagram-e2c82872e958bf09.mmd)

### Integration Pattern: Batch Prefetch + Sync Lookup

The Source Reliability system uses a **two-phase pattern** to avoid async operations in the analyzer's hot path.

#### The Problem

The FactHarbor analyzer (`claimboundary-pipeline.ts`) is a complex synchronous pipeline. Adding `await` calls mid-pipeline for source reliability lookups would require major refactoring, complicate error handling, and risk introducing race conditions.

#### The Solution: Two-Phase Pattern

Separate the async work (cache lookup, LLM calls) from the sync analysis:

| Phase | When | Nature | What It Does |
|----|----|----|----|
| **Phase 1: Prefetch** | Before analysis starts | Async | Batch lookup all source URLs, populate in-memory map |
| **Phase 2: Lookup** | During analysis | Sync | Read from pre-populated map (instant, no I/O) |
| **Phase 3: Weighting** | After verdicts generated | Sync | Adjust truth percentages based on source scores |

# Source Reliability Flow

![Source Reliability Flow diagram 1](../../../../../../diagrams/diagram-8fc2fc79888da78c.svg)

[Full-size diagram](../../../../../../diagrams/diagram-8fc2fc79888da78c.svg) · [Mermaid source](../../../../../../diagrams/diagram-8fc2fc79888da78c.mmd)

### Phase 1 Detail: Prefetch Flow

# Source Reliability Prefetch Flow

![Source Reliability Prefetch Flow diagram 1](../../../../../../diagrams/diagram-7cde9983df0cb647.svg)

[Full-size diagram](../../../../../../diagrams/diagram-7cde9983df0cb647.svg) · [Mermaid source](../../../../../../diagrams/diagram-7cde9983df0cb647.mmd)

### Why This Pattern Works

| Concern | How Pattern Addresses It |
|----|----|
| **No async ripple** | Only ONE `await` at pipeline boundary, rest stays sync |
| **Batch efficiency** | Single batch cache lookup instead of N individual calls |
| **LLM cost control** | Filter + rate limit applied during prefetch |
| **Graceful degradation** | Unknown sources get `null`, analysis continues |
| **No blocking** | Sync lookups are instant map reads |

------------------------------------------------------------------------

## How It Affects Verdicts

Source reliability scores directly influence verdict calculations through **evidence weighting**.

### Formula

```
adjustedTruth = 50 + (originalTruth - 50) x avgSourceScore
adjustedConfidence = confidence x (0.5 + avgSourceScore / 2)
```

### Effect on Verdicts (7-Band Scale)

| Source Credibility Band | Score (Weight) | Effect on Verdict |
|----|----|----|
| **Highly Reliable (0.86+)** | ~95-100% | Verdict fully preserved |
| **Reliable (0.72-0.86)** | ~75-90% | Verdict mostly preserved |
| **Leaning Reliable (0.58-0.72)** | ~60-75% | Moderate preservation |
| **Mixed (0.43-0.57)** | ~40-60% | Variable track record (neutral center) |
| **Leaning Unreliable (0.29-0.43)** | ~30-45% | Pulls toward neutral |
| **Unreliable (0.15-0.29)** | ~15-30% | Strong pull toward neutral |
| **Highly Unreliable (0.00-0.15)** | ~0-15% | Maximum skepticism |
| **Unknown (null)** | 50% | Uses default score (neutral) |

### Example

```
Original verdict: 80% (Strong True)
Source credibility: 0.5 (Mixed - variable track record)

Adjusted = 50 + (80 - 50) x 0.5
         = 50 + 30 x 0.5
         = 50 + 15
         = 65% (Leaning True)
```

### Multi-Source Averaging

When a verdict has evidence from multiple sources:

```
Verdict with facts from:
  - reuters.com (score: 0.95)
  - bbc.com (score: 0.88)

Average score = (0.95 + 0.88) / 2 = 0.915
```

------------------------------------------------------------------------

**Navigation:** [Source Reliability](../index.md) \| Prev: [Overview and Quick Start](../overview-and-quick-start/index.md) \| Next: [Configuration and Scoring](../configuration-and-scoring/index.md)
