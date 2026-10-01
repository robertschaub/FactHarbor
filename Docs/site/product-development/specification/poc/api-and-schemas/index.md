# POC1 API & Schemas Specification

------------------------------------------------------------------------

> **Info**
>
> **Canonical Data Model:** See [Data Model](../../data-model/index.md) for the canonical data model specification. This section documents the POC1 API contract and endpoint schemas.

## Contents

-   **[Codegen Contract](codegen-contract/index.md)** — Authoritative code-generation contract: locked enums, OpenAPI 3.1, idempotency, canonical outputs
-   **[Pipeline Architecture](pipeline-architecture/index.md)** — 3-stage pipeline (Extract → Analyze → Assess), cost model, user tiers, cache-only mode, credibility scoring algorithm
-   **[LLM Abstraction Layer](llm-abstraction-layer/index.md)** — Provider-agnostic abstraction: interface, supported providers, stage-specific models, failover strategy, admin API
-   **[REST API Contract](rest-api-contract/index.md)** — API endpoints (POST /v1/analyze, GET /v1/jobs, etc.), request/response schemas, Stage 2 & 3 output schemas
-   **[Data Schemas and Cache](data-schemas-and-cache/index.md)** — ClaimExtraction schema, verdict label taxonomy (3-level), Redis cache design, canonical claim normalization (v1norm1), copyright policy

## Version History

| Version | Date | Changes |
|----|----|----|
| 0.4.1 | 2025-12-24 | Applied 9 critical fixes: file format notice, verdict taxonomy, canonicalization algorithm, Stage 1 cost policy, BullMQ fix, language in cache key, historical claims TTL, idempotency, copyright policy |
| 0.4 | 2025-12-24 | **BREAKING:** 3-stage pipeline with claim-level caching, user tier system, cache-only mode for free users, Redis cache architecture |
| 0.3.1 | 2025-12-24 | Fixed single-prompt strategy, SSE clarification, schema canonicalization, cost constraints |
| 0.3 | 2025-12-24 | Added complete API endpoints, LLM config, risk tiers, scraping details |

## Related

-   [Data Model](../../data-model/index.md) — Canonical data model specification
-   [POC1 Requirements](../requirements.md) — Full POC1 requirements document
-   [POC1 Summary](../summary.md) — Executive summary
