# Diagrams

> **Info**
>
> Non-trivial diagrams live in dedicated pages here and are **{{include}}d** into the Architecture, Specification, and Planning pages where they are described.

## Overview

-   [Analysis Pipeline Overview](analysis-pipeline-overview.md) — High-level pipeline flowchart (claim to verdict)
-   [AKEL Pipeline Detail](../../akel-stage-details.md) — Current 5-stage lifecycle

## Architecture

-   [System Architecture](system-architecture/index.md) — Two-service architecture (API + Web/Runner)
-   [System Context](system-context/index.md) — Users, platform, LLM and search providers
-   [Request Lifecycle](request-lifecycle/index.md) — End-to-end request sequence
-   [Technology Stack](technology-stack/index.md) — Frameworks, libraries, and infrastructure
-   [External Dependencies Map](external-dependencies-map/index.md) — LLM, search, and retrieval dependencies
-   [LLM Model Tiering](llm-model-tiering/index.md) — Model selection per pipeline stage
-   [LLM Abstraction Architecture](llm-abstraction-architecture/index.md) — Multi-provider abstraction, tiered routing, provider model mapping
-   [Storage Architecture](storage-architecture/index.md) — Three-database architecture layout
-   [Storage Roadmap](storage-roadmap/index.md) — Storage evolution POC → Alpha → Beta → V1.0+
-   [Deployment Topology](deployment-topology/index.md) — POC vs production deployment
-   [Security Model](security-model/index.md) — Implemented, planned, and always-active security layers
-   [Circuit Breaker States](circuit-breaker-states/index.md) — Provider health circuit breaker state machine
-   [Federation Architecture](federation-architecture/index.md) — Decentralized node architecture (future)

## AKEL

-   [AKEL Pipeline Detail](../../akel-stage-details.md) — Detailed 5-stage pipeline flow (CB)
-   [AKEL Analysis Pipeline](akel-analysis-pipeline/index.md) — 5-stage pipeline with quality gates (CB)
-   [AKEL Shared Modules](../../shared-modules.md) — Shared analysis modules
-   [AKEL Quality Assurance](akel-quality-assurance/index.md) — Quality gates, evidence defence, source trust pillars

## Data Models

**Primary field-level reference:** [Entity Views](entity-views/index.md) — five complementary views (Overview, Result, Target DB, Runtime, UI) with complete field detail per entity.

-   [Analysis Entity Model ERD](analysis-entity-model-erd/index.md) — Complete entity relationship model
-   [Core Data Model ERD](core-data-model-erd/index.md) — Core entities overview
-   [Entity Views](entity-views/index.md) — Overview, Result, Target DB, Runtime, UI views
-   [Job Lifecycle ERD](job-lifecycle-erd/index.md) — Job and event entity model
-   [Verdict Scale](verdict-scale/index.md) — 7-point verdict scale (TRUE to FALSE)
-   [Audit Trail ERD](audit-trail-erd/index.md) — Job and UCM audit trail entities

## Config

-   [UCM Config Precedence](ucm-config-precedence/index.md) — Configuration source precedence chain
-   [UCM Config Architecture](ucm-config-architecture/index.md) — Admin UI, validation, storage, and runtime flow

## Pipelines

-   [ClaimAssessmentBoundary Pipeline Detail](../../cb-pipeline.md) — 5-stage pipeline with LLM debate pattern, sequence diagram, budget table
-   [Verdict Debate Pattern](../../verdict-debate.md) — 5-step adversarial debate pattern (Advocate, Challenger, Reconciler)
-   [Monolithic Dynamic Pipeline Internal](monolithic-dynamic-pipeline-internal/index.md) — Internal Monolithic Dynamic execution flow
-   [Pipeline Shared Primitives](pipeline-shared-primitives/index.md) — Shared primitives architecture
-   [Pipeline Variant Dispatch](pipeline-variant-dispatch/index.md) — Analysis dispatch and convergence flow

## Workflows

-   [ClaimAssessmentBoundary Pipeline Detail](../../cb-pipeline.md) — Current analysis workflow
-   [Evidence and Verdict Workflow](evidence-and-verdict-workflow/index.md)
-   [Quality and Audit Workflow](quality-and-audit-workflow/index.md)

## Quality

-   [Quality Gates Flow](quality-gates-flow/index.md) — Gate 1 + Gate 4 flow
-   [Quality Gates Integration](quality-gates-integration/index.md) — Pipeline integration points
-   [Evidence Defence in Depth](evidence-defence-in-depth/index.md) — 6-layer defence model
-   [Evidence Quality Filtering Pipeline](evidence-quality-filtering-pipeline/index.md) — 7-layer filtering pipeline
-   [Doubted vs Contested Flow](doubted-vs-contested-flow/index.md) — Counter-evidence weight reduction flow

## Source Reliability

-   [Source Reliability Overview](source-reliability-overview/index.md) — System architecture overview
-   [Source Reliability Flow](source-reliability-flow/index.md) — 3-phase prefetch/lookup/weighting sequence
-   [Source Reliability Prefetch Flow](source-reliability-prefetch-flow/index.md) — Phase 1 async prefetch decision flow

## Users and Roles

-   [Human User Roles](human-user-roles/index.md)
-   [Technical and System Users](technical-and-system-users/index.md)
-   [User Class Diagram](user-class-diagram/index.md)
-   [Role-Based Access Control](role-based-access-control/index.md) — Implemented vs planned access levels

## Planning

-   [Development Roadmap](development-roadmap/index.md) — POC → Alpha → Beta → V1.0
-   [Architecture Roadmap](architecture-roadmap/index.md) — Phase-by-phase capability evolution

## Testing

-   [Promptfoo Test Coverage](promptfoo-test-coverage/index.md) — Test configurations and provider matrix

## Automation

-   [Automation Level](automation-level/index.md)
-   [Automation Roadmap](automation-roadmap/index.md)
-   [Manual vs Automated Matrix](manual-vs-automated-matrix/index.md)

## Outdated

-   [Outdated Diagrams](outdated/index.md) — Superseded diagram pages, retained for historical reference

------------------------------------------------------------------------

**Navigation:** [Specification](../specification/index.md) \| [Architecture](../specification/architecture/index.md)
