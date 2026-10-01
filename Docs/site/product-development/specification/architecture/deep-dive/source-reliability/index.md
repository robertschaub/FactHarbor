# Source Reliability

> **Info**
>
> **Developer Reference** — Implementation details for the [Media Source Database](../../../../media-source-database/index.md), FactHarbor's AI-powered source credibility service. Currently embedded in the analysis pipeline; planned to become a standalone public service and API.
>
> **Key File**: `apps/web/src/lib/analyzer/source-reliability.ts`

**User-facing name**: [Media Source Database](../../../../media-source-database/index.md) **Version**: 1.4 (Multi-Language Support) **Status**: Operational

------------------------------------------------------------------------

## Contents

-   **[Overview and Quick Start](overview-and-quick-start/index.md)** — System overview, prerequisites, and verification steps
-   **[Architecture and Verdicts](architecture-and-verdicts/index.md)** — Batch prefetch + sync lookup pattern, Mermaid diagrams, evidence weighting formula, verdict impact (7-band scale)
-   **[Configuration and Scoring](configuration-and-scoring/index.md)** — UCM settings (core, cache, rate limiting, evidence grounding), 7-band credibility scale, calibration rules
-   **[Refinement and Multi-Language](refinement-and-multi-language/index.md)** — v1.1 prompt improvements, v1.2 hardening, sequential refinement architecture, multi-language support with regional fact-checkers
-   **[Admin and Implementation](admin-and-implementation/index.md)** — Admin interface, design principles, implementation details (key files, functions, pipeline integration), cost and performance, troubleshooting, test coverage

## Related

-   [Media Source Database](../../../../media-source-database/index.md) — User-facing source reliability documentation
-   [Architecture](../../index.md) — System architecture (SR integration context)
-   [Quality and Trust](../../quality-and-trust/index.md) — Source reliability scoring overview

------------------------------------------------------------------------

**Navigation:** [Deep Dive Index](../index.md) \| Prev: [Context Detection](../context-detection/index.md)
