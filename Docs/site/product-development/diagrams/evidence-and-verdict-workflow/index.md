> **Info**
>
> **Current Implementation (v2.11.0+)** - ClaimAssessmentBoundary pipeline. Uses 7-point symmetric verdict scale and 5-step LLM debate pattern.

# Evidence and Verdict Data Model

![Evidence and Verdict Workflow diagram 1](../../../diagrams/diagram-c6351901d0933e75.svg)

[Full-size diagram](../../../diagrams/diagram-c6351901d0933e75.svg) · [Mermaid source](../../../diagrams/diagram-c6351901d0933e75.mmd)

# Verdict Generation Flow (Stage 4)

![Evidence and Verdict Workflow diagram 2](../../../diagrams/diagram-87f2c47b02351980.svg)

[Full-size diagram](../../../diagrams/diagram-87f2c47b02351980.svg) · [Mermaid source](../../../diagrams/diagram-87f2c47b02351980.mmd)

## 7-Point Verdict Scale

| Verdict | Truth % Range | Description |
|----|----|----|
| **TRUE** | 86-100% | Claim is well-supported by evidence |
| **MOSTLY-TRUE** | 72-85% | Largely accurate with minor caveats |
| **LEANING-TRUE** | 58-71% | More evidence supports than contradicts |
| **MIXED** | 43-57% (high conf) | Roughly equal evidence both ways |
| **UNVERIFIED** | 43-57% (low conf) | Insufficient evidence to determine |
| **LEANING-FALSE** | 29-42% | More evidence contradicts than supports |
| **MOSTLY-FALSE** | 15-28% | Largely inaccurate |
| **FALSE** | 0-14% | Claim is refuted by evidence |

## Contestation Status

-   **Doubted**: Evidence is weak, uncertain, or ambiguous
-   **Contested**: Strong evidence exists on both sides

## Source Reliability

Source reliability scores use **LLM + Cache architecture** (v2.2):

-   LLM-based assessment with in-memory caching
-   Batch prefetch → in-memory map → sync lookup
-   Configurable via UCM SR config (`source-reliability.ts`)
